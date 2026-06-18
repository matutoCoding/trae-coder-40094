export type StudioType = 'LARGE' | 'MEDIUM' | 'SMALL';
export type BookingStatus = 'PENDING' | 'ALLOCATED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type SettlementStatus = 'UNSETTLED' | 'SETTLED';
export type UserRole = 'ADMIN' | 'ARTIST';

export interface Studio {
  id: string;
  name: string;
  type: StudioType;
  hourlyRate: number;
  equipment: string;
  capacity: number;
  isActive: boolean;
}

export interface Artist {
  id: string;
  name: string;
  contact: string;
  email: string;
}

export interface Booking {
  id: string;
  artistId: string;
  studioId: string | null;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalAmount: number;
  status: BookingStatus;
  allocationReason?: string;
  allocationScore?: number;
  createdAt: Date;
  notes?: string;
  attendeeCount?: number;
}

export interface BookingRequest {
  artistId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  attendeeCount?: number;
  notes?: string;
}

export interface CommissionTier {
  id: string;
  minAmount: number;
  maxAmount: number;
  rate: number;
  tierOrder: number;
  isActive: boolean;
}

export interface Settlement {
  id: string;
  bookingId: string;
  tierId: string;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  artistAmount: number;
  settlementDate: Date;
  status: SettlementStatus;
}

export interface MasterDelivery {
  id: string;
  bookingId: string;
  version: string;
  downloadUrl: string;
  notes: string;
  isConfirmed: boolean;
  deliveredAt: Date;
  confirmedAt?: Date;
}

export interface AllocationCandidate {
  studioId: string;
  studioName: string;
  score: number;
  reason: string;
}

export interface AllocationResult {
  success: boolean;
  bestMatch?: AllocationCandidate;
  alternatives: AllocationCandidate[];
  message?: string;
}

export interface CommissionCalculation {
  currentTier: CommissionTier;
  cumulativeAmount: number;
  nextTierThreshold: number | null;
  progressToNextTier: number;
  commissionRate: number;
}

export interface StudioUsageStats {
  studioId: string;
  studioName: string;
  totalHours: number;
  utilizationRate: number;
  revenue: number;
}

export interface MonthlyStats {
  totalRevenue: number;
  totalBookings: number;
  averageUtilization: number;
  topStudios: StudioUsageStats[];
  commissionProgress: CommissionCalculation;
}
