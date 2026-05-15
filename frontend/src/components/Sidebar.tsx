'use client';

import { LayoutGrid, Languages, Layers, Wand2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import { useWorkflowStore, type TabId } from '@/store/workflowStore';

interface MenuItem {
    id: TabId;
    labelKey: TranslationKey;
    icon: LucideIcon;
    descKey: TranslationKey;
}

const MENU_ITEMS: MenuItem[] = [
    { 
        id: 'diagram', 
        labelKey: 'aiDiagram', 
        icon: LayoutGrid,
        descKey: 'aiDiagramDesc'
    },
    { 
        id: 'translate', 
        labelKey: 'imageTranslation', 
        icon: Languages,
        descKey: 'imageTranslationDesc'
    },
    { 
        id: 'extract', 
        labelKey: 'imageExtraction', 
        icon: Layers,
        descKey: 'imageExtractionDesc'
    },
    { 
        id: 'super-resolution', 
        labelKey: 'superResolution', 
        icon: Wand2,
        descKey: 'superResolutionDesc'
    },
];

export function Sidebar() {
    const { language, activeTab, setActiveTab } = useWorkflowStore();
    const t = useTranslation(language);

    return (
        <nav className="flex flex-col gap-3 w-full p-4 glass-panel rounded-3xl border border-white/40 shadow-xl shadow-indigo-500/5">
            {MENU_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                
                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "group relative flex items-center gap-3 p-3 text-left rounded-2xl transition-all duration-300",
                            isActive 
                                ? "bg-gradient-to-br from-white/90 to-white/50 shadow-lg shadow-indigo-500/10 text-indigo-700 ring-1 ring-white/60" 
                                : "hover:bg-white/40 text-slate-600 hover:text-slate-900"
                        )}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="sidebar-active"
                                className="absolute inset-0 bg-white/60 rounded-2xl -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        
                        <div className={cn(
                            "p-2.5 rounded-xl transition-all duration-300 shadow-sm",
                            isActive 
                                ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/30" 
                                : "bg-white/80 text-slate-400 group-hover:text-indigo-500 group-hover:bg-white group-hover:shadow-md group-hover:shadow-indigo-500/10"
                        )}>
                            <Icon size={18} />
                        </div>
                        
                        <div>
                            <div className="font-bold text-sm tracking-tight">{t(item.labelKey)}</div>
                            <div className={cn(
                                "text-[11px] mt-0.5 font-medium transition-colors",
                                isActive ? "text-indigo-600/70" : "text-slate-400/80 group-hover:text-slate-500"
                            )}>
                                {t(item.descKey)}
                            </div>
                        </div>
                    </button>
                );
            })}
        </nav>
    );
}
