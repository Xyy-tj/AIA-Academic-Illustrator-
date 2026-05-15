import { useAuthStore, User } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';

export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:8000';

export interface SystemSettings {
    id: number;
    logic_base_url: string;
    logic_api_key: string;
    logic_model_name: string;
    vision_base_url: string;
    vision_api_key: string;
    vision_model_name: string;
    smtp_host?: string;
    smtp_port?: number;
    smtp_user?: string;
    smtp_password?: string;
    smtp_tls?: boolean;
    smtp_from?: string;
    epay_api_url?: string;
    epay_pid?: string;
    epay_key?: string;
    epay_return_url?: string;
    epay_notify_url?: string;
    pay_provider?: 'epay' | 'hupi';
    hupi_appid?: string;
    hupi_appsecret?: string;
    hupi_return_url?: string;
    hupi_notify_url?: string;
    hupi_callback_url?: string;
    recharge_ratio?: number;
    site_logo?: string;
    site_favicon?: string;
    site_name?: string;
    footer_text?: string;
    announcement_enabled?: boolean;
    announcement_title?: string;
    announcement_body?: string;
    announcement_image_url?: string;
    announcement_last_updated?: string;
    aliyun_access_key_id?: string;
    aliyun_access_key_secret?: string;
    aliyun_endpoint?: string;
    storage_type?: string;
    cos_secret_id?: string;
    cos_secret_key?: string;
    cos_region?: string;
    cos_bucket?: string;
    cos_path_prefix?: string;
    // Quota Costs
    cost_schema_generation?: number;
    cost_image_rendering?: number;
    cost_extraction?: number;
    cost_translation?: number;
    cost_super_resolution?: number;
    cost_ppt_generation?: number;
    initial_quota?: number;
    updated_at: string;
}

export interface AdminCreateUserPayload {
    username: string;
    email?: string;
}

export interface GenerateSchemaResponse {
    schema: string;
    session_id: string;
}

export interface RenderImageResponse {
    imageUrl: string | null;
    text?: string;
}

export interface ReferenceItem {
    id: number;
    title: string;
    description?: string;
    image_data: string;
    tags?: string[];
    order: number;
}

export interface SchemaTemplateItem {
    id: number;
    title: string;
    layout?: string;
    content: string;
    order: number;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}

function getAuthHeaders(): HeadersInit {
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

export async function login(username: string, password: string):Promise<AuthResponse> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(error.detail || 'Login failed');
    }

    return response.json();
}

export async function generatePPTBatch(requests: BatchPPTGenerateItem[]): Promise<BatchPPTGenerateResponse> {
    const response = await fetch(`${API_BASE_URL}/api/generate-ppt-batch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
        if (response.status === 402) {
             useWorkflowStore.getState().setQuotaModalOpen(true);
             throw new Error('Insufficient quota');
        }
        const error = await response.json().catch(() => ({ detail: 'Failed to generate PPT batch' }));
        throw new Error(error.detail || 'Failed to generate PPT batch');
    }

    return response.json();
}

export interface HelpGuide {
    id: number;
    key: string;
    title: string;
    images: string; // JSON string of urls
    updated_at: string;
}

export async function previewPrompt(type: string, payload: any): Promise<{ prompt: string }> {
    const response = await fetch(`${API_BASE_URL}/api/preview-prompt`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ type, payload }),
    });

    if (!response.ok) {
        throw new Error('Failed to preview prompt');
    }

    return response.json();
}

export async function fetchHelpGuides(): Promise<HelpGuide[]> {
    const response = await fetch(`${API_BASE_URL}/api/help-guides`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) throw new Error('Failed to fetch help guides');
    return response.json();
}

export async function fetchHelpGuide(key: string): Promise<HelpGuide> {
    const response = await fetch(`${API_BASE_URL}/api/help-guides/${key}`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) throw new Error('Failed to fetch help guide');
    return response.json();
}

export async function updateHelpGuide(key: string, data: Partial<HelpGuide>): Promise<HelpGuide> {
    const response = await fetch(`${API_BASE_URL}/api/help-guides/${key}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update help guide');
    return response.json();
}

// Deprecated: previewPPTPrompt (use previewPrompt instead, kept for backward compatibility if needed)
export async function previewPPTPrompt(description: string, styleId?: number): Promise<{ prompt: string }> {
    return previewPrompt('ppt', { description, style_id: styleId });
}

export interface SuperResolutionResponse {
    image_url: string;
}

export async function superResolution(imageUrl: string): Promise<SuperResolutionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/super-resolution`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ image_url: imageUrl }),
    });

    if (!response.ok) {
        if (response.status === 401) {
            const err = new Error('UNAUTHORIZED');
            (err as any).status = 401;
            throw err;
        }
        if (response.status === 402) {
            useWorkflowStore.getState().setQuotaModalOpen(true);
            throw new Error('Insufficient quota');
        }
        const errorData = await response.json().catch(() => ({ detail: 'Super resolution failed' }));
        throw new Error(errorData.detail || 'Super resolution failed');
    }

    return response.json();
}

export interface PublicSettings {
    site_logo?: string;
    site_favicon?: string;
    site_name?: string;
    footer_text?: string;
    announcement_enabled?: boolean;
    announcement_title?: string;
    announcement_body?: string;
    announcement_image_url?: string;
    announcement_last_updated?: string;
    recharge_ratio?: number;
    cost_schema_generation?: number;
    cost_image_rendering?: number;
    cost_extraction?: number;
    cost_translation?: number;
    cost_super_resolution?: number;
    cost_ppt_generation?: number;
    updated_at: string;
}

export async function fetchPublicSettings(): Promise<PublicSettings> {
    const response = await fetch(`${API_BASE_URL}/api/public/settings`);
    if (!response.ok) {
        throw new Error('Failed to fetch public settings');
    }
    return response.json();
}

export async function register(username: string, password: string, email: string, code: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, email, code }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
}

export async function sendEmailCode(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/send-email-code`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to send email code' }));
        throw new Error(error.detail || 'Failed to send email code');
    }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to change password' }));
        throw new Error(error.detail || 'Failed to change password');
    }
}

export async function fetchUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
            ...getAuthHeaders(),
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch user');
    }

    return response.json();
}

export async function fetchAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: {
            ...getAuthHeaders(),
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch users');
    }

    return response.json();
}

export async function adminCreateUser(payload: AdminCreateUserPayload): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create user' }));
        throw new Error(error.detail || 'Failed to create user');
    }
    return response.json();
}

export async function updateUserQuota(userId: number, quota: number): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/quota?quota=${quota}`, {
        method: 'PUT',
        headers: {
            ...getAuthHeaders(),
        },
    });

    if (!response.ok) {
        throw new Error('Failed to update quota');
    }

    return response.json();
}

export async function generateSchema(
    paperContent: string,
    inputImages?: string[],
    sessionId?: string,
    chartLanguage?: 'zh' | 'en'
): Promise<GenerateSchemaResponse> {
    const url = `${API_BASE_URL}/api/generate-schema`;
    const payload = {
        paper_content: paperContent,
        input_images: inputImages,
        session_id: sessionId,
        chart_language: chartLanguage,
    };
    try {
        console.debug('generateSchema request', { url, sessionId, chartLanguage, hasImages: !!inputImages?.length, contentLength: paperContent.length });
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            if (response.status === 401) {
                const err = new Error('UNAUTHORIZED');
                (err as any).status = 401;
                console.error('generateSchema unauthorized', { url, status: response.status });
                throw err;
            }
            if (response.status === 402) {
                useWorkflowStore.getState().setQuotaModalOpen(true);
                throw new Error('Insufficient quota');
            }
            const text = await response.text().catch(() => '');
            console.error('generateSchema failed', { url, status: response.status, body: payload, responseText: text });
            let detail: string | undefined;
            try {
                detail = JSON.parse(text).detail;
            } catch {}
            throw new Error(detail || 'Failed to generate schema');
        }

        const json = await response.json();
        console.debug('generateSchema success', { sessionId: json.session_id, schemaLength: json.schema?.length || 0 });
        return json;
    } catch (e) {
        console.error('generateSchema network error', { url, payload, error: e });
        throw e instanceof Error ? e : new Error('NETWORK_ERROR');
    }
}

export async function renderImage(
    visualSchema: string,
    referenceImages?: string[],
    sessionId?: string,
    chartLanguage?: 'zh' | 'en'
): Promise<RenderImageResponse> {
    const response = await fetch(`${API_BASE_URL}/api/render-image`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            visual_schema: visualSchema,
            reference_images: referenceImages,
            session_id: sessionId,
            chart_language: chartLanguage,
        }),
    });

    if (!response.ok) {
        if (response.status === 401) {
            const err = new Error('UNAUTHORIZED');
            (err as any).status = 401;
            throw err;
        }
        if (response.status === 402) {
            useWorkflowStore.getState().setQuotaModalOpen(true);
            throw new Error('Insufficient quota');
        }
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to render image');
    }

    return response.json();
}

export async function fetchSettings(): Promise<SystemSettings> {
    const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch settings');
    }
    return response.json();
}

export async function fetchReferenceLibrary(): Promise<ReferenceItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/library/references`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch reference library');
    }
    return response.json();
}

export async function fetchSchemaTemplates(): Promise<SchemaTemplateItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/library/templates`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch schema templates');
    }
    return response.json();
}

export async function adminCreateReference(item: Omit<ReferenceItem, 'id'>): Promise<ReferenceItem> {
    const response = await fetch(`${API_BASE_URL}/admin/library/references`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            title: item.title,
            description: item.description,
            image_data: item.image_data,
            tags: item.tags,
            order: item.order,
        }),
    });
    if (!response.ok) throw new Error('Failed to create reference');
    return response.json();
}

export async function adminUpdateReference(id: number, item: Partial<ReferenceItem>): Promise<ReferenceItem> {
    const response = await fetch(`${API_BASE_URL}/admin/library/references/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('Failed to update reference');
    return response.json();
}

export async function adminDeleteReference(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/library/references/${id}`, {
        method: 'DELETE',
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) throw new Error('Failed to delete reference');
}

export async function adminCreateTemplate(item: Omit<SchemaTemplateItem, 'id'>): Promise<SchemaTemplateItem> {
    const response = await fetch(`${API_BASE_URL}/admin/library/templates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('Failed to create template');
    return response.json();
}

export async function adminUpdateTemplate(id: number, item: Partial<SchemaTemplateItem>): Promise<SchemaTemplateItem> {
    const response = await fetch(`${API_BASE_URL}/admin/library/templates/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('Failed to update template');
    return response.json();
}

export async function adminDeleteTemplate(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/library/templates/${id}`, {
        method: 'DELETE',
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) throw new Error('Failed to delete template');
}

export async function updateSettings(payload: Partial<SystemSettings>): Promise<SystemSettings> {
    const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error('Failed to update settings');
    }
    return response.json();
}

export interface HistoryItem {
    session_id: string;
    user_id: number;
    username: string;
    input_summary?: string;
    schema_text?: string;
    image_url?: string;
    created_at: string;
    updated_at: string;
    type: 'generation' | 'translation' | 'extraction' | 'super_resolution';
}

export async function fetchHistory(userId?: number): Promise<HistoryItem[]> {
    const url = new URL(`${API_BASE_URL}/admin/history`);
    if (userId) url.searchParams.set('user_id', String(userId));
    const response = await fetch(url.toString(), {
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch history');
    }
    return response.json();
}

export interface TranslateImageResponse {
    translated_text: string;
}

export async function translateImage(
    file: File,
    source_language: string,
    target_language: string
): Promise<TranslateImageResponse> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('source_language', source_language);
    form.append('target_language', target_language);

    const response = await fetch(`${API_BASE_URL}/api/translate-image`, {
        method: 'POST',
        headers: {
            // Do NOT set Content-Type manually for FormData
            ...getAuthHeaders(),
        },
        body: form,
    });

    if (!response.ok) {
        if (response.status === 402) {
            useWorkflowStore.getState().setQuotaModalOpen(true);
            throw new Error('Insufficient quota');
        }
        const errorData = await response.json().catch(() => ({ detail: 'Translation failed' }));
        throw new Error(errorData.detail || 'Translation failed');
    }

    return response.json();
}

export interface ExtractElementsResponse {
    result_text: string;
    image_url: string;
}

export async function extractElements(
    file: File
): Promise<ExtractElementsResponse> {
    const form = new FormData();
    form.append('file', file, file.name);

    const response = await fetch(`${API_BASE_URL}/api/extract-elements`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
        },
        body: form,
    });

    if (!response.ok) {
        if (response.status === 401) {
            const err = new Error('UNAUTHORIZED');
            (err as any).status = 401;
            throw err;
        }
        if (response.status === 402) {
            useWorkflowStore.getState().setQuotaModalOpen(true);
            throw new Error('Insufficient quota');
        }
        const errorData = await response.json().catch(() => ({ detail: 'Extraction failed' }));
        throw new Error(errorData.detail || 'Extraction failed');
    }

    return response.json();
}

export interface UploadResponse {
    url: string;
}

export async function uploadFile(file: File): Promise<UploadResponse> {
    const form = new FormData();
    form.append('file', file, file.name);

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
        },
        body: form,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
}

export async function fetchMyHistory(): Promise<HistoryItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/history/me`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch history');
    }
    return response.json();
}

export async function createRecharge(amount: number, payType: 'alipay' | 'wxpay'): Promise<{ pay_url: string; out_trade_no: string; }> {
    const response = await fetch(`${API_BASE_URL}/api/pay/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ amount, pay_type: payType }),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create recharge' }));
        throw new Error(error.detail || 'Failed to create recharge');
    }
    return response.json();
}

export interface PromptConfig {
    key: string;
    value: string;
    description?: string;
    updated_at: string;
}

export async function fetchPrompts(): Promise<PromptConfig[]> {
    const response = await fetch(`${API_BASE_URL}/admin/prompts`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch prompts');
    }
    return response.json();
}

export async function updatePrompt(key: string, value: string): Promise<PromptConfig> {
    const response = await fetch(`${API_BASE_URL}/admin/prompts/${key}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ value }),
    });
    if (!response.ok) {
        throw new Error('Failed to update prompt');
    }
    return response.json();
}

export async function resetPrompt(key: string): Promise<PromptConfig> {
    const response = await fetch(`${API_BASE_URL}/admin/prompts/${key}/reset`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error('Failed to reset prompt');
    }
    return response.json();
}

export interface RedemptionCode {
    id: number;
    code: string;
    type: 'once' | 'repeat';
    quota: number;
    max_uses: number;
    used_count: number;
    is_active: boolean;
    created_at: string;
}

export interface CreateRedemptionCodePayload {
    type: 'once' | 'repeat';
    quota: number;
    count?: number;
    code_str?: string;
}

export async function fetchRedemptionCodes(): Promise<RedemptionCode[]> {
    const response = await fetch(`${API_BASE_URL}/admin/redemption-codes`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch redemption codes');
    }
    return response.json();
}

export async function createRedemptionCodes(payload: CreateRedemptionCodePayload): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/redemption-codes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create codes' }));
        throw new Error(error.detail || 'Failed to create codes');
    }
    return response.json();
}

export async function deleteRedemptionCode(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/redemption-codes/${id}`, {
        method: 'DELETE',
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error('Failed to delete code');
    }
}

export async function redeemCode(code: string): Promise<{ message: string; added_quota: number; new_balance: number }> {
    const response = await fetch(`${API_BASE_URL}/api/redeem`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ code }),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Redemption failed' }));
        throw new Error(error.detail || 'Redemption failed');
    }
    return response.json();
}

// PPT Generation
export interface PPTStyle {
    id: number;
    name: string;
    description?: string;
    prompt_suffix: string;
    preview_image_url?: string;
    is_active: boolean;
    order: number;
    created_at: string;
}

export interface GeneratePPTResponse {
    result: string;
    image_url: string;
    cost: number;
}

export interface BatchPPTGenerateItem {
    description: string;
    style_id?: number;
}

export interface BatchPPTGenerateResult {
    success: boolean;
    description: string;
    result?: string;
    image_url?: string;
    error?: string;
}

export interface BatchPPTGenerateResponse {
    results: BatchPPTGenerateResult[];
    total_cost: number;
}

export async function fetchPPTStyles(): Promise<PPTStyle[]> {
    const response = await fetch(`${API_BASE_URL}/api/ppt-styles`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch PPT styles');
    }
    return response.json();
}

export async function createPPTStyle(style: Omit<PPTStyle, 'id' | 'created_at'>): Promise<PPTStyle> {
    const response = await fetch(`${API_BASE_URL}/api/ppt-styles`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(style),
    });
    if (!response.ok) {
        throw new Error('Failed to create PPT style');
    }
    return response.json();
}

export async function updatePPTStyle(id: number, style: Partial<PPTStyle>): Promise<PPTStyle> {
    const response = await fetch(`${API_BASE_URL}/api/ppt-styles/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(style),
    });
    if (!response.ok) {
        throw new Error('Failed to update PPT style');
    }
    return response.json();
}

export async function deletePPTStyle(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/ppt-styles/${id}`, {
        method: 'DELETE',
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error('Failed to delete PPT style');
    }
}

export async function generatePPT(description: string, styleId?: number): Promise<GeneratePPTResponse> {
    const response = await fetch(`${API_BASE_URL}/api/generate-ppt`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ description, style_id: styleId }),
    });

    if (!response.ok) {
        if (response.status === 402) {
             useWorkflowStore.getState().setQuotaModalOpen(true);
             throw new Error('Insufficient quota');
        }
        const error = await response.json().catch(() => ({ detail: 'Failed to generate PPT' }));
        throw new Error(error.detail || 'Failed to generate PPT');
    }

    return response.json();
}

