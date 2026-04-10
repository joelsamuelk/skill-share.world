import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import EditProfileModal from "@/components/EditProfileModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { SkillProfile } from "@shared/schema";

export default function MyProfile() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [editingProfile, setEditingProfile] = useState<SkillProfile | null>(null);

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

  const { data: profile, isLoading: profileLoading, error } = useQuery<SkillProfile>({
    queryKey: ["/api/my-profile"],
    enabled: isAuthenticated,
    retry: false,
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

  if (!isAuthenticated) {
    return null;
  }

  if (error && isUnauthorizedError(error as Error)) {
    return null; // Will be redirected by useEffect
  }

  // Helper function to get skill rating label
  const getSkillLabel = (rating: number) => {
    switch (rating) {
      case 1: return "Beginner";
      case 2: return "Basic";
      case 3: return "Intermediate";
      case 4: return "Advanced";
      case 5: return "Highly proficient";
      default: return "Not rated";
    }
  };

  // Helper function to get top skills
  const getTopSkills = () => {
    if (!profile) return [];
    
    const skills = [
      { name: "Self Leadership", rating: profile.selfLeadership || 0, color: "trust" },
      { name: "Culture & Team", rating: profile.cultureTeam || 0, color: "community" },
      { name: "Social Impact", rating: profile.socialImpact || 0, color: "community" },
      { name: "Innovation", rating: profile.innovation || 0, color: "growth" },
      { name: "Strategy", rating: profile.strategy || 0, color: "growth" },
      { name: "Marketing", rating: profile.marketing || 0, color: "growth" },
      { name: "Operations", rating: profile.operations || 0, color: "growth" },
      { name: "Fundraising", rating: profile.fundraising || 0, color: "growth" },
    ];

    return skills
      .filter(skill => skill.rating >= 3)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="font-caslon text-3xl font-bold mb-2" data-testid="title-my-profile">
            My Profile
          </h2>
          <p className="text-muted-foreground font-light" data-testid="text-profile-description">
            View and manage your skills profile
          </p>
        </div>

        {profileLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !profile ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="py-8">
                <h3 className="font-brandon font-medium text-lg mb-2">No Profile Found</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't created a skills profile yet. Get started by setting up your profile.
                </p>
                <Button onClick={() => window.location.href = "/setup-skills"} data-testid="button-setup-profile">
                  Set Up Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    {/* Profile Image */}
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center flex-shrink-0">
                      {profile.profileImageUrl ? (
                        <img 
                          src={profile.profileImageUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          data-testid="img-profile-display"
                        />
                      ) : (
                        <div className="text-muted-foreground" data-testid="placeholder-profile-image">
                          <i className="fas fa-user text-2xl"></i>
                        </div>
                      )}
                    </div>
                    
                    {/* Profile Info */}
                    <div>
                      <h3 className="font-brandon font-medium text-xl mb-1" data-testid="text-profile-name">
                        {profile.name}
                      </h3>
                      <p className="text-muted-foreground" data-testid="text-profile-occupation">
                        {profile.occupation}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline" 
                      className={`px-3 py-1 ${
                        profile.status === 'approved' 
                          ? 'bg-growth/20 text-growth border-growth/30'
                          : profile.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'
                          : 'bg-destructive/20 text-destructive border-destructive/30'
                      }`}
                      data-testid="badge-profile-status"
                    >
                      <i className={`fas ${
                        profile.status === 'approved' ? 'fa-check-circle' :
                        profile.status === 'pending' ? 'fa-clock' : 'fa-times-circle'
                      } mr-1`}></i>
                      {profile.status === 'approved' ? 'Approved' : 
                       profile.status === 'pending' ? 'Pending Review' : 'Rejected'}
                    </Badge>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditingProfile(profile)}
                      data-testid="button-edit-profile"
                    >
                      <i className="fas fa-edit mr-2"></i>
                      Edit Profile
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Key Skills</h4>
                    <div className="flex flex-wrap gap-2" data-testid="container-profile-skills">
                      {Array.isArray(profile.keySkills) ? 
                        profile.keySkills.map((skill, index) => (
                          <span 
                            key={index}
                            className="text-sm bg-muted px-3 py-1 rounded-full border"
                            data-testid={`skill-tag-${skill.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                          >
                            {skill}
                          </span>
                        )) :
                        <p className="text-muted-foreground" data-testid="text-profile-skills">
                          {profile.keySkills}
                        </p>
                      }
                    </div>
                  </div>
                  
                  {profile.expertiseToShare && (
                    <div>
                      <h4 className="font-medium mb-2">Highly proficient knowledge I'd share</h4>
                      <p className="text-muted-foreground" data-testid="text-profile-expertise">
                        {profile.expertiseToShare}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Skills Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="font-brandon font-medium text-lg">Skills Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                {getTopSkills().length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-3">Top Expertise Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {getTopSkills().map((skill, index) => (
                          <Badge 
                            key={index}
                            variant="secondary" 
                            className={`px-3 py-1 ${
                              skill.color === 'trust' ? 'bg-trust/20 text-trust border-trust/30' :
                              skill.color === 'community' ? 'bg-community/20 text-community border-community/30' :
                              skill.color === 'growth' ? 'bg-growth/20 text-growth border-growth/30' :
                              'bg-accent text-accent-foreground'
                            }`}
                            data-testid={`badge-skill-${skill.name.toLowerCase().replace(/ /g, '-')}`}
                          >
                            {skill.name} - {getSkillLabel(skill.rating)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                      {[
                        { name: "Self Leadership", rating: profile.selfLeadership },
                        { name: "Self Leadership", rating: profile.selfLeadership },
                        { name: "Culture & Team", rating: profile.cultureTeam },
                        { name: "Social Impact", rating: profile.socialImpact },
                        { name: "Innovation", rating: profile.innovation },
                        { name: "Strategy", rating: profile.strategy },
                        { name: "Marketing", rating: profile.marketing },
                        { name: "Operations", rating: profile.operations },
                        { name: "Fundraising", rating: profile.fundraising },
                      ].map((skill, index) => (
                        <div key={index} className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{skill.name}</span>
                            <span className="text-muted-foreground">
                              {skill.rating || 0}/5
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2 transition-all duration-300" 
                              style={{ width: `${((skill.rating || 0) / 5) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No skills assessments completed yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Contact & Availability */}
            <Card>
              <CardHeader>
                <CardTitle className="font-brandon font-medium text-lg">Contact & Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-envelope text-muted-foreground w-4"></i>
                        <span data-testid="text-profile-email">{profile.email}</span>
                      </div>
                      {profile.phone && (
                        <div className="flex items-center gap-2">
                          <i className="fas fa-phone text-muted-foreground w-4"></i>
                          <span data-testid="text-profile-phone">{profile.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <i className="fas fa-comments text-muted-foreground w-4"></i>
                        <span data-testid="text-profile-contact-method">
                          Prefers: {profile.contactMethod}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Availability</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-clock text-muted-foreground w-4"></i>
                        <span data-testid="text-profile-availability">
                          {profile.weeklyHours === '0' ? 'No time available' : `${profile.weeklyHours} hours/week`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-church text-muted-foreground w-4"></i>
                        <span data-testid="text-profile-member">
                          {profile.isMember === 'yes' ? 'St basils is my home' : 'St basils is not my home'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

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