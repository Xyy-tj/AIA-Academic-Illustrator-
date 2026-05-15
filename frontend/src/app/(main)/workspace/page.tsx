'use client';

import { Stepper } from '@/components/Stepper';
import { ArchitectStep } from '@/components/steps/ArchitectStep';
import { ReviewStep } from '@/components/steps/ReviewStep';
import { RendererStep } from '@/components/steps/RendererStep';
import { useWorkflowStore } from '@/store/workflowStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

export default function DiagramPage() {
  const { currentStep, setActiveTab } = useWorkflowStore();
  
  // Ensure the store knows we are on the diagram tab
  useEffect(() => {
    setActiveTab('diagram');
  }, [setActiveTab]);

  return (
    <div className="max-w-7xl mx-auto">
      <Stepper />

      <div className="mt-8">
        <AnimatePresence mode="wait">
            {currentStep === 1 && (
                <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-500/10"
                >
                    <ArchitectStep />
                </motion.div>
            )}

            {currentStep === 2 && (
                <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-500/10"
                >
                    <ReviewStep />
                </motion.div>
            )}

            {currentStep === 3 && (
                <motion.div
                    key="step3"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-500/10"
                >
                    <RendererStep />
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}
