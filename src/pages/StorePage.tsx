import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProductCard } from '@/components/ui/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import type { Product, UserItem } from '@/lib/types';

const categories = [
  { value: 'all', label: 'Todos', emoji: '✨' },
  { value: 'avatar', label: 'Avatares', emoji: '🎭' },
  { value: 'badge', label: 'Badges', emoji: '🏅' },
  { value: 'frame', label: 'Molduras', emoji: '🖼️' },
  { value: 'title', label: 'Títulos', emoji: '📛' },
  { value: 'emoji', label: 'Reações', emoji: '💬' },
  { value: 'boost', label: 'Boosts', emoji: '⚡' },
  { value: 'special', label: 'Especiais', emoji: '🌟' },
];

export default function StorePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [userItems, setUserItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    if (user) loadUserItems();
  }, [user]);

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    setProducts((data || []) as Product[]);
    setIsLoading(false);
  };

  const loadUserItems = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_items')
      .select('product_id')
      .eq('user_id', user.id);
    
    setUserItems((data || []).map((item: UserItem) => item.product_id));
  };

  const handleBuy = async (product: Product) => {
    if (!user) return;
    
    if (user.coins < product.price) {
      toast.error('Coins insuficientes! 💰');
      return;
    }

    setBuying(product.id);

    try {
      // Deduct coins
      const { error: updateError } = await supabase
        .from('users')
        .update({ coins: user.coins - product.price })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Add item to inventory
      const { error: itemError } = await supabase
        .from('user_items')
        .insert({ user_id: user.id, product_id: product.id });

      if (itemError) throw itemError;

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: -product.price,
        type: 'purchase',
        description: `Comprou: ${product.name}`,
        reference_id: product.id,
      });

      // Update stock if limited
      if (product.is_limited && product.stock) {
        await supabase
          .from('products')
          .update({ stock: product.stock - 1 })
          .eq('id', product.id);
      }

      setUserItems([...userItems, product.id]);
      toast.success(`${product.name} adquirido! 🎉`);
      
      // Refresh user data
      window.location.reload();
    } catch (error) {
      console.error('Erro ao comprar:', error);
      toast.error('Erro ao processar compra');
    } finally {
      setBuying(null);
    }
  };

  const filteredProducts = category === 'all' 
    ? products 
    : products.filter(p => p.category === category);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="animate-slide-down">
          <h1 className="text-2xl font-display font-bold">Loja de Cosméticos 🛍️</h1>
          <p className="text-muted-foreground">Personalize seu perfil com itens exclusivos!</p>
        </div>

        <Tabs value={category} onValueChange={setCategory} className="animate-slide-up">
          <TabsList className="w-full flex-wrap h-auto gap-2 bg-transparent p-0">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat.value} 
                value={cat.value}
                className="flex-1 min-w-[80px] data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground"
              >
                <span className="mr-1">{cat.emoji}</span>
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-4">🏪</p>
            <p>Nenhum produto encontrado nesta categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                owned={userItems.includes(product.id)}
                onBuy={() => handleBuy(product)}
                disabled={buying === product.id || (user?.coins || 0) < product.price}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
