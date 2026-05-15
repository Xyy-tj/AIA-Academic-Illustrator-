'use client';

import { useEffect, useState } from 'react';
import {
    fetchPPTStyles,
    createPPTStyle,
    updatePPTStyle,
    deletePPTStyle,
    PPTStyle,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, Plus, Save } from 'lucide-react';

export default function PPTStylesAdminPage() {
    const { user } = useAuthStore();
    const [styles, setStyles] = useState<PPTStyle[]>([]);
    const [loading, setLoading] = useState(true);

    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newStyle, setNewStyle] = useState<Partial<PPTStyle>>({
        name: '',
        description: '',
        prompt_suffix: '',
        order: 0,
        is_active: true
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!user || !user.is_admin) return;
        loadData();
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchPPTStyles();
            setStyles(data);
        } catch (e) {
            toast.error('Failed to load styles');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newStyle.name || !newStyle.prompt_suffix) {
            toast.error('Name and Prompt Suffix are required');
            return;
        }
        setCreating(true);
        try {
            const created = await createPPTStyle({
                name: newStyle.name!,
                description: newStyle.description,
                prompt_suffix: newStyle.prompt_suffix!,
                is_active: newStyle.is_active ?? true,
                order: styles.length,
                preview_image_url: newStyle.preview_image_url
            });
            setStyles(prev => [...prev, created]);
            toast.success('Style created');
            setIsCreateOpen(false);
            setNewStyle({ name: '', description: '', prompt_suffix: '', order: 0, is_active: true });
        } catch {
            toast.error('Create failed');
        } finally {
            setCreating(false);
        }
    };

    const updateField = async (id: number, patch: Partial<PPTStyle>) => {
        try {
            const updated = await updatePPTStyle(id, patch);
            setStyles(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
            toast.success('Updated');
        } catch {
            toast.error('Update failed');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this style?')) return;
        try {
            await deletePPTStyle(id);
            setStyles(prev => prev.filter(s => s.id !== id));
            toast.success('Deleted');
        } catch {
            toast.error('Delete failed');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">PPT Styles</h1>
                <p className="text-slate-500">Manage visual styles for PPT generation.</p>
            </div>

            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-2" />
                            New Style
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create New PPT Style</DialogTitle>
                            <DialogDescription>Define a new visual style prompt.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input 
                                        value={newStyle.name}
                                        onChange={(e) => setNewStyle({...newStyle, name: e.target.value})}
                                        placeholder="e.g. Tech Minimal"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input 
                                        value={newStyle.description}
                                        onChange={(e) => setNewStyle({...newStyle, description: e.target.value})}
                                        placeholder="Short description"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Prompt Suffix</Label>
                                <Textarea 
                                    value={newStyle.prompt_suffix}
                                    onChange={(e) => setNewStyle({...newStyle, prompt_suffix: e.target.value})}
                                    placeholder="Enter the style instructions..."
                                    className="h-32"
                                />
                                <p className="text-xs text-slate-500">This text will be appended to the prompt.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={creating}>
                                {creating ? 'Creating...' : 'Create Style'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {styles.sort((a, b) => a.order - b.order).map((style) => (
                    <Card key={style.id} className="group hover:shadow-md transition-all border-slate-200">
                        <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 mr-4">
                                    <Input
                                        value={style.name}
                                        onChange={(e) => updateField(style.id, { name: e.target.value })}
                                        className="font-semibold bg-transparent border-none shadow-none focus-visible:ring-0 px-0 h-auto text-lg"
                                    />
                                </div>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(style.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Description</Label>
                                <Input
                                    className="h-8 text-sm"
                                    value={style.description || ''}
                                    onChange={(e) => updateField(style.id, { description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Prompt Suffix</Label>
                                <Textarea
                                    className="text-xs h-32 resize-none bg-slate-50"
                                    value={style.prompt_suffix}
                                    onChange={(e) => updateField(style.id, { prompt_suffix: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-slate-500">Order</Label>
                                <Input
                                    type="number"
                                    className="w-16 h-7 text-xs"
                                    value={style.order}
                                    onChange={(e) => updateField(style.id, { order: Number(e.target.value) })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
