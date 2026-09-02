import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getSessionProfile } from "@/lib/data/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  return <AppShell profile={profile}>{children}</AppShell>;
}
