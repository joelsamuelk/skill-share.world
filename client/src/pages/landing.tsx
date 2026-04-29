import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { SignIn } from "@clerk/clerk-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const ACCESS_KEY = "skill-share-access";

export default function Landing() {
  const [password, setPassword] = useState("");
  const [accessGranted, setAccessGranted] = useState(
    () => sessionStorage.getItem(ACCESS_KEY) === "true"
  );
  const { toast } = useToast();

  const grantAccess = () => {
    sessionStorage.setItem(ACCESS_KEY, "true");
    setAccessGranted(true);
  };

  const revokeAccess = () => {
    sessionStorage.removeItem(ACCESS_KEY);
    setAccessGranted(false);
  };

  const validatePassword = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/validate-password", { password });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        grantAccess();
      } else {
        toast({
          title: "Access Denied",
          description: "Invalid password. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
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
          <div className="space-y-4">
            <div className="flex justify-center">
              <SignIn
                routing="hash"
                forceRedirectUrl="/"
              />
            </div>
            <div className="text-center">
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={revokeAccess}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
