import axios from 'axios';
import { createLogger } from '../utils/logger';

const logger = createLogger('http');

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:9090';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    (config as unknown as Record<string, unknown>).__startTime = Date.now();
    logger.debug(`${config.method?.toUpperCase()} ${config.url}`, {
      method: config.method,
      url: config.url,
      params: config.params,
    });
    return config;
  },
  (error) => {
    logger.error('Request setup failed', { error: error.message });
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    const startTime = (response.config as unknown as Record<string, unknown>).__startTime as number;
    const duration = startTime ? Date.now() - startTime : 0;
    logger.info(
      `${response.config.method?.toUpperCase()} ${response.config.url} ${response.status} (${duration}ms)`
    );
    return response;
  },
  (error) => {
    const config = error.config || {};
    const startTime = (config as unknown as Record<string, unknown>).__startTime as number;
    const duration = startTime ? Date.now() - startTime : 0;
    const status = error.response?.status || 'NETWORK_ERROR';
    logger.error(
      `${config.method?.toUpperCase() || 'UNKNOWN'} ${config.url || 'unknown'} ${status} (${duration}ms)`,
      {
        status,
        message: error.message,
        responseData: error.response?.data,
      }
    );
    return Promise.reject(error);
  }
);

export default apiClient;
