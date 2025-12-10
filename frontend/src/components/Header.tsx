'use client';

import { RotateCcw, Globe, LogOut, User as UserIcon, Shield, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function Header() {
    const { language, setLanguage, resetProject } = useWorkflowStore();
    const { user, logout, setUser, token } = useAuthStore();
    const t = useTranslation(language);
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const refreshUser = async () => {
        try {
            const { fetchUser } = await import('@/lib/api');
            const u = await fetchUser();
            setUser(u);
        } catch {}
    };

    if (token && !user) {
        void refreshUser();
    }

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">AI</span>
                        </div>
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                            {t('appTitle')}
                        </h1>
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                         {/* User Info / Auth */}
                        {user ? (
                            <div className="flex items-center gap-2 mr-2 border-r pr-4 border-slate-200">
                                {user.is_admin && (
                                    <Link href="/admin">
                                        <Button variant="ghost" size="sm" className="text-slate-600">
                                            <Shield className="w-4 h-4 mr-1.5" />
                                            Admin
                                        </Button>
                                    </Link>
                                )}
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col items-end text-xs text-slate-600">
                                        <span className="font-medium">{user.username}</span>
                                        <span className="text-indigo-600">Quota: {user.quota}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Refresh quota" onClick={refreshUser}>
                                        <RefreshCcw className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLogout}
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <Link href="/login" className="mr-2">
                                <Button variant="ghost" size="sm">
                                    <UserIcon className="w-4 h-4 mr-1.5" />
                                    Login
                                </Button>
                            </Link>
                        )}

                        {/* Language Toggle */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
                            className="text-slate-600 hover:text-slate-900"
                        >
                            <Globe className="w-4 h-4 mr-1.5" />
                            {language === 'en' ? 'EN' : '中文'}
                        </Button>

                        {/* Reset Project */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetProject}
                            className="text-slate-600 hover:text-slate-900"
                        >
                            <RotateCcw className="w-4 h-4 mr-1.5" />
                            {t('resetProject')}
                        </Button>

                        {/* Admin Settings available in /admin */}
                    </div>
                </div>
            </div>
        </motion.header>
    );
}
