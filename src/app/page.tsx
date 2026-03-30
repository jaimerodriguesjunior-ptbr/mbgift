import { redirect } from "next/navigation";

import { getCurrentUserMemberships } from "@/lib/tenants/membership";

export default async function HomePage() {
  const memberships = await getCurrentUserMemberships();

  if (memberships.length === 1) {
    redirect("/dashboard");
  }

  if (memberships.length > 1) {
    redirect("/login?error=multi-tenant");
  }

  redirect("/login");
}
