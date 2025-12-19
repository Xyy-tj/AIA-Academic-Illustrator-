'use client';

import { useEffect, useState } from 'react';
import { fetchSettings, updateSettings, SystemSettings } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminPaymentsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !user.is_admin) return;
    fetchSettings().then(setSettings).catch(() => toast.error('Failed to load settings'));
  }, [user]);

  const handleSave = async () => {
    if (!settings) return;
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      toast.success('支付设置已保存');
    } catch (_err) {
      toast.error('保存失败');
    }
  };

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>支付设置</CardTitle>
        </CardHeader>
        <CardContent>
          {settings ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">支付提供商</h3>
                <div className="space-y-2">
                  <label className="text-sm">当前提供商</label>
                  <select
                    className="w-full border rounded-md h-10 px-2"
                    value={settings.pay_provider || 'epay'}
                    onChange={(e) => setSettings({ ...settings!, pay_provider: e.target.value as 'epay' | 'hupi' })}
                  >
                    <option value="epay">易支付</option>
                    <option value="hupi">虎皮椒</option>
                  </select>
                  <label className="text-sm">充值比例 (每1元增加的额度)</label>
                  <Input type="number" value={settings.recharge_ratio ?? 1} onChange={(e) => setSettings({ ...settings!, recharge_ratio: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">易支付配置</h3>
                <div className="space-y-2">
                  <label className="text-sm">接口URL</label>
                  <Input value={settings.epay_api_url || ''} onChange={(e) => setSettings({ ...settings!, epay_api_url: e.target.value })} />
                  <label className="text-sm">商户PID</label>
                  <Input value={settings.epay_pid || ''} onChange={(e) => setSettings({ ...settings!, epay_pid: e.target.value })} />
                  <label className="text-sm">商户KEY</label>
                  <Input type="password" value={settings.epay_key || ''} onChange={(e) => setSettings({ ...settings!, epay_key: e.target.value })} />
                  <label className="text-sm">Return URL</label>
                  <Input value={settings.epay_return_url || ''} onChange={(e) => setSettings({ ...settings!, epay_return_url: e.target.value })} />
                  <label className="text-sm">Notify URL</label>
                  <Input value={settings.epay_notify_url || ''} onChange={(e) => setSettings({ ...settings!, epay_notify_url: e.target.value })} />
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">虎皮椒配置</h3>
                <div className="space-y-2">
                  <label className="text-sm">AppID</label>
                  <Input value={settings.hupi_appid || ''} onChange={(e) => setSettings({ ...settings!, hupi_appid: e.target.value })} />
                  <label className="text-sm">AppSecret</label>
                  <Input type="password" value={settings.hupi_appsecret || ''} onChange={(e) => setSettings({ ...settings!, hupi_appsecret: e.target.value })} />
                  <label className="text-sm">Return URL</label>
                  <Input value={settings.hupi_return_url || ''} onChange={(e) => setSettings({ ...settings!, hupi_return_url: e.target.value })} />
                  <label className="text-sm">Notify URL</label>
                  <Input value={settings.hupi_notify_url || ''} onChange={(e) => setSettings({ ...settings!, hupi_notify_url: e.target.value })} />
                  <label className="text-sm">Callback URL</label>
                  <Input value={settings.hupi_callback_url || ''} onChange={(e) => setSettings({ ...settings!, hupi_callback_url: e.target.value })} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">请将通知回调设置为后端接口：/api/pay/hupi/notify</p>
              </div>
            </div>
          ) : (
            <div>Loading settings...</div>
          )}
          <div className="mt-4">
            <Button onClick={handleSave}>保存</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
