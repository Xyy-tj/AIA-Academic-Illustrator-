'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, X, Download, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { extractElements, fetchUser, fetchPublicSettings } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { resolveImageUrl } from '@/lib/utils';
import Image from 'next/image';
import { FeatureBanner } from '@/components/FeatureBanner';
import { PromptExportButton } from '@/components/PromptExportButton';

export function ImageExtractor() {
    const [image, setImage] = useState<{ name: string; base64: string; file: File } | null>(null);
    const [result, setResult] = useState('');
    const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [cost, setCost] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    
    const { language, setSuperResolutionImage, setActiveTab } = useWorkflowStore();
    const t = useTranslation(language);
    const { logout } = useAuthStore();

    useEffect(() => {
        fetchPublicSettings().then(s => setCost(s.cost_extraction || 1));
    }, []);

    const handleDownload = () => {
        if (!resultImageUrl) return;
        try {
            const url = resolveImageUrl(resultImageUrl);
            if (!url) throw new Error('Invalid image url');
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `extraction-${Date.now()}.png`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(`${t('extractionFailed')}: ${msg}`);
        }
    };

    const handleToSuperResolution = () => {
        if (!resultImageUrl) return;
        setSuperResolutionImage(resultImageUrl);
        setActiveTab('super-resolution');
        router.push('/tools/enhance');
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
                // Reset previous results
                setResult('');
                setResultImageUrl(null);
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

    const handleExtract = async () => {
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

        setIsExtracting(true);
        try {
            const response = await extractElements(image.file);
            setResult(response.result_text);
            if (response.image_url) {
                setResultImageUrl(response.image_url);
            }
            toast.success(t('extractionCompleted'));
            
            // Update user quota
            try {
                const user = await fetchUser();
                useAuthStore.getState().setUser(user);
            } catch {}
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg === 'UNAUTHORIZED' || (error as any).status === 401) {
                toast.error(t('unauthorized'));
                logout();
            } else {
                toast.error(`${t('extractionFailed')}: ${msg}`);
            }
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <FeatureBanner
                title={t('imageExtraction')}
                description={t('imageExtractionDesc')}
                gradient="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800"
            >
                <div className="relative w-48 h-40 flex items-center justify-center">
                    <div className="absolute w-32 h-24 bg-white/10 rounded-lg border border-white/10 rotate-[-6deg] translate-y-2 backdrop-blur-sm" />
                    <div className="absolute w-32 h-24 bg-white/20 rounded-lg border border-white/20 rotate-[-3deg] translate-y-1 backdrop-blur-md" />
                    <div className="absolute w-32 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg border border-white/30 shadow-xl flex items-center justify-center rotate-0 transition-transform hover:scale-105">
                        <Layers className="text-white w-10 h-10 drop-shadow-md" />
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
                                promptType="extractor"
                                payload={{}}
                                disabled={false}
                                variant="ghost"
                                label="复制提取提示词"
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
                                    onClick={() => { setImage(null); setResult(''); setResultImageUrl(null); }}
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

                        <Button 
                            className="w-full" 
                            size="lg"
                            onClick={handleExtract}
                            disabled={!image || isExtracting}
                        >
                            {isExtracting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('extracting')}
                                </>
                            ) : (
                                <>
                                    {t('extract')} <span className="text-xs opacity-80 ml-1">({cost} 积分)</span>
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Output Section */}
                    <div className="space-y-4">
                        <Label>{t('extractionResult')}</Label>
                        <div className="relative h-[calc(100%-2rem)] min-h-[16rem] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                            {resultImageUrl ? (
                                <div className="relative w-full h-full group">
                                    <Image 
                                        src={resolveImageUrl(resultImageUrl) || ''} 
                                        alt="Extraction Result" 
                                        fill 
                                        className="object-contain"
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                                        <Button onClick={handleToSuperResolution} variant="secondary" size="sm" className="gap-2">
                                            <span className="text-xs font-bold">HD</span>
                                            {t('superResolution')}
                                        </Button>
                                        <Button onClick={handleDownload} variant="secondary" size="sm" className="gap-2">
                                            <Download size={16} />
                                            {t('downloadImage')}
                                        </Button>
                                    </div>
                                </div>
                            ) : result ? (
                                <Textarea 
                                    value={result}
                                    readOnly
                                    className="h-full resize-none font-mono text-sm leading-relaxed border-0 bg-transparent focus-visible:ring-0"
                                    placeholder={t('extractionResult') + "..."}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    {t('noImage')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
