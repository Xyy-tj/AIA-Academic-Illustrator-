'use client';

import { useState } from 'react';
import { Copy, HelpCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { previewPrompt, fetchHelpGuide } from '@/lib/api';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PromptExportButtonProps {
    promptType: 'ppt' | 'architect' | 'renderer' | 'renderer_ref' | 'translator' | 'extractor';
    payload: any;
    label?: string;
    className?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    disabled?: boolean;
}

export function PromptExportButton({
    promptType,
    payload,
    label = '复制完整提示词',
    className,
    variant = 'ghost',
    size = 'sm',
    disabled = false
}: PromptExportButtonProps) {
    const [helpOpen, setHelpOpen] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [guideTitle, setGuideTitle] = useState('');
    const [loadingGuide, setLoadingGuide] = useState(false);

    const handleCopy = async () => {
        try {
            const { prompt } = await previewPrompt(promptType, payload);
            await navigator.clipboard.writeText(prompt);
            toast.success('提示词已复制到剪贴板');
        } catch (e) {
            toast.error('获取提示词失败');
        }
    };

    const handleOpenHelp = async () => {
        setHelpOpen(true);
        setLoadingGuide(true);
        try {
            // Map promptType to help guide key
            const guideKey = `${promptType.split('_')[0]}_export`; // e.g., ppt_export, architect_export
            const guide = await fetchHelpGuide(guideKey);
            setGuideTitle(guide.title);
            try {
                const imgs = JSON.parse(guide.images);
                setImages(Array.isArray(imgs) ? imgs : []);
            } catch {
                setImages([]);
            }
        } catch {
            setImages([]);
            setGuideTitle('Guide not found');
        } finally {
            setLoadingGuide(false);
        }
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className={cn("flex items-center gap-1", className)}>
            <Button 
                variant={variant} 
                size={size} 
                className="text-xs text-slate-500"
                onClick={handleCopy}
                disabled={disabled}
            >
                <Copy size={12} className="mr-1" />
                {label}
            </Button>
            
            <button 
                onClick={handleOpenHelp}
                className="text-slate-400 hover:text-indigo-500 transition-colors p-1"
                title="查看使用说明"
            >
                <HelpCircle size={14} />
            </button>

            <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl">
                    <div className="relative h-[80vh] flex flex-col">
                        <div className="absolute top-4 right-4 z-50">
                             <button onClick={() => setHelpOpen(false)} className="p-2 bg-black/5 hover:bg-black/10 rounded-full text-slate-500 hover:text-slate-800 transition-colors">
                                <X size={20} />
                             </button>
                        </div>
                        
                        <div className="p-6 pb-0 z-10">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-slate-800">{guideTitle}</DialogTitle>
                                <DialogDescription className="text-sm text-slate-500">将复制的提示词发送给 Gemini 3 Pro (或类似模型) 以生成结果。</DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="flex-1 relative flex items-center justify-center">
                            {loadingGuide ? (
                                <div className="text-slate-400">Loading guide...</div>
                            ) : images.length > 0 ? (
                                <div className="relative w-full h-full flex items-center justify-center p-8">
                                    <div className="relative w-full h-full max-w-5xl">
                                         <Image 
                                            src={images[currentImageIndex]} 
                                            alt={`Guide step ${currentImageIndex + 1}`}
                                            fill
                                            className="object-contain"
                                            unoptimized
                                        />
                                    </div>
                                    
                                    {images.length > 1 && (
                                        <>
                                            <button 
                                                onClick={prevImage}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/60 hover:bg-white/80 text-slate-700 shadow-lg border border-white/50 transition-all backdrop-blur-md"
                                            >
                                                <ChevronLeft size={24} />
                                            </button>
                                            <button 
                                                onClick={nextImage}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/60 hover:bg-white/80 text-slate-700 shadow-lg border border-white/50 transition-all backdrop-blur-md"
                                            >
                                                <ChevronRight size={24} />
                                            </button>
                                            
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                                {images.map((_, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className={cn(
                                                            "w-2 h-2 rounded-full transition-all shadow-sm",
                                                            idx === currentImageIndex ? "bg-indigo-600 w-4" : "bg-slate-300"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="text-slate-400 flex flex-col items-center gap-2">
                                    <HelpCircle size={48} className="opacity-20" />
                                    <p>No guide images available.</p>
                                    <p className="text-xs opacity-50">Please contact admin to configure help guide.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
