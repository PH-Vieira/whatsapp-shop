import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Trophy, Medal, Award, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';

const rankIcons = [
  <Crown key="1" className="w-6 h-6 text-golden" />,
  <Medal key="2" className="w-6 h-6 text-muted-foreground" />,
  <Award key="3" className="w-6 h-6 text-accent" />,
];

export default function RankingPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'level' | 'coins' | 'xp'>('level');

  useEffect(() => {
    loadRanking();
  }, [sortBy]);

  const loadRanking = async () => {
    setIsLoading(true);
    
    const orderColumn = sortBy === 'level' ? 'level' : sortBy === 'xp' ? 'xp' : 'coins';
    const secondaryOrder = sortBy === 'level' ? 'xp' : sortBy === 'xp' ? 'level' : 'level';
    
    const query = supabase
      .from('users')
      .select('*')
      .eq('is_banned', false)
      .order(orderColumn, { ascending: false })
      .order(secondaryOrder, { ascending: false })
      .limit(50);

    const { data } = await query;
    setUsers((data || []) as User[]);
    setIsLoading(false);
  };

  const getUserRank = () => {
    if (!user) return null;
    const idx = users.findIndex(u => u.id === user.id);
    return idx >= 0 ? idx + 1 : null;
  };

  const userRank = getUserRank();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="animate-slide-down">
          <h1 className="text-2xl font-display font-bold">Ranking 🏆</h1>
          <p className="text-muted-foreground">Os melhores jogadores da comunidade!</p>
        </div>

        {/* User Position */}
        {user && userRank && (
          <Card className="gradient-primary text-primary-foreground shadow-glow animate-scale-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8" />
                  <div>
                    <p className="font-bold">Sua posição</p>
                    <p className="text-sm opacity-90">{user.name}</p>
                  </div>
                </div>
                <div className="text-3xl font-display font-bold">
                  #{userRank}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as 'level' | 'coins' | 'xp')} className="animate-slide-up">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="level" className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              ⭐ Nível
            </TabsTrigger>
            <TabsTrigger value="xp" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              ✨ XP Total
            </TabsTrigger>
            <TabsTrigger value="coins" className="data-[state=active]:gradient-golden data-[state=active]:text-golden-foreground">
              💰 Coins
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {users.map((rankedUser, index) => (
              <Card 
                key={rankedUser.id}
                className={cn(
                  'transition-all duration-300 hover:shadow-soft',
                  user?.id === rankedUser.id && 'border-2 border-primary bg-primary/5',
                  index < 3 && 'shadow-md'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold">
                      {index < 3 ? (
                        rankIcons[index]
                      ) : (
                        <span className="text-muted-foreground">#{index + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-2xl',
                      'bg-gradient-to-br from-primary/20 to-accent/20'
                    )}>
                      {rankedUser.avatar_url ? (
                        <img 
                          src={rankedUser.avatar_url} 
                          alt={rankedUser.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        '👤'
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{rankedUser.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <LevelBadge 
                          level={rankedUser.level} 
                          prestige={rankedUser.prestige} 
                          size="sm" 
                        />
                        {rankedUser.prestige > 0 && (
                          <span className="text-xs text-muted-foreground">
                            P{rankedUser.prestige}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      {sortBy === 'coins' ? (
                        <CoinBadge amount={rankedUser.coins} size="sm" />
                      ) : sortBy === 'xp' ? (
                        <div className="text-sm">
                          <span className="font-bold text-accent">{rankedUser.xp.toLocaleString('pt-BR')}</span>
                          <span className="text-muted-foreground"> XP</span>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <span className="font-bold text-primary">Lv.{rankedUser.level}</span>
                          <span className="text-muted-foreground text-xs ml-1">({rankedUser.xp} XP)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
