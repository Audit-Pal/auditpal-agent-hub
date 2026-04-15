const BASE_URL = 'http://localhost:3001/api/v1';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

class ApiClient {
    private accessToken: string | null = localStorage.getItem('auditpal:access-token');
    private refreshToken: string | null = localStorage.getItem('auditpal:refresh-token');

    setTokens(access: string, refresh: string) {
        this.accessToken = access;
        this.refreshToken = refresh;
        localStorage.setItem('auditpal:access-token', access);
        localStorage.setItem('auditpal:refresh-token', refresh);
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('auditpal:access-token');
        localStorage.removeItem('auditpal:refresh-token');
    }

    async fetch<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        const url = `${BASE_URL}${path}`;
        const headers = new Headers(options.headers);

        if (this.accessToken) {
            headers.set('Authorization', `Bearer ${this.accessToken}`);
        }

        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 && this.refreshToken) {
            // Try refresh
            const refreshed = await this.refresh();
            if (refreshed) {
                return this.fetch<T>(path, options);
            }
        }

        const data = await response.json();
        return data;
    }

    private async refresh(): Promise<boolean> {
        try {
            const response = await fetch(`${BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken }),
            });

            if (response.ok) {
                const { data } = await response.json();
                this.setTokens(data.accessToken, data.refreshToken);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed', error);
        }

        this.clearTokens();
        return false;
    }

    get<T>(path: string, options: RequestInit = {}) {
        return this.fetch<T>(path, { ...options, method: 'GET' });
    }

    post<T>(path: string, data?: any, options: RequestInit = {}) {
        return this.fetch<T>(path, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    patch<T>(path: string, data?: any, options: RequestInit = {}) {
        return this.fetch<T>(path, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    delete<T>(path: string, options: RequestInit = {}) {
        return this.fetch<T>(path, { ...options, method: 'DELETE' });
    }
}

export const api = new ApiClient();
