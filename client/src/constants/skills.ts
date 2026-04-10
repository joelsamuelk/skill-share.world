// Grouped skills list for the skills selection interface
export const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  "Technology & Digital": [
    "Software Development", "Web Development", "Mobile App Development", "UI/UX Design", 
    "Data Analysis", "Database Management", "Cloud Computing", "Cybersecurity", 
    "AI/Machine Learning", "DevOps", "Network Administration", "IT Support",
    "Digital Marketing", "Social Media Management", "SEO/SEM", "E-commerce"
  ],
  "Business & Management": [
    "Project Management", "Strategic Planning", "Business Development", "Operations Management",
    "Human Resources", "Talent Acquisition", "Training & Development", "Performance Management",
    "Financial Management", "Accounting", "Budgeting", "Financial Planning",
    "Sales", "Customer Service", "Account Management", "Business Analysis",
    "Leadership", "Team Management", "Change Management", "Process Improvement"
  ],
  "Marketing & Communications": [
    "Content Creation", "Copywriting", "Brand Management", "Public Relations",
    "Event Planning", "Community Management", "Video Production", "Photography",
    "Graphic Design", "Marketing Strategy", "Market Research", "Customer Insights"
  ],
  "Education & Training": [
    "Teaching", "Curriculum Development", "Educational Technology", "Adult Learning",
    "Coaching", "Mentoring", "Workshop Facilitation", "Public Speaking",
    "Research", "Academic Writing", "Policy Development"
  ],
  "Healthcare & Wellness": [
    "Healthcare Management", "Patient Care", "Medical Research", "Health Education",
    "Mental Health Support", "Counseling", "Therapy", "Wellness Programs",
    "Nutrition", "Fitness Training"
  ],
  "Creative & Arts": [
    "Creative Writing", "Visual Arts", "Music", "Theater", "Film Production",
    "Interior Design", "Architecture", "Fashion Design", "Crafts & DIY"
  ],
  "Social Services & Community": [
    "Social Work", "Community Outreach", "Volunteer Coordination", "Nonprofit Management",
    "Fundraising", "Grant Writing", "Program Development", "Policy Advocacy",
    "Youth Work", "Elder Care", "Disability Support"
  ],
  "Skilled Trades & Technical": [
    "Construction", "Electrical Work", "Plumbing", "HVAC", "Automotive Repair",
    "Carpentry", "Welding", "Equipment Maintenance", "Quality Control"
  ],
  "Hospitality & Events": [
    "Event Management", "Catering", "Restaurant Management", "Customer Experience",
    "Travel Planning", "Hospitality Management"
  ],
  "Legal & Compliance": [
    "Legal Research", "Contract Management", "Compliance", "Risk Management",
    "Insurance", "Real Estate"
  ],
  "Other Professional Skills": [
    "Translation", "Language Instruction", "Consulting", "Administration",
    "Documentation", "Time Management", "Problem Solving", "Critical Thinking",
    "Communication", "Negotiation", "Conflict Resolution", "Other"
  ]
};

// Flat list for backwards compatibility
export const SKILLS_OPTIONS = Object.values(SKILLS_BY_CATEGORY).flat();
