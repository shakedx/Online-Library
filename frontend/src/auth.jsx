import { createContext, useContext, useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from './api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setStatus('loading');
        setError(null);
        api('/api/auth/me', { signal: controller.signal })
            .then(({ user }) => {
            if (!controller.signal.aborted) {
                setUser(user);
                setStatus('ready');
            }
        })
            .catch((error) => {
            if (controller.signal.aborted)
                return;
            setUser(null);
            if (error instanceof ApiError && error.status === 401) {
                setStatus('ready');
            }
            else {
                setError(errorMessage(error));
                setStatus('error');
            }
        });
        return () => controller.abort();
    }, [attempt]);
    async function login(credentials) {
        const { user } = await api('/api/auth/login', {
            method: 'POST', body: JSON.stringify(credentials),
        });
        setUser(user);
    }
    async function logout() {
        try {
            await api('/api/auth/logout', { method: 'POST' });
        }
        catch (error) {
            // Истёкшая сессия уже завершена на сервере.
            if (!(error instanceof ApiError && error.status === 401))
                throw error;
        }
        setUser(null);
    }
    return (<AuthContext.Provider value={{ user, status, error, login, logout, retry: () => setAttempt(value => value + 1) }}>
      {children}
    </AuthContext.Provider>);
}
export function useAuth() {
    const auth = useContext(AuthContext);
    if (!auth)
        throw new Error('useAuth requires AuthProvider');
    return auth;
}
