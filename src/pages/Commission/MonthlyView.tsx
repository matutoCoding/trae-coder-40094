import { useState, useMemo } from 'react';
import {
  ChevronDown,
  HelpCircle,
  Calculator,
  Zap,
  User,
} from 'lucide-react';
import { format, isSameMonth, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import { CommissionTier, Artist } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { simulateCommission } from '@/services/commission.service';
import { getTierName } from './commissionConstants';

interface ArtistMonthlyStats {
  artist: Artist;
  totalAmount: number;
  orderCount: number;
  currentTier: CommissionTier;
  nextTier: CommissionTier | null;
  amountToNextTier: number;
  progressPercent: number;
  nextOrderRate: number;
  artistShare: number;
}

interface SimulationResult {
  orderAmount: number;
  currentRate: number;
  simulatedRate: number;
  currentCommission: number;
  simulatedCommission: number;
  diff: number;
}

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

export function MonthlyView({
  simulateAmount,
  setSimulateAmount,
}: {
  simulateAmount: string;
  setSimulateAmount: (v: string) => void;
}) {
  const { artists, bookings, tiers } = useAppStore();

  const currentDate = new Date();
  const last6Months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => subMonths(currentDate, i));
  }, [currentDate]);

  const [selectedMonth, setSelectedMonth] = useState<Date>(currentDate);
  const [selectedArtistId, setSelectedArtistId] = useState<string>('all');
  const [showSimResult, setShowSimResult] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const sortedTiers = useMemo(() => {
    return [...tiers].filter((t) => t.isActive).sort((a, b) => a.tierOrder - b.tierOrder);
  }, [tiers]);

  const artistStats = useMemo((): ArtistMonthlyStats[] => {
    return artists.map((artist) => {
      const artistBookings = bookings.filter(
        (b) => b.artistId === artist.id && b.status === 'COMPLETED' && isSameMonth(b.startTime, selectedMonth)
      );
      const totalAmount = artistBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const orderCount = artistBookings.length;
      const currentTier = findTierForAmount(totalAmount, tiers);
      const nextTier = findNextTier(currentTier, tiers);
      const amountToNextTier = nextTier ? Math.max(0, nextTier.minAmount - totalAmount) : 0;

      let progressPercent = 100;
      if (nextTier) {
        const tierRange = nextTier.minAmount - currentTier.minAmount;
        const progress = totalAmount - currentTier.minAmount;
        progressPercent = Math.min(Math.max((progress / tierRange) * 100, 0), 100);
      }

      const nextOrderRate = currentTier.rate;
      const artistShare = totalAmount - Math.round(totalAmount * (currentTier.rate / 100));

      return {
        artist,
        totalAmount,
        orderCount,
        currentTier,
        nextTier,
        amountToNextTier,
        progressPercent,
        nextOrderRate,
        artistShare,
      };
    });
  }, [artists, bookings, selectedMonth, tiers]);

  const filteredStats = useMemo(() => {
    if (selectedArtistId === 'all') return artistStats;
    return artistStats.filter((s) => s.artist.id === selectedArtistId);
  }, [artistStats, selectedArtistId]);

  const selectedArtistStats = useMemo(() => {
    if (selectedArtistId === 'all') return null;
    return artistStats.find((s) => s.artist.id === selectedArtistId) || null;
  }, [artistStats, selectedArtistId]);

  const enhancedSimulation = useMemo(() => {
    if (!selectedArtistStats) return null;
    const amount = parseFloat(simulateAmount) || 0;
    const currentTotal = selectedArtistStats.totalAmount;
    const simulatedTotal = currentTotal + amount;
    const simResult = simulateCommission(simulatedTotal, tiers);
    const currentSim = simulateCommission(currentTotal, tiers);

    return {
      currentTotal,
      simulatedTotal,
      currentTier: currentSim.tier,
      simulatedTier: simResult.tier,
      simulatedRate: simResult.rate,
      amount,
    };
  }, [selectedArtistStats, simulateAmount, tiers]);

  const handleSimulateOrder = () => {
    if (!selectedArtistStats) return;
    const amount = parseFloat(simulateAmount) || 0;
    if (amount <= 0) return;

    const currentTotal = selectedArtistStats.totalAmount;
    const currentTier = findTierForAmount(currentTotal, tiers);
    const simulatedTotal = currentTotal + amount;
    const simulatedTier = findTierForAmount(simulatedTotal, tiers);

    const currentCommission = Math.round(amount * (currentTier.rate / 100));
    const simulatedCommission = Math.round(amount * (simulatedTier.rate / 100));

    setSimResult({
      orderAmount: amount,
      currentRate: currentTier.rate,
      simulatedRate: simulatedTier.rate,
      currentCommission,
      simulatedCommission,
      diff: currentCommission - simulatedCommission,
    });
    setShowSimResult(true);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-display font-semibold text-text-primary mb-6">月度经营视角</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">选择月份</label>
            <div className="relative">
              <select
                value={selectedMonth.toISOString()}
                onChange={(e) => setSelectedMonth(new Date(e.target.value))}
                className="input-field appearance-none pr-10"
              >
                {last6Months.map((month) => (
                  <option key={month.toISOString()} value={month.toISOString()}>
                    {format(month, 'yyyy年MM月', { locale: zhCN })}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">选择艺人</label>
            <div className="relative">
              <select
                value={selectedArtistId}
                onChange={(e) => setSelectedArtistId(e.target.value)}
                className="input-field appearance-none pr-10"
              >
                <option value="all">全部艺人</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gold-dark/30 via-gold/20 to-gold-dark/30 border-b border-gold/30">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gold">艺人</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gold">本月累计成交额</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gold">当前档位</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gold w-48">距离下一档</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gold">下一单抽成</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gold">订单数</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gold">预计分成</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.map((stats) => (
                <tr key={stats.artist.id} className="border-b border-gold/10 hover:bg-gold/5 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold-dark/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-gold" />
                      </div>
                      <span className="font-medium text-text-primary">{stats.artist.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-display text-2xl font-bold text-gold">
                      {formatCurrency(stats.totalAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div>
                      <span className="text-text-primary font-medium">{getTierName(stats.currentTier.tierOrder)}</span>
                      <span className="ml-2 text-gold text-sm">({formatPercent(stats.currentTier.rate)})</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {stats.nextTier ? (
                      <div>
                        <p className="text-xs text-text-muted mb-1">
                          还差 <span className="text-gold font-medium">{formatCurrency(stats.amountToNextTier)}</span>
                        </p>
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${stats.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-neon-green text-sm font-medium">已达最高档</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="relative inline-flex items-center gap-1 group">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-gold/20 to-gold-dark/20 text-gold font-semibold text-sm border border-gold/30">
                        {formatPercent(stats.nextOrderRate)}
                      </span>
                      <div className="cursor-help">
                        <HelpCircle className="w-4 h-4 text-text-muted" />
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-bg-tertiary border border-gold/30 rounded-lg text-xs text-text-secondary opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        下一单成交后，按当月累计成交额对应的档位计算抽成比例
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-text-primary font-medium">{stats.orderCount}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-neon-green font-semibold">{formatCurrency(stats.artistShare)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gold/10 rounded-xl">
            <Calculator className="w-6 h-6 text-gold" />
          </div>
          <h2 className="text-xl font-display font-semibold text-text-primary">模拟计算器</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">预计成交额</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">¥</span>
              <input
                type="number"
                value={simulateAmount}
                onChange={(e) => setSimulateAmount(e.target.value)}
                className="input-field pl-8"
                placeholder="请输入预计成交额"
                min="0"
              />
            </div>
          </div>

          {selectedArtistStats && enhancedSimulation && (
            <div className="bg-gradient-to-br from-gold/10 to-gold-dark/5 rounded-xl p-4 border border-gold/20">
              <p className="text-sm text-text-muted mb-3">
                <span className="text-text-primary">{selectedArtistStats.artist.name}</span> 当前累计
              </p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-text-muted">{formatCurrency(enhancedSimulation.currentTotal)}</span>
                <span className="text-gold">+</span>
                <span className="text-text-primary">{formatCurrency(enhancedSimulation.amount)}</span>
                <span className="text-gold">=</span>
                <span className="text-gold font-bold font-display">{formatCurrency(enhancedSimulation.simulatedTotal)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div className="bg-bg-tertiary/50 rounded-lg p-3">
                  <p className="text-text-muted mb-1">当前档位</p>
                  <p className="text-text-primary font-medium">
                    {getTierName(enhancedSimulation.currentTier.tierOrder)} · {formatPercent(enhancedSimulation.currentTier.rate)}
                  </p>
                </div>
                <div className="bg-bg-tertiary/50 rounded-lg p-3">
                  <p className="text-text-muted mb-1">模拟后档位</p>
                  <p className="text-gold font-medium">
                    {getTierName(enhancedSimulation.simulatedTier.tierOrder)} · {formatPercent(enhancedSimulation.simulatedRate)}
                  </p>
                </div>
              </div>

              <p className="text-xs text-text-muted bg-bg-tertiary/30 rounded-lg p-2">
                ⚠️ 模拟结果仅影响未来订单，实际已结算订单不追溯调整
              </p>

              <button
                onClick={handleSimulateOrder}
                className="w-full mt-4 btn-gold flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                模拟新增订单
              </button>
            </div>
          )}

          {!selectedArtistStats && (
            <div className="bg-bg-tertiary/30 rounded-xl p-4 text-center text-text-muted text-sm">
              请在上方选择单个艺人以启用增强模拟功能
            </div>
          )}
        </div>
      </div>

      {showSimResult && simResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowSimResult(false)}>
          <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-display font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-gold" />
              模拟订单结果
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gold/10">
                <span className="text-text-muted">订单金额</span>
                <span className="text-gold font-bold font-display text-xl">{formatCurrency(simResult.orderAmount)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-tertiary/50 rounded-lg p-3">
                  <p className="text-text-muted text-xs mb-1">当前档位抽成</p>
                  <p className="text-text-primary font-semibold">{formatPercent(simResult.currentRate)}</p>
                  <p className="text-text-secondary text-sm">{formatCurrency(simResult.currentCommission)}</p>
                </div>
                <div className="bg-gold/10 rounded-lg p-3 border border-gold/20">
                  <p className="text-gold text-xs mb-1">模拟档位抽成</p>
                  <p className="text-gold font-semibold">{formatPercent(simResult.simulatedRate)}</p>
                  <p className="text-gold text-sm">{formatCurrency(simResult.simulatedCommission)}</p>
                </div>
              </div>

              <div className="bg-bg-tertiary/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">差额</span>
                  <span className={`font-bold ${simResult.diff >= 0 ? 'text-neon-green' : 'text-error'}`}>
                    {simResult.diff >= 0 ? '+' : ''}{formatCurrency(simResult.diff)}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  {simResult.diff > 0
                    ? `升档后可多获得 ${formatCurrency(simResult.diff)} 收入`
                    : simResult.diff < 0
                    ? `降档后少获得 ${formatCurrency(Math.abs(simResult.diff))} 收入`
                    : '档位未发生变化'}
                </p>
              </div>

              <button onClick={() => setShowSimResult(false)} className="w-full btn-gold">
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
