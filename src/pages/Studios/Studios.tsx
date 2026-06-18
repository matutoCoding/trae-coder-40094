import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Music2,
  Users,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  FileText,
  Disc,
} from 'lucide-react';
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  isWithinInterval,
  differenceInMinutes,
  setHours,
  setMinutes,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import { Studio, StudioType, Booking } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDuration } from '@/utils/formatters';
import { getStudioTypeLabel, getBookingStatusColor } from '@/utils/dateUtils';
import { getAllStudiosUsageStats } from '@/services/studio.service';

type ViewMode = 'list' | 'calendar';

interface StudioFormData {
  name: string;
  type: StudioType;
  hourlyRate: number;
  equipment: string;
  capacity: number;
  isActive: boolean;
}

const initialFormData: StudioFormData = {
  name: '',
  type: 'MEDIUM',
  hourlyRate: 0,
  equipment: '',
  capacity: 0,
  isActive: true,
};

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => i + 9);

export function Studios() {
  const navigate = useNavigate();
  const {
    studios,
    bookings,
    addStudio,
    updateStudio,
    deleteStudio,
    getArtistById,
    getStudioById,
    getMastersByBookingId,
  } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudio, setEditingStudio] = useState<Studio | null>(null);
  const [formData, setFormData] = useState<StudioFormData>(initialFormData);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [clickedBookingId, setClickedBookingId] = useState<string | null>(null);

  const usageStats = useMemo(() => {
    return getAllStudiosUsageStats(studios, bookings);
  }, [studios, bookings]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const studioBookings = useMemo(() => {
    const weekEnd = addDays(weekStart, 6);
    return bookings.filter((b) => {
      if (!b.studioId || b.status === 'CANCELLED') return false;
      return isWithinInterval(b.startTime, { start: weekStart, end: weekEnd });
    });
  }, [bookings, weekStart]);

  const getUtilizationRate = (studioId: string) => {
    const stat = usageStats.find((s) => s.studioId === studioId);
    return stat?.utilizationRate || 0;
  };

  const handleAddStudio = () => {
    setEditingStudio(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleEditStudio = (studio: Studio) => {
    setEditingStudio(studio);
    setFormData({
      name: studio.name,
      type: studio.type,
      hourlyRate: studio.hourlyRate,
      equipment: studio.equipment,
      capacity: studio.capacity,
      isActive: studio.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDeleteStudio = (id: string) => {
    if (window.confirm('确定要删除这个录音棚吗？')) {
      deleteStudio(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudio) {
      updateStudio(editingStudio.id, formData);
    } else {
      addStudio(formData);
    }
    setIsModalOpen(false);
  };

  const getBookingPosition = (booking: Booking, day: Date) => {
    const dayStart = setMinutes(setHours(day, 9), 0);
    const dayEnd = setMinutes(setHours(day, 22), 0);
    const startMinutes = differenceInMinutes(booking.startTime, dayStart);
    const endMinutes = differenceInMinutes(booking.endTime, dayStart);
    const totalMinutes = differenceInMinutes(dayEnd, dayStart);

    const top = Math.max(0, (startMinutes / totalMinutes) * 100);
    const height = Math.min(
      100 - top,
      ((endMinutes - startMinutes) / totalMinutes) * 100
    );

    return { top: `${top}%`, height: `${height}%` };
  };

  const getBookingsForStudioAndDay = (studioId: string, day: Date) => {
    return studioBookings.filter(
      (b) => b.studioId === studioId && isSameDay(b.startTime, day)
    );
  };

  const handleBookingClick = (booking: Booking) => {
    if (!booking.studioId) {
      alert('该预约待分配');
      return;
    }
    setClickedBookingId(booking.id);
    setTimeout(() => setClickedBookingId(null), 200);
    setSelectedBooking(booking);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
              录音棚管理
            </h1>
            <p className="text-text-secondary">
              管理所有录音棚信息和排期安排
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-bg-secondary rounded-lg p-1 border border-gold/10">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-gold text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                列表
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'calendar'
                    ? 'bg-gold text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Calendar className="w-4 h-4" />
                日历
              </button>
            </div>
            <button
              onClick={handleAddStudio}
              className="flex items-center gap-2 btn-gold"
            >
              <Plus className="w-4 h-4" />
              添加录音棚
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studios.map((studio) => {
              const utilizationRate = getUtilizationRate(studio.id);
              return (
                <div
                  key={studio.id}
                  className="card group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-gold/10 transition-all duration-500" />
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => handleEditStudio(studio)}
                      className="p-2 bg-bg-tertiary rounded-lg text-text-secondary hover:text-gold hover:bg-gold/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStudio(studio.id)}
                      className="p-2 bg-bg-tertiary rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-gold/10 rounded-xl">
                        <Music2 className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-1">
                          {studio.name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            studio.type === 'LARGE'
                              ? 'bg-info/20 text-info'
                              : studio.type === 'MEDIUM'
                              ? 'bg-gold/20 text-gold'
                              : 'bg-success/20 text-success'
                          }`}
                        >
                          {getStudioTypeLabel(studio.type)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-3 text-sm">
                        <DollarSign className="w-4 h-4 text-text-muted" />
                        <span className="text-text-muted">小时单价：</span>
                        <span className="text-text-primary font-medium">
                          {formatCurrency(studio.hourlyRate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Users className="w-4 h-4 text-text-muted" />
                        <span className="text-text-muted">容纳人数：</span>
                        <span className="text-text-primary font-medium">
                          {studio.capacity} 人
                        </span>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <GripVertical className="w-4 h-4 text-text-muted mt-0.5" />
                        <span className="text-text-muted">设备配置：</span>
                        <span className="text-text-primary flex-1">
                          {studio.equipment}
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-gold/10 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-text-muted">
                          本月使用率
                        </span>
                        <span className="text-sm font-semibold text-gold">
                          {utilizationRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${utilizationRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gold/10">
              <h2 className="text-xl font-display font-semibold text-text-primary">
                {format(weekStart, 'yyyy年MM月dd日', { locale: zhCN })} -{' '}
                {format(addDays(weekStart, 6), 'MM月dd日', { locale: zhCN })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekStart((prev) => addDays(prev, -7))}
                  className="p-2 text-text-secondary hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                >
                  本周
                </button>
                <button
                  onClick={() => setWeekStart((prev) => addDays(prev, 7))}
                  className="p-2 text-text-secondary hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4 px-4">
              {(['PENDING', 'ALLOCATED', 'CONFIRMED', 'COMPLETED'] as const).map(
                (status) => (
                  <div key={status} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getBookingStatusColor(status) }}
                    />
                    <span className="text-xs text-text-muted">
                      {status === 'PENDING'
                        ? '待分配'
                        : status === 'ALLOCATED'
                        ? '已分配'
                        : status === 'CONFIRMED'
                        ? '已确认'
                        : '已完成'}
                    </span>
                  </div>
                )
              )}
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                <div className="grid grid-cols-8 border-b border-gold/10 bg-bg-tertiary/30">
                  <div className="p-3 text-center text-sm font-medium text-text-muted border-r border-gold/10">
                    录音棚
                  </div>
                  {weekDays.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={`p-3 text-center border-r border-gold/10 last:border-r-0 ${
                        isSameDay(day, new Date())
                          ? 'bg-gold/10'
                          : ''
                      }`}
                    >
                      <div className="text-xs text-text-muted">
                        {format(day, 'EEEE', { locale: zhCN })}
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          isSameDay(day, new Date()) ? 'text-gold' : 'text-text-primary'
                        }`}
                      >
                        {format(day, 'M月d日')}
                      </div>
                    </div>
                  ))}
                </div>

                {studios
                  .filter((s) => s.isActive)
                  .map((studio, studioIndex) => (
                    <div
                      key={studio.id}
                      className={`grid grid-cols-8 border-b border-gold/5 ${
                        studioIndex % 2 === 0 ? 'bg-bg-secondary/30' : ''
                      }`}
                    >
                      <div className="p-3 border-r border-gold/10 flex items-center gap-2">
                        <Music2 className="w-4 h-4 text-gold" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">
                            {studio.name}
                          </div>
                          <div className="text-xs text-text-muted">
                            {getStudioTypeLabel(studio.type)}
                          </div>
                        </div>
                      </div>
                      {weekDays.map((day) => (
                        <div
                          key={`${studio.id}-${day.toISOString()}`}
                          className="relative h-32 border-r border-gold/5 last:border-r-0 p-1"
                        >
                          <div className="absolute inset-1">
                            {TIME_SLOTS.slice(0, -1).map((hour) => (
                              <div
                                key={hour}
                                className="absolute left-0 right-0 border-t border-gold/5"
                                style={{
                                  top: `${((hour - 9) / 13) * 100}%`,
                                }}
                              />
                            ))}
                            {getBookingsForStudioAndDay(studio.id, day).map(
                              (booking) => {
                                const position = getBookingPosition(booking, day);
                                const isClicked = clickedBookingId === booking.id;
                                return (
                                  <div
                                    key={booking.id}
                                    onClick={() => handleBookingClick(booking)}
                                    className={`absolute left-1 right-1 rounded px-2 py-1 overflow-hidden cursor-pointer hover:brightness-110 hover:shadow-lg hover:shadow-gold/20 transition-all duration-200 ${isClicked ? 'scale-95 brightness-125' : ''}`}
                                    style={{
                                      ...position,
                                      backgroundColor: getBookingStatusColor(booking.status),
                                      minHeight: '24px',
                                    }}
                                    title={`${format(booking.startTime, 'HH:mm')} - ${format(booking.endTime, 'HH:mm')}`}
                                  >
                                    <div className="text-xs font-medium text-white truncate">
                                      {format(booking.startTime, 'HH:mm')}-
                                      {format(booking.endTime, 'HH:mm')}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gold/10">
              <div className="grid grid-cols-14 gap-1 px-4">
                <div className="col-span-2" />
                {TIME_SLOTS.map((hour) => (
                  <div
                    key={hour}
                    className="text-center text-xs text-text-muted"
                  >
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudio ? '编辑录音棚' : '添加录音棚'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                棚名称
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="请输入录音棚名称"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                类型
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as StudioType })
                }
                className="input-field"
                required
              >
                <option value="LARGE">大棚</option>
                <option value="MEDIUM">中棚</option>
                <option value="SMALL">小棚</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                小时单价（元）
              </label>
              <input
                type="number"
                value={formData.hourlyRate}
                onChange={(e) =>
                  setFormData({ ...formData, hourlyRate: Number(e.target.value) })
                }
                className="input-field"
                placeholder="请输入小时单价"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                容纳人数
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: Number(e.target.value) })
                }
                className="input-field"
                placeholder="请输入容纳人数"
                min="1"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              设备配置
            </label>
            <textarea
              value={formData.equipment}
              onChange={(e) =>
                setFormData({ ...formData, equipment: e.target.value })
              }
              className="input-field min-h-[100px]"
              placeholder="请输入设备配置信息，用逗号分隔"
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="w-4 h-4 text-gold bg-bg-tertiary border-gold/20 rounded focus:ring-gold"
            />
            <label
              htmlFor="isActive"
              className="text-sm text-text-primary cursor-pointer"
            >
              启用该录音棚
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
            <button type="submit" className="btn-gold">
              {editingStudio ? '保存修改' : '添加'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="预约详情"
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-text-muted mb-2">艺人名称</label>
                <p className="text-text-primary font-medium">
                  {getArtistById(selectedBooking.artistId)?.name || '未知艺人'}
                </p>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">录音棚</label>
                <p className="text-text-primary font-medium">
                  {selectedBooking.studioId
                    ? getStudioById(selectedBooking.studioId)?.name || '未知录音棚'
                    : '待分配'}
                </p>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">预约时间段</label>
                <p className="text-text-primary font-medium">
                  {format(selectedBooking.startTime, 'yyyy-MM-dd HH:mm')} -{' '}
                  {format(selectedBooking.endTime, 'HH:mm')}
                </p>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">时长</label>
                <p className="text-text-primary font-medium">
                  {formatDuration(selectedBooking.duration)}
                </p>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">订单金额</label>
                <p className="text-gold font-semibold text-lg">
                  {formatCurrency(selectedBooking.totalAmount)}
                </p>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">预约状态</label>
                <StatusBadge status={selectedBooking.status} />
              </div>
            </div>

            {selectedBooking.allocationReason && (
              <div>
                <label className="block text-sm text-text-muted mb-2">分配理由</label>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gold/20 text-gold border border-gold/30">
                  {selectedBooking.allocationReason}
                </span>
              </div>
            )}

            {selectedBooking.allocationScore !== undefined && (
              <div>
                <label className="block text-sm text-text-muted mb-2">
                  分配评分 ({((selectedBooking.allocationScore || 0) * 100).toFixed(0)}%)
                </label>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${(selectedBooking.allocationScore || 0) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gold/10">
              <label className="block text-sm text-text-muted mb-3">母带状态</label>
              {(() => {
                const masters = getMastersByBookingId(selectedBooking.id);
                const hasMaster = masters.length > 0;
                const hasConfirmed = masters.some((m) => m.isConfirmed);
                return (
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                        hasMaster
                          ? 'bg-neon-green/20 text-neon-green border-neon-green/30'
                          : 'bg-text-muted/20 text-text-muted border-text-muted/30'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          hasMaster ? 'bg-neon-green' : 'bg-text-muted'
                        }`}
                      />
                      {hasMaster ? '已交付' : '未交付'}
                    </div>
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                        hasConfirmed
                          ? 'bg-gold/20 text-gold border-gold/30'
                          : 'bg-text-muted/20 text-text-muted border-text-muted/30'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          hasConfirmed ? 'bg-gold' : 'bg-text-muted'
                        }`}
                      />
                      {hasConfirmed ? '已确认' : '未确认'}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gold/10">
              <button
                onClick={() => {
                  setIsBookingModalOpen(false);
                  navigate('/settlement');
                }}
                className="flex items-center gap-2 btn-outline"
              >
                <FileText className="w-4 h-4" />
                查看对账记录
              </button>
              <button
                onClick={() => {
                  setIsBookingModalOpen(false);
                  navigate('/masters');
                }}
                className="flex items-center gap-2 btn-gold"
              >
                <Disc className="w-4 h-4" />
                查看母带记录
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
