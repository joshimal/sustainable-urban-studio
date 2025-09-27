import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Base configuration
const BASE_URL = 'http://localhost:3001/api';
const QGIS_BASE_URL = 'http://localhost:8081';

// Create axios instances
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const qgisClient = axios.create({
  baseURL: QGIS_BASE_URL,
  timeout: 60000, // Longer timeout for analysis operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptors
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

qgisClient.interceptors.request.use(
  (config) => {
    console.log(`🔄 QGIS Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ QGIS Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptors
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.url} - ${error.response?.status}`, error.response?.data);

    // Handle common errors
    if (error.response?.status === 404) {
      throw new Error('Resource not found');
    } else if (error.response?.status === 500) {
      throw new Error('Server error - please try again later');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to server - please check if the backend is running');
    }

    return Promise.reject(error);
  }
);

qgisClient.interceptors.response.use(
  (response) => {
    console.log(`✅ QGIS Response: ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`❌ QGIS Error: ${error.config?.url} - ${error.response?.status}`, error.response?.data);

    if (error.response?.status === 404) {
      throw new Error('QGIS resource not found');
    } else if (error.response?.status === 500) {
      throw new Error('QGIS server error - please try again later');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to QGIS server - please check if it\'s running');
    }

    return Promise.reject(error);
  }
);

// Generic API functions with retry logic
const withRetry = async <T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries - 1) throw error;

      console.warn(`⚠️ Retry ${i + 1}/${retries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
};

// GIS Data API
export const gisAPI = {
  // Health check
  checkHealth: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await apiClient.get('/qgis/health');
    return response.data;
  },

  // Nassau County data
  getNassauData: async (type: 'parcels' | 'stations' | 'flood_zones'): Promise<any> => {
    return withRetry(async () => {
      const response = await apiClient.get(`/qgis/nassau/get-data`, {
        params: { type }
      });
      return response.data;
    });
  },

  // Get available datasets
  getDatasets: async (): Promise<any> => {
    const response = await apiClient.get('/qgis/datasets');
    return response.data;
  },

  // Upload GIS file
  uploadFile: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<any> => {
    const formData = new FormData();
    formData.append('gisFile', file);

    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(Math.round(progress));
        }
      },
    });

    return response.data;
  },

  // Get uploaded files
  getUploadedFiles: async (): Promise<any> => {
    const response = await apiClient.get('/files');
    return response.data;
  },
};

// Analysis API
export const analysisAPI = {
  // Nassau County analyses
  analyzeHousingTransit: async (params: { buffer_miles: number }): Promise<any> => {
    return withRetry(async () => {
      const response = await qgisClient.post('/nassau/analyze-housing-transit', params);
      return response.data;
    });
  },

  analyzeFloodRisk: async (): Promise<any> => {
    return withRetry(async () => {
      const response = await qgisClient.post('/nassau/analyze-flood-risk');
      return response.data;
    });
  },

  // Tree canopy analysis
  analyzeTreeCanopy: async (params: { target_coverage: number }): Promise<any> => {
    return withRetry(async () => {
      const response = await qgisClient.post('/analyze/tree-canopy', params);
      return response.data;
    });
  },

  // Get analysis status (for long-running operations)
  getAnalysisStatus: async (analysisId: string): Promise<any> => {
    const response = await qgisClient.get(`/analysis/status/${analysisId}`);
    return response.data;
  },

  // Cancel analysis
  cancelAnalysis: async (analysisId: string): Promise<any> => {
    const response = await qgisClient.post(`/analysis/cancel/${analysisId}`);
    return response.data;
  },
};

// Progress tracking for long operations
export class ProgressTracker {
  private listeners: ((progress: { current: number; total: number; status: string }) => void)[] = [];

  subscribe(listener: (progress: { current: number; total: number; status: string }) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  update(progress: { current: number; total: number; status: string }) {
    this.listeners.forEach(listener => listener(progress));
  }
}

// Export configured clients for direct use if needed
export { apiClient, qgisClient };

// Error types
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class QGISError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'QGISError';
  }
}

// Utility functions
export const formatAPIError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  } else if (error.message) {
    return error.message;
  } else {
    return 'An unexpected error occurred';
  }
};

export const isNetworkError = (error: any): boolean => {
  return error.code === 'ECONNREFUSED' ||
         error.code === 'NETWORK_ERROR' ||
         error.message?.includes('Network Error');
};