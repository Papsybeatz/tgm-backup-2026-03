"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, useUser } from "@supabase/auth-helpers-react";

export default function AdminGuard({ children }) {
  const router = useRouter();
  const session = useSession();
  const user = useUser();

  // 1. While loading, show nothing (prevents flicker + false redirects)
  if (session === undefined) {
    return null;
  }

  useEffect(() => {
    // 2. If no session, send to login
    if (!session) {
      router.replace("/login");
      return;
    }

    // 3. If user exists but role is not admin, send to dashboard
    if (user && user.user_metadata?.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
  }, [session, user, router]);

  // 4. If session exists but user not loaded yet, wait
  if (!user) {
    return null;
  }

  // 5. If user is admin, render the page
  return <>{children}</>;
}
