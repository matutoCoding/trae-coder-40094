import { useState } from 'react';
import { Plus, Wand2, CheckCircle, XCircle, CalendarClock, User, Users, Clock } from 'lucide-react';
import { setHours, setMinutes } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDuration } from '@/utils/formatters';
import { formatDateTime } from '@/utils/dateUtils';
import { allocateStudio } from '@/services/allocation.service';
import type { Booking, BookingRequest, AllocationResult } from '@/types';

export function Bookings() {
  const {
    bookings,
    artists,
    studios,
    allocateSingleBooking,
    allocateAllPending,
    confirmBooking,
    completeBooking,
    cancelBooking,
    createBooking,
    getArtistById,
    getStudioById,
  } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [isAllocating, setIsAllocating] = useState(false);
  const [animatingBookingId, setAnimatingBookingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    artistId: '',
    date: '',
    startTime: '10:00',
    duration: 120,
    attendeeCount: 1,
    notes: '',
  });

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING');

  const handleCreateBooking = () => {
    if (!formData.artistId || !formData.date || !formData.startTime) return;

    const [hours, minutes] = formData.startTime.split(':').map(Number);
    const startDate = new Date(formData.date);
    const startTime = setMinutes(setHours(startDate, hours), minutes);
    const endTime = new Date(startTime.getTime() + formData.duration * 60000);

    const request: BookingRequest = {
      artistId: formData.artistId,
      startTime,
      endTime,
      duration: formData.duration,
      attendeeCount: formData.attendeeCount,
      notes: formData.notes || undefined,
    };

    createBooking(request);
    setIsModalOpen(false);
    setFormData({
      artistId: '',
      date: '',
      startTime: '10:00',
      duration: 120,
      attendeeCount: 1,
      notes: '',
    });
  };

  const handleAllocateSingle = async (bookingId: string) => {
    setIsAllocating(true);
    setAnimatingBookingId(bookingId);

    await new Promise((resolve) => setTimeout(resolve, 600));

    const result = allocateSingleBooking(bookingId);
    if (result) {
      setAllocationResult(result);
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        setSelectedBooking(booking);
      }
    }

    setIsAllocating(false);
    setTimeout(() => setAnimatingBookingId(null), 1000);
  };

  const handleBatchAllocate = async () => {
    setIsAllocating(true);
    pendingBookings.forEach((b) => setAnimatingBookingId(b.id));

    await new Promise((resolve) => setTimeout(resolve, 800));

    const results = allocateAllPending();
    if (results.size > 0) {
      const firstResult = Array.from(results.values())[0];
      setAllocationResult(firstResult);
    }

    setIsAllocating(false);
    setTimeout(() => setAnimatingBookingId(null), 1200);
  };

  const handlePreviewAllocation = async (booking: Booking) => {
    setIsAllocating(true);
    setAnimatingBookingId(booking.id);

    await new Promise((resolve) => setTimeout(resolve, 400));

    const request: BookingRequest = {
      artistId: booking.artistId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      attendeeCount: booking.attendeeCount,
      notes: booking.notes,
    };

    const result = allocateStudio(request, studios, bookings);
    setAllocationResult(result);
    setSelectedBooking(booking);

    setIsAllocating(false);
    setTimeout(() => setAnimatingBookingId(null), 800);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-neon-green';
    if (score >= 60) return 'text-neon-yellow';
    return 'text-neon-red';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-neon-green/20 to-neon-green/5';
    if (score >= 60) return 'from-neon-yellow/20 to-neon-yellow/5';
    return 'from-neon-red/20 to-neon-red/5';
  };

  const pendingColumns = [
    {
      key: 'artist',
      header: '艺人',
      render: (row: Booking) => {
        const artist = getArtistById(row.artistId);
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center">
              <User className="w-5 h-5 text-gold" />
            </div>
            <div>
              <div className="font-medium text-text-primary">{artist?.name || '未知艺人'}</div>
              <div className="text-xs text-text-muted">{artist?.contact || ''}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'time',
      header: '预约时间',
      render: (row: Booking) => (
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-gold" />
          <div>
            <div className="text-text-primary">{formatDateTime(row.startTime)}</div>
            <div className="text-xs text-text-muted">{formatDuration(row.duration)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'attendees',
      header: '人数',
      render: (row: Booking) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gold" />
          <span className="text-text-primary">{row.attendeeCount || 1} 人</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (row: Booking) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '操作',
      width: '200px',
      render: (row: Booking) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePreviewAllocation(row)}
            disabled={isAllocating}
            className="btn-ghost text-xs flex items-center gap-1"
          >
            <Clock className="w-3.5 h-3.5" />
            预览
          </button>
          <button
            onClick={() => handleAllocateSingle(row.id)}
            disabled={isAllocating || animatingBookingId === row.id}
            className={`btn-gold text-xs flex items-center gap-1 ${
              animatingBookingId === row.id ? 'animate-pulse-gold' : ''
            }`}
          >
            <Wand2 className={`w-3.5 h-3.5 ${animatingBookingId === row.id ? 'animate-spin' : ''}`} />
            {animatingBookingId === row.id ? '分配中...' : '一键分配'}
          </button>
        </div>
      ),
    },
  ];

  const allColumns = [
    {
      key: 'artist',
      header: '艺人',
      render: (row: Booking) => {
        const artist = getArtistById(row.artistId);
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center">
              <User className="w-5 h-5 text-gold" />
            </div>
            <div>
              <div className="font-medium text-text-primary">{artist?.name || '未知艺人'}</div>
              <div className="text-xs text-text-muted">{artist?.contact || ''}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'studio',
      header: '录音棚',
      render: (row: Booking) => {
        if (!row.studioId) return <span className="text-text-muted">未分配</span>;
        const studio = getStudioById(row.studioId);
        return (
          <div>
            <div className="text-text-primary">{studio?.name || '未知棚'}</div>
            {row.allocationScore !== undefined && (
              <div className="text-xs text-gold">匹配度: {row.allocationScore}分</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'time',
      header: '预约时间',
      render: (row: Booking) => (
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-gold" />
          <div>
            <div className="text-text-primary">{formatDateTime(row.startTime)}</div>
            <div className="text-xs text-text-muted">{formatDuration(row.duration)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: '金额',
      render: (row: Booking) => (
        <span className="text-gold font-medium">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (row: Booking) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '操作',
      width: '240px',
      render: (row: Booking) => (
        <div className="flex items-center gap-2">
          {row.status === 'ALLOCATED' && (
            <>
              <button
                onClick={() => confirmBooking(row.id)}
                className="btn-gold text-xs flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                确认
              </button>
              <button
                onClick={() => cancelBooking(row.id)}
                className="btn-outline text-xs flex items-center gap-1 border-neon-red/30 text-neon-red hover:border-neon-red hover:bg-neon-red/10"
              >
                <XCircle className="w-3.5 h-3.5" />
                取消
              </button>
            </>
          )}
          {row.status === 'CONFIRMED' && (
            <button
              onClick={() => completeBooking(row.id)}
              className="btn-gold text-xs flex items-center gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              完成
            </button>
          )}
          {row.status === 'PENDING' && (
            <button
              onClick={() => handleAllocateSingle(row.id)}
              disabled={isAllocating}
              className="btn-outline text-xs flex items-center gap-1"
            >
              <Wand2 className="w-3.5 h-3.5" />
              分配
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">预约管理</h1>
          <p className="text-text-muted mt-1">管理录音棚预约分配与状态流转</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingBookings.length > 0 && (
            <button
              onClick={handleBatchAllocate}
              disabled={isAllocating}
              className="btn-gold flex items-center gap-2"
            >
              <Wand2 className={`w-5 h-5 ${isAllocating ? 'animate-spin' : ''}`} />
              {isAllocating ? '批量分配中...' : `批量分配 (${pendingBookings.length})`}
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-outline flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            新建预约
          </button>
        </div>
      </div>

      {allocationResult && selectedBooking && (
        <div className="card animate-slide-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-text-primary flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-gold" />
                分配结果
              </h3>
              <p className="text-text-muted text-sm mt-1">
                艺人: {getArtistById(selectedBooking.artistId)?.name} |{' '}
                {formatDateTime(selectedBooking.startTime)} | {formatDuration(selectedBooking.duration)}
              </p>
            </div>
            <button
              onClick={() => {
                setAllocationResult(null);
                setSelectedBooking(null);
              }}
              className="btn-ghost text-xs"
            >
              关闭
            </button>
          </div>

          {allocationResult.success && allocationResult.bestMatch ? (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border border-gold/30 bg-gradient-to-r ${getScoreBg(
                  allocationResult.bestMatch.score
                )} animate-pulse-gold`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-text-muted mb-1">最优匹配</div>
                    <div className="font-display text-xl font-bold text-text-primary">
                      {allocationResult.bestMatch.studioName}
                    </div>
                    <div className="text-sm text-text-muted mt-1">
                      {allocationResult.bestMatch.reason}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-display text-3xl font-bold ${getScoreColor(
                        allocationResult.bestMatch.score
                      )}`}
                    >
                      {allocationResult.bestMatch.score}
                      <span className="text-lg">分</span>
                    </div>
                    <div className="text-xs text-text-muted">匹配评分</div>
                  </div>
                </div>
                <div className="mt-3 progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${allocationResult.bestMatch.score}%` }}
                  />
                </div>
              </div>

              {allocationResult.alternatives.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-text-primary mb-2">备选方案</div>
                  <div className="space-y-2">
                    {allocationResult.alternatives.map((alt, index) => (
                      <div
                        key={alt.studioId}
                        className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/50 border border-gold/10 hover:border-gold/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-display font-bold">
                            {index + 2}
                          </div>
                          <div>
                            <div className="font-medium text-text-primary">{alt.studioName}</div>
                            <div className="text-xs text-text-muted">{alt.reason}</div>
                          </div>
                        </div>
                        <div className={`font-bold ${getScoreColor(alt.score)}`}>
                          {alt.score}分
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBooking.status === 'PENDING' && (
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setAllocationResult(null);
                      setSelectedBooking(null);
                    }}
                    className="btn-ghost"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      handleAllocateSingle(selectedBooking.id);
                      setAllocationResult(null);
                      setSelectedBooking(null);
                    }}
                    className="btn-gold flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    确认分配
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-neon-red/30 bg-neon-red/5 text-center">
              <XCircle className="w-12 h-12 text-neon-red mx-auto mb-3" />
              <div className="font-medium text-neon-red">{allocationResult.message}</div>
            </div>
          )}
        </div>
      )}

      {pendingBookings.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-text-primary flex items-center gap-2">
              <Clock className="w-5 h-5 text-neon-yellow" />
              待分配预约
              <span className="ml-2 px-2 py-0.5 rounded-full bg-neon-yellow/20 text-neon-yellow text-xs font-medium">
                {pendingBookings.length}
              </span>
            </h2>
          </div>
          <DataTable
            columns={pendingColumns}
            data={pendingBookings}
            emptyMessage="暂无待分配预约"
          />
        </div>
      )}

      <div className="card">
        <h2 className="font-display text-xl font-semibold text-text-primary mb-4">全部预约</h2>
        <DataTable
          columns={allColumns}
          data={bookings.sort(
            (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )}
          emptyMessage="暂无预约记录"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新建预约"
        size="lg"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              <User className="w-4 h-4 inline mr-2 text-gold" />
              选择艺人
            </label>
            <select
              value={formData.artistId}
              onChange={(e) => setFormData({ ...formData, artistId: e.target.value })}
              className="input-field"
            >
              <option value="">请选择艺人</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                <CalendarClock className="w-4 h-4 inline mr-2 text-gold" />
                预约日期
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                <Clock className="w-4 h-4 inline mr-2 text-gold" />
                开始时间
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                <Clock className="w-4 h-4 inline mr-2 text-gold" />
                预约时长
              </label>
              <select
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: Number(e.target.value) })
                }
                className="input-field"
              >
                <option value={60}>1 小时</option>
                <option value={120}>2 小时</option>
                <option value={180}>3 小时</option>
                <option value={240}>4 小时</option>
                <option value={360}>6 小时</option>
                <option value={480}>8 小时</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                <Users className="w-4 h-4 inline mr-2 text-gold" />
                参与人数
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.attendeeCount}
                onChange={(e) =>
                  setFormData({ ...formData, attendeeCount: Number(e.target.value) })
                }
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">备注</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="请输入备注信息..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gold/10">
            <button onClick={() => setIsModalOpen(false)} className="btn-ghost">
              取消
            </button>
            <button
              onClick={handleCreateBooking}
              disabled={!formData.artistId || !formData.date || !formData.startTime}
              className="btn-gold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              创建预约
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
