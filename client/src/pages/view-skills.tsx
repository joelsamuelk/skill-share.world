import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import SkillCard from "@/components/SkillCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { SkillProfile } from "@shared/schema";

export default function ViewSkills() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");

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

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<SkillProfile[]>({
    queryKey: ["/api/skill-profiles?status=approved"],
    enabled: isAuthenticated,
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

  // Skill category mappings for filtering
  const skillCategories: Record<string, string[]> = {
    strategy: ["strategic", "business", "planning", "consulting", "analysis"],
    marketing: ["marketing", "sales", "brand", "advertising", "seo", "content", "social media", "public relations"],
    innovation: ["innovation", "research", "development", "technology", "ai", "machine learning", "digital"],
    leadership: ["leadership", "management", "team", "coaching", "mentoring", "training"],
    operations: ["operations", "process", "project", "logistics", "supply", "quality"],
    fundraising: ["fundraising", "grant", "donor", "philanthropy", "nonprofit"],
    other: []
  };

  // Filter profiles based on search query and skill filter
  const filteredProfiles = profiles.filter(profile => {
    const keySkillsText = Array.isArray(profile.keySkills) 
      ? profile.keySkills.join(' ').toLowerCase() 
      : '';
    
    const matchesSearch = !searchQuery || 
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.occupation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      keySkillsText.includes(searchQuery.toLowerCase());

    let matchesSkill = true;
    if (skillFilter && skillFilter !== "all") {
      if (skillFilter === "other") {
        // "Other" matches profiles that don't fit other categories
        const allCategoryKeywords = Object.values(skillCategories).flat();
        matchesSkill = !allCategoryKeywords.some(keyword => keySkillsText.includes(keyword));
      } else {
        const keywords = skillCategories[skillFilter] || [];
        matchesSkill = keywords.some(keyword => keySkillsText.includes(keyword));
      }
    }

    return matchesSearch && matchesSkill;
  });

  const totalMembers = profiles.length;
  const availableHours = profiles.reduce((sum, profile) => {
    const hours = profile.weeklyHours;
    if (hours === '1-2') return sum + 1.5;
    if (hours === '3-5') return sum + 4;
    if (hours === '6-10') return sum + 8;
    if (hours === '10+') return sum + 12;
    return sum;
  }, 0);
  const experts = profiles.filter(profile => profile.expertiseToShare?.trim()).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="font-caslon text-3xl font-bold mb-2" data-testid="title-view-skills">
            Community Skills Database
          </h2>
          <p className="text-muted-foreground font-light" data-testid="text-view-description">
            Discover the talents and expertise within our St Basil's community
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search by name, skills, or occupation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={skillFilter} onValueChange={setSkillFilter}>
                  <SelectTrigger className="w-48" data-testid="select-skill-filter">
                    <SelectValue placeholder="All Skills" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Skills</SelectItem>
                    <SelectItem value="strategy">Strategy & Business</SelectItem>
                    <SelectItem value="marketing">Marketing & Sales</SelectItem>
                    <SelectItem value="innovation">Innovation</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="fundraising">Fundraising</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="secondary"
                  onClick={() => {
                    // Trigger search - already handled by state changes
                  }}
                  data-testid="button-search"
                >
                  <i className="fas fa-search mr-2"></i>Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {profilesLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading skills profiles...</p>
          </div>
        )}

        {/* Skills Grid */}
        {!profilesLoading && (
          <>
            {filteredProfiles.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <i className="fas fa-search text-4xl text-muted-foreground mb-4"></i>
                  <h3 className="font-brandon font-medium text-lg mb-2" data-testid="text-no-results">
                    No Skills Found
                  </h3>
                  <p className="text-muted-foreground font-light" data-testid="text-no-results-description">
                    {searchQuery || skillFilter 
                      ? "No profiles match your search criteria. Try adjusting your filters."
                      : "No approved skill profiles available yet."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-skills">
                {filteredProfiles.map((profile) => (
                  <SkillCard key={profile.id} profile={profile} />
                ))}
              </div>
            )}
          </>
        )}
        
        {/* Stats Summary */}
        {!profilesLoading && profiles.length > 0 && (
          <Card className="mt-8 bg-muted/50">
            <CardContent className="p-6">
              <h3 className="font-brandon font-medium text-lg mb-4" data-testid="title-community-overview">
                Community Overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-medium text-foreground" data-testid="stat-total-members">
                    {totalMembers}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Members</div>
                </div>
                <div>
                  <div className="text-2xl font-medium text-trust" data-testid="stat-skill-categories">
                    9
                  </div>
                  <div className="text-sm text-muted-foreground">Skill Categories</div>
                </div>
                <div>
                  <div className="text-2xl font-medium text-growth" data-testid="stat-available-hours">
                    {Math.round(availableHours)}
                  </div>
                  <div className="text-sm text-muted-foreground">Available Hours/Week</div>
                </div>
                <div>
                  <div className="text-2xl font-medium text-community" data-testid="stat-experts">
                    {experts}
                  </div>
                  <div className="text-sm text-muted-foreground">Expert Contributors</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
