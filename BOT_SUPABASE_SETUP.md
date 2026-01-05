# Conectando o Bot Baileys ao Supabase

## 1. Instalar dependência

```bash
npm install @supabase/supabase-js
```

## 2. Criar arquivo de configuração do Supabase

Crie o arquivo `src/lib/supabase.js`:

```js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ndmesywylvqakutkicmj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbWVzeXd5bHZxYWt1dGtpY21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjI3NjIsImV4cCI6MjA4MzEzODc2Mn0.Iy-38wscsXP1znDbcZ74YGxaFmJXZEf4RxzMFbLr8Mg';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
```

## 3. Criar helpers para gerenciar usuários

Crie o arquivo `src/lib/userManager.js`:

```js
const { supabase } = require('./supabase');

/**
 * Busca um usuário pelo número do WhatsApp
 * @param {string} whatsappNumber - Número sem o 55 e sem @s.whatsapp.net
 */
async function getUser(whatsappNumber) {
    // Remove qualquer formatação
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('whatsapp_number', cleanNumber)
        .maybeSingle();
    
    if (error) {
        console.error('[Supabase] Erro ao buscar usuário:', error);
        return null;
    }
    
    return data;
}

/**
 * Cria ou atualiza um usuário
 * @param {string} whatsappNumber - Número limpo
 * @param {object} userData - Dados para atualizar
 */
async function upsertUser(whatsappNumber, userData = {}) {
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    
    // Primeiro tenta buscar o usuário
    let user = await getUser(cleanNumber);
    
    if (!user) {
        // Cria novo usuário
        const { data, error } = await supabase
            .from('users')
            .insert({ 
                whatsapp_number: cleanNumber,
                ...userData 
            })
            .select()
            .single();
        
        if (error) {
            console.error('[Supabase] Erro ao criar usuário:', error);
            return null;
        }
        
        console.log(`[Supabase] Novo usuário criado: ${cleanNumber}`);
        return data;
    }
    
    // Atualiza usuário existente se tiver dados para atualizar
    if (Object.keys(userData).length > 0) {
        const { data, error } = await supabase
            .from('users')
            .update(userData)
            .eq('id', user.id)
            .select()
            .single();
        
        if (error) {
            console.error('[Supabase] Erro ao atualizar usuário:', error);
            return user;
        }
        
        return data;
    }
    
    return user;
}

/**
 * Adiciona coins a um usuário
 */
async function addCoins(whatsappNumber, amount) {
    const user = await getUser(whatsappNumber);
    if (!user) return null;
    
    const newCoins = user.coins + amount;
    
    const { data, error } = await supabase
        .from('users')
        .update({ coins: newCoins })
        .eq('id', user.id)
        .select()
        .single();
    
    if (error) {
        console.error('[Supabase] Erro ao adicionar coins:', error);
        return null;
    }
    
    // Registra a transação
    await supabase.from('transactions').insert({
        user_id: user.id,
        amount: amount,
        type: 'earn',
        description: 'Coins ganhos no bot'
    });
    
    console.log(`[Supabase] +${amount} coins para ${whatsappNumber} (total: ${newCoins})`);
    return data;
}

/**
 * Remove coins de um usuário
 */
async function removeCoins(whatsappNumber, amount) {
    const user = await getUser(whatsappNumber);
    if (!user) return null;
    
    if (user.coins < amount) {
        return { error: 'Coins insuficientes', user };
    }
    
    const newCoins = user.coins - amount;
    
    const { data, error } = await supabase
        .from('users')
        .update({ coins: newCoins })
        .eq('id', user.id)
        .select()
        .single();
    
    if (error) {
        console.error('[Supabase] Erro ao remover coins:', error);
        return null;
    }
    
    await supabase.from('transactions').insert({
        user_id: user.id,
        amount: -amount,
        type: 'spend',
        description: 'Coins gastos no bot'
    });
    
    return data;
}

/**
 * Adiciona XP e verifica level up
 */
async function addXP(whatsappNumber, amount) {
    const user = await getUser(whatsappNumber);
    if (!user) return null;
    
    let newXP = user.xp + amount;
    let newLevel = user.level;
    
    // Cálculo simples de level: cada level precisa de level * 100 XP
    const xpNeeded = newLevel * 100;
    
    let leveledUp = false;
    while (newXP >= xpNeeded) {
        newXP -= xpNeeded;
        newLevel++;
        leveledUp = true;
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
    
    console.log(`[Supabase] +${amount} XP para ${whatsappNumber} (Level ${newLevel}, XP ${newXP})`);
    
    return { ...data, leveledUp, previousLevel: user.level };
}

/**
 * Incrementa contador de mensagens
 */
async function incrementMessages(whatsappNumber) {
    const user = await getUser(whatsappNumber);
    if (!user) return null;
    
    const { data, error } = await supabase
        .from('users')
        .update({ total_messages: user.total_messages + 1 })
        .eq('id', user.id)
        .select()
        .single();
    
    return data;
}

/**
 * Atualiza nome do usuário
 */
async function updateName(whatsappNumber, name) {
    const user = await getUser(whatsappNumber);
    if (!user) return null;
    
    const { data, error } = await supabase
        .from('users')
        .update({ name })
        .eq('id', user.id)
        .select()
        .single();
    
    return data;
}

/**
 * Busca ranking de usuários
 */
async function getRanking(limit = 10, orderBy = 'level') {
    const { data, error } = await supabase
        .from('users')
        .select('name, whatsapp_number, level, xp, coins, total_messages')
        .order(orderBy, { ascending: false })
        .limit(limit);
    
    if (error) {
        console.error('[Supabase] Erro ao buscar ranking:', error);
        return [];
    }
    
    return data;
}

module.exports = {
    getUser,
    upsertUser,
    addCoins,
    removeCoins,
    addXP,
    incrementMessages,
    updateName,
    getRanking
};
```

## 4. Usando nos comandos do bot

Exemplo de uso no seu `levelCommand.js`:

```js
const { getUser, addXP, incrementMessages, upsertUser } = require('../lib/userManager');

async function levelCommandBot(sock, messages, contactsCache) {
    const msg = messages.messages?.[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    
    // Extrai número limpo (remove 55 e @s.whatsapp.net)
    const whatsappNumber = sender.replace('@s.whatsapp.net', '').replace('55', '');
    
    // Garante que o usuário existe no banco
    await upsertUser(whatsappNumber);
    
    // Incrementa mensagens e dá XP
    await incrementMessages(whatsappNumber);
    const result = await addXP(whatsappNumber, 5); // 5 XP por mensagem
    
    // Se subiu de level, avisa
    if (result?.leveledUp) {
        await sock.sendMessage(from, { 
            text: `🎉 *LEVEL UP!*\n\n@${sender.split('@')[0]} subiu para o level ${result.level}!`,
            mentions: [sender]
        });
    }
    
    // Comando !nivel
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    
    if (text.toLowerCase() === '!nivel' || text.toLowerCase() === '!level') {
        const user = await getUser(whatsappNumber);
        
        if (user) {
            const xpNeeded = user.level * 100;
            const progress = Math.floor((user.xp / xpNeeded) * 10);
            const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);
            
            await sock.sendMessage(from, {
                text: `📊 *Seu Perfil*\n\n` +
                      `👤 Nome: ${user.name}\n` +
                      `⭐ Level: ${user.level}\n` +
                      `✨ XP: ${user.xp}/${xpNeeded}\n` +
                      `[${bar}]\n\n` +
                      `💰 Coins: ${user.coins}\n` +
                      `💬 Mensagens: ${user.total_messages}`
            });
        }
    }
    
    // Comando !ranking
    if (text.toLowerCase() === '!ranking' || text.toLowerCase() === '!rank') {
        const ranking = await getRanking(10, 'level');
        
        let rankText = '🏆 *RANKING TOP 10*\n\n';
        ranking.forEach((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            rankText += `${medal} ${user.name} - Level ${user.level}\n`;
        });
        
        await sock.sendMessage(from, { text: rankText });
    }
}

module.exports = levelCommandBot;
```

## 5. Migração do users.json (opcional)

Se você já tem dados em um `users.json`, crie um script de migração:

```js
// migrate-users.js
const fs = require('fs');
const { supabase } = require('./src/lib/supabase');

async function migrate() {
    const usersJson = JSON.parse(fs.readFileSync('./data/users.json', 'utf8'));
    
    for (const [number, userData] of Object.entries(usersJson)) {
        const cleanNumber = number.replace(/\D/g, '').replace('55', '');
        
        const { error } = await supabase
            .from('users')
            .upsert({
                whatsapp_number: cleanNumber,
                name: userData.name || 'Usuário',
                level: userData.level || 1,
                xp: userData.xp || 0,
                coins: userData.coins || 0,
                total_messages: userData.messages || 0,
            }, { onConflict: 'whatsapp_number' });
        
        if (error) {
            console.error(`Erro ao migrar ${number}:`, error);
        } else {
            console.log(`✅ Migrado: ${number}`);
        }
    }
    
    console.log('Migração concluída!');
}

migrate();
```

Execute com: `node migrate-users.js`

---

## Estrutura de arquivos sugerida

```
ShitterBot/
├── src/
│   ├── lib/
│   │   ├── supabase.js      # Cliente Supabase
│   │   └── userManager.js   # Funções de gerenciamento de usuários
│   ├── commands/
│   │   └── level/
│   │       └── levelCommand.js
│   └── index.js             # Arquivo principal do bot
├── data/
│   └── users.json           # (pode deletar após migração)
└── migrate-users.js         # Script de migração (opcional)
```

## Pronto!

Agora seu bot e o site compartilham os mesmos dados. Quando um usuário ganha coins no bot, aparece no site. Quando compra algo no site, o bot já sabe.
