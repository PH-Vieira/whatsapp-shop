-- Enum para tipos de produtos
CREATE TYPE product_category AS ENUM ('avatar', 'badge', 'frame', 'title', 'special');

-- Enum para status de sorteio
CREATE TYPE raffle_status AS ENUM ('active', 'ended', 'cancelled');

-- Enum para tipo de prêmio
CREATE TYPE prize_type AS ENUM ('virtual', 'real', 'mixed');

-- Tabela de usuários (sincronizada com o bot)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Usuário',
  avatar_url TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  prestige INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  equipped_avatar TEXT,
  equipped_frame TEXT,
  equipped_title TEXT,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  last_daily_claim TIMESTAMP WITH TIME ZONE,
  total_messages INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de códigos de autenticação
CREATE TABLE public.auth_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de sessões ativas
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de produtos da loja
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category product_category NOT NULL,
  price INTEGER NOT NULL,
  image_url TEXT,
  rarity TEXT DEFAULT 'common',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_limited BOOLEAN NOT NULL DEFAULT false,
  stock INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens do usuário (inventário)
CREATE TABLE public.user_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Tabela de badges do usuário
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_name)
);

-- Tabela de sorteios
CREATE TABLE public.raffles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  prize_description TEXT NOT NULL,
  prize_type prize_type NOT NULL DEFAULT 'virtual',
  prize_image_url TEXT,
  entry_cost INTEGER NOT NULL DEFAULT 0,
  max_entries_per_user INTEGER DEFAULT 1,
  status raffle_status NOT NULL DEFAULT 'active',
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  winner_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de participações em sorteios
CREATE TABLE public.raffle_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entries_count INTEGER NOT NULL DEFAULT 1,
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(raffle_id, user_id)
);

-- Tabela de transações (histórico de coins)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para users (público pode ler para ranking)
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (true);

-- Políticas para auth_codes (apenas inserção pública para verificação)
CREATE POLICY "Auth codes can be inserted" ON public.auth_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth codes can be read for verification" ON public.auth_codes FOR SELECT USING (true);
CREATE POLICY "Auth codes can be updated" ON public.auth_codes FOR UPDATE USING (true);

-- Políticas para sessions
CREATE POLICY "Sessions can be managed" ON public.user_sessions FOR ALL USING (true);

-- Políticas para products (todos podem ver produtos ativos)
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (true);

-- Políticas para user_items
CREATE POLICY "User items are viewable" ON public.user_items FOR SELECT USING (true);
CREATE POLICY "User items can be inserted" ON public.user_items FOR INSERT WITH CHECK (true);

-- Políticas para user_badges
CREATE POLICY "Badges are viewable" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Badges can be inserted" ON public.user_badges FOR INSERT WITH CHECK (true);

-- Políticas para raffles
CREATE POLICY "Raffles are viewable by everyone" ON public.raffles FOR SELECT USING (true);
CREATE POLICY "Raffles can be managed" ON public.raffles FOR ALL USING (true);

-- Políticas para raffle_entries
CREATE POLICY "Entries are viewable" ON public.raffle_entries FOR SELECT USING (true);
CREATE POLICY "Entries can be inserted" ON public.raffle_entries FOR INSERT WITH CHECK (true);

-- Políticas para transactions
CREATE POLICY "Transactions are viewable" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Transactions can be inserted" ON public.transactions FOR INSERT WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_users_whatsapp ON public.users(whatsapp_number);
CREATE INDEX idx_users_level ON public.users(level DESC);
CREATE INDEX idx_users_coins ON public.users(coins DESC);
CREATE INDEX idx_auth_codes_number ON public.auth_codes(whatsapp_number);
CREATE INDEX idx_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_raffles_status ON public.raffles(status);
CREATE INDEX idx_transactions_user ON public.transactions(user_id);