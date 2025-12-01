import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LoadingPage } from "@/components/loading-spinner";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import ForgotPasswordPage from "@/pages/forgot-password";
import AdminDashboard from "@/pages/admin/dashboard";
import ManageElections from "@/pages/admin/elections";
import ManageCandidates from "@/pages/admin/candidates";
import ManageUsers from "@/pages/admin/users";
import AdminResults from "@/pages/admin/results";
import StudentDashboard from "@/pages/student/dashboard";
import UpcomingElections from "@/pages/student/upcoming";
import LiveElections from "@/pages/student/live";
import CastVote from "@/pages/student/vote";
import StudentResults from "@/pages/student/results";
import StudentProfile from "@/pages/student/profile";

function ProtectedRoute({ 
  children, 
  allowedRole 
}: { 
  children: React.ReactNode; 
  allowedRole: "admin" | "student"; 
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage message="Checking authentication..." />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== allowedRole) {
    return <Redirect to={user.role === "admin" ? "/admin/dashboard" : "/student/dashboard"} />;
  }

  if (allowedRole === "student" && user.status !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Account Pending</h1>
          <p className="text-muted-foreground mb-6">
            Your account is currently {user.status === "blocked" ? "blocked" : "pending approval"}. 
            Please contact the administrator for more information.
          </p>
          <button 
            onClick={() => window.location.href = "/login"} 
            className="text-primary hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage message="Loading..." />;
  }

  if (user) {
    return <Redirect to={user.role === "admin" ? "/admin/dashboard" : "/student/dashboard"} />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login">
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      </Route>
      <Route path="/signup">
        <PublicRoute>
          <SignupPage />
        </PublicRoute>
      </Route>
      <Route path="/forgot-password">
        <PublicRoute>
          <ForgotPasswordPage />
        </PublicRoute>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/dashboard">
        <ProtectedRoute allowedRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/elections">
        <ProtectedRoute allowedRole="admin">
          <ManageElections />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/candidates">
        <ProtectedRoute allowedRole="admin">
          <ManageCandidates />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute allowedRole="admin">
          <ManageUsers />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/results">
        <ProtectedRoute allowedRole="admin">
          <AdminResults />
        </ProtectedRoute>
      </Route>

      {/* Student Routes */}
      <Route path="/student/dashboard">
        <ProtectedRoute allowedRole="student">
          <StudentDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/student/upcoming">
        <ProtectedRoute allowedRole="student">
          <UpcomingElections />
        </ProtectedRoute>
      </Route>
      <Route path="/student/live">
        <ProtectedRoute allowedRole="student">
          <LiveElections />
        </ProtectedRoute>
      </Route>
      <Route path="/student/vote">
        <ProtectedRoute allowedRole="student">
          <CastVote />
        </ProtectedRoute>
      </Route>
      <Route path="/student/results">
        <ProtectedRoute allowedRole="student">
          <StudentResults />
        </ProtectedRoute>
      </Route>
      <Route path="/student/profile">
        <ProtectedRoute allowedRole="student">
          <StudentProfile />
        </ProtectedRoute>
      </Route>

      {/* Default redirect */}
      <Route path="/">
        <Redirect to="/login" />
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="voting-system-theme">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
