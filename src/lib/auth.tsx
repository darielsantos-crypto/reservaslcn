import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';
import { normalizeProfile } from './profile';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    const { data, error } = await supabase
      .from('travel_app_profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar perfil:', error);
      setProfile(null);
      return { error: `Não foi possível carregar seu perfil: ${error.message}` };
    }

    const normalized = normalizeProfile(data as Record<string, unknown> | null);
    setProfile(normalized);
    if (!normalized) return { error: 'Conta autenticada, mas sem perfil vinculado ao sistema.' };
    if (!normalized.active) return { error: 'Este usuário está inativo.' };
    return { error: null };
  }

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao restaurar sessão:', error);
          setSession(null);
          setProfile(null);
          return;
        }

        setSession(data.session);
        if (data.session) {
          return loadProfile(data.session.user.id);
        }
      })
      .catch((error) => {
        console.error('Falha na inicialização da autenticação:', error);
        setSession(null);
        setProfile(null);
      })
      .finally(() => setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      (async () => {
        setSession(sess);
        if (sess && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          await loadProfile(sess.user.id);
        } else if (!sess) {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Não foi possível identificar o usuário autenticado.' };

    const profileResult = await loadProfile(data.user.id);
    if (profileResult.error) {
      await supabase.auth.signOut();
      return { error: profileResult.error };
    }
    return { error: null };
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from('travel_app_profiles').insert({
        id: data.user.id,
        full_name: fullName,
        email,
        role: 'solicitante',
        active: true,
      });
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
