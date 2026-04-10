import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="font-caslon text-4xl font-bold text-foreground mb-4" data-testid="title-welcome">
            Welcome to St Basil's RE Skill Share
          </h1>
          <p className="text-muted-foreground text-lg font-light max-w-2xl mx-auto" data-testid="text-welcome-description">
            Connect with our community, share your expertise, and discover the talents within St Basil's Redemptive Enterprise network.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <i className="fas fa-user-plus text-4xl text-primary mb-4"></i>
                <h2 className="font-brandon font-medium text-xl mb-2" data-testid="card-setup-title">
                  Setup Your Skills
                </h2>
                <p className="text-muted-foreground font-light" data-testid="card-setup-description">
                  Share your expertise and skills with the community
                </p>
              </div>
              <Link href="/setup-skills">
                <Button className="w-full" data-testid="button-setup-skills">
                  Create Skills Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <i className="fas fa-search text-4xl text-trust mb-4"></i>
                <h2 className="font-brandon font-medium text-xl mb-2" data-testid="card-view-title">
                  View Skills Database
                </h2>
                <p className="text-muted-foreground font-light" data-testid="card-view-description">
                  Discover talents and connect with community members
                </p>
              </div>
              <Link href="/view-skills">
                <Button variant="outline" className="w-full" data-testid="button-view-skills">
                  Browse Skills
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {user?.isAdmin && (
          <div className="mt-12 max-w-md mx-auto">
            <Card className="border-community/20 bg-community/5">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <i className="fas fa-shield-alt text-2xl text-community mb-2"></i>
                  <h3 className="font-brandon font-medium text-lg" data-testid="admin-panel-title">
                    Admin Panel
                  </h3>
                  <p className="text-muted-foreground text-sm font-light" data-testid="admin-panel-description">
                    Review and approve skill profiles
                  </p>
                </div>
                <Link href="/admin">
                  <Button variant="outline" className="w-full" data-testid="button-admin-dashboard">
                    Admin Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
