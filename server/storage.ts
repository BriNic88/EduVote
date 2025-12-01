import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import type {
  User,
  Election,
  Post,
  Candidate,
  Vote,
  UserStatus,
  InsertStudent,
  InsertAdmin,
  InsertElection,
  InsertPost,
  InsertCandidate,
} from "@shared/schema";

const DB_PATH = path.join(process.cwd(), "database.json");

interface Database {
  users: User[];
  elections: Election[];
  votes: Vote[];
}

function loadDatabase(): Database {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading database:", error);
  }

  // Initialize with default admin
  const defaultDb: Database = {
    users: [
      {
        id: randomUUID(),
        role: "admin",
        email: "admin@school.edu",
        password: "admin123", // In production, this should be hashed
        fullName: "System Administrator",
        adminId: "admin",
        status: "approved",
        hasVoted: [],
      },
    ],
    elections: [],
    votes: [],
  };

  saveDatabase(defaultDb);
  return defaultDb;
}

function saveDatabase(db: Database): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("Error saving database:", error);
  }
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAdminId(adminId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getStudents(): Promise<User[]>;
  createStudent(data: InsertStudent): Promise<User>;
  createAdmin(data: InsertAdmin): Promise<User>;
  updateUserStatus(id: string, status: UserStatus): Promise<User | undefined>;
  updateUserProfile(id: string, fullName: string, email: string): Promise<User | undefined>;
  updateUserPassword(id: string, password: string): Promise<User | undefined>;
  markUserVoted(id: string, electionId: string): Promise<User | undefined>;
  getRecentVoters(): Promise<User[]>;

  // Election operations
  getAllElections(): Promise<Election[]>;
  getElection(id: string): Promise<Election | undefined>;
  createElection(data: InsertElection): Promise<Election>;
  updateElection(id: string, data: Partial<InsertElection>): Promise<Election | undefined>;
  deleteElection(id: string): Promise<boolean>;
  publishResults(id: string, publish: boolean): Promise<Election | undefined>;

  // Post operations
  addPost(electionId: string, data: InsertPost): Promise<Post | undefined>;
  updatePost(electionId: string, postId: string, data: InsertPost): Promise<Post | undefined>;
  deletePost(electionId: string, postId: string): Promise<boolean>;

  // Candidate operations
  addCandidate(electionId: string, postId: string, data: InsertCandidate): Promise<Candidate | undefined>;
  updateCandidate(
    electionId: string,
    postId: string,
    candidateId: string,
    data: InsertCandidate
  ): Promise<Candidate | undefined>;
  deleteCandidate(electionId: string, postId: string, candidateId: string): Promise<boolean>;

  // Vote operations
  castVotes(userId: string, electionId: string, votes: { postId: string; candidateId: string }[]): Promise<Vote[]>;
  getVotesByElection(electionId: string): Promise<Vote[]>;
  hasUserVoted(userId: string, electionId: string): Promise<boolean>;
  getTotalVotes(): Promise<number>;
}

export class JsonStorage implements IStorage {
  private db: Database;

  constructor() {
    this.db = loadDatabase();
  }

  private save(): void {
    saveDatabase(this.db);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.db.users.find((u) => u.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  async getUserByAdminId(adminId: string): Promise<User | undefined> {
    return this.db.users.find((u) => u.role === "admin" && u.adminId === adminId);
  }

  async getAllUsers(): Promise<User[]> {
    return this.db.users;
  }

  async getStudents(): Promise<User[]> {
    return this.db.users.filter((u) => u.role === "student");
  }

  async createStudent(data: InsertStudent): Promise<User> {
    const user: User = {
      id: randomUUID(),
      role: "student",
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      className: data.className,
      status: "pending",
      hasVoted: [],
    };
    this.db.users.push(user);
    this.save();
    return user;
  }

  async createAdmin(data: InsertAdmin): Promise<User> {
    const user: User = {
      id: randomUUID(),
      role: "admin",
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      adminId: data.adminId,
      status: "approved",
      hasVoted: [],
    };
    this.db.users.push(user);
    this.save();
    return user;
  }

  async updateUserStatus(id: string, status: UserStatus): Promise<User | undefined> {
    const user = this.db.users.find((u) => u.id === id);
    if (user) {
      user.status = status;
      this.save();
    }
    return user;
  }

  async updateUserProfile(id: string, fullName: string, email: string): Promise<User | undefined> {
    const user = this.db.users.find((u) => u.id === id);
    if (user) {
      user.fullName = fullName;
      user.email = email;
      this.save();
    }
    return user;
  }

  async updateUserPassword(id: string, password: string): Promise<User | undefined> {
    const user = this.db.users.find((u) => u.id === id);
    if (user) {
      user.password = password;
      this.save();
    }
    return user;
  }

  async markUserVoted(id: string, electionId: string): Promise<User | undefined> {
    const user = this.db.users.find((u) => u.id === id);
    if (user && !user.hasVoted.includes(electionId)) {
      user.hasVoted.push(electionId);
      this.save();
    }
    return user;
  }

  async getRecentVoters(): Promise<User[]> {
    return this.db.users
      .filter((u) => u.role === "student" && u.hasVoted.length > 0)
      .slice(-10)
      .reverse();
  }

  // Election operations
  async getAllElections(): Promise<Election[]> {
    return this.db.elections;
  }

  async getElection(id: string): Promise<Election | undefined> {
    return this.db.elections.find((e) => e.id === id);
  }

  async createElection(data: InsertElection): Promise<Election> {
    const election: Election = {
      id: randomUUID(),
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      resultsPublished: false,
      posts: [],
    };
    this.db.elections.push(election);
    this.save();
    return election;
  }

  async updateElection(id: string, data: Partial<InsertElection>): Promise<Election | undefined> {
    const election = this.db.elections.find((e) => e.id === id);
    if (election) {
      if (data.title) election.title = data.title;
      if (data.description) election.description = data.description;
      if (data.startTime) election.startTime = data.startTime;
      if (data.endTime) election.endTime = data.endTime;
      this.save();
    }
    return election;
  }

  async deleteElection(id: string): Promise<boolean> {
    const index = this.db.elections.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.db.elections.splice(index, 1);
      // Also delete related votes
      this.db.votes = this.db.votes.filter((v) => v.electionId !== id);
      // Remove from users' hasVoted
      this.db.users.forEach((u) => {
        u.hasVoted = u.hasVoted.filter((eid) => eid !== id);
      });
      this.save();
      return true;
    }
    return false;
  }

  async publishResults(id: string, publish: boolean): Promise<Election | undefined> {
    const election = this.db.elections.find((e) => e.id === id);
    if (election) {
      election.resultsPublished = publish;
      this.save();
    }
    return election;
  }

  // Post operations
  async addPost(electionId: string, data: InsertPost): Promise<Post | undefined> {
    const election = this.db.elections.find((e) => e.id === electionId);
    if (election) {
      const post: Post = {
        id: randomUUID(),
        title: data.title,
        candidates: [],
      };
      election.posts.push(post);
      this.save();
      return post;
    }
    return undefined;
  }

  async updatePost(electionId: string, postId: string, data: InsertPost): Promise<Post | undefined> {
    const election = this.db.elections.find((e) => e.id === electionId);
    if (election) {
      const post = election.posts.find((p) => p.id === postId);
      if (post) {
        post.title = data.title;
        this.save();
        return post;
      }
    }
    return undefined;
  }

  async deletePost(electionId: string, postId: string): Promise<boolean> {
    const election = this.db.elections.find((e) => e.id === electionId);
    if (election) {
      const index = election.posts.findIndex((p) => p.id === postId);
      if (index !== -1) {
        election.posts.splice(index, 1);
        // Delete related votes
        this.db.votes = this.db.votes.filter((v) => v.postId !== postId);
        this.save();
        return true;
      }
    }
    return false;
  }

  // Candidate operations
  async addCandidate(electionId: string, postId: string, data: InsertCandidate): Promise<Candidate | undefined> {
    const election = this.db.elections.find((e) => e.id === electionId);
    if (election) {
      const post = election.posts.find((p) => p.id === postId);
      if (post) {
        const candidate: Candidate = {
          id: randomUUID(),
          name: data.name,
          description: data.description,
        };
        post.candidates.push(candidate);
        this.save();
        return candidate;
      }
    }
    return undefined;
  }

  async updateCandidate(
    electionId: string,
    postId: string,
    candidateId: string,
    data: InsertCandidate
  ): Promise<Candidate | undefined> {
    const election = this.db.elections.find((e) => e.id === electionId);
    if (election) {
      const post = election.posts.find((p) => p.id === postId);
      if (post) {
        const candidate = post.candidates.find((c) => c.id === candidateId);
        if (candidate) {
          candidate.name = data.name;
          candidate.description = data.description;
          this.save();
          return candidate;
        }
      }
    }
    return undefined;
  }

  async deleteCandidate(electionId: string, postId: string, candidateId: string): Promise<boolean> {
    const election = this.db.elections.find((e) => e.id === electionId);
    if (election) {
      const post = election.posts.find((p) => p.id === postId);
      if (post) {
        const index = post.candidates.findIndex((c) => c.id === candidateId);
        if (index !== -1) {
          post.candidates.splice(index, 1);
          // Delete related votes
          this.db.votes = this.db.votes.filter((v) => v.candidateId !== candidateId);
          this.save();
          return true;
        }
      }
    }
    return false;
  }

  // Vote operations
  async castVotes(
    userId: string,
    electionId: string,
    votes: { postId: string; candidateId: string }[]
  ): Promise<Vote[]> {
    const newVotes: Vote[] = votes.map((v) => ({
      id: randomUUID(),
      electionId,
      postId: v.postId,
      candidateId: v.candidateId,
      voterId: userId,
      timestamp: new Date().toISOString(),
    }));

    this.db.votes.push(...newVotes);
    this.save();
    return newVotes;
  }

  async getVotesByElection(electionId: string): Promise<Vote[]> {
    return this.db.votes.filter((v) => v.electionId === electionId);
  }

  async hasUserVoted(userId: string, electionId: string): Promise<boolean> {
    return this.db.votes.some((v) => v.voterId === userId && v.electionId === electionId);
  }

  async getTotalVotes(): Promise<number> {
    return this.db.votes.length;
  }
}

export const storage = new JsonStorage();
