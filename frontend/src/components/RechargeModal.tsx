'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createRecharge, fetchPublicSettings, redeemCode } from '@/lib/api';
import { toast } from 'sonner';
import { CreditCard, Wallet, ArrowRight, ShieldCheck, Coins, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface RechargeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const PRESET_AMOUNTS = [10, 50, 100, 200];

export function RechargeModal({ open, onOpenChange }: RechargeModalProps) {
    const { user, setUser } = useAuthStore();
    const [activeTab, setActiveTab] = useState('pay');
    const [amount, setAmount] = useState<number>(10);
    const [payType, setPayType] = useState<'alipay' | 'wxpay'>('alipay');
    const [loading, setLoading] = useState(false);
    const [rechargeRatio, setRechargeRatio] = useState<number>(1);
    
    // Redeem code state
    const [code, setCode] = useState('');
    const [redeemLoading, setRedeemLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchPublicSettings().then(settings => {
                if (settings.recharge_ratio) {
                    setRechargeRatio(settings.recharge_ratio);
                }
            }).catch(() => {
                // Ignore error
            });
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { pay_url } = await createRecharge(amount, payType);
            // Open in new tab or redirect? Usually payment gateways are better in new tab or current.
            // But since it's a modal, redirecting current page might lose state if not careful.
            // Let's redirect current window as in original page, but maybe better to open in new tab?
            // The original page used window.location.href = pay_url;
            window.location.href = pay_url;
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create recharge');
            setLoading(false);
        }
    };

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        setRedeemLoading(true);
        try {
            const res = await redeemCode(code);
            toast.success(`兑换成功！已增加 ${res.added_quota} 积分`);
            
            // Update user quota locally
            if (user) {
                setUser({
                    ...user,
                    quota: res.new_balance
                });
            }
            
            // Close modal after short delay or let user see success?
            // User might want to redeem another code, so keep open but clear input
            setCode('');
            
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '兑换失败');
        } finally {
            setRedeemLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                                <Wallet className="w-5 h-5" />
                                充值中心
                            </DialogTitle>
                            <DialogDescription className="text-indigo-100 mt-1">
                                安全、快速的充值服务，即时到账。
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                </div>

                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="pay">在线充值</TabsTrigger>
                            <TabsTrigger value="redeem">兑换码</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="pay">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        选择充值金额
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {PRESET_AMOUNTS.map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setAmount(amt)}
                                                className={cn(
                                                    "py-2 px-1 rounded-lg text-sm font-medium transition-all border",
                                                    amount === amt
                                                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-500"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                                                )}
                                            >
                                                ¥{amt}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                                        <Input 
                                            type="number" 
                                            min={1} 
                                            value={amount} 
                                            onChange={(e) => setAmount(Number(e.target.value))}
                                            className="pl-7 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs px-1">
                                        <span className="text-slate-500">
                                            兑换比例: 1 元 = {rechargeRatio} 积分
                                        </span>
                                        <span className="font-medium text-indigo-600 flex items-center gap-1">
                                            <Coins className="w-3 h-3" />
                                            预计获得 {amount * rechargeRatio} 积分
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        支付方式
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div
                                            onClick={() => setPayType('alipay')}
                                            className={cn(
                                                "cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all",
                                                payType === 'alipay'
                                                    ? "border-[#1677FF] bg-[#1677FF]/5 ring-1 ring-[#1677FF]"
                                                    : "border-slate-200 hover:border-[#1677FF]/50 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-[#1677FF] flex items-center justify-center text-white shrink-0">
                                                <span className="font-bold text-xs">支</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-900">支付宝</span>
                                                <span className="text-[10px] text-slate-500">推荐使用</span>
                                            </div>
                                            {payType === 'alipay' && (
                                                <div className="ml-auto w-4 h-4 rounded-full bg-[#1677FF] flex items-center justify-center">
                                                    <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5 text-white" stroke="currentColor" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            onClick={() => setPayType('wxpay')}
                                            className={cn(
                                                "cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all",
                                                payType === 'wxpay'
                                                    ? "border-[#07C160] bg-[#07C160]/5 ring-1 ring-[#07C160]"
                                                    : "border-slate-200 hover:border-[#07C160]/50 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-[#07C160] flex items-center justify-center text-white shrink-0">
                                                <span className="font-bold text-xs">微</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-900">微信支付</span>
                                                <span className="text-[10px] text-slate-500">亿万用户选择</span>
                                            </div>
                                            {payType === 'wxpay' && (
                                                <div className="ml-auto w-4 h-4 rounded-full bg-[#07C160] flex items-center justify-center">
                                                    <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5 text-white" stroke="currentColor" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    type="submit" 
                                    className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/30 rounded-xl font-medium transition-all active:scale-[0.98]" 
                                    disabled={loading}
                                >
                                    {loading ? (
                                        '处理中...'
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            立即支付 ¥{amount}
                                            <ArrowRight className="w-4 h-4" />
                                        </span>
                                    )}
                                </Button>
                                
                                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>SSL安全加密支付，保障您的资金安全</span>
                                </div>
                            </form>
                        </TabsContent>

                        <TabsContent value="redeem">
                            <form onSubmit={handleRedeem} className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        输入兑换码
                                    </label>
                                    <Input 
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="请输入您的兑换码"
                                        className="h-11"
                                    />
                                    <p className="text-xs text-slate-500">
                                        请输入有效的兑换码，兑换成功后额度将自动到账。
                                    </p>
                                </div>

                                <Button 
                                    type="submit" 
                                    className="w-full h-11 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg shadow-pink-500/30 rounded-xl font-medium transition-all active:scale-[0.98]" 
                                    disabled={redeemLoading || !code.trim()}
                                >
                                    {redeemLoading ? (
                                        '兑换中...'
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            立即兑换
                                            <Gift className="w-4 h-4" />
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
