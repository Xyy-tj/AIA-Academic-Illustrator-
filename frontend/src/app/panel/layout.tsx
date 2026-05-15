'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
  Shield, 
  Settings, 
  Users, 
  History, 
  CreditCard, 
  Images, 
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Database,
  Brain,
  LayoutDashboard,
  LogOut,
  Wallet,
  HardDrive,
  Languages,
  Monitor,
  Presentation,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fetchPublicSettings } from '@/lib/api';

interface MenuItem {
  titleKey: string;
  href?: string;
  icon: React.ElementType;
  children?: MenuItem[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    titleKey: 'adminOverview',
    href: '/panel',
    icon: LayoutDashboard,
  },
  {
    titleKey: 'systemConfig',
    icon: Settings,
    children: [
      { titleKey: 'globalSettings', href: '/panel/settings?tab=general', icon: Settings }
    ]
  },
  {
    titleKey: 'dataManagement',
    icon: Database,
    children: [
      { titleKey: 'userManagement', href: '/panel/users', icon: Users },
      { titleKey: 'historyManagement', href: '/panel/history', icon: History }
    ]
  },
  {
    titleKey: 'modelManagement',
    icon: Brain,
    children: [
      { titleKey: 'promptConfig', href: '/panel/prompts', icon: MessageSquare },
      { titleKey: 'referenceLibrary', href: '/panel/library', icon: Images },
      { titleKey: 'pptStyles', href: '/panel/ppt-styles', icon: Presentation },
      { titleKey: 'helpGuides', href: '/panel/guides', icon: BookOpen }
    ]
  },
  {
    titleKey: 'paymentSettings',
    icon: Wallet,
    children: [
      { titleKey: 'paymentConfig', href: '/panel/payments', icon: CreditCard }
    ]
  }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { language, setLanguage } = useWorkflowStore();
  const t = useTranslation(language);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchPublicSettings().then(s => {
      if (s.site_name) setSiteName(s.site_name);
      if (s.site_logo) setLogoUrl(s.site_logo);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (mounted) {
      if (!user) {
        router.push('/login');
      } else if (!user.is_admin) {
        router.push('/');
      }
    }
  }, [user, mounted, router]);

  if (!mounted || !user || !user.is_admin) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col h-screen sticky top-0 border-r border-slate-800">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 mb-8 group">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
            )}
            <span className="font-bold text-white tracking-tight text-lg">{siteName || t('appTitle')}</span>
          </Link>
          
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
            {t('adminPanel')}
          </div>

          <nav className="space-y-1">
            {MENU_ITEMS.map((item, index) => (
              <SidebarItem key={index} item={item} />
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-white truncate">{user.username}</span>
              <span className="text-[10px] text-indigo-400 uppercase tracking-wide font-semibold">{t('admin')}</span>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full mt-4 text-slate-400 hover:text-white hover:bg-slate-800/30 justify-start"
            onClick={() => router.push('/')}
          >
            <Monitor className="w-4 h-4 mr-2" />
            {t('backToApp')}
          </Button>

          <Button 
            variant="ghost" 
            className="w-full mt-1 text-slate-400 hover:text-white hover:bg-slate-800/30 justify-start"
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
          >
            <Languages className="w-4 h-4 mr-2" />
            {language === 'en' ? '中文' : 'English'}
          </Button>

          <Button 
            variant="ghost" 
            className="w-full mt-1 text-slate-400 hover:text-red-400 hover:bg-red-950/30 justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('signOut')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 bg-slate-50/50">
        <div className="h-full flex flex-col">
          {/* Top Bar / Header could go here if needed, or just breadcrumbs */}
          <div className="flex-1 overflow-y-auto p-8">
             <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ item }: { item: MenuItem }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useWorkflowStore();
  const t = useTranslation(language);
  
  // Helper to check if a link is active
  const isLinkActive = (href?: string) => {
    if (!href) return false;
    const [path, query] = href.split('?');
    if (path !== pathname) return false;
    
    if (query) {
       const params = new URLSearchParams(query);
       const tab = params.get('tab');
       if (tab) {
         return tab === searchParams.get('tab');
       }
    }
    return true;
  };

  // Check if any child is active to auto-expand
  const isActive = isLinkActive(item.href);
  const isChildActive = item.children?.some(child => isLinkActive(child.href));

  useEffect(() => {
    if (isChildActive) {
      setIsOpen(true);
    }
  }, [isChildActive]);

  const toggleOpen = () => setIsOpen(!isOpen);

  const Icon = item.icon;

  if (item.children) {
    return (
      <div className="mb-1">
        <button
          onClick={toggleOpen}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
            isChildActive || isOpen 
              ? "text-white bg-slate-800/50" 
              : "text-slate-400 hover:text-white hover:bg-slate-800/30"
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className={cn("w-4 h-4 transition-colors", (isChildActive || isOpen) ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400")} />
            <span>{t(item.titleKey as any)}</span>
          </div>
          <ChevronRight className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-90")} />
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pl-4 mt-1 space-y-1 border-l-2 border-slate-800 ml-4">
                {item.children.map((child, idx) => (
                  <SidebarLink key={idx} item={child} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return <SidebarLink item={item} />;
}

function SidebarLink({ item }: { item: MenuItem }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Helper to check if a link is active
  const isActive = (() => {
    if (!item.href) return false;
    const [path, query] = item.href.split('?');
    if (path !== pathname) return false;
    
    if (query) {
       const params = new URLSearchParams(query);
       const tab = params.get('tab');
       if (tab) {
         return tab === searchParams.get('tab');
       }
    }
    return true;
  })();

  const Icon = item.icon;
  const { language } = useWorkflowStore();
  const t = useTranslation(language);

  return (
    <Link 
      href={item.href || '#'}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
        isActive 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" 
          : "text-slate-400 hover:text-white hover:bg-slate-800/30"
      )}
    >
      <Icon className={cn("w-4 h-4", isActive ? "text-indigo-200" : "text-slate-500 group-hover:text-slate-400")} />
      <span>{t(item.titleKey as any)}</span>
    </Link>
  );
}
