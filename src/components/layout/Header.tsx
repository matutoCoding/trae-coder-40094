import { Bell, Search, Settings } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 bg-bg-secondary/50 backdrop-blur-sm border-b border-gold/10 px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="font-display text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="搜索预约、艺人、录音棚..."
            className="input-field pl-10 pr-4 py-2 w-64 text-sm"
          />
        </div>

        <button className="relative p-2 text-text-secondary hover:text-gold transition-colors rounded-lg hover:bg-gold/5">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-neon-red rounded-full" />
        </button>

        <button className="p-2 text-text-secondary hover:text-gold transition-colors rounded-lg hover:bg-gold/5">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
