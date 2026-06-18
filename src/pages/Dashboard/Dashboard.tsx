import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, Percent, Clock, TrendingUp, Award } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/ui/DataTable';
import { getCumulativeMonthlyRevenue } from '@/services/commission.service';
import { getAllStudiosUsageStats } from '@/services/studio.service';
import { formatCurrency } from '@/utils/formatters';
import { formatDateTime, getBookingStatusLabel } from '@/utils/dateUtils';
import { Booking, StudioUsageStats } from '@/types';

export function Dashboard() {
  const { bookings, studios, tiers, artists } = useAppStore();

  const stats = useMemo(() => {
    const monthlyRevenue = getCumulativeMonthlyRevenue(bookings);
    const usageStats = getAllStudiosUsageStats(studios, bookings);
    const avgUtilization = usageStats.length > 0
      ? usageStats.reduce((sum, s) => sum + s.utilizationRate, 0) / usageStats.length
      : 0;
    const pendingCount = bookings.filter(b => b.status === 'PENDING').length;

    const sortedTiers = [...tiers].filter(t => t.isActive).sort((a, b) => a.tierOrder - b.tierOrder);
    const currentTier = sortedTiers.find(t => monthlyRevenue >= t.minAmount && monthlyRevenue < t.maxAmount) || sortedTiers[sortedTiers.length - 1];
    const nextTierIndex = sortedTiers.findIndex(t => t.id === currentTier.id) + 1;
    const nextTier = nextTierIndex < sortedTiers.length ? sortedTiers[nextTierIndex] : null;
    const amountToNextTier = nextTier ? nextTier.minAmount - monthlyRevenue : 0;
    const progressToNextTier = nextTier
      ? Math.min(((monthlyRevenue - currentTier.minAmount) / (nextTier.minAmount - currentTier.minAmount)) * 100, 100)
      : 100;

    const recentBookings = [...bookings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      monthlyRevenue,
      avgUtilization,
      pendingCount,
      currentRate: currentTier.rate,
      currentTier,
      nextTier,
      amountToNextTier,
      progressToNextTier,
      topStudios: usageStats.slice(0, 5),
      recentBookings,
    };
  }, [bookings, studios, tiers, artists]);

  const columns = [
    {
      key: 'id',
      header: '预约编号',
      render: (row: Booking) => <span className="text-gold font-mono">{row.id.slice(-6).toUpperCase()}</span>,
      width: '120px',
    },
    {
      key: 'artistId',
      header: '艺人',
      render: (row: Booking) => {
        const artist = artists.find(a => a.id === row.artistId);
        return <span>{artist?.name || '-'}</span>;
      },
      width: '100px',
    },
    {
      key: 'studioId',
      header: '棚位',
      render: (row: Booking) => {
        const studio = studios.find(s => s.id === row.studioId);
        return <span>{studio?.name || '待分配'}</span>;
      },
      width: '100px',
    },
    {
      key: 'startTime',
      header: '预约时间',
      render: (row: Booking) => formatDateTime(row.startTime),
      width: '160px',
    },
    {
      key: 'totalAmount',
      header: '金额',
      render: (row: Booking) => row.totalAmount > 0 ? formatCurrency(row.totalAmount) : '-',
      width: '100px',
    },
    {
      key: 'status',
      header: '状态',
      render: (row: Booking) => <StatusBadge status={row.status} />,
      width: '100px',
    },
  ];

  const barColors = ['#d4af37', '#c4a030', '#b49129', '#a48222', '#94731b'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="本月成交额"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={<DollarSign className="w-6 h-6" />}
          trend={12.5}
          trendLabel="较上月"
          delay={0}
        />
        <StatCard
          title="棚平均利用率"
          value={`${stats.avgUtilization.toFixed(1)}%`}
          icon={<Percent className="w-6 h-6" />}
          trend={5.2}
          trendLabel="较上月"
          delay={100}
        />
        <StatCard
          title="待分配预约数"
          value={stats.pendingCount.toString()}
          icon={<Clock className="w-6 h-6" />}
          trend={-3}
          trendLabel="较昨日"
          delay={200}
        />
        <StatCard
          title="当前抽成比例"
          value={`${stats.currentRate}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          delay={300}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-gold" />
            <h3 className="text-lg font-semibold text-text-primary">阶梯抽成进度</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-text-muted text-sm">当前累计成交额</p>
                <p className="text-2xl font-bold text-gold font-display">{formatCurrency(stats.monthlyRevenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-text-muted text-sm">当前档位</p>
                <p className="text-xl font-semibold text-text-primary">第 {stats.currentTier.tierOrder} 档 · {stats.currentTier.rate}%</p>
              </div>
            </div>
            {stats.nextTier && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-muted">距下一档位（{stats.nextTier.rate}%）还差</span>
                  <span className="text-gold font-medium">{formatCurrency(stats.amountToNextTier)}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${stats.progressToNextTier}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-2 text-text-muted">
                  <span>{formatCurrency(stats.currentTier.minAmount)}</span>
                  <span>{formatCurrency(stats.nextTier.minAmount)}</span>
                </div>
              </div>
            )}
            {!stats.nextTier && (
              <div className="text-center py-4 bg-gold/5 rounded-lg border border-gold/20">
                <p className="text-gold font-medium">🎉 已达到最高档位</p>
              </div>
            )}
          </div>
        </div>

        <div className="card animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-gold" />
            <h3 className="text-lg font-semibold text-text-primary">棚利用率 TOP5</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.topStudios}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#666', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="studioName"
                  tick={{ fill: '#a0a0a0', fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141414',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, '利用率']}
                  cursor={{ fill: 'rgba(212, 175, 55, 0.1)' }}
                />
                <Bar dataKey="utilizationRate" radius={[0, 4, 4, 0]}>
                  {stats.topStudios.map((entry: StudioUsageStats, index: number) => (
                    <Cell key={`cell-${entry.studioId}`} fill={barColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card animate-slide-up" style={{ animationDelay: '600ms' }}>
        <h3 className="text-lg font-semibold text-text-primary mb-6">最近预约</h3>
        <DataTable<Booking>
          columns={columns}
          data={stats.recentBookings}
          emptyMessage="暂无预约记录"
        />
      </div>
    </div>
  );
}
