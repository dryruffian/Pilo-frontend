// client/src/hooks/useApi.js
import { useState } from 'react';
import api from '../utils/axios';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = async (method, url, data = null) => {
    setLoading(true);
    setError(null);

    try {
      const config = {
        method,
        url,
        ...(data && { data }),
      };
      
      const response = await api(config);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    request
  };
};