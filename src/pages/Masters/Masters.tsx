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
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/utils/dateUtils';
import type { MasterDelivery } from '@/types';

export function Masters() {
  const {
    masters,
    bookings,
    artists,
    addMasterDelivery,
    confirmMasterDelivery,
    getMastersByBookingId,
    getArtistById,
    getBookingById,
    highlight,
    clearHighlight,
  } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState<string>('');
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
  }, [bookings, selectedArtistId, getMastersByBookingId]);

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

  useEffect(() => {
    if (!highlight?.bookingId) return;
    const bookingId = highlight.bookingId;
    const booking = getBookingById(bookingId);
    if (booking) {
      setSelectedArtistId(booking.artistId);
      setIsFilterOpen(true);
    }
    const bookingMasters = getMastersByBookingId(bookingId);
    if (bookingMasters.length > 0) {
      setHighlightedMasterIds(new Set(bookingMasters.map((m) => m.id)));
    }
    setBannerBookingId(bookingId);
    setShowBanner(true);
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
  }, [highlight?.bookingId, highlight?.timestamp, getBookingById, getMastersByBookingId, clearHighlight]);

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
            {selectedArtistId && (
              <button
                onClick={() => setSelectedArtistId('')}
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
            <Music className="w-5 h-5 text-gold flex-shrink-0" />
            <p className="text-gold font-medium">
              正在查看订单 #{bannerBookingId.slice(-3)} 的母带记录
            </p>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="p-1.5 rounded-lg hover:bg-gold/20 transition-colors"
          >
            <X className="w-4 h-4 text-gold" />
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
              {selectedArtistId
                ? '该艺人暂无母带交付记录'
                : '点击右上角按钮添加第一条母带交付记录'}
            </p>
            {!selectedArtistId && (
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
              className="card group hover:-translate-y-1 transition-all duration-300"
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
                                onClick={() => handleDownload(master.downloadUrl)}
                                className="btn-outline text-sm flex items-center gap-1 px-4 py-2"
                              >
                                <Download className="w-4 h-4" />
                                下载
                              </button>
                              {!master.isConfirmed && (
                                <button
                                  onClick={() => handleConfirm(master.id)}
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
