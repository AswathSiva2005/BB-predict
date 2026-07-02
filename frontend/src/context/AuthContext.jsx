import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'xai_stock_token';
const EMAIL_KEY = 'xai_stock_user_email';
const FULL_NAME_KEY = 'xai_stock_user_full_name';

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(FULL_NAME_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(FULL_NAME_KEY);
}

function persistSession(user, remember = false) {
  clearStoredSession();

  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, user.token);
  storage.setItem(EMAIL_KEY, user.email);
  storage.setItem(FULL_NAME_KEY, user.full_name ?? '');
}

function readStoredSession() {
  const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage.getItem(TOKEN_KEY) ? sessionStorage : null;

  if (!storage) {
    return null;
  }

  const token = storage.getItem(TOKEN_KEY);
  const email = storage.getItem(EMAIL_KEY);
  if (!token || !email) {
    return null;
  }

  return {
    email,
    token,
    full_name: storage.getItem(FULL_NAME_KEY) ?? '',
    remember: storage === localStorage,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredSession());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const storedSession = readStoredSession();
      if (!storedSession) {
        if (active) {
          setIsReady(true);
        }
        return;
      }

      if (active) {
        setUser(storedSession);
      }

      try {
        const response = await authApi.me();
        if (!active) {
          return;
        }

        const nextUser = {
          email: response.data.email,
          full_name: response.data.full_name,
          token: storedSession.token,
          remember: storedSession.remember,
        };
        persistSession(nextUser, nextUser.remember);
        setUser(nextUser);
      } catch (requestError) {
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearStoredSession();
          if (active) {
            setUser(null);
          }
        }
      } finally {
        if (active) {
          setIsReady(true);
        }
      }
    };

    hydrate();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isReady,
      isAuthenticated: Boolean(user),
      login: (payload) => {
        const nextUser = {
          email: payload.email,
          token: payload.token,
          full_name: payload.full_name ?? '',
          remember: Boolean(payload.remember),
        };

        persistSession(nextUser, nextUser.remember);
        setUser(nextUser);
      },
      registerAndLogin: async (payload) => {
        await authApi.register(payload);
        const response = await authApi.login({
          email: payload.email,
          password: payload.password,
        });
        const remember = Boolean(payload.remember ?? true);
        persistSession(
          {
            email: payload.email,
            full_name: payload.full_name ?? '',
            token: response.data.access_token,
            remember,
          },
          remember,
        );
        const profileResponse = await authApi.me();
        const nextUser = {
          email: profileResponse.data.email,
          full_name: profileResponse.data.full_name,
          token: response.data.access_token,
          remember,
        };
        persistSession(nextUser, nextUser.remember);
        setUser(nextUser);
        return nextUser;
      },
      updateProfile: (nextUser) => {
        const mergedUser = {
          email: nextUser.email,
          full_name: nextUser.full_name ?? '',
          token: nextUser.token ?? user?.token,
          remember: Boolean(nextUser.remember ?? user?.remember),
        };

        persistSession(mergedUser, mergedUser.remember);
        setUser(mergedUser);
      },
      deleteAccount: () => {
        clearStoredSession();
        setUser(null);
      },
      logout: () => {
        clearStoredSession();
        setUser(null);
      },
      refreshSession: (token, email, full_name = '') => {
        if (!token || !email) {
          return;
        }

        const nextUser = { email, token, full_name, remember: true };
        persistSession(nextUser, true);
        setUser(nextUser);
      },
    }),
    [isReady, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
