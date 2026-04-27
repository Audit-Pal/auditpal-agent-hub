import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export type UserRole = 'BOUNTY_HUNTER' | 'ORGANIZATION' | 'ADMIN' | 'GATEKEEPER' | 'VALIDATOR';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    reputation: number;
    bio?: string;
    avatarUrl?: string;
    githubHandle?: string;
    organizationName?: string;
    walletAddress?: string;
    escrowContractAddress?: string;
    createdAt?: string;
    hasApiKey?: boolean;
    apiKeyPreview?: string;
    apiKeyCreatedAt?: string;
    apiKeyLastUsedAt?: string;
}

interface GenerateApiKeyResponse {
    apiKey: string;
    user: User;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    register: (payload: any) => Promise<boolean>;
    logout: () => void;
    refreshProfile: () => Promise<User | null>;
    generateApiKey: () => Promise<string | null>;
    updateProfile: (payload: { walletAddress?: string | null; escrowContractAddress?: string | null }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const refreshProfile = async () => {
        try {
            const res = await api.get<User>('/auth/me');
            if (res.success) {
                setUser(res.data);
                return res.data;
            }
        } catch (error) {
            console.error('Profile refresh failed', error);
        }

        api.clearTokens();
        setUser(null);
        return null;
    };

    useEffect(() => {
        const initAuth = async () => {
            const accessToken = localStorage.getItem('auditpal:access-token');
            if (accessToken) {
                await refreshProfile();
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

    const generateApiKey = async () => {
        try {
            const res = await api.post<GenerateApiKeyResponse>('/auth/api-key');
            if (res.success) {
                setUser(res.data.user);
                return res.data.apiKey;
            }
        } catch (error) {
            console.error('API key generation failed', error);
        }

        return null;
    };

    const updateProfile = async (payload: { walletAddress?: string | null; escrowContractAddress?: string | null }) => {
        try {
            const res = await api.patch<User>('/auth/me', payload);
            if (res.success) {
                setUser(res.data);
                return res.data;
            }
            throw new Error(res.error || 'Unable to save profile details right now.');
        } catch (error) {
            console.error('Profile update failed', error);
            throw error instanceof Error ? error : new Error('Unable to save profile details right now.');
        }
    };

    const logout = () => {
        api.clearTokens();
        setUser(null);
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile, generateApiKey, updateProfile }}>
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
