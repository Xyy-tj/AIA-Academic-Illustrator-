'use client';

import Link from 'next/link';
import { Settings, CreditCard, Images, Users, History, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const cards = [
    {
      title: 'System Settings',
      description: 'Configure global application settings and preferences.',
      icon: Settings,
      href: '/panel/settings',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Payment Settings',
      description: 'Manage pricing plans and payment configurations.',
      icon: CreditCard,
      href: '/panel/payments',
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Reference Library',
      description: 'Manage the collection of reference images and styles.',
      icon: Images,
      href: '/panel/library',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'User Management',
      description: 'View user details and manage access controls.',
      icon: Users,
      href: '/panel/users',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Generation History',
      description: 'View and audit image generation logs and history.',
      icon: History,
      href: '/panel/history',
      color: 'bg-indigo-50 text-indigo-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <Shield className="w-6 h-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500">Welcome to the administration panel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="block p-6 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow group"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                {card.title}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
