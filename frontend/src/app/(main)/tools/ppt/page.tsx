'use client';

import { PPTGenerator } from '@/components/PPTGenerator';
import { useWorkflowStore } from '@/store/workflowStore';
import { useEffect } from 'react';

export default function PPTPage() {
  const { setActiveTab } = useWorkflowStore();
  
  useEffect(() => {
    setActiveTab('ppt-generator');
  }, [setActiveTab]);

  return (
    <div className="max-w-5xl mx-auto">
      <PPTGenerator />
    </div>
  );
}
