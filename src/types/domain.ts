export type UserRole = "business" | "freelancer" | "admin";

export type AppUser = {
  id: string;
  email: string | null;
  role: UserRole;
};

export type BusinessDashboardSummary = {
  userId: string;
  companyName: string | null;
  openMatches: number;
  activeProjects: number;
};

export type FreelancerDashboardSummary = {
  userId: string;
  headline: string | null;
  inboxCount: number;
  activeProjects: number;
};

export type MatchingRequest = {
  businessUserId: string;
  briefId: string;
};

export type MatchingResult = {
  id: string;
  freelancerUserId: string;
  score: number | null;
  status: string;
};

export type AIProfileSummary = {
  freelancerId: string;
  summary: string | null;
  capabilities: string[];
};
