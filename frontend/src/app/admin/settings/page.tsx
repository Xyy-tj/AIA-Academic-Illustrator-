'use client';

import { useEffect, useState } from 'react';
import { fetchSettings, updateSettings, SystemSettings } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !user.is_admin) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const s = await fetchSettings();
      setSettings(s);
    } catch (error) {
      toast.error('Failed to load settings');
    }
  };

  const handleSettingsSave = async () => {
    if (!settings) return;
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      toast.success('Settings saved');
    } catch (error) {
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

