/**
 * Coin Manager - Sistema híbrido de aquisição de moedas
 * 
 * Funcionalidades:
 * 1. Moedas por mensagem (passivo)
 * 2. Recompensa diária com streaks
 * 3. Bônus por marcos de level
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase - use suas próprias credenciais
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// CONFIGURAÇÕES DO SISTEMA DE MOEDAS
// ============================================

const CONFIG = {
  // Moedas por mensagem
  MESSAGE_COINS: {
    MIN: 1,
    MAX: 3,
    CHANCE: 0.7, // 70% de chance de ganhar moedas
    COOLDOWN_SECONDS: 30
  },
  
  // Recompensa diária
  DAILY: {
    BASE_COINS: 50,
    STREAK_BONUS: 10, // +10 por dia de streak
    MAX_STREAK_BONUS: 200 // máximo de bônus por streak
  },
  
  // Marcos de level (level: coins)
  MILESTONES: {
    5: 100,
    10: 250,
    15: 400,
    20: 600,
    25: 850,
    30: 1100,
    40: 1500,
    50: 2000,
    75: 3500,
    100: 5000
  }
};

// Cache de cooldowns para moedas por mensagem
const messageCoinsCooldown = new Map();

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

function normalizeNumber(input) {
  if (!input) return null;
  let cleaned = String(input).replace(/\D/g, '');
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    const withoutCode = cleaned.slice(2);
    if (withoutCode.startsWith('55')) {
      cleaned = withoutCode;
    }
  }
  return cleaned;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================
// MOEDAS POR MENSAGEM
// ============================================

/**
 * Processa ganho de moedas por mensagem
 * @param {string} whatsappNumber - Número do usuário
 * @returns {Promise<{earned: boolean, amount: number, total: number}|null>}
 */
async function processMessageCoins(whatsappNumber) {
  const cleanNumber = normalizeNumber(whatsappNumber);
  if (!cleanNumber) return null;
  
  // Verificar cooldown
  const now = Date.now();
  const lastEarn = messageCoinsCooldown.get(cleanNumber) || 0;
  const cooldownMs = CONFIG.MESSAGE_COINS.COOLDOWN_SECONDS * 1000;
  
  if (now - lastEarn < cooldownMs) {
    return null; // Ainda em cooldown
  }
  
  // Chance de ganhar moedas
  if (Math.random() > CONFIG.MESSAGE_COINS.CHANCE) {
    return null; // Não ganhou desta vez
  }
  
  // Calcular moedas ganhas
  const coinsEarned = randomInt(CONFIG.MESSAGE_COINS.MIN, CONFIG.MESSAGE_COINS.MAX);
  
  // Atualizar cooldown
  messageCoinsCooldown.set(cleanNumber, now);
  
  // Buscar usuário e atualizar moedas
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, coins')
    .eq('whatsapp_number', cleanNumber)
    .single();
  
  if (fetchError || !user) {
    console.error('[CoinManager] Usuário não encontrado:', cleanNumber);
    return null;
  }
  
  const newTotal = user.coins + coinsEarned;
  
  // Atualizar moedas
  const { error: updateError } = await supabase
    .from('users')
    .update({ coins: newTotal })
    .eq('id', user.id);
  
  if (updateError) {
    console.error('[CoinManager] Erro ao atualizar moedas:', updateError);
    return null;
  }
  
  // Registrar transação
  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: coinsEarned,
    type: 'message_earn',
    description: 'Moedas ganhas por mensagem'
  });
  
  return {
    earned: true,
    amount: coinsEarned,
    total: newTotal
  };
}

// ============================================
// RECOMPENSA DIÁRIA
// ============================================

/**
 * Processa recompensa diária do usuário
 * @param {string} whatsappNumber - Número do usuário
 * @returns {Promise<{success: boolean, coins: number, streak: number, message: string}>}
 */
async function processDailyReward(whatsappNumber) {
  const cleanNumber = normalizeNumber(whatsappNumber);
  if (!cleanNumber) {
    return { success: false, coins: 0, streak: 0, message: '❌ Número inválido.' };
  }
  
  // Buscar usuário
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, coins, daily_streak, last_daily_claim')
    .eq('whatsapp_number', cleanNumber)
    .single();
  
  if (fetchError || !user) {
    return { success: false, coins: 0, streak: 0, message: '❌ Usuário não encontrado.' };
  }
  
  const now = new Date();
  const lastClaim = user.last_daily_claim ? new Date(user.last_daily_claim) : null;
  
  // Verificar se já coletou hoje
  if (lastClaim) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
    
    if (today.getTime() === lastClaimDay.getTime()) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const hoursLeft = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      return {
        success: false,
        coins: 0,
        streak: user.daily_streak,
        message: `⏰ Você já coletou hoje!\n\n🔥 Streak atual: ${user.daily_streak} dias\n⏳ Próxima coleta em: ~${hoursLeft}h`
      };
    }
  }
  
  // Calcular streak
  let newStreak = 1;
  if (lastClaim) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
    
    if (yesterdayStart.getTime() === lastClaimDay.getTime()) {
      // Coletou ontem, continua streak
      newStreak = user.daily_streak + 1;
    }
    // Se não coletou ontem, streak reseta para 1
  }
  
  // Calcular moedas
  const streakBonus = Math.min(
    (newStreak - 1) * CONFIG.DAILY.STREAK_BONUS,
    CONFIG.DAILY.MAX_STREAK_BONUS
  );
  const totalCoins = CONFIG.DAILY.BASE_COINS + streakBonus;
  const newBalance = user.coins + totalCoins;
  
  // Atualizar usuário
  const { error: updateError } = await supabase
    .from('users')
    .update({
      coins: newBalance,
      daily_streak: newStreak,
      last_daily_claim: now.toISOString()
    })
    .eq('id', user.id);
  
  if (updateError) {
    console.error('[CoinManager] Erro ao atualizar daily:', updateError);
    return { success: false, coins: 0, streak: 0, message: '❌ Erro ao processar recompensa.' };
  }
  
  // Registrar transação
  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: totalCoins,
    type: 'daily_reward',
    description: `Recompensa diária (streak: ${newStreak})`
  });
  
  // Mensagem de sucesso
  let message = `🎁 *RECOMPENSA DIÁRIA*\n\n`;
  message += `💰 Base: +${CONFIG.DAILY.BASE_COINS} moedas\n`;
  if (streakBonus > 0) {
    message += `🔥 Bônus streak: +${streakBonus} moedas\n`;
  }
  message += `━━━━━━━━━━━━━━━\n`;
  message += `✨ Total: *+${totalCoins} moedas*\n\n`;
  message += `🔥 Streak: ${newStreak} ${newStreak === 1 ? 'dia' : 'dias'}\n`;
  message += `💵 Saldo atual: ${newBalance} moedas`;
  
  if (newStreak >= 7) {
    message += `\n\n🏆 Incrível! ${newStreak} dias seguidos!`;
  }
  
  return {
    success: true,
    coins: totalCoins,
    streak: newStreak,
    message
  };
}

// ============================================
// MARCOS DE LEVEL
// ============================================

/**
 * Verifica e processa bônus de marco de level
 * @param {string} whatsappNumber - Número do usuário
 * @param {number} oldLevel - Level anterior
 * @param {number} newLevel - Novo level
 * @returns {Promise<{milestone: boolean, level: number, coins: number}|null>}
 */
async function checkLevelMilestone(whatsappNumber, oldLevel, newLevel) {
  // Se não subiu de level, retorna null
  if (newLevel <= oldLevel) return null;
  
  // Verificar se passou algum marco
  const milestoneLevels = Object.keys(CONFIG.MILESTONES).map(Number).sort((a, b) => a - b);
  
  let milestoneReached = null;
  for (const milestone of milestoneLevels) {
    if (oldLevel < milestone && newLevel >= milestone) {
      milestoneReached = milestone;
      // Não dá break para pegar o maior marco alcançado
    }
  }
  
  if (!milestoneReached) return null;
  
  const cleanNumber = normalizeNumber(whatsappNumber);
  const bonusCoins = CONFIG.MILESTONES[milestoneReached];
  
  // Buscar e atualizar usuário
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, coins')
    .eq('whatsapp_number', cleanNumber)
    .single();
  
  if (fetchError || !user) return null;
  
  const newBalance = user.coins + bonusCoins;
  
  const { error: updateError } = await supabase
    .from('users')
    .update({ coins: newBalance })
    .eq('id', user.id);
  
  if (updateError) return null;
  
  // Registrar transação
  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: bonusCoins,
    type: 'milestone_bonus',
    description: `Bônus por alcançar level ${milestoneReached}`
  });
  
  console.log(`[CoinManager] 🏆 ${cleanNumber} alcançou marco level ${milestoneReached}: +${bonusCoins} moedas`);
  
  return {
    milestone: true,
    level: milestoneReached,
    coins: bonusCoins
  };
}

// ============================================
// FUNÇÕES DE CONSULTA
// ============================================

/**
 * Retorna informações de moedas do usuário para o comando !moedas
 * @param {string} whatsappNumber - Número do usuário
 * @returns {Promise<string>}
 */
async function getCoinsInfo(whatsappNumber) {
  const cleanNumber = normalizeNumber(whatsappNumber);
  
  const { data: user, error } = await supabase
    .from('users')
    .select('coins, daily_streak, last_daily_claim, level')
    .eq('whatsapp_number', cleanNumber)
    .single();
  
  if (error || !user) {
    return '❌ Usuário não encontrado.';
  }
  
  // Verificar se pode coletar daily
  let canClaimDaily = true;
  let hoursUntilDaily = 0;
  
  if (user.last_daily_claim) {
    const now = new Date();
    const lastClaim = new Date(user.last_daily_claim);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
    
    if (today.getTime() === lastClaimDay.getTime()) {
      canClaimDaily = false;
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      hoursUntilDaily = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
    }
  }
  
  // Próximo marco
  const milestoneLevels = Object.keys(CONFIG.MILESTONES).map(Number).sort((a, b) => a - b);
  const nextMilestone = milestoneLevels.find(m => m > user.level);
  
  let message = `💰 *SUAS MOEDAS*\n\n`;
  message += `💵 Saldo: *${user.coins}* moedas\n`;
  message += `🔥 Streak: ${user.daily_streak} dias\n\n`;
  
  message += `📋 *Como ganhar moedas:*\n`;
  message += `• Envie mensagens (1-3 moedas)\n`;
  message += `• Use !daily para recompensa diária\n`;
  message += `• Alcance marcos de level\n\n`;
  
  if (canClaimDaily) {
    message += `✅ Recompensa diária disponível! Use *!daily*`;
  } else {
    message += `⏰ Próximo !daily em ~${hoursUntilDaily}h`;
  }
  
  if (nextMilestone) {
    message += `\n\n🎯 Próximo marco: Level ${nextMilestone} (+${CONFIG.MILESTONES[nextMilestone]} moedas)`;
  }
  
  return message;
}

/**
 * Retorna lista de marcos para o comando !marcos
 * @param {number} currentLevel - Level atual do usuário
 * @returns {string}
 */
function getMilestonesInfo(currentLevel = 0) {
  let message = `🏆 *MARCOS DE LEVEL*\n\n`;
  message += `Alcance estes níveis para ganhar bônus:\n\n`;
  
  const milestones = Object.entries(CONFIG.MILESTONES)
    .sort((a, b) => Number(a[0]) - Number(b[0]));
  
  for (const [level, coins] of milestones) {
    const levelNum = Number(level);
    const achieved = currentLevel >= levelNum;
    const icon = achieved ? '✅' : '⬜';
    message += `${icon} Level ${level}: +${coins} moedas\n`;
  }
  
  return message;
}

/**
 * Ranking de moedas
 * @param {number} limit - Quantidade de usuários
 * @returns {Promise<string>}
 */
async function getCoinsRanking(limit = 10) {
  const { data: users, error } = await supabase
    .from('users')
    .select('name, coins, level')
    .order('coins', { ascending: false })
    .limit(limit);
  
  if (error || !users?.length) {
    return '❌ Não foi possível carregar o ranking.';
  }
  
  const medals = ['🥇', '🥈', '🥉'];
  
  let message = `💰 *TOP ${limit} MOEDAS*\n\n`;
  
  users.forEach((user, index) => {
    const medal = medals[index] || `${index + 1}.`;
    message += `${medal} *${user.name}*\n`;
    message += `   💵 ${user.coins} moedas | Lv.${user.level}\n\n`;
  });
  
  return message;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Funções principais
  processMessageCoins,
  processDailyReward,
  checkLevelMilestone,
  
  // Funções de consulta
  getCoinsInfo,
  getMilestonesInfo,
  getCoinsRanking,
  
  // Utilitários
  normalizeNumber,
  
  // Configurações (para customização)
  CONFIG
};
