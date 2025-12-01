import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import {
  loginStudentSchema,
  loginAdminSchema,
  insertStudentSchema,
  insertElectionSchema,
  insertPostSchema,
  insertCandidateSchema,
  type SessionUser,
  type ElectionResult,
  type PostResult,
} from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    user: SessionUser;
  }
}

// Middleware to check if user is authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Middleware to check if user is admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
}

// Middleware to check if user is approved student
function requireApprovedStudent(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user || req.session.user.role !== "student") {
    return res.status(403).json({ error: "Forbidden: Student access required" });
  }
  if (req.session.user.status !== "approved") {
    return res.status(403).json({ error: "Account not approved" });
  }
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "voting-system-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // ========================
  // Authentication Routes
  // ========================

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (req.session.user) {
      res.json({ user: req.session.user });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Student login
  app.post("/api/auth/login/student", async (req, res) => {
    try {
      const result = loginStudentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const { email, password } = result.data;
      const user = await storage.getUserByEmail(email);

      if (!user || user.role !== "student") {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (user.password !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const sessionUser: SessionUser = {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        className: user.className,
        status: user.status,
      };

      req.session.user = sessionUser;
      res.json({ user: { ...sessionUser, hasVoted: user.hasVoted } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin login
  app.post("/api/auth/login/admin", async (req, res) => {
    try {
      const result = loginAdminSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const { adminId, password } = result.data;
      const user = await storage.getUserByAdminId(adminId);

      if (!user || user.role !== "admin") {
        return res.status(401).json({ error: "Invalid admin ID or password" });
      }

      if (user.password !== password) {
        return res.status(401).json({ error: "Invalid admin ID or password" });
      }

      const sessionUser: SessionUser = {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        adminId: user.adminId,
        status: user.status,
      };

      req.session.user = sessionUser;
      res.json({ user: sessionUser });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Student registration
  app.post("/api/auth/register/student", async (req, res) => {
    try {
      const result = insertStudentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const existingUser = await storage.getUserByEmail(result.data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const user = await storage.createStudent(result.data);
      res.status(201).json({ message: "Registration successful", userId: user.id });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Forgot password (placeholder - would need email service in production)
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      res.json({ message: "If an account exists, reset instructions have been sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update profile
  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const { fullName, email } = req.body;
      const userId = req.session.user!.id;

      // Check if email is taken by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const user = await storage.updateUserProfile(userId, fullName, email);
      if (user) {
        req.session.user!.fullName = fullName;
        req.session.user!.email = email;
        res.json({ message: "Profile updated", user: req.session.user });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Change password
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.user!.id;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.password !== currentPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      await storage.updateUserPassword(userId, newPassword);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========================
  // Admin Routes
  // ========================

  // Get admin stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const students = await storage.getStudents();
      const elections = await storage.getAllElections();
      const totalVotes = await storage.getTotalVotes();

      const now = new Date();
      let liveElections = 0;
      let upcomingElections = 0;
      let completedElections = 0;

      elections.forEach((e) => {
        const start = new Date(e.startTime);
        const end = new Date(e.endTime);
        if (now < start) upcomingElections++;
        else if (now > end) completedElections++;
        else liveElections++;
      });

      res.json({
        totalStudents: students.length,
        approvedStudents: students.filter((s) => s.status === "approved").length,
        pendingStudents: students.filter((s) => s.status === "pending").length,
        totalElections: elections.length,
        liveElections,
        upcomingElections,
        completedElections,
        totalVotes,
      });
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all users (admin only)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map((u) => ({ ...u, password: undefined })));
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user status
  app.patch("/api/admin/users/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["pending", "approved", "blocked"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const user = await storage.updateUserStatus(id, status);
      if (user) {
        res.json({ message: "Status updated", user: { ...user, password: undefined } });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get recent voters
  app.get("/api/admin/recent-voters", requireAdmin, async (req, res) => {
    try {
      const voters = await storage.getRecentVoters();
      res.json(voters.map((v) => ({ ...v, password: undefined })));
    } catch (error) {
      console.error("Get voters error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========================
  // Election Routes
  // ========================

  // Get all elections
  app.get("/api/elections", requireAuth, async (req, res) => {
    try {
      const elections = await storage.getAllElections();
      res.json(elections);
    } catch (error) {
      console.error("Get elections error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create election
  app.post("/api/elections", requireAdmin, async (req, res) => {
    try {
      const result = insertElectionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const election = await storage.createElection(result.data);
      res.status(201).json(election);
    } catch (error) {
      console.error("Create election error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update election
  app.patch("/api/elections/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const election = await storage.updateElection(id, req.body);
      if (election) {
        res.json(election);
      } else {
        res.status(404).json({ error: "Election not found" });
      }
    } catch (error) {
      console.error("Update election error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete election
  app.delete("/api/elections/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteElection(id);
      if (deleted) {
        res.json({ message: "Election deleted" });
      } else {
        res.status(404).json({ error: "Election not found" });
      }
    } catch (error) {
      console.error("Delete election error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Publish/unpublish results
  app.patch("/api/elections/:id/publish", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { publish } = req.body;

      const election = await storage.publishResults(id, publish);
      if (election) {
        res.json(election);
      } else {
        res.status(404).json({ error: "Election not found" });
      }
    } catch (error) {
      console.error("Publish results error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get election results
  app.get("/api/elections/:id/results", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const election = await storage.getElection(id);

      if (!election) {
        return res.status(404).json({ error: "Election not found" });
      }

      // Students can only see published results
      if (req.session.user!.role === "student" && !election.resultsPublished) {
        return res.status(403).json({ error: "Results not published yet" });
      }

      const votes = await storage.getVotesByElection(id);

      // Calculate results
      const postResults: PostResult[] = election.posts.map((post) => {
        const candidateVotes = post.candidates.map((candidate) => {
          const voteCount = votes.filter((v) => v.candidateId === candidate.id).length;
          return {
            candidateId: candidate.id,
            candidateName: candidate.name,
            voteCount,
          };
        });

        // Sort by votes and find winner
        candidateVotes.sort((a, b) => b.voteCount - a.voteCount);
        const winner = candidateVotes.length > 0 && candidateVotes[0].voteCount > 0
          ? candidateVotes[0]
          : undefined;

        return {
          postId: post.id,
          postTitle: post.title,
          candidates: candidateVotes,
          winner,
        };
      });

      // Count unique voters
      const uniqueVoters = new Set(votes.map((v) => v.voterId)).size;

      const result: ElectionResult = {
        electionId: election.id,
        electionTitle: election.title,
        totalVoters: uniqueVoters,
        posts: postResults,
      };

      res.json(result);
    } catch (error) {
      console.error("Get results error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========================
  // Post Routes
  // ========================

  // Add post to election
  app.post("/api/elections/:electionId/posts", requireAdmin, async (req, res) => {
    try {
      const { electionId } = req.params;
      const result = insertPostSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const post = await storage.addPost(electionId, result.data);
      if (post) {
        res.status(201).json(post);
      } else {
        res.status(404).json({ error: "Election not found" });
      }
    } catch (error) {
      console.error("Add post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update post
  app.patch("/api/elections/:electionId/posts/:postId", requireAdmin, async (req, res) => {
    try {
      const { electionId, postId } = req.params;
      const result = insertPostSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const post = await storage.updatePost(electionId, postId, result.data);
      if (post) {
        res.json(post);
      } else {
        res.status(404).json({ error: "Post not found" });
      }
    } catch (error) {
      console.error("Update post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete post
  app.delete("/api/elections/:electionId/posts/:postId", requireAdmin, async (req, res) => {
    try {
      const { electionId, postId } = req.params;
      const deleted = await storage.deletePost(electionId, postId);
      if (deleted) {
        res.json({ message: "Post deleted" });
      } else {
        res.status(404).json({ error: "Post not found" });
      }
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========================
  // Candidate Routes
  // ========================

  // Add candidate to post
  app.post("/api/elections/:electionId/posts/:postId/candidates", requireAdmin, async (req, res) => {
    try {
      const { electionId, postId } = req.params;
      const result = insertCandidateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const candidate = await storage.addCandidate(electionId, postId, result.data);
      if (candidate) {
        res.status(201).json(candidate);
      } else {
        res.status(404).json({ error: "Post not found" });
      }
    } catch (error) {
      console.error("Add candidate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update candidate
  app.patch(
    "/api/elections/:electionId/posts/:postId/candidates/:candidateId",
    requireAdmin,
    async (req, res) => {
      try {
        const { electionId, postId, candidateId } = req.params;
        const result = insertCandidateSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        const candidate = await storage.updateCandidate(electionId, postId, candidateId, result.data);
        if (candidate) {
          res.json(candidate);
        } else {
          res.status(404).json({ error: "Candidate not found" });
        }
      } catch (error) {
        console.error("Update candidate error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Delete candidate
  app.delete(
    "/api/elections/:electionId/posts/:postId/candidates/:candidateId",
    requireAdmin,
    async (req, res) => {
      try {
        const { electionId, postId, candidateId } = req.params;
        const deleted = await storage.deleteCandidate(electionId, postId, candidateId);
        if (deleted) {
          res.json({ message: "Candidate deleted" });
        } else {
          res.status(404).json({ error: "Candidate not found" });
        }
      } catch (error) {
        console.error("Delete candidate error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // ========================
  // Voting Routes
  // ========================

  // Cast vote
  app.post("/api/votes", requireApprovedStudent, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const { electionId, votes } = req.body;

      // Get election
      const election = await storage.getElection(electionId);
      if (!election) {
        return res.status(404).json({ error: "Election not found" });
      }

      // Check if election is live
      const now = new Date();
      const start = new Date(election.startTime);
      const end = new Date(election.endTime);

      if (now < start) {
        return res.status(400).json({ error: "Voting has not started yet" });
      }

      if (now > end) {
        return res.status(400).json({ error: "Voting has ended" });
      }

      // Check if already voted
      const hasVoted = await storage.hasUserVoted(userId, electionId);
      if (hasVoted) {
        return res.status(400).json({ error: "You have already voted in this election" });
      }

      // Validate votes
      if (!votes || !Array.isArray(votes)) {
        return res.status(400).json({ error: "Invalid vote data" });
      }

      // Verify all posts are covered
      const postIds = new Set(election.posts.map((p) => p.id));
      const votedPostIds = new Set(votes.map((v: { postId: string }) => v.postId));

      if (postIds.size !== votedPostIds.size || ![...postIds].every((id) => votedPostIds.has(id))) {
        return res.status(400).json({ error: "Must vote for all posts" });
      }

      // Verify candidates exist
      for (const vote of votes) {
        const post = election.posts.find((p) => p.id === vote.postId);
        if (!post) {
          return res.status(400).json({ error: "Invalid post" });
        }
        const candidate = post.candidates.find((c) => c.id === vote.candidateId);
        if (!candidate) {
          return res.status(400).json({ error: "Invalid candidate" });
        }
      }

      // Cast votes
      const castVotes = await storage.castVotes(userId, electionId, votes);
      await storage.markUserVoted(userId, electionId);

      // Update session
      const user = await storage.getUser(userId);
      if (user) {
        req.session.user = {
          ...req.session.user!,
          hasVoted: user.hasVoted,
        } as any;
      }

      res.status(201).json({ message: "Vote cast successfully", votes: castVotes });
    } catch (error) {
      console.error("Cast vote error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
