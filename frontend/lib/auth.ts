import { jwtDecode } from "jwt-decode";
import { User } from "./types";

const TOKEN_KEY = "authToken";
export const AUTH_EVENT = "fundify-auth-change";

interface DecodedToken {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

// Save token to localStorage and cookie
export const saveToken = async (token: string): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `authToken=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

  // Dispatch login event immediately
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

// Get current user from token
export const getCurrentUser = (): Partial<User> | null => {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode<DecodedToken>(token);

    // Return basic user info from token
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
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
