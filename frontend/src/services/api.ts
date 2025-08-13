import { UploadResponse, ProcessResponse, Coordinate } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.makeRequest('/api/health');
  }

  // Upload image
  async uploadImage(imageDataUrl: string): Promise<UploadResponse> {
    return this.makeRequest<UploadResponse>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ image: imageDataUrl }),
    });
  }

  // Process image with object removal
  async processImage(
    imageDataUrl: string,
    coordinates: Coordinate[],
    options?: { prompt?: string; num_inference_steps?: number; guidance_scale?: number; seed?: string | number }
  ): Promise<ProcessResponse> {
    const payload: Record<string, any> = {
      image: imageDataUrl,
      coordinates,
    };
    if (options?.prompt !== undefined) payload.prompt = options.prompt;
    if (options?.num_inference_steps !== undefined) payload.num_inference_steps = options.num_inference_steps;
    if (options?.guidance_scale !== undefined) payload.guidance_scale = options.guidance_scale;
    if (options?.seed !== undefined && options.seed !== '') payload.seed = options.seed;

    return this.makeRequest<ProcessResponse>('/api/process', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Download processed image
  async downloadImage(imageDataUrl: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageDataUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Download failed');
    }

    return response.blob();
  }
}

// Utility functions for image handling
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload JPG or PNG images only.',
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size too large. Please upload images smaller than 10MB.',
    };
  }

  return { isValid: true };
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Export singleton instance
export const apiService = new ApiService(); 