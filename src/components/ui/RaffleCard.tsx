import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CoinBadge } from './CoinBadge';
import { Gift, Users, Clock, Trophy, Ticket } from 'lucide-react';
import type { Raffle } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface RaffleCardProps {
  raffle: Raffle;
  participantCount?: number;
  userEntries?: number;
  onParticipate?: () => void;
  disabled?: boolean;
}

const prizeTypeLabels: Record<string, { label: string; icon: string }> = {
  virtual: { label: 'Virtual', icon: '🎮' },
  real: { label: 'Real', icon: '📦' },
  mixed: { label: 'Misto', icon: '🎁' },
};

function formatTimeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Encerrado';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function RaffleCard({ raffle, participantCount = 0, userEntries = 0, onParticipate, disabled }: RaffleCardProps) {
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(raffle.ends_at));
  const isEnded = raffle.status === 'ended' || new Date(raffle.ends_at) <= new Date();
  const prizeType = prizeTypeLabels[raffle.prize_type];

  useEffect(() => {
    if (isEnded) return;
    
    const interval = setInterval(() => {
      setTimeLeft(formatTimeLeft(raffle.ends_at));
    }, 60000);

    return () => clearInterval(interval);
  }, [raffle.ends_at, isEnded]);

  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-300 hover:shadow-soft',
      isEnded ? 'opacity-75' : 'hover:scale-[1.01]'
    )}>
      <CardHeader className="p-0">
        <div className="relative h-32 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          {raffle.prize_image_url ? (
            <img 
              src={raffle.prize_image_url} 
              alt={raffle.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Gift className="w-16 h-16 text-primary animate-bounce-soft" />
          )}
          
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-card/90 text-xs font-medium flex items-center gap-1">
            <span>{prizeType.icon}</span>
            {prizeType.label}
          </div>

          {isEnded && raffle.winner && (
            <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <Trophy className="w-8 h-8 text-golden mx-auto mb-1" />
                <p className="text-sm font-bold">Vencedor: {raffle.winner.name}</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <h3 className="font-display font-bold text-lg">{raffle.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{raffle.prize_description}</p>
        
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{participantCount}</span>
          </div>
          <div className={cn(
            'flex items-center gap-1',
            isEnded ? 'text-muted-foreground' : 'text-accent font-medium'
          )}>
            <Clock className="w-4 h-4" />
            <span>{timeLeft}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        {raffle.entry_cost > 0 ? (
          <CoinBadge amount={raffle.entry_cost} size="sm" />
        ) : (
          <span className="text-success font-bold text-sm">Grátis!</span>
        )}
        
        {!isEnded && (
          <div className="flex items-center gap-2">
            {raffle.max_entries_per_user === null && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                ∞ ilimitado
              </span>
            )}
            <Button 
              onClick={onParticipate}
              disabled={disabled}
              className="gap-1 gradient-accent text-accent-foreground border-0"
            >
              <Ticket className="w-4 h-4" />
              {userEntries > 0 ? `${userEntries}x Participando` : 'Participar'}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
