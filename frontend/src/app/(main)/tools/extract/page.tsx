'use client';

import { ImageExtractor } from '@/components/ImageExtractor';
import { useWorkflowStore } from '@/store/workflowStore';
import { useEffect } from 'react';

export default function ExtractPage() {
  const { setActiveTab } = useWorkflowStore();
  
  useEffect(() => {
    setActiveTab('extract');
  }, [setActiveTab]);

  return (
    <div className="max-w-5xl mx-auto">
      <ImageExtractor />
    </div>
  );
}
