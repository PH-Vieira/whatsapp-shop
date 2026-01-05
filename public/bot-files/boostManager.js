/**
 * Gerenciador de Boosts de XP
 * Coloque este arquivo em: src/lib/boostManager.js
 * 
 * Este módulo gerencia os boosts de XP dos usuários.
 */

const { supabase } = require('./supabase');

/**
 * Normaliza o número do WhatsApp
 */
function normalizeNumber(input) {
    let cleaned = String(input || '').replace(/\D/g, '');
    cleaned = cleaned.replace(/^(55)+/, '55');
    if (!cleaned.startsWith('55')) cleaned = '55' + cleaned;
    return cleaned;
}

/**
 * Busca o multiplicador de XP ativo de um usuário
 * @param {string} whatsappNumber - Número do WhatsApp
 * @returns {Promise<number>} - Multiplicador ativo (1.0 se não houver boost)
 */
async function getUserXPMultiplier(whatsappNumber) {
    const cleanNumber = normalizeNumber(whatsappNumber);
    
    const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('whatsapp_number', cleanNumber)
        .maybeSingle();
    
    if (!user) return 1.0;
    
    const now = new Date().toISOString();
    
    // Busca boosts ativos de XP
    const { data: activeBoosts, error } = await supabase
        .from('user_active_boosts')
        .select('multiplier')
        .eq('user_id', user.id)
        .eq('boost_type', 'xp')
        .gt('expires_at', now);
    
    if (error || !activeBoosts || activeBoosts.length === 0) {
        return 1.0;
    }
    
    // Retorna o maior multiplicador ativo (não acumula)
    const maxMultiplier = Math.max(...activeBoosts.map(b => parseFloat(b.multiplier)));
    console.log(`[Boost] Multiplicador ativo para ${cleanNumber}: ${maxMultiplier}x`);
    
    return maxMultiplier;
}

/**
 * Ativa um boost de XP
 * @param {string} whatsappNumber - Número do WhatsApp
 * @param {string} productId - ID do produto (boost)
 * @param {number} multiplier - Multiplicador (ex: 1.5, 2.0, 3.0)
 * @param {number} durationHours - Duração em horas
 */
async function activateBoost(whatsappNumber, productId, multiplier, durationHours) {
    const cleanNumber = normalizeNumber(whatsappNumber);
    
    const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('whatsapp_number', cleanNumber)
        .maybeSingle();
    
    if (!user) return { error: 'Usuário não encontrado' };
    
    // Verifica se o usuário possui o item
    const { data: userItem } = await supabase
        .from('user_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();
    
    if (!userItem) return { error: 'Você não possui este item' };
    
    // Calcula expiração
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);
    
    // Insere o boost ativo
    const { error } = await supabase
        .from('user_active_boosts')
        .insert({
            user_id: user.id,
            product_id: productId,
            boost_type: 'xp',
            multiplier: multiplier,
            expires_at: expiresAt.toISOString()
        });
    
    if (error) {
        console.error('[Boost] Erro ao ativar boost:', error);
        return { error: 'Erro ao ativar boost' };
    }
    
    // Remove o item do inventário (boost é consumível)
    await supabase
        .from('user_items')
        .delete()
        .eq('id', userItem.id);
    
    console.log(`[Boost] ${multiplier}x XP ativado para ${cleanNumber} (expira em ${durationHours}h)`);
    return { success: true, expiresAt };
}

/**
 * Lista boosts ativos do usuário
 */
async function listActiveBoosts(whatsappNumber) {
    const cleanNumber = normalizeNumber(whatsappNumber);
    
    const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('whatsapp_number', cleanNumber)
        .maybeSingle();
    
    if (!user) return [];
    
    const now = new Date().toISOString();
    
    const { data } = await supabase
        .from('user_active_boosts')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', now)
        .order('expires_at', { ascending: true });
    
    return data || [];
}

/**
 * Lista boosts no inventário (não ativados)
 */
async function listInventoryBoosts(whatsappNumber) {
    const cleanNumber = normalizeNumber(whatsappNumber);
    
    const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('whatsapp_number', cleanNumber)
        .maybeSingle();
    
    if (!user) return [];
    
    const { data } = await supabase
        .from('user_items')
        .select(`
            product_id,
            products:product_id (
                id,
                name,
                description,
                category
            )
        `)
        .eq('user_id', user.id);
    
    // Filtra apenas boosts
    return (data || []).filter(item => 
        item.products && item.products.category === 'boost'
    ).map(item => ({
        productId: item.product_id,
        name: item.products.name,
        description: item.products.description,
        ...parseBoostFromName(item.products.name)
    }));
}

/**
 * Extrai multiplicador e duração do nome do produto
 * Ex: "Boost XP 2x (24h)" -> { multiplier: 2.0, durationHours: 24 }
 */
function parseBoostFromName(name) {
    const multiplierMatch = name.match(/([\d.]+)x/);
    const durationMatch = name.match(/\((\d+)h\)/);
    
    return {
        multiplier: multiplierMatch ? parseFloat(multiplierMatch[1]) : 1.5,
        durationHours: durationMatch ? parseInt(durationMatch[1]) : 1
    };
}

/**
 * Limpa boosts expirados (pode rodar periodicamente)
 */
async function cleanupExpiredBoosts() {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
        .from('user_active_boosts')
        .delete()
        .lt('expires_at', now)
        .select();
    
    if (!error && data && data.length > 0) {
        console.log(`[Boost] ${data.length} boosts expirados removidos`);
    }
}

/**
 * Formata tempo restante de um boost
 */
function formatTimeRemaining(expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    
    if (diffMs <= 0) return 'Expirado';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
}

module.exports = {
    getUserXPMultiplier,
    activateBoost,
    listActiveBoosts,
    listInventoryBoosts,
    parseBoostFromName,
    cleanupExpiredBoosts,
    formatTimeRemaining
};
