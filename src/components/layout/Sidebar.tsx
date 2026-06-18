import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Music2,
  CalendarClock,
  TrendingUp,
  Receipt,
  Disc,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/studios', label: '录音棚管理', icon: Music2 },
  { path: '/bookings', label: '预约管理', icon: CalendarClock },
  { path: '/commission', label: '抽成配置', icon: TrendingUp },
  { path: '/settlement', label: '对账明细', icon: Receipt },
  { path: '/masters', label: '母带管理', icon: Disc },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-bg-secondary border-r border-gold/10 transition-all duration-300 z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gold/10">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center">
              <Music2 className="w-5 h-5 text-bg-primary" />
            </div>
            <span className="font-display text-xl font-bold text-gold">Aurora</span>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center mx-auto">
            <Music2 className="w-5 h-5 text-bg-primary" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-text-secondary hover:text-gold transition-colors"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      <nav className="p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gold/10 text-gold border border-gold/20 shadow-gold'
                  : 'text-text-secondary hover:bg-gold/5 hover:text-gold'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'animate-pulse-gold' : ''}`} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gold/10">
          <div className="bg-bg-tertiary rounded-lg p-4">
            <p className="text-xs text-text-muted mb-2">当前身份</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center">
                <span className="text-gold text-sm font-bold">管</span>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">管理员</p>
                <p className="text-xs text-text-muted">admin@aurora.com</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
