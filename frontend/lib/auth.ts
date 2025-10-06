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

// Save token to localStorage
export const saveToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

// Get token from localStorage
export const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

// Remove token from localStorage
export const removeToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
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
