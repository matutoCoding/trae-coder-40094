import { Booking, CommissionTier, CommissionCalculation } from '../types';
import { isInCurrentMonth } from '../utils/dateUtils';

function findTierForAmount(amount: number, tiers: CommissionTier[]): CommissionTier {
  const sortedTiers = [...tiers].filter((t) => t.isActive).sort((a, b) => a.tierOrder - b.tierOrder);

  for (const tier of sortedTiers) {
    if (amount >= tier.minAmount && amount < tier.maxAmount) {
      return tier;
    }
  }

  return sortedTiers[sortedTiers.length - 1];
}

function findNextTier(currentTier: CommissionTier, tiers: CommissionTier[]): CommissionTier | null {
  const sortedTiers = [...tiers].filter((t) => t.isActive).sort((a, b) => a.tierOrder - b.tierOrder);
  const currentIndex = sortedTiers.findIndex((t) => t.id === currentTier.id);

  if (currentIndex >= 0 && currentIndex < sortedTiers.length - 1) {
    return sortedTiers[currentIndex + 1];
  }

  return null;
}

export function calculateCommission(
  bookingAmount: number,
  monthlyBookings: Booking[],
  tiers: CommissionTier[]
): CommissionCalculation {
  const cumulativeAmount = monthlyBookings
    .filter((b) => b.status === 'COMPLETED' && isInCurrentMonth(b.startTime))
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const totalAfterThisBooking = cumulativeAmount + bookingAmount;

  const currentTier = findTierForAmount(totalAfterThisBooking, tiers);

  const nextTier = findNextTier(currentTier, tiers);
  let progressToNextTier = 100;

  if (nextTier) {
    const tierRange = nextTier.minAmount - currentTier.maxAmount;
    const progress = totalAfterThisBooking - currentTier.maxAmount;
    progressToNextTier = Math.min((progress / tierRange) * 100, 100);
  }

  return {
    currentTier,
    cumulativeAmount: totalAfterThisBooking,
    nextTierThreshold: nextTier?.minAmount || null,
    progressToNextTier,
    commissionRate: currentTier.rate,
  };
}

export function calculateSettlement(
  booking: Booking,
  tiers: CommissionTier[],
  monthlyBookings: Booking[]
): {
  commissionRate: number;
  commissionAmount: number;
  artistAmount: number;
  tierId: string;
} {
  const calc = calculateCommission(booking.totalAmount, monthlyBookings, tiers);
  const commissionAmount = Math.round(booking.totalAmount * (calc.commissionRate / 100));
  const artistAmount = booking.totalAmount - commissionAmount;

  return {
    commissionRate: calc.commissionRate,
    commissionAmount,
    artistAmount,
    tierId: calc.currentTier.id,
  };
}

export function simulateCommission(
  targetAmount: number,
  tiers: CommissionTier[]
): {
  tier: CommissionTier;
  rate: number;
  nextTier: CommissionTier | null;
  amountToNextTier: number;
} {
  const tier = findTierForAmount(targetAmount, tiers);
  const nextTier = findNextTier(tier, tiers);
  const amountToNextTier = nextTier ? nextTier.minAmount - targetAmount : 0;

  return {
    tier,
    rate: tier.rate,
    nextTier,
    amountToNextTier,
  };
}

export function getCumulativeMonthlyRevenue(bookings: Booking[]): number {
  return bookings
    .filter((b) => b.status === 'COMPLETED' && isInCurrentMonth(b.startTime))
    .reduce((sum, b) => sum + b.totalAmount, 0);
}
