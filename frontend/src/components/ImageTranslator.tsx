'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, ArrowRight, Loader2, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { translateImage, fetchUser, API_BASE_URL, fetchPublicSettings } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { resolveImageUrl } from '@/lib/utils';
import Image from 'next/image';
import { FeatureBanner } from '@/components/FeatureBanner';
import { PromptExportButton } from '@/components/PromptExportButton';

export function ImageTranslator() {
    const [image, setImage] = useState<{ name: string; base64: string; file: File } | null>(null);
    const [sourceLang, setSourceLang] = useState('zh');
    const [targetLang, setTargetLang] = useState('en');
    const [result, setResult] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [cost, setCost] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const { language } = useWorkflowStore();
    const t = useTranslation(language);

    useEffect(() => {
        fetchPublicSettings().then(s => setCost(s.cost_translation || 1));
    }, []);

    const handleDownload = () => {
        try {
            const path = result.replace('Image generated: ', '');
            const url = resolveImageUrl(path);
            if (!url) throw new Error('Invalid image url');
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `translation-${Date.now()}.png`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(`${t('translationFailed')}: ${msg}`);
        }
    };

    const handleFileUpload = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            toast.error(t('uploadImageTip'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setImage({
                    name: file.name,
                    base64: event.target!.result as string,
                    file
                });
            }
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        handleFileUpload(dataTransfer.files);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handleFileUpload]);

    const handleTranslate = async () => {
        const { token } = useAuthStore.getState();
        if (!token) {
             useWorkflowStore.getState().setAuthModalTab('login');
             useWorkflowStore.getState().setAuthModalOpen(true);
             return;
        }

        if (!image) {
            toast.error(t('uploadImageTip'));
            return;
        }

        setIsTranslating(true);
        try {
            const response = await translateImage(image.file, sourceLang, targetLang);
            setResult(response.translated_text);
            toast.success(t('translationCompleted'));
            
            // Update user quota
            try {
                const user = await fetchUser();
                useAuthStore.getState().setUser(user);
            } catch {}
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            toast.error(`${t('translationFailed')}: ${msg}`);
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <FeatureBanner
                title={t('imageTranslation')}
                description={t('imageTranslationDesc')}
                gradient="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-800"
            >
                <div className="relative w-48 h-40 flex items-center justify-center gap-4">
                    <div className="w-16 h-20 bg-white/10 rounded-lg border border-white/10 flex items-center justify-center backdrop-blur-sm -rotate-6 translate-y-2">
                        <span className="text-2xl font-serif text-white/60">A</span>
                    </div>
                    <ArrowRight className="text-white/40 w-6 h-6" />
                    <div className="w-16 h-20 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg border border-white/20 flex items-center justify-center shadow-lg rotate-6 translate-y-2">
                        <span className="text-2xl font-serif text-white">文</span>
                    </div>
                </div>
            </FeatureBanner>

            <div className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-500/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>{t('sourceImage')}</Label>
                            <PromptExportButton 
                                promptType="translator"
                                payload={{
                                    source_lang: sourceLang,
                                    target_lang: targetLang
                                }}
                                disabled={false}
                                variant="ghost"
                                label="复制翻译提示词"
                            />
                        </div>
                        
                        {!image ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-indigo-200 rounded-xl p-8 hover:bg-indigo-50/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 h-64"
                            >
                                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <Upload size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium text-slate-700">{t('clickToUpload')}</p>
                                    <p className="text-sm text-slate-400">PNG, JPG</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative h-64 rounded-xl overflow-hidden border border-indigo-100 group">
                                <Image 
                                    src={image.base64} 
                                    alt="Source" 
                                    fill 
                                    className="object-contain bg-slate-50"
                                />
                                <button 
                                    onClick={() => setImage(null)}
                                    className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white text-slate-500 hover:text-red-500 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden"
                            onChange={(e) => handleFileUpload(e.target.files)}
                        />

                        <div className="flex gap-4 items-center">
                            <div className="flex-1">
                                <Label className="text-xs mb-1.5 block text-slate-500">From</Label>
                                <select 
                                    value={sourceLang}
                                    onChange={(e) => setSourceLang(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value="zh">Chinese</option>
                                    <option value="en">English</option>
                                    <option value="ja">Japanese</option>
                                    <option value="ko">Korean</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                </select>
                            </div>
                            <div className="pt-6 text-slate-400">
                                <ArrowRight size={20} />
                            </div>
                            <div className="flex-1">
                                <Label className="text-xs mb-1.5 block text-slate-500">To</Label>
                                <select 
                                    value={targetLang}
                                    onChange={(e) => setTargetLang(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value="en">English</option>
                                    <option value="zh">Chinese</option>
                                    <option value="ja">Japanese</option>
                                    <option value="ko">Korean</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                </select>
                            </div>
                        </div>

                        <Button 
                            className="w-full" 
                            size="lg"
                            onClick={handleTranslate}
                            disabled={!image || isTranslating}
                        >
                            {isTranslating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('translating')}
                                </>
                            ) : (
                                <>
                                    {t('translate')} <span className="text-xs opacity-80 ml-1">({cost} 积分)</span>
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Output Section */}
                    <div className="space-y-4">
                        <Label>{t('translationResult')}</Label>
                        <div className="relative h-[calc(100%-2rem)] min-h-[16rem] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                            {result.startsWith('Image generated:') ? (
                                <div className="relative w-full h-full group">
                                    <Image 
                                        src={resolveImageUrl(result.replace('Image generated: ', '')) || ''} 
                                        alt="Translated Result" 
                                        fill 
                                        className="object-contain"
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Button onClick={handleDownload} variant="secondary" size="sm" className="gap-2">
                                            <Download size={16} />
                                            {t('downloadImage')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Textarea 
                                    value={result}
                                    readOnly
                                    className="h-full resize-none font-mono text-sm leading-relaxed border-0 bg-transparent focus-visible:ring-0"
                                    placeholder={t('translationResult') + "..."}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
