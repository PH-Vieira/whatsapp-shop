import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/safeClient';
import { Loader2, Smile, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface EmojiSelectorProps {
  userId: string;
  onUpdate?: () => void;
}

interface UserEmoji {
  productId: string;
  emoji: string;
  name: string;
}

export function EmojiSelector({ userId, onUpdate }: EmojiSelectorProps) {
  const [ownedEmojis, setOwnedEmojis] = useState<UserEmoji[]>([]);
  const [activeEmojiProductId, setActiveEmojiProductId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadEmojis();
  }, [userId]);

  const loadEmojis = async () => {
    setIsLoading(true);
    
    // Busca emojis comprados
    const { data: items } = await supabase
      .from('user_items')
      .select('product_id, product:products(id, name, category, image_url)')
      .eq('user_id', userId);
    
    const emojiItems = (items || [])
      .filter((item: any) => item.product?.category === 'emoji')
      .map((item: any) => ({
        productId: item.product_id,
        name: item.product.name,
        emoji: extractEmojiFromName(item.product.name)
      }));
    
    setOwnedEmojis(emojiItems);
    
    // Busca emoji ativo atual
    const { data: activeEmoji } = await supabase
      .from('user_active_emojis')
      .select('product_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    
    setActiveEmojiProductId(activeEmoji?.product_id || null);
    setIsLoading(false);
  };

  const extractEmojiFromName = (name: string): string => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F18E}]|[\u{3030}]|[\u{2B55}]|[\u{1F201}]|[\u{1F21A}]|[\u{1F22F}]|[\u{1F232}-\u{1F236}]|[\u{1F238}-\u{1F23A}]|[\u{1F250}-\u{1F251}]/gu;
    const matches = name.match(emojiRegex);
    return matches ? matches[0] : '❓';
  };

  const handleSelectEmoji = async (productId: string, emoji: string) => {
    setIsSaving(true);
    
    // Desativa todos os emojis primeiro
    await supabase
      .from('user_active_emojis')
      .update({ is_active: false })
      .eq('user_id', userId);
    
    if (productId === activeEmojiProductId) {
      // Se clicou no ativo, apenas desativa
      setActiveEmojiProductId(null);
      toast.success('Reação desativada');
    } else {
      // Ativa o novo emoji (upsert)
      const { error } = await supabase
        .from('user_active_emojis')
        .upsert({
          user_id: userId,
          product_id: productId,
          emoji: emoji,
          is_active: true
        }, {
          onConflict: 'user_id,product_id'
        });
      
      if (error) {
        console.error('Erro ao ativar emoji:', error);
        toast.error('Erro ao ativar reação');
      } else {
        setActiveEmojiProductId(productId);
        toast.success(`Reação ${emoji} ativada!`);
      }
    }
    
    setIsSaving(false);
    onUpdate?.();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (ownedEmojis.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Smile className="w-4 h-4 text-primary" />
            Reação do Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            Você não possui reações. Compre na loja para o bot reagir às suas mensagens!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Smile className="w-4 h-4 text-primary" />
          Reação do Bot
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-3">
          Escolha uma reação para o bot usar nas suas mensagens
        </p>
        <div className="flex flex-wrap gap-2">
          {ownedEmojis.map((item) => (
            <Button
              key={item.productId}
              variant={activeEmojiProductId === item.productId ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'text-xl h-10 w-10 p-0 relative',
                activeEmojiProductId === item.productId && 'ring-2 ring-primary ring-offset-2'
              )}
              onClick={() => handleSelectEmoji(item.productId, item.emoji)}
              disabled={isSaving}
            >
              {item.emoji}
              {activeEmojiProductId === item.productId && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </Button>
          ))}
        </div>
        {activeEmojiProductId && (
          <p className="text-xs text-success mt-2">
            ✓ O bot vai reagir às suas mensagens com {ownedEmojis.find(e => e.productId === activeEmojiProductId)?.emoji}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
