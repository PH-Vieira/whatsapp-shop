/**
 * Handler de Reações de Emoji
 * Coloque este arquivo em: src/lib/emojiReactionHandler.js
 * 
 * Este módulo gerencia as reações automáticas do bot às mensagens
 * de usuários que compraram emojis na loja.
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
 * Busca os emojis ativos de um usuário
 * @param {string} whatsappNumber - Número do WhatsApp
 * @returns {Promise<string[]>} - Array de emojis ativos
 */
/**
 * Busca o emoji ativo de um usuário (apenas um por vez)
 * @param {string} whatsappNumber - Número do WhatsApp
 * @returns {Promise<string|null>} - Emoji ativo ou null
 */
async function getUserActiveEmoji(whatsappNumber) {
    const cleanNumber = normalizeNumber(whatsappNumber);
    
    // Primeiro, busca o usuário
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('whatsapp_number', cleanNumber)
        .maybeSingle();
    
    if (userError || !user) {
        return null;
    }
    
    // Busca emoji ativo (apenas um)
    const { data: activeEmoji, error } = await supabase
        .from('user_active_emojis')
        .select('emoji')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
    
    if (error) {
        console.error('[Emoji] Erro ao buscar emoji ativo:', error);
        return null;
    }
    
    return activeEmoji?.emoji || null;
}

/**
 * Ativa um emoji comprado pelo usuário
 * @param {string} whatsappNumber - Número do WhatsApp
 * @param {string} productId - ID do produto (emoji)
 * @param {string} emoji - O emoji a ser ativado (ex: '❤️')
 */
async function activateEmoji(whatsappNumber, productId, emoji) {
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
    
    // Ativa o emoji (upsert)
    const { error } = await supabase
        .from('user_active_emojis')
        .upsert({
            user_id: user.id,
            product_id: productId,
            emoji: emoji,
            is_active: true
        }, {
            onConflict: 'user_id,product_id'
        });
    
    if (error) {
        console.error('[Emoji] Erro ao ativar emoji:', error);
        return { error: 'Erro ao ativar emoji' };
    }
    
    console.log(`[Emoji] ${emoji} ativado para ${cleanNumber}`);
    return { success: true };
}

/**
 * Desativa um emoji
 */
async function deactivateEmoji(whatsappNumber, productId) {
    const cleanNumber = normalizeNumber(whatsappNumber);
    
    const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('whatsapp_number', cleanNumber)
        .maybeSingle();
    
    if (!user) return { error: 'Usuário não encontrado' };
    
    const { error } = await supabase
        .from('user_active_emojis')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('product_id', productId);
    
    if (error) {
        console.error('[Emoji] Erro ao desativar emoji:', error);
        return { error: 'Erro ao desativar emoji' };
    }
    
    return { success: true };
}

/**
 * Reage a uma mensagem com o emoji ativo do usuário
 * @param {object} sock - Instância do Baileys socket
 * @param {object} msg - Mensagem recebida
 * @param {string} emoji - Emoji para reagir
 */
async function reactToMessage(sock, msg, emoji) {
    if (!emoji) return;
    
    const chatId = msg.key.remoteJid;
    
    try {
        await sock.sendMessage(chatId, {
            react: {
                text: emoji,
                key: msg.key
            }
        });
        console.log(`[Emoji] Reagido com ${emoji}`);
    } catch (error) {
        console.error('[Emoji] Erro ao reagir:', error);
    }
}

/**
 * Extrai o número real do sender (funciona para grupos e privado)
 * Em grupos, pode vir como @lid, então precisamos resolver
 */
async function extractRealNumber(sock, msg) {
    const isGroup = msg.key.remoteJid?.endsWith('@g.us');
    let sender = isGroup ? msg.key.participant : msg.key.remoteJid;
    
    if (!sender) return null;
    
    // Se for @lid, tenta resolver para número real
    if (sender.includes('@lid')) {
        // Tenta pegar do participantAlt se disponível
        if (msg.key.participantAlt) {
            sender = msg.key.participantAlt;
        } else {
            // Tenta usar o signal store para resolver
            try {
                const store = sock?.authState?.creds?.me;
                // Fallback: remove @lid e usa o que temos
                sender = sender.replace('@lid', '@s.whatsapp.net');
            } catch (e) {
                console.log('[Emoji] Não foi possível resolver @lid:', e.message);
            }
        }
    }
    
    // Limpa o número
    return sender.replace('@s.whatsapp.net', '').replace('@lid', '');
}

/**
 * Processa mensagem e reage automaticamente se usuário tem emoji ativo
 * Chame esta função no seu handler de mensagens principal
 * 
 * @param {object} sock - Instância do Baileys socket
 * @param {object} msg - Mensagem recebida
 * @param {boolean} debug - Ativar logs de debug
 */
async function processEmojiReactions(sock, msg, debug = false) {
    try {
        const isGroup = msg.key.remoteJid?.endsWith('@g.us');
        const rawSender = isGroup ? msg.key.participant : msg.key.remoteJid;
        
        if (debug) {
            console.log('[Emoji DEBUG] isGroup:', isGroup);
            console.log('[Emoji DEBUG] rawSender:', rawSender);
        }
        
        // Extrai número real
        const cleanNumber = await extractRealNumber(sock, msg);
        
        if (!cleanNumber) {
            if (debug) console.log('[Emoji DEBUG] Não foi possível extrair número');
            return;
        }
        
        if (debug) console.log('[Emoji DEBUG] cleanNumber:', cleanNumber);
        
        const emoji = await getUserActiveEmoji(cleanNumber);
        
        if (debug) console.log('[Emoji DEBUG] emoji ativo:', emoji);
        
        if (emoji) {
            await reactToMessage(sock, msg, emoji);
        }
    } catch (error) {
        console.error('[Emoji] Erro ao processar reações:', error);
    }
}

/**
 * Lista emojis comprados pelo usuário
 */
async function listUserEmojis(whatsappNumber) {
    const cleanNumber = normalizeNumber(whatsappNumber);
    
    const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('whatsapp_number', cleanNumber)
        .maybeSingle();
    
    if (!user) return [];
    
    const { data } = await supabase
        .from('user_items')
        .select('product_id, product:products(id, name, category)')
        .eq('user_id', user.id);
    
    const emojiItems = (data || []).filter(item => 
        item.product && item.product.category === 'emoji'
    );
    
    // Busca status de ativação
    const { data: activeEmojis } = await supabase
        .from('user_active_emojis')
        .select('product_id, emoji, is_active')
        .eq('user_id', user.id);
    
    const activeMap = new Map((activeEmojis || []).map(e => [e.product_id, e]));
    
    return emojiItems.map(item => ({
        productId: item.product_id,
        name: item.product.name,
        emoji: extractEmojiFromName(item.product.name),
        isActive: activeMap.get(item.product_id)?.is_active || false
    }));
}

/**
 * Extrai o emoji do nome do produto (ex: "Reação ❤️" -> "❤️")
 */
function extractEmojiFromName(name) {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F18E}]|[\u{3030}]|[\u{2B55}]|[\u{1F201}]|[\u{1F21A}]|[\u{1F22F}]|[\u{1F232}-\u{1F236}]|[\u{1F238}-\u{1F23A}]|[\u{1F250}-\u{1F251}]/gu;
    const matches = name.match(emojiRegex);
    return matches ? matches[0] : '❓';
}

module.exports = {
    getUserActiveEmoji,
    activateEmoji,
    deactivateEmoji,
    reactToMessage,
    processEmojiReactions,
    listUserEmojis,
    extractEmojiFromName,
    extractRealNumber
};
