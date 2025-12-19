'use client';
import { useEffect } from 'react';
import { fetchPublicSettings } from '@/lib/api';

export function FaviconUpdater() {
  useEffect(() => {
    fetchPublicSettings().then(settings => {
      if (settings.site_favicon) {
        const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          const newLink = document.createElement('link');
          newLink.rel = 'icon';
          newLink.href = settings.site_favicon;
          document.head.appendChild(newLink);
        } else {
          link.href = settings.site_favicon;
        }
      }
    }).catch(() => {});
  }, []);
  return null;
}
