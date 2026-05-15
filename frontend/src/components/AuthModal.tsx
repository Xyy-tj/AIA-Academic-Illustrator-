'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, register, fetchUser, sendEmailCode } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Lock, User, Mail, ShieldCheck, ArrowRight, LogIn, UserPlus } from 'lucide-react';

export function AuthModal() {
    const { authModalOpen, setAuthModalOpen, authModalTab, setAuthModalTab, language } = useWorkflowStore();
    const t = useTranslation(language);
    
    // We use local state for the tab to allow smooth transitions, but sync with store
    const [activeTab, setActiveTab] = useState<'login' | 'register'>(authModalTab);
    
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { setToken, setUser } = useAuthStore();

    // Login State
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Register State
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regCode, setRegCode] = useState('');
    const [sendingCode, setSendingCode] = useState(false);

    // Sync tab from store
    useEffect(() => {
        if (authModalOpen) {
            setActiveTab(authModalTab);
        }
    }, [authModalOpen, authModalTab]);

    const handleTabChange = (value: string) => {
        const tab = value as 'login' | 'register';
        setActiveTab(tab);
        setAuthModalTab(tab);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { access_token } = await login(loginUsername, loginPassword);
            setToken(access_token);
            const user = await fetchUser();
            setUser(user);
            toast.success(t('loginSuccess'));
            setAuthModalOpen(false);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('loginFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(regUsername, regPassword, regEmail, regCode);
            toast.success(t('registerSuccess'));
            
            // Auto login
            const { access_token } = await login(regUsername, regPassword);
            setToken(access_token);
            const user = await fetchUser();
            setUser(user);
            
            setAuthModalOpen(false);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('registerFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleSendCode = async () => {
        if (!regEmail) {
            toast.error(t('emailRequired'));
            return;
        }
        setSendingCode(true);
        try {
            await sendEmailCode(regEmail);
            toast.success(t('codeSent'));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('sendCodeFailed'));
        } finally {
            setSendingCode(false);
        }
    };

    return (
        <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
            <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/40 dark:border-slate-800 shadow-2xl">
                <div className="bg-gradient-to-br from-indigo-600/90 to-violet-700/90 p-6 text-white relative overflow-hidden backdrop-blur-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                                {activeTab === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                {activeTab === 'login' ? t('welcomeBack') : t('createAccount')}
                            </DialogTitle>
                            <DialogDescription className="text-indigo-100 mt-1">
                                {activeTab === 'login' 
                                    ? t('loginDesc')
                                    : t('registerDesc')}
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                </div>

                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="login">{t('login')}</TabsTrigger>
                            <TabsTrigger value="register">{t('register')}</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="login-username">{t('username')}</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            id="login-username"
                                            value={loginUsername}
                                            onChange={(e) => setLoginUsername(e.target.value)}
                                            placeholder={t('enterUsername')}
                                            required
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="login-password">{t('password')}</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            id="login-password"
                                            type="password"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            placeholder={t('enterPassword')}
                                            required
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <Button 
                                    type="submit" 
                                    className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/30 rounded-xl font-medium transition-all active:scale-[0.98] mt-4" 
                                    disabled={loading}
                                >
                                    {loading ? (
                                        t('loggingIn')
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            {t('login')}
                                            <ArrowRight className="w-4 h-4" />
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </TabsContent>
                        
                        <TabsContent value="register">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reg-username">{t('username')}</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            id="reg-username"
                                            value={regUsername}
                                            onChange={(e) => setRegUsername(e.target.value)}
                                            placeholder={t('chooseUsername')}
                                            required
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-password">{t('password')}</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            id="reg-password"
                                            type="password"
                                            value={regPassword}
                                            onChange={(e) => setRegPassword(e.target.value)}
                                            placeholder={t('createPassword')}
                                            required
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-email">{t('email')}</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            id="reg-email"
                                            type="email"
                                            value={regEmail}
                                            onChange={(e) => setRegEmail(e.target.value)}
                                            placeholder={t('enterEmail')}
                                            required
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-code">{t('verificationCode')}</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                id="reg-code"
                                                value={regCode}
                                                onChange={(e) => setRegCode(e.target.value)}
                                                placeholder={t('enterCode')}
                                                required
                                                className="pl-9"
                                            />
                                        </div>
                                        <Button type="button" variant="outline" onClick={handleSendCode} disabled={sendingCode}>
                                            {sendingCode ? t('sending') : t('sendCode')}
                                        </Button>
                                    </div>
                                </div>
                                <Button 
                                    type="submit" 
                                    className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/30 rounded-xl font-medium transition-all active:scale-[0.98] mt-4" 
                                    disabled={loading}
                                >
                                    {loading ? (
                                        t('creatingAccount')
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            {t('createAccount')}
                                            <ArrowRight className="w-4 h-4" />
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
