import { useState, useMemo } from 'react';
import {
  ChevronDown,
  DollarSign,
  Clock,
  AlertCircle,
  Music,
  Building2,
  Users,
  FileText,
  Disc,
  Eye,
} from 'lucide-react';
import { format, isSameMonth, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, formatDuration } from '@/utils/formatters';
import { getStudioTypeLabel } from '@/utils/dateUtils';
import { CommissionTier } from '@/types';
import { getTierName } from './commissionConstants';

type Dimension = 'studio' | 'artist';

interface StudioSummary {
  studioId: string;
  studioName: string;
  studioType: string;
  revenue: number;
  duration: number;
  utilization: number;
  unsettledAmount: number;
  pendingMasters: number;
}

interface ArtistSummary {
  artistId: string;
  artistName: string;
  revenue: number;
  orderCount: number;
  currentTier: CommissionTier;
  unsettledAmount: number;
  pendingMasters: number;
  lastCompletedBookingId: string | null;
}

function findTierForAmount(amount: number, tiers: CommissionTier[]): CommissionTier {
  const sortedTiers = [...tiers]
    .filter((t) => t.isActive)
    .sort((a, b) => a.tierOrder - b.tierOrder);
  for (const tier of sortedTiers) {
    if (amount >= tier.minAmount && amount < tier.maxAmount) {
      return tier;
    }
  }
  return sortedTiers[sortedTiers.length - 1];
}

export function MonthlyDashboard() {
  const navigate = useNavigate();
  const {
    bookings,
    settlements,
    masters,
    studios,
    artists,
    tiers,
    setHighlight,
  } = useAppStore();

  const currentDate = new Date();
  const last12Months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => subMonths(currentDate, i));
  }, [currentDate]);

  const [selectedMonth, setSelectedMonth] = useState<Date>(currentDate);
  const [dimension, setDimension] = useState<Dimension>('studio');

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => isSameMonth(b.startTime, selectedMonth));
  }, [bookings, selectedMonth]);

  const completedBookings = useMemo(() => {
    return filteredBookings.filter((b) => b.status === 'COMPLETED');
  }, [filteredBookings]);

  const activeBookings = useMemo(() => {
    return filteredBookings.filter(
      (b) => b.status === 'ALLOCATED' || b.status === 'CONFIRMED' || b.status === 'COMPLETED'
    );
  }, [filteredBookings]);

  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => isSameMonth(s.settlementDate, selectedMonth));
  }, [settlements, selectedMonth]);

  const bookingIdsInMonth = useMemo(() => {
    return new Set(filteredBookings.map((b) => b.id));
  }, [filteredBookings]);

  const filteredMasters = useMemo(() => {
    return masters.filter((m) => bookingIdsInMonth.has(m.bookingId));
  }, [masters, bookingIdsInMonth]);

  const metrics = useMemo(() => {
    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalDurationMinutes = activeBookings.reduce((sum, b) => sum + b.duration, 0);
    const totalDurationHours = Number((totalDurationMinutes / 60).toFixed(1));
    const unsettledAmount = filteredSettlements
      .filter((s) => s.status === 'UNSETTLED')
      .reduce((sum, s) => sum + s.artistAmount, 0);
    const pendingMastersCount = filteredMasters.filter((m) => !m.isConfirmed).length;

    return {
      totalRevenue,
      totalDurationHours,
      unsettledAmount,
      pendingMastersCount,
    };
  }, [completedBookings, activeBookings, filteredSettlements, filteredMasters]);

  const studioSummaries = useMemo((): StudioSummary[] => {
    return studios.map((studio) => {
      const studioBookingsCompleted = completedBookings.filter((b) => b.studioId === studio.id);
      const studioBookingsActive = activeBookings.filter((b) => b.studioId === studio.id);
      const studioBookingIds = new Set(studioBookingsCompleted.map((b) => b.id));
      const studioBookingIdsAll = new Set(filteredBookings.filter((b) => b.studioId === studio.id).map((b) => b.id));

      const revenue = studioBookingsCompleted.reduce((sum, b) => sum + b.totalAmount, 0);
      const durationMinutes = studioBookingsActive.reduce((sum, b) => sum + b.duration, 0);
      const durationHours = Number((durationMinutes / 60).toFixed(1));
      const utilization = Number(Math.min((durationMinutes / (360 * 60)) * 100, 100).toFixed(1));

      const studioSettlements = filteredSettlements.filter((s) => {
        const booking = bookings.find((b) => b.id === s.bookingId);
        return booking?.studioId === studio.id;
      });
      const unsettledAmount = studioSettlements
        .filter((s) => s.status === 'UNSETTLED')
        .reduce((sum, s) => sum + s.artistAmount, 0);

      const pendingMasters = filteredMasters.filter((m) => {
        const booking = bookings.find((b) => b.id === m.bookingId);
        return booking?.studioId === studio.id && !m.isConfirmed;
      }).length;

      return {
        studioId: studio.id,
        studioName: studio.name,
        studioType: studio.type,
        revenue,
        duration: durationHours,
        utilization,
        unsettledAmount,
        pendingMasters,
      };
    });
  }, [studios, completedBookings, activeBookings, filteredBookings, filteredSettlements, filteredMasters, bookings]);

  const artistSummaries = useMemo((): ArtistSummary[] => {
    return artists.map((artist) => {
      const artistBookingsCompleted = completedBookings.filter((b) => b.artistId === artist.id);
      const artistBookingIds = new Set(artistBookingsCompleted.map((b) => b.id));

      const revenue = artistBookingsCompleted.reduce((sum, b) => sum + b.totalAmount, 0);
      const orderCount = artistBookingsCompleted.length;
      const currentTier = findTierForAmount(revenue, tiers);

      const artistSettlements = filteredSettlements.filter((s) => {
        const booking = bookings.find((b) => b.id === s.bookingId);
        return booking?.artistId === artist.id;
      });
      const unsettledAmount = artistSettlements
        .filter((s) => s.status === 'UNSETTLED')
        .reduce((sum, s) => sum + s.artistAmount, 0);

      const pendingMasters = filteredMasters.filter((m) => {
        const booking = bookings.find((b) => b.id === m.bookingId);
        return booking?.artistId === artist.id && !m.isConfirmed;
      }).length;

      const sortedCompleted = [...artistBookingsCompleted].sort(
        (a, b) => b.endTime.getTime() - a.endTime.getTime()
      );
      const lastCompletedBookingId = sortedCompleted[0]?.id || null;

      return {
        artistId: artist.id,
        artistName: artist.name,
        revenue,
        orderCount,
        currentTier,
        unsettledAmount,
        pendingMasters,
        lastCompletedBookingId,
      };
    });
  }, [artists, completedBookings, filteredSettlements, filteredMasters, bookings, tiers]);

  const handleViewStudioDetail = (studioId: string) => {
    setHighlight({ bookingId: undefined });
    navigate('/studios');
  };

  const handleViewSettlement = (bookingId: string | null) => {
    if (bookingId) {
      setHighlight({ bookingId });
    }
    navigate('/settlement');
  };

  const handleViewMasters = (bookingId: string | null) => {
    if (bookingId) {
      setHighlight({ bookingId });
    }
    navigate('/masters');
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-400">月度汇总看板</h2>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-gold/60 via-gold to-gold/60 mb-6" />

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="w-full lg:w-48">
          <label className="block text-sm font-medium text-text-primary mb-2">选择月份</label>
          <div className="relative">
            <select
              value={selectedMonth.toISOString()}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
              className="input-field appearance-none pr-10 w-full"
            >
              {last12Months.map((month) => (
                <option key={month.toISOString()} value={month.toISOString()}>
                  {format(month, 'yyyy年MM月', { locale: zhCN })}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 flex items-end">
          <div className="inline-flex rounded-lg bg-bg-secondary p-1 border border-gold/20">
            <button
              onClick={() => setDimension('studio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                dimension === 'studio'
                  ? 'bg-gold text-bg-primary shadow-gold'
                  : 'text-text-secondary hover:text-gold hover:bg-gold/10'
              }`}
            >
              <Building2 className="w-4 h-4" />
              按录音棚
            </button>
            <button
              onClick={() => setDimension('artist')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                dimension === 'artist'
                  ? 'bg-gold text-bg-primary shadow-gold'
                  : 'text-text-secondary hover:text-gold hover:bg-gold/10'
              }`}
            >
              <Users className="w-4 h-4" />
              按艺人
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="总收入"
          value={formatCurrency(metrics.totalRevenue)}
          icon={<DollarSign className="w-6 h-6" />}
        />
        <StatCard
          title="总使用时长"
          value={`${metrics.totalDurationHours} 小时`}
          icon={<Clock className="w-6 h-6" />}
        />
        <StatCard
          title="未结算金额"
          value={formatCurrency(metrics.unsettledAmount)}
          icon={<AlertCircle className="w-6 h-6" />}
        />
        <StatCard
          title="母带待确认"
          value={metrics.pendingMastersCount.toString()}
          icon={<Music className="w-6 h-6" />}
        />
      </div>

      {dimension === 'studio' ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gold-dark/30 via-gold/20 to-gold-dark/30 border-b border-gold/30">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gold">录音棚</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gold">本月收入</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gold">使用时长</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gold w-48">利用率</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gold">未结算</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gold">母带待确认</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gold">操作</th>
              </tr>
            </thead>
            <tbody>
              {studioSummaries.map((summary) => (
                <tr
                  key={summary.studioId}
                  className="border-b border-gold/10 hover:bg-gold/5 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/20 to-gold-dark/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <span className="font-medium text-text-primary block">
                          {summary.studioName}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gold/15 text-gold mt-1">
                          {getStudioTypeLabel(summary.studioType)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-display text-xl font-bold text-gold">
                      {formatCurrency(summary.revenue)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-text-primary font-medium">
                      {summary.duration} 小时
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-xs text-text-muted mb-1">
                        <span className="text-gold font-medium">{summary.utilization}%</span>
                      </p>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${summary.utilization}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-warning font-medium">
                      {formatCurrency(summary.unsettledAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        summary.pendingMasters > 0
                          ? 'bg-neon-red/20 text-neon-red'
                          : 'bg-bg-tertiary text-text-muted'
                      }`}
                    >
                      {summary.pendingMasters}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => handleViewStudioDetail(summary.studioId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gold/30 text-gold hover:bg-gold/10 hover:border-gold transition-all duration-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      查看明细
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gold-dark/30 via-gold/20 to-gold-dark/30 border-b border-gold/30">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gold">艺人</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gold">本月成交</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gold">订单数量</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gold">当前档位</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gold">未结算</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gold">母带待确认</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gold">操作</th>
              </tr>
            </thead>
            <tbody>
              {artistSummaries.map((summary) => (
                <tr
                  key={summary.artistId}
                  className="border-b border-gold/10 hover:bg-gold/5 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold-dark/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-gold" />
                      </div>
                      <span className="font-medium text-text-primary">
                        {summary.artistName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-display text-xl font-bold text-gold">
                      {formatCurrency(summary.revenue)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-text-primary font-medium">{summary.orderCount}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div>
                      <span className="text-text-primary font-medium">
                        {getTierName(summary.currentTier.tierOrder)}
                      </span>
                      <span className="ml-2 text-gold text-sm">
                        ({summary.currentTier.rate}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-warning font-medium">
                      {formatCurrency(summary.unsettledAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        summary.pendingMasters > 0
                          ? 'bg-neon-red/20 text-neon-red'
                          : 'bg-bg-tertiary text-text-muted'
                      }`}
                    >
                      {summary.pendingMasters}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewSettlement(summary.lastCompletedBookingId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gold/30 text-gold hover:bg-gold/10 hover:border-gold transition-all duration-200"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        查看对账单
                      </button>
                      <button
                        onClick={() => handleViewMasters(summary.lastCompletedBookingId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gold/30 text-gold hover:bg-gold/10 hover:border-gold transition-all duration-200"
                      >
                        <Disc className="w-3.5 h-3.5" />
                        查看母带
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
