'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { fetchSettings, updateSettings, uploadFile, SystemSettings } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Save, RefreshCcw, Globe, Bot, Mail, Cloud, Info, HardDrive, Upload, Image as ImageIcon } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const { language } = useWorkflowStore();
  const t = useTranslation(language);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = searchParams.get('tab') || 'general';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`);
  };

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

  const handleSettingsSave = async () => {
    if (!settings) return;
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      toast.success('System settings saved successfully');
    } catch (_err) {
      toast.error('Failed to save settings');
    }
  };

  const handleAnnouncementImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !settings) return;
    const file = e.target.files[0];
    
    try {
        const toastId = toast.loading('Uploading image...');
        const res = await uploadFile(file);
        setSettings({ ...settings, announcement_image_url: res.url });
        toast.dismiss(toastId);
        toast.success('Image uploaded successfully');
    } catch (err) {
        toast.error('Failed to upload image');
    }
  };

  if (!settings && loading) {
    return <div className="p-8 text-center text-slate-500">{t('loadingSettings')}</div>;
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('systemConfiguration')}</h1>
          <p className="text-slate-500">{t('systemConfigDescDetailed')}</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={loadSettings} disabled={loading}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                {t('refresh')}
            </Button>
            <Button onClick={handleSettingsSave} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                {t('saveChanges')}
            </Button>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[750px] mb-8">
          <TabsTrigger value="general">{t('general')}</TabsTrigger>
          <TabsTrigger value="models">{t('aiModels')}</TabsTrigger>
          <TabsTrigger value="storage">{t('storage')}</TabsTrigger>
          <TabsTrigger value="integrations">{t('integrations')}</TabsTrigger>
          <TabsTrigger value="smtp">{t('emailSmtp')}</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-500" />
                <CardTitle>{t('siteAppearance')}</CardTitle>
              </div>
              <CardDescription>{t('siteAppearanceDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('logoUrl')}</Label>
                  <Input 
                    value={settings.site_logo || ''} 
                    onChange={(e) => setSettings({ ...settings!, site_logo: e.target.value })} 
                    placeholder="/logo.png or https://..."
                  />
                  <p className="text-xs text-slate-500">{t('logoUrlDesc')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('faviconUrl')}</Label>
                  <Input 
                    value={settings.site_favicon || ''} 
                    onChange={(e) => setSettings({ ...settings!, site_favicon: e.target.value })} 
                    placeholder="/favicon.ico or https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('siteName') || 'Site Name'}</Label>
                  <Input 
                    value={settings.site_name || ''} 
                    onChange={(e) => setSettings({ ...settings!, site_name: e.target.value })} 
                    placeholder="Academic Illustrator"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('initialQuota') || 'Initial Quota'}</Label>
                  <Input 
                    type="number"
                    value={settings.initial_quota || 0} 
                    onChange={(e) => setSettings({ ...settings!, initial_quota: Number(e.target.value) })} 
                    placeholder="2"
                  />
                  <p className="text-xs text-slate-500">
                    {t('initialQuotaDesc') || 'Default quota assigned to new users upon registration.'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('footerText')}</Label>
                <Textarea 
                    value={settings.footer_text || ''} 
                    onChange={(e) => setSettings({ ...settings!, footer_text: e.target.value })} 
                    placeholder="Copyright info or disclaimer..."
                    className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-500" />
                <CardTitle>{t('announcement')}</CardTitle>
              </div>
              <CardDescription>{t('announcementDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Switch 
                    checked={settings.announcement_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings!, announcement_enabled: checked })}
                />
                <Label>{t('enableAnnouncement')}</Label>
              </div>
              {settings.announcement_enabled && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <Label>{t('title')}</Label>
                        <Input 
                            value={settings.announcement_title || ''} 
                            onChange={(e) => setSettings({ ...settings!, announcement_title: e.target.value })} 
                            placeholder="Announcement Title"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('content')}</Label>
                        <Textarea 
                            value={settings.announcement_body || ''} 
                            onChange={(e) => setSettings({ ...settings!, announcement_body: e.target.value })} 
                            placeholder="Announcement content..."
                            className="min-h-[100px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Announcement Image</Label>
                        <div className="flex flex-col gap-2">
                            {settings.announcement_image_url && (
                                <div className="relative w-full max-w-sm rounded-lg overflow-hidden border border-slate-200">
                                    <img 
                                        src={settings.announcement_image_url} 
                                        alt="Announcement" 
                                        className="w-full h-auto object-cover"
                                    />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                        onClick={() => setSettings({ ...settings!, announcement_image_url: undefined })}
                                    >
                                        <Bot className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Input 
                                    value={settings.announcement_image_url || ''} 
                                    onChange={(e) => setSettings({ ...settings!, announcement_image_url: e.target.value })} 
                                    placeholder="Image URL or upload..."
                                    className="flex-1"
                                />
                                <div className="relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept="image/*"
                                        onChange={handleAnnouncementImageUpload}
                                    />
                                    <Button variant="outline" type="button">
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Models */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" />
                <CardTitle>{t('modelConfiguration')}</CardTitle>
              </div>
              <CardDescription>{t('modelConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">{t('logicModelSection')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('baseUrl')}</Label>
                    <Input value={settings.logic_base_url} onChange={(e) => setSettings({ ...settings!, logic_base_url: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('modelName')}</Label>
                    <Input value={settings.logic_model_name} onChange={(e) => setSettings({ ...settings!, logic_model_name: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t('apiKey')}</Label>
                    <Input type="password" value={settings.logic_api_key} onChange={(e) => setSettings({ ...settings!, logic_api_key: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">{t('visionModelSection')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('baseUrl')}</Label>
                    <Input value={settings.vision_base_url} onChange={(e) => setSettings({ ...settings!, vision_base_url: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('modelName')}</Label>
                    <Input value={settings.vision_model_name} onChange={(e) => setSettings({ ...settings!, vision_model_name: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t('apiKey')}</Label>
                    <Input type="password" value={settings.vision_api_key} onChange={(e) => setSettings({ ...settings!, vision_api_key: e.target.value })} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Settings */}
        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-500" />
                <CardTitle>{t('storageConfiguration')}</CardTitle>
              </div>
              <CardDescription>{t('storageConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                 <Label>{t('storageType')}</Label>
                 <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={settings.storage_type || 'local'}
                    onChange={(e) => setSettings({ ...settings!, storage_type: e.target.value })}
                 >
                    <option value="local">{t('localStorage')}</option>
                    <option value="cos">{t('tencentCos')}</option>
                 </select>
               </div>

               {settings.storage_type === 'cos' && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-top-2 border-t pt-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('secretId')}</Label>
                            <Input value={settings.cos_secret_id || ''} onChange={(e) => setSettings({ ...settings!, cos_secret_id: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('secretKey')}</Label>
                            <Input type="password" value={settings.cos_secret_key || ''} onChange={(e) => setSettings({ ...settings!, cos_secret_key: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('region')}</Label>
                            <Input value={settings.cos_region || ''} onChange={(e) => setSettings({ ...settings!, cos_region: e.target.value })} placeholder="ap-shanghai" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('bucketName')}</Label>
                            <Input value={settings.cos_bucket || ''} onChange={(e) => setSettings({ ...settings!, cos_bucket: e.target.value })} placeholder="example-1250000000" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>{t('pathPrefix')}</Label>
                            <Input value={settings.cos_path_prefix || ''} onChange={(e) => setSettings({ ...settings!, cos_path_prefix: e.target.value })} placeholder="aia-images" />
                            <p className="text-xs text-slate-500">{t('pathPrefixDesc')}</p>
                        </div>
                    </div>
                 </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-indigo-500" />
                <CardTitle>{t('aliyunServices')}</CardTitle>
              </div>
              <CardDescription>{t('aliyunServicesDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('accessKeyId')}</Label>
                    <Input value={settings.aliyun_access_key_id || ''} onChange={(e) => setSettings({ ...settings!, aliyun_access_key_id: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('accessKeySecret')}</Label>
                    <Input type="password" value={settings.aliyun_access_key_secret || ''} onChange={(e) => setSettings({ ...settings!, aliyun_access_key_secret: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t('endpoint')}</Label>
                    <Input value={settings.aliyun_endpoint} onChange={(e) => setSettings({ ...settings!, aliyun_endpoint: e.target.value })} placeholder="imageenhan.cn-shanghai.aliyuncs.com" />
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMTP */}
        <TabsContent value="smtp" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-500" />
                <CardTitle>{t('smtpConfiguration')}</CardTitle>
              </div>
              <CardDescription>{t('smtpConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('smtpHost')}</Label>
                    <Input value={settings.smtp_host || ''} onChange={(e) => setSettings({ ...settings!, smtp_host: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('smtpPort')}</Label>
                    <Input type="number" value={settings.smtp_port || ''} onChange={(e) => setSettings({ ...settings!, smtp_port: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('smtpUsername')}</Label>
                    <Input value={settings.smtp_user || ''} onChange={(e) => setSettings({ ...settings!, smtp_user: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('smtpPassword')}</Label>
                    <Input type="password" value={settings.smtp_password || ''} onChange={(e) => setSettings({ ...settings!, smtp_password: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('fromAddress')}</Label>
                    <Input value={settings.smtp_from || ''} onChange={(e) => setSettings({ ...settings!, smtp_from: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2 h-full pt-6">
                     <Switch 
                        checked={settings.smtp_tls}
                        onCheckedChange={(checked) => setSettings({ ...settings!, smtp_tls: checked })}
                     />
                     <Label>{t('enableTls')}</Label>
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
