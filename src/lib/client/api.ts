export type ApiErrorShape = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = (payload as ApiErrorShape).error;
    const isSessionExpired = error?.code === "UNAUTHORIZED";

    if (isSessionExpired && typeof window !== "undefined") {
      window.location.replace("/login");
    }

    throw new Error(error?.message ?? "Request failed");
  }

  return (payload as { data: T }).data;
}
