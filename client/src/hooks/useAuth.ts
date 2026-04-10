import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

async function fetchUser() {
  const res = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (res.status === 401 && window.location.hostname === "localhost") {
    await fetch("/api/login", {
      credentials: "include",
    });

    const retry = await fetch("/api/auth/user", {
      credentials: "include",
    });

    if (retry.ok) {
      return retry.json();
    }

    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
