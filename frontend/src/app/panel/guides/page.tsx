'use client';

import { useEffect, useState } from 'react';
import {
    fetchHelpGuides,
    updateHelpGuide,
    HelpGuide,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Plus, X } from 'lucide-react';

export default function HelpGuidesAdminPage() {
    const { user } = useAuthStore();
    const [guides, setGuides] = useState<HelpGuide[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !user.is_admin) return;
        loadData();
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchHelpGuides();
            setGuides(data);
        } catch (e) {
            toast.error('Failed to load guides');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (guide: HelpGuide, images: string[]) => {
        try {
            const updated = await updateHelpGuide(guide.key, {
                title: guide.title,
                images: JSON.stringify(images)
            });
            setGuides(prev => prev.map(g => g.key === guide.key ? updated : g));
            toast.success('Guide updated');
        } catch {
            toast.error('Update failed');
        }
    };

    const addImage = (guide: HelpGuide, url: string) => {
        if (!url) return;
        try {
            const currentImages = JSON.parse(guide.images || '[]');
            const newImages = [...currentImages, url];
            handleUpdate(guide, newImages);
        } catch {
            handleUpdate(guide, [url]);
        }
    };

    const removeImage = (guide: HelpGuide, index: number) => {
        try {
            const currentImages = JSON.parse(guide.images || '[]');
            const newImages = currentImages.filter((_: any, i: number) => i !== index);
            handleUpdate(guide, newImages);
        } catch {}
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Help Guides</h1>
                <p className="text-slate-500">Manage screenshots and instructions for the prompt export help feature.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {guides.map((guide) => {
                    let images: string[] = [];
                    try {
                        images = JSON.parse(guide.images || '[]');
                    } catch {}

                    return (
                        <Card key={guide.key} className="border-slate-200">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-lg">{guide.title}</h3>
                                    <code className="text-xs text-slate-400">{guide.key}</code>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div>
                                    <Label>Screenshots (URLs)</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative group aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                                <img src={img} alt={`Step ${idx + 1}`} className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => removeImage(guide, idx)}
                                                    className="absolute top-1 right-1 p-1 bg-white rounded-full text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={14} />
                                                </button>
                                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded">
                                                    {idx + 1}
                                                </span>
                                            </div>
                                        ))}
                                        
                                        <div className="aspect-video bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-2 gap-2">
                                            <Input 
                                                id={`new-img-${guide.key}`}
                                                placeholder="Image URL" 
                                                className="h-8 text-xs"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        addImage(guide, e.currentTarget.value);
                                                        e.currentTarget.value = '';
                                                    }
                                                }}
                                            />
                                            <Button 
                                                size="sm" 
                                                variant="secondary" 
                                                className="w-full h-7 text-xs"
                                                onClick={() => {
                                                    const input = document.getElementById(`new-img-${guide.key}`) as HTMLInputElement;
                                                    addImage(guide, input.value);
                                                    input.value = '';
                                                }}
                                            >
                                                <Plus size={14} className="mr-1" /> Add
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
