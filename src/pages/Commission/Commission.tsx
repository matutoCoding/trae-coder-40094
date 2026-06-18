import { useState, useMemo } from 'react';
import {
  Plus,
  TrendingUp,
  Edit2,
  Trash2,
  Save,
  History,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  DollarSign,
  Percent,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import { CommissionTier } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { MonthlyView } from './MonthlyView';
import { MonthlyDashboard } from './MonthlyDashboard';
import { getTierName, tierHistoryData, TierHistoryRecord, TierFormData } from './commissionConstants';

const initialFormData: TierFormData = {
  minAmount: 0,
  maxAmount: 100000,
  rate: 10,
  tierOrder: 1,
  isActive: true,
};

export function Commission() {
  const { tiers, updateTier, addTier } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<CommissionTier | null>(null);
  const [formData, setFormData] = useState<TierFormData>(initialFormData);
  const [simulateAmount, setSimulateAmount] = useState<string>('50000');
  const [showHistory, setShowHistory] = useState(false);
  const [tierHistory] = useState<TierHistoryRecord[]>(tierHistoryData);

  const sortedTiers = useMemo(() => {
    return [...tiers].sort((a, b) => a.tierOrder - b.tierOrder);
  }, [tiers]);

  const chartData = useMemo(() => {
    const data: { amount: number; rate: number; name: string }[] = [];
    const activeTiers = sortedTiers.filter((t) => t.isActive);

    activeTiers.forEach((tier, index) => {
      if (index === 0) {
        data.push({
          amount: tier.minAmount,
          rate: tier.rate,
          name: formatCurrency(tier.minAmount),
        });
      }

      data.push({
        amount: tier.maxAmount - 1,
        rate: tier.rate,
        name: formatCurrency(tier.maxAmount - 1),
      });

      if (index < activeTiers.length - 1) {
        data.push({
          amount: tier.maxAmount,
          rate: activeTiers[index + 1].rate,
          name: formatCurrency(tier.maxAmount),
        });
      }
    });

    return data;
  }, [sortedTiers]);

  const handleAddTier = () => {
    const maxOrder = sortedTiers.length > 0 ? Math.max(...sortedTiers.map((t) => t.tierOrder)) + 1 : 1;
    setEditingTier(null);
    setFormData({
      ...initialFormData,
      tierOrder: maxOrder,
    });
    setIsModalOpen(true);
  };

  const handleEditTier = (tier: CommissionTier) => {
    setEditingTier(tier);
    setFormData({
      minAmount: tier.minAmount,
      maxAmount: tier.maxAmount,
      rate: tier.rate,
      tierOrder: tier.tierOrder,
      isActive: tier.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDeleteTier = (id: string) => {
    if (window.confirm('确定要删除这个档位吗？')) {
      updateTier(id, { isActive: false });
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateTier(id, { isActive: !isActive });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTier) {
      updateTier(editingTier.id, formData);
    } else {
      addTier(formData);
    }
    setIsModalOpen(false);
  };

  const handleMoveTier = (index: number, direction: 'up' | 'down') => {
    const newTiers = [...sortedTiers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newTiers.length) return;

    const currentTier = newTiers[index];
    const targetTier = newTiers[targetIndex];

    updateTier(currentTier.id, { tierOrder: targetTier.tierOrder });
    updateTier(targetTier.id, { tierOrder: currentTier.tierOrder });
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-secondary border border-gold/30 rounded-lg p-3 shadow-gold">
          <p className="text-text-primary font-medium">{label}</p>
          <p className="text-gold font-semibold">{formatPercent(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary mb-2">抽成配置</h1>
            <p className="text-text-secondary">管理阶梯抽成档位和规则</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                showHistory
                  ? 'bg-gold text-bg-primary'
                  : 'border border-gold/30 text-gold hover:border-gold hover:bg-gold/10'
              }`}
            >
              <History className="w-4 h-4" />
              历史版本
            </button>
            <button onClick={handleAddTier} className="flex items-center gap-2 btn-gold">
              <Plus className="w-4 h-4" />
              添加档位
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="当前激活档位"
            value={sortedTiers.filter((t) => t.isActive).length.toString()}
            icon={<TrendingUp className="w-6 h-6" />}
            trend={5}
            trendLabel="较上月"
          />
          <StatCard
            title="最高抽成比例"
            value={formatPercent(Math.max(...sortedTiers.filter((t) => t.isActive).map((t) => t.rate), 0))}
            icon={<Percent className="w-6 h-6" />}
          />
          <StatCard
            title="档位区间"
            value={`${formatCurrency(0)} - ${formatCurrency(Math.max(...sortedTiers.map((t) => t.maxAmount)))}`}
            icon={<DollarSign className="w-6 h-6" />}
          />
        </div>

        <div className="mb-8">
          <MonthlyDashboard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-xl font-display font-semibold text-text-primary mb-6">阶梯档位配置</h2>
              <div className="space-y-4">
                {sortedTiers.map((tier, index) => (
                  <div
                    key={tier.id}
                    className={`relative overflow-hidden transition-all duration-300 ${
                      tier.isActive
                        ? 'bg-bg-tertiary/50 border-l-4 border-l-gold shadow-gold'
                        : 'bg-bg-tertiary/30 border-l-4 border-l-gray-600'
                    } rounded-xl p-5`}
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleMoveTier(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-text-muted hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveTier(index, 'down')}
                              disabled={index === sortedTiers.length - 1}
                              className="p-1 text-text-muted hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              tier.isActive
                                ? 'bg-gradient-to-br from-gold/20 to-gold-dark/10'
                                : 'bg-bg-secondary'
                            }`}
                          >
                            <span className={`font-display font-bold text-lg ${tier.isActive ? 'text-gold' : 'text-text-muted'}`}>
                              {tier.tierOrder}
                            </span>
                          </div>
                          <div>
                            <h3 className={`font-semibold text-lg ${tier.isActive ? 'text-text-primary' : 'text-text-muted'}`}>
                              {getTierName(tier.tierOrder)}
                            </h3>
                            <p className="text-sm text-text-muted">
                              {formatCurrency(tier.minAmount)} - {formatCurrency(tier.maxAmount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                              tier.isActive ? 'bg-gold/20 text-gold' : 'bg-gray-700 text-gray-400'}`}
                          >
                            {formatPercent(tier.rate)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleActive(tier.id, tier.isActive)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                              tier.isActive
                                ? 'bg-neon-green/20 text-neon-green hover:bg-neon-green/30'
                                : 'bg-text-muted/20 text-text-muted hover:bg-text-muted/30'}`}
                          >
                            {tier.isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            {tier.isActive ? '已激活' : '已停用'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditTier(tier)}
                            className="p-2 bg-bg-secondary rounded-lg text-text-secondary hover:text-gold hover:bg-gold/10 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTier(tier.id)}
                            className="p-2 bg-bg-secondary rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-display font-semibold text-text-primary mb-6">阶梯抽成曲线</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#b8960c" />
                        <stop offset="50%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="#e6c86a" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.1)" />
                    <XAxis
                      dataKey="name"
                      stroke="#666666"
                      tick={{ fill: '#a0a0a0', fontSize: 12 }}
                      tickLine={{ stroke: 'rgba(212, 175, 55, 0.2)' }}
                    />
                    <YAxis
                      stroke="#666666"
                      tick={{ fill: '#a0a0a0', fontSize: 12 }}
                      tickLine={{ stroke: 'rgba(212, 175, 55, 0.2)' }}
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {sortedTiers.filter((t) => t.isActive).map((tier) => (
                      <ReferenceLine
                        key={tier.id}
                        x={formatCurrency(tier.minAmount)}
                        stroke="rgba(212, 175, 55, 0.3)"
                        strokeDasharray="5 5"
                        label={{
                          value: getTierName(tier.tierOrder),
                          position: 'top',
                          fill: '#d4af37',
                          fontSize: 11,
                        }}
                      />
                    ))}
                    <Line
                      type="stepAfter"
                      dataKey="rate"
                      stroke="url(#goldGradient)"
                      strokeWidth={3}
                      dot={{ fill: '#d4af37', strokeWidth: 2, r: 5, stroke: '#141414' }}
                      activeDot={{ r: 8, fill: '#e6c86a', stroke: '#d4af37', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <MonthlyView simulateAmount={simulateAmount} setSimulateAmount={setSimulateAmount} />

            {showHistory && (
              <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gold/10 rounded-xl">
                  <History className="w-6 h-6 text-gold" />
                </div>
                <h2 className="text-xl font-display font-semibold text-text-primary">历史版本</h2>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {tierHistory.map((record, index) => (
                  <div
                    key={record.id}
                    className={`p-4 rounded-xl border transition-all duration-200 hover:border-gold/30 hover:bg-gold/5 ${
                      index === 0
                        ? 'bg-gold/10 border-gold/30'
                        : 'bg-bg-tertiary/30 border-gold/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gold">{record.version}</span>
                          {index === 0 && (
                            <span className="text-xs px-2 py-0.5 bg-gold/20 text-gold rounded-full">
                              当前
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-text-primary mb-2">{record.description}</p>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <Clock className="w-3 h-3" />
                        <span>{format(record.timestamp, 'yyyy年MM月dd日', { locale: zhCN })}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gold/10">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {record.tiers.filter((t) => t.isActive).map((tier) => (
                            <div key={tier.id} className="text-xs">
                              <div className="text-gold font-medium">{formatPercent(tier.rate)}</div>
                              <div className="text-text-muted">{getTierName(tier.tierOrder)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTier ? '编辑档位' : '添加档位'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">最低金额（元）</label>
              <input
                type="number"
                value={formData.minAmount}
                onChange={(e) => setFormData({ ...formData, minAmount: Number(e.target.value) })}
                className="input-field"
                placeholder="请输入最低金额"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">最高金额（元）</label>
              <input
                type="number"
                value={formData.maxAmount}
                onChange={(e) => setFormData({ ...formData, maxAmount: Number(e.target.value) })}
                className="input-field"
                placeholder="请输入最高金额"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">抽成比例（%）</label>
              <input
                type="number"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                className="input-field"
                placeholder="请输入抽成比例"
                min="0"
                max="100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">排序</label>
              <input
                type="number"
                value={formData.tierOrder}
                onChange={(e) => setFormData({ ...formData, tierOrder: Number(e.target.value) })}
                className="input-field"
                placeholder="请输入排序"
                min="1"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="tierActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-gold bg-bg-tertiary border-gold/20 rounded focus:ring-gold"
            />
            <label htmlFor="tierActive" className="text-sm text-text-primary cursor-pointer">
              激活该档位
            </label>
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-gold/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-outline"
            >
              取消
            </button>
            <button type="submit" className="btn-gold flex items-center gap-2">
              <Save className="w-4 h-4" />
              {editingTier ? '保存修改' : '添加'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
