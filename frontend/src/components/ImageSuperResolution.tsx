'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, X, Download, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { superResolution, uploadFile, fetchUser, fetchPublicSettings } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { resolveImageUrl } from '@/lib/utils';
import Image from 'next/image';
import { FeatureBanner } from '@/components/FeatureBanner';

export function ImageSuperResolution() {
    const { language, superResolutionImage, setSuperResolutionImage } = useWorkflowStore();
    const t = useTranslation(language);
    const { logout } = useAuthStore();

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [cost, setCost] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize from store
    useEffect(() => {
        fetchPublicSettings().then(s => setCost(s.cost_super_resolution || 1));
        if (superResolutionImage) {
            setImageUrl(superResolutionImage);
            // Clear result if source changed (though store usually means new session)
            setResultImageUrl(null);
        }
    }, [superResolutionImage]);

    const handleDownload = () => {
        if (!resultImageUrl) return;
        try {
            const url = resolveImageUrl(resultImageUrl);
            if (!url) throw new Error('Invalid image url');
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `super-res-${Date.now()}.png`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(`Download failed: ${msg}`);
        }
    };

    const handleEnhance = async () => {
        const { token } = useAuthStore.getState();
        if (!token) {
             useWorkflowStore.getState().setAuthModalTab('login');
             useWorkflowStore.getState().setAuthModalOpen(true);
             return;
        }

        if (!imageUrl) return;
        
        setIsEnhancing(true);
        try {
            const response = await superResolution(imageUrl);
            if (response.image_url) {
                setResultImageUrl(response.image_url);
                toast.success(t('superResolutionCompleted'));
                
                // Update user quota
                try {
                    const user = await fetchUser();
                    useAuthStore.getState().setUser(user);
                } catch {}
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg === 'UNAUTHORIZED' || (error as any).status === 401) {
                toast.error(t('unauthorized'));
                logout();
            } else {
                toast.error(`${t('superResolutionFailed')}: ${msg}`);
            }
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            toast.error(t('uploadImageTip'));
            return;
        }

        setIsUploading(true);
        try {
            const response = await uploadFile(file);
            setImageUrl(response.url);
            setResultImageUrl(null);
            // Update store so it persists if we switch tabs? 
            // Maybe not strictly necessary to sync *back* to store if we just want local state, 
            // but consistency is good.
            setSuperResolutionImage(response.url);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            toast.error(`Upload failed: ${msg}`);
        } finally {
            setIsUploading(false);
        }
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

    const clearImage = () => {
        setImageUrl(null);
        setResultImageUrl(null);
        setSuperResolutionImage(null);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <FeatureBanner
                title={t('superResolution')}
                description={t('superResolutionDesc')}
            >
                <div className="relative w-64 h-40 bg-indigo-900/20 rounded-xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-sm">
                    <div className="absolute inset-0 grid grid-cols-2">
                        <div className="relative bg-slate-900/50 flex items-center justify-center border-r border-white/10">
                            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:4px_4px] opacity-30" />
                            <span className="relative z-10 text-xs font-mono text-white/60 bg-black/40 px-2 py-1 rounded">SD</span>
                        </div>
                        <div className="relative bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                             <span className="relative z-10 text-xs font-bold text-white bg-indigo-500 px-2 py-1 rounded shadow-lg">HD</span>
                        </div>
                    </div>
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg text-indigo-600">
                            <Wand2 size={12} />
                        </div>
                    </div>
                </div>
            </FeatureBanner>

            <div className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-500/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <div className="space-y-4">
                        <Label>{t('sourceImage')}</Label>
                        
                        {!imageUrl ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-indigo-200 rounded-xl p-8 hover:bg-indigo-50/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 h-64"
                            >
                                {isUploading ? (
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <Upload size={24} />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium text-slate-700">{t('clickToUpload')}</p>
                                            <p className="text-sm text-slate-400">PNG, JPG</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="relative h-64 rounded-xl overflow-hidden border border-indigo-100 group">
                                <Image 
                                    src={resolveImageUrl(imageUrl) || ''} 
                                    alt="Source" 
                                    fill 
                                    className="object-contain bg-slate-50"
                                    unoptimized
                                />
                                <button 
                                    onClick={clearImage}
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
                            onClick={handleEnhance}
                            disabled={!imageUrl || isEnhancing || isUploading}
                        >
                            {isEnhancing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('enhancing')}
                                </>
                            ) : (
                                <>
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    {t('enhance')} <span className="text-xs opacity-80 ml-1">({cost} 积分)</span>
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Output Section */}
                    <div className="space-y-4">
                        <Label>{t('superResolutionResult')}</Label>
                        <div className="relative h-[calc(100%-2rem)] min-h-[16rem] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                            {resultImageUrl ? (
                                <div className="relative w-full h-full group">
                                    <Image 
                                        src={resolveImageUrl(resultImageUrl) || ''} 
                                        alt="Result" 
                                        fill 
                                        className="object-contain"
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                                        <Button onClick={handleDownload} variant="secondary" size="sm" className="gap-2">
                                            <Download size={16} />
                                            {t('downloadImage')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    {isEnhancing ? t('enhancing') : t('noImage')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
