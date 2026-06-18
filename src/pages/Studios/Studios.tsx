import { useState, useMemo, useEffect, useCallback } from 'react';
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
  Wrench,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  Clock,
  Ban,
  Repeat,
} from 'lucide-react';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  differenceInMinutes,
  setHours,
  setMinutes,
  startOfMonth,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore, RescheduleResult } from '@/store/useAppStore';
import { Studio, StudioType, Booking, StudioBlockout, BlockoutType, BlockoutRule, RecurrencePattern } from '@/types';
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

interface BlockoutFormData {
  date: string;
  startTime: string;
  endTime: string;
  type: BlockoutType;
  reason: string;
  isAllDay: boolean;
}

interface BlockoutRuleFormData {
  recurrence: RecurrencePattern;
  dayOfWeek: number;
  dayOfMonth: number | 'LAST_DAY';
  startTime: string;
  endTime: string;
  type: BlockoutType;
  reason: string;
  isAllDay: boolean;
}

type BlockoutModalTab = 'manual' | 'rules';

const initialFormData: StudioFormData = {
  name: '',
  type: 'MEDIUM',
  hourlyRate: 0,
  equipment: '',
  capacity: 0,
  isActive: true,
};

const initialBlockoutFormData: BlockoutFormData = {
  date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '09:00',
  endTime: '12:00',
  type: 'MAINTENANCE',
  reason: '',
  isAllDay: false,
};

const initialRuleFormData: BlockoutRuleFormData = {
  recurrence: 'WEEKLY',
  dayOfWeek: 1,
  dayOfMonth: 1,
  startTime: '09:00',
  endTime: '12:00',
  type: 'MAINTENANCE',
  reason: '',
  isAllDay: false,
};

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => i + 9);

export function Studios() {
  const navigate = useNavigate();
  const {
    studios,
    bookings,
    blockouts,
    blockoutRules,
    addStudio,
    updateStudio,
    deleteStudio,
    getArtistById,
    getStudioById,
    getMastersByBookingId,
    rescheduleBooking,
    addBlockout,
    deleteBlockout,
    getBlockoutsByStudioAndDate,
    getBlockoutTypeLabel,
    getBlockoutTypeColor,
    setHighlight,
    clearHighlight,
    highlight,
    addBlockoutRule,
    deleteBlockoutRule,
    toggleBlockoutRule,
    getBlockoutRuleLabel,
    getAllEffectiveBlockouts,
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
  const [isBlockoutModalOpen, setIsBlockoutModalOpen] = useState(false);
  const [selectedStudioForBlockout, setSelectedStudioForBlockout] = useState<Studio | null>(null);
  const [blockoutFormData, setBlockoutFormData] = useState<BlockoutFormData>(initialBlockoutFormData);
  const [blockoutModalTab, setBlockoutModalTab] = useState<BlockoutModalTab>('manual');
  const [ruleFormData, setRuleFormData] = useState<BlockoutRuleFormData>(initialRuleFormData);
  const [highlightStudioName, setHighlightStudioName] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleDuration, setRescheduleDuration] = useState(1);
  const [rescheduleResult, setRescheduleResult] = useState<RescheduleResult | null>(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [selectedStudioFilter, setSelectedStudioFilter] = useState<string | null>(null);
  const [showLockBanner, setShowLockBanner] = useState(false);

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

  const studioBlockouts = useMemo(() => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return getAllEffectiveBlockouts(weekStart, weekEnd);
  }, [blockouts, blockoutRules, weekStart, getAllEffectiveBlockouts]);

  const sortedStudioBlockouts = useMemo(() => {
    if (!selectedStudioForBlockout) return [];
    return blockouts
      .filter((b) => b.studioId === selectedStudioForBlockout.id)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [blockouts, selectedStudioForBlockout]);

  const sortedStudioRules = useMemo(() => {
    if (!selectedStudioForBlockout) return [];
    return blockoutRules.filter((r) => r.studioId === selectedStudioForBlockout.id);
  }, [blockoutRules, selectedStudioForBlockout]);

  const ruleIdToRecurrence = useMemo(() => {
    const map = new Map<string, RecurrencePattern>();
    for (const rule of blockoutRules) {
      map.set(rule.id, rule.recurrence);
    }
    return map;
  }, [blockoutRules]);

  const filteredStudios = useMemo(() => {
    if (!selectedStudioFilter) return studios;
    return studios.filter((s) => s.id === selectedStudioFilter);
  }, [studios, selectedStudioFilter]);

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

  const handleOpenBlockoutModal = (studio: Studio) => {
    setSelectedStudioForBlockout(studio);
    setBlockoutFormData({
      ...initialBlockoutFormData,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setIsBlockoutModalOpen(true);
  };

  const handleAddBlockout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudioForBlockout) return;

    const [year, month, day] = blockoutFormData.date.split('-').map(Number);
    let startTime: Date;
    let endTime: Date;

    if (blockoutFormData.isAllDay) {
      startTime = new Date(year, month - 1, day, 0, 0, 0);
      endTime = new Date(year, month - 1, day, 23, 59, 59);
    } else {
      const [startH, startM] = blockoutFormData.startTime.split(':').map(Number);
      const [endH, endM] = blockoutFormData.endTime.split(':').map(Number);
      startTime = new Date(year, month - 1, day, startH, startM, 0);
      endTime = new Date(year, month - 1, day, endH, endM, 0);
    }

    if (!blockoutFormData.isAllDay && endTime <= startTime) {
      alert('结束时间必须晚于开始时间');
      return;
    }

    addBlockout({
      studioId: selectedStudioForBlockout.id,
      startTime,
      endTime,
      type: blockoutFormData.type,
      reason: blockoutFormData.reason || getBlockoutTypeLabel(blockoutFormData.type),
      isAllDay: blockoutFormData.isAllDay,
    });

    setBlockoutFormData({
      ...initialBlockoutFormData,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleDeleteBlockout = (id: string) => {
    if (window.confirm('确定要删除这个停用时段吗？')) {
      deleteBlockout(id);
    }
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudioForBlockout) return;

    if (!ruleFormData.isAllDay && ruleFormData.endTime <= ruleFormData.startTime) {
      alert('结束时间必须晚于开始时间');
      return;
    }

    addBlockoutRule({
      studioId: selectedStudioForBlockout.id,
      recurrence: ruleFormData.recurrence,
      dayOfWeek: ruleFormData.recurrence === 'WEEKLY' ? ruleFormData.dayOfWeek : undefined,
      dayOfMonth: (ruleFormData.recurrence === 'MONTHLY' || ruleFormData.recurrence === 'YEARLY') ? ruleFormData.dayOfMonth : undefined,
      startTime: ruleFormData.isAllDay ? '00:00' : ruleFormData.startTime,
      endTime: ruleFormData.isAllDay ? '23:59' : ruleFormData.endTime,
      type: ruleFormData.type,
      reason: ruleFormData.reason || getBlockoutTypeLabel(ruleFormData.type),
      isAllDay: ruleFormData.isAllDay,
      isActive: true,
    });

    setRuleFormData(initialRuleFormData);
  };

  const handleDeleteRule = (id: string) => {
    if (window.confirm('确定要删除这条周期规则吗？相关停用时段也将被删除。')) {
      deleteBlockoutRule(id);
    }
  };

  const handleToggleRule = (id: string) => {
    toggleBlockoutRule(id);
  };

  const handleBookingClick = (booking: Booking) => {
    if (!booking.studioId) {
      alert('该预约待分配');
      return;
    }
    setClickedBookingId(booking.id);
    setTimeout(() => setClickedBookingId(null), 200);
    setSelectedBooking(booking);
    setRescheduleDate(format(booking.startTime, 'yyyy-MM-dd'));
    setRescheduleStartTime(format(booking.startTime, 'HH:mm'));
    setRescheduleDuration(Math.max(1, Math.round(booking.duration / 60)));
    setRescheduleResult(null);
    setRescheduleSuccess(false);
    setIsBookingModalOpen(true);
  };

  const handleReschedule = () => {
    if (!selectedBooking || !selectedBooking.studioId) return;

    const [year, month, day] = rescheduleDate.split('-').map(Number);
    const [startH, startM] = rescheduleStartTime.split(':').map(Number);
    const startTime = new Date(year, month - 1, day, startH, startM, 0);
    const endTime = new Date(startTime.getTime() + rescheduleDuration * 60 * 60 * 1000);

    const result = rescheduleBooking(selectedBooking.id, startTime, endTime);
    setRescheduleResult(result);

    if (result.success) {
      setRescheduleSuccess(true);
      const updatedBooking = { ...selectedBooking, startTime, endTime, duration: rescheduleDuration * 60 };
      setSelectedBooking(updatedBooking);
      setTimeout(() => {
        setIsBookingModalOpen(false);
        setRescheduleSuccess(false);
        setRescheduleResult(null);
      }, 1500);
    }
  };

  const getBlockoutPosition = (blockout: StudioBlockout, day: Date) => {
    const dayStart = setMinutes(setHours(day, 9), 0);
    const dayEnd = setMinutes(setHours(day, 22), 0);
    const effectiveStart = blockout.isAllDay ? dayStart : blockout.startTime;
    const effectiveEnd = blockout.isAllDay ? dayEnd : blockout.endTime;
    const startMinutes = differenceInMinutes(effectiveStart, dayStart);
    const endMinutes = differenceInMinutes(effectiveEnd, dayStart);
    const totalMinutes = differenceInMinutes(dayEnd, dayStart);

    const top = Math.max(0, (startMinutes / totalMinutes) * 100);
    const height = Math.min(
      100 - top,
      ((endMinutes - startMinutes) / totalMinutes) * 100
    );

    return { top: `${top}%`, height: `${height}%` };
  };

  const getBlockoutsForStudioAndDay = (studioId: string, day: Date) => {
    return studioBlockouts.filter(
      (b) => b.studioId === studioId && isSameDay(b.startTime, day)
    );
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

  useEffect(() => {
    if (!highlight?.studioId) return;

    setSelectedStudioFilter(highlight.studioId);
    setViewMode('calendar');

    if (highlight.month) {
      const [year, month] = highlight.month.split('-').map(Number);
      const targetDate = new Date(year, month - 1, 1);
      setWeekStart(startOfWeek(targetDate, { weekStartsOn: 1 }));
    }

    const studio = getStudioById(highlight.studioId);
    setHighlightStudioName(studio?.name || null);
    setShowLockBanner(true);

    clearHighlight();
  }, [highlight?.studioId, highlight?.timestamp]);

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
            <div className="relative">
              <select
                value={selectedStudioFilter || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedStudioFilter(value || null);
                  if (!value) {
                    setShowLockBanner(false);
                  }
                }}
                className="appearance-none bg-bg-secondary border border-gold/20 rounded-lg px-4 py-2 pr-10 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors cursor-pointer"
              >
                <option value="">全部棚位</option>
                {studios.map((studio) => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-4 h-4 text-text-muted rotate-90" />
              </div>
              {selectedStudioFilter && (
                <style>{`
                  select option[value="${selectedStudioFilter}"] {
                    color: #D4AF37;
                  }
                `}</style>
              )}
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

        {showLockBanner && highlightStudioName && (
          <div className="mb-6 px-5 py-3 rounded-xl bg-gold/15 border-2 border-gold/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gold" />
              <span className="text-gold font-semibold text-sm">
                已锁定到 {highlightStudioName} 录音棚
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedStudioFilter(null);
                setShowLockBanner(false);
                setHighlightStudioName(null);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-gold/20 text-gold rounded-lg hover:bg-gold/30 transition-colors"
            >
              解除锁定
            </button>
          </div>
        )}

        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudios.map((studio) => {
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
                    <div className="mt-4 pt-4 border-t border-gold/10">
                      <button
                        onClick={() => handleOpenBlockoutModal(studio)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-bg-tertiary/50 text-text-secondary rounded-lg hover:bg-error/10 hover:text-error border border-gold/10 hover:border-error/30 transition-all duration-200"
                      >
                        <Wrench className="w-4 h-4" />
                        维护管理
                      </button>
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

            <div className="flex flex-wrap items-center gap-4 mb-4 px-4">
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
              <div className="h-4 w-px bg-gold/20 mx-2" />
              {(['MAINTENANCE', 'HOLIDAY', 'PRIVATE'] as const).map(
                (type) => (
                  <div key={type} className="flex items-center gap-2">
                    <div
                      className="w-4 h-3 rounded"
                      style={{
                        backgroundColor: getBlockoutTypeColor(type),
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)`,
                      }}
                    />
                    <span className="text-xs text-text-muted">
                      {getBlockoutTypeLabel(type)}
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

                {filteredStudios
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
                                      zIndex: 10,
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
                            {getBlockoutsForStudioAndDay(studio.id, day).map(
                              (blockout) => {
                                const position = getBlockoutPosition(blockout, day);
                                const color = getBlockoutTypeColor(blockout.type);
                                const ruleRecurrence = blockout.ruleId ? ruleIdToRecurrence.get(blockout.ruleId) : null;
                                const ruleLabel = ruleRecurrence ? getBlockoutRuleLabel(ruleRecurrence) : '';
                                return (
                                  <div
                                    key={blockout.id}
                                    className="absolute left-1 right-1 rounded px-2 py-1 overflow-hidden not-allowed"
                                    style={{
                                      ...position,
                                      backgroundColor: color,
                                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 6px)`,
                                      minHeight: '24px',
                                      zIndex: 5,
                                      opacity: 0.9,
                                      cursor: 'not-allowed',
                                    }}
                                    title={`${getBlockoutTypeLabel(blockout.type)}${ruleLabel ? ` | ${ruleLabel}` : ''} | ${blockout.reason} | ${blockout.isAllDay ? format(blockout.startTime, 'yyyy-MM-dd 全天') : `${format(blockout.startTime, 'HH:mm')} - ${format(blockout.endTime, 'HH:mm')}`}`}
                                  >
                                    <div className="text-xs font-semibold text-white/95 truncate drop-shadow-sm">
                                      {blockout.isAllDay
                                        ? `${ruleLabel ? ruleLabel + ' ' : ''}${getBlockoutTypeLabel(blockout.type)}`
                                        : `${format(blockout.startTime, 'HH:mm')}-${format(blockout.endTime, 'HH:mm')} ${ruleLabel ? ruleLabel + ' ' : ''}${getBlockoutTypeLabel(blockout.type)}`}
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

            {selectedBooking.studioId && selectedBooking.status !== 'CANCELLED' && selectedBooking.status !== 'COMPLETED' && (
              <div className="pt-4 border-t border-gold/10">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gold" />
                  <h3 className="text-lg font-semibold text-text-primary">调整时间</h3>
                </div>

                {rescheduleSuccess && (
                  <div className="mb-4 p-4 rounded-lg bg-success/10 border border-success/30 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-success">调整成功！</p>
                      <p className="text-sm text-success/80">{rescheduleResult?.message || '时间已更新，金额已重新计算'}</p>
                    </div>
                  </div>
                )}

                {rescheduleResult && !rescheduleResult.success && (
                  <div className="mb-4 p-4 rounded-lg bg-error/10 border-2 border-error/50 flex items-start gap-3 animate-pulse">
                    <AlertTriangle className="w-6 h-6 text-error flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-error text-base mb-1">
                        ⚠️ {rescheduleResult.conflictType === 'BOOKING' ? '预约冲突' : rescheduleResult.conflictType === 'BLOCKOUT' ? '维护/停用冲突' : '无法修改'}
                      </p>
                      <p className="text-sm text-text-secondary mb-2">{rescheduleResult.message}</p>
                      {rescheduleResult.conflictInfo && (
                        <div className="p-3 rounded-md bg-bg-secondary border border-error/20">
                          <div className="flex items-center gap-2 text-sm mb-1">
                            <span className="text-text-muted">冲突方：</span>
                            <span className="font-semibold text-error">{rescheduleResult.conflictInfo.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-text-muted">时间段：</span>
                            <span className="font-medium text-text-primary">{rescheduleResult.conflictInfo.time}</span>
                          </div>
                        </div>
                      )}
                      <p className="text-sm font-semibold text-error mt-2">
                        ❌ 无法修改，请选择其他时间
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-2">日期</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => {
                        setRescheduleDate(e.target.value);
                        setRescheduleResult(null);
                      }}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">开始时间</label>
                    <input
                      type="time"
                      value={rescheduleStartTime}
                      onChange={(e) => {
                        setRescheduleStartTime(e.target.value);
                        setRescheduleResult(null);
                      }}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">时长（小时）</label>
                    <select
                      value={rescheduleDuration}
                      onChange={(e) => {
                        setRescheduleDuration(Number(e.target.value));
                        setRescheduleResult(null);
                      }}
                      className="input-field"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                        <option key={h} value={h}>{h} 小时</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleReschedule}
                  disabled={rescheduleSuccess}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gold text-bg-primary rounded-lg font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  保存调整
                </button>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t border-gold/10">
              <button
                onClick={() => {
                  setIsBookingModalOpen(false);
                  setHighlight({ bookingId: selectedBooking.id, artistId: selectedBooking.artistId, month: format(selectedBooking.startTime, 'yyyy-MM') });
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
                  setHighlight({ bookingId: selectedBooking.id, artistId: selectedBooking.artistId, month: format(selectedBooking.startTime, 'yyyy-MM') });
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

      <Modal
        isOpen={isBlockoutModalOpen}
        onClose={() => setIsBlockoutModalOpen(false)}
        title={selectedStudioForBlockout ? `停用时段管理 - ${selectedStudioForBlockout.name}` : '停用时段管理'}
        size="xl"
      >
        {selectedStudioForBlockout && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 bg-bg-secondary rounded-lg p-1 border border-gold/10">
              <button
                onClick={() => setBlockoutModalTab('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  blockoutModalTab === 'manual'
                    ? 'bg-gold text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Ban className="w-4 h-4" />
                手动停用
              </button>
              <button
                onClick={() => setBlockoutModalTab('rules')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  blockoutModalTab === 'rules'
                    ? 'bg-gold text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Repeat className="w-4 h-4" />
                周期规则
              </button>
            </div>

            {blockoutModalTab === 'manual' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Plus className="w-5 h-5 text-gold" />
                    <h3 className="text-lg font-semibold text-text-primary">新增停用时段</h3>
                  </div>
                  <form onSubmit={handleAddBlockout} className="space-y-4 bg-bg-secondary/50 rounded-xl p-5 border border-gold/10">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">日期</label>
                      <input
                        type="date"
                        value={blockoutFormData.date}
                        onChange={(e) => setBlockoutFormData({ ...blockoutFormData, date: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="blockoutAllDay"
                        checked={blockoutFormData.isAllDay}
                        onChange={(e) => setBlockoutFormData({ ...blockoutFormData, isAllDay: e.target.checked })}
                        className="w-4 h-4 text-gold bg-bg-tertiary border-gold/20 rounded focus:ring-gold"
                      />
                      <label htmlFor="blockoutAllDay" className="text-sm text-text-primary cursor-pointer">
                        全天停用
                      </label>
                    </div>

                    {!blockoutFormData.isAllDay && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">开始时间</label>
                          <input
                            type="time"
                            value={blockoutFormData.startTime}
                            onChange={(e) => setBlockoutFormData({ ...blockoutFormData, startTime: e.target.value })}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">结束时间</label>
                          <input
                            type="time"
                            value={blockoutFormData.endTime}
                            onChange={(e) => setBlockoutFormData({ ...blockoutFormData, endTime: e.target.value })}
                            className="input-field"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">类型</label>
                      <select
                        value={blockoutFormData.type}
                        onChange={(e) => setBlockoutFormData({ ...blockoutFormData, type: e.target.value as BlockoutType })}
                        className="input-field"
                        required
                      >
                        <option value="MAINTENANCE">设备维护</option>
                        <option value="HOLIDAY">节假日</option>
                        <option value="PRIVATE">私用</option>
                        <option value="OTHER">其他</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">原因说明</label>
                      <textarea
                        value={blockoutFormData.reason}
                        onChange={(e) => setBlockoutFormData({ ...blockoutFormData, reason: e.target.value })}
                        className="input-field min-h-[80px]"
                        placeholder="请输入停用原因（可选）"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gold text-bg-primary rounded-lg font-semibold hover:bg-gold/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      添加停用时段
                    </button>
                  </form>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Ban className="w-5 h-5 text-error" />
                    <h3 className="text-lg font-semibold text-text-primary">
                      现有停用时段 ({sortedStudioBlockouts.length})
                    </h3>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {sortedStudioBlockouts.length === 0 ? (
                      <div className="p-8 rounded-xl bg-bg-secondary/30 border border-gold/10 text-center">
                        <Calendar className="w-12 h-12 text-text-muted/40 mx-auto mb-3" />
                        <p className="text-text-muted text-sm">暂无停用时段记录</p>
                      </div>
                    ) : (
                      sortedStudioBlockouts.map((blockout) => {
                        const color = getBlockoutTypeColor(blockout.type);
                        return (
                          <div
                            key={blockout.id}
                            className="p-4 rounded-xl bg-bg-secondary/50 border border-gold/10 hover:border-gold/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-white"
                                    style={{
                                      backgroundColor: color,
                                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)`,
                                    }}
                                  >
                                    {getBlockoutTypeLabel(blockout.type)}
                                  </span>
                                  {blockout.isAllDay && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted">
                                      全天
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-text-primary font-medium mb-1">
                                  {blockout.isAllDay
                                    ? format(blockout.startTime, 'yyyy年MM月dd日')
                                    : `${format(blockout.startTime, 'yyyy-MM-dd HH:mm')} - ${format(blockout.endTime, 'HH:mm')}`}
                                </div>
                                <div className="text-sm text-text-muted truncate">
                                  {blockout.reason}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteBlockout(blockout.id)}
                                className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors flex-shrink-0"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Plus className="w-5 h-5 text-gold" />
                    <h3 className="text-lg font-semibold text-text-primary">新增周期规则</h3>
                  </div>
                  <form onSubmit={handleAddRule} className="space-y-4 bg-bg-secondary/50 rounded-xl p-5 border border-gold/10">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">录音棚</label>
                      <input
                        type="text"
                        value={selectedStudioForBlockout.name}
                        className="input-field opacity-60 cursor-not-allowed"
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">周期类型</label>
                      <select
                        value={ruleFormData.recurrence}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, recurrence: e.target.value as RecurrencePattern })}
                        className="input-field"
                        required
                      >
                        <option value="DAILY">每天</option>
                        <option value="WEEKLY">每周</option>
                        <option value="MONTHLY">每月</option>
                        <option value="YEARLY">每年</option>
                      </select>
                    </div>

                    {ruleFormData.recurrence === 'WEEKLY' && (
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">星期</label>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => setRuleFormData({ ...ruleFormData, dayOfWeek: day })}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                ruleFormData.dayOfWeek === day
                                  ? 'bg-gold text-bg-primary'
                                  : 'bg-bg-tertiary text-text-secondary hover:bg-gold/10 hover:text-gold'
                              }`}
                            >
                              {WEEKDAY_LABELS[day]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {ruleFormData.recurrence === 'MONTHLY' && (
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">日期（每月几号）</label>
                        <select
                          value={ruleFormData.dayOfMonth}
                          onChange={(e) => {
                            const value = e.target.value;
                            setRuleFormData({
                              ...ruleFormData,
                              dayOfMonth: value === 'LAST_DAY' ? 'LAST_DAY' : Number(value),
                            });
                          }}
                          className="input-field"
                          required
                        >
                          <option value="LAST_DAY">每月最后一天</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>{d}号</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {ruleFormData.recurrence === 'YEARLY' && (
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">日期（每年1月几号）</label>
                        <select
                          value={ruleFormData.dayOfMonth}
                          onChange={(e) => setRuleFormData({ ...ruleFormData, dayOfMonth: Number(e.target.value) })}
                          className="input-field"
                          required
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>1月{d}号</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="ruleAllDay"
                        checked={ruleFormData.isAllDay}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, isAllDay: e.target.checked })}
                        className="w-4 h-4 text-gold bg-bg-tertiary border-gold/20 rounded focus:ring-gold"
                      />
                      <label htmlFor="ruleAllDay" className="text-sm text-text-primary cursor-pointer">
                        全天停用
                      </label>
                    </div>

                    {!ruleFormData.isAllDay && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">开始时间</label>
                          <input
                            type="time"
                            value={ruleFormData.startTime}
                            onChange={(e) => setRuleFormData({ ...ruleFormData, startTime: e.target.value })}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">结束时间</label>
                          <input
                            type="time"
                            value={ruleFormData.endTime}
                            onChange={(e) => setRuleFormData({ ...ruleFormData, endTime: e.target.value })}
                            className="input-field"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">类型</label>
                      <select
                        value={ruleFormData.type}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, type: e.target.value as BlockoutType })}
                        className="input-field"
                        required
                      >
                        <option value="MAINTENANCE">设备维护</option>
                        <option value="HOLIDAY">节假日</option>
                        <option value="PRIVATE">私用</option>
                        <option value="OTHER">其他</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">原因说明</label>
                      <textarea
                        value={ruleFormData.reason}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, reason: e.target.value })}
                        className="input-field min-h-[80px]"
                        placeholder="请输入停用原因（可选）"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gold text-bg-primary rounded-lg font-semibold hover:bg-gold/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      添加周期规则
                    </button>
                  </form>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Repeat className="w-5 h-5 text-gold" />
                    <h3 className="text-lg font-semibold text-text-primary">
                      周期规则列表 ({sortedStudioRules.length})
                    </h3>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {sortedStudioRules.length === 0 ? (
                      <div className="p-8 rounded-xl bg-bg-secondary/30 border border-gold/10 text-center">
                        <Repeat className="w-12 h-12 text-text-muted/40 mx-auto mb-3" />
                        <p className="text-text-muted text-sm">暂无周期规则</p>
                      </div>
                    ) : (
                      sortedStudioRules.map((rule) => {
                        const color = getBlockoutTypeColor(rule.type);
                        return (
                          <div
                            key={rule.id}
                            className={`p-4 rounded-xl bg-bg-secondary/50 border transition-colors ${
                              rule.isActive ? 'border-gold/10 hover:border-gold/30' : 'border-gold/5 opacity-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-white"
                                    style={{
                                      backgroundColor: color,
                                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)`,
                                    }}
                                  >
                                    {getBlockoutTypeLabel(rule.type)}
                                  </span>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gold/20 text-gold border border-gold/30">
                                    {getBlockoutRuleLabel(rule.recurrence)}
                                  </span>
                                  {rule.isAllDay && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted">
                                      全天
                                    </span>
                                  )}
                                  {!rule.isActive && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-error/20 text-error">
                                      已停用
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-text-primary font-medium mb-1">
                                  {rule.recurrence === 'WEEKLY' && rule.dayOfWeek !== undefined
                                    ? WEEKDAY_LABELS[rule.dayOfWeek]
                                    : rule.recurrence === 'MONTHLY' || rule.recurrence === 'YEARLY'
                                    ? rule.dayOfMonth === 'LAST_DAY'
                                      ? '月末'
                                      : `${rule.recurrence === 'YEARLY' ? '1月' : ''}${rule.dayOfMonth}号`
                                    : ''}
                                  {' '}
                                  {rule.isAllDay ? '全天' : `${rule.startTime} - ${rule.endTime}`}
                                </div>
                                <div className="text-sm text-text-muted truncate">
                                  {rule.reason}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleToggleRule(rule.id)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    rule.isActive
                                      ? 'text-success hover:bg-success/10'
                                      : 'text-text-muted hover:bg-gold/10 hover:text-gold'
                                  }`}
                                  title={rule.isActive ? '停用规则' : '启用规则'}
                                >
                                  {rule.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                                  title="删除规则"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gold/10">
              <button
                onClick={() => setIsBlockoutModalOpen(false)}
                className="px-6 py-2.5 btn-gold"
              >
                完成
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
