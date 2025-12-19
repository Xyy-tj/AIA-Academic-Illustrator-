'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Shield, Settings, Users, History, CreditCard, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col transition-all duration-300">
          <div className="p-6">
            <Link href="/" className="flex items-center gap-3 mb-8 group">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <span className="font-bold text-white tracking-tight">Academic AI</span>
            </Link>
            
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
              Management
            </div>

            <nav className="space-y-1">
              <NavLink href="/panel/settings" icon={<Settings className="w-4 h-4" />}>
                System Settings
              </NavLink>
              <NavLink href="/panel/payments" icon={<CreditCard className="w-4 h-4" />}>
                支付设置
              </NavLink>
              <NavLink href="/panel/library" icon={<Images className="w-4 h-4" />}>
                Library
              </NavLink>
              <NavLink href="/panel/users" icon={<Users className="w-4 h-4" />}>
                Users
              </NavLink>
              <NavLink href="/panel/history" icon={<History className="w-4 h-4" />}>
                Generation History
              </NavLink>
            </nav>
          </div>

          <div className="mt-auto p-6 border-t border-slate-800">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-800/50 border border-slate-800">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-white truncate">{user.username}</span>
                <span className="text-xs text-slate-500">Administrator</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto h-screen">
          <div className="max-w-6xl mx-auto">
             {/* Header for mobile or breadcrumbs could go here */}
             <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
                <div className="flex gap-2">
                   <Link href="/">
                      <Button variant="outline" size="sm" className="bg-white">Back to Home</Button>
                   </Link>
                </div>
             </div>
             
             {children}
          </div>
        </main>
      </div>
    </div>
  );
}

import { usePathname } from 'next/navigation';

function NavLink({ href, children, icon }: { href: string; children: React.ReactNode; icon: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link 
      href={href} 
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
        ${isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
          : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
        }
      `}
    >
      <span className={isActive ? 'text-indigo-200' : 'text-slate-500 group-hover:text-slate-300'}>
        {icon}
      </span>
      <span className="font-medium text-sm">{children}</span>
      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/40" />}
    </Link>
  );
}
