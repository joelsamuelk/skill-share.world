import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SkillProfile } from "@shared/schema";

interface SkillCardProps {
  profile: SkillProfile;
}

export default function SkillCard({ profile }: SkillCardProps) {
  const getTopSkills = (profile: SkillProfile) => {
    const skills = [
      { name: 'Strategy', value: profile.strategy, color: 'trust' },
      { name: 'Marketing', value: profile.marketing, color: 'community' },
      { name: 'Innovation', value: profile.innovation, color: 'accent' },
      { name: 'Leadership', value: profile.selfLeadership, color: 'growth' },
      { name: 'Operations', value: profile.operations, color: 'trust' },
      { name: 'Social Impact', value: profile.socialImpact, color: 'community' },
    ];
    
    return skills
      .filter(skill => skill.value && skill.value >= 4)
      .slice(0, 3);
  };

  const topSkills = getTopSkills(profile);

  const handleContact = () => {
    if (profile.contactMethod === 'email') {
      window.location.href = `mailto:${profile.email}`;
    } else if (profile.contactMethod === 'phone' && profile.phone) {
      window.location.href = `tel:${profile.phone}`;
    } else if (profile.contactMethod === 'whatsapp' && profile.phone) {
      window.open(`https://wa.me/${profile.phone.replace(/\D/g, '')}`, '_blank');
    } else {
      // Default to email if no other method available
      window.location.href = `mailto:${profile.email}`;
    }
  };

  return (
    <Card className="skill-card" data-testid={`skill-card-${profile.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4">
            {/* Profile Image */}
            <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-border flex-shrink-0 flex items-center justify-center">
              {profile.profileImageUrl ? (
                <img 
                  src={profile.profileImageUrl} 
                  alt={`${profile.name}'s profile`} 
                  className="w-full h-full object-cover"
                  data-testid="img-profile-card"
                />
              ) : (
                <div className="text-muted-foreground" data-testid="placeholder-profile-card">
                  <i className="fas fa-user text-xl"></i>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-brandon font-medium text-lg" data-testid="text-profile-name">
                {profile.name}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid="text-profile-occupation">
                {profile.occupation}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="px-2 py-1 bg-growth/20 text-growth text-xs border-growth/30">
            <i className="fas fa-check-circle mr-1"></i>Verified
          </Badge>
        </div>
        
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">Key Skills:</p>
          <div className="flex flex-wrap gap-1" data-testid="container-profile-skills">
            {Array.isArray(profile.keySkills) ? 
              profile.keySkills.slice(0, 5).map((skill, index) => (
                <span 
                  key={index}
                  className="text-xs bg-muted px-2 py-1 rounded-full border"
                  data-testid={`skill-tag-${skill.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                >
                  {skill}
                </span>
              )) :
              <p className="text-sm text-muted-foreground font-light" data-testid="text-profile-skills">
                {profile.keySkills}
              </p>
            }
            {Array.isArray(profile.keySkills) && profile.keySkills.length > 5 && (
              <span className="text-xs text-muted-foreground px-2 py-1">
                +{profile.keySkills.length - 5} more
              </span>
            )}
          </div>
        </div>
        
        {topSkills.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Top Expertise Areas:</p>
            <div className="flex flex-wrap gap-1">
              {topSkills.map((skill, index) => (
                <Badge 
                  key={index}
                  variant="secondary" 
                  className={`px-2 py-1 text-xs ${
                    skill.color === 'trust' ? 'bg-trust/20 text-trust border-trust/30' :
                    skill.color === 'community' ? 'bg-community/20 text-community border-community/30' :
                    skill.color === 'growth' ? 'bg-growth/20 text-growth border-growth/30' :
                    'bg-accent text-accent-foreground'
                  }`}
                  data-testid={`badge-skill-${skill.name.toLowerCase().replace(' ', '-')}`}
                >
                  {skill.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground" data-testid="text-weekly-hours">
            {profile.weeklyHours === '0' ? 'No availability' : `${profile.weeklyHours}/week`}
          </div>
          <Button 
            size="sm"
            onClick={handleContact}
            data-testid="button-contact"
          >
            Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
