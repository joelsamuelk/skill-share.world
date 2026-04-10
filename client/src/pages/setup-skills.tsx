import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import SkillsForm from "@/components/SkillsForm";

export default function SetupSkills() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
      
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="font-caslon text-3xl font-bold mb-2" data-testid="title-setup-skills">
            Setup Your Skills Profile
          </h2>
          <p className="text-muted-foreground font-light" data-testid="text-setup-description">
            Share your expertise with the St Basil's Redemptive Enterprise community
          </p>
        </div>

        <SkillsForm />
      </main>
    </div>
  );
}
