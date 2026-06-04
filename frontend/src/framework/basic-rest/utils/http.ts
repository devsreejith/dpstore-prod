import axios from 'axios';
import { getToken } from './get-token';

const http = axios.create({
  timeout: 30000,
  withCredentials: true,
});

// Change request data/error here
http.interceptors.request.use(
  (config) => {
    const isServer = typeof window === 'undefined';
    const frontendApiBaseUrl =
      process.env.NEXT_PUBLIC_REST_API_ENDPOINT || 'http://localhost:3000/api';
    const backendApiBaseUrl =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
    const publishableKey =
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_MEDUSA_API_KEY;

    const url = String(config.url ?? '');
    const isAbsolute = /^https?:\/\//i.test(url);
    const isBackendRoute =
      url.startsWith('/api/v1') ||
      url.startsWith('/uploads') ||
      url.startsWith('/static') ||
      url.startsWith('/store') ||
      url.startsWith('/auth');
    const isUploadRoute =
      url.startsWith('/api/v1/uploads');

    if (!isAbsolute) {
      if (isBackendRoute) {
        config.baseURL = backendApiBaseUrl;
      } else {
        config.baseURL = isServer ? frontendApiBaseUrl : '/api';
      }
    }

    if (url.startsWith('/store') && publishableKey) {
      config.headers = config.headers ?? {};
      (config.headers as any)['x-publishable-api-key'] = publishableKey;
    }

    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

http.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default http;
