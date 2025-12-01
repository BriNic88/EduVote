import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Clock, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentLayout } from "@/components/student-layout";
import { LoadingPage } from "@/components/loading-spinner";
import { EmptyState } from "@/components/empty-state";
import type { Election } from "@shared/schema";

function getElectionStatus(election: Election): "upcoming" | "live" | "completed" {
  const now = new Date();
  const start = new Date(election.startTime);
  const end = new Date(election.endTime);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "live";
}

function getTimeUntil(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return "Starting soon";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ${hours} hour${hours > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} min`;
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

export default function UpcomingElections() {
  const { data: elections, isLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
  });

  if (isLoading) {
    return (
      <StudentLayout title="Upcoming Elections">
        <LoadingPage message="Loading elections..." />
      </StudentLayout>
    );
  }

  const upcomingElections = elections
    ?.filter((e) => getElectionStatus(e) === "upcoming")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) || [];

  return (
    <StudentLayout title="Upcoming Elections">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Elections that will be available for voting soon
          </p>
        </div>

        {upcomingElections.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No upcoming elections"
            description="There are no scheduled elections at the moment. Check back later for new elections."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {upcomingElections.map((election) => {
              const totalCandidates = election.posts?.reduce(
                (sum, post) => sum + (post.candidates?.length || 0),
                0
              ) || 0;

              return (
                <Card key={election.id} data-testid={`election-card-${election.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{election.title}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {election.description}
                        </CardDescription>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                        Upcoming
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Starts in:</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {getTimeUntil(election.startTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarClock className="h-4 w-4" />
                        <span>
                          {new Date(election.startTime).toLocaleDateString()} at{" "}
                          {new Date(election.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 pt-2 border-t text-sm text-muted-foreground">
                        <span>{election.posts?.length || 0} post{election.posts?.length !== 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {totalCandidates} candidate{totalCandidates !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
