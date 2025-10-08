// API Configuration
export const getApiUrl = () => {
  // Try environment variable first
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Production fallback
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://perfect-happiness-production.up.railway.app/api';
  }
  
  // Development fallback
  return 'http://localhost:4000/api';
};

export const API_URL = getApiUrl();
