import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CalendarCheck, Clock, Users, Vote, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudentLayout } from "@/components/student-layout";
import { LoadingPage } from "@/components/loading-spinner";
import { EmptyState } from "@/components/empty-state";
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

function getTimeRemaining(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return "Ending soon";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export default function LiveElections() {
  const { user } = useAuth();

  const { data: elections, isLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
  });

  if (isLoading) {
    return (
      <StudentLayout title="Live Elections">
        <LoadingPage message="Loading elections..." />
      </StudentLayout>
    );
  }

  const liveElections = elections
    ?.filter((e) => getElectionStatus(e) === "live")
    .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime()) || [];

  return (
    <StudentLayout title="Live Elections">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Elections currently open for voting
          </p>
        </div>

        {liveElections.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No live elections"
            description="There are no elections open for voting at the moment. Check the upcoming elections page for future elections."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {liveElections.map((election) => {
              const totalCandidates = election.posts?.reduce(
                (sum, post) => sum + (post.candidates?.length || 0),
                0
              ) || 0;
              const hasVoted = user?.hasVoted?.includes(election.id);

              return (
                <Card key={election.id} className="relative overflow-visible" data-testid={`election-card-${election.id}`}>
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-green-500 text-white border-0 animate-pulse">
                      Live
                    </Badge>
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="pr-12">
                        <CardTitle className="text-lg">{election.title}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {election.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          {getTimeRemaining(election.endTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{election.posts?.length || 0} post{election.posts?.length !== 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {totalCandidates} candidate{totalCandidates !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="pt-3 border-t">
                        {hasVoted ? (
                          <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">You have already voted</span>
                          </div>
                        ) : (
                          <Link href="/student/vote">
                            <Button className="w-full" data-testid={`button-vote-${election.id}`}>
                              <Vote className="h-4 w-4 mr-2" />
                              Cast Your Vote
                            </Button>
                          </Link>
                        )}
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
