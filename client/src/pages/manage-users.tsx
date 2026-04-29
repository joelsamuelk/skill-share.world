import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { User } from "@shared/schema";

export default function ManageUsers() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: Boolean(isAuthenticated && user?.isAdmin),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  const updateAdminStatus = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/admin-status`, { isAdmin });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User admin status updated successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update user admin status.",
        variant: "destructive",
      });
    },
  });

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

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="font-caslon text-3xl font-bold mb-2" data-testid="title-manage-users">
            User Management
          </h2>
          <p className="text-muted-foreground font-light" data-testid="text-manage-description">
            Manage admin privileges for St Basil's community members
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-brandon font-medium text-xl mb-6 flex items-center" data-testid="title-all-users">
              <i className="fas fa-users mr-2 text-primary"></i>
              All Users
            </h3>
            
            {usersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground text-sm">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground" data-testid="text-no-users">
                  No users found.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Joined</th>
                      <th className="text-left p-3 font-medium">Admin Status</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="border-b border-border" data-testid={`user-row-${userItem.id}`}>
                        <td className="p-3" data-testid="text-user-name">
                          <div className="flex items-center space-x-3">
                            {userItem.profileImageUrl ? (
                              <img 
                                src={userItem.profileImageUrl} 
                                alt={`${userItem.firstName} ${userItem.lastName}`}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <i className="fas fa-user text-muted-foreground text-xs"></i>
                              </div>
                            )}
                            <span>
                              {userItem.firstName && userItem.lastName 
                                ? `${userItem.firstName} ${userItem.lastName}`
                                : userItem.firstName || userItem.lastName
                                ? (userItem.firstName || '') + ' ' + (userItem.lastName || '')
                                : userItem.email || 'Unknown User'
                              }
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground" data-testid="text-user-email">
                          {userItem.email || 'No email'}
                        </td>
                        <td className="p-3 text-muted-foreground" data-testid="text-user-joined">
                          {formatDate(userItem.createdAt!.toString())}
                        </td>
                        <td className="p-3" data-testid="text-user-admin-status">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            userItem.isAdmin 
                              ? 'bg-growth/10 text-growth' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {userItem.isAdmin ? (
                              <>
                                <i className="fas fa-crown mr-1"></i>
                                Admin
                              </>
                            ) : (
                              <>
                                <i className="fas fa-user mr-1"></i>
                                User
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3">
                          {userItem.id === user?.id ? (
                            <span className="text-muted-foreground text-sm">
                              (Current User)
                            </span>
                          ) : (
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={userItem.isAdmin || false}
                                  onCheckedChange={(checked) => {
                                    updateAdminStatus.mutate({
                                      userId: userItem.id,
                                      isAdmin: checked
                                    });
                                  }}
                                  disabled={updateAdminStatus.isPending}
                                  data-testid={`switch-admin-${userItem.id}`}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {userItem.isAdmin ? 'Remove Admin' : 'Make Admin'}
                                </span>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <i className="fas fa-trash mr-1"></i>
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete{' '}
                                      <strong>{userItem.firstName ? `${userItem.firstName} ${userItem.lastName || ''}`.trim() : userItem.email}</strong>?
                                      This will also delete their skill profile. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteUser.mutate(userItem.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Instructions */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="font-brandon font-medium text-lg mb-4 flex items-center" data-testid="title-admin-instructions">
              <i className="fas fa-info-circle mr-2 text-primary"></i>
              Admin Management Instructions
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>• <strong>Toggle Admin Status:</strong> Use the switch to grant or remove admin privileges for any user.</p>
              <p>• <strong>Admin Capabilities:</strong> Admins can approve/reject skill profiles, manage users, and export data.</p>
              <p>• <strong>Your Account:</strong> You cannot modify your own admin status through this interface.</p>
              <p>• <strong>Important:</strong> Admin privileges give full access to all application management features.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}