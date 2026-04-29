import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { SignIn } from "@clerk/clerk-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [password, setPassword] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const { toast } = useToast();

  const validatePassword = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/validate-password", { password });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        setAccessGranted(true);
      } else {
        toast({
          title: "Access Denied",
          description: "Invalid password. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to validate password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      validatePassword.mutate(password);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-caslon text-4xl font-bold text-foreground mb-2" data-testid="title-main">
            St Basil's
          </h1>
          <h2 className="font-brandon text-xl font-medium text-secondary mb-4" data-testid="title-subtitle">
            Redemptive Enterprise
          </h2>
          <p className="text-muted-foreground font-light" data-testid="text-description">
            Skill Share Portal
          </p>
        </div>

        {!accessGranted ? (
          <Card>
            <CardHeader>
              <CardTitle className="font-brandon font-medium text-lg" data-testid="card-title">
                Access Required
              </CardTitle>
              <p className="text-muted-foreground text-sm font-light" data-testid="card-description">
                Please enter the access password to continue
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    data-testid="input-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={validatePassword.isPending}
                  data-testid="button-submit"
                >
                  {validatePassword.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Validating...
                    </>
                  ) : (
                    "Enter"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="flex justify-center">
            <SignIn
              routing="hash"
              afterSignInUrl="/"
              afterSignUpUrl="/"
            />
          </div>
        )}
      </div>
    </div>
  );
}
