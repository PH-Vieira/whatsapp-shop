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

    // URL do bot - em dev usa localhost, em prod usa o IP da VPS
    const botUrl = Deno.env.get('BOT_WEBHOOK_URL') || 'http://localhost:3001';
    
    console.log(`[send-auth-code] Enviando código ${code} para ${whatsappNumber}`);
    console.log(`[send-auth-code] Bot URL: ${botUrl}/send-auth-code`);

    const response = await fetch(`${botUrl}/send-auth-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        whatsappNumber,
        code,
      }),
    });

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
