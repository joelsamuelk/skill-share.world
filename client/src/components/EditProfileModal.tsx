import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertSkillProfileSchema, type SkillProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StarRating from "@/components/StarRating";
import ImageUpload from "@/components/ImageUpload";
import { z } from "zod";

import { SKILLS_BY_CATEGORY } from "@/constants/skills";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Helper function to convert legacy string skills to array
const convertLegacySkills = (skills: any): string[] => {
  if (Array.isArray(skills)) {
    return skills;
  }
  if (typeof skills === 'string' && skills.trim()) {
    // Split by common delimiters and clean up
    return skills
      .split(/[,;]\s*/)
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);
  }
  return [];
};

// Form schema with validation consistent with SkillsForm  
const editFormSchema = insertSkillProfileSchema.extend({
  keySkills: z.array(z.string()).min(1, "Please select at least one skill"),
  profileImageUrl: z.string().optional(),
});

type EditProfileFormData = z.infer<typeof editFormSchema>;

interface EditProfileModalProps {
  profile: SkillProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProfileModal({ profile, open, onOpenChange }: EditProfileModalProps) {
  const { toast } = useToast();
  const [skillsSearch, setSkillsSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const form = useForm<EditProfileFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone || "",
      isMember: profile.isMember,
      occupation: profile.occupation,
      keySkills: convertLegacySkills(profile.keySkills),
      expertiseToShare: profile.expertiseToShare || "",
      contactMethod: profile.contactMethod,
      weeklyHours: profile.weeklyHours,
      selfLeadership: profile.selfLeadership || 0,
      cultureTeam: profile.cultureTeam || 0,
      socialImpact: profile.socialImpact || 0,
      innovation: profile.innovation || 0,
      strategy: profile.strategy || 0,
      marketing: profile.marketing || 0,
      operations: profile.operations || 0,
      fundraising: profile.fundraising || 0,
      agreeToContact: profile.agreeToContact || false,
      agreeToRENews: profile.agreeToRENews || false,
      profileImageUrl: profile.profileImageUrl || "",
      integratesFaith: profile.integratesFaith || "",
      faithIntegrationEase: profile.faithIntegrationEase || "",
      cause: profile.cause || "",
      peopleGroup: profile.peopleGroup || "",
      passionateIssue: profile.passionateIssue || "",
      passionateCountry: profile.passionateCountry || "",
      userId: profile.userId || "",
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: EditProfileFormData) => {
      const response = await apiRequest("PUT", `/api/skill-profiles/${profile.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-profiles?status=approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditProfileFormData) => {
    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Form data being submitted:', JSON.stringify(data, null, 2));
    console.log('Profile image URL in form:', data.profileImageUrl);
    console.log('Profile image URL type:', typeof data.profileImageUrl);
    console.log('Profile image URL length:', data.profileImageUrl?.length);
    console.log('=============================');
    updateProfile.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-responsive overflow-y-auto" data-testid="modal-edit-profile">
        <DialogHeader>
          <DialogTitle className="font-brandon font-medium text-xl">
            Edit Profile - {profile.name}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="font-brandon font-medium text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Image Upload */}
                <div className="flex justify-center">
                  <ImageUpload
                    currentImageUrl={form.watch("profileImageUrl") || ""}
                    onImageUploaded={(imageUrl) => {
                      console.log('=== EDIT MODAL IMAGE UPLOAD DEBUG ===');
                      console.log('onImageUploaded called with:', imageUrl);
                      console.log('Current form value before set:', form.getValues("profileImageUrl"));
                      form.setValue("profileImageUrl", imageUrl, { shouldDirty: true });
                      console.log('Form value after set:', form.getValues("profileImageUrl"));
                      console.log('Form is dirty:', form.formState.isDirty);
                      console.log('=============================');
                    }}
                    className="w-full"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="occupation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Occupation *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-occupation" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-edit-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} value={field.value || ""} data-testid="input-edit-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Skills & Expertise */}
            <Card>
              <CardHeader>
                <CardTitle className="font-brandon font-medium text-lg">What are your key skill sets?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="keySkills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Skills *</FormLabel>
                      {/* Search Box */}
                      <div className="mb-4">
                        <Input
                          placeholder="Search skills..."
                          value={skillsSearch}
                          onChange={(e) => setSkillsSearch(e.target.value)}
                          className="max-w-md"
                          data-testid="input-edit-skills-search"
                        />
                      </div>
                      
                      {/* Selected skills count */}
                      <p className="text-sm text-muted-foreground mb-3">
                        {field.value?.length || 0} skill(s) selected
                      </p>
                      
                      <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-2">
                        {Object.entries(SKILLS_BY_CATEGORY).map(([category, skills]) => {
                          const filteredSkills = skills.filter(skill =>
                            skill.toLowerCase().includes(skillsSearch.toLowerCase())
                          );
                          
                          if (filteredSkills.length === 0) return null;
                          
                          const selectedInCategory = filteredSkills.filter(skill => field.value?.includes(skill)).length;
                          const isOpen = openCategories.includes(category) || skillsSearch.length > 0;
                          
                          return (
                            <Collapsible
                              key={category}
                              open={isOpen}
                              onOpenChange={(open) => {
                                setOpenCategories(prev => 
                                  open 
                                    ? [...prev, category]
                                    : prev.filter(c => c !== category)
                                );
                              }}
                            >
                              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                <span className="font-medium text-sm">{category}</span>
                                <div className="flex items-center gap-2">
                                  {selectedInCategory > 0 && (
                                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                      {selectedInCategory}
                                    </span>
                                  )}
                                  <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-xs text-muted-foreground`}></i>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pt-2 pb-1 px-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {filteredSkills.map((skill) => (
                                    <FormItem
                                      key={skill}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(skill)}
                                          onCheckedChange={(checked) => {
                                            const currentSkills = Array.isArray(field.value) ? field.value : [];
                                            return checked
                                              ? field.onChange([...currentSkills, skill])
                                              : field.onChange(
                                                  currentSkills.filter(
                                                    (value) => value !== skill
                                                  )
                                                )
                                          }}
                                          data-testid={`checkbox-edit-skill-${skill.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal cursor-pointer">
                                        {skill}
                                      </FormLabel>
                                    </FormItem>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="expertiseToShare"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are you highly proficient in?</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} className="h-24 resize-none" data-testid="textarea-edit-expertise" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Skills Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="font-brandon font-medium text-lg">Skills Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="selfLeadership"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Self Leadership</FormLabel>
                        <FormControl>
                          <StarRating 
                            value={field.value || 0} 
                            onChange={field.onChange}
                            data-testid="rating-edit-self-leadership"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cultureTeam"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Culture, Team & Values</FormLabel>
                        <FormControl>
                          <StarRating 
                            value={field.value || 0} 
                            onChange={field.onChange}
                            data-testid="rating-edit-culture-team"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="socialImpact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Social Impact</FormLabel>
                        <FormControl>
                          <StarRating 
                            value={field.value || 0} 
                            onChange={field.onChange}
                            data-testid="rating-edit-social-impact"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="innovation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Innovation</FormLabel>
                        <FormControl>
                          <StarRating 
                            value={field.value || 0} 
                            onChange={field.onChange}
                            data-testid="rating-edit-innovation"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="strategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategy & Business</FormLabel>
                        <FormControl>
                          <StarRating 
                            value={field.value || 0} 
                            onChange={field.onChange}
                            data-testid="rating-edit-strategy"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="marketing"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marketing & Sales</FormLabel>
                        <FormControl>
                          <StarRating 
                            value={field.value || 0} 
                            onChange={field.onChange}
                            data-testid="rating-edit-marketing"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="operations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operations</FormLabel>
                        <FormControl>
                          <StarRating 
                            value={field.value || 0} 
                            onChange={field.onChange}
                            data-testid="rating-edit-operations"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="fundraising"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fundraising</FormLabel>
                        <FormControl>
                          <StarRating 
                            value={field.value || 0} 
                            onChange={field.onChange}
                            data-testid="rating-edit-fundraising"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Faith Integration & Calling */}
            <Card>
              <CardHeader>
                <CardTitle className="font-brandon font-medium text-lg">Faith Integration & Calling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="integratesFaith"
                    render={({ field }) => (
                      <FormItem className="flex flex-col h-full">
                        <FormLabel className="form-label-fixed">Do you integrate your faith into your work life?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="edit-select-integrates-faith">
                              <SelectValue placeholder="Please select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="i-dont-know">I don't know</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="faithIntegrationEase"
                    render={({ field }) => (
                      <FormItem className="flex flex-col h-full">
                        <FormLabel className="form-label-fixed">Is faith integration easy for you?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="edit-select-faith-integration-ease">
                              <SelectValue placeholder="Please select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                            <SelectItem value="i-dont-know">I don't know</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cause"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you have a cause you feel called to?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe any cause or mission you feel passionate about or called to..."
                          className="h-20 resize-none"
                          {...field}
                          value={field.value || ""} 
                          data-testid="edit-textarea-cause"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="peopleGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Is there a particular people group you feel called to help?</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., women, children, refugees..."
                            {...field}
                            value={field.value || ""} 
                            data-testid="edit-input-people-group"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="passionateIssue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Is there a particular issue you're passionate about?</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., environment, education..."
                            {...field}
                            value={field.value || ""} 
                            data-testid="edit-input-passionate-issue"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="passionateCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Is there a particular country you feel passionate about?</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter a country or region..."
                          {...field}
                          value={field.value || ""} 
                          data-testid="edit-input-passionate-country"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Contact & Availability */}
            <Card>
              <CardHeader>
                <CardTitle className="font-brandon font-medium text-lg">Contact & Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Agreement Checkbox */}
                <FormField
                  control={form.control}
                  name="agreeToContact"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-edit-agree-contact"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium leading-none">
                          Yes, I'm happy to be contacted by St Basils members regarding my skills and expertise
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Tick this box if you're open to mentoring, advice, and collaboration opportunities
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                
                {/* Contact Details - Only show if user agrees to be contacted */}
                {form.watch("agreeToContact") && (
                  <FormField
                    control={form.control}
                    name="contactMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Contact Method *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-contact-method">
                              <SelectValue placeholder="Select contact method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="both">Both Email and Phone</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Email and Phone fields - conditionally shown */}
                {form.watch("agreeToContact") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              {...field} 
                              data-testid="input-edit-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              type="tel"
                              {...field}
                              value={field.value || ""} 
                              data-testid="input-edit-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="weeklyHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Availability</FormLabel>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                          <label className="text-sm">Hours per month:</label>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger className="w-48" data-testid="select-edit-weekly-hours">
                                <SelectValue placeholder="Select hours" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">No time available</SelectItem>
                              <SelectItem value="1-2">1-2 hours</SelectItem>
                              <SelectItem value="3-5">3-5 hours</SelectItem>
                              <SelectItem value="6-10">6-10 hours</SelectItem>
                              <SelectItem value="10+">10+ hours</SelectItem>
                              <SelectItem value="custom">Custom amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {field.value === "custom" && (
                          <div className="flex items-center space-x-2">
                            <label className="text-sm text-muted-foreground">Enter hours:</label>
                            <Input 
                              type="number"
                              min="0"
                              max="168"
                              placeholder="e.g., 7"
                              className="w-24"
                              onChange={(e) => field.onChange(`${e.target.value} hours`)}
                              data-testid="input-edit-custom-hours"
                            />
                            <span className="text-sm text-muted-foreground">hours per month</span>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* RE News Checkbox */}
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="agreeToRENews"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-edit-agree-re-news"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium leading-none">
                          Are you happy for St Basils to contact you regarding RE news and events?
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Tick this box if you'd like to receive updates about Redemptive Enterprise news and events
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProfile.isPending}
                data-testid="button-save-edit"
              >
                {updateProfile.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
