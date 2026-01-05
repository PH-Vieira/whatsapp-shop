import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { requestCode, login } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Normaliza o número para sempre ter o código do país 55
  const normalizePhone = (number: string) => {
    let cleaned = number.replace(/\D/g, '');
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    return cleaned;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleRequestCode = async () => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length < 10) {
      toast.error('Digite um número de WhatsApp válido');
      return;
    }

    setIsLoading(true);
    const normalizedNumber = normalizePhone(numbers);
    const result = await requestCode(normalizedNumber);
    setIsLoading(false);

    if (result.success) {
      toast.success('Código enviado para seu WhatsApp!');
      setStep('code');
    } else {
      toast.error(result.error || 'Erro ao enviar código');
    }
  };

  const handleLogin = async () => {
    if (code.length !== 6) {
      toast.error('Digite o código completo');
      return;
    }

    setIsLoading(true);
    const normalizedNumber = normalizePhone(phone);
    const result = await login(normalizedNumber, code);
    setIsLoading(false);

    if (result.success) {
      toast.success('Login realizado com sucesso! 🎉');
      navigate('/');
    } else {
      toast.error(result.error || 'Erro ao fazer login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl animate-float opacity-30">🎮</div>
        <div className="absolute top-40 right-20 text-5xl animate-float opacity-30" style={{ animationDelay: '1s' }}>🎁</div>
        <div className="absolute bottom-40 left-20 text-4xl animate-float opacity-30" style={{ animationDelay: '0.5s' }}>✨</div>
        <div className="absolute bottom-20 right-10 text-5xl animate-float opacity-30" style={{ animationDelay: '1.5s' }}>🏆</div>
      </div>

      <div className="text-center mb-8 animate-slide-down">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-5xl animate-bounce-soft">🛍️</span>
          <h1 className="text-4xl font-display font-bold text-gradient">Lojinha</h1>
        </div>
        <p className="text-muted-foreground text-lg">Sua loja de cosméticos digitais!</p>
      </div>

      <Card className="w-full max-w-md shadow-soft border-2 animate-scale-in">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl flex items-center justify-center gap-2">
            <MessageCircle className="w-6 h-6 text-success" />
            {step === 'phone' ? 'Entrar com WhatsApp' : 'Verificar Código'}
          </CardTitle>
          <CardDescription>
            {step === 'phone' 
              ? 'Digite seu número para receber o código de acesso'
              : 'Digite o código que enviamos para seu WhatsApp'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'phone' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Número do WhatsApp</label>
                <Input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="text-center text-lg tracking-wide"
                  maxLength={16}
                />
              </div>

              <Button 
                onClick={handleRequestCode}
                disabled={isLoading}
                className="w-full gradient-primary text-primary-foreground text-lg py-6 font-bold"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Receber Código
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <label className="text-sm font-medium text-center block">Código de 6 dígitos</label>
                <div className="flex justify-center">
                  <InputOTP 
                    maxLength={6} 
                    value={code} 
                    onChange={setCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button 
                onClick={handleLogin}
                disabled={isLoading || code.length !== 6}
                className="w-full gradient-primary text-primary-foreground text-lg py-6 font-bold"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Entrar
                  </>
                )}
              </Button>

              <Button 
                variant="ghost" 
                onClick={() => { setStep('phone'); setCode(''); }}
                className="w-full"
              >
                Voltar
              </Button>
            </>
          )}

          <p className="text-xs text-center text-muted-foreground">
            O código será enviado pelo nosso bot no WhatsApp 📱
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
