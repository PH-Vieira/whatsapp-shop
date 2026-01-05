import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { whatsappNumber, code } = await req.json();

    if (!whatsappNumber || !code) {
      return new Response(
        JSON.stringify({ error: 'whatsappNumber e code são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normaliza número para evitar 55 duplicado e envia ao bot SEM o prefixo 55
    // (o bot adiciona 55 ao construir o JID)
    let cleaned = String(whatsappNumber || '').replace(/\D/g, '');
    cleaned = cleaned.replace(/^(55)+/, '55');
    const numberForBot = cleaned.startsWith('55') ? cleaned.slice(2) : cleaned;

    // URL do bot - em dev usa localhost, em prod usa o IP da VPS
    let botUrl = Deno.env.get('BOT_WEBHOOK_URL') || 'http://localhost:3001';

    // Garantir que a URL tenha o protocolo http://
    if (botUrl && !botUrl.startsWith('http://') && !botUrl.startsWith('https://')) {
      botUrl = `http://${botUrl}`;
    }

    console.log(`[send-auth-code] Enviando código ${code} para ${cleaned} (bot recebe: ${numberForBot})`);
    console.log(`[send-auth-code] Bot URL: ${botUrl}/send-auth-code`);

    // Adiciona timeout de 10 segundos para evitar travamento
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(`${botUrl}/send-auth-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whatsappNumber: numberForBot,
          code,
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const isTimeout = fetchError instanceof Error && fetchError.name === 'AbortError';
      console.error(`[send-auth-code] ${isTimeout ? 'Timeout' : 'Erro de conexão'}:`, fetchError);
      return new Response(
        JSON.stringify({ 
          error: isTimeout 
            ? 'Timeout ao conectar com o bot (10s)' 
            : 'Erro ao conectar com o bot',
          details: fetchError instanceof Error ? fetchError.message : 'Erro desconhecido'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[send-auth-code] Erro do bot: ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Erro ao enviar código via WhatsApp', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log(`[send-auth-code] Sucesso:`, result);

    return new Response(
      JSON.stringify({ success: true, message: 'Código enviado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-auth-code] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
