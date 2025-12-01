import { useQuery } from "@tanstack/react-query";
import { Users, Vote, CalendarCheck, BarChart3, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/admin-layout";
import { LoadingPage } from "@/components/loading-spinner";
import { ElectionStatusBadge } from "@/components/status-badge";
import type { Election, User as UserType } from "@shared/schema";

interface DashboardStats {
  totalStudents: number;
  approvedStudents: number;
  pendingStudents: number;
  totalElections: number;
  liveElections: number;
  upcomingElections: number;
  completedElections: number;
  totalVotes: number;
}

function getElectionStatus(election: Election): "upcoming" | "live" | "completed" {
  const now = new Date();
  const start = new Date(election.startTime);
  const end = new Date(election.endTime);
  
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "live";
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: elections, isLoading: electionsLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
  });

  const { data: recentVoters, isLoading: votersLoading } = useQuery<UserType[]>({
    queryKey: ["/api/admin/recent-voters"],
  });

  const isLoading = statsLoading || electionsLoading || votersLoading;

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard">
        <LoadingPage message="Loading dashboard..." />
      </AdminLayout>
    );
  }

  const recentElections = elections?.slice(0, 5) || [];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-total-students">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-3xl font-bold mt-1">{stats?.totalStudents || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.pendingStudents || 0} pending approval
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-active-elections">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Elections</p>
                  <p className="text-3xl font-bold mt-1">{stats?.liveElections || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.upcomingElections || 0} upcoming
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CalendarCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-total-votes">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Votes Cast</p>
                  <p className="text-3xl font-bold mt-1">{stats?.totalVotes || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all elections
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Vote className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-completed-elections">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold mt-1">{stats?.completedElections || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Elections finished
                  </p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <BarChart3 className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Elections & Voters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="card-recent-elections">
            <CardHeader>
              <CardTitle className="text-lg">Recent Elections</CardTitle>
              <CardDescription>Overview of recent and ongoing elections</CardDescription>
            </CardHeader>
            <CardContent>
              {recentElections.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No elections created yet
                </p>
              ) : (
                <div className="space-y-4">
                  {recentElections.map((election) => {
                    const status = getElectionStatus(election);
                    return (
                      <div
                        key={election.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover-elevate"
                        data-testid={`election-item-${election.id}`}
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="font-medium truncate">{election.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(election.startTime).toLocaleDateString()} - {new Date(election.endTime).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ElectionStatusBadge status={status} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-recent-voters">
            <CardHeader>
              <CardTitle className="text-lg">Recent Voters</CardTitle>
              <CardDescription>Students who recently cast their votes</CardDescription>
            </CardHeader>
            <CardContent>
              {!recentVoters || recentVoters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No votes cast yet
                </p>
              ) : (
                <div className="space-y-3">
                  {recentVoters.slice(0, 5).map((voter) => (
                    <div
                      key={voter.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover-elevate"
                      data-testid={`voter-item-${voter.id}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                        {voter.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{voter.fullName}</p>
                        <p className="text-xs text-muted-foreground">{voter.className}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                        Voted
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card data-testid="card-election-summary">
          <CardHeader>
            <CardTitle className="text-lg">Election Summary</CardTitle>
            <CardDescription>Status overview of all elections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats?.upcomingElections || 0}
                  </p>
                  <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Upcoming</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <CalendarCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats?.liveElections || 0}
                  </p>
                  <p className="text-sm text-green-600/80 dark:text-green-400/80">Live Now</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <CheckCircle2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {stats?.completedElections || 0}
                  </p>
                  <p className="text-sm text-gray-600/80 dark:text-gray-400/80">Completed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
