export const API_URL = "http://localhost:8080/api";

export async function apiRegister(username: string, password: string) {
  const res = await fetch(`${API_URL}/rooms/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Error al registrar usuario");
  }
  return res.json();
}

export async function apiLogin(username: string, password: string) {
  const res = await fetch(`${API_URL}/rooms/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Credenciales invalidas");
  }
  return res.json();
}

export async function apiCreateRoom(name: string, sessionToken: string) {
  const res = await fetch(`${API_URL}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Token": sessionToken,
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Error al crear la sala");
  }
  return res.json();
}

export async function apiMe(sessionToken: string) {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { "X-Session-Token": sessionToken },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Error al obtener sesion");
  }
  return res.json();
}

export async function apiLogout(sessionToken: string) {
  const res = await fetch(`${API_URL}/users/logout`, {
    method: "POST",
    headers: { "X-Session-Token": sessionToken },
  });
  if (!res.ok) {
    return { success: false };
  }
  return res.json();
}
