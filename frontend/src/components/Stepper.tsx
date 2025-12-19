'use client';

import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const steps = [
    { step: 1 as const, titleKey: 'step1Title', descKey: 'step1Desc' },
    { step: 2 as const, titleKey: 'step2Title', descKey: 'step2Desc' },
    { step: 3 as const, titleKey: 'step3Title', descKey: 'step3Desc' },
];

export function Stepper() {
    const { language, currentStep, setCurrentStep, generatedSchema, generatedImage } = useWorkflowStore();
    const t = useTranslation(language);

    const canNavigateTo = (step: 1 | 2 | 3) => {
        if (step === 1) return true;
        if (step === 2) return !!generatedSchema;
        if (step === 3) return !!generatedSchema;
        return false;
    };

    return (
        <div className="w-full max-w-4xl mx-auto py-8">
            <div className="relative flex items-center justify-between px-4">
                {/* Background Line */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 rounded-full -z-10" />
                
                {/* Progress Line */}
                <motion.div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full -z-10"
                    initial={{ width: '0%' }}
                    animate={{ 
                        width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />

                {steps.map((item, index) => {
                    const isActive = currentStep === item.step;
                    const isCompleted = currentStep > item.step;
                    const isNavigable = canNavigateTo(item.step);

                    return (
                        <div key={item.step} className="relative flex flex-col items-center group">
                            <button
                                onClick={() => isNavigable && setCurrentStep(item.step)}
                                disabled={!isNavigable}
                                className={`
                                    relative flex items-center justify-center w-12 h-12 rounded-full border-4 transition-all duration-300 z-10
                                    ${isActive 
                                        ? 'bg-white border-indigo-100 shadow-lg shadow-indigo-500/20 scale-110' 
                                        : isCompleted
                                            ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-500/10'
                                            : 'bg-white border-slate-100 text-slate-300'
                                    }
                                    ${isNavigable ? 'cursor-pointer hover:border-indigo-200' : 'cursor-not-allowed'}
                                `}
                            >
                                {isCompleted ? (
                                    <Check className="w-6 h-6 text-white" />
                                ) : (
                                    <span className={`text-lg font-bold ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {item.step}
                                    </span>
                                )}
                                
                                {isActive && (
                                    <motion.div
                                        layoutId="step-ring"
                                        className="absolute inset-0 rounded-full border-2 border-indigo-600"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                    />
                                )}
                            </button>

                            {/* Label Card */}
                            <div className={`
                                absolute top-16 w-48 p-3 rounded-xl border transition-all duration-300 backdrop-blur-sm
                                flex flex-col items-center text-center
                                ${isActive 
                                    ? 'bg-white/80 border-indigo-100 shadow-xl shadow-indigo-500/5 -translate-y-1 opacity-100' 
                                    : 'bg-transparent border-transparent opacity-60 grayscale hover:grayscale-0'
                                }
                            `}>
                                <p className={`font-bold text-sm mb-1 ${isActive ? 'text-indigo-900' : 'text-slate-500'}`}>
                                    {t(item.titleKey as any)}
                                </p>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    {t(item.descKey as any)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Spacer for the labels */}
            <div className="h-24" />
        </div>
    );
}
