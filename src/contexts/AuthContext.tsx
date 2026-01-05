import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, AuthSession } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  login: (whatsappNumber: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  requestCode: (whatsappNumber: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'lojinha_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession) as AuthSession;
        if (new Date(parsed.expiresAt) > new Date()) {
          setSession(parsed);
          setUser(parsed.user);
          // Refresh user data (and persist updated session)
          refreshUserData(parsed.user.id, parsed);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const refreshUserData = async (userId: string, currentSession: AuthSession | null = null) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setUser(data as User);

      const baseSession = currentSession ?? session;
      if (baseSession) {
        const updatedSession = { ...baseSession, user: data as User };
        setSession(updatedSession);
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
      }
    } else {
      // Usuário não existe mais no banco - faz logout automático
      console.log('[Auth] Usuário não encontrado no banco, fazendo logout');
      setUser(null);
      setSession(null);
      localStorage.removeItem(SESSION_KEY);
    }
  };

  const refreshUser = async () => {
    if (user) {
      await refreshUserData(user.id);
    }
  };

  const requestCode = async (whatsappNumber: string): Promise<{ success: boolean; error?: string }> => {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store code in database
    const { error } = await supabase
      .from('auth_codes')
      .insert({
        whatsapp_number: whatsappNumber,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      return { success: false, error: 'Erro ao gerar código. Tente novamente.' };
    }

    // Send code via WhatsApp bot
    try {
      const { error: funcError } = await supabase.functions.invoke('send-auth-code', {
        body: { whatsappNumber, code },
      });

      if (funcError) {
        console.error('[Auth] Erro ao enviar código via bot:', funcError);
        // Ainda assim salva o código, usuário pode pedir reenvio
        console.log(`[DEV] Código para ${whatsappNumber}: ${code}`);
      }
    } catch (err) {
      console.error('[Auth] Erro na função:', err);
      console.log(`[DEV] Código para ${whatsappNumber}: ${code}`);
    }

    return { success: true };
  };

  const login = async (whatsappNumber: string, code: string): Promise<{ success: boolean; error?: string }> => {
    // Verify code
    const { data: authCode, error: codeError } = await supabase
      .from('auth_codes')
      .select('*')
      .eq('whatsapp_number', whatsappNumber)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError || !authCode) {
      return { success: false, error: 'Código inválido ou expirado.' };
    }

    // Mark code as used
    await supabase
      .from('auth_codes')
      .update({ used: true })
      .eq('id', authCode.id);

    // Get or create user
    let { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('whatsapp_number', whatsappNumber)
      .maybeSingle();

    if (!userData) {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ whatsapp_number: whatsappNumber })
        .select()
        .single();

      if (createError || !newUser) {
        return { success: false, error: 'Erro ao criar usuário.' };
      }
      userData = newUser;
    }

    if (userData.is_banned) {
      return { success: false, error: 'Sua conta está banida.' };
    }

    // Create session - using fallback for browsers without crypto.randomUUID
    const sessionToken = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await supabase
      .from('user_sessions')
      .insert({
        user_id: userData.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      });

    const authSession: AuthSession = {
      user: userData as User,
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
    };

    setUser(userData as User);
    setSession(authSession);
    localStorage.setItem(SESSION_KEY, JSON.stringify(authSession));

    return { success: true };
  };

  const logout = () => {
    if (session) {
      supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', session.token);
    }
    setUser(null);
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, logout, requestCode, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
