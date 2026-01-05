import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoinBadgeProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CoinBadge({ amount, size = 'md', className }: CoinBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-bold',
      'bg-gradient-to-r from-golden/20 to-golden/10 border border-golden/30 text-golden',
      sizeClasses[size],
      className
    )}>
      <Coins className={iconSizes[size]} />
      <span>{amount.toLocaleString()}</span>
    </div>
  );
}
