// API service for communicating with the backend

export interface GenerateImageRequest {
  prompt: string;
  imageBase64?: string;
}

export interface GenerateImageResponse {
  image: string;
  success: boolean;
  message?: string;
}

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '';
  }

  async generateImage(request: GenerateImageRequest): Promise<GenerateImageResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  // For development/testing - simulate API call
  async simulateGeneration(request: GenerateImageRequest): Promise<GenerateImageResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          image: 'https://via.placeholder.com/512x512/4f46e5/ffffff?text=Generated+Image',
          success: true,
          message: 'Simulated generation complete'
        });
      }, 2000);
    });
  }
}

export const apiService = new ApiService();

