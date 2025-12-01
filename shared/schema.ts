import { z } from "zod";

// User types
export type UserRole = "admin" | "student";
export type UserStatus = "pending" | "approved" | "blocked";

export interface User {
  id: string;
  role: UserRole;
  email: string;
  password: string;
  fullName: string;
  className?: string; // For students only
  adminId?: string; // For admins only
  status: UserStatus;
  hasVoted: string[]; // Array of election IDs the user has voted in
}

export const insertStudentSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  className: z.string().min(1, "Class is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertAdminSchema = z.object({
  adminId: z.string().min(3, "Admin ID must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

export const loginStudentSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const loginAdminSchema = z.object({
  adminId: z.string().min(1, "Admin ID is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type LoginStudent = z.infer<typeof loginStudentSchema>;
export type LoginAdmin = z.infer<typeof loginAdminSchema>;

// Election types
export type ElectionStatus = "upcoming" | "live" | "completed";

export interface Election {
  id: string;
  title: string;
  description: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  resultsPublished: boolean;
  posts: Post[];
}

export interface Post {
  id: string;
  title: string; // e.g., "President", "Sports Captain"
  candidates: Candidate[];
}

export interface Candidate {
  id: string;
  name: string;
  description: string;
  photoUrl?: string;
}

export const insertElectionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  startTime: z.string(),
  endTime: z.string(),
});

export const insertPostSchema = z.object({
  title: z.string().min(2, "Post title must be at least 2 characters"),
});

export const insertCandidateSchema = z.object({
  name: z.string().min(2, "Candidate name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

export type InsertElection = z.infer<typeof insertElectionSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

// Vote types
export interface Vote {
  id: string;
  electionId: string;
  postId: string;
  candidateId: string;
  voterId: string;
  timestamp: string;
}

export interface VoteSubmission {
  electionId: string;
  votes: {
    postId: string;
    candidateId: string;
  }[];
}

// Result types
export interface PostResult {
  postId: string;
  postTitle: string;
  candidates: {
    candidateId: string;
    candidateName: string;
    voteCount: number;
  }[];
  winner?: {
    candidateId: string;
    candidateName: string;
    voteCount: number;
  };
}

export interface ElectionResult {
  electionId: string;
  electionTitle: string;
  totalVoters: number;
  posts: PostResult[];
}

// Session type
export interface SessionUser {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  className?: string;
  adminId?: string;
  status: UserStatus;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
