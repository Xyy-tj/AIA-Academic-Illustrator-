'use client';

import { useEffect, useState, useRef } from 'react';
import {
    fetchReferenceLibrary,
    fetchSchemaTemplates,
    adminCreateReference,
    adminUpdateReference,
    adminDeleteReference,
    adminCreateTemplate,
    adminUpdateTemplate,
    adminDeleteTemplate,
    ReferenceItem,
    SchemaTemplateItem,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Trash2, Plus, Save, Image as ImageIcon, FileCode, GripVertical } from 'lucide-react';

export default function LibraryAdminPage() {
    const { user } = useAuthStore();
    const [references, setReferences] = useState<ReferenceItem[]>([]);
    const [templates, setTemplates] = useState<SchemaTemplateItem[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Template Creation State
    const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [newTemplateContent, setNewTemplateContent] = useState('');
    const [newTemplateLayout, setNewTemplateLayout] = useState('');
    const [creatingTemplate, setCreatingTemplate] = useState(false);

    useEffect(() => {
        if (!user || !user.is_admin) return;
        loadData();
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [refs, tpls] = await Promise.all([
                fetchReferenceLibrary(),
                fetchSchemaTemplates(),
            ]);
            setReferences(refs);
            setTemplates(tpls);
        } catch (e) {
            toast.error('Failed to load library');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                const created = await adminCreateReference({
                    title: file.name,
                    description: '',
                    image_data: base64,
                    tags: [],
                    order: references.length,
                });
                setReferences((prev) => [...prev, created]);
                toast.success('Reference uploaded');
            } catch {
                toast.error('Upload failed');
            }
        };
        reader.readAsDataURL(file);
    };

    const updateReferenceField = async (id: number, patch: Partial<ReferenceItem>) => {
        try {
            const updated = await adminUpdateReference(id, patch);
            setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
            toast.success('Updated');
        } catch {
            toast.error('Update failed');
        }
    };

    const deleteReference = async (id: number) => {
        if (!confirm('Are you sure you want to delete this reference image?')) return;
        try {
            await adminDeleteReference(id);
            setReferences((prev) => prev.filter((r) => r.id !== id));
            toast.success('Deleted');
        } catch {
            toast.error('Delete failed');
        }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplateTitle.trim() || !newTemplateContent.trim()) {
            toast.error('Title and Content are required');
            return;
        }
        setCreatingTemplate(true);
        try {
            const created = await adminCreateTemplate({
                title: newTemplateTitle,
                layout: newTemplateLayout,
                content: newTemplateContent,
                order: templates.length,
            });
            setTemplates((prev) => [...prev, created]);
            toast.success('Template created');
            setIsCreateTemplateOpen(false);
            setNewTemplateTitle('');
            setNewTemplateContent('');
            setNewTemplateLayout('');
        } catch {
            toast.error('Create failed');
        } finally {
            setCreatingTemplate(false);
        }
    };

    const updateTemplateField = async (id: number, patch: Partial<SchemaTemplateItem>) => {
        try {
            const updated = await adminUpdateTemplate(id, patch);
            setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
            toast.success('Updated');
        } catch {
            toast.error('Update failed');
        }
    };

    const deleteTemplate = async (id: number) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await adminDeleteTemplate(id);
            setTemplates((prev) => prev.filter((t) => t.id !== id));
            toast.success('Deleted');
        } catch {
            toast.error('Delete failed');
        }
    };

    const reorder = async <T extends { id: number; order: number }>(
        items: T[],
        setItems: React.Dispatch<React.SetStateAction<T[]>>,
        update: (id: number, patch: Partial<T>) => Promise<unknown>
    ) => {
        const sorted = [...items].sort((a, b) => a.order - b.order);
        // This simple reorder just saves the current sorted state as order indices
        // Ideally we would have drag and drop, but for now we just rely on manual order input and then "Save Order" to normalize
        sorted.forEach((item, index) => (item.order = index));
        setItems(sorted);
        for (const item of sorted) {
            await update(item.id, { order: item.order } as Partial<T>);
        }
        toast.success('Order normalized and saved');
    };

    if (loading) return <div className="p-8">Loading library...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Reference Library</h1>
                <p className="text-slate-500">Manage reference images and schema templates for the AI.</p>
            </div>

            <Tabs defaultValue="images" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-6">
                    <TabsTrigger value="images" className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Reference Images
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="flex items-center gap-2">
                        <FileCode className="w-4 h-4" />
                        Schema Templates
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="images" className="space-y-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleUploadReference}
                            />
                            <Button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 hover:bg-indigo-700">
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Reference
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => reorder(references, setReferences, (id, patch) => adminUpdateReference(id, patch))}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Normalize Order
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {references.sort((a, b) => a.order - b.order).map((ref) => (
                            <Card key={ref.id} className="group overflow-hidden hover:shadow-md transition-all">
                                <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
                                    <img 
                                        src={ref.image_data} 
                                        alt={ref.title} 
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button variant="destructive" size="sm" onClick={() => deleteReference(ref.id)}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                                <CardContent className="p-4 space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500">Title</Label>
                                        <Input
                                            value={ref.title}
                                            onChange={(e) => updateReferenceField(ref.id, { title: e.target.value })}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500">Description</Label>
                                        <Textarea
                                            value={ref.description || ''}
                                            onChange={(e) => updateReferenceField(ref.id, { description: e.target.value })}
                                            className="h-16 text-xs resize-none"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs text-slate-500">Order</Label>
                                            <Input
                                                type="number"
                                                className="w-16 h-7 text-xs"
                                                value={ref.order}
                                                onChange={(e) => updateReferenceField(ref.id, { order: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="templates" className="space-y-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-indigo-600 hover:bg-indigo-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Template
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Create New Schema Template</DialogTitle>
                                    <DialogDescription>Define a reusable schema structure.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Title</Label>
                                            <Input 
                                                value={newTemplateTitle}
                                                onChange={(e) => setNewTemplateTitle(e.target.value)}
                                                placeholder="e.g. Bar Chart Template"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Layout (Optional)</Label>
                                            <Input 
                                                value={newTemplateLayout}
                                                onChange={(e) => setNewTemplateLayout(e.target.value)}
                                                placeholder="e.g. 1x1, 2x2"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Content (JSON Schema / Text)</Label>
                                        <Textarea 
                                            value={newTemplateContent}
                                            onChange={(e) => setNewTemplateContent(e.target.value)}
                                            placeholder="{ ... }"
                                            className="font-mono text-sm h-64"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateTemplate} disabled={creatingTemplate}>
                                        {creatingTemplate ? 'Creating...' : 'Create Template'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button
                            variant="outline"
                            onClick={() => reorder(templates, setTemplates, (id, patch) => adminUpdateTemplate(id, patch))}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Normalize Order
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {templates.sort((a, b) => a.order - b.order).map((tpl) => (
                            <Card key={tpl.id} className="group hover:shadow-md transition-all border-slate-200">
                                <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 mr-4">
                                            <Input
                                                value={tpl.title}
                                                onChange={(e) => updateTemplateField(tpl.id, { title: e.target.value })}
                                                className="font-semibold bg-transparent border-none shadow-none focus-visible:ring-0 px-0 h-auto text-lg"
                                            />
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteTemplate(tpl.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-500">Layout</Label>
                                            <Input
                                                className="h-8 text-sm"
                                                placeholder="Layout"
                                                value={tpl.layout || ''}
                                                onChange={(e) => updateTemplateField(tpl.id, { layout: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-500">Order</Label>
                                            <Input
                                                type="number"
                                                className="h-8 text-sm"
                                                value={tpl.order}
                                                onChange={(e) => updateTemplateField(tpl.id, { order: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500">Content</Label>
                                        <Textarea
                                            className="font-mono text-xs h-48 resize-none bg-slate-50"
                                            value={tpl.content}
                                            onChange={(e) => updateTemplateField(tpl.id, { content: e.target.value })}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
