'use client';

import { useEffect, useState } from 'react';
import { fetchSettings, updateSettings, SystemSettings } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const { user } = useAuthStore();
  const loadSettings = async () => {
    try {
      const s = await fetchSettings();
      setSettings(s);
    } catch (_err) {
      toast.error('Failed to load settings');
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
      toast.success('Settings saved');
    } catch (_err) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {settings ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Logic Model</h3>
                <div className="space-y-2">
                  <label className="text-sm">Base URL</label>
                  <Input value={settings.logic_base_url} onChange={(e) => setSettings({ ...settings!, logic_base_url: e.target.value })} />
                  <label className="text-sm">API Key</label>
                  <Input type="password" value={settings.logic_api_key} onChange={(e) => setSettings({ ...settings!, logic_api_key: e.target.value })} />
                  <label className="text-sm">Model Name</label>
                  <Input value={settings.logic_model_name} onChange={(e) => setSettings({ ...settings!, logic_model_name: e.target.value })} />
                  <div>
                <h3 className="font-medium mb-2">Site Appearance</h3>
                <div className="space-y-2">
                  <label className="text-sm">Logo URL (Top Left)</label>
                  <Input 
                    value={settings.site_logo || ''} 
                    onChange={(e) => setSettings({ ...settings!, site_logo: e.target.value })} 
                    placeholder="/logo.png or https://..."
                  />
                  <label className="text-sm">Favicon URL</label>
                  <Input 
                    value={settings.site_favicon || ''} 
                    onChange={(e) => setSettings({ ...settings!, site_favicon: e.target.value })} 
                    placeholder="/favicon.ico or https://..."
                  />
                  <label className="text-sm">Footer Text</label>
                  <Textarea 
                    value={settings.footer_text || ''} 
                    onChange={(e) => setSettings({ ...settings!, footer_text: e.target.value })} 
                    placeholder="在页面底部显示的声明或版权信息"
                    className="min-h-20"
                  />
                </div>
              </div>
              
            </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Vision Model</h3>
                <div className="space-y-2">
                  <label className="text-sm">Base URL</label>
                  <Input value={settings.vision_base_url} onChange={(e) => setSettings({ ...settings!, vision_base_url: e.target.value })} />
                  <label className="text-sm">API Key</label>
                  <Input type="password" value={settings.vision_api_key} onChange={(e) => setSettings({ ...settings!, vision_api_key: e.target.value })} />
                  <label className="text-sm">Model Name</label>
                  <Input value={settings.vision_model_name} onChange={(e) => setSettings({ ...settings!, vision_model_name: e.target.value })} />
                </div>
              </div>
              <div className="md:col-span-2">
                <h3 className="font-medium mb-2">网站公告</h3>
                <div className="space-y-3 border rounded-lg p-3 border-slate-200">
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={!!settings.announcement_enabled} 
                      onCheckedChange={(v) => setSettings({ ...settings!, announcement_enabled: v })} 
                    />
                    <span className="text-sm text-slate-700">启用公告并每日首次弹出</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm">公告标题</label>
                      <Input 
                        value={settings.announcement_title || ''} 
                        onChange={(e) => setSettings({ ...settings!, announcement_title: e.target.value })} 
                        placeholder="例如：功能更新通知"
                      />
                    </div>
                    <div>
                      <label className="text-sm">最后更新时间</label>
                      <Input 
                        value={settings.announcement_last_updated || ''} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings({ ...settings!, announcement_last_updated: val === '' ? undefined : val });
                        }}
                        placeholder="可留空，或填入ISO时间字符串"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm">公告正文</label>
                    <Textarea 
                      value={settings.announcement_body || ''} 
                      onChange={(e) => setSettings({ ...settings!, announcement_body: e.target.value })} 
                      placeholder="输入公告内容（支持换行）"
                      className="min-h-28"
                    />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">SMTP 邮件</h3>
                <div className="space-y-2">
                  <label className="text-sm">Host</label>
                  <Input value={settings.smtp_host || ''} onChange={(e) => setSettings({ ...settings!, smtp_host: e.target.value })} />
                  <label className="text-sm">Port</label>
                  <Input type="number" value={settings.smtp_port ?? 587} onChange={(e) => setSettings({ ...settings!, smtp_port: Number(e.target.value) })} />
                  <label className="text-sm">User</label>
                  <Input value={settings.smtp_user || ''} onChange={(e) => setSettings({ ...settings!, smtp_user: e.target.value })} />
                  <label className="text-sm">Password</label>
                  <Input type="password" value={settings.smtp_password || ''} onChange={(e) => setSettings({ ...settings!, smtp_password: e.target.value })} />
                  <label className="text-sm">TLS</label>
                  <Input value={(settings.smtp_tls ?? true) ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings!, smtp_tls: e.target.value === 'true' })} />
                  <label className="text-sm">From</label>
                  <Input value={settings.smtp_from || ''} onChange={(e) => setSettings({ ...settings!, smtp_from: e.target.value })} />
                </div>
              </div>
              
            </div>
          ) : (
            <div>Loading settings...</div>
          )}
          <div className="mt-4">
            <Button onClick={handleSettingsSave}>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
