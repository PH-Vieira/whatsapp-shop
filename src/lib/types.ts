export interface User {
  id: string;
  whatsapp_number: string;
  name: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  prestige: number;
  coins: number;
  is_admin: boolean;
  is_banned: boolean;
  equipped_avatar: string | null;
  equipped_frame: string | null;
  equipped_title: string | null;
  daily_streak: number;
  last_daily_claim: string | null;
  total_messages: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: 'avatar' | 'badge' | 'frame' | 'title' | 'special';
  price: number;
  image_url: string | null;
  rarity: string;
  is_active: boolean;
  is_limited: boolean;
  stock: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserItem {
  id: string;
  user_id: string;
  product_id: string;
  purchased_at: string;
  product?: Product;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_name: string;
  badge_icon: string;
  earned_at: string;
}

export interface Raffle {
  id: string;
  title: string;
  description: string | null;
  prize_description: string;
  prize_type: 'virtual' | 'real' | 'mixed';
  prize_image_url: string | null;
  entry_cost: number;
  max_entries_per_user: number | null;
  status: 'active' | 'ended' | 'cancelled';
  ends_at: string;
  winner_id: string | null;
  created_at: string;
  winner?: User;
}

export interface RaffleEntry {
  id: string;
  raffle_id: string;
  user_id: string;
  entries_count: number;
  entered_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}
