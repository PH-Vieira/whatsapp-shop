# Instruções de Integração - Emojis e Boosts

## Arquivos a copiar

Copie estes arquivos para a pasta `src/lib/` do seu bot:
- `public/bot-files/emojiReactionHandler.js` -> `src/lib/emojiReactionHandler.js`
- `public/bot-files/boostManager.js` -> `src/lib/boostManager.js`

---

## 1. Alterações no `userManager.js`

### No INÍCIO do arquivo, adicione o import:

```javascript
const { getUserXPMultiplier } = require('./boostManager');
```

### Na função `addXP`, SUBSTITUA o código por:

```javascript
/**
 * Adiciona XP e verifica level up (COM SUPORTE A BOOST)
 */
async function addXP(whatsappNumber, amount) {
    const cleanNumber = normalizeNumber(whatsappNumber);
    const user = await getUser(cleanNumber);
    if (!user) return null;

    // Aplica multiplicador de boost
    const multiplier = await getUserXPMultiplier(cleanNumber);
    const boostedAmount = Math.floor(amount * multiplier);

    let newXP = user.xp + boostedAmount;
    let newLevel = user.level;
    let xpNeeded = newLevel * 100;

    let leveledUp = false;
    while (newXP >= xpNeeded) {
        newXP -= xpNeeded;
        newLevel++;
        leveledUp = true;
        xpNeeded = newLevel * 100;
    }

    const { data, error } = await supabase
        .from('users')
        .update({ xp: newXP, level: newLevel })
        .eq('id', user.id)
        .select()
        .single();

    if (error) {
        console.error('[Supabase] Erro ao adicionar XP:', error);
        return null;
    }

    // Log com info de boost se aplicável
    if (multiplier > 1) {
        console.log(`[Supabase] +${boostedAmount} XP (${amount} x ${multiplier}) para ${cleanNumber} (Level ${newLevel}, XP ${newXP})`);
    } else {
        console.log(`[Supabase] +${boostedAmount} XP para ${cleanNumber} (Level ${newLevel}, XP ${newXP})`);
    }

    return { ...data, leveledUp, previousLevel: user.level, boostedXP: boostedAmount, multiplier };
}
```

---

## 2. Alterações no `index.js` (arquivo principal do bot)

### Adicione os imports no INÍCIO:

```javascript
const { processEmojiReactions } = require('./lib/emojiReactionHandler');
const { cleanupExpiredBoosts } = require('./lib/boostManager');
```

### No handler de mensagens (`sock.ev.on('messages.upsert', ...)`), ADICIONE:

Após a linha que processa a mensagem (depois do `processMessage`), adicione:

```javascript
// Processa reações de emoji automáticas
await processEmojiReactions(sock, msg);
```

### EXEMPLO de como deve ficar o handler:

```javascript
sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    console.log('========== MENSAGEM RECEBIDA ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('========================================');

    // Processa a mensagem (adiciona XP, etc)
    await processMessage(sock, msg);
    
    // NOVO: Processa reações de emoji automáticas
    await processEmojiReactions(sock, msg);

    // ... resto do código ...
});
```

### Adicione cleanup periódico de boosts expirados:

No final da função `connectBot()`, adicione:

```javascript
// Limpa boosts expirados a cada hora
setInterval(() => {
    cleanupExpiredBoosts();
}, 60 * 60 * 1000);
```

---

## 3. Novo comando `!emojis` (COPIE E COLE NO SEU levelCommand.js)

**IMPORTANTE**: Este código deve ser adicionado dentro do seu handler de comandos, onde você já processa `!level`, `!ranking`, etc.

```javascript
// NO INÍCIO DO ARQUIVO, adicione o import:
const { listUserEmojis, activateEmoji, deactivateEmoji } = require('../../lib/emojiReactionHandler');

// DENTRO DO HANDLER DE COMANDOS, adicione:

// ================= COMANDO !EMOJIS =================
if (text.toLowerCase() === '!emojis') {
    const sender = msg.key.participant || msg.key.remoteJid;
    const whatsappNumber = sender.replace('@s.whatsapp.net', '').replace('@lid', '');
    
    console.log('[DEBUG] !emojis chamado por:', whatsappNumber);
    
    const emojis = await listUserEmojis(whatsappNumber);
    
    console.log('[DEBUG] Emojis encontrados:', emojis);
    
    if (emojis.length === 0) {
        await sock.sendMessage(from, {
            text: '💬 *Suas Reações*\n\nVocê ainda não tem nenhuma reação!\nCompre na loja para o bot reagir às suas mensagens!'
        });
        return;
    }
    
    let response = '💬 *Suas Reações*\n\n';
    emojis.forEach((e, i) => {
        const status = e.isActive ? '✅ (ativo)' : '⬜';
        response += `${status} ${e.emoji} - ${e.name}\n`;
    });
    response += '\n📱 _Acesse seu perfil no site para ativar/desativar reações_';
    
    await sock.sendMessage(from, { text: response });
    return;
}

// ================= COMANDO !ATIVAREMOJI =================
if (text.toLowerCase().startsWith('!ativaremoji ')) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const whatsappNumber = sender.replace('@s.whatsapp.net', '').replace('@lid', '');
    const emoji = text.replace('!ativaremoji ', '').trim();
    
    const userEmojis = await listUserEmojis(whatsappNumber);
    const emojiItem = userEmojis.find(e => e.emoji === emoji);
    
    if (!emojiItem) {
        await sock.sendMessage(from, { text: '❌ Você não possui esse emoji! Use !emojis para ver seus emojis.' });
        return;
    }
    
    const result = await activateEmoji(whatsappNumber, emojiItem.productId, emoji);
    if (result.success) {
        await sock.sendMessage(from, { text: `✅ ${emoji} ativado! Agora vou reagir às suas mensagens.` });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
    return;
}

// ================= COMANDO !DESATIVAREMOJI =================
if (text.toLowerCase().startsWith('!desativaremoji ')) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const whatsappNumber = sender.replace('@s.whatsapp.net', '').replace('@lid', '');
    const emoji = text.replace('!desativaremoji ', '').trim();
    
    const userEmojis = await listUserEmojis(whatsappNumber);
    const emojiItem = userEmojis.find(e => e.emoji === emoji);
    
    if (!emojiItem) {
        await sock.sendMessage(from, { text: '❌ Você não possui esse emoji!' });
        return;
    }
    
    const result = await deactivateEmoji(whatsappNumber, emojiItem.productId);
    if (result.success) {
        await sock.sendMessage(from, { text: `✅ ${emoji} desativado!` });
    }
    return;
}
```

---

## 4. Novo comando `!boost` (adicione em levelCommand.js ou crie um arquivo separado)

```javascript
const { listActiveBoosts, listInventoryBoosts, activateBoost, formatTimeRemaining, parseBoostFromName } = require('../../lib/boostManager');

// Comando !boost
if (text.toLowerCase() === '!boost' || text.toLowerCase() === '!boosts') {
    const activeBoosts = await listActiveBoosts(whatsappNumber);
    const inventoryBoosts = await listInventoryBoosts(whatsappNumber);
    
    let response = '⚡ *Seus Boosts*\n\n';
    
    if (activeBoosts.length > 0) {
        response += '*Ativos:*\n';
        activeBoosts.forEach(b => {
            response += `🟢 ${b.multiplier}x XP - ${formatTimeRemaining(b.expires_at)}\n`;
        });
        response += '\n';
    }
    
    if (inventoryBoosts.length > 0) {
        response += '*No inventário:*\n';
        inventoryBoosts.forEach((b, i) => {
            response += `${i + 1}. ${b.name}\n`;
        });
        response += '\n_Use !usarboost [número] para ativar_';
    } else if (activeBoosts.length === 0) {
        response += 'Você não tem boosts.\nCompre na loja: https://suaurl.com/store';
    }
    
    await sock.sendMessage(from, { text: response });
}

// Comando !usarboost
if (text.toLowerCase().startsWith('!usarboost ')) {
    const index = parseInt(text.replace('!usarboost ', '').trim()) - 1;
    const inventoryBoosts = await listInventoryBoosts(whatsappNumber);
    
    if (isNaN(index) || index < 0 || index >= inventoryBoosts.length) {
        await sock.sendMessage(from, { text: '❌ Número inválido! Use !boost para ver seus boosts.' });
        return;
    }
    
    const boost = inventoryBoosts[index];
    const result = await activateBoost(
        whatsappNumber, 
        boost.productId, 
        boost.multiplier, 
        boost.durationHours
    );
    
    if (result.success) {
        await sock.sendMessage(from, { 
            text: `✅ *Boost ativado!*\n\n⚡ ${boost.multiplier}x XP\n⏰ Duração: ${boost.durationHours}h\n\nSeu XP está turbinado!` 
        });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}
```

---

## 5. Atualize o `!menu` com os novos comandos

Adicione estas linhas ao menu:

```javascript
🎁 *Loja e Itens:*
✅ *!emojis* - Ver suas reações compradas
✅ *!ativaremoji [emoji]* - Ativar uma reação
✅ *!desativaremoji [emoji]* - Desativar uma reação
✅ *!boost* - Ver seus boosts de XP
✅ *!usarboost [número]* - Usar um boost do inventário
```

---

## Resumo das alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/emojiReactionHandler.js` | Criar (copiar) |
| `src/lib/boostManager.js` | Criar (copiar) |
| `src/lib/userManager.js` | Alterar função `addXP` |
| `index.js` | Adicionar imports e `processEmojiReactions` no handler |
| `levelCommand.js` | Adicionar comandos !emojis, !boost, etc |
| `menuCommand.js` | Adicionar novos comandos ao menu |
