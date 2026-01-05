import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Gift, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/loja', icon: ShoppingBag, label: 'Loja' },
  { path: '/sorteios', icon: Gift, label: 'Sorteios' },
  { path: '/ranking', icon: Trophy, label: 'Ranking' },
  { path: '/perfil', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-soft">
      <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300',
                isActive 
                  ? 'text-primary scale-105' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'p-2 rounded-xl transition-all duration-300',
                isActive && 'gradient-primary shadow-glow'
              )}>
                <Icon className={cn(
                  'w-5 h-5 transition-all',
                  isActive && 'text-primary-foreground'
                )} />
              </div>
              <span className={cn(
                'text-xs font-medium',
                isActive && 'font-bold'
              )}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
