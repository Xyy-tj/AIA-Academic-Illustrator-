import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type TabId = 'diagram' | 'translate' | 'extract' | 'super-resolution' | 'ppt-generator';

export interface ModelConfig {
    baseUrl: string;
    apiKey: string;
    modelName: string;
}

export interface HistoryItem {
    id: string;
    timestamp: number;
    schema: string;
    imageUrl: string | null;
}

interface WorkflowState {
    // Configs (Persisted)
    logicConfig: ModelConfig;
    visionConfig: ModelConfig;

    // App State
    language: 'en' | 'zh';
    activeTab: TabId;
    currentStep: 1 | 2 | 3;
    paperContent: string;
    generatedSchema: string;
    generatedImage: string | null;
    superResolutionImage: string | null;
    referenceImages: string[]; // Base64 encoded
    chartLanguage: 'en' | 'zh';
    history: HistoryItem[];
    sessionId: string | null;
    announcementOpen: boolean;
    authModalOpen: boolean;
    authModalTab: 'login' | 'register';
    quotaModalOpen: boolean;

    // Hydration flag
    _hasHydrated: boolean;
    _genUUID: () => string;

    // Actions
    setLogicConfig: (config: ModelConfig) => void;
    setVisionConfig: (config: ModelConfig) => void;
    setLanguage: (lang: 'en' | 'zh') => void;
    setActiveTab: (tab: TabId) => void;
    setAnnouncementOpen: (open: boolean) => void;
    setAuthModalOpen: (open: boolean) => void;
    setAuthModalTab: (tab: 'login' | 'register') => void;
    setQuotaModalOpen: (open: boolean) => void;
    setCurrentStep: (step: 1 | 2 | 3) => void;
    setPaperContent: (content: string) => void;
    setGeneratedSchema: (schema: string) => void;
    setGeneratedImage: (image: string | null) => void;
    setSuperResolutionImage: (image: string | null) => void;
    setSessionId: (id: string | null) => void;
    addReferenceImage: (image: string) => void;
    removeReferenceImage: (index: number) => void;
    clearReferenceImages: () => void;
    setChartLanguage: (lang: 'en' | 'zh') => void;
    addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
    loadFromHistory: (id: string) => void;
    resetProject: () => void;
    setHasHydrated: (state: boolean) => void;
}

const defaultLogicConfig: ModelConfig = {
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    modelName: 'deepseek-chat',
};

const defaultVisionConfig: ModelConfig = {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    modelName: 'gemini-3-pro-image-preview',
};

export const useWorkflowStore = create<WorkflowState>()(
    persist(
        (set, get) => ({
            // Initial state
            // UUID fallback
            _genUUID: () => {
                try {
                    const c: any = (globalThis as any).crypto;
                    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
                } catch {}
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
                    const r = Math.random() * 16 | 0;
                    const v = ch === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            },
            logicConfig: defaultLogicConfig,
            visionConfig: defaultVisionConfig,
            language: 'zh',
            activeTab: 'diagram',
            currentStep: 1,
            paperContent: '',
            generatedSchema: '',
            generatedImage: null,
            superResolutionImage: null,
            referenceImages: [],
            chartLanguage: 'zh',
            history: [],
            sessionId: null,
            announcementOpen: false,
            authModalOpen: false,
            authModalTab: 'login',
            quotaModalOpen: false,
            _hasHydrated: false,

            // Actions
            setLogicConfig: (config) => set({ logicConfig: config }),
            setVisionConfig: (config) => set({ visionConfig: config }),
            setLanguage: (lang) => set({ language: lang }),
            setActiveTab: (tab) => set({ activeTab: tab }),
            setAnnouncementOpen: (open) => set({ announcementOpen: open }),
            setAuthModalOpen: (open) => set({ authModalOpen: open }),
            setAuthModalTab: (tab) => set({ authModalTab: tab }),
            setQuotaModalOpen: (open) => set({ quotaModalOpen: open }),
            setCurrentStep: (step) => set({ currentStep: step }),
            setPaperContent: (content) => set({ paperContent: content }),
            setGeneratedSchema: (schema) => set({ generatedSchema: schema }),
            setGeneratedImage: (image) => set({ generatedImage: image }),
            setSuperResolutionImage: (image) => set({ superResolutionImage: image }),
            setSessionId: (id) => set({ sessionId: id }),
            setChartLanguage: (lang) => set({ chartLanguage: lang }),

            addReferenceImage: (image) => set((state) => ({
                referenceImages: [...state.referenceImages, image]
            })),

            removeReferenceImage: (index) => set((state) => ({
                referenceImages: state.referenceImages.filter((_, i) => i !== index)
            })),

            clearReferenceImages: () => set({ referenceImages: [] }),

            addToHistory: (item) => set((state) => ({
                history: [
                    {
                        ...item,
                        id: state._genUUID(),
                        timestamp: Date.now(),
                    },
                    ...state.history.slice(0, 9), // Keep last 10 items
                ]
            })),

            loadFromHistory: (id) => {
                const item = get().history.find((h) => h.id === id);
                if (item) {
                    set({
                        generatedSchema: item.schema,
                        generatedImage: item.imageUrl,
                    });
                }
            },

            resetProject: () => set({
                paperContent: '',
                generatedSchema: '',
                generatedImage: null,
                referenceImages: [],
                currentStep: 1,
            }),

            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'academic-illustrator-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                logicConfig: state.logicConfig,
                visionConfig: state.visionConfig,
                language: state.language,
                activeTab: state.activeTab,
                chartLanguage: state.chartLanguage,
                paperContent: state.paperContent,
                generatedSchema: state.generatedSchema,
                history: state.history,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
