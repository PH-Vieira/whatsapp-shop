import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  prestige?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LevelBadge({ level, prestige = 0, size = 'md', className }: LevelBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-lg px-4 py-1.5',
  };

  const prestigeColors = [
    'from-primary to-primary/80',
    'from-info to-info/80',
    'from-success to-success/80',
    'from-golden to-golden/80',
    'from-accent to-accent/80',
  ];

  const colorClass = prestigeColors[prestige % prestigeColors.length];

  return (
    <div className={cn(
      'inline-flex items-center gap-1 rounded-full font-bold text-primary-foreground',
      'bg-gradient-to-r shadow-md',
      colorClass,
      sizeClasses[size],
      className
    )}>
      {prestige > 0 && <span>✨</span>}
      <span>Lv.{level}</span>
    </div>
  );
}
