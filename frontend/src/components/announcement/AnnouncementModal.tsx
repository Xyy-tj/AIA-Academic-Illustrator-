'use client';
import { useEffect, useState } from 'react';
import { fetchPublicSettings, PublicSettings } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWorkflowStore } from '@/store/workflowStore';

export function AnnouncementModal() {
  const { announcementOpen, setAnnouncementOpen } = useWorkflowStore();
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    // Fetch settings on mount
    fetchPublicSettings().then(s => {
        setSettings(s);
        // Auto-open logic
        if (s.announcement_enabled) {
            const today = new Date().toISOString().split('T')[0];
            const lastSeen = localStorage.getItem('announcement_last_seen');
            if (lastSeen !== today) {
                setAnnouncementOpen(true);
                localStorage.setItem('announcement_last_seen', today);
            }
        }
    }).catch(console.error);
  }, [setAnnouncementOpen]);

  return (
    <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{settings?.announcement_title || '网站公告'}</DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
          {settings?.announcement_body || '暂无公告'}
        </div>
      </DialogContent>
    </Dialog>
  );
}
