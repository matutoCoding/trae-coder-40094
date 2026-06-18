import { useState, Fragment, useMemo, useEffect, useRef } from 'react';
import type { MouseEvent, ReactNode, ChangeEvent } from 'react';
import { X } from 'lucide-react';
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
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { format, subMonths, isSameMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { formatDateTime, formatMonth } from '@/utils/dateUtils';
import type { Settlement, SettlementStatus } from '@/types';

export function Settlement() {
  const {
    settlements,
    artists,
    batchMarkSettlementsPaid,
    markSettlementPaid,
    getBookingById,
    getArtistById,
    getStudioById,
    getSettlementByBookingId,
    highlight,
    clearHighlight,
  } = useAppStore();

  const currentDate = new Date();
  const defaultMonth = format(currentDate, 'yyyy-MM');

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedArtistId, setSelectedArtistId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<SettlementStatus | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [highlightedSettlementIds, setHighlightedSettlementIds] = useState<Set<string>>(new Set());
  const [showNoSettlementBanner, setShowNoSettlementBanner] = useState(false);
  const [noSettlementBookingId, setNoSettlementBookingId] = useState<string>('');
  const highlightClearTimerRef = useRef<NodeJS.Timeout | null>(null);

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(currentDate, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'yyyy年MM月', { locale: zhCN }),
      });
    }
    return options;
  }, [currentDate]);

  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => {
      const settlementDate = new Date(s.settlementDate);
      const [year, month] = selectedMonth.split('-').map(Number);
      const filterDate = new Date(year, month - 1, 1);
      if (!isSameMonth(settlementDate, filterDate)) {
        return false;
      }
      if (selectedArtistId !== 'all') {
        const booking = getBookingById(s.bookingId);
        if (!booking || booking.artistId !== selectedArtistId) {
          return false;
        }
      }
      if (selectedStatus !== 'all' && s.status !== selectedStatus) {
        return false;
      }
      return true;
    }).sort(
      (a, b) =>
        new Date(b.settlementDate).getTime() -
        new Date(a.settlementDate).getTime()
    );
  }, [settlements, selectedMonth, selectedArtistId, selectedStatus, getBookingById]);

  const totalRevenue = useMemo(
    () => filteredSettlements.reduce((sum, s) => sum + s.totalAmount, 0),
    [filteredSettlements]
  );

  const totalCommission = useMemo(
    () => filteredSettlements.reduce((sum, s) => sum + s.commissionAmount, 0),
    [filteredSettlements]
  );

  const totalArtistAmount = useMemo(
    () => filteredSettlements.reduce((sum, s) => sum + s.artistAmount, 0),
    [filteredSettlements]
  );

  const settledAmount = useMemo(
    () =>
      filteredSettlements
        .filter((s) => s.status === 'SETTLED')
        .reduce((sum, s) => sum + s.artistAmount, 0),
    [filteredSettlements]
  );

  const unsettledAmount = useMemo(
    () =>
      filteredSettlements
        .filter((s) => s.status === 'UNSETTLED')
        .reduce((sum, s) => sum + s.artistAmount, 0),
    [filteredSettlements]
  );

  const selectableUnsettledIds = useMemo(
    () =>
      filteredSettlements
        .filter((s) => s.status === 'UNSETTLED')
        .map((s) => s.id),
    [filteredSettlements]
  );

  const isAllSelected = useMemo(() => {
    if (selectableUnsettledIds.length === 0) return false;
    return selectableUnsettledIds.every((id) => selectedIds.has(id));
  }, [selectableUnsettledIds, selectedIds]);

  const selectedSettlements = useMemo(
    () => filteredSettlements.filter((s) => selectedIds.has(s.id)),
    [filteredSettlements, selectedIds]
  );

  const selectedSummary = useMemo(() => {
    const totalAmount = selectedSettlements.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCommissionAmount = selectedSettlements.reduce(
      (sum, s) => sum + s.commissionAmount,
      0
    );
    const totalArtistEarnings = selectedSettlements.reduce(
      (sum, s) => sum + s.artistAmount,
      0
    );
    return {
      count: selectedSettlements.length,
      totalAmount,
      totalCommissionAmount,
      totalArtistEarnings,
    };
  }, [selectedSettlements]);

  const modalSummary = useMemo(() => {
    const ids = Array.from(selectedIds);
    const targetSettlements = settlements.filter((s) => ids.includes(s.id));
    const totalAmount = targetSettlements.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCommissionAmount = targetSettlements.reduce(
      (sum, s) => sum + s.commissionAmount,
      0
    );
    const totalArtistEarnings = targetSettlements.reduce(
      (sum, s) => sum + s.artistAmount,
      0
    );
    return {
      count: targetSettlements.length,
      totalAmount,
      totalCommissionAmount,
      totalArtistEarnings,
    };
  }, [selectedIds, settlements]);

  useEffect(() => {
    if (!highlight?.bookingId) return;
    const bookingId = highlight.bookingId;
    const booking = getBookingById(bookingId);
    if (booking) {
      const artist = getArtistById(booking.artistId);
      if (artist) {
        setSelectedArtistId(artist.id);
      }
    }
    setSelectedStatus('all');
    const settlement = getSettlementByBookingId(bookingId);
    if (settlement) {
      setHighlightedSettlementIds(new Set([settlement.id]));
      setShowNoSettlementBanner(false);
    } else {
      setNoSettlementBookingId(bookingId);
      setShowNoSettlementBanner(true);
      setHighlightedSettlementIds(new Set());
    }
    if (highlightClearTimerRef.current) {
      clearTimeout(highlightClearTimerRef.current);
    }
    highlightClearTimerRef.current = setTimeout(() => {
      setHighlightedSettlementIds(new Set());
      clearHighlight();
    }, 3000);
    return () => {
      if (highlightClearTimerRef.current) {
        clearTimeout(highlightClearTimerRef.current);
      }
    };
  }, [highlight?.bookingId, highlight?.timestamp, getBookingById, getArtistById, getSettlementByBookingId, clearHighlight]);

  useEffect(() => {
    setSelectedIds((prevSelected) => {
      const filteredIds = new Set<string>();
      const filteredSettlementIds = new Set(filteredSettlements.map((s) => s.id));
      prevSelected.forEach((id) => {
        if (filteredSettlementIds.has(id)) {
          filteredIds.add(id);
        }
      });
      return filteredIds;
    });
  }, [selectedMonth, selectedArtistId, selectedStatus]);

  const handleResetFilters = () => {
    setSelectedMonth(defaultMonth);
    setSelectedArtistId('all');
    setSelectedStatus('all');
    setSelectedIds(new Set());
  };

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

  const handleSelectRow = (id: string, e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (e.target.checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedIds(new Set(selectableUnsettledIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBatchConfirm = () => {
    batchMarkSettlementsPaid(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsBatchModalOpen(false);
  };

  const handleExport = async () => {
    setIsExporting(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const headers = [
      '结算单号',
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

    const rows = filteredSettlements.map((s) => {
      const booking = getBookingById(s.bookingId);
      const artist = booking ? getArtistById(booking.artistId) : undefined;
      const studio = booking?.studioId ? getStudioById(booking.studioId) : undefined;
      return [
        s.id,
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
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const [year, month] = selectedMonth.split('-');
    link.download = `对账单_${year}年${month}月.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={handleSelectAll}
          disabled={selectableUnsettledIds.length === 0}
          className="w-4 h-4 accent-gold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        />
      ),
      width: '40px',
      render: (row: Settlement) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => handleSelectRow(row.id, e)}
          disabled={row.status === 'SETTLED'}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-gold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        />
      ),
    },
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
          disabled={isExporting || filteredSettlements.length === 0}
          className="btn-gold flex items-center gap-2"
        >
          <Download
            className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`}
          />
          {isExporting ? '导出中...' : '导出筛选结果'}
        </button>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              月份
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-field"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              艺人
            </label>
            <select
              value={selectedArtistId}
              onChange={(e) => setSelectedArtistId(e.target.value)}
              className="input-field"
            >
              <option value="all">全部艺人</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              结算状态
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as SettlementStatus | 'all')}
              className="input-field"
            >
              <option value="all">全部状态</option>
              <option value="UNSETTLED">待结算</option>
              <option value="SETTLED">已结算</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleResetFilters}
              className="btn-outline flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重置筛选
            </button>
          </div>
        </div>
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

      {showNoSettlementBanner && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 border border-gold/30 animate-slide-up">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0" />
            <p className="text-gold font-medium">
              订单 #{noSettlementBookingId.slice(-3)} 暂未生成对账单
            </p>
          </div>
          <button
            onClick={() => setShowNoSettlementBanner(false)}
            className="p-1.5 rounded-lg hover:bg-gold/20 transition-colors"
          >
            <X className="w-4 h-4 text-gold" />
          </button>
        </div>
      )}

      <div className="card">
        {selectedIds.size > 0 && (
          <div className="sticky top-0 z-10 mb-4 -mx-6 -mt-6 px-6 py-4 bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 border-b border-gold/20 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gold font-medium">
                已选中 {selectedIds.size} 条记录
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="btn-ghost text-sm"
              >
                取消选择
              </button>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="btn-gold flex items-center gap-2 text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                批量标记已结算
              </button>
            </div>
          </div>
        )}

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
              {filteredSettlements.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-12 text-center text-text-muted"
                  >
                    暂无结算记录
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((row, index) => (
                  <Fragment key={row.id}>
                    <tr
                      onClick={() => toggleRow(row.id)}
                      className={`border-b border-gold/5 transition-all duration-300 cursor-pointer hover:bg-gold/5 ${
                        index % 2 === 0 ? 'bg-bg-secondary/30' : ''
                      } ${
                        highlightedSettlementIds.has(row.id)
                          ? 'bg-gold/10 border-l-4 border-gold animate-pulse-gold'
                          : ''
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

      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="批量标记已结算"
        size="md"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3 p-4 bg-neon-yellow/10 border border-neon-yellow/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-neon-yellow flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text-primary">确认批量操作</p>
              <p className="text-sm text-text-muted mt-1">
                此操作将把选中的记录标记为已结算，且无法撤销。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-bg-tertiary/50 rounded-xl p-4 border border-gold/10">
              <div className="text-sm text-text-muted mb-1">选中记录数</div>
              <div className="font-display text-2xl font-bold text-gold">
                {modalSummary.count} 条
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-bg-tertiary/50 rounded-xl p-4 border border-gold/10">
                <div className="text-sm text-text-muted mb-1">涉及总金额</div>
                <div className="font-display text-xl font-bold text-text-primary">
                  {formatCurrency(modalSummary.totalAmount)}
                </div>
              </div>
              <div className="bg-bg-tertiary/50 rounded-xl p-4 border border-gold/10">
                <div className="text-sm text-text-muted mb-1">总抽成金额</div>
                <div className="font-display text-xl font-bold text-neon-red">
                  {formatCurrency(modalSummary.totalCommissionAmount)}
                </div>
              </div>
              <div className="bg-bg-tertiary/50 rounded-xl p-4 border border-gold/10">
                <div className="text-sm text-text-muted mb-1">艺人总所得</div>
                <div className="font-display text-xl font-bold text-neon-green">
                  {formatCurrency(modalSummary.totalArtistEarnings)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gold/10">
            <button
              onClick={() => setIsBatchModalOpen(false)}
              className="btn-outline"
            >
              取消
            </button>
            <button onClick={handleBatchConfirm} className="btn-gold">
              确认标记已结算
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
