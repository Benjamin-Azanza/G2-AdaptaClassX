import axios, {
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

interface DevMemoryBackend {
  handleDevMemoryRequest: (
    config: InternalAxiosRequestConfig,
  ) => Promise<AxiosResponse | null>;
}

declare global {
  interface Window {
    __ADAPTACLASS_DEV_MEMORY_BACKEND__?: DevMemoryBackend;
  }
}

const defaultAdapter = axios.getAdapter(axios.defaults.adapter);

const optionalDevMemoryAdapter: AxiosAdapter = async (config) => {
  const browserMemoryBackend = window.__ADAPTACLASS_DEV_MEMORY_BACKEND__;

  if (browserMemoryBackend) {
    const response = await browserMemoryBackend.handleDevMemoryRequest(config);

    if (response) {
      return response;
    }
  }

  if (import.meta.env.DEV) {
    try {
      const devBackend = (await import(
        /* @vite-ignore */ '/src/lib/devMemoryBackend.ts'
      )) as DevMemoryBackend;
      const response = await devBackend.handleDevMemoryRequest(config);

      if (response) {
        return response;
      }
    } catch {
      // Removing src/lib/devMemoryBackend.ts restores the normal backend flow.
    }
  }

  return defaultAdapter(config);
};

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  adapter: optionalDevMemoryAdapter,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
