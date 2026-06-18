import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Download,
  CheckCircle,
  Clock,
  Disc,
  Upload,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  Music,
  AlertTriangle,
  X,
  Calendar,
  Building2,
  DollarSign,
  FileText,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/utils/dateUtils';
import { formatCurrency, formatDuration, formatPercent } from '@/utils/formatters';
import type { MasterDelivery } from '@/types';

export function Masters() {
  const navigate = useNavigate();
  const {
    masters,
    bookings,
    artists,
    studios,
    addMasterDelivery,
    confirmMasterDelivery,
    getMastersByBookingId,
    getArtistById,
    getBookingById,
    getStudioById,
    getSettlementByBookingId,
    highlight,
    setHighlight,
    clearHighlight,
  } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedStudioId, setSelectedStudioId] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [formData, setFormData] = useState({
    bookingId: '',
    version: '',
    downloadUrl: '',
    notes: '',
  });
  const [highlightedMasterIds, setHighlightedMasterIds] = useState<Set<string>>(new Set());
  const [showBanner, setShowBanner] = useState(false);
  const [bannerBookingId, setBannerBookingId] = useState<string>('');
  const [bannerStudioId, setBannerStudioId] = useState<string>('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const highlightClearTimerRef = useRef<NodeJS.Timeout | null>(null);

  const unconfirmedMasters = useMemo(
    () => masters.filter((m) => !m.isConfirmed),
    [masters]
  );

  const bookingsWithMasters = useMemo(() => {
    let filteredBookings = bookings.filter(
      (b) => getMastersByBookingId(b.id).length > 0
    );

    if (selectedArtistId) {
      filteredBookings = filteredBookings.filter(
        (b) => b.artistId === selectedArtistId
      );
    }

    if (selectedMonth) {
      filteredBookings = filteredBookings.filter((b) => {
        const bookingMonth = format(b.startTime, 'yyyy-MM');
        return bookingMonth === selectedMonth;
      });
    }

    if (selectedStudioId) {
      filteredBookings = filteredBookings.filter(
        (b) => b.studioId === selectedStudioId
      );
    }

    return filteredBookings.sort((a, b) => {
      const mastersA = getMastersByBookingId(a.id);
      const mastersB = getMastersByBookingId(b.id);
      const latestA = mastersA.reduce(
        (latest, m) =>
          new Date(m.deliveredAt) > new Date(latest.deliveredAt) ? m : latest,
        mastersA[0]
      );
      const latestB = mastersB.reduce(
        (latest, m) =>
          new Date(m.deliveredAt) > new Date(latest.deliveredAt) ? m : latest,
        mastersB[0]
      );
      return (
        new Date(latestB.deliveredAt).getTime() -
        new Date(latestA.deliveredAt).getTime()
      );
    });
  }, [bookings, selectedArtistId, selectedMonth, selectedStudioId, getMastersByBookingId]);

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return getBookingById(selectedBookingId) || null;
  }, [selectedBookingId, getBookingById]);

  const selectedBookingSettlement = useMemo(() => {
    if (!selectedBookingId) return null;
    return getSettlementByBookingId(selectedBookingId) || null;
  }, [selectedBookingId, getSettlementByBookingId]);

  const handleAddMaster = () => {
    if (!formData.bookingId || !formData.version || !formData.downloadUrl)
      return;

    addMasterDelivery({
      bookingId: formData.bookingId,
      version: formData.version,
      downloadUrl: formData.downloadUrl,
      notes: formData.notes,
      isConfirmed: false,
      deliveredAt: new Date(),
    });

    setIsModalOpen(false);
    setFormData({
      bookingId: '',
      version: '',
      downloadUrl: '',
      notes: '',
    });
  };

  const handleConfirm = (masterId: string) => {
    confirmMasterDelivery(masterId);
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const getBookingMastersSorted = (bookingId: string): MasterDelivery[] => {
    return getMastersByBookingId(bookingId).sort(
      (a, b) =>
        new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime()
    );
  };

  const hasUnconfirmedInBooking = (bookingId: string): boolean => {
    return getMastersByBookingId(bookingId).some((m) => !m.isConfirmed);
  };

  const handleOpenDetail = (bookingId: string) => {
    setSelectedBookingId(bookingId);
  };

  const handleCloseDetail = () => {
    setSelectedBookingId(null);
  };

  const handleAddVersionForBooking = (bookingId: string) => {
    setFormData({
      bookingId,
      version: '',
      downloadUrl: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleViewSchedule = () => {
    if (!selectedBooking) return;
    const studioId = selectedBooking.studioId;
    const month = format(selectedBooking.startTime, 'yyyy-MM');
    setHighlight({ studioId: studioId || undefined, month });
    navigate('/studios');
  };

  const handleViewSettlement = () => {
    if (!selectedBooking) return;
    const month = format(selectedBooking.startTime, 'yyyy-MM');
    setHighlight({
      bookingId: selectedBooking.id,
      artistId: selectedBooking.artistId,
      studioId: selectedBooking.studioId || undefined,
      month,
    });
    navigate('/settlement');
  };

  useEffect(() => {
    if (!highlight) return;

    if (highlight.artistId) {
      setSelectedArtistId(highlight.artistId);
      setIsFilterOpen(true);
    }

    if (highlight.month) {
      setSelectedMonth(highlight.month);
    }

    if (highlight.studioId) {
      setSelectedStudioId(highlight.studioId);
      setIsFilterOpen(true);
      setBannerStudioId(highlight.studioId);
      setShowBanner(true);
    }

    if (highlight.bookingId) {
      const bookingId = highlight.bookingId;
      const booking = getBookingById(bookingId);
      if (booking) {
        setSelectedArtistId(booking.artistId);
        setIsFilterOpen(true);
      }
      const bookingMasters = getMastersByBookingId(bookingId);
      if (bookingMasters.length > 0) {
        setHighlightedMasterIds(new Set(bookingMasters.map((m) => m.id)));
        setSelectedBookingId(bookingId);
      }
      setBannerBookingId(bookingId);
      setShowBanner(true);
    }

    if (highlightClearTimerRef.current) {
      clearTimeout(highlightClearTimerRef.current);
    }
    highlightClearTimerRef.current = setTimeout(() => {
      setHighlightedMasterIds(new Set());
      clearHighlight();
    }, 3000);
    return () => {
      if (highlightClearTimerRef.current) {
        clearTimeout(highlightClearTimerRef.current);
      }
    };
  }, [highlight?.bookingId, highlight?.artistId, highlight?.month, highlight?.studioId, highlight?.timestamp, getBookingById, getMastersByBookingId, clearHighlight]);

  useEffect(() => {
    if (showBanner && !selectedArtistId && !selectedMonth && !selectedStudioId) {
      setShowBanner(false);
    }
  }, [selectedArtistId, selectedMonth, selectedStudioId, showBanner]);

  const handleClearBannerFilter = () => {
    setSelectedArtistId('');
    setSelectedMonth('');
    setSelectedStudioId('');
    setShowBanner(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            母带管理
          </h1>
          <p className="text-text-muted mt-1">
            管理录音母带交付版本与确认状态
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="btn-outline flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            筛选
            {isFilterOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-gold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            新增交付
          </button>
        </div>
      </div>

      {isFilterOpen && (
        <div className="card animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-primary mb-2">
                <User className="w-4 h-4 inline mr-2 text-gold" />
                按艺人筛选
              </label>
              <select
                value={selectedArtistId}
                onChange={(e) => setSelectedArtistId(e.target.value)}
                className="input-field"
              >
                <option value="">全部艺人</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-primary mb-2">
                <Calendar className="w-4 h-4 inline mr-2 text-gold" />
                按月份筛选
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input-field"
              >
                <option value="">全部月份</option>
                {Array.from(new Set(
                  bookings
                    .filter((b) => getMastersByBookingId(b.id).length > 0)
                    .map((b) => format(b.startTime, 'yyyy-MM'))
                )).sort().map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-primary mb-2">
                <Building2 className="w-4 h-4 inline mr-2 text-gold" />
                按棚位筛选
              </label>
              <select
                value={selectedStudioId}
                onChange={(e) => setSelectedStudioId(e.target.value)}
                className="input-field"
              >
                <option value="">全部棚位</option>
                {studios.map((studio) => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
            </div>
            {(selectedArtistId || selectedMonth || selectedStudioId) && (
              <button
                onClick={() => {
                  setSelectedArtistId('');
                  setSelectedMonth('');
                  setSelectedStudioId('');
                }}
                className="btn-ghost mt-6"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>
      )}

      {unconfirmedMasters.length > 0 && (
        <div className="card border-neon-yellow/30 bg-gradient-to-r from-neon-yellow/5 to-transparent animate-pulse-gold">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-neon-yellow/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-neon-yellow" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold text-text-primary">
                待确认母带提醒
              </h3>
              <p className="text-text-muted">
                您有{' '}
                <span className="text-neon-yellow font-semibold">
                  {unconfirmedMasters.length}
                </span>{' '}
                个母带版本等待确认
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-muted">最新交付</div>
              <div className="text-text-primary font-medium">
                {formatDateTime(unconfirmedMasters[0].deliveredAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBanner && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 border border-gold/30 animate-slide-up">
          <div className="flex items-center gap-3">
            {bannerStudioId ? (
              <>
                <Building2 className="w-5 h-5 text-gold flex-shrink-0" />
                <p className="text-gold font-medium">
                  已锁定到 {getStudioById(bannerStudioId)?.name || '未知录音棚'} · {selectedMonth ? `${selectedMonth.slice(0, 4)}年${selectedMonth.slice(5, 7)}月` : '全部月份'}
                </p>
              </>
            ) : (
              <>
                <Music className="w-5 h-5 text-gold flex-shrink-0" />
                <p className="text-gold font-medium">
                  正在查看订单 #{bannerBookingId.slice(-3)} 的母带记录
                </p>
              </>
            )}
          </div>
          <button
            onClick={handleClearBannerFilter}
            className="btn-outline text-sm px-3 py-1.5 text-gold border-gold/30 hover:bg-gold/10"
          >
            清除筛选
          </button>
        </div>
      )}

      <div className="space-y-6">
        {bookingsWithMasters.length === 0 ? (
          <div className="card text-center py-12">
            <Disc className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold text-text-primary mb-2">
              暂无母带记录
            </h3>
            <p className="text-text-muted mb-6">
              {selectedArtistId || selectedMonth || selectedStudioId
                ? '当前筛选条件下暂无母带交付记录'
                : '点击右上角按钮添加第一条母带交付记录'}
            </p>
            {!selectedArtistId && !selectedMonth && !selectedStudioId && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-gold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                新增交付
              </button>
            )}
          </div>
        ) : (
          bookingsWithMasters.map((booking) => (
            <div
              key={booking.id}
              className="card group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => handleOpenDetail(booking.id)}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center">
                    <Music className="w-6 h-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-text-primary flex items-center gap-2">
                      订单 #{booking.id.slice(-3)}
                      {hasUnconfirmedInBooking(booking.id) && (
                        <span className="px-2 py-0.5 rounded-full bg-neon-yellow/20 text-neon-yellow text-xs font-medium">
                          待确认
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-text-muted text-sm flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gold" />
                        {getArtistById(booking.artistId)?.name || '未知艺人'}
                      </span>
                      <span className="text-text-muted text-sm flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gold" />
                        {formatDateTime(booking.startTime)}
                      </span>
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-text-muted">母带版本</div>
                  <div className="font-display text-2xl font-bold text-gold">
                    {getMastersByBookingId(booking.id).length}
                  </div>
                </div>
              </div>

              <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gold via-gold/50 to-gold/20" />

                <div className="space-y-4">
                  {getBookingMastersSorted(booking.id).map(
                    (master) => (
                      <div key={master.id} className="relative">
                        <div
                          className={`absolute left-[-28px] top-6 w-4 h-4 rounded-full bg-gold border-4 border-bg-secondary transition-all duration-300 group-hover:scale-125 hover:scale-150 z-10 ${
                            master.isConfirmed
                              ? 'bg-neon-green'
                              : 'bg-neon-yellow'
                          }`}
                        />

                        <div
                          className={`ml-2 p-4 rounded-xl border transition-all duration-300 hover:shadow-gold ${
                            master.isConfirmed
                              ? 'border-neon-green/30 bg-neon-green/5'
                              : 'border-neon-yellow/30 bg-neon-yellow/5'
                          } ${
                            highlightedMasterIds.has(master.id)
                              ? 'bg-gold/10 border-l-4 border-l-gold border-gold animate-pulse-gold'
                              : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Disc
                                  className={`w-5 h-5 ${
                                    master.isConfirmed
                                      ? 'text-neon-green'
                                      : 'text-neon-yellow'
                                  }`}
                                />
                                <span className="font-display text-lg font-bold text-text-primary">
                                  {master.version}
                                </span>
                                {master.isConfirmed ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green text-xs font-medium">
                                    <CheckCircle className="w-3 h-3" />
                                    已确认
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-yellow/20 text-neon-yellow text-xs font-medium">
                                    <Clock className="w-3 h-3" />
                                    待确认
                                  </span>
                                )}
                              </div>

                              <div className="text-sm text-text-muted mb-3">
                                <span className="inline-flex items-center gap-1 mr-4">
                                  <Clock className="w-3.5 h-3.5 text-gold" />
                                  交付时间: {formatDateTime(master.deliveredAt)}
                                </span>
                                {master.confirmedAt && (
                                  <span className="inline-flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5 text-neon-green" />
                                    确认时间:{' '}
                                    {formatDateTime(master.confirmedAt)}
                                  </span>
                                )}
                              </div>

                              {master.notes && (
                                <p className="text-sm text-text-secondary mb-3">
                                  备注: {master.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(master.downloadUrl);
                                }}
                                className="btn-outline text-sm flex items-center gap-1 px-4 py-2"
                              >
                                <Download className="w-4 h-4" />
                                下载
                              </button>
                              {!master.isConfirmed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirm(master.id);
                                  }}
                                  className="btn-gold text-sm flex items-center gap-1 px-4 py-2"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  确认
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedBookingId && selectedBooking && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseDetail}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[400px] bg-bg-secondary border-l border-gold/20 shadow-gold animate-slide-in-right overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold text-text-primary">
                  订单详情
                </h2>
                <button
                  onClick={handleCloseDetail}
                  className="p-2 rounded-lg hover:bg-gold/10 transition-colors"
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-gold" />
                    <h3 className="font-display text-lg font-semibold text-text-primary">预约信息</h3>
                  </div>
                  <div className="space-y-3 bg-bg-tertiary/50 rounded-xl p-4 border border-gold/10">
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        艺人
                      </span>
                      <span className="text-sm text-text-primary font-medium">
                        {getArtistById(selectedBooking.artistId)?.name || '未知艺人'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        录音棚
                      </span>
                      <span className="text-sm text-text-primary font-medium">
                        {selectedBooking.studioId
                          ? getStudioById(selectedBooking.studioId)?.name || '未知录音棚'
                          : '待分配'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        时间
                      </span>
                      <span className="text-sm text-text-primary font-medium">
                        {formatDateTime(selectedBooking.startTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">时长</span>
                      <span className="text-sm text-text-primary font-medium">
                        {formatDuration(selectedBooking.duration)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        人数
                      </span>
                      <span className="text-sm text-text-primary font-medium">
                        {selectedBooking.attendeeCount || '-'} 人
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-muted">状态</span>
                      <StatusBadge status={selectedBooking.status} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-gold" />
                    <h3 className="font-display text-lg font-semibold text-text-primary">金额信息</h3>
                  </div>
                  <div className="space-y-3 bg-bg-tertiary/50 rounded-xl p-4 border border-gold/10">
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">订单金额</span>
                      <span className="text-sm font-display font-bold text-gold">
                        {formatCurrency(selectedBooking.totalAmount)}
                      </span>
                    </div>
                    {selectedBookingSettlement && (
                      <>
                        <div className="h-px bg-gold/10" />
                        <div className="flex justify-between">
                          <span className="text-sm text-text-muted">抽成比例</span>
                          <span className="text-sm text-neon-purple font-medium">
                            {formatPercent(selectedBookingSettlement.commissionRate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-text-muted">抽成金额</span>
                          <span className="text-sm text-neon-red font-medium">
                            {formatCurrency(selectedBookingSettlement.commissionAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-text-muted">艺人所得</span>
                          <span className="text-sm text-neon-green font-semibold">
                            {formatCurrency(selectedBookingSettlement.artistAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-text-muted">结算状态</span>
                          <StatusBadge status={selectedBookingSettlement.status} type="settlement" />
                        </div>
                      </>
                    )}
                    {!selectedBookingSettlement && (
                      <div className="text-sm text-text-muted italic">
                        暂未生成对账单
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Disc className="w-5 h-5 text-gold" />
                      <h3 className="font-display text-lg font-semibold text-text-primary">母带版本</h3>
                    </div>
                    <button
                      onClick={() => handleAddVersionForBooking(selectedBooking.id)}
                      className="btn-gold text-xs flex items-center gap-1 px-3 py-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      新增版本
                    </button>
                  </div>
                  <div className="space-y-3">
                    {getBookingMastersSorted(selectedBooking.id).length === 0 ? (
                      <div className="bg-bg-tertiary/50 rounded-xl p-4 border border-gold/10 text-center">
                        <Disc className="w-8 h-8 text-text-muted mx-auto mb-2" />
                        <p className="text-sm text-text-muted">暂无母带版本</p>
                      </div>
                    ) : (
                      getBookingMastersSorted(selectedBooking.id).map((master) => (
                        <div
                          key={master.id}
                          className={`p-3 rounded-xl border transition-all ${
                            master.isConfirmed
                              ? 'border-neon-green/20 bg-neon-green/5'
                              : 'border-neon-yellow/20 bg-neon-yellow/5'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Disc
                                className={`w-4 h-4 ${
                                  master.isConfirmed ? 'text-neon-green' : 'text-neon-yellow'
                                }`}
                              />
                              <span className="font-medium text-text-primary text-sm">
                                {master.version}
                              </span>
                            </div>
                            {master.isConfirmed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green text-xs font-medium">
                                <CheckCircle className="w-3 h-3" />
                                已确认
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConfirm(master.id)}
                                className="btn-gold text-xs flex items-center gap-1 px-3 py-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                确认
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-text-muted">
                            交付: {formatDateTime(master.deliveredAt)}
                          </div>
                          {master.notes && (
                            <div className="text-xs text-text-secondary mt-1">
                              {master.notes}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gold/10">
                  <button
                    onClick={handleViewSchedule}
                    className="w-full btn-outline flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    查看排期
                  </button>
                  <button
                    onClick={handleViewSettlement}
                    className="w-full btn-gold flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    查看对账
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新增母带交付"
        size="lg"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              <Music className="w-4 h-4 inline mr-2 text-gold" />
              关联订单
            </label>
            <select
              value={formData.bookingId}
              onChange={(e) =>
                setFormData({ ...formData, bookingId: e.target.value })
              }
              className="input-field"
            >
              <option value="">请选择订单</option>
              {bookings
                .filter((b) => b.status === 'COMPLETED')
                .map((booking) => {
                  const artist = getArtistById(booking.artistId);
                  return (
                    <option key={booking.id} value={booking.id}>
                      订单 #{booking.id.slice(-3)} - {artist?.name || '未知艺人'}{' '}
                      - {formatDateTime(booking.startTime)}
                    </option>
                  );
                })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                <Disc className="w-4 h-4 inline mr-2 text-gold" />
                版本号
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) =>
                  setFormData({ ...formData, version: e.target.value })
                }
                placeholder="例如: v1.0"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                <Upload className="w-4 h-4 inline mr-2 text-gold" />
                下载链接
              </label>
              <input
                type="url"
                value={formData.downloadUrl}
                onChange={(e) =>
                  setFormData({ ...formData, downloadUrl: e.target.value })
                }
                placeholder="https://..."
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="请输入母带交付备注信息..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gold/10">
            <button
              onClick={() => setIsModalOpen(false)}
              className="btn-ghost"
            >
              取消
            </button>
            <button
              onClick={handleAddMaster}
              disabled={
                !formData.bookingId ||
                !formData.version ||
                !formData.downloadUrl
              }
              className="btn-gold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              提交交付
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
