import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, setApiToken, setUnauthorizedHandler } from './api';
import { initialAuthUrl, clearAuthUrl, openGoogle, sessionId } from './google';
import { readToken, writeToken, removeToken } from './token-store';
import { bindRevenueCat, billingConfigError, rcEnabled } from '../billing/client';

export type User = { id: string; name: string; email: string };
type Session = { user: User; session_token: string };
type AuthInput = { email: string; password: string; name?: string };
const exchanges = new Map<string, Promise<Session>>();

function useAuthState() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clearSession = useCallback(async () => {
    setApiToken(null);
    setUser(null);
    queryClient.removeQueries({ queryKey: ['revenuecat'] });
    queryClient.removeQueries({ queryKey: ['auth'] });
    queryClient.removeQueries({ queryKey: ['security'] });
    await removeToken();
  }, [queryClient]);
  const acceptSession = useCallback(async (data: Session) => {
    await writeToken(data.session_token);
    // The browser persists only the server's HttpOnly cookie.
    setApiToken(Platform.OS === 'web' ? null : data.session_token);
    setUser(data.user);
    setError(null);
  }, []);
  const exchange = useCallback(async (url: string) => {
    const id = sessionId(url);
    if (!id) return;
    if (!exchanges.has(id)) exchanges.set(id, api<Session>('/auth/session', { session_id: id }, false));
    const session = await exchanges.get(id)!;
    await acceptSession(session);
    clearAuthUrl();
  }, [acceptSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => { void clearSession().catch(() => setError('Could not clear the saved session.')); });
    const restore = async () => {
      try {
        const url = await initialAuthUrl();
        if (sessionId(url)) { await exchange(url!); return; }
        const token = await readToken();
        setApiToken(token);
        if (Platform.OS !== 'web' && !token) return;
        const current = await queryClient.fetchQuery({ queryKey: ['auth', 'me'], queryFn: () => api<User>('/auth/me'), retry: false, staleTime: 0 });
        setUser(current);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) setError(err instanceof Error ? err.message : 'Could not restore your session.');
      } finally { setLoading(false); }
    };
    void restore();
    const listener = Platform.OS !== 'web' ? Linking.addEventListener('url', ({ url }) => {
      if (sessionId(url)) void exchange(url).catch(err => setError(err.message));
    }) : null;
    return () => { listener?.remove(); setUnauthorizedHandler(() => {}); };
  }, [clearSession, exchange, queryClient]);

  const action = useMutation({
    mutationFn: async ({ kind, input }: { kind: 'login' | 'register' | 'google' | 'logout'; input?: AuthInput }) => {
      setError(null);
      if (kind === 'logout') {
        await api('/auth/logout', {});
        try { if (rcEnabled && !billingConfigError) await bindRevenueCat(null); }
        finally { await clearSession(); }
      } else if (kind === 'google') {
        const url = await openGoogle();
        if (url && sessionId(url)) await exchange(url);
      } else {
        await acceptSession(await api<Session>(`/auth/${kind}`, input, false));
      }
    },
    onError: err => setError(err.message),
  });
  return { user, loading, error, clearError: () => setError(null), busy: action.isPending,
    signIn: (input: AuthInput, register: boolean) => action.mutate({ kind: register ? 'register' : 'login', input }),
    google: () => action.mutate({ kind: 'google' }), logout: () => action.mutate({ kind: 'logout' }) };
}
const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={useAuthState()}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}