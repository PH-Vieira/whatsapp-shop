# Código para adicionar no seu bot Baileys

Instale o Express no seu bot:
```bash
npm install express cors
```

Adicione esse código no seu bot (pode ser no arquivo principal ou em um novo arquivo):

```javascript
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// Endpoint para receber códigos de autenticação da Lojinha
app.post('/send-auth-code', async (req, res) => {
  try {
    const { whatsappNumber, code } = req.body;
    
    if (!whatsappNumber || !code) {
      return res.status(400).json({ error: 'whatsappNumber e code são obrigatórios' });
    }

    // Formata o número para o formato do Baileys (5511999999999@s.whatsapp.net)
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const jid = `55${cleanNumber}@s.whatsapp.net`;
    
    // Mensagem de autenticação
    const message = `🔐 *Código de Verificação*\n\nSeu código para entrar na Lojinha é:\n\n*${code}*\n\n⏰ Este código expira em 5 minutos.\n\n_Não compartilhe este código com ninguém!_`;
    
    // Envia a mensagem usando o sock do Baileys
    // Substitua 'sock' pela variável do seu socket do Baileys
    await sock.sendMessage(jid, { text: message });
    
    console.log(`[Auth] Código ${code} enviado para ${jid}`);
    
    res.json({ success: true, message: 'Código enviado com sucesso' });
    
  } catch (error) {
    console.error('[Auth] Erro ao enviar código:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicia o servidor Express
app.listen(PORT, () => {
  console.log(`[Express] Servidor rodando na porta ${PORT}`);
});
```

## Como usar

1. Adicione esse código no seu bot
2. Certifique-se de que a variável `sock` (ou o nome que você usa para o socket do Baileys) está acessível
3. Inicie o bot normalmente

## Quando for para produção (VPS)

Configure a variável de ambiente `BOT_WEBHOOK_URL` no Supabase:
```
BOT_WEBHOOK_URL=http://72.62.106.22:3001
```

Você pode fazer isso adicionando como secret no projeto.
