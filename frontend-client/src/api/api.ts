export const API_URL = "http://localhost:8080/api";

export async function apiRegister(email: string, username: string, password: string) {
  const res = await fetch(`${API_URL}/rooms/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Error al registrar usuario");
  }
  return res.json();
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/rooms/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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

// El backend sabe quién entra por el token del header, no por un username
export async function apiJoinRoom(code: string, sessionToken: string) {
  const res = await fetch(`${API_URL}/rooms/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Token": sessionToken },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error("No se pudo unir a la sala");
  return res.json();
}

// Devuelve null si el servidor responde con error, para que quien llama
// pueda dejar la cola como estaba.
export async function apiGetQueue(roomId: string) {
  const res = await fetch(`${API_URL}/queue/${roomId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) ? data : data?.queue || [];
}

export async function apiSearchSongs(query: string) {
  const res = await fetch(`${API_URL}/songs/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Error en la busqueda");
  const data = await res.json();
  return Array.isArray(data) ? data : data?.results || [];
}

type AddToQueueRequest = {
  roomId: number;
  ytId: string;
  title: string;
  artist: string;
  thumb: string;
};

export async function apiAddToQueue(sessionToken: string, item: AddToQueueRequest) {
  const res = await fetch(`${API_URL}/queue/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Token": sessionToken,
    },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "No se pudo agregar la cancion");
  }
}

export async function apiToggleVote(sessionToken: string, queueItemId: number, alreadyVoted: boolean) {
  const res = await fetch(`${API_URL}/votes/${queueItemId}`, {
    method: alreadyVoted ? "DELETE" : "POST",
    headers: { "X-Session-Token": sessionToken },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "No se pudo actualizar el voto.");
  }
}
