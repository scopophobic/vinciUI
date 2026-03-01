function getApiBase(): string {
  const raw = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

async function request<T>(path: string, body: any): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const apiBase = getApiBase();
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}/api/auth/me`, {
    credentials: 'include',
    headers,
  });

  if (!response.ok) return null;
  return response.json();
}

export async function logout(): Promise<void> {
  const apiBase = getApiBase();
  await fetch(`${apiBase}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  localStorage.removeItem('auth_token');
}

export function getLoginUrl(): string {
  return `${getApiBase()}/api/auth/google`;
}
