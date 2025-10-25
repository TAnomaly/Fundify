export const getStoredToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem("authToken");
  } catch {
    return null;
  }
};

export const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = getStoredToken();

  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const shouldAddJsonHeader =
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type");

  if (shouldAddJsonHeader) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });
};
