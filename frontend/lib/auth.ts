import { jwtDecode } from "jwt-decode";
import { User } from "./types";

const TOKEN_KEY = "authToken";
export const AUTH_EVENT = "fundify-auth-change";

interface DecodedToken {
  sub: string;
  exp: number;
  iat: number;
  email?: string;
  username?: string;
  name?: string;
}

// Save token to localStorage and cookie
export const saveToken = async (token: string): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `authToken=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

  try {
    const { default: axios } = await import("axios");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    const response = await axios.get(`${apiUrl}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Backend direkt user object döndürüyor
    if (response.data) {
      const userData = response.data.data ?? response.data;
      localStorage.setItem("user", JSON.stringify(userData));
    }
  } catch (error) {
    console.error("Failed to fetch user data after login:", error);
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_EVENT, { detail: { status: "login" as const } })
  );
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
    window.dispatchEvent(
      new CustomEvent(AUTH_EVENT, { detail: { status: "logout" as const } })
    );
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
        const parsed = JSON.parse(storedUser);
        const userData = parsed?.data ?? parsed;
        // Merge token data with stored user data (stored data takes priority)
        return {
          id: decoded.sub,
          email: userData.email ?? decoded.email,
          username: userData.username || userData.name || decoded.username || decoded.name,
          name: userData.name ?? decoded.name,
          avatar: userData.avatar,
          bannerImage: userData.bannerImage,
          bio: userData.bio,
          creatorBio: userData.creatorBio,
          is_creator: userData.is_creator,
        };
      } catch (e) {
        console.error("Failed to parse stored user:", e);
      }
    }

    // Fallback to token data only
    return {
      id: decoded.sub,
      email: decoded.email,
      username: decoded.username || decoded.name,
      name: decoded.name,
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
