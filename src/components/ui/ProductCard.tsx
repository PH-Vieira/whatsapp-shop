import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CoinBadge } from './CoinBadge';
import { ShoppingCart, Check, Sparkles } from 'lucide-react';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  owned?: boolean;
  onBuy?: () => void;
  disabled?: boolean;
}

const categoryEmojis: Record<string, string> = {
  avatar: '🎭',
  badge: '🏅',
  frame: '🖼️',
  title: '📛',
  special: '✨',
  emoji: '💬',
  boost: '⚡',
};

const rarityColors: Record<string, string> = {
  common: 'border-muted',
  uncommon: 'border-success',
  rare: 'border-info',
  epic: 'border-primary',
  legendary: 'border-golden',
};

export function ProductCard({ product, owned, onBuy, disabled }: ProductCardProps) {
  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-soft',
      'border-2',
      rarityColors[product.rarity] || rarityColors.common,
      owned && 'opacity-75'
    )}>
      <div className="relative aspect-square bg-muted/50 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl">{categoryEmojis[product.category]}</span>
        )}
        
        {product.is_limited && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Limitado
          </div>
        )}

        {product.rarity !== 'common' && (
          <div className={cn(
            'absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold capitalize',
            product.rarity === 'uncommon' && 'bg-success text-success-foreground',
            product.rarity === 'rare' && 'bg-info text-info-foreground',
            product.rarity === 'epic' && 'bg-primary text-primary-foreground',
            product.rarity === 'legendary' && 'bg-golden text-golden-foreground',
          )}>
            {product.rarity}
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <h3 className="font-display font-semibold text-sm truncate">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {product.description}
          </p>
        )}
      </CardContent>

      <CardFooter className="p-3 pt-0 flex items-center justify-between">
        <CoinBadge amount={product.price} size="sm" />
        
        {owned ? (
          <Button size="sm" variant="secondary" disabled className="gap-1">
            <Check className="w-4 h-4" />
            Obtido
          </Button>
        ) : (
          <Button 
            size="sm" 
            onClick={onBuy}
            disabled={disabled}
            className="gap-1 gradient-primary text-primary-foreground border-0"
          >
            <ShoppingCart className="w-4 h-4" />
            Comprar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
