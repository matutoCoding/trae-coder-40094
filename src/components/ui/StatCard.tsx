import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  delay?: number;
}

export function StatCard({ title, value, icon, trend, trendLabel, delay = 0 }: StatCardProps) {
  return (
    <div
      className="card animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-sm mb-1">{title}</p>
          <p className="font-display text-3xl font-bold text-gold">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend >= 0 ? (
                <TrendingUp className="w-4 h-4 text-neon-green" />
              ) : (
                <TrendingDown className="w-4 h-4 text-neon-red" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend >= 0 ? 'text-neon-green' : 'text-neon-red'
                }`}
              >
                {Math.abs(trend)}%
              </span>
              {trendLabel && (
                <span className="text-sm text-text-muted">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-gold/20 to-gold-dark/10 rounded-xl flex items-center justify-center text-gold">
          {icon}
        </div>
      </div>
    </div>
  );
}
