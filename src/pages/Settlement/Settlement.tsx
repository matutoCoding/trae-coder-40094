import { useState, Fragment } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import {
  Download,
  CheckCircle,
  Calculator,
  ChevronDown,
  ChevronUp,
  DollarSign,
  PiggyBank,
  Users,
  Wallet,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { formatDateTime, formatMonth, isInCurrentMonth } from '@/utils/dateUtils';
import type { Settlement } from '@/types';

export function Settlement() {
  const {
    settlements,
    markSettlementPaid,
    getBookingById,
    getArtistById,
    getStudioById,
  } = useAppStore();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const currentMonthSettlements = settlements.filter((s) =>
    isInCurrentMonth(new Date(s.settlementDate))
  );

  const totalRevenue = currentMonthSettlements.reduce(
    (sum, s) => sum + s.totalAmount,
    0
  );

  const totalCommission = currentMonthSettlements.reduce(
    (sum, s) => sum + s.commissionAmount,
    0
  );

  const totalArtistAmount = currentMonthSettlements.reduce(
    (sum, s) => sum + s.artistAmount,
    0
  );

  const settledAmount = currentMonthSettlements
    .filter((s) => s.status === 'SETTLED')
    .reduce((sum, s) => sum + s.artistAmount, 0);

  const unsettledAmount = currentMonthSettlements
    .filter((s) => s.status === 'UNSETTLED')
    .reduce((sum, s) => sum + s.artistAmount, 0);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleMarkPaid = (settlementId: string, e: MouseEvent) => {
    e.stopPropagation();
    markSettlementPaid(settlementId);
  };

  const handleExport = async () => {
    setIsExporting(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const headers = [
      '订单号',
      '艺人',
      '录音棚',
      '预约时间',
      '订单金额',
      '抽成比例',
      '抽成金额',
      '艺人所得',
      '结算状态',
      '结算日期',
    ];

    const rows = currentMonthSettlements.map((s) => {
      const booking = getBookingById(s.bookingId);
      const artist = booking ? getArtistById(booking.artistId) : undefined;
      const studio = booking?.studioId ? getStudioById(booking.studioId) : undefined;
      return [
        s.bookingId,
        artist?.name || '未知',
        studio?.name || '未分配',
        booking ? formatDateTime(booking.startTime) : '',
        formatCurrency(s.totalAmount),
        formatPercent(s.commissionRate),
        formatCurrency(s.commissionAmount),
        formatCurrency(s.artistAmount),
        s.status === 'SETTLED' ? '已结算' : '待结算',
        formatDateTime(s.settlementDate),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `对账单_${formatMonth(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  const columns = [
    {
      key: 'expand',
      header: '',
      width: '40px',
      render: (row: Settlement) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleRow(row.id);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gold/10 transition-colors"
        >
          {expandedRows.has(row.id) ? (
            <ChevronUp className="w-4 h-4 text-gold" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gold" />
          )}
        </button>
      ),
    },
    {
      key: 'bookingId',
      header: '订单号',
      render: (row: Settlement) => (
        <span className="font-mono text-text-primary">{row.bookingId}</span>
      ),
    },
    {
      key: 'artist',
      header: '艺人',
      render: (row: Settlement) => {
        const booking = getBookingById(row.bookingId);
        const artist = booking ? getArtistById(booking.artistId) : undefined;
        return (
          <div className="font-medium text-text-primary">
            {artist?.name || '未知艺人'}
          </div>
        );
      },
    },
    {
      key: 'studio',
      header: '录音棚',
      render: (row: Settlement) => {
        const booking = getBookingById(row.bookingId);
        const studio = booking?.studioId ? getStudioById(booking.studioId) : undefined;
        return (
          <span className="text-text-primary">
            {studio?.name || '未分配'}
          </span>
        );
      },
    },
    {
      key: 'time',
      header: '预约时间',
      render: (row: Settlement) => {
        const booking = getBookingById(row.bookingId);
        return (
          <span className="text-text-primary">
            {booking ? formatDateTime(booking.startTime) : '-'}
          </span>
        );
      },
    },
    {
      key: 'totalAmount',
      header: '订单金额',
      render: (row: Settlement) => (
        <span className="font-display text-text-primary">
          {formatCurrency(row.totalAmount)}
        </span>
      ),
    },
    {
      key: 'commissionRate',
      header: '抽成比例',
      render: (row: Settlement) => (
        <span className="text-text-primary">
          {formatPercent(row.commissionRate)}
        </span>
      ),
    },
    {
      key: 'commissionAmount',
      header: '抽成金额',
      render: (row: Settlement) => (
        <span className="font-display text-neon-red">
          {formatCurrency(row.commissionAmount)}
        </span>
      ),
    },
    {
      key: 'artistAmount',
      header: '艺人所得',
      render: (row: Settlement) => (
        <span className="font-display text-neon-green font-semibold">
          {formatCurrency(row.artistAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: '结算状态',
      render: (row: Settlement) => (
        <StatusBadge status={row.status} type="settlement" />
      ),
    },
    {
      key: 'actions',
      header: '操作',
      width: '140px',
      render: (row: Settlement) => (
        <div className="flex items-center gap-2">
          {row.status === 'UNSETTLED' && (
            <button
              onClick={(e) => handleMarkPaid(row.id, e)}
              className="btn-gold text-xs flex items-center gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              标记已结算
            </button>
          )}
        </div>
      ),
    },
  ];

  const renderCalculationDetail = (settlement: Settlement) => (
    <div
      className={`overflow-hidden transition-all duration-300 ${
        expandedRows.has(settlement.id)
          ? 'max-h-96 opacity-100'
          : 'max-h-0 opacity-0'
      }`}
    >
      <div className="px-4 pb-4">
        <div className="bg-bg-tertiary/50 rounded-xl p-5 border border-gold/10">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-gold" />
            <h4 className="font-display text-lg font-semibold text-text-primary">
              分账计算公式
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-bg-secondary rounded-xl p-4 border border-gold/10">
              <div className="text-sm text-text-muted mb-2">订单金额</div>
              <div className="font-display text-2xl font-bold text-gold">
                {formatCurrency(settlement.totalAmount)}
              </div>
            </div>

            <div className="bg-bg-secondary rounded-xl p-4 border border-gold/10">
              <div className="text-sm text-text-muted mb-2">抽成比例</div>
              <div className="font-display text-2xl font-bold text-neon-purple">
                {formatPercent(settlement.commissionRate)}
              </div>
            </div>

            <div className="bg-bg-secondary rounded-xl p-4 border border-gold/10">
              <div className="text-sm text-text-muted mb-2">抽成金额</div>
              <div className="font-display text-2xl font-bold text-neon-red">
                {formatCurrency(settlement.commissionAmount)}
              </div>
            </div>
          </div>

          <div className="mt-6 bg-gradient-to-r from-gold/10 to-transparent rounded-xl p-5 border border-gold/20">
            <div className="text-sm text-text-muted mb-3">计算过程</div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-lg">
                <span className="font-display text-gold">
                  {formatCurrency(settlement.totalAmount)}
                </span>
                <span className="text-text-muted">×</span>
                <span className="font-display text-neon-purple">
                  {formatPercent(settlement.commissionRate)}
                </span>
                <span className="text-text-muted">=</span>
                <span className="font-display text-neon-red font-semibold">
                  {formatCurrency(settlement.commissionAmount)}
                </span>
                <span className="text-text-muted text-sm ml-2">（抽成金额）</span>
              </div>

              <div className="h-px bg-gold/20 my-3" />

              <div className="flex items-center gap-3 text-lg">
                <span className="font-display text-gold">
                  {formatCurrency(settlement.totalAmount)}
                </span>
                <span className="text-text-muted">−</span>
                <span className="font-display text-neon-red">
                  {formatCurrency(settlement.commissionAmount)}
                </span>
                <span className="text-text-muted">=</span>
                <span className="font-display text-neon-green font-bold text-2xl">
                  {formatCurrency(settlement.artistAmount)}
                </span>
                <span className="text-text-muted text-sm ml-2">（艺人所得）</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">结算日期：</span>
              <span className="text-text-primary">
                {formatDateTime(settlement.settlementDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">结算单号：</span>
              <span className="font-mono text-text-primary">{settlement.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            对账明细
          </h1>
          <p className="text-text-muted mt-1">
            查看订单分账详情与结算状态，{formatMonth(new Date())}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting || currentMonthSettlements.length === 0}
          className="btn-gold flex items-center gap-2"
        >
          <Download
            className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`}
          />
          {isExporting ? '导出中...' : '导出月度对账单'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总成交额"
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign className="w-6 h-6" />}
          delay={0}
        />
        <StatCard
          title="总抽成"
          value={formatCurrency(totalCommission)}
          icon={<PiggyBank className="w-6 h-6" />}
          delay={100}
        />
        <StatCard
          title="艺人分成总额"
          value={formatCurrency(totalArtistAmount)}
          icon={<Users className="w-6 h-6" />}
          delay={200}
        />
        <StatCard
          title="已结算 / 未结算"
          value={`${formatCurrency(settledAmount)} / ${formatCurrency(unsettledAmount)}`}
          icon={<Wallet className="w-6 h-6" />}
          delay={300}
        />
      </div>

      <div className="card">
        <h2 className="font-display text-xl font-semibold text-text-primary mb-4">
          对账单列表
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/20">
                {columns.map((col) => (
                  <th
                    key={col.key as string}
                    className="text-left py-4 px-4 text-sm font-medium bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 text-gold"
                    style={{ width: col.width }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {settlements.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-12 text-center text-text-muted"
                  >
                    暂无结算记录
                  </td>
                </tr>
              ) : (
                settlements
                  .sort(
                    (a, b) =>
                      new Date(b.settlementDate).getTime() -
                      new Date(a.settlementDate).getTime()
                  )
                  .map((row, index) => (
                    <Fragment key={row.id}>
                      <tr
                        onClick={() => toggleRow(row.id)}
                        className={`border-b border-gold/5 transition-colors cursor-pointer hover:bg-gold/5 ${
                          index % 2 === 0 ? 'bg-bg-secondary/30' : ''
                        }`}
                      >
                        {columns.map((col) => (
                          <td
                            key={col.key as string}
                            className="py-4 px-4 text-sm text-text-secondary"
                          >
                            {col.render
                              ? col.render(row)
                              : (row[col.key as keyof Settlement] as ReactNode)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-bg-secondary/50">
                        <td colSpan={columns.length} className="p-0">
                          {renderCalculationDetail(row)}
                        </td>
                      </tr>
                    </Fragment>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
