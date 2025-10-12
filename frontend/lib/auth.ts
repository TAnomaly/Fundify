import { jwtDecode } from "jwt-decode";
import { User } from "./types";

const TOKEN_KEY = "authToken";

interface DecodedToken {
  userId: string;
  email: string;
  username: string;
  exp: number;
  iat: number;
}

// Save token to localStorage and cookie
export const saveToken = async (token: string): Promise<void> => {
  if (typeof window !== "undefined") {
    console.log('saveToken called with token:', token.substring(0, 20) + '...');
    localStorage.setItem(TOKEN_KEY, token);
    console.log('Token saved to localStorage');
    // Also save to cookie for middleware
    document.cookie = `authToken=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    console.log('Token saved to cookie');
    // Verify it was saved
    const saved = localStorage.getItem(TOKEN_KEY);
    console.log('Token verification - saved?', saved ? 'YES' : 'NO');
    
    // Fetch and save complete user data
    try {
      const { default: axios } = await import("axios");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      
      const response = await axios.get(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.data) {
        localStorage.setItem("user", JSON.stringify(response.data.data));
        console.log("✅ User data saved to localStorage:", response.data.data.name);
      }
    } catch (error) {
      console.error("Failed to fetch user data after login:", error);
    }
  } else {
    console.error('saveToken called on server side!');
  }
};

// Get token from localStorage
export const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

// Remove token from localStorage and cookie
export const removeToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    // Also remove from cookie
    document.cookie = "authToken=; path=/; max-age=0";
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = getToken();
  if (!token) return false;

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    const currentTime = Date.now() / 1000;

    // Check if token is expired
    if (decoded.exp < currentTime) {
      removeToken();
      return false;
    }

    return true;
  } catch (error) {
    removeToken();
    return false;
  }
};

// Get current user from token AND localStorage (merged)
export const getCurrentUser = (): Partial<User> | null => {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode<DecodedToken>(token);

    // Try to get updated user data from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        // Merge token data with stored user data (stored data takes priority)
        return {
          id: decoded.userId,
          email: decoded.email,
          username: userData.username || decoded.username,
          name: userData.name,
          avatar: userData.avatar,
          bannerImage: userData.bannerImage,
          bio: userData.bio,
          creatorBio: userData.creatorBio,
        };
      } catch (e) {
        console.error("Failed to parse stored user:", e);
      }
    }

    // Fallback to token data only
    return {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username,
    };
  } catch (error) {
    return null;
  }
};

// Decode token to get user info
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    return null;
  }
};
