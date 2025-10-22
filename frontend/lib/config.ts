// API Configuration
export const getApiUrl = () => {
  // Production URL - Use Node.js backend temporarily
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://fundify-backend.vercel.app/api';
  }
  
  // Development fallback
  return 'http://localhost:4000/api';
};

export const API_URL = getApiUrl();
