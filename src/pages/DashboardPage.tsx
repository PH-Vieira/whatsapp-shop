import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { Link } from 'react-router-dom';
import { ShoppingBag, Gift, Trophy, Sparkles, TrendingUp, Calendar } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const xpForNextLevel = user.level * 100;
  const xpProgress = (user.xp / xpForNextLevel) * 100;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="animate-slide-down">
          <h1 className="text-2xl font-display font-bold mb-1">
            Olá, <span className="text-gradient">{user.name}</span>! 👋
          </h1>
          <p className="text-muted-foreground">Bem-vindo(a) de volta à Lojinha!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 animate-slide-up">
          <Card className="shadow-soft">
            <CardContent className="p-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <LevelBadge level={user.level} prestige={user.prestige} size="lg" />
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="h-2 rounded-full gradient-primary transition-all duration-500"
                    style={{ width: `${Math.min(xpProgress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {user.xp} / {xpForNextLevel} XP
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <CoinBadge amount={user.coins} size="lg" />
                <p className="text-xs text-muted-foreground mt-2">Suas moedas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Streak */}
        <Card className="gradient-success text-success-foreground shadow-soft animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8" />
                <div>
                  <p className="font-bold">Sequência Diária</p>
                  <p className="text-sm opacity-90">{user.daily_streak} dias consecutivos 🔥</p>
                </div>
              </div>
              <div className="text-3xl font-display font-bold">
                {user.daily_streak}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-display font-bold text-lg">Acesso Rápido</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <Link to="/loja">
              <Card className="group hover:shadow-soft transition-all duration-300 hover:scale-[1.02] cursor-pointer border-2 hover:border-primary/30">
                <CardContent className="p-4 flex flex-col items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <ShoppingBag className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">Loja</p>
                    <p className="text-xs text-muted-foreground">Cosméticos</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/sorteios">
              <Card className="group hover:shadow-soft transition-all duration-300 hover:scale-[1.02] cursor-pointer border-2 hover:border-accent/30">
                <CardContent className="p-4 flex flex-col items-center gap-3">
                  <div className="p-3 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
                    <Gift className="w-6 h-6 text-accent" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">Sorteios</p>
                    <p className="text-xs text-muted-foreground">Prêmios</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/ranking">
              <Card className="group hover:shadow-soft transition-all duration-300 hover:scale-[1.02] cursor-pointer border-2 hover:border-golden/30">
                <CardContent className="p-4 flex flex-col items-center gap-3">
                  <div className="p-3 rounded-xl bg-golden/10 group-hover:bg-golden/20 transition-colors">
                    <Trophy className="w-6 h-6 text-golden" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">Ranking</p>
                    <p className="text-xs text-muted-foreground">Top usuários</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/perfil">
              <Card className="group hover:shadow-soft transition-all duration-300 hover:scale-[1.02] cursor-pointer border-2 hover:border-success/30">
                <CardContent className="p-4 flex flex-col items-center gap-3">
                  <div className="p-3 rounded-xl bg-success/10 group-hover:bg-success/20 transition-colors">
                    <TrendingUp className="w-6 h-6 text-success" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">Progresso</p>
                    <p className="text-xs text-muted-foreground">Seu perfil</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Tips */}
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-bold text-sm">Dica do dia!</p>
              <p className="text-xs text-muted-foreground">
                Participe dos sorteios diários para ganhar coins e itens exclusivos! 🎁
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
