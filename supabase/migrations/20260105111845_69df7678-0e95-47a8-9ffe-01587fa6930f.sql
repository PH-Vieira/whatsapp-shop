-- Adicionar novas categorias de produto: emoji e boost
ALTER TYPE public.product_category ADD VALUE IF NOT EXISTS 'emoji';
ALTER TYPE public.product_category ADD VALUE IF NOT EXISTS 'boost';

-- Criar tabela para emojis ativos dos usuários (reações automáticas)
CREATE TABLE IF NOT EXISTS public.user_active_emojis (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- Criar tabela para boosts ativos
CREATE TABLE IF NOT EXISTS public.user_active_boosts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    boost_type TEXT NOT NULL,
    multiplier DECIMAL(3,1) NOT NULL DEFAULT 1.5,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para user_active_emojis
ALTER TABLE public.user_active_emojis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active emojis"
ON public.user_active_emojis FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert active emojis"
ON public.user_active_emojis FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update active emojis"
ON public.user_active_emojis FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete active emojis"
ON public.user_active_emojis FOR DELETE
USING (true);

-- RLS para user_active_boosts
ALTER TABLE public.user_active_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active boosts"
ON public.user_active_boosts FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert active boosts"
ON public.user_active_boosts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update active boosts"
ON public.user_active_boosts FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete active boosts"
ON public.user_active_boosts FOR DELETE
USING (true);