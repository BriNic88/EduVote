import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, BarChart3, Users, Calendar, Lock } from "lucide-react";
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
import { StudentLayout } from "@/components/student-layout";
import { LoadingPage } from "@/components/loading-spinner";
import { EmptyState } from "@/components/empty-state";
import type { Election, ElectionResult } from "@shared/schema";

function getElectionStatus(election: Election): "upcoming" | "live" | "completed" {
  const now = new Date();
  const start = new Date(election.startTime);
  const end = new Date(election.endTime);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "live";
}

export default function StudentResults() {
  const [selectedElection, setSelectedElection] = useState<string>("");

  const { data: elections, isLoading: electionsLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
  });

  const { data: results, isLoading: resultsLoading } = useQuery<ElectionResult>({
    queryKey: ["/api/elections", selectedElection, "results"],
    enabled: !!selectedElection,
  });

  const currentElection = elections?.find((e) => e.id === selectedElection);

  if (electionsLoading) {
    return (
      <StudentLayout title="Election Results">
        <LoadingPage message="Loading elections..." />
      </StudentLayout>
    );
  }

  const publishedElections = elections?.filter(
    (e) => getElectionStatus(e) === "completed" && e.resultsPublished
  ) || [];

  return (
    <StudentLayout title="Election Results">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            View results of completed elections
          </p>
        </div>

        {/* Election Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Election</CardTitle>
            <CardDescription>Choose an election to view its results</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedElection} onValueChange={setSelectedElection}>
              <SelectTrigger className="w-full max-w-md" data-testid="select-election-results">
                <SelectValue placeholder="Select an election" />
              </SelectTrigger>
              <SelectContent>
                {publishedElections.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No results available
                  </SelectItem>
                ) : (
                  publishedElections.map((election) => (
                    <SelectItem key={election.id} value={election.id}>
                      {election.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Results Display */}
        {!selectedElection ? (
          publishedElections.length === 0 ? (
            <EmptyState
              icon={Lock}
              title="No results available"
              description="Election results will be available here once they are published by the administrator."
            />
          ) : (
            <EmptyState
              icon={BarChart3}
              title="Select an election"
              description="Choose an election from the dropdown above to view its results."
            />
          )
        ) : resultsLoading ? (
          <LoadingPage message="Loading results..." />
        ) : results ? (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">{results.electionTitle}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {results.totalVoters} total voters
                      </span>
                      {currentElection && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(currentElection.endTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Results Published
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Results by Post */}
            {results.posts.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No votes recorded"
                description="No votes were cast in this election."
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {results.posts.map((post) => {
                  const totalVotes = post.candidates.reduce((sum, c) => sum + c.voteCount, 0);

                  return (
                    <Card key={post.postId} data-testid={`result-card-${post.postId}`}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-500" />
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
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                                        isWinner
                                          ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white"
                                          : "bg-muted text-muted-foreground"
                                      }`}>
                                        {isWinner ? (
                                          <Trophy className="h-5 w-5" />
                                        ) : (
                                          index + 1
                                        )}
                                      </div>
                                      <div>
                                        <p className={`font-medium ${isWinner ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                                          {candidate.candidateName}
                                        </p>
                                        {isWinner && (
                                          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 mt-1">
                                            Winner
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-lg">{percentage}%</p>
                                      <p className="text-xs text-muted-foreground">
                                        {candidate.voteCount} vote{candidate.voteCount !== 1 ? "s" : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <Progress
                                    value={percentage}
                                    className={`h-3 ${isWinner ? "[&>div]:bg-gradient-to-r [&>div]:from-yellow-400 [&>div]:to-yellow-500" : ""}`}
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
            description="Results will appear here once they are published."
          />
        )}
      </div>
    </StudentLayout>
  );
}
