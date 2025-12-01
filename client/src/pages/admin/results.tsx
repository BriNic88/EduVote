import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trophy, Eye, EyeOff, BarChart3, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminLayout } from "@/components/admin-layout";
import { LoadingPage, LoadingSpinner } from "@/components/loading-spinner";
import { EmptyState } from "@/components/empty-state";
import { ElectionStatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Election, ElectionResult } from "@shared/schema";

function getElectionStatus(election: Election): "upcoming" | "live" | "completed" {
  const now = new Date();
  const start = new Date(election.startTime);
  const end = new Date(election.endTime);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "live";
}

export default function AdminResults() {
  const { toast } = useToast();
  const [selectedElection, setSelectedElection] = useState<string>("");

  const { data: elections, isLoading: electionsLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
  });

  const { data: results, isLoading: resultsLoading } = useQuery<ElectionResult>({
    queryKey: ["/api/elections", selectedElection, "results"],
    enabled: !!selectedElection,
  });

  const currentElection = elections?.find((e) => e.id === selectedElection);
  const currentStatus = currentElection ? getElectionStatus(currentElection) : null;

  const publishMutation = useMutation({
    mutationFn: async ({ electionId, publish }: { electionId: string; publish: boolean }) => {
      return apiRequest("PATCH", `/api/elections/${electionId}/publish`, { publish });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      toast({
        title: variables.publish ? "Results published" : "Results unpublished",
        description: variables.publish
          ? "Students can now view the election results."
          : "Results are now hidden from students.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = electionsLoading || (selectedElection && resultsLoading);

  if (electionsLoading) {
    return (
      <AdminLayout title="Election Results">
        <LoadingPage message="Loading elections..." />
      </AdminLayout>
    );
  }

  const completedElections = elections?.filter((e) => getElectionStatus(e) === "completed" || getElectionStatus(e) === "live") || [];

  return (
    <AdminLayout title="Election Results">
      <div className="space-y-6">
        {/* Election Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Election</CardTitle>
            <CardDescription>View results and manage publication status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedElection} onValueChange={setSelectedElection}>
                <SelectTrigger className="w-full sm:w-96" data-testid="select-election-results">
                  <SelectValue placeholder="Select an election to view results" />
                </SelectTrigger>
                <SelectContent>
                  {completedElections.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No elections available
                    </SelectItem>
                  ) : (
                    completedElections.map((election) => (
                      <SelectItem key={election.id} value={election.id}>
                        <div className="flex items-center gap-2">
                          <span>{election.title}</span>
                          <ElectionStatusBadge status={getElectionStatus(election)} />
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {currentElection && currentStatus === "completed" && (
                <Button
                  variant={currentElection.resultsPublished ? "outline" : "default"}
                  onClick={() => publishMutation.mutate({
                    electionId: currentElection.id,
                    publish: !currentElection.resultsPublished,
                  })}
                  disabled={publishMutation.isPending}
                  data-testid="button-publish-results"
                >
                  {publishMutation.isPending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : currentElection.resultsPublished ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {currentElection.resultsPublished ? "Unpublish Results" : "Publish Results"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Display */}
        {!selectedElection ? (
          <EmptyState
            icon={BarChart3}
            title="Select an election"
            description="Choose an election from the dropdown above to view its results."
          />
        ) : resultsLoading ? (
          <LoadingPage message="Loading results..." />
        ) : results ? (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{results.electionTitle}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {results.totalVoters} voters
                      </span>
                      {currentElection && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(currentElection.endTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {currentElection && (
                    <div className="flex items-center gap-2">
                      <ElectionStatusBadge status={getElectionStatus(currentElection)} />
                      {currentElection.resultsPublished && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Published
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results by Post */}
            {results.posts.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No votes yet"
                description="No votes have been cast in this election yet."
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {results.posts.map((post) => {
                  const totalVotes = post.candidates.reduce((sum, c) => sum + c.voteCount, 0);

                  return (
                    <Card key={post.postId} data-testid={`result-card-${post.postId}`}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          {post.postTitle}
                        </CardTitle>
                        <CardDescription>
                          {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {post.candidates
                            .sort((a, b) => b.voteCount - a.voteCount)
                            .map((candidate, index) => {
                              const percentage = totalVotes > 0
                                ? Math.round((candidate.voteCount / totalVotes) * 100)
                                : 0;
                              const isWinner = post.winner?.candidateId === candidate.candidateId;

                              return (
                                <div key={candidate.candidateId} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                        isWinner
                                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                          : "bg-muted text-muted-foreground"
                                      }`}>
                                        {index + 1}
                                      </div>
                                      <span className="font-medium">{candidate.candidateName}</span>
                                      {isWinner && (
                                        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                          Winner
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {candidate.voteCount} vote{candidate.voteCount !== 1 ? "s" : ""} ({percentage}%)
                                    </span>
                                  </div>
                                  <Progress
                                    value={percentage}
                                    className={`h-2 ${isWinner ? "[&>div]:bg-yellow-500" : ""}`}
                                  />
                                </div>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={BarChart3}
            title="No results available"
            description="Results will appear here once votes are cast."
          />
        )}
      </div>
    </AdminLayout>
  );
}
