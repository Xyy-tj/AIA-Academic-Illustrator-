'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { Coins, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { RechargeModal } from '@/components/RechargeModal';

export function QuotaAlert() {
    const { quotaModalOpen, setQuotaModalOpen, language } = useWorkflowStore();
    const t = useTranslation(language);
    const [rechargeOpen, setRechargeOpen] = useState(false);

    const handleRecharge = (e: React.MouseEvent) => {
        e.preventDefault();
        setQuotaModalOpen(false);
        setRechargeOpen(true);
    };

    return (
        <>
            <Dialog open={quotaModalOpen} onOpenChange={setQuotaModalOpen}>
                <DialogContent className="bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <Coins className="w-5 h-5" />
                            {language === 'zh' ? '额度不足' : 'Insufficient Quota'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 pt-2">
                            {language === 'zh' 
                                ? '您的账户额度不足以完成本次操作。请充值后继续使用。' 
                                : 'Your account quota is insufficient to complete this operation. Please recharge to continue.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                            variant="outline" 
                            onClick={() => setQuotaModalOpen(false)}
                            className="border-slate-200 bg-slate-50 hover:bg-slate-100"
                        >
                            {language === 'zh' ? '取消' : 'Cancel'}
                        </Button>
                        <Button 
                            onClick={handleRecharge}
                            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/30"
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            {language === 'zh' ? '立即充值' : 'Recharge Now'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <RechargeModal open={rechargeOpen} onOpenChange={setRechargeOpen} />
        </>
    );
}
