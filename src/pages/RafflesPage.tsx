import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RaffleCard } from '@/components/ui/RaffleCard';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import type { Raffle, RaffleEntry } from '@/lib/types';

export default function RafflesPage() {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [userEntries, setUserEntries] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'ended'>('active');
  const [participating, setParticipating] = useState<string | null>(null);

  useEffect(() => {
    loadRaffles();
  }, [user]);

  const loadRaffles = async () => {
    const { data: rafflesData } = await supabase
      .from('raffles')
      .select('*, winner:users!raffles_winner_id_fkey(*)')
      .order('ends_at', { ascending: true });

    setRaffles((rafflesData || []) as Raffle[]);

    // Load entry counts
    const { data: entries } = await supabase
      .from('raffle_entries')
      .select('raffle_id, entries_count, user_id');

    const counts: Record<string, number> = {};
    const userEnts: Record<string, number> = {};

    (entries || []).forEach((entry: RaffleEntry) => {
      counts[entry.raffle_id] = (counts[entry.raffle_id] || 0) + entry.entries_count;
      if (user && entry.user_id === user.id) {
        userEnts[entry.raffle_id] = entry.entries_count;
      }
    });

    setEntryCounts(counts);
    setUserEntries(userEnts);
    setIsLoading(false);
  };

  const handleParticipate = async (raffle: Raffle) => {
    if (!user) return;

    if (raffle.entry_cost > 0 && user.coins < raffle.entry_cost) {
      toast.error('Coins insuficientes! 💰');
      return;
    }

    const currentEntries = userEntries[raffle.id] || 0;
    // null = unlimited entries, otherwise check limit
    if (raffle.max_entries_per_user !== null && currentEntries >= raffle.max_entries_per_user) {
      toast.error('Você já atingiu o limite de participações!');
      return;
    }

    setParticipating(raffle.id);

    try {
      // Deduct coins if needed
      if (raffle.entry_cost > 0) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ coins: user.coins - raffle.entry_cost })
          .eq('id', user.id);

        if (updateError) throw updateError;

        // Record transaction
        await supabase.from('transactions').insert({
          user_id: user.id,
          amount: -raffle.entry_cost,
          type: 'raffle_entry',
          description: `Participou: ${raffle.title}`,
          reference_id: raffle.id,
        });
      }

      // Add or update entry
      const existing = await supabase
        .from('raffle_entries')
        .select('*')
        .eq('raffle_id', raffle.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing.data) {
        await supabase
          .from('raffle_entries')
          .update({ entries_count: currentEntries + 1 })
          .eq('id', existing.data.id);
      } else {
        await supabase
          .from('raffle_entries')
          .insert({ raffle_id: raffle.id, user_id: user.id, entries_count: 1 });
      }

      setUserEntries({ ...userEntries, [raffle.id]: currentEntries + 1 });
      setEntryCounts({ ...entryCounts, [raffle.id]: (entryCounts[raffle.id] || 0) + 1 });
      
      toast.success('Participação confirmada! 🎉 Boa sorte!');
      
      if (raffle.entry_cost > 0) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Erro ao participar:', error);
      toast.error('Erro ao processar participação');
    } finally {
      setParticipating(null);
    }
  };

  const activeRaffles = raffles.filter(r => r.status === 'active' && new Date(r.ends_at) > new Date());
  const endedRaffles = raffles.filter(r => r.status === 'ended' || new Date(r.ends_at) <= new Date());

  const displayedRaffles = tab === 'active' ? activeRaffles : endedRaffles;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="animate-slide-down">
          <h1 className="text-2xl font-display font-bold">Sorteios 🎁</h1>
          <p className="text-muted-foreground">Participe e ganhe prêmios incríveis!</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'ended')} className="animate-slide-up">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="data-[state=active]:gradient-accent data-[state=active]:text-accent-foreground">
              🎯 Ativos ({activeRaffles.length})
            </TabsTrigger>
            <TabsTrigger value="ended" className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              🏆 Encerrados ({endedRaffles.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : displayedRaffles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-4">{tab === 'active' ? '🎰' : '📜'}</p>
            <p>{tab === 'active' ? 'Nenhum sorteio ativo no momento' : 'Nenhum sorteio encerrado'}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 animate-fade-in">
            {displayedRaffles.map(raffle => (
              <RaffleCard
                key={raffle.id}
                raffle={raffle}
                participantCount={entryCounts[raffle.id] || 0}
                userEntries={userEntries[raffle.id] || 0}
                onParticipate={() => handleParticipate(raffle)}
                disabled={participating === raffle.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
