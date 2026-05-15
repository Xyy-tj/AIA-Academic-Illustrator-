'use client';

import { ImageSuperResolution } from '@/components/ImageSuperResolution';
import { useWorkflowStore } from '@/store/workflowStore';
import { useEffect } from 'react';

export default function EnhancePage() {
  const { setActiveTab } = useWorkflowStore();
  
  useEffect(() => {
    setActiveTab('super-resolution');
  }, [setActiveTab]);

  return (
    <div className="max-w-5xl mx-auto">
      <ImageSuperResolution />
    </div>
  );
}
