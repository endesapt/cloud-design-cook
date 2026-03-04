import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSessionUserFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "global_admin") {
    redirect("/admin/overview");
  }

  redirect("/dashboard");
}
