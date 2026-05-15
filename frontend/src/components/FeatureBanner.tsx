import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FeatureBannerProps {
    title: string;
    description: string;
    children?: ReactNode;
    className?: string;
    gradient?: string;
}

export function FeatureBanner({ title, description, children, className, gradient }: FeatureBannerProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative overflow-hidden rounded-3xl text-white shadow-xl shadow-indigo-500/10 mb-4",
                gradient || "bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700",
                className
            )}
        >
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[length:20px_20px]" />
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/20 blur-[100px] rounded-full mix-blend-overlay" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-300/20 blur-[80px] rounded-full mix-blend-overlay" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-8">
                <div className="flex-1 space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95">
                        {title}
                    </h2>
                    <p className="text-indigo-50 text-base md:text-lg leading-relaxed max-w-xl opacity-90">
                        {description}
                    </p>
                </div>
                
                {children && (
                    <div className="flex-shrink-0 w-full md:w-auto max-w-md flex justify-center md:justify-end">
                        {children}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
