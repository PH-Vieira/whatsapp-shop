import { useAuth } from '@/contexts/AuthContext';
import { Coins, Bell, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🎮</span>
          <h1 className="text-xl font-display font-bold text-gradient">Lojinha</h1>
        </Link>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-golden/20 border border-golden/30">
              <Coins className="w-4 h-4 text-golden" />
              <span className="font-bold text-sm text-golden">{user.coins.toLocaleString()}</span>
            </div>
          )}

          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="w-5 h-5" />
          </Button>

          {user?.is_admin && (
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
