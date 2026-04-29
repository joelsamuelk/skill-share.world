import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import { setTokenGetter } from "@/lib/clerkToken";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import SetupSkills from "@/pages/setup-skills";
import ViewSkills from "@/pages/view-skills";
import MyProfile from "@/pages/my-profile";
import AdminDashboard from "@/pages/admin-dashboard";
import ManageUsers from "@/pages/manage-users";
import AdminGuard from "@/components/AdminGuard";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
  const { signOut } = useClerk();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Signed in with Clerk but DB user failed to load — show error with sign out option
  if (clerkLoaded && isSignedIn && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Unable to load your account. Please try signing out and back in.
          </p>
          <Button onClick={() => signOut()}>Sign Out</Button>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/setup-skills" component={SetupSkills} />
          <Route path="/view-skills" component={ViewSkills} />
          <Route path="/my-profile" component={MyProfile} />
          <Route path="/admin">{() => <AdminGuard><AdminDashboard /></AdminGuard>}</Route>
          <Route path="/admin/users">{() => <AdminGuard><ManageUsers /></AdminGuard>}</Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function TokenSync() {
  const { getToken } = useClerkAuth();
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TokenSync />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
