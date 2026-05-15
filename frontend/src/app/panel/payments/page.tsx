'use client';

import { useEffect, useState } from 'react';
import { fetchSettings, updateSettings, SystemSettings, fetchRedemptionCodes, createRedemptionCodes, deleteRedemptionCode, RedemptionCode } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, RefreshCcw, CreditCard, Wallet, Link as LinkIcon, Coins, Trash2, Copy, Plus, Ticket } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function RedemptionCodesManager() {
    const [codes, setCodes] = useState<RedemptionCode[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    
    // Create form state
    const [type, setType] = useState<'once' | 'repeat'>('once');
    const [quota, setQuota] = useState(10);
    const [count, setCount] = useState(1);
    const [codeStr, setCodeStr] = useState("");
    
    const loadCodes = async () => {
        setLoading(true);
        try {
            const data = await fetchRedemptionCodes();
            setCodes(data);
        } catch (err) {
            toast.error('Failed to load codes');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        loadCodes();
    }, []);
    
    const handleCreate = async () => {
        try {
            await createRedemptionCodes({
                type,
                quota,
                count: type === 'once' ? count : undefined,
                code_str: type === 'repeat' ? codeStr : undefined
            });
            toast.success('Codes created');
            setOpen(false);
            loadCodes();
        } catch (err) {
            toast.error('Failed to create codes');
        }
    };
    
    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await deleteRedemptionCode(id);
            toast.success('Code deleted');
            setCodes(codes.filter(c => c.id !== id));
        } catch (err) {
            toast.error('Failed to delete');
        }
    };
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied');
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-indigo-500" />
                        Redemption Codes
                    </CardTitle>
                    <CardDescription>Manage promotional and recharge codes</CardDescription>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Create Codes
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Redemption Codes</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={type} onValueChange={(v: any) => setType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="once">One-time Use (Unique)</SelectItem>
                                        <SelectItem value="repeat">Reusable (Common Code)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Quota Amount</Label>
                                <Input type="number" value={quota} onChange={e => setQuota(Number(e.target.value))} />
                            </div>
                            
                            {type === 'once' ? (
                                <div className="space-y-2">
                                    <Label>Quantity to Generate</Label>
                                    <Input type="number" value={count} onChange={e => setCount(Number(e.target.value))} />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Code String</Label>
                                    <Input value={codeStr} onChange={e => setCodeStr(e.target.value)} placeholder="e.g. WELCOME2024" />
                                </div>
                            )}
                            
                            <Button onClick={handleCreate} className="w-full">Generate</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Quota</TableHead>
                                <TableHead>Used</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {codes.map((code) => (
                                <TableRow key={code.id}>
                                    <TableCell className="font-mono">
                                        <div className="flex items-center gap-2">
                                            {code.code}
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(code.code)}>
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>{code.type === 'once' ? 'One-time' : 'Reusable'}</TableCell>
                                    <TableCell>{code.quota}</TableCell>
                                    <TableCell>{code.used_count} {code.max_uses > 0 ? `/ ${code.max_uses}` : ''}</TableCell>
                                    <TableCell>{new Date(code.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(code.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {codes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        No codes found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AdminPaymentsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const { language } = useWorkflowStore();
  const t = useTranslation(language);

  const loadSettings = async () => {
    try {
        setLoading(true);
        const s = await fetchSettings();
        setSettings(s);
    } catch (_err) {
        toast.error('Failed to load settings');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !user.is_admin) return;
    loadSettings();
  }, [user]);

  const handleSave = async () => {
    if (!settings) return;
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      toast.success('Payment settings saved');
    } catch (_err) {
      toast.error('Failed to save settings');
    }
  };

  if (!settings && loading) {
    return <div className="p-8 text-center text-slate-500">{t('loadingPaymentSettings')}</div>;
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('paymentConfiguration')}</h1>
          <p className="text-slate-500">{t('paymentConfigDescDetailed')}</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={loadSettings} disabled={loading}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                {t('refresh')}
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                {t('saveChanges')}
            </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[750px] mb-8">
          <TabsTrigger value="general">{t('general')}</TabsTrigger>
          <TabsTrigger value="pricing">{t('pricing')}</TabsTrigger>
          <TabsTrigger value="codes">{t('redemptionCodes')}</TabsTrigger>
          <TabsTrigger value="epay">{t('epay')}</TabsTrigger>
          <TabsTrigger value="hupi">{t('hupi')}</TabsTrigger>
        </TabsList>

        {/* General Payment Settings */}
        <TabsContent value="general" className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-indigo-500" />
                        <CardTitle>{t('paymentProvider')}</CardTitle>
                    </div>
                    <CardDescription>{t('paymentProviderDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>{t('activeProvider')}</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={settings.pay_provider || 'epay'}
                                onChange={(e) => setSettings({ ...settings!, pay_provider: e.target.value as 'epay' | 'hupi' })}
                            >
                                <option value="epay">{t('epayName')}</option>
                                <option value="hupi">{t('hupiName')}</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('rechargeRatio')}</Label>
                            <Input 
                                type="number" 
                                value={settings.recharge_ratio ?? 1} 
                                onChange={(e) => setSettings({ ...settings!, recharge_ratio: Number(e.target.value) })} 
                            />
                            <p className="text-xs text-slate-500">{t('rechargeRatioDesc')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* Pricing Settings */}
        <TabsContent value="pricing" className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-indigo-500" />
                        <CardTitle>{t('featurePricing')}</CardTitle>
                    </div>
                    <CardDescription>{t('featurePricingDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label>{t('schemaGenerationStep1')}</Label>
                            <Input 
                                type="number" 
                                min={0}
                                value={settings.cost_schema_generation ?? 1} 
                                onChange={(e) => setSettings({ ...settings!, cost_schema_generation: Number(e.target.value) })} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('imageRenderingStep3')}</Label>
                            <Input 
                                type="number" 
                                min={0}
                                value={settings.cost_image_rendering ?? 1} 
                                onChange={(e) => setSettings({ ...settings!, cost_image_rendering: Number(e.target.value) })} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('elementExtraction')}</Label>
                            <Input 
                                type="number" 
                                min={0}
                                value={settings.cost_extraction ?? 1} 
                                onChange={(e) => setSettings({ ...settings!, cost_extraction: Number(e.target.value) })} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('imageTranslation')}</Label>
                            <Input 
                                type="number" 
                                min={0}
                                value={settings.cost_translation ?? 1} 
                                onChange={(e) => setSettings({ ...settings!, cost_translation: Number(e.target.value) })} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('superResolution')}</Label>
                            <Input 
                                type="number" 
                                min={0}
                                value={settings.cost_super_resolution ?? 2} 
                                onChange={(e) => setSettings({ ...settings!, cost_super_resolution: Number(e.target.value) })} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('pptGenerator')}</Label>
                            <Input 
                                type="number" 
                                min={0}
                                value={settings.cost_ppt_generation ?? 2} 
                                onChange={(e) => setSettings({ ...settings!, cost_ppt_generation: Number(e.target.value) })} 
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="codes" className="space-y-6">
            <RedemptionCodesManager />
        </TabsContent>

        {/* EPay Config */}
        <TabsContent value="epay" className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-500" />
                        <CardTitle>{t('epayConfiguration')}</CardTitle>
                    </div>
                    <CardDescription>{t('epayConfigDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('apiUrl')}</Label>
                        <Input value={settings.epay_api_url || ''} onChange={(e) => setSettings({ ...settings!, epay_api_url: e.target.value })} placeholder="https://pay.example.com/" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('merchantPid')}</Label>
                            <Input value={settings.epay_pid || ''} onChange={(e) => setSettings({ ...settings!, epay_pid: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('merchantKey')}</Label>
                            <Input type="password" value={settings.epay_key || ''} onChange={(e) => setSettings({ ...settings!, epay_key: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('returnUrl')}</Label>
                            <Input value={settings.epay_return_url || ''} onChange={(e) => setSettings({ ...settings!, epay_return_url: e.target.value })} placeholder="Frontend return URL" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('notifyUrl')}</Label>
                            <Input value={settings.epay_notify_url || ''} onChange={(e) => setSettings({ ...settings!, epay_notify_url: e.target.value })} placeholder="Backend notify URL" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* Hupi Config */}
        <TabsContent value="hupi" className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-500" />
                        <CardTitle>{t('hupiConfiguration')}</CardTitle>
                    </div>
                    <CardDescription>{t('hupiConfigDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('appId')}</Label>
                            <Input value={settings.hupi_appid || ''} onChange={(e) => setSettings({ ...settings!, hupi_appid: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('appSecret')}</Label>
                            <Input type="password" value={settings.hupi_appsecret || ''} onChange={(e) => setSettings({ ...settings!, hupi_appsecret: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('returnUrl')}</Label>
                            <Input value={settings.hupi_return_url || ''} onChange={(e) => setSettings({ ...settings!, hupi_return_url: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('notifyUrl')}</Label>
                            <Input value={settings.hupi_notify_url || ''} onChange={(e) => setSettings({ ...settings!, hupi_notify_url: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('callbackUrl')}</Label>
                        <Input value={settings.hupi_callback_url || ''} onChange={(e) => setSettings({ ...settings!, hupi_callback_url: e.target.value })} />
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start gap-2 text-sm text-slate-600 mt-2">
                        <LinkIcon className="w-4 h-4 mt-0.5 text-indigo-500" />
                        <p>Recommended backend notify endpoint: <code className="bg-slate-200 px-1 rounded text-xs">/api/pay/hupi/notify</code></p>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Forced update to trigger recompilation
