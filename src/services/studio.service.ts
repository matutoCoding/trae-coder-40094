import { Studio, Booking, StudioUsageStats } from '../types';
import { isInCurrentMonth } from '../utils/dateUtils';

export function getStudioUsageStats(
  studio: Studio,
  bookings: Booking[]
): StudioUsageStats {
  const studioBookings = bookings.filter(
    (b) => b.studioId === studio.id && b.status !== 'CANCELLED' && isInCurrentMonth(b.startTime)
  );

  const totalHours = studioBookings.reduce((sum, b) => sum + b.duration / 60, 0);
  const totalHoursInMonth = 30 * 12;
  const utilizationRate = (totalHours / totalHoursInMonth) * 100;
  const revenue = studioBookings.reduce((sum, b) => sum + b.totalAmount, 0);

  return {
    studioId: studio.id,
    studioName: studio.name,
    totalHours: Math.round(totalHours * 10) / 10,
    utilizationRate: Math.min(Math.round(utilizationRate * 10) / 10, 100),
    revenue,
  };
}

export function getAllStudiosUsageStats(
  studios: Studio[],
  bookings: Booking[]
): StudioUsageStats[] {
  return studios
    .filter((s) => s.isActive)
    .map((s) => getStudioUsageStats(s, bookings))
    .sort((a, b) => b.utilizationRate - a.utilizationRate);
}

export function calculateBookingAmount(
  studio: Studio,
  durationMinutes: number
): number {
  const hours = durationMinutes / 60;
  return Math.round(studio.hourlyRate * hours);
}
