import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

export type UserRole = 'BOUNTY_HUNTER' | 'ORGANIZATION' | 'ADMIN';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    reputation: number;
    organizationName?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    register: (payload: any) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const accessToken = localStorage.getItem('auditpal:access-token');
            if (accessToken) {
                try {
                    const res = await api.get<User>('/auth/me');
                    if (res.success) {
                        setUser(res.data);
                    } else {
                        api.clearTokens();
                    }
                } catch (error) {
                    console.error('Auth initialization failed', error);
                    api.clearTokens();
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
                email,
                password,
            });

            if (res.success) {
                api.setTokens(res.data.accessToken, res.data.refreshToken);
                setUser(res.data.user);
                return true;
            }
        } catch (error) {
            console.error('Login failed', error);
        }
        return false;
    };

    const register = async (payload: any) => {
        try {
            const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', payload);

            if (res.success) {
                api.setTokens(res.data.accessToken, res.data.refreshToken);
                setUser(res.data.user);
                return true;
            }
        } catch (error) {
            console.error('Registration failed', error);
        }
        return false;
    };

    const logout = () => {
        api.clearTokens();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
