'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  Languages, 
  Layers, 
  Wand2, 
  History, 
  User, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Globe,
  RotateCcw,
  Menu,
  X,
  CreditCard,
  LayoutDashboard,
  Presentation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation, TranslationKey } from '@/lib/i18n';
import { UserCenterDialog } from '@/components/UserCenterDialog';
import { RechargeModal } from '@/components/RechargeModal';
import { AuthModal } from '@/components/AuthModal';
import { fetchPublicSettings } from '@/lib/api';
import { SiteFooter } from '@/components/SiteFooter';

interface MenuItem {
  titleKey: TranslationKey;
  href: string;
  icon: React.ElementType;
  descriptionKey?: TranslationKey;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: 'Workspace',
    items: [
      { titleKey: 'aiDiagram', href: '/workspace', icon: LayoutGrid, descriptionKey: 'aiDiagramDesc' },
    ]
  },
  {
    title: 'Tools',
    items: [
      { titleKey: 'imageTranslation', href: '/tools/translate', icon: Languages, descriptionKey: 'imageTranslationDesc' },
      { titleKey: 'imageExtraction', href: '/tools/extract', icon: Layers, descriptionKey: 'imageExtractionDesc' },
      { titleKey: 'superResolution', href: '/tools/enhance', icon: Wand2, descriptionKey: 'superResolutionDesc' },
      { titleKey: 'pptGenerator', href: '/tools/ppt', icon: Presentation, descriptionKey: 'pptGeneratorDesc' },
    ]
  },
  {
    title: 'Library',
    items: [
      { titleKey: 'history', href: '/history', icon: History },
    ]
  }
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { language, setLanguage, resetProject, setAuthModalOpen, setAuthModalTab } = useWorkflowStore();
  const t = useTranslation(language);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userCenterOpen, setUserCenterOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicSettings().then(s => {
      if (s.site_logo) setLogoUrl(s.site_logo);
      if (s.site_name) setSiteName(s.site_name);
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    // router.push('/login'); // Removed redirect to login page
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-slate-50/80 backdrop-blur-3xl border-r border-slate-200/60 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Decorative Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-50/50 via-purple-50/30 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-blue-50/50 via-indigo-50/30 to-transparent pointer-events-none" />

        <div className="p-6 relative z-10">
          <Link href="/" className="flex items-center gap-3 mb-10 group px-2">
            {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-contain bg-white shadow-sm ring-1 ring-slate-100" />
            ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 tracking-tight text-lg leading-none">{siteName || "Academic AI"}</span>
              {!siteName && <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">Illustrator</span>}
            </div>
          </Link>

          <nav className="space-y-8">
            {MENU_GROUPS.map((group, idx) => (
              <div key={idx}>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-4 opacity-80">
                  {group.title}
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "group relative flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-300",
                          isActive 
                            ? "bg-white text-slate-900 shadow-[0_2px_20px_-4px_rgba(99,102,241,0.15)] ring-1 ring-slate-100/50" 
                            : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                          isActive 
                            ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 scale-100" 
                            : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm scale-95 group-hover:scale-100"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        
                        <span className="tracking-tight">{t(item.titleKey) || item.titleKey}</span>
                        
                        {isActive && (
                          <motion.div
                            layoutId="active-indicator"
                            className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo-500"
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Admin Section */}
            {user?.is_admin && (
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-4 opacity-80">
                  {t('adminPanel')}
                </div>
                <div className="space-y-2">
                  <Link
                    href="/panel"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-300",
                      pathname.startsWith('/panel')
                        ? "bg-white text-slate-900 shadow-[0_2px_20px_-4px_rgba(15,23,42,0.1)] ring-1 ring-slate-100/50" 
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                      pathname.startsWith('/panel')
                        ? "bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md shadow-slate-900/20 scale-100" 
                        : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-900 group-hover:shadow-sm scale-95 group-hover:scale-100"
                    )}>
                      <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <span className="tracking-tight">{t('adminPanel')}</span>
                  </Link>
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* User Section */}
        <div className="mt-auto p-6 relative z-10">
          {user ? (
            <div 
              className="bg-white/60 backdrop-blur-md p-1 rounded-[20px] border border-white/40 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
              onClick={() => setUserCenterOpen(true)}
            >
              <div className="flex items-center gap-3 p-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                  <span className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{user.username}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                      <div className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 border border-slate-200/50">
                        {t('quota')}: {user.quota}
                      </div>
                  </div>
                </div>
                <button 
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all duration-300" 
                    title={t('recharge')}
                    onClick={(e) => {
                        e.stopPropagation();
                        setRechargeOpen(true);
                    }}
                >
                    <CreditCard className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-white/60 backdrop-blur-md p-4 rounded-[20px] border border-white/40 shadow-sm">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl"
                onClick={() => { setAuthModalTab('login'); setAuthModalOpen(true); }}
              >
                Log In
              </Button>
              <Button 
                size="sm" 
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 rounded-xl border-0"
                onClick={() => { setAuthModalTab('register'); setAuthModalOpen(true); }}
              >
                Get Started
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="flex-shrink-0 h-16 bg-white/50 backdrop-blur-sm border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden -ml-2"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </Button>
            
            {/* Contextual Header Actions or Breadcrumbs */}
            {pathname === '/' && (
               <div className="hidden sm:flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">Workspace</span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  <span className="text-sm font-semibold text-slate-900">Diagram Generator</span>
               </div>
            )}
             {pathname.includes('/tools/') && (
               <div className="hidden sm:flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">Tools</span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  <span className="text-sm font-semibold text-slate-900">
                    {pathname.includes('translate') ? 'Image Translation' : 
                     pathname.includes('extract') ? 'Image Extraction' : 'Super Resolution'}
                  </span>
               </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {pathname === '/workspace' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetProject}
                className="text-slate-500 hover:text-red-600"
                title={t('resetProject')}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('resetProject')}</span>
              </Button>
            )}
            
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              className="text-slate-500 hover:text-indigo-600"
            >
              <Globe className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
             <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
             >
                {children}
             </motion.div>
             <div className="mt-20">
                <SiteFooter />
             </div>
          </div>
        </main>
      </div>
      
      <UserCenterDialog open={userCenterOpen} onOpenChange={setUserCenterOpen} />
      <RechargeModal open={rechargeOpen} onOpenChange={setRechargeOpen} />
      <AuthModal />
    </div>
  );
}
