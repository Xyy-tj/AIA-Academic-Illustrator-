'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { 
    History, 
    CreditCard, 
    User as UserIcon, 
    Eye, 
    Maximize2, 
    Download, 
    Languages, 
    Crop, 
    Palette,
    FileText,
    Wand2,
    LogOut,
    RefreshCw,
    Lock
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { fetchMyHistory, HistoryItem, fetchUser, changePassword } from '@/lib/api';
import { resolveImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { RechargeModal } from './RechargeModal';

interface UserCenterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialTab?: string;
}

export function UserCenterDialog({ open, onOpenChange, initialTab = "profile" }: UserCenterDialogProps) {
    const { user, logout, setUser } = useAuthStore();
    const { language } = useWorkflowStore();
    const t = useTranslation(language);
    const router = useRouter();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [detailItem, setDetailItem] = useState<HistoryItem | null>(null);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [rechargeOpen, setRechargeOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Change Password State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            toast.error(t('passwordMismatch') || 'New passwords do not match');
            return;
        }

        setChangingPassword(true);
        try {
            await changePassword(oldPassword, newPassword);
            toast.success(t('passwordChangedSuccess') || 'Password changed successfully');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.message || t('passwordChangeFailed') || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    useEffect(() => {
        if (open) {
            setActiveTab(initialTab);
        }
    }, [open, initialTab]);

    const handleLogout = () => {
        logout();
        onOpenChange(false);
        router.push('/login');
    };

    const handleRefreshQuota = async () => {
        setRefreshing(true);
        try {
            const updatedUser = await fetchUser();
            setUser(updatedUser);
            toast.success(t('quotaRefreshed') || 'Quota updated');
        } catch (error) {
            toast.error('Failed to refresh quota');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        if (!user) return;
        // Fetch history only if tab is history or just fetch it anyway?
        // Let's fetch it when dialog opens to be safe, or when tab switches to history.
        // For simplicity, keep existing logic but maybe check tab?
        // Actually existing logic fetches on open. That's fine.
        setLoadingHistory(true);
        fetchMyHistory()
            .then(setHistory)
            .catch(() => {})
            .finally(() => setLoadingHistory(false));
    }, [open, user]);

    const handleDownload = (url: string) => {
        try {
            const resolvedUrl = resolveImageUrl(url);
            if (!resolvedUrl) return;
            
            const a = document.createElement('a');
            a.href = resolvedUrl;
            a.download = `history-${Date.now()}.png`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            toast.error('下载失败');
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'translation': return <Languages className="w-4 h-4 text-blue-500" />;
            case 'extraction': return <Crop className="w-4 h-4 text-orange-500" />;
            case 'super_resolution': return <Wand2 className="w-4 h-4 text-purple-500" />;
            case 'ppt_generation': return <FileText className="w-4 h-4 text-rose-500" />;
            default: return <Palette className="w-4 h-4 text-indigo-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'translation': return t('imageTranslation');
            case 'extraction': return t('imageExtraction');
            case 'super_resolution': return t('superResolution');
            case 'ppt_generation': return t('pptGeneration') || 'PPT Generation';
            default: return t('aiDiagram');
        }
    };

    if (!user) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-3xl bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b border-slate-100/50 bg-white/50">
                        <DialogTitle className="flex items-center gap-2 text-xl text-slate-800">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-indigo-600" />
                            </div>
                            {t('userProfile')}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t('userProfile')}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                        <TabsList className="grid w-full grid-cols-4 bg-slate-50/50 p-1 border-b border-slate-100 flex-shrink-0">
                            <TabsTrigger
                                value="profile"
                                className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                            >
                                {t('accountInfo')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="password"
                                className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                            >
                                {t('changePassword')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="quota"
                                className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                            >
                                {t('quota')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                            >
                                {t('myHistory')}
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                            <TabsContent value="profile" className="mt-0 space-y-4">
                                <Card className="border-0 shadow-sm bg-white/60">
                                    <CardHeader>
                                        <CardTitle>{t('accountInfo')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">{t('username')}</span>
                                            <span className="font-medium text-slate-800">
                                                {user.username}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">{t('email')}</span>
                                            <span className="font-medium text-slate-800">
                                                {user.email || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">User ID</span>
                                            <span className="font-mono text-slate-800">
                                                {user.id}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Created At</span>
                                            <span className="text-slate-800">
                                                {new Date(user.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        
                                        <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3">
                                            <Button variant="outline" onClick={() => setActiveTab("password")} className="w-full sm:w-auto">
                                                <Lock className="w-4 h-4 mr-2" />
                                                {t('changePassword')}
                                            </Button>
                                            <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">
                                                <LogOut className="w-4 h-4 mr-2" />
                                                {t('signOut')}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="password" className="mt-0 space-y-4">
                                <Card className="border-0 shadow-sm bg-white/60">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Lock className="w-4 h-4" />
                                            {t('changePassword')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleChangePassword} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="old-password">
                                                    {t('oldPassword')}
                                                </Label>
                                                <Input
                                                    id="old-password"
                                                    type="password"
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new-password">
                                                    {t('newPassword')}
                                                </Label>
                                                <Input
                                                    id="new-password"
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirm-password">
                                                    {t('confirmNewPassword')}
                                                </Label>
                                                <Input
                                                    id="confirm-password"
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={changingPassword}>
                                                {changingPassword 
                                                    ? t('updating') 
                                                    : t('confirmUpdate')}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="quota" className="mt-0 space-y-4">
                                <Card className="border-0 shadow-sm bg-white/60">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>{t('quota')}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-indigo-600">
                                                    {user.quota}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                                onClick={handleRefreshQuota}
                                                disabled={refreshing}
                                            >
                                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <p className="text-slate-600">
                                            Each generation consumes quota.
                                        </p>
                                        <div className="flex justify-end">
                                            <Button 
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                                onClick={() => setRechargeOpen(true)}
                                            >
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                {t('recharge')}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="history" className="mt-0 space-y-4">
                                <Card className="border-0 shadow-none bg-transparent">
                                    <CardHeader className="flex flex-row items-center justify-between px-0 pt-0">
                                        <CardTitle>个人生成历史</CardTitle>
                                        <History className="w-4 h-4 text-slate-500" />
                                    </CardHeader>
                                    <CardContent className="px-0">
                                        {loadingHistory ? (
                                            <div className="text-sm text-slate-500 text-center py-8">
                                                加载中...
                                            </div>
                                        ) : history.length === 0 ? (
                                            <div className="text-sm text-slate-500 text-center py-8">
                                                暂无生成记录。
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {history.map((item) => (
                                                    <div
                                                        key={item.session_id}
                                                        className="group border border-slate-200 rounded-lg p-3 flex gap-4 hover:border-indigo-200 hover:shadow-sm transition-all bg-white"
                                                    >
                                                        {item.image_url ? (
                                                            <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden border border-slate-200 bg-slate-50">
                                                                <img
                                                                    src={resolveImageUrl(item.image_url)}
                                                                    alt="preview"
                                                                    className="w-full h-full object-cover cursor-pointer"
                                                                    onClick={() => setPreviewImage(resolveImageUrl(item.image_url) ?? null)}
                                                                />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                                                    <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="w-24 h-24 flex-shrink-0 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300">
                                                                <FileText className="w-8 h-8" />
                                                            </div>
                                                        )}

                                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex items-center gap-2">
                                                                        {getTypeIcon(item.type)}
                                                                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                                                            {getTypeLabel(item.type)}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                                                        {new Date(
                                                                            item.updated_at || item.created_at,
                                                                        ).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                {item.input_summary && (
                                                                    <p className="text-sm text-slate-700 line-clamp-2" title={item.input_summary}>
                                                                        {item.input_summary}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-7 px-2 text-xs text-slate-500 hover:text-indigo-600"
                                                                    onClick={() => setDetailItem(item)}
                                                                >
                                                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                                                    查看详情
                                                                </Button>
                                                                
                                                                {item.image_url && (
                                                                    <>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="sm" 
                                                                            className="h-7 px-2 text-xs text-slate-500 hover:text-indigo-600"
                                                                            onClick={() => setPreviewImage(resolveImageUrl(item.image_url!) ?? null)}
                                                                        >
                                                                            <Maximize2 className="w-3.5 h-3.5 mr-1" />
                                                                            放大
                                                                        </Button>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="sm" 
                                                                            className="h-7 px-2 text-xs text-slate-500 hover:text-indigo-600"
                                                                            onClick={() => handleDownload(item.image_url!)}
                                                                        >
                                                                            <Download className="w-3.5 h-3.5 mr-1" />
                                                                            下载
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </DialogContent>
            </Dialog>
            
            <RechargeModal open={rechargeOpen} onOpenChange={setRechargeOpen} />

            {/* Image Preview Dialog */}
            <Dialog open={!!previewImage} onOpenChange={(o) => !o && setPreviewImage(null)}>
                <DialogContent className="max-w-4xl bg-transparent border-0 shadow-none p-0 flex items-center justify-center">
                    <DialogTitle className="sr-only">图片预览</DialogTitle>
                    <DialogDescription className="sr-only">
                        生成图片的完整大图预览。
                    </DialogDescription>
                    {previewImage && (
                        <div className="relative w-full h-[80vh] flex items-center justify-center">
                            <img
                                src={previewImage}
                                alt="Full preview"
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            />
                            <Button
                                className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white border-0"
                                onClick={() => setPreviewImage(null)}
                            >
                                关闭预览
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Details Dialog */}
            <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
                <DialogContent className="sm:max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle>记录详情</DialogTitle>
                        <DialogDescription className="sr-only">
                            查看生成记录的详细信息，包括类型、时间和输入内容。
                        </DialogDescription>
                    </DialogHeader>
                    {detailItem && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                                <span className="text-slate-500 text-right">类型</span>
                                <span className="col-span-3 font-medium flex items-center gap-2">
                                    {getTypeIcon(detailItem.type)}
                                    {getTypeLabel(detailItem.type)}
                                </span>
                                
                                <span className="text-slate-500 text-right">时间</span>
                                <span className="col-span-3 text-slate-700">
                                    {new Date(detailItem.updated_at || detailItem.created_at).toLocaleString()}
                                </span>
                                
                                <span className="text-slate-500 text-right">会话ID</span>
                                <span className="col-span-3 font-mono text-xs text-slate-600 break-all">
                                    {detailItem.session_id}
                                </span>
                            </div>

                            {detailItem.input_summary && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-slate-700">输入内容</h4>
                                    <div className="p-3 bg-slate-50 rounded-md text-sm text-slate-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                        {detailItem.input_summary}
                                    </div>
                                </div>
                            )}

                            {detailItem.image_url && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-slate-700">生成结果</h4>
                                    <div className="rounded-lg overflow-hidden border border-slate-200">
                                        <img 
                                            src={resolveImageUrl(detailItem.image_url)} 
                                            alt="Result" 
                                            className="w-full h-auto max-h-60 object-contain bg-slate-50"
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button size="sm" onClick={() => handleDownload(detailItem.image_url!)}>
                                            <Download className="w-4 h-4 mr-2" />
                                            下载图片
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
