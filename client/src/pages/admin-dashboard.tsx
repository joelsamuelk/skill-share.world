import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EditProfileModal from "@/components/EditProfileModal";
import type { SkillProfile, User } from "@shared/schema";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [editingProfile, setEditingProfile] = useState<SkillProfile | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [fromEmail, setFromEmail] = useState("");

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

  // Redirect non-admin users
  useEffect(() => {
    if (user && !user.isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin access required for this page.",
        variant: "destructive",
      });
      window.location.href = "/";
    }
  }, [user, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    pendingCount: number;
    approvedToday: number;
    totalProfiles: number;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: Boolean(isAuthenticated && user?.isAdmin),
  });

  const { data: pendingProfiles = [], isLoading: pendingLoading } = useQuery<SkillProfile[]>({
    queryKey: ["/api/skill-profiles?status=pending"],
    enabled: Boolean(isAuthenticated && user?.isAdmin),
  });

  const { data: approvedProfiles = [], isLoading: approvedLoading } = useQuery<SkillProfile[]>({
    queryKey: ["/api/skill-profiles?status=approved"],
    enabled: Boolean(isAuthenticated && user?.isAdmin),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ profileId, status }: { profileId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/skill-profiles/${profileId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-profiles?status=pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/skill-profiles?status=approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Profile status updated successfully.",
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
        description: "Failed to update profile status.",
        variant: "destructive",
      });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const response = await apiRequest("DELETE", `/api/skill-profiles/${profileId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-profiles?status=approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Profile deleted successfully.",
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
        description: "Failed to delete profile.",
        variant: "destructive",
      });
    },
  });

  const exportData = () => {
    window.open('/api/admin/export', '_blank');
  };

  const { data: usersWithoutProfiles = [], isLoading: usersWithoutProfilesLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users-without-profiles"],
    enabled: Boolean(isAuthenticated && user?.isAdmin),
  });

  const sendRemindersMutation = useMutation({
    mutationFn: async (fromEmail: string) => {
      const response = await apiRequest("POST", "/api/admin/send-profile-reminders", { fromEmail });
      return response.json();
    },
    onSuccess: (data: { sent: number; failed: number; total: number; message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-without-profiles"] });
      setShowEmailDialog(false);
      setFromEmail("");
      
      if (data.message) {
        toast({
          title: "No Users Found",
          description: data.message,
        });
      } else {
        toast({
          title: "Emails Sent",
          description: `Successfully sent ${data.sent} reminder emails${data.failed > 0 ? `, ${data.failed} failed` : ''}.`,
        });
      }
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
        description: "Failed to send reminder emails.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || (!user?.isAdmin && user)) {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  };

  const renderStarRating = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground text-xs">Not rated</span>;
    
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <i
            key={star}
            className={`fas fa-star ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} text-xs`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto pt-16 sm:pt-20 px-6 pb-6">
        <div className="mb-8">
          <h2 className="font-caslon text-3xl font-bold mb-2" data-testid="title-admin-dashboard">
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground font-light" data-testid="text-admin-description">
            Review and approve skill profiles for community inclusion
          </p>
        </div>

        {/* Email Reminder Card */}
        {usersWithoutProfiles.length > 0 && (
          <Card className="mb-6 border-l-4 border-l-community">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-brandon font-medium text-lg mb-2 flex items-center" data-testid="title-users-without-profiles">
                    <i className="fas fa-envelope mr-2 text-community"></i>
                    Profile Reminders
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {usersWithoutProfiles.length} user{usersWithoutProfiles.length !== 1 ? 's have' : ' has'} not created {usersWithoutProfiles.length !== 1 ? 'their' : 'a'} skill profile yet.
                  </p>
                  <Button
                    onClick={() => setShowEmailDialog(true)}
                    className="bg-community hover:bg-community/90"
                    disabled={sendRemindersMutation.isPending}
                    data-testid="button-send-reminders"
                  >
                    {sendRemindersMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane mr-2"></i>
                        Send Email Reminders
                      </>
                    )}
                  </Button>
                </div>
                <div className="hidden sm:block">
                  <i className="fas fa-user-clock text-5xl text-community/20"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reviews</p>
                  <p className="text-2xl font-medium text-community" data-testid="stat-pending-count">
                    {statsLoading ? "..." : stats?.pendingCount || 0}
                  </p>
                </div>
                <i className="fas fa-clock text-2xl text-community/60"></i>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved Today</p>
                  <p className="text-2xl font-medium text-growth" data-testid="stat-approved-today">
                    {statsLoading ? "..." : stats?.approvedToday || 0}
                  </p>
                </div>
                <i className="fas fa-check-circle text-2xl text-growth/60"></i>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Profiles</p>
                  <p className="text-2xl font-medium text-trust" data-testid="stat-total-profiles">
                    {statsLoading ? "..." : stats?.totalProfiles || 0}
                  </p>
                </div>
                <i className="fas fa-users text-2xl text-trust/60"></i>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Export Data</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exportData}
                    className="text-primary hover:text-primary/80 font-medium mt-1 p-0 h-auto"
                    data-testid="button-export-data"
                  >
                    Download CSV
                  </Button>
                </div>
                <i className="fas fa-download text-2xl text-primary/60"></i>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-brandon font-medium text-xl mb-6 flex items-center" data-testid="title-pending-approvals">
              <i className="fas fa-hourglass-half mr-2 text-community"></i>
              Pending Approvals
            </h3>
            
            {pendingLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground text-sm">Loading pending profiles...</p>
              </div>
            ) : pendingProfiles.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-check-circle text-4xl text-growth/60 mb-4"></i>
                <p className="text-muted-foreground" data-testid="text-no-pending">
                  No pending approvals at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingProfiles.map((profile) => (
                  <div key={profile.id} className="border border-border rounded-lg p-4 bg-muted/50" data-testid={`pending-profile-${profile.id}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium text-lg" data-testid="text-profile-name">
                          {profile.name}
                        </h4>
                        <p className="text-sm text-muted-foreground" data-testid="text-profile-occupation">
                          {profile.occupation}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid="text-profile-submitted">
                          Submitted: {getTimeAgo(profile.createdAt?.toString() || new Date().toISOString())}
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-growth text-white hover:bg-growth/90"
                          onClick={() => updateStatusMutation.mutate({ profileId: profile.id!, status: 'approved' })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-approve-${profile.id}`}
                        >
                          <i className="fas fa-check mr-1"></i>Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ profileId: profile.id!, status: 'rejected' })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-reject-${profile.id}`}
                        >
                          <i className="fas fa-times mr-1"></i>Reject
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Key Skills:</p>
                        <p className="text-sm text-muted-foreground font-light" data-testid="text-profile-skills">
                          {profile.keySkills}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">St Basil's Member:</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-profile-member">
                          {profile.isMember === 'yes' ? 'Yes' : profile.isMember === 'no' ? 'No' : 'Regular Attendee'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Skills Ratings:</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span>Strategy:</span>
                          {renderStarRating(profile.strategy)}
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Marketing:</span>
                          {renderStarRating(profile.marketing)}
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Leadership:</span>
                          {renderStarRating(profile.selfLeadership)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Approved */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-brandon font-medium text-xl mb-6 flex items-center" data-testid="title-recently-approved">
              <i className="fas fa-check-circle mr-2 text-growth"></i>
              Recently Approved
            </h3>
            
            {approvedLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground text-sm">Loading approved profiles...</p>
              </div>
            ) : approvedProfiles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground" data-testid="text-no-approved">
                  No approved profiles yet.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Occupation</th>
                      <th className="text-left p-3 font-medium hidden sm:table-cell">Approved Date</th>
                      <th className="text-left p-3 font-medium hidden sm:table-cell">Contact</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedProfiles.slice(0, 10).map((profile) => (
                      <tr key={profile.id} className="border-b border-border" data-testid={`approved-profile-${profile.id}`}>
                        <td className="p-3" data-testid="text-approved-name">
                          {profile.name}
                        </td>
                        <td className="p-3 text-muted-foreground" data-testid="text-approved-occupation">
                          {profile.occupation}
                        </td>
                        <td className="p-3 text-muted-foreground hidden sm:table-cell" data-testid="text-approved-date">
                          {profile.approvedAt ? formatDate(profile.approvedAt.toString()) : 'N/A'}
                        </td>
                        <td className="p-3 text-muted-foreground hidden sm:table-cell" data-testid="text-approved-email">
                          {profile.email}
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary/80 text-sm p-0 h-auto"
                              onClick={() => setEditingProfile(profile)}
                              data-testid={`button-edit-${profile.id}`}
                            >
                              <i className="fas fa-edit mr-1"></i>Edit
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive/80 text-sm p-0 h-auto"
                                  data-testid={`button-delete-${profile.id}`}
                                >
                                  <i className="fas fa-trash mr-1"></i>Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent data-testid="dialog-delete-profile">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {profile.name}'s profile? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteProfileMutation.mutate(profile.id!)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={deleteProfileMutation.isPending}
                                    data-testid="button-confirm-delete"
                                  >
                                    {deleteProfileMutation.isPending ? (
                                      <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Deleting...
                                      </>
                                    ) : (
                                      "Delete Profile"
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent data-testid="dialog-send-reminders">
          <DialogHeader>
            <DialogTitle>Send Profile Reminder Emails</DialogTitle>
            <DialogDescription>
              Send reminder emails to {usersWithoutProfiles.length} user{usersWithoutProfiles.length !== 1 ? 's' : ''} who haven't created their skill profiles yet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="from-email">From Email Address</Label>
              <Input
                id="from-email"
                type="email"
                placeholder="noreply@skill-share.world"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                data-testid="input-from-email"
              />
              <p className="text-sm text-muted-foreground">
                This must be a verified sender address in your SendGrid account.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailDialog(false);
                setFromEmail("");
              }}
              data-testid="button-cancel-send"
            >
              Cancel
            </Button>
            <Button
              onClick={() => sendRemindersMutation.mutate(fromEmail)}
              disabled={!fromEmail || !fromEmail.includes('@') || sendRemindersMutation.isPending}
              data-testid="button-confirm-send"
            >
              {sendRemindersMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Send Emails
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Modal */}
      {editingProfile && (
        <EditProfileModal
          profile={editingProfile}
          open={!!editingProfile}
          onOpenChange={(open) => !open && setEditingProfile(null)}
        />
      )}
    </div>
  );
}
