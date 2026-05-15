'use client';

import { ImageTranslator } from '@/components/ImageTranslator';
import { useWorkflowStore } from '@/store/workflowStore';
import { useEffect } from 'react';

export default function TranslatePage() {
  const { setActiveTab } = useWorkflowStore();
  
  useEffect(() => {
    setActiveTab('translate');
  }, [setActiveTab]);

  return (
    <div className="max-w-5xl mx-auto">
      <ImageTranslator />
    </div>
  );
}
