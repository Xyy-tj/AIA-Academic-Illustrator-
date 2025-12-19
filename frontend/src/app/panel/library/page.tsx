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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Trash2 } from 'lucide-react';

export default function LibraryAdminPage() {
    const { user } = useAuthStore();
    const [references, setReferences] = useState<ReferenceItem[]>([]);
    const [templates, setTemplates] = useState<SchemaTemplateItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user || !user.is_admin) return;
        (async () => {
            try {
                const [refs, tpls] = await Promise.all([
                    fetchReferenceLibrary(),
                    fetchSchemaTemplates(),
                ]);
                setReferences(refs);
                setTemplates(tpls);
            } catch (e) {
                toast.error('Failed to load library');
            }
        })();
    }, [user]);

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
        try {
            await adminDeleteReference(id);
            setReferences((prev) => prev.filter((r) => r.id !== id));
            toast.success('Deleted');
        } catch {
            toast.error('Delete failed');
        }
    };

    const createTemplate = async () => {
        const title = prompt('Template Title') || '';
        if (!title) return;
        const content = prompt('Template Content (Golden Schema)') || '';
        if (!content) return;
        try {
            const created = await adminCreateTemplate({
                title,
                layout: '',
                content,
                order: templates.length,
            });
            setTemplates((prev) => [...prev, created]);
            toast.success('Template created');
        } catch {
            toast.error('Create failed');
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
        sorted.forEach((item, index) => (item.order = index));
        setItems(sorted);
        for (const item of sorted) {
            await update(item.id, { order: item.order } as Partial<T>);
        }
        toast.success('Order updated');
    };

    if (!user || !user.is_admin) {
        return <div className="p-6">Admin only</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Reference Images</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleUploadReference}
                            />
                            <Button onClick={() => fileInputRef.current?.click()}>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Reference
                            </Button>
                            <Button
                                variant="outline"
                                className="ml-2"
                                onClick={() => reorder(references, setReferences, (id, patch) => adminUpdateReference(id, patch))}
                            >
                                Save Order
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {references.map((ref, idx) => (
                                <div key={ref.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                    <img src={ref.image_data} alt={ref.title} className="w-full h-28 object-cover" />
                                    <div className="p-2">
                                        <Input
                                            value={ref.title}
                                            onChange={(e) => updateReferenceField(ref.id, { title: e.target.value })}
                                        />
                                        <Textarea
                                            className="mt-2"
                                            value={ref.description || ''}
                                            onChange={(e) => updateReferenceField(ref.id, { description: e.target.value })}
                                        />
                                        <div className="flex items-center justify-between mt-2">
                                            <Input
                                                type="number"
                                                className="w-24"
                                                value={ref.order}
                                                onChange={(e) => updateReferenceField(ref.id, { order: Number(e.target.value) })}
                                            />
                                            <Button variant="destructive" size="sm" onClick={() => deleteReference(ref.id)}>
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Schema Templates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <Button onClick={createTemplate}>New Template</Button>
                            <Button
                                variant="outline"
                                className="ml-2"
                                onClick={() => reorder(templates, setTemplates, (id, patch) => adminUpdateTemplate(id, patch))}
                            >
                                Save Order
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {templates.map((tpl) => (
                                <div key={tpl.id} className="border border-slate-200 rounded-lg p-3">
                                    <Input
                                        value={tpl.title}
                                        onChange={(e) => updateTemplateField(tpl.id, { title: e.target.value })}
                                    />
                                    <Input
                                        className="mt-2"
                                        placeholder="Layout"
                                        value={tpl.layout || ''}
                                        onChange={(e) => updateTemplateField(tpl.id, { layout: e.target.value })}
                                    />
                                    <Textarea
                                        className="mt-2 font-mono text-xs"
                                        rows={6}
                                        value={tpl.content}
                                        onChange={(e) => updateTemplateField(tpl.id, { content: e.target.value })}
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                        <Input
                                            type="number"
                                            className="w-24"
                                            value={tpl.order}
                                            onChange={(e) => updateTemplateField(tpl.id, { order: Number(e.target.value) })}
                                        />
                                        <Button variant="destructive" size="sm" onClick={() => deleteTemplate(tpl.id)}>
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
