import React, { useState } from 'react';
import { Button } from '../common/Button';
import { useAuth } from '../../contexts/AuthContext';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { login } = useAuth();
    const [email, setEmail] = useState('admin@auditpal.io');
    const [password, setPassword] = useState('Admin1234!');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const success = await login(email, password);
        setLoading(false);

        if (success) {
            onClose();
        } else {
            setError('Invalid email or password');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171717]/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-serif text-[#171717]">Log in to AuditPal</h2>
                        <p className="mt-2 text-sm text-[#7b7468]">Enter your credentials to access your workspace.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#f6f2ea] rounded-full transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7b7468] mb-1.5 ml-1">Email address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-2xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm focus:border-[#171717] focus:outline-none transition"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7b7468] mb-1.5 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-2xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm focus:border-[#171717] focus:outline-none transition"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs text-center font-medium">
                            {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <Button variant="primary" size="md" className="w-full py-4 text-base" type="submit" disabled={loading}>
                            {loading ? 'Logging in...' : 'Continue'}
                        </Button>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-[#ebe4d8] text-center">
                    <p className="text-xs text-[#7b7468]">
                        Don't have an account? <button className="text-[#171717] font-semibold hover:underline">Contact your organization</button>
                    </p>
                </div>
            </div>
        </div>
    );
}
