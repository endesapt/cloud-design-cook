import { apiFetch } from "@/lib/client/api";

export async function logout() {
  await apiFetch<{ success: boolean }>("/api/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
