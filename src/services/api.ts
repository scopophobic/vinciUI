function getApiBase(): string {
  const raw = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

let tokenGetter: (() => Promise<string | null>) | null = null;

/** Set by AuthProvider - provides Supabase session access_token for API calls */
export function setApiTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function request<T>(path: string, body: any): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || err.message || `API ${response.status}`);
  }

  return response.json();
}

export interface GenerateImageRequest {
  prompt: string;
  images?: string[];
  model?: string;
  seed?: number | null;
}

export interface GenerateImageResponse {
  image: string;
  usage?: {
    imagesGenerated: number;
    promptsEnhanced: number;
    resetTime: string;
  };
}

export interface RefineRequest {
  prompt: string;
  mode: 'auto' | 'questions' | 'apply';
  referenceImages?: string[];
  answers?: { question: string; answer: string }[];
}

export interface RefineQuestionsResponse {
  questions: { question: string; options: string[]; answer: string }[];
}

export interface RefinePromptResponse {
  refinedPrompt: string;
}

export async function generateImage(req: GenerateImageRequest): Promise<GenerateImageResponse> {
  return request('/api/generate/image', req);
}

export async function refinePrompt(req: RefineRequest): Promise<RefinePromptResponse | RefineQuestionsResponse> {
  return request('/api/generate/refine', req);
}

export async function fetchUser(): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiBase()}/api/auth/me`, {
    credentials: 'include',
    headers,
  });

  if (!response.ok) return null;
  return response.json();
}
