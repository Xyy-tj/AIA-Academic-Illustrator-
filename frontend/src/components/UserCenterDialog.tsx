'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { History, CreditCard, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { fetchMyHistory, HistoryItem } from '@/lib/api';

interface UserCenterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserCenterDialog({ open, onOpenChange }: UserCenterDialogProps) {
    const { user } = useAuthStore();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (!user) return;
        setLoadingHistory(true);
        fetchMyHistory()
            .then(setHistory)
            .catch(() => {})
            .finally(() => setLoadingHistory(false));
    }, [open, user]);

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl bg-white border-slate-200">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <UserIcon className="w-5 h-5 text-indigo-600" />
                        个人中心
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="profile" className="mt-4">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                        <TabsTrigger
                            value="profile"
                            className="data-[state=active]:bg-white data-[state=active]:text-indigo-600"
                        >
                            账户信息
                        </TabsTrigger>
                        <TabsTrigger
                            value="quota"
                            className="data-[state=active]:bg-white data-[state=active]:text-indigo-600"
                        >
                            额度管理
                        </TabsTrigger>
                        <TabsTrigger
                            value="history"
                            className="data-[state=active]:bg-white data-[state=active]:text-indigo-600"
                        >
                            生成历史
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="mt-4 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>基本信息</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">用户名</span>
                                    <span className="font-medium text-slate-800">
                                        {user.username}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">邮箱</span>
                                    <span className="font-medium text-slate-800">
                                        {user.email || '未绑定'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">用户ID</span>
                                    <span className="font-mono text-slate-800">
                                        {user.id}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">注册时间</span>
                                    <span className="text-slate-800">
                                        {new Date(user.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="quota" className="mt-4 space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>当前额度</CardTitle>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-indigo-600">
                                        {user.quota}
                                    </span>
                                    <span className="text-xs text-slate-500">次</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <p className="text-slate-600">
                                    每次生成流程会消耗额度，请合理安排使用频率。
                                </p>
                                <div className="flex justify-end">
                                    <Link href="/recharge">
                                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            前往充值
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history" className="mt-4 space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>个人生成历史</CardTitle>
                                <History className="w-4 h-4 text-slate-500" />
                            </CardHeader>
                            <CardContent>
                                {loadingHistory ? (
                                    <div className="text-sm text-slate-500">
                                        加载中...
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="text-sm text-slate-500">
                                        暂无生成记录。
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-80 overflow-y-auto">
                                        {history.map((item) => (
                                            <div
                                                key={item.session_id}
                                                className="border border-slate-200 rounded-lg p-3 flex gap-3"
                                            >
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-slate-500">
                                                            会话 ID: {item.session_id}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(
                                                                item.updated_at || item.created_at,
                                                            ).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {item.input_summary && (
                                                        <p className="text-sm text-slate-700 line-clamp-2">
                                                            {item.input_summary}
                                                        </p>
                                                    )}
                                                </div>
                                                {item.image_url && (
                                                    <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border border-slate-200 bg-slate-50">
                                                        <img
                                                            src={resolveImageUrl(item.image_url)}
                                                            alt="preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
