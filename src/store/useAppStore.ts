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

interface AppState {
  studios: Studio[];
  artists: Artist[];
  bookings: Booking[];
  tiers: CommissionTier[];
  settlements: Settlement[];
  masters: MasterDelivery[];
  currentUser: { role: 'ADMIN' | 'ARTIST'; artistId?: string };
  lastAllocationResults: Map<string, AllocationResult>;

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

  addMasterDelivery: (master: Omit<MasterDelivery, 'id'>) => void;
  confirmMasterDelivery: (masterId: string) => void;

  getBookingById: (id: string) => Booking | undefined;
  getArtistById: (id: string) => Artist | undefined;
  getStudioById: (id: string) => Studio | undefined;
  getSettlementById: (id: string) => Settlement | undefined;
  getMastersByBookingId: (bookingId: string) => MasterDelivery[];
}

export const useAppStore = create<AppState>((set, get) => ({
  studios: mockStudios,
  artists: mockArtists,
  bookings: mockBookings,
  tiers: mockTiers,
  settlements: mockSettlements,
  masters: mockMasters,
  currentUser: { role: 'ADMIN' },
  lastAllocationResults: new Map(),

  setCurrentUser: (user) => set({ currentUser: user }),

  addStudio: (studio) =>
    set((state) => ({
      studios: [...state.studios, { ...studio, id: generateId() }],
    })),

  updateStudio: (id, updates) =>
    set((state) => ({
      studios: state.studios.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  deleteStudio: (id) =>
    set((state) => ({
      studios: state.studios.filter((s) => s.id !== id),
    })),

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

    return results;
  },

  confirmBooking: (bookingId) =>
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b
      ),
    })),

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
  },

  cancelBooking: (bookingId) =>
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'CANCELLED' } : b
      ),
    })),

  updateBooking: (id, updates) =>
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  updateTier: (id, updates) =>
    set((state) => ({
      tiers: state.tiers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  addTier: (tier) =>
    set((state) => ({
      tiers: [...state.tiers, { ...tier, id: generateId() }],
    })),

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
  },

  markSettlementPaid: (settlementId) =>
    set((state) => ({
      settlements: state.settlements.map((s) =>
        s.id === settlementId ? { ...s, status: 'SETTLED' } : s
      ),
    })),

  addMasterDelivery: (master) =>
    set((state) => ({
      masters: [...state.masters, { ...master, id: generateId() }],
    })),

  confirmMasterDelivery: (masterId) =>
    set((state) => ({
      masters: state.masters.map((m) =>
        m.id === masterId ? { ...m, isConfirmed: true, confirmedAt: new Date() } : m
      ),
    })),

  getBookingById: (id) => get().bookings.find((b) => b.id === id),
  getArtistById: (id) => get().artists.find((a) => a.id === id),
  getStudioById: (id) => get().studios.find((s) => s.id === id),
  getSettlementById: (id) => get().settlements.find((s) => s.id === id),
  getMastersByBookingId: (bookingId) => get().masters.filter((m) => m.bookingId === bookingId),
}));
