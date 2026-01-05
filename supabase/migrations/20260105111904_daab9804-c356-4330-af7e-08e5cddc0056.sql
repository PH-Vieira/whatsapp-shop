-- Inserir produtos de emoji na loja
INSERT INTO public.products (name, description, category, price, rarity, is_active, image_url) VALUES
('Reação ❤️', 'O bot reage com ❤️ às suas mensagens', 'emoji', 50, 'common', true, null),
('Reação 🔥', 'O bot reage com 🔥 às suas mensagens', 'emoji', 75, 'common', true, null),
('Reação 😂', 'O bot reage com 😂 às suas mensagens', 'emoji', 50, 'common', true, null),
('Reação 👍', 'O bot reage com 👍 às suas mensagens', 'emoji', 50, 'common', true, null),
('Reação ⭐', 'O bot reage com ⭐ às suas mensagens', 'emoji', 100, 'uncommon', true, null),
('Reação 💎', 'O bot reage com 💎 às suas mensagens', 'emoji', 200, 'rare', true, null),
('Reação 👑', 'O bot reage com 👑 às suas mensagens', 'emoji', 500, 'epic', true, null),
('Reação 🌟', 'O bot reage com 🌟 às suas mensagens', 'emoji', 300, 'rare', true, null);

-- Inserir produtos de boost na loja
INSERT INTO public.products (name, description, category, price, rarity, is_active, image_url) VALUES
('Boost XP 1.5x (1h)', 'Ganhe 50% mais XP por 1 hora', 'boost', 150, 'uncommon', true, null),
('Boost XP 2x (1h)', 'Ganhe 100% mais XP por 1 hora', 'boost', 300, 'rare', true, null),
('Boost XP 1.5x (24h)', 'Ganhe 50% mais XP por 24 horas', 'boost', 500, 'rare', true, null),
('Boost XP 2x (24h)', 'Ganhe 100% mais XP por 24 horas', 'boost', 1000, 'epic', true, null),
('Super Boost XP 3x (1h)', 'Ganhe 200% mais XP por 1 hora', 'boost', 750, 'epic', true, null),
('Mega Boost XP 3x (24h)', 'Ganhe 200% mais XP por 24 horas', 'boost', 2000, 'legendary', true, null);