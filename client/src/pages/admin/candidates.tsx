import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Edit2, User, MoreVertical, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AdminLayout } from "@/components/admin-layout";
import { LoadingPage, LoadingSpinner } from "@/components/loading-spinner";
import { EmptyState } from "@/components/empty-state";
import { ElectionStatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  insertPostSchema,
  insertCandidateSchema,
  type Election,
  type Post,
  type Candidate,
  type InsertPost,
  type InsertCandidate,
} from "@shared/schema";

function getElectionStatus(election: Election): "upcoming" | "live" | "completed" {
  const now = new Date();
  const start = new Date(election.startTime);
  const end = new Date(election.endTime);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "live";
}

export default function ManageCandidates() {
  const { toast } = useToast();
  const [selectedElection, setSelectedElection] = useState<string>("");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [isAddPostOpen, setIsAddPostOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<{ electionId: string; post: Post } | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<{
    electionId: string;
    postId: string;
    candidate: Candidate;
  } | null>(null);
  const [deletingPost, setDeletingPost] = useState<{ electionId: string; postId: string } | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState<{
    electionId: string;
    postId: string;
    candidateId: string;
  } | null>(null);
  const [addCandidatePostId, setAddCandidatePostId] = useState<string>("");

  const { data: elections, isLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
  });

  const postForm = useForm<InsertPost>({
    resolver: zodResolver(insertPostSchema),
    defaultValues: { title: "" },
  });

  const candidateForm = useForm<InsertCandidate>({
    resolver: zodResolver(insertCandidateSchema),
    defaultValues: { name: "", description: "" },
  });

  const currentElection = elections?.find((e) => e.id === selectedElection);

  // Post mutations
  const createPostMutation = useMutation({
    mutationFn: async (data: InsertPost) => {
      return apiRequest("POST", `/api/elections/${selectedElection}/posts`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      setIsAddPostOpen(false);
      postForm.reset();
      toast({ title: "Post created", description: "The post has been added to the election." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create post", description: error.message, variant: "destructive" });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ electionId, postId, data }: { electionId: string; postId: string; data: InsertPost }) => {
      return apiRequest("PATCH", `/api/elections/${electionId}/posts/${postId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      setEditingPost(null);
      postForm.reset();
      toast({ title: "Post updated", description: "The post has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update post", description: error.message, variant: "destructive" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async ({ electionId, postId }: { electionId: string; postId: string }) => {
      return apiRequest("DELETE", `/api/elections/${electionId}/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      setDeletingPost(null);
      toast({ title: "Post deleted", description: "The post and its candidates have been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete post", description: error.message, variant: "destructive" });
    },
  });

  // Candidate mutations
  const createCandidateMutation = useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: InsertCandidate }) => {
      return apiRequest("POST", `/api/elections/${selectedElection}/posts/${postId}/candidates`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      setIsAddCandidateOpen(false);
      candidateForm.reset();
      toast({ title: "Candidate added", description: "The candidate has been added to the post." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add candidate", description: error.message, variant: "destructive" });
    },
  });

  const updateCandidateMutation = useMutation({
    mutationFn: async ({
      electionId,
      postId,
      candidateId,
      data,
    }: {
      electionId: string;
      postId: string;
      candidateId: string;
      data: InsertCandidate;
    }) => {
      return apiRequest("PATCH", `/api/elections/${electionId}/posts/${postId}/candidates/${candidateId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      setEditingCandidate(null);
      candidateForm.reset();
      toast({ title: "Candidate updated", description: "The candidate has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update candidate", description: error.message, variant: "destructive" });
    },
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async ({
      electionId,
      postId,
      candidateId,
    }: {
      electionId: string;
      postId: string;
      candidateId: string;
    }) => {
      return apiRequest("DELETE", `/api/elections/${electionId}/posts/${postId}/candidates/${candidateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      setDeletingCandidate(null);
      toast({ title: "Candidate removed", description: "The candidate has been removed from the post." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove candidate", description: error.message, variant: "destructive" });
    },
  });

  const togglePost = (postId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const onPostSubmit = (data: InsertPost) => {
    if (editingPost) {
      updatePostMutation.mutate({
        electionId: editingPost.electionId,
        postId: editingPost.post.id,
        data,
      });
    } else {
      createPostMutation.mutate(data);
    }
  };

  const onCandidateSubmit = (data: InsertCandidate) => {
    if (editingCandidate) {
      updateCandidateMutation.mutate({
        electionId: editingCandidate.electionId,
        postId: editingCandidate.postId,
        candidateId: editingCandidate.candidate.id,
        data,
      });
    } else {
      createCandidateMutation.mutate({ postId: addCandidatePostId, data });
    }
  };

  const openEditPost = (electionId: string, post: Post) => {
    setEditingPost({ electionId, post });
    postForm.reset({ title: post.title });
  };

  const openEditCandidate = (electionId: string, postId: string, candidate: Candidate) => {
    setEditingCandidate({ electionId, postId, candidate });
    candidateForm.reset({ name: candidate.name, description: candidate.description });
  };

  const openAddCandidate = (postId: string) => {
    setAddCandidatePostId(postId);
    setIsAddCandidateOpen(true);
    candidateForm.reset();
  };

  if (isLoading) {
    return (
      <AdminLayout title="Manage Candidates">
        <LoadingPage message="Loading elections..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manage Candidates">
      <div className="space-y-6">
        {/* Election Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Election</CardTitle>
            <CardDescription>Choose an election to manage its posts and candidates</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedElection} onValueChange={setSelectedElection}>
              <SelectTrigger className="w-full max-w-md" data-testid="select-election">
                <SelectValue placeholder="Select an election" />
              </SelectTrigger>
              <SelectContent>
                {elections?.map((election) => (
                  <SelectItem key={election.id} value={election.id}>
                    <div className="flex items-center gap-2">
                      <span>{election.title}</span>
                      <ElectionStatusBadge status={getElectionStatus(election)} />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Posts and Candidates */}
        {selectedElection && currentElection && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Posts & Candidates</h2>
              <Button onClick={() => setIsAddPostOpen(true)} data-testid="button-add-post">
                <Plus className="h-4 w-4 mr-2" />
                Add Post
              </Button>
            </div>

            {!currentElection.posts || currentElection.posts.length === 0 ? (
              <EmptyState
                icon={User}
                title="No posts yet"
                description="Add posts like President, Secretary, or Sports Captain to this election."
                action={{
                  label: "Add Post",
                  onClick: () => setIsAddPostOpen(true),
                }}
              />
            ) : (
              <div className="space-y-3">
                {currentElection.posts.map((post) => (
                  <Card key={post.id} data-testid={`post-card-${post.id}`}>
                    <Collapsible open={expandedPosts.has(post.id)} onOpenChange={() => togglePost(post.id)}>
                      <div className="flex items-center justify-between p-4">
                        <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                          {expandedPosts.has(post.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{post.title}</span>
                          <Badge variant="secondary" className="ml-2">
                            {post.candidates?.length || 0} candidates
                          </Badge>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAddCandidate(post.id)}
                            data-testid={`button-add-candidate-${post.id}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Candidate
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditPost(selectedElection, post)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit Post
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeletingPost({ electionId: selectedElection, postId: post.id })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Post
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="px-4 pb-4">
                          {!post.candidates || post.candidates.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No candidates added yet
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {post.candidates.map((candidate) => (
                                <div
                                  key={candidate.id}
                                  className="relative p-4 rounded-lg border bg-muted/30 hover-elevate"
                                  data-testid={`candidate-card-${candidate.id}`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                                      {candidate.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{candidate.name}</p>
                                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                        {candidate.description}
                                      </p>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="shrink-0">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => openEditCandidate(selectedElection, post.id, candidate)}
                                        >
                                          <Edit2 className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() =>
                                            setDeletingCandidate({
                                              electionId: selectedElection,
                                              postId: post.id,
                                              candidateId: candidate.id,
                                            })
                                          }
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Remove
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Post Dialog */}
        <Dialog open={isAddPostOpen || !!editingPost} onOpenChange={(open) => {
          if (!open) {
            setIsAddPostOpen(false);
            setEditingPost(null);
            postForm.reset();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPost ? "Edit Post" : "Add New Post"}</DialogTitle>
              <DialogDescription>
                {editingPost ? "Update the post title." : "Create a new position/post for this election."}
              </DialogDescription>
            </DialogHeader>
            <Form {...postForm}>
              <form onSubmit={postForm.handleSubmit(onPostSubmit)} className="space-y-4">
                <FormField
                  control={postForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., President, Sports Captain" data-testid="input-post-title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsAddPostOpen(false);
                    setEditingPost(null);
                    postForm.reset();
                  }}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPostMutation.isPending || updatePostMutation.isPending}
                    data-testid="button-submit-post"
                  >
                    {(createPostMutation.isPending || updatePostMutation.isPending) && (
                      <LoadingSpinner size="sm" className="mr-2" />
                    )}
                    {editingPost ? "Update" : "Add Post"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Candidate Dialog */}
        <Dialog open={isAddCandidateOpen || !!editingCandidate} onOpenChange={(open) => {
          if (!open) {
            setIsAddCandidateOpen(false);
            setEditingCandidate(null);
            candidateForm.reset();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCandidate ? "Edit Candidate" : "Add New Candidate"}</DialogTitle>
              <DialogDescription>
                {editingCandidate ? "Update the candidate details." : "Add a new candidate to this post."}
              </DialogDescription>
            </DialogHeader>
            <Form {...candidateForm}>
              <form onSubmit={candidateForm.handleSubmit(onCandidateSubmit)} className="space-y-4">
                <FormField
                  control={candidateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Candidate Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter candidate name" data-testid="input-candidate-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={candidateForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the candidate's qualifications..."
                          className="resize-none"
                          rows={3}
                          data-testid="input-candidate-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsAddCandidateOpen(false);
                    setEditingCandidate(null);
                    candidateForm.reset();
                  }}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCandidateMutation.isPending || updateCandidateMutation.isPending}
                    data-testid="button-submit-candidate"
                  >
                    {(createCandidateMutation.isPending || updateCandidateMutation.isPending) && (
                      <LoadingSpinner size="sm" className="mr-2" />
                    )}
                    {editingCandidate ? "Update" : "Add Candidate"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Post Confirmation */}
        <AlertDialog open={!!deletingPost} onOpenChange={() => setDeletingPost(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Post</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this post? All candidates under this post will also be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deletingPost && deletePostMutation.mutate(deletingPost)}
              >
                {deletePostMutation.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Candidate Confirmation */}
        <AlertDialog open={!!deletingCandidate} onOpenChange={() => setDeletingCandidate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Candidate</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this candidate from the election?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deletingCandidate && deleteCandidateMutation.mutate(deletingCandidate)}
              >
                {deleteCandidateMutation.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
