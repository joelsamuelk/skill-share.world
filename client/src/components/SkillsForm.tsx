import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertSkillProfileSchema, type InsertSkillProfile } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import StarRating from "./StarRating";
import ImageUpload from "./ImageUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const formSchema = insertSkillProfileSchema.extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  occupation: z.string().min(1, "Occupation is required"),
  keySkills: z.array(z.string()).min(1, "Please select at least one skill"),
  contactMethod: z.string().optional(),
  isMember: z.string().min(1, "Please select membership status"),
});

import { SKILLS_BY_CATEGORY } from "@/constants/skills";

type FormData = z.infer<typeof formSchema>;

export default function SkillsForm() {
  const { toast } = useToast();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [skillsSearch, setSkillsSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      isMember: "",
      occupation: "",
      keySkills: [],
      expertiseToShare: "",
      contactMethod: "",
      email: "",
      phone: "",
      weeklyHours: "0",
      selfLeadership: 0,
      cultureTeam: 0,
      socialImpact: 0,
      innovation: 0,
      strategy: 0,
      marketing: 0,
      operations: 0,
      fundraising: 0,
      agreeToContact: false,
      agreeToRENews: false,
      profileImageUrl: "",
      integratesFaith: "",
      faithIntegrationEase: "",
      cause: "",
      peopleGroup: "",
      passionateIssue: "",
      passionateCountry: "",
    },
  });

  const createProfile = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/skill-profiles", data);
      return response.json();
    },
    onSuccess: () => {
      setShowSuccessModal(true);
      form.reset();
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
        description: "Failed to submit profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createProfile.mutate(data);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" data-testid="form-skills">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="font-brandon font-medium text-xl" data-testid="title-personal-info">
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image Upload */}
              <div className="flex justify-center">
                <ImageUpload
                  currentImageUrl={form.watch("profileImageUrl")}
                  onImageUploaded={(imageUrl) => form.setValue("profileImageUrl", imageUrl)}
                  className="w-full"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your full name" 
                          {...field} 
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isMember"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Is St Basils your home? *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-member-status">
                            <SelectValue placeholder="Please select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Occupation *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Software Developer, Teacher, Business Owner" 
                        {...field} 
                        data-testid="input-occupation"
                      />
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
              <CardTitle className="font-brandon font-medium text-xl" data-testid="title-skills-assessment">
                Skills Assessment
              </CardTitle>
              <p className="text-muted-foreground text-sm font-light">
                Rate your proficiency in each area (0 = No experience, 1 = Beginner, 5 = Highly proficient)
              </p>
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
                          value={field.value} 
                          onChange={field.onChange}
                          data-testid="rating-self-leadership"
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
                          value={field.value} 
                          onChange={field.onChange}
                          data-testid="rating-culture-team"
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
                          value={field.value} 
                          onChange={field.onChange}
                          data-testid="rating-social-impact"
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
                      <FormLabel>Innovation, Imagination</FormLabel>
                      <FormControl>
                        <StarRating 
                          value={field.value} 
                          onChange={field.onChange}
                          data-testid="rating-innovation"
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
                      <FormLabel>Strategy, Business Model</FormLabel>
                      <FormControl>
                        <StarRating 
                          value={field.value} 
                          onChange={field.onChange}
                          data-testid="rating-strategy"
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
                      <FormLabel>Marketing, Sales</FormLabel>
                      <FormControl>
                        <StarRating 
                          value={field.value} 
                          onChange={field.onChange}
                          data-testid="rating-marketing"
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
                      <FormLabel>Operating Model</FormLabel>
                      <FormControl>
                        <StarRating 
                          value={field.value} 
                          onChange={field.onChange}
                          data-testid="rating-operations"
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
                      <FormLabel>Fundraising & Governance</FormLabel>
                      <FormControl>
                        <StarRating 
                          value={field.value} 
                          onChange={field.onChange}
                          data-testid="rating-fundraising"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Key Skills Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="font-brandon font-medium text-xl" data-testid="title-key-skills">
                What are your key skill sets?
              </CardTitle>
              <p className="text-muted-foreground text-sm font-light">
                Select all skills that apply to you. Choose the areas where you have experience or expertise.
              </p>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="keySkills"
                render={({ field }) => (
                  <FormItem>
                    {/* Search Box */}
                    <div className="mb-4">
                      <Input
                        placeholder="Search skills..."
                        value={skillsSearch}
                        onChange={(e) => setSkillsSearch(e.target.value)}
                        className="max-w-md"
                        data-testid="input-skills-search"
                      />
                    </div>
                    
                    {/* Selected skills count */}
                    <p className="text-sm text-muted-foreground mb-3">
                      {field.value?.length || 0} skill(s) selected
                    </p>
                    
                    <div className="max-h-96 overflow-y-auto border rounded-lg p-2 space-y-2">
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
                                          return checked
                                            ? field.onChange([...field.value, skill])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== skill
                                                )
                                              )
                                        }}
                                        data-testid={`checkbox-skill-${skill.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
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
              
              {/* Expertise to Share */}
              <div className="mt-6">
                <FormField
                  control={form.control}
                  name="expertiseToShare"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are you highly proficient in?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Is there anything that you are highly proficient in and would be willing to share/present to our Redemptive Enterprise Network?"
                          className="h-24 resize-none"
                          {...field}
                          value={field.value || ""} 
                          data-testid="textarea-expertise-share"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Faith Integration & Calling */}
          <Card>
            <CardHeader>
              <CardTitle className="font-brandon font-medium text-xl" data-testid="title-faith-calling">
                Faith Integration & Calling
              </CardTitle>
              <p className="text-muted-foreground text-sm font-light">
                Help us understand how your faith intersects with your work and calling
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="integratesFaith"
                  render={({ field }) => (
                    <FormItem className="flex flex-col h-full">
                      <FormLabel className="form-label-fixed">Do you integrate your faith into your work life?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-integrates-faith">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-faith-integration-ease">
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
                        data-testid="textarea-cause"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          data-testid="input-people-group"
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
                          data-testid="input-passionate-issue"
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
                        data-testid="input-passionate-country"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Availability & Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="font-brandon font-medium text-xl" data-testid="title-availability-contact">
                Availability & Contact
              </CardTitle>
              <p className="text-muted-foreground text-sm font-light">
                Are you happy for members of St Basils to contact you regarding your skills and area of interest for mentoring/collaboration? If so please fill out your preferred method of contact and time you have available. If not mark no.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Agreement Checkbox */}
              <FormField
                control={form.control}
                name="agreeToContact"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-agree-contact"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                <>
                  <FormField
                    control={form.control}
                    name="contactMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Contact Method *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-contact-method">
                              <SelectValue placeholder="Please select..." />
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="your.email@example.com"
                              {...field} 
                              data-testid="input-email"
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
                              placeholder="+44 7XXX XXXXXX"
                              {...field}
                              value={field.value || ""} 
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="weeklyHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Availability</FormLabel>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-4">
                            <label className="text-sm">Hours per month:</label>
                            <Select onValueChange={field.onChange} defaultValue={field.value || "0"}>
                              <FormControl>
                                <SelectTrigger className="w-48" data-testid="select-weekly-hours">
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
                                data-testid="input-custom-hours"
                              />
                              <span className="text-sm text-muted-foreground">hours per month</span>
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
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
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-agree-re-news"
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

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="lg"
              className="font-brandon font-medium"
              disabled={createProfile.isPending}
              data-testid="button-submit-profile"
            >
              {createProfile.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Submit Profile for Review
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md" data-testid="modal-success">
          <DialogHeader className="text-center">
            <div className="mb-4">
              <i className="fas fa-check-circle text-4xl text-growth"></i>
            </div>
            <DialogTitle className="font-brandon font-medium text-xl mb-2" data-testid="title-success">
              Profile Submitted!
            </DialogTitle>
            <p className="text-muted-foreground text-sm font-light" data-testid="text-success-description">
              Your skills profile has been submitted for review. You'll receive an email notification once it's been approved.
            </p>
          </DialogHeader>
          <div className="text-center mt-6">
            <Button 
              onClick={() => {
                setShowSuccessModal(false);
                window.location.href = "/view-skills";
              }}
              data-testid="button-continue"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
