import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: ReactNode;
}

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: '仪表盘', subtitle: '实时数据概览与关键指标' },
  '/studios': { title: '录音棚管理', subtitle: '资源建档与排期日历' },
  '/bookings': { title: '预约管理', subtitle: '智能分配与状态流转' },
  '/commission': { title: '抽成配置', subtitle: '阶梯档位设置与模拟计算' },
  '/settlement': { title: '对账明细', subtitle: '分账计算与对账单管理' },
  '/masters': { title: '母带管理', subtitle: '版本交付与确认记录' },
};

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const pageInfo = pageTitles[location.pathname] || { title: 'Aurora Studio', subtitle: '' };

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar />
      <div className="ml-64 transition-all duration-300">
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />
        <main className="p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
