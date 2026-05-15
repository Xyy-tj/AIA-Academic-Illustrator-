'use client';

import { RotateCcw, Globe, LogOut, User as UserIcon, Shield, RefreshCcw, CreditCard, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchPublicSettings } from '@/lib/api';
import { UserCenterDialog } from '@/components/UserCenterDialog';
import { RechargeModal } from '@/components/RechargeModal';
import { AuthModal } from '@/components/AuthModal';

export function Header() {
    const { language, setLanguage, resetProject, setAnnouncementOpen, setAuthModalOpen, setAuthModalTab } = useWorkflowStore();
    const { user, logout, setUser, token } = useAuthStore();
    const t = useTranslation(language);
    const router = useRouter();
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [siteName, setSiteName] = useState<string | null>(null);
    const [userCenterOpen, setUserCenterOpen] = useState(false);
    const [userCenterTab, setUserCenterTab] = useState('profile');
    const [rechargeOpen, setRechargeOpen] = useState(false);

    useEffect(() => {
        fetchPublicSettings().then(s => {
            if (s.site_logo) setLogoUrl(s.site_logo);
            if (s.site_name) setSiteName(s.site_name);
        }).catch(() => {});
    }, []);

    const [hasAnnouncement, setHasAnnouncement] = useState(false);
    useEffect(() => {
        fetchPublicSettings().then(s => {
            const enabled = !!s.announcement_enabled;
            const hasBody = !!s.announcement_body;
            setHasAnnouncement(enabled && hasBody);
        }).catch(() => {});
    }, []);

    const handleLogout = () => {
        logout();
        router.push('/');
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
        <>
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="sticky top-4 z-50 px-4 mb-8"
            >
                <div className="w-full max-w-[1600px] mx-auto glass-panel rounded-2xl px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-3 group">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white/50" />
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-110">
                                    <span className="text-white font-bold text-sm">AI</span>
                                </div>
                            )}
                            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                {siteName || t('appTitle')}
                            </h1>
                        </Link>

                        <div className="flex items-center gap-3">
                            {hasAnnouncement && (
                                <Button variant="outline" size="sm" onClick={() => setAnnouncementOpen(true)} className="rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                    公告
                                </Button>
                            )}
                            {user ? (
                                <div className="flex items-center gap-3 bg-slate-50/50 rounded-full pl-4 pr-1 py-1 border border-slate-200/60">
                                    {user.is_admin && (
                                        <Link href="/panel">
                                            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full h-8">
                                                <Shield className="w-4 h-4 mr-1.5" />
                                                Admin
                                            </Button>
                                        </Link>
                                    )}
                                    <div className="flex items-center gap-3 pr-2">
                                        <button
                                            type="button"
                                            className="flex items-center gap-2 text-xs leading-none hover:opacity-80 transition-opacity"
                                            onClick={() => { setUserCenterTab('profile'); setUserCenterOpen(true); }}
                                        >
                                            <div className="flex flex-col items-end">
                                                <span className="font-semibold text-slate-700">
                                                    {user.username}
                                                </span>
                                                <span className="text-indigo-500 font-medium mt-0.5">
                                                    Quota: {user.quota}
                                                </span>
                                            </div>
                                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                                            </div>
                                        </button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white hover:shadow-sm transition-all" title="Refresh quota" onClick={refreshUser}>
                                            <RefreshCcw className="w-3.5 h-3.5 text-slate-500" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all" 
                                            title="Recharge"
                                            onClick={() => setRechargeOpen(true)}
                                        >
                                            <CreditCard className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all" title="History" onClick={() => { setUserCenterTab('history'); setUserCenterOpen(true); }}>
                                            <History className="w-3.5 h-3.5" />
                                        </Button>
                                        <div className="h-4 w-[1px] bg-slate-200 mx-1" />
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-red-50 hover:text-red-600 transition-all" title="Logout" onClick={handleLogout}>
                                            <LogOut className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="ghost" 
                                        className="rounded-full"
                                        onClick={() => { setAuthModalTab('login'); setAuthModalOpen(true); }}
                                    >
                                        Log in
                                    </Button>
                                    <Button 
                                        className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                                        onClick={() => { setAuthModalTab('register'); setAuthModalOpen(true); }}
                                    >
                                        Get Started
                                    </Button>
                                </div>
                            )}

                            <div className="h-6 w-[1px] bg-slate-200/60" />

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
                                className="text-slate-500 hover:text-indigo-600 rounded-full w-9 h-9"
                                title={language === 'en' ? 'Switch to Chinese' : 'Switch to English'}
                            >
                                <Globe className="w-4 h-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={resetProject}
                                className="text-slate-500 hover:text-red-600 rounded-full w-9 h-9"
                                title={t('resetProject')}
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.header>
            <UserCenterDialog open={userCenterOpen} onOpenChange={setUserCenterOpen} initialTab={userCenterTab} />
            <RechargeModal open={rechargeOpen} onOpenChange={setRechargeOpen} />
            <AuthModal />
        </>
    );
}
