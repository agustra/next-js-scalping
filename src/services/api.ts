const API_BASE_URL = "https://server-next-js.vercel.app/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("auth-token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const api = {
  // Users
  getUsers: async (page = 1, limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/users?page=${page}&limit=${limit}`);
    return response.json();
  },

  getSecureUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users/secure`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  getUserProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // Auth
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  register: async (email: string, password: string, name: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    return response.json();
  },

  // Local APIs
  getStockData: async () => {
    try {
      const response = await fetch("/api/yahoo");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Stock data fetch error:', error);
      throw error;
    }
  },
};