'use client';
import { useEffect, useState } from 'react';
import { fetchPublicSettings } from '@/lib/api';

export function SiteFooter() {
  const [footer, setFooter] = useState<string | null>(null);
  useEffect(() => {
    fetchPublicSettings().then(s => {
      if (s.footer_text) setFooter(s.footer_text);
    }).catch(() => {});
  }, []);
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
        <p className="text-xs text-slate-500">
          {footer || 'Academic Illustrator © 2025'}
        </p>
      </div>
    </footer>
  );
}

