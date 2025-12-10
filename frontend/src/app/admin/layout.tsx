'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Shield, Settings, Users, History } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();

  if (!user) {
    router.push('/login');
    return null;
  }
  if (!user.is_admin) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-[220px_1fr] gap-6">
        <aside className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-slate-700">
            <Shield className="w-4 h-4" />
            <span className="font-semibold">Admin Panel</span>
          </div>
          <nav className="space-y-2">
            <Link href="/admin/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700">
              <Settings className="w-4 h-4" />
              <span>System Settings</span>
            </Link>
            <Link href="/admin/users" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700">
              <Users className="w-4 h-4" />
              <span>Users</span>
            </Link>
            <Link href="/admin/history" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700">
              <History className="w-4 h-4" />
              <span>Generation History</span>
            </Link>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

