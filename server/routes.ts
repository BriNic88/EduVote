import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { sendPasswordResetEmail } from "./email";
import { sysLog } from "./logger";
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
        sysLog(req, "Student login attempt", "failure", { email }, "Invalid email or role");
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (user.password !== password) {
        sysLog(req, "Student login attempt", "failure", { email }, "Invalid password");
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
      sysLog(req, "Student login", "success", { userId: user.id });
      res.json({ user: { ...sessionUser, hasVoted: user.hasVoted } });
    } catch (error: any) {
      sysLog(req, "Student login", "failure", {}, error.message);
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
        sysLog(req, "Admin login attempt", "failure", { adminId }, "Invalid admin ID or role");
        return res.status(401).json({ error: "Invalid admin ID or password" });
      }

      if (user.password !== password) {
        sysLog(req, "Admin login attempt", "failure", { adminId }, "Invalid password");
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
      sysLog(req, "Admin login", "success", { userId: user.id });
      res.json({ user: sessionUser });
    } catch (error: any) {
      sysLog(req, "Admin login", "failure", {}, error.message);
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
        sysLog(req, "Student registration", "failure", { email: result.data.email }, "Email already registered");
        return res.status(400).json({ error: "Email already registered" });
      }

      const user = await storage.createStudent(result.data);
      sysLog(req, "Student registration", "success", { userId: user.id, email: user.email });
      res.status(201).json({ message: "Registration successful", userId: user.id });
    } catch (error: any) {
      sysLog(req, "Student registration", "failure", {}, error.message);
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    const userId = req.session.user?.id;
    req.session.destroy((err) => {
      if (err) {
        sysLog(req, "Logout", "failure", { userId }, err.message);
        return res.status(500).json({ error: "Failed to logout" });
      }
      sysLog(req, "Logout", "success", { userId });
      res.json({ message: "Logged out successfully" });
    });
  });

  // Forgot password
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (user) {
        // Generate reset token
        const token = randomBytes(32).toString("hex");
        const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        
        // Store reset token
        await storage.storePasswordReset(email, token, expiry);
        
        // Create reset link
        const resetLink = `${req.protocol}://${req.get("host")}/reset-password?token=${token}`;
        
        // Send email - but don't fail if email sending fails
        try {
          await sendPasswordResetEmail(email, resetLink);
        } catch (emailError) {
          console.warn("Email sending failed but password reset link was stored:", emailError);
          // Continue anyway - user can still reset password via token
        }
      }
      
      // Always return success to prevent email enumeration
      res.json({ message: "If an account exists with that email address, we've sent password reset instructions. Please check your inbox and spam folder." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Verify reset token
  app.post("/api/auth/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.body;
      const reset = await storage.getPasswordReset(token);
      
      if (!reset) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }
      
      res.json({ email: reset.email });
    } catch (error) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      const reset = await storage.getPasswordReset(token);
      if (!reset) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }
      
      const user = await storage.getUserByEmail(reset.email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Update password
      await storage.updateUserPassword(user.id, newPassword);
      
      // Clear reset token
      await storage.clearPasswordReset(token);
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
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
      sysLog(req, "Create election", "success", { electionId: election.id, title: election.title });
      res.status(201).json(election);
    } catch (error: any) {
      sysLog(req, "Create election", "failure", {}, error.message);
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

  // Helper function to generate results
  async function generateElectionResults(electionId: string): Promise<ElectionResult | null> {
    const election = await storage.getElection(electionId);
    if (!election) return null;

    const votes = await storage.getVotesByElection(electionId);
    const postResults: PostResult[] = election.posts.map((post) => {
      const candidateVotes = post.candidates.map((candidate) => {
        const voteCount = votes.filter((v) => v.candidateId === candidate.id).length;
        return {
          candidateId: candidate.id,
          candidateName: candidate.name,
          voteCount,
        };
      });

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

    const uniqueVoters = new Set(votes.map((v) => v.voterId)).size;
    return {
      electionId: election.id,
      electionTitle: election.title,
      totalVoters: uniqueVoters,
      posts: postResults,
    };
  }

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

      const result = await generateElectionResults(id);
      res.json(result);
    } catch (error) {
      console.error("Get results error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Export results as CSV
  app.get("/api/elections/:id/export/csv", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await generateElectionResults(id);
      
      if (!result) {
        return res.status(404).json({ error: "Election not found" });
      }

      let csv = `Election: ${result.electionTitle}\n`;
      csv += `Total Voters: ${result.totalVoters}\n`;
      csv += `Export Date: ${new Date().toISOString()}\n\n`;

      result.posts.forEach((post) => {
        csv += `\nPost: ${post.postTitle}\n`;
        csv += "Candidate,Votes,Percentage\n";
        const totalVotes = post.candidates.reduce((sum, c) => sum + c.voteCount, 0);
        
        post.candidates
          .sort((a, b) => b.voteCount - a.voteCount)
          .forEach((candidate) => {
            const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(2) : "0.00";
            csv += `"${candidate.candidateName}",${candidate.voteCount},${percentage}%\n`;
          });
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="election-results-${id}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Export CSV error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Export results as HTML (printable as PDF)
  app.get("/api/elections/:id/export/pdf", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await generateElectionResults(id);
      
      if (!result) {
        return res.status(404).json({ error: "Election not found" });
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Election Results - ${result.electionTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    .summary { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .post { page-break-inside: avoid; margin: 30px 0; padding: 20px; border: 1px solid #bdc3c7; border-radius: 5px; }
    .post h2 { color: #2c3e50; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #3498db; color: white; }
    tr:hover { background: #f5f5f5; }
    .winner { background: #f1c40f; font-weight: bold; }
    .footer { margin-top: 40px; text-align: center; color: #7f8c8d; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Election Results Report</h1>
  
  <div class="summary">
    <strong>Election:</strong> ${result.electionTitle}<br>
    <strong>Total Voters:</strong> ${result.totalVoters}<br>
    <strong>Generated:</strong> ${new Date().toLocaleString()}
  </div>

  ${result.posts.map((post) => {
    const totalVotes = post.candidates.reduce((sum, c) => sum + c.voteCount, 0);
    return `
    <div class="post">
      <h2>${post.postTitle}</h2>
      <p><strong>Total Votes:</strong> ${totalVotes}</p>
      <table>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Votes</th>
            <th>Percentage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${post.candidates
            .sort((a, b) => b.voteCount - a.voteCount)
            .map((candidate, index) => {
              const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(2) : "0.00";
              const isWinner = post.winner?.candidateId === candidate.candidateId;
              return `
              <tr${isWinner ? ' class="winner"' : ''}>
                <td>${candidate.candidateName}</td>
                <td>${candidate.voteCount}</td>
                <td>${percentage}%</td>
                <td>${isWinner ? "WINNER" : ""}</td>
              </tr>
            `;
            }).join("")}
        </tbody>
      </table>
    </div>
    `;
  }).join("")}

  <div class="footer">
    <p>This report was generated by SchoolVote on ${new Date().toLocaleString()}</p>
    <p>School Online Voting System</p>
  </div>
</body>
</html>
      `;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="election-results-${id}.html"`);
      res.send(html);
    } catch (error) {
      console.error("Export PDF error:", error);
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

      sysLog(req, "Vote cast", "success", { electionId, voteCount: votes.length });
      res.status(201).json({ message: "Vote cast successfully", votes: castVotes });
    } catch (error: any) {
      sysLog(req, "Vote cast", "failure", { electionId: req.params.id }, error.message);
      console.error("Cast vote error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
