'use client';

import { useState, useEffect } from 'react';
import { Loader2, Download, Wand2, Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { generatePPTBatch, fetchPPTStyles, PPTStyle, fetchUser, fetchPublicSettings, previewPPTPrompt, BatchPPTGenerateItem } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { resolveImageUrl } from '@/lib/utils';
import Image from 'next/image';
import { PromptExportButton } from '@/components/PromptExportButton';
import { FeatureBanner } from '@/components/FeatureBanner';

interface PageItem {
    id: string;
    description: string;
    resultImageUrl: string | null;
    status: 'idle' | 'generating' | 'success' | 'error';
    error?: string;
}

export function PPTGenerator() {
    const { logout } = useAuthStore();
    const [pages, setPages] = useState<PageItem[]>([]);

    useEffect(() => {
        setPages([
            { id: '1', description: '', resultImageUrl: null, status: 'idle' }
        ]);
    }, []);
    const [styles, setStyles] = useState<PPTStyle[]>([]);
    const [selectedStyleId, setSelectedStyleId] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [cost, setCost] = useState<number>(0);

    useEffect(() => {
        fetchPublicSettings().then(s => setCost(s.cost_ppt_generation || 2));
        fetchPPTStyles().then(data => {
            setStyles(data);
            if (data.length > 0) {
                setSelectedStyleId(data[0].id.toString());
            }
        });
    }, []);

    const handleAddPage = () => {
        setPages(prev => [
            ...prev,
            { id: Date.now().toString(), description: '', resultImageUrl: null, status: 'idle' }
        ]);
    };

    const handleRemovePage = (id: string) => {
        if (pages.length <= 1) return;
        setPages(prev => prev.filter(p => p.id !== id));
    };

    const handleUpdatePage = (id: string, content: string) => {
        setPages(prev => prev.map(p => p.id === id ? { ...p, description: content } : p));
    };

    const handleCopyPrompt = async (description: string) => {
        if (!description) {
            toast.error('请先输入描述');
            return;
        }
        try {
            const { prompt } = await previewPPTPrompt(description, selectedStyleId ? parseInt(selectedStyleId) : undefined);
            await navigator.clipboard.writeText(prompt);
            toast.success('提示词已复制到剪贴板');
        } catch (e) {
            toast.error('获取提示词失败');
        }
    };

    const handleGenerateAll = async () => {
        const { token } = useAuthStore.getState();
        if (!token) {
             useWorkflowStore.getState().setAuthModalTab('login');
             useWorkflowStore.getState().setAuthModalOpen(true);
             return;
        }

        const validPages = pages.filter(p => p.description.trim() !== '');
        if (validPages.length === 0) {
            toast.error('请输入至少一个页面的画面描述');
            return;
        }

        // Snapshot IDs for matching later
        const validPageIds = new Set(validPages.map(p => p.id));

        setIsGenerating(true);
        // Set status to generating for valid pages
        setPages(prev => prev.map(p => validPageIds.has(p.id) ? { ...p, status: 'generating' } : p));

        try {
            const requests: BatchPPTGenerateItem[] = validPages.map(p => ({
                description: p.description,
                style_id: selectedStyleId ? parseInt(selectedStyleId) : undefined
            }));

            const response = await generatePPTBatch(requests);
            
            // Map results back to pages using IDs if order is preserved (it is)
            // But we can't trust user didn't reorder or add pages in between (though we disabled inputs, wait, inputs are not disabled yet!)
            // To be safe, we iterate through results and assign them to the validPages in order.
            
            // Create a map of result by index -> pageId
            const resultByPageId: Record<string, any> = {};
            validPages.forEach((p, idx) => {
                if (idx < response.results.length) {
                    resultByPageId[p.id] = response.results[idx];
                }
            });

            setPages(prev => prev.map(p => {
                if (!validPageIds.has(p.id)) return p;
                
                const result = resultByPageId[p.id];
                if (!result) return p; // Should not happen if logic matches

                if (result.success && result.image_url) {
                    return { ...p, status: 'success', resultImageUrl: result.image_url };
                } else {
                    return { ...p, status: 'error', error: result.error || '生成失败' };
                }
            }));

            if (response.results.some(r => r.success)) {
                toast.success(`成功生成 ${response.results.filter(r => r.success).length} 张页面`);
                try {
                    const user = await fetchUser();
                    useAuthStore.getState().setUser(user);
                } catch {}
            } else {
                toast.error('所有页面生成失败');
            }

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg === 'UNAUTHORIZED' || (error as any).status === 401) {
                toast.error('请先登录');
                logout();
            } else {
                toast.error(`生成失败: ${msg}`);
            }
            // Reset generating status
            setPages(prev => prev.map(p => p.status === 'generating' ? { ...p, status: 'idle' } : p));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = (imageUrl: string | null) => {
        if (!imageUrl) return;
        try {
            const url = resolveImageUrl(imageUrl);
            if (!url) throw new Error('Invalid image url');
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `ppt-slide-${Date.now()}.png`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            toast.error(`下载失败: ${e}`);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <FeatureBanner
                title="PPT 灵感生成"
                description="输入画面描述，选择视觉风格，一键生成高质量 PPT 演示图。支持批量生成。"
            >
                <div className="relative w-64 h-40 bg-indigo-900/20 rounded-xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-sm">
                     <div className="absolute inset-0 flex items-center justify-center text-white/20">
                        <Wand2 size={48} />
                     </div>
                </div>
            </FeatureBanner>

            <div className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-500/10">
                <div className="space-y-8">
                    {/* Global Settings */}
                    <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                         <div className="w-full md:w-1/2 space-y-2">
                            <Label>视觉风格模板</Label>
                            <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                                <SelectTrigger className="bg-white/50">
                                    <SelectValue placeholder="选择风格" />
                                </SelectTrigger>
                                <SelectContent>
                                    {styles.map(style => (
                                        <SelectItem key={style.id} value={style.id.toString()}>
                                            {style.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {styles.find(s => s.id.toString() === selectedStyleId)?.description && (
                                <p className="text-sm text-slate-500">
                                    {styles.find(s => s.id.toString() === selectedStyleId)?.description}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                             <Button onClick={handleAddPage} variant="outline" className="gap-2" disabled={isGenerating}>
                                <Plus size={16} />
                                添加页面
                             </Button>
                             <Button 
                                className="min-w-[140px]" 
                                size="lg"
                                onClick={handleGenerateAll}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        生成中...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="mr-2 h-4 w-4" />
                                        批量生成 <span className="text-xs opacity-80 ml-1">({cost * pages.filter(p => p.description.trim()).length} 积分)</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Pages List */}
                    <div className="space-y-6">
                        {pages.map((page, index) => (
                            <div key={page.id} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-white/40 border border-white/50 relative group">
                                {pages.length > 1 && (
                                    <button 
                                        onClick={() => handleRemovePage(page.id)}
                                        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0"
                                        disabled={isGenerating}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label>页面 {index + 1} 内容描述</Label>
                                        <PromptExportButton 
                                            promptType="ppt"
                                            payload={{
                                                description: page.description,
                                                style_id: selectedStyleId ? parseInt(selectedStyleId) : undefined
                                            }}
                                            disabled={!page.description}
                                        />
                                    </div>
                                    <Textarea 
                                        placeholder="描述这一页 PPT 的画面内容..."
                                        className="h-40 resize-none bg-white/80"
                                        value={page.description}
                                        onChange={(e) => handleUpdatePage(page.id, e.target.value)}
                                        disabled={isGenerating}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label>生成结果</Label>
                                    <div className="relative h-[calc(100%-2rem)] min-h-[160px] rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden aspect-video">
                                        {page.resultImageUrl ? (
                                            <div className="relative w-full h-full group/image">
                                                <Image 
                                                    src={resolveImageUrl(page.resultImageUrl) || ''} 
                                                    alt="Result" 
                                                    fill 
                                                    className="object-contain"
                                                    unoptimized
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/image:opacity-100 gap-2">
                                                    <Button onClick={() => handleDownload(page.resultImageUrl)} variant="secondary" size="sm" className="gap-2">
                                                        <Download size={16} />
                                                        下载
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-400 flex-col gap-2">
                                                {page.status === 'generating' ? (
                                                    <>
                                                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                                                        <span className="text-sm">绘制中...</span>
                                                    </>
                                                ) : page.status === 'error' ? (
                                                    <span className="text-sm text-red-500">{page.error || '生成失败'}</span>
                                                ) : (
                                                    <span className="text-sm">预览区域</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {pages.length > 3 && (
                         <div className="flex justify-center">
                             <Button onClick={handleAddPage} variant="outline" className="gap-2" disabled={isGenerating}>
                                <Plus size={16} />
                                添加新页面
                             </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
