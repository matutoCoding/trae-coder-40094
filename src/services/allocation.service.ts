import { differenceInMinutes, addMinutes, isSameDay } from 'date-fns';
import {
  Studio,
  Booking,
  BookingRequest,
  AllocationCandidate,
  AllocationResult,
  StudioBlockout,
} from '../types';
import { isOverlapping, getStudioTypeLabel } from '../utils/dateUtils';

function filterAvailableStudios(
  request: BookingRequest,
  studios: Studio[],
  existingBookings: Booking[],
  blockouts: StudioBlockout[] = []
): Studio[] {
  return studios.filter((studio) => {
    if (!studio.isActive) return false;

    const studioBookings = existingBookings.filter(
      (b) =>
        b.studioId === studio.id &&
        b.status !== 'CANCELLED' &&
        isSameDay(b.startTime, request.startTime)
    );

    const hasBookingConflict = studioBookings.some((booking) =>
      isOverlapping(request.startTime, request.endTime, booking.startTime, booking.endTime)
    );

    if (hasBookingConflict) return false;

    const studioBlockouts = blockouts.filter(
      (b) => b.studioId === studio.id && isSameDay(b.startTime, request.startTime)
    );

    const hasBlockoutConflict = studioBlockouts.some((blockout) =>
      isOverlapping(request.startTime, request.endTime, blockout.startTime, blockout.endTime)
    );

    return !hasBlockoutConflict;
  });
}

function calculateAdjacencyBonus(
  studio: Studio,
  request: BookingRequest,
  existingBookings: Booking[]
): { bonus: number; isPerfectAdjacent: boolean } {
  const studioBookings = existingBookings
    .filter(
      (b) =>
        b.studioId === studio.id &&
        b.status !== 'CANCELLED' &&
        isSameDay(b.startTime, request.startTime)
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  if (studioBookings.length === 0) return { bonus: 0, isPerfectAdjacent: false };

  let beforeGap = Infinity;
  let afterGap = Infinity;
  let isPerfectAdjacent = false;

  for (const booking of studioBookings) {
    const gapBefore = differenceInMinutes(request.startTime, booking.endTime);
    if (gapBefore >= 0 && gapBefore < beforeGap) {
      beforeGap = gapBefore;
    }

    const gapAfter = differenceInMinutes(booking.startTime, request.endTime);
    if (gapAfter >= 0 && gapAfter < afterGap) {
      afterGap = gapAfter;
    }
  }

  if (beforeGap === 0 || afterGap === 0) {
    isPerfectAdjacent = true;
    return { bonus: 100, isPerfectAdjacent: true };
  }

  const minGap = Math.min(beforeGap, afterGap);
  if (minGap < 120) {
    return { bonus: (120 - minGap) / 120 * 80, isPerfectAdjacent: false };
  }

  return { bonus: 0, isPerfectAdjacent: false };
}

function calculateFragmentationPenalty(
  studio: Studio,
  request: BookingRequest,
  existingBookings: Booking[]
): number {
  return 0;
}

function calculateMonthlyUsageRate(studio: Studio, existingBookings: Booking[]): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const studioBookings = existingBookings.filter(
    (b) =>
      b.studioId === studio.id &&
      b.status !== 'CANCELLED' &&
      b.startTime >= monthStart &&
      b.endTime <= monthEnd
  );

  const totalMinutes = studioBookings.reduce((sum, b) => sum + b.duration, 0);
  const totalHoursInMonth = 30 * 12;
  const usageRate = (totalMinutes / 60 / totalHoursInMonth) * 100;

  return Math.min(usageRate, 100);
}

function calculateSpecMatchScore(studio: Studio, request: BookingRequest): number {
  const attendeeCount = request.attendeeCount || 1;
  const durationHours = request.duration / 60;

  let typeScore = 50;
  let capacityScore = 50;

  if (attendeeCount >= 10) {
    typeScore = studio.type === 'LARGE' ? 100 : studio.type === 'MEDIUM' ? 60 : 30;
  } else if (attendeeCount >= 5) {
    typeScore = studio.type === 'MEDIUM' ? 100 : studio.type === 'LARGE' ? 70 : 40;
  } else {
    typeScore = studio.type === 'SMALL' ? 100 : studio.type === 'MEDIUM' ? 70 : 50;
  }

  if (studio.capacity >= attendeeCount) {
    const excess = studio.capacity - attendeeCount;
    capacityScore = Math.max(100 - excess * 10, 60);
  } else {
    capacityScore = Math.max(100 - (attendeeCount - studio.capacity) * 20, 20);
  }

  return (typeScore + capacityScore) / 2;
}

function calculateAllocationScore(
  studio: Studio,
  request: BookingRequest,
  existingBookings: Booking[]
): number {
  let score = 0;

  const { bonus: adjacencyBonus } = calculateAdjacencyBonus(studio, request, existingBookings);
  score += adjacencyBonus * 0.5;

  const usageRate = calculateMonthlyUsageRate(studio, existingBookings);
  score += (100 - usageRate) * 0.25;

  const specMatchScore = calculateSpecMatchScore(studio, request);
  score += specMatchScore * 0.25;

  return Math.round(score);
}

function generateAllocationReason(
  studio: Studio,
  request: BookingRequest,
  existingBookings: Booking[]
): string {
  const reasons: string[] = [];
  const attendeeCount = request.attendeeCount || 1;

  const { isPerfectAdjacent, bonus } = calculateAdjacencyBonus(studio, request, existingBookings);
  if (isPerfectAdjacent) {
    reasons.push('完美贴合已有预约形成连续档期');
  } else if (bonus > 40) {
    reasons.push('与已有预约接近，碎片化风险低');
  }

  const usageRate = calculateMonthlyUsageRate(studio, existingBookings);
  if (usageRate < 40) {
    reasons.push('本月使用率低，负载均衡优先');
  }

  const typeMatch =
    (attendeeCount >= 10 && studio.type === 'LARGE') ||
    (attendeeCount >= 5 && attendeeCount < 10 && studio.type === 'MEDIUM') ||
    (attendeeCount < 5 && studio.type === 'SMALL');
  if (typeMatch) {
    reasons.push(`${getStudioTypeLabel(studio.type)}规格匹配最优`);
  }

  if (reasons.length === 0) {
    reasons.push('综合评分最优');
  }

  return reasons.join('，');
}

export function allocateStudio(
  request: BookingRequest,
  studios: Studio[],
  existingBookings: Booking[],
  blockouts: StudioBlockout[] = []
): AllocationResult {
  const availableStudios = filterAvailableStudios(request, studios, existingBookings, blockouts);

  if (availableStudios.length === 0) {
    return {
      success: false,
      alternatives: [],
      message: '该时段所有录音棚均已被占用或处于维护期，请选择其他时段',
    };
  }

  const candidates: AllocationCandidate[] = availableStudios.map((studio) => ({
    studioId: studio.id,
    studioName: studio.name,
    score: calculateAllocationScore(studio, request, existingBookings),
    reason: generateAllocationReason(studio, request, existingBookings),
  }));

  candidates.sort((a, b) => b.score - a.score);

  return {
    success: true,
    bestMatch: candidates[0],
    alternatives: candidates.slice(1, 3),
  };
}

export function batchAllocate(
  pendingBookings: Booking[],
  studios: Studio[],
  existingBookings: Booking[],
  blockouts: StudioBlockout[] = []
): Map<string, AllocationResult> {
  const results = new Map<string, AllocationResult>();
  const currentBookings = [...existingBookings];

  const sortedBookings = [...pendingBookings].sort((a, b) => {
    if (a.duration !== b.duration) return b.duration - a.duration;
    return a.startTime.getTime() - b.startTime.getTime();
  });

  for (const booking of sortedBookings) {
    const request: BookingRequest = {
      artistId: booking.artistId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      attendeeCount: booking.attendeeCount,
      notes: booking.notes,
    };

    const result = allocateStudio(request, studios, currentBookings, blockouts);
    results.set(booking.id, result);

    if (result.success && result.bestMatch) {
      currentBookings.push({
        ...booking,
        studioId: result.bestMatch.studioId,
        status: 'ALLOCATED',
      });
    }
  }

  return results;
}
