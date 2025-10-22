// API Configuration
export const getApiUrl = () => {
  // Production URL - Force Railway URL for production
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://perfect-happiness-production.up.railway.app/api';
  }

  // Development fallback
  return 'http://localhost:4000/api';
};

export const API_URL = getApiUrl();
