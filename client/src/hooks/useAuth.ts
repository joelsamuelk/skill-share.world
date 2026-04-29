import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import type { User } from "@shared/schema";

export function useAuth() {
  const { isSignedIn, isLoaded } = useClerkAuth();

  const { data: user, isLoading: isUserLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    enabled: isLoaded && !!isSignedIn,
    retry: false,
  });

  return {
    user,
    isLoading: !isLoaded || (isSignedIn && isUserLoading),
    isAuthenticated: !!isSignedIn && !!user,
  };
}
