'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Stepper } from '@/components/Stepper';
import { ArchitectStep } from '@/components/steps/ArchitectStep';
import { ReviewStep } from '@/components/steps/ReviewStep';
import { RendererStep } from '@/components/steps/RendererStep';
import { useWorkflowStore } from '@/store/workflowStore';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const { currentStep, _hasHydrated } = useWorkflowStore();

  // Prevent hydration mismatch
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Initializing Studio...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50/50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-indigo-300/20 blur-[120px] mix-blend-multiply animate-blob" />
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-violet-300/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-[20%] w-[800px] h-[800px] rounded-full bg-sky-300/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      </div>

      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative z-10">
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
      </main>
    </div>
  );
}
