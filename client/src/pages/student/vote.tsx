import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Vote, CheckCircle2, AlertCircle, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { StudentLayout } from "@/components/student-layout";
import { LoadingPage, LoadingSpinner } from "@/components/loading-spinner";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Election, VoteSubmission } from "@shared/schema";

function getElectionStatus(election: Election): "upcoming" | "live" | "completed" {
  const now = new Date();
  const start = new Date(election.startTime);
  const end = new Date(election.endTime);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "live";
}

export default function CastVote() {
  const { user, checkAuth } = useAuth();
  const { toast } = useToast();
  const [selectedElection, setSelectedElection] = useState<string>("");
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { data: elections, isLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
  });

  const submitVoteMutation = useMutation({
    mutationFn: async (submission: VoteSubmission) => {
      return apiRequest("POST", "/api/votes", submission);
    },
    onSuccess: async () => {
      await checkAuth();
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      setConfirmDialogOpen(false);
      setVotes({});
      setSelectedElection("");
      toast({
        title: "Vote submitted successfully!",
        description: "Thank you for participating in the election.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit vote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <StudentLayout title="Cast Vote">
        <LoadingPage message="Loading elections..." />
      </StudentLayout>
    );
  }

  const liveElections = elections?.filter((e) => getElectionStatus(e) === "live") || [];
  const availableElections = liveElections.filter((e) => !user?.hasVoted?.includes(e.id));
  const currentElection = elections?.find((e) => e.id === selectedElection);

  const handleVoteChange = (postId: string, candidateId: string) => {
    setVotes((prev) => ({ ...prev, [postId]: candidateId }));
  };

  const handleSubmit = () => {
    if (!currentElection) return;

    const allPostsVoted = currentElection.posts?.every((post) => votes[post.id]);
    if (!allPostsVoted) {
      toast({
        title: "Incomplete vote",
        description: "Please select a candidate for each post before submitting.",
        variant: "destructive",
      });
      return;
    }

    setConfirmDialogOpen(true);
  };

  const confirmSubmit = () => {
    if (!currentElection) return;

    const submission: VoteSubmission = {
      electionId: currentElection.id,
      votes: Object.entries(votes).map(([postId, candidateId]) => ({
        postId,
        candidateId,
      })),
    };

    submitVoteMutation.mutate(submission);
  };

  const allPostsVoted = currentElection?.posts?.every((post) => votes[post.id]) || false;

  return (
    <StudentLayout title="Cast Vote">
      <div className="space-y-6">
        {/* Already voted message */}
        {liveElections.length > 0 && availableElections.length === 0 && (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-700 dark:text-green-400">All votes cast!</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-300">
              You have already voted in all available elections. Thank you for participating!
            </AlertDescription>
          </Alert>
        )}

        {/* Election Selector */}
        {availableElections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Election</CardTitle>
              <CardDescription>Choose an election to cast your vote</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedElection} onValueChange={(v) => {
                setSelectedElection(v);
                setVotes({});
              }}>
                <SelectTrigger className="w-full max-w-md" data-testid="select-election">
                  <SelectValue placeholder="Select an election" />
                </SelectTrigger>
                <SelectContent>
                  {availableElections.map((election) => (
                    <SelectItem key={election.id} value={election.id}>
                      {election.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Voting Interface */}
        {currentElection ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{currentElection.title}</CardTitle>
                <CardDescription>{currentElection.description}</CardDescription>
              </CardHeader>
            </Card>

            {/* Posts and Candidates */}
            {currentElection.posts?.map((post) => (
              <Card key={post.id} data-testid={`post-voting-${post.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline">{post.title}</Badge>
                  </CardTitle>
                  <CardDescription>Select one candidate for this position</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={votes[post.id] || ""}
                    onValueChange={(value) => handleVoteChange(post.id, value)}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {post.candidates?.map((candidate) => (
                      <div key={candidate.id}>
                        <RadioGroupItem
                          value={candidate.id}
                          id={candidate.id}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={candidate.id}
                          className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover-elevate peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                          data-testid={`candidate-option-${candidate.id}`}
                        >
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                            {candidate.name.charAt(0)}
                          </div>
                          <div className="text-center">
                            <p className="font-medium">{candidate.name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {candidate.description}
                            </p>
                          </div>
                          {votes[post.id] === candidate.id && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}

            {/* Submit Button */}
            <div className="sticky bottom-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {Object.keys(votes).length} of {currentElection.posts?.length || 0} posts selected
                </div>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!allPostsVoted}
                  data-testid="button-submit-vote"
                >
                  <Vote className="h-4 w-4 mr-2" />
                  Submit Vote
                </Button>
              </div>
            </div>
          </div>
        ) : availableElections.length === 0 ? (
          <EmptyState
            icon={Vote}
            title="No elections available"
            description={liveElections.length > 0
              ? "You have already voted in all available elections."
              : "There are no live elections at the moment. Check back later!"}
          />
        ) : null}

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Your Vote</DialogTitle>
              <DialogDescription>
                Please review your selections before submitting. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {currentElection?.posts?.map((post) => {
                const selectedCandidate = post.candidates?.find((c) => c.id === votes[post.id]);
                return (
                  <div key={post.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-medium">{post.title}</span>
                    <Badge variant="secondary">{selectedCandidate?.name || "Not selected"}</Badge>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Go Back
              </Button>
              <Button
                onClick={confirmSubmit}
                disabled={submitVoteMutation.isPending}
                data-testid="button-confirm-vote"
              >
                {submitVoteMutation.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                Confirm & Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
}
