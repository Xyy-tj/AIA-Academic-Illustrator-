'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { fetchUser } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function RechargeSuccessPage() {
  const { setUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchUser().then(setUser).catch(() => {});
  }, [setUser]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>支付结果</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">如果支付已成功，额度已自动到账。</p>
          <Button onClick={() => router.push('/')}>返回首页</Button>
        </CardContent>
      </Card>
    </div>
  );
}
