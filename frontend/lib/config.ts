// API Configuration
export const getApiUrl = () => {
  // Production URL - Force Railway URL for production
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const url = 'https://perfect-happiness-production.up.railway.app/api';
    console.log("🔗 Config API URL:", url);
    return url;
  }
  
  // Development fallback
  const url = 'http://localhost:4000/api';
  console.log("🔗 Config API URL (dev):", url);
  return url;
};

export const API_URL = getApiUrl();
