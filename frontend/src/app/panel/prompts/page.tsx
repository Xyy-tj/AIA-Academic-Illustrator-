'use client';

import { useEffect, useState } from 'react';
import { fetchPrompts, updatePrompt, resetPrompt, PromptConfig } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MessageSquare, RefreshCcw, Save, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminPromptsPage() {
    const [prompts, setPrompts] = useState<PromptConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrompt, setSelectedPrompt] = useState<PromptConfig | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { user } = useAuthStore();
    const { language } = useWorkflowStore();
    const t = useTranslation(language);

    useEffect(() => {
        if (!user || !user.is_admin) return;
        loadPrompts();
    }, [user]);

    const loadPrompts = async () => {
        try {
            setLoading(true);
            const data = await fetchPrompts();
            setPrompts(data);
        } catch (error) {
            toast.error(t('loadPromptsFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (prompt: PromptConfig) => {
        setSelectedPrompt(prompt);
        setEditValue(prompt.value);
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!selectedPrompt) return;
        try {
            const updated = await updatePrompt(selectedPrompt.key, editValue);
            setPrompts(prompts.map(p => p.key === updated.key ? updated : p));
            setIsDialogOpen(false);
            toast.success(t('promptUpdatedSuccess'));
        } catch (error) {
            toast.error(t('promptUpdateFailed'));
        }
    };

    const handleReset = async () => {
        if (!selectedPrompt) return;
        if (!confirm(t('resetConfirm'))) return;
        
        try {
            const reset = await resetPrompt(selectedPrompt.key);
            setPrompts(prompts.map(p => p.key === reset.key ? reset : p));
            setEditValue(reset.value);
            toast.success(t('promptResetSuccess'));
        } catch (error) {
            toast.error(t('promptResetFailed'));
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('promptConfiguration')}</h1>
                    <p className="text-slate-500">{t('promptConfigDescDetailed')}</p>
                </div>
                <Button onClick={loadPrompts} variant="outline" size="sm">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    {t('refresh')}
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : (
                <motion.div 
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                    {prompts.map((prompt) => (
                        <motion.div key={prompt.key} variants={item}>
                            <Card className="h-full hover:shadow-md transition-all border-slate-200 group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="sm" onClick={() => handleEditClick(prompt)} className="bg-indigo-600 hover:bg-indigo-700">
                                        <Edit2 className="w-4 h-4 mr-1" />
                                        {t('edit')}
                                    </Button>
                                </div>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                            <MessageSquare className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-semibold text-slate-800">
                                                {prompt.key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </CardTitle>
                                            <CardDescription className="line-clamp-1">
                                                {prompt.description || t('systemPrompt')}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs text-slate-600 h-32 overflow-hidden relative">
                                        {prompt.value}
                                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-50 to-transparent" />
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                                        <span>{t('lastUpdated')}: {new Date(prompt.updated_at).toLocaleDateString()}</span>
                                        <span className="font-mono bg-slate-100 px-2 py-1 rounded">{prompt.key}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t('editPrompt')}: {selectedPrompt?.key}</DialogTitle>
                        <DialogDescription>
                            {selectedPrompt?.description}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 min-h-0 py-4">
                        <Textarea 
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full h-full font-mono text-sm resize-none p-4 leading-relaxed"
                            placeholder={t('enterPromptContent')}
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <div className="flex-1 flex justify-start">
                            <Button type="button" variant="outline" onClick={handleReset} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                {t('resetToDefault')}
                            </Button>
                        </div>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button type="button" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                            <Save className="w-4 h-4 mr-2" />
                            {t('saveChanges')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
