const API_BASE_URL = "http://localhost:5000";

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Login failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.token) {
    localStorage.setItem("solarops_token", data.token);
    localStorage.setItem("solarops_email", email);
    // Fetch farms from backend and cache in localStorage
    try {
      await fetchFarms(email);
    } catch (e) {
      console.error("Failed to fetch farms after login:", e);
    }
  }
  return data;
}

export async function register(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Registration failed with status ${response.status}`);
  }

  localStorage.setItem("solarops_email", email);
  return response.json();
}

export function logout() {
  localStorage.removeItem("solarops_token");
  localStorage.removeItem("solarops_email");
  localStorage.removeItem("solarops_farms");
  // History and Farm View persist in the backend.
  // Panels & Defects view is session-scoped and clears on logout.
}

export function getToken(): string | null {
  return localStorage.getItem("solarops_token");
}

export function getEmail(): string | null {
  return localStorage.getItem("solarops_email");
}

export async function fetchFarms(email: string) {
  const response = await fetch(`${API_BASE_URL}/farms?email=${encodeURIComponent(email)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch farms");
  }
  const data = await response.json();
  const farms = data.farms || [];

  // Parse the grid JSON string back into objects
  const parsed = farms.map((farm: any) => ({
    id: farm.id,
    name: farm.name,
    rows: farm.rows,
    cols: farm.cols,
    grid: JSON.parse(farm.grid || "[]"),
  }));

  return parsed;
}
