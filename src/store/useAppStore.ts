import { create } from 'zustand';
import {
  Studio,
  Artist,
  Booking,
  CommissionTier,
  Settlement,
  MasterDelivery,
  BookingRequest,
  AllocationResult,
} from '../types';
import { mockStudios } from '../data/mockStudios';
import { mockArtists } from '../data/mockArtists';
import { mockBookings } from '../data/mockBookings';
import { mockTiers } from '../data/mockTiers';
import { mockSettlements } from '../data/mockSettlements';
import { mockMasters } from '../data/mockMasters';
import { allocateStudio, batchAllocate } from '../services/allocation.service';
import { calculateSettlement } from '../services/commission.service';
import { calculateBookingAmount } from '../services/studio.service';
import { generateId } from '../utils/formatters';

const STORAGE_KEY = 'aurora-studio-data-v1';

interface PersistedData {
  studios: Studio[];
  artists: Artist[];
  bookings: Booking[];
  tiers: CommissionTier[];
  settlements: Settlement[];
  masters: MasterDelivery[];
}

function parseDateFields<T>(obj: any): T {
  if (!obj) return obj as T;
  if (Array.isArray(obj)) {
    return obj.map((item) => parseDateFields(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        typeof value === 'string' &&
        (key.includes('Time') || key.includes('Date') || key.includes('At')) &&
        !isNaN(Date.parse(value))
      ) {
        result[key] = new Date(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = parseDateFields(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }
  return obj as T;
}

function loadFromStorage(): PersistedData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      studios: parseDateFields<Studio[]>(data.studios || []),
      artists: parseDateFields<Artist[]>(data.artists || []),
      bookings: parseDateFields<Booking[]>(data.bookings || []),
      tiers: parseDateFields<CommissionTier[]>(data.tiers || []),
      settlements: parseDateFields<Settlement[]>(data.settlements || []),
      masters: parseDateFields<MasterDelivery[]>(data.masters || []),
    };
  } catch (e) {
    console.error('Failed to load from localStorage', e);
    return null;
  }
}

function saveToStorage(data: PersistedData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

const persisted = loadFromStorage();

interface AppState {
  studios: Studio[];
  artists: Artist[];
  bookings: Booking[];
  tiers: CommissionTier[];
  settlements: Settlement[];
  masters: MasterDelivery[];
  currentUser: { role: 'ADMIN' | 'ARTIST'; artistId?: string };
  lastAllocationResults: Map<string, AllocationResult>;

  persist: () => void;
  resetToDefaults: () => void;

  setCurrentUser: (user: { role: 'ADMIN' | 'ARTIST'; artistId?: string }) => void;

  addStudio: (studio: Omit<Studio, 'id'>) => void;
  updateStudio: (id: string, studio: Partial<Studio>) => void;
  deleteStudio: (id: string) => void;

  createBooking: (request: BookingRequest) => Booking;
  allocateSingleBooking: (bookingId: string) => AllocationResult | null;
  allocateAllPending: () => Map<string, AllocationResult>;
  confirmBooking: (bookingId: string) => void;
  completeBooking: (bookingId: string) => void;
  cancelBooking: (bookingId: string) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;

  updateTier: (id: string, tier: Partial<CommissionTier>) => void;
  addTier: (tier: Omit<CommissionTier, 'id'>) => void;

  settleBooking: (bookingId: string) => void;
  markSettlementPaid: (settlementId: string) => void;
  batchMarkSettlementsPaid: (settlementIds: string[]) => void;

  addMasterDelivery: (master: Omit<MasterDelivery, 'id'>) => void;
  confirmMasterDelivery: (masterId: string) => void;

  getBookingById: (id: string) => Booking | undefined;
  getArtistById: (id: string) => Artist | undefined;
  getStudioById: (id: string) => Studio | undefined;
  getSettlementById: (id: string) => Settlement | undefined;
  getMastersByBookingId: (bookingId: string) => MasterDelivery[];
}

export const useAppStore = create<AppState>((set, get) => ({
  studios: persisted?.studios && persisted.studios.length > 0 ? persisted.studios : mockStudios,
  artists: persisted?.artists && persisted.artists.length > 0 ? persisted.artists : mockArtists,
  bookings: persisted?.bookings && persisted.bookings.length > 0 ? persisted.bookings : mockBookings,
  tiers: persisted?.tiers && persisted.tiers.length > 0 ? persisted.tiers : mockTiers,
  settlements:
    persisted?.settlements && persisted.settlements.length > 0 ? persisted.settlements : mockSettlements,
  masters: persisted?.masters && persisted.masters.length > 0 ? persisted.masters : mockMasters,
  currentUser: { role: 'ADMIN' },
  lastAllocationResults: new Map(),

  persist: () => {
    const { studios, artists, bookings, tiers, settlements, masters } = get();
    saveToStorage({ studios, artists, bookings, tiers, settlements, masters });
  },

  resetToDefaults: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      studios: mockStudios,
      artists: mockArtists,
      bookings: mockBookings,
      tiers: mockTiers,
      settlements: mockSettlements,
      masters: mockMasters,
    });
  },

  setCurrentUser: (user) => set({ currentUser: user }),

  addStudio: (studio) => {
    set((state) => ({
      studios: [...state.studios, { ...studio, id: generateId() }],
    }));
    get().persist();
  },

  updateStudio: (id, updates) => {
    set((state) => ({
      studios: state.studios.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
    get().persist();
  },

  deleteStudio: (id) => {
    set((state) => ({
      studios: state.studios.filter((s) => s.id !== id),
    }));
    get().persist();
  },

  createBooking: (request) => {
    const newBooking: Booking = {
      id: generateId(),
      artistId: request.artistId,
      studioId: null,
      startTime: request.startTime,
      endTime: request.endTime,
      duration: request.duration,
      totalAmount: 0,
      status: 'PENDING',
      createdAt: new Date(),
      notes: request.notes,
      attendeeCount: request.attendeeCount,
    };
    set((state) => ({ bookings: [...state.bookings, newBooking] }));
    get().persist();
    return newBooking;
  },

  allocateSingleBooking: (bookingId) => {
    const { bookings, studios } = get();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking || booking.status !== 'PENDING') return null;

    const request: BookingRequest = {
      artistId: booking.artistId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      attendeeCount: booking.attendeeCount,
      notes: booking.notes,
    };

    const result = allocateStudio(request, studios, bookings);

    if (result.success && result.bestMatch) {
      const studio = studios.find((s) => s.id === result.bestMatch!.studioId)!;
      const totalAmount = calculateBookingAmount(studio, booking.duration);

      set((state) => ({
        bookings: state.bookings.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                studioId: result.bestMatch!.studioId,
                status: 'ALLOCATED',
                allocationReason: result.bestMatch!.reason,
                allocationScore: result.bestMatch!.score,
                totalAmount,
              }
            : b
        ),
        lastAllocationResults: new Map(state.lastAllocationResults).set(bookingId, result),
      }));
      get().persist();
    }

    return result;
  },

  allocateAllPending: () => {
    const { bookings, studios } = get();
    const pendingBookings = bookings.filter((b) => b.status === 'PENDING');
    const results = batchAllocate(pendingBookings, studios, bookings);

    set((state) => {
      const updatedBookings = state.bookings.map((b) => {
        const result = results.get(b.id);
        if (result?.success && result.bestMatch) {
          const studio = studios.find((s) => s.id === result.bestMatch!.studioId)!;
          const totalAmount = calculateBookingAmount(studio, b.duration);
          return {
            ...b,
            studioId: result.bestMatch!.studioId,
            status: 'ALLOCATED' as const,
            allocationReason: result.bestMatch!.reason,
            allocationScore: result.bestMatch!.score,
            totalAmount,
          };
        }
        return b;
      });

      return {
        bookings: updatedBookings,
        lastAllocationResults: results,
      };
    });
    get().persist();

    return results;
  },

  confirmBooking: (bookingId) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b
      ),
    }));
    get().persist();
  },

  completeBooking: (bookingId) => {
    const { bookings, tiers, settlements } = get();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'COMPLETED' } : b
      ),
    }));

    const settlementCalc = calculateSettlement(booking, tiers, bookings);
    const existingSettlement = settlements.find((s) => s.bookingId === bookingId);

    if (!existingSettlement) {
      const newSettlement: Settlement = {
        id: generateId(),
        bookingId,
        tierId: settlementCalc.tierId,
        totalAmount: booking.totalAmount,
        commissionRate: settlementCalc.commissionRate,
        commissionAmount: settlementCalc.commissionAmount,
        artistAmount: settlementCalc.artistAmount,
        settlementDate: new Date(),
        status: 'UNSETTLED',
      };
      set((state) => ({
        settlements: [...state.settlements, newSettlement],
      }));
    }
    get().persist();
  },

  cancelBooking: (bookingId) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'CANCELLED' } : b
      ),
    }));
    get().persist();
  },

  updateBooking: (id, updates) => {
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
    get().persist();
  },

  updateTier: (id, updates) => {
    set((state) => ({
      tiers: state.tiers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    get().persist();
  },

  addTier: (tier) => {
    set((state) => ({
      tiers: [...state.tiers, { ...tier, id: generateId() }],
    }));
    get().persist();
  },

  settleBooking: (bookingId) => {
    const { bookings, tiers } = get();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const settlementCalc = calculateSettlement(booking, tiers, bookings);
    const newSettlement: Settlement = {
      id: generateId(),
      bookingId,
      tierId: settlementCalc.tierId,
      totalAmount: booking.totalAmount,
      commissionRate: settlementCalc.commissionRate,
      commissionAmount: settlementCalc.commissionAmount,
      artistAmount: settlementCalc.artistAmount,
      settlementDate: new Date(),
      status: 'UNSETTLED',
    };

    set((state) => ({
      settlements: [...state.settlements, newSettlement],
    }));
    get().persist();
  },

  markSettlementPaid: (settlementId) => {
    set((state) => ({
      settlements: state.settlements.map((s) =>
        s.id === settlementId ? { ...s, status: 'SETTLED' } : s
      ),
    }));
    get().persist();
  },

  batchMarkSettlementsPaid: (settlementIds) => {
    set((state) => ({
      settlements: state.settlements.map((s) =>
        settlementIds.includes(s.id) ? { ...s, status: 'SETTLED' } : s
      ),
    }));
    get().persist();
  },

  addMasterDelivery: (master) => {
    set((state) => ({
      masters: [...state.masters, { ...master, id: generateId() }],
    }));
    get().persist();
  },

  confirmMasterDelivery: (masterId) => {
    set((state) => ({
      masters: state.masters.map((m) =>
        m.id === masterId ? { ...m, isConfirmed: true, confirmedAt: new Date() } : m
      ),
    }));
    get().persist();
  },

  getBookingById: (id) => get().bookings.find((b) => b.id === id),
  getArtistById: (id) => get().artists.find((a) => a.id === id),
  getStudioById: (id) => get().studios.find((s) => s.id === id),
  getSettlementById: (id) => get().settlements.find((s) => s.id === id),
  getMastersByBookingId: (bookingId) => get().masters.filter((m) => m.bookingId === bookingId),
}));
