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
    const { groupNumber, raffleTitle, winnerName } = await req.json();

    console.log('Sending raffle result:', { groupNumber, raffleTitle, winnerName });

    if (!groupNumber || !raffleTitle || !winnerName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botWebhookUrl = Deno.env.get('BOT_WEBHOOK_URL');
    if (!botWebhookUrl) {
      console.error('BOT_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Bot webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format group number to WhatsApp JID
    const cleanNumber = groupNumber.replace(/\D/g, '');
    const groupJid = cleanNumber.includes('@g.us') ? cleanNumber : `${cleanNumber}@g.us`;

    const message = `🎉 *RESULTADO DO SORTEIO* 🎉\n\n🎁 *${raffleTitle}*\n\n🏆 *Vencedor:* ${winnerName}\n\nParabéns! 🥳`;

    // Extract base URL and construct the endpoint
    const baseUrl = botWebhookUrl.replace(/\/send-auth-code$/, '');
    const sendMessageUrl = `${baseUrl}/send-message`;

    console.log('Calling bot at:', sendMessageUrl);

    const response = await fetch(sendMessageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: groupJid,
        message: message
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bot error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send message', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Message sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});