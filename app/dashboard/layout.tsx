import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { LocalePrefSync } from "@/components/LocalePrefSync";
import { getSessionProfile } from "@/lib/data/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  return (
    <>
      <LocalePrefSync profile={profile} />
      <AppShell profile={profile}>{children}</AppShell>
    </>
  );
}
