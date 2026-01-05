import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Users, ShoppingBag, Gift, Trash2, Edit, Coins, Ban, Trophy, Dices } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User, Product, Raffle } from '@/lib/types';
import { Navigate } from 'react-router-dom';

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [raffleDialogOpen, setRaffleDialogOpen] = useState(false);
  const [coinsDialogOpen, setCoinsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [coinsAmount, setCoinsAmount] = useState('');

  // New product form
  const [newProduct, setNewProduct] = useState<{
    name: string;
    description: string;
    category: 'avatar' | 'badge' | 'frame' | 'title' | 'special' | 'emoji' | 'boost';
    price: number;
    image_url: string;
    rarity: string;
    is_limited: boolean;
    stock: number | null;
  }>({
    name: '',
    description: '',
    category: 'avatar',
    price: 0,
    image_url: '',
    rarity: 'common',
    is_limited: false,
    stock: null,
  });

  // New raffle form
  const [newRaffle, setNewRaffle] = useState<{
    title: string;
    description: string;
    prize_description: string;
    prize_type: 'virtual' | 'real' | 'mixed';
    prize_image_url: string;
    entry_cost: number;
    max_entries_per_user: number | null;
    unlimited_entries: boolean;
    ends_at: string;
    notification_group: string;
  }>({
    title: '',
    description: '',
    prize_description: '',
    prize_type: 'virtual',
    prize_image_url: '',
    entry_cost: 0,
    max_entries_per_user: 1,
    unlimited_entries: false,
    ends_at: '',
    notification_group: '',
  });

  useEffect(() => {
    if (user?.is_admin) loadData();
  }, [user]);

  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  const loadData = async () => {
    const [usersRes, productsRes, rafflesRes] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('raffles').select('*').order('created_at', { ascending: false }),
    ]);

    setUsers((usersRes.data || []) as User[]);
    setProducts((productsRes.data || []) as Product[]);
    setRaffles((rafflesRes.data || []) as Raffle[]);
    setIsLoading(false);
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || newProduct.price < 0) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const { error } = await supabase.from('products').insert({
      ...newProduct,
      stock: newProduct.is_limited ? newProduct.stock : null,
    });

    if (error) {
      toast.error('Erro ao criar produto');
      return;
    }

    toast.success('Produto criado com sucesso!');
    setProductDialogOpen(false);
    setNewProduct({
      name: '',
      description: '',
      category: 'avatar',
      price: 0,
      image_url: '',
      rarity: 'common',
      is_limited: false,
      stock: null,
    });
    loadData();
  };

  const handleCreateRaffle = async () => {
    if (!newRaffle.title || !newRaffle.prize_description || !newRaffle.ends_at) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    // Convert local datetime to ISO string with timezone
    const endsAtDate = new Date(newRaffle.ends_at);
    const endsAtISO = endsAtDate.toISOString();

    const { unlimited_entries, notification_group, ...raffleData } = newRaffle;
    
    const { error } = await supabase.from('raffles').insert({
      ...raffleData,
      ends_at: endsAtISO,
      max_entries_per_user: unlimited_entries ? null : raffleData.max_entries_per_user,
      notification_group: notification_group || null,
    });

    if (error) {
      toast.error('Erro ao criar sorteio');
      return;
    }

    toast.success('Sorteio criado com sucesso!');
    setRaffleDialogOpen(false);
    setNewRaffle({
      title: '',
      description: '',
      prize_description: '',
      prize_type: 'virtual',
      prize_image_url: '',
      entry_cost: 0,
      max_entries_per_user: 1,
      unlimited_entries: false,
      ends_at: '',
      notification_group: '',
    });
    loadData();
  };

  const handleAddCoins = async () => {
    if (!selectedUser || !coinsAmount) return;

    const amount = parseInt(coinsAmount);
    const newCoins = selectedUser.coins + amount;

    const { error } = await supabase
      .from('users')
      .update({ coins: newCoins })
      .eq('id', selectedUser.id);

    if (error) {
      toast.error('Erro ao atualizar coins');
      return;
    }

    await supabase.from('transactions').insert({
      user_id: selectedUser.id,
      amount,
      type: 'admin',
      description: amount > 0 ? 'Coins adicionados pelo admin' : 'Coins removidos pelo admin',
    });

    toast.success(`${amount > 0 ? 'Adicionados' : 'Removidos'} ${Math.abs(amount)} coins`);
    setCoinsDialogOpen(false);
    setSelectedUser(null);
    setCoinsAmount('');
    loadData();
  };

  const handleToggleBan = async (targetUser: User) => {
    const { error } = await supabase
      .from('users')
      .update({ is_banned: !targetUser.is_banned })
      .eq('id', targetUser.id);

    if (error) {
      toast.error('Erro ao atualizar status');
      return;
    }

    toast.success(targetUser.is_banned ? 'Usuário desbanido' : 'Usuário banido');
    loadData();
  };

  const handleDeleteProduct = async (productId: string) => {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      toast.error('Erro ao deletar produto');
      return;
    }
    toast.success('Produto deletado');
    loadData();
  };

  const handleDrawWinner = async (raffle: Raffle) => {
    // Fetch all entries for this raffle
    const { data: entries, error: entriesError } = await supabase
      .from('raffle_entries')
      .select('user_id, entries_count')
      .eq('raffle_id', raffle.id);

    if (entriesError || !entries || entries.length === 0) {
      toast.error('Nenhum participante neste sorteio!');
      return;
    }

    // Create weighted pool based on entries_count
    const weightedPool: string[] = [];
    for (const entry of entries) {
      for (let i = 0; i < entry.entries_count; i++) {
        weightedPool.push(entry.user_id);
      }
    }

    // Pick random winner
    const winnerIndex = Math.floor(Math.random() * weightedPool.length);
    const winnerId = weightedPool[winnerIndex];

    // Update raffle with winner
    const { error: updateError } = await supabase
      .from('raffles')
      .update({ winner_id: winnerId, status: 'ended' })
      .eq('id', raffle.id);

    if (updateError) {
      toast.error('Erro ao registrar vencedor');
      return;
    }

    // Get winner name
    const { data: winner } = await supabase
      .from('users')
      .select('name')
      .eq('id', winnerId)
      .single();

    const winnerName = winner?.name || 'Usuário';
    toast.success(`🎉 Vencedor: ${winnerName}`);

    // Send notification to group if configured
    if (raffle.notification_group) {
      try {
        const { error: notifyError } = await supabase.functions.invoke('send-raffle-result', {
          body: {
            groupNumber: raffle.notification_group,
            raffleTitle: raffle.title,
            winnerName: winnerName,
          },
        });

        if (notifyError) {
          console.error('Notification error:', notifyError);
          toast.error('Erro ao enviar notificação para o grupo');
        } else {
          toast.success('Resultado enviado para o grupo!');
        }
      } catch (err) {
        console.error('Failed to notify group:', err);
      }
    }

    loadData();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="animate-slide-down">
          <h1 className="text-2xl font-display font-bold">Painel Admin ⚙️</h1>
          <p className="text-muted-foreground">Gerencie a lojinha</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="users" className="animate-fade-in">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-1" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="products">
                <ShoppingBag className="w-4 h-4 mr-1" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="raffles">
                <Gift className="w-4 h-4 mr-1" />
                Sorteios
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-4 space-y-3">
              {users.map(u => (
                <Card key={u.id} className={cn(u.is_banned && 'opacity-50')}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{u.name}</p>
                      <p className="text-sm text-muted-foreground">{u.whatsapp_number}</p>
                      <p className="text-xs">Lv.{u.level} | {u.coins} coins</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedUser(u); setCoinsDialogOpen(true); }}
                      >
                        <Coins className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={u.is_banned ? 'default' : 'destructive'}
                        onClick={() => handleToggleBan(u)}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="mt-4 space-y-3">
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Produto</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome *</Label>
                      <Input 
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea 
                        value={newProduct.description}
                        onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Categoria *</Label>
                        <Select 
                          value={newProduct.category}
                          onValueChange={v => setNewProduct({...newProduct, category: v as Product['category']})}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="avatar">Avatar</SelectItem>
                            <SelectItem value="badge">Badge</SelectItem>
                            <SelectItem value="frame">Moldura</SelectItem>
                            <SelectItem value="title">Título</SelectItem>
                            <SelectItem value="emoji">Reação</SelectItem>
                            <SelectItem value="boost">Boost</SelectItem>
                            <SelectItem value="special">Especial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Raridade</Label>
                        <Select 
                          value={newProduct.rarity}
                          onValueChange={v => setNewProduct({...newProduct, rarity: v})}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="common">Comum</SelectItem>
                            <SelectItem value="uncommon">Incomum</SelectItem>
                            <SelectItem value="rare">Raro</SelectItem>
                            <SelectItem value="epic">Épico</SelectItem>
                            <SelectItem value="legendary">Lendário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Preço (Coins) *</Label>
                      <Input 
                        type="number"
                        value={newProduct.price}
                        onChange={e => setNewProduct({...newProduct, price: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label>URL da Imagem</Label>
                      <Input 
                        value={newProduct.image_url}
                        onChange={e => setNewProduct({...newProduct, image_url: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={newProduct.is_limited}
                        onCheckedChange={v => setNewProduct({...newProduct, is_limited: v})}
                      />
                      <Label>Item Limitado</Label>
                    </div>
                    {newProduct.is_limited && (
                      <div>
                        <Label>Estoque</Label>
                        <Input 
                          type="number"
                          value={newProduct.stock || ''}
                          onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value) || null})}
                        />
                      </div>
                    )}
                    <Button className="w-full" onClick={handleCreateProduct}>
                      Criar Produto
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {products.map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{p.name}</p>
                      <p className="text-sm text-muted-foreground">{p.category} | {p.price} coins</p>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(p.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Raffles Tab */}
            <TabsContent value="raffles" className="mt-4 space-y-3">
              <Dialog open={raffleDialogOpen} onOpenChange={setRaffleDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full gradient-accent">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Sorteio
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Sorteio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Título *</Label>
                      <Input 
                        value={newRaffle.title}
                        onChange={e => setNewRaffle({...newRaffle, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Descrição do Prêmio *</Label>
                      <Textarea 
                        value={newRaffle.prize_description}
                        onChange={e => setNewRaffle({...newRaffle, prize_description: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de Prêmio</Label>
                        <Select 
                          value={newRaffle.prize_type}
                          onValueChange={v => setNewRaffle({...newRaffle, prize_type: v as Raffle['prize_type']})}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="virtual">Virtual</SelectItem>
                            <SelectItem value="real">Real</SelectItem>
                            <SelectItem value="mixed">Misto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Custo (Coins)</Label>
                        <Input 
                          type="number"
                          value={newRaffle.entry_cost}
                          onChange={e => setNewRaffle({...newRaffle, entry_cost: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                      <div>
                        <Label className="text-sm font-medium">Participação Ilimitada</Label>
                        <p className="text-xs text-muted-foreground">
                          Quem tem mais moedas pode participar mais vezes
                        </p>
                      </div>
                      <Switch
                        checked={newRaffle.unlimited_entries}
                        onCheckedChange={checked => setNewRaffle({...newRaffle, unlimited_entries: checked})}
                      />
                    </div>
                    {!newRaffle.unlimited_entries && (
                      <div>
                        <Label>Máximo de Participações por Usuário</Label>
                        <Input 
                          type="number"
                          min={1}
                          value={newRaffle.max_entries_per_user ?? 1}
                          onChange={e => setNewRaffle({...newRaffle, max_entries_per_user: parseInt(e.target.value) || 1})}
                        />
                      </div>
                    )}
                    <div>
                      <Label>Encerra em *</Label>
                      <Input 
                        type="datetime-local"
                        value={newRaffle.ends_at}
                        onChange={e => setNewRaffle({...newRaffle, ends_at: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Grupo para Notificação (opcional)</Label>
                      <Input 
                        placeholder="ID do grupo WhatsApp (ex: 120363...)"
                        value={newRaffle.notification_group}
                        onChange={e => setNewRaffle({...newRaffle, notification_group: e.target.value})}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        O bot enviará o resultado neste grupo
                      </p>
                    </div>
                    <Button className="w-full" onClick={handleCreateRaffle}>
                      Criar Sorteio
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {raffles.map(r => {
                const isEnded = r.status === 'ended' || new Date(r.ends_at) <= new Date();
                const canDraw = isEnded && !r.winner_id;
                
                return (
                  <Card key={r.id} className={cn(r.winner_id && 'border-golden/50 bg-golden/5')}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-bold">{r.title}</p>
                          <p className="text-sm text-muted-foreground">{r.prize_description}</p>
                          <p className="text-xs mt-1">
                            {r.status === 'ended' ? '🔒 Encerrado' : '🎯 Ativo'} | {r.entry_cost} coins
                          </p>
                          {r.winner_id && (
                            <p className="text-sm text-golden font-medium mt-2 flex items-center gap-1">
                              <Trophy className="w-4 h-4" />
                              Vencedor definido
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {canDraw && (
                            <Button 
                              size="sm" 
                              className="gradient-primary"
                              onClick={() => handleDrawWinner(r)}
                            >
                              <Dices className="w-4 h-4 mr-1" />
                              Sortear
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}

        {/* Coins Dialog */}
        <Dialog open={coinsDialogOpen} onOpenChange={setCoinsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerenciar Coins - {selectedUser?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Coins atuais: <strong>{selectedUser?.coins}</strong></p>
              <div>
                <Label>Quantidade (negativo para remover)</Label>
                <Input 
                  type="number"
                  value={coinsAmount}
                  onChange={e => setCoinsAmount(e.target.value)}
                  placeholder="Ex: 100 ou -50"
                />
              </div>
              <Button className="w-full" onClick={handleAddCoins}>
                Aplicar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
