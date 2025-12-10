import { useAuthStore, User } from '@/store/authStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface SystemSettings {
    id: number;
    logic_base_url: string;
    logic_api_key: string;
    logic_model_name: string;
    vision_base_url: string;
    vision_api_key: string;
    vision_model_name: string;
    updated_at: string;
}

export interface GenerateSchemaResponse {
    schema: string;
    session_id: string;
}

export interface RenderImageResponse {
    imageUrl: string | null;
    text?: string;
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

export async function register(username: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
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
    sessionId?: string
): Promise<GenerateSchemaResponse> {
    const response = await fetch(`${API_BASE_URL}/api/generate-schema`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            paper_content: paperContent,
            input_images: inputImages,
            session_id: sessionId,
        }),
    });

    if (!response.ok) {
        if (response.status === 401) {
            const err = new Error('UNAUTHORIZED');
            (err as any).status = 401;
            throw err;
        }
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to generate schema');
    }

    return response.json();
}

export async function renderImage(
    visualSchema: string,
    referenceImages?: string[],
    sessionId?: string
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
        }),
    });

    if (!response.ok) {
        if (response.status === 401) {
            const err = new Error('UNAUTHORIZED');
            (err as any).status = 401;
            throw err;
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
