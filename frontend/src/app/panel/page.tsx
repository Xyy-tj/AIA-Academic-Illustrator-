'use client';

import Link from 'next/link';
import { 
  Settings, 
  CreditCard, 
  Images, 
  Users, 
  History, 
  Shield, 
  MessageSquare,
  Database,
  Brain,
  ArrowRight,
  Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';

export default function AdminDashboard() {
  const { language } = useWorkflowStore();
  const t = useTranslation(language);

  const sections = [
    {
      title: t('systemConfig'),
      description: t('systemConfigDesc'),
      icon: Settings,
      items: [
        {
          title: t('globalSettings'),
          description: t('globalSettingsDesc'),
          icon: Settings,
          href: '/panel/settings',
          color: 'bg-blue-50 text-blue-600',
        }
      ]
    },
    {
      title: t('dataManagement'),
      description: t('dataManagementDesc'),
      icon: Database,
      items: [
        {
          title: t('userManagement'),
          description: t('userManagementDesc'),
          icon: Users,
          href: '/panel/users',
          color: 'bg-orange-50 text-orange-600',
        },
        {
          title: t('historyManagement'),
          description: t('historyManagementDesc'),
          icon: History,
          href: '/panel/history',
          color: 'bg-indigo-50 text-indigo-600',
        }
      ]
    },
    {
      title: t('modelManagement'),
      description: t('modelManagementDesc'),
      icon: Brain,
      items: [
        {
          title: t('promptConfig'),
          description: t('promptConfigDesc'),
          icon: MessageSquare,
          href: '/panel/prompts',
          color: 'bg-pink-50 text-pink-600',
        },
        {
          title: t('referenceLibrary'),
          description: t('referenceLibraryDesc'),
          icon: Images,
          href: '/panel/library',
          color: 'bg-purple-50 text-purple-600',
        }
      ]
    },
    {
      title: t('paymentSettings'),
      description: t('paymentSettingsDesc'),
      icon: Wallet,
      items: [
        {
          title: t('paymentConfig'),
          description: t('paymentConfigDesc'),
          icon: CreditCard,
          href: '/panel/payments',
          color: 'bg-green-50 text-green-600',
        }
      ]
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-slate-900 rounded-xl shadow-lg shadow-slate-900/20">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('adminDashboard')}</h1>
          <p className="text-slate-500 text-lg">{t('adminDashboardDesc')}</p>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-10"
      >
        {sections.map((section, idx) => (
          <motion.section key={idx} variants={item} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
              <section.icon className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-700">{section.title}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.items.map((card, cardIdx) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group block p-6 bg-white border border-slate-200 rounded-xl hover:shadow-lg hover:border-indigo-100 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
                    </div>
                    
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110", card.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {card.title}
                    </h3>
                    
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                      {card.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </motion.section>
        ))}
      </motion.div>
    </div>
  );
}
