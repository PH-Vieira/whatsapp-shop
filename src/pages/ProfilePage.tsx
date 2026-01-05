import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Package, History, Award, MessageCircle, Calendar, Sparkles, Pencil, Check, X } from 'lucide-react';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { UserItem, Transaction, UserBadge, Product } from '@/lib/types';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const [items, setItems] = useState<(UserItem & { product: Product })[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    if (user) loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;

    const [itemsRes, badgesRes, transactionsRes] = await Promise.all([
      supabase
        .from('user_items')
        .select('*, product:products(*)')
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false }),
      supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false }),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    setItems((itemsRes.data || []) as (UserItem & { product: Product })[]);
    setBadges((badgesRes.data || []) as UserBadge[]);
    setTransactions((transactionsRes.data || []) as Transaction[]);
    setIsLoading(false);
  };

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    
    setIsSavingName(true);
    const { error } = await supabase
      .from('users')
      .update({ name: editName.trim() })
      .eq('id', user.id);
    
    if (error) {
      toast.error('Erro ao salvar nome');
    } else {
      await refreshUser();
      toast.success('Nome atualizado!');
      setIsEditingName(false);
    }
    setIsSavingName(false);
  };

  if (!user) return null;

  const xpForNextLevel = user.level * 100;
  const xpProgress = (user.xp / xpForNextLevel) * 100;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card className="overflow-hidden animate-slide-down">
          <div className="h-24 gradient-candy" />
          <CardContent className="relative pt-0 px-4 pb-4">
            <div className="flex flex-col items-center -mt-12">
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={user.avatar_url}
                userName={user.name}
                onUploadComplete={refreshUser}
              />

              {isEditingName ? (
                <div className="flex items-center gap-2 mt-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-center font-bold"
                    maxLength={30}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleSaveName}
                    disabled={isSavingName}
                  >
                    {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-success" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setIsEditingName(false)}
                    disabled={isSavingName}
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-3">
                  <h1 className="text-xl font-display font-bold">{user.name}</h1>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => {
                      setEditName(user.name);
                      setIsEditingName(true);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              )}
              
              {user.equipped_title && (
                <p className="text-sm text-primary font-medium">{user.equipped_title}</p>
              )}

              <div className="flex items-center gap-3 mt-3">
                <LevelBadge level={user.level} prestige={user.prestige} />
                <CoinBadge amount={user.coins} />
              </div>

              {/* XP Progress */}
              <div className="w-full mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>XP para próximo nível</span>
                  <span>{user.xp} / {xpForNextLevel}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="h-3 rounded-full gradient-primary transition-all duration-500"
                    style={{ width: `${Math.min(xpProgress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 animate-slide-up">
          <Card className="text-center">
            <CardContent className="p-3">
              <MessageCircle className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{user.total_messages}</p>
              <p className="text-xs text-muted-foreground">Mensagens</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-3">
              <Calendar className="w-5 h-5 mx-auto text-success mb-1" />
              <p className="text-lg font-bold">{user.daily_streak}</p>
              <p className="text-xs text-muted-foreground">Dias seguidos</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-3">
              <Sparkles className="w-5 h-5 mx-auto text-golden mb-1" />
              <p className="text-lg font-bold">{user.prestige}</p>
              <p className="text-xs text-muted-foreground">Prestígio</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="inventory" className="animate-fade-in">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inventory">
                <Package className="w-4 h-4 mr-1" />
                Itens
              </TabsTrigger>
              <TabsTrigger value="badges">
                <Award className="w-4 h-4 mr-1" />
                Badges
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-1" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inventory" className="mt-4">
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum item comprado ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {items.map(item => (
                    <Card key={item.id} className="text-center">
                      <CardContent className="p-3">
                        <div className="w-12 h-12 mx-auto rounded-lg bg-muted flex items-center justify-center text-2xl mb-2">
                          {item.product.image_url ? (
                            <img 
                              src={item.product.image_url} 
                              alt={item.product.name}
                              className="w-full h-full rounded-lg object-cover"
                            />
                          ) : (
                            '🎁'
                          )}
                        </div>
                        <p className="text-xs font-medium truncate">{item.product.name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="badges" className="mt-4">
              {badges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma badge conquistada ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {badges.map(badge => (
                    <Card key={badge.id} className="text-center">
                      <CardContent className="p-3">
                        <span className="text-2xl">{badge.badge_icon}</span>
                        <p className="text-xs mt-1 truncate">{badge.badge_name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma transação ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <Card key={tx.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{tx.description || tx.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className={cn(
                          'font-bold',
                          tx.amount > 0 ? 'text-success' : 'text-destructive'
                        )}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da conta
        </Button>
      </div>
    </AppLayout>
  );
}
