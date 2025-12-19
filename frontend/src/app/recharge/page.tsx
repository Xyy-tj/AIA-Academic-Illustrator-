'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createRecharge } from '@/lib/api';
import { toast } from 'sonner';

export default function RechargePage() {
  const [amount, setAmount] = useState(10);
  const [payType, setPayType] = useState<'alipay' | 'wxpay'>('alipay');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { pay_url } = await createRecharge(amount, payType);
      window.location.href = pay_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create recharge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>充值额度</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm">金额（元）</label>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm">支付方式</label>
              <select className="w-full border rounded-md h-10 px-2" value={payType} onChange={(e) => setPayType(e.target.value as 'alipay' | 'wxpay')}>
                <option value="alipay">支付宝</option>
                <option value="wxpay">微信支付</option>
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '跳转中...' : '去支付'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
