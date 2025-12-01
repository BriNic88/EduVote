import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CalendarClock, CalendarCheck, Vote, Trophy, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StudentLayout } from "@/components/student-layout";
import { LoadingPage } from "@/components/loading-spinner";
import { ElectionStatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth";
import type { Election } from "@shared/schema";

function getElectionStatus(election: Election): "upcoming" | "live" | "completed" {
  const now = new Date();
  const start = new Date(election.startTime);
  const end = new Date(election.endTime);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "live";
}

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: elections, isLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
  });

  if (isLoading) {
    return (
      <StudentLayout title="Dashboard">
        <LoadingPage message="Loading dashboard..." />
      </StudentLayout>
    );
  }

  const upcomingElections = elections?.filter((e) => getElectionStatus(e) === "upcoming") || [];
  const liveElections = elections?.filter((e) => getElectionStatus(e) === "live") || [];
  const completedElections = elections?.filter((e) => getElectionStatus(e) === "completed" && e.resultsPublished) || [];
  const votedCount = user?.hasVoted?.length || 0;

  return (
    <StudentLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Welcome back, {user?.fullName?.split(" ")[0]}!</h2>
                <p className="text-muted-foreground mt-1">
                  {user?.className} - Ready to make your voice heard?
                </p>
              </div>
              {liveElections.length > 0 && (
                <Link href="/student/vote">
                  <Button data-testid="button-vote-now">
                    <Vote className="h-4 w-4 mr-2" />
                    Vote Now
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-live-elections">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CalendarCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{liveElections.length}</p>
                  <p className="text-xs text-muted-foreground">Live Elections</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-upcoming-elections">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingElections.length}</p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-votes-cast">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Vote className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{votedCount}</p>
                  <p className="text-xs text-muted-foreground">Votes Cast</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-results-available">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedElections.length}</p>
                  <p className="text-xs text-muted-foreground">Results Ready</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Elections */}
        {liveElections.length > 0 && (
          <Card data-testid="section-live-elections">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Live Elections
                </CardTitle>
                <CardDescription>Cast your vote now!</CardDescription>
              </div>
              <Link href="/student/live">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {liveElections.slice(0, 3).map((election) => {
                  const hasVoted = user?.hasVoted?.includes(election.id);
                  return (
                    <div
                      key={election.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover-elevate"
                      data-testid={`live-election-${election.id}`}
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-medium truncate">{election.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ends: {new Date(election.endTime).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasVoted ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Voted
                          </Badge>
                        ) : (
                          <Link href="/student/vote">
                            <Button size="sm">Vote</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Elections */}
        {upcomingElections.length > 0 && (
          <Card data-testid="section-upcoming-elections">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Upcoming Elections</CardTitle>
                <CardDescription>Elections starting soon</CardDescription>
              </div>
              <Link href="/student/upcoming">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingElections.slice(0, 3).map((election) => (
                  <div
                    key={election.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                    data-testid={`upcoming-election-${election.id}`}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-medium truncate">{election.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Starts: {new Date(election.startTime).toLocaleString()}
                      </p>
                    </div>
                    <ElectionStatusBadge status="upcoming" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Elections */}
        {liveElections.length === 0 && upcomingElections.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Elections</h3>
              <p className="text-muted-foreground">
                There are no live or upcoming elections at the moment. Check back later!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
