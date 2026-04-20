const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

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
    private readonly getCacheTtlMs = 30000;
    private accessToken: string | null = localStorage.getItem('auditpal:access-token');
    private refreshToken: string | null = localStorage.getItem('auditpal:refresh-token');
    private readonly getCache = new Map<string, { data: ApiResponse<unknown>; expiresAt: number }>();
    private readonly inflightGets = new Map<string, Promise<ApiResponse<unknown>>>();

    setTokens(access: string, refresh: string) {
        this.accessToken = access;
        this.refreshToken = refresh;
        localStorage.setItem('auditpal:access-token', access);
        localStorage.setItem('auditpal:refresh-token', refresh);
        this.clearGetCache();
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('auditpal:access-token');
        localStorage.removeItem('auditpal:refresh-token');
        this.clearGetCache();
    }

    async fetch<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        const method = (options.method ?? 'GET').toUpperCase();
        const shouldCacheGet = method === 'GET' && !options.signal;
        const cacheKey = shouldCacheGet ? this.buildCacheKey(path, options.headers) : null;

        if (cacheKey) {
            const cached = this.getCache.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.data as ApiResponse<T>;
            }

            const inflight = this.inflightGets.get(cacheKey);
            if (inflight) {
                return inflight as Promise<ApiResponse<T>>;
            }
        }

        const request = this.performRequest<T>(path, options, cacheKey, true);

        if (cacheKey) {
            this.inflightGets.set(cacheKey, request as Promise<ApiResponse<unknown>>);
            request.finally(() => {
                this.inflightGets.delete(cacheKey);
            });
        }

        return request;
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

    private clearGetCache() {
        this.getCache.clear();
        this.inflightGets.clear();
    }

    private buildCacheKey(path: string, headersInit?: HeadersInit) {
        const headers = new Headers(headersInit);
        headers.delete('Authorization');

        return JSON.stringify({
            path,
            accessToken: this.accessToken ?? 'anonymous',
            headers: Array.from(headers.entries()).sort(([left], [right]) => left.localeCompare(right)),
        });
    }

    private async performRequest<T>(
        path: string,
        options: RequestInit,
        cacheKey: string | null,
        allowRefresh: boolean
    ): Promise<ApiResponse<T>> {
        const url = `${BASE_URL}${path}`;
        const headers = new Headers(options.headers);
        const method = (options.method ?? 'GET').toUpperCase();

        if (this.accessToken) {
            headers.set('Authorization', `Bearer ${this.accessToken}`);
        }

        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 && this.refreshToken && allowRefresh) {
            const refreshed = await this.refresh();
            if (refreshed) {
                return this.performRequest<T>(path, options, cacheKey, false);
            }
        }

        const data = await response.json();

        if (method !== 'GET') {
            this.clearGetCache();
        } else if (cacheKey && response.ok) {
            this.getCache.set(cacheKey, {
                data: data as ApiResponse<unknown>,
                expiresAt: Date.now() + this.getCacheTtlMs,
            });
        }

        return data;
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
