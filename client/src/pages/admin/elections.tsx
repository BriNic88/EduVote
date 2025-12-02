import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Calendar, Clock, Trash2, Edit2, Users, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { insertElectionSchema, type Election, type InsertElection } from "@shared/schema";

function getElectionStatus(election: Election): "upcoming" | "live" | "completed" {
  const now = new Date();
  const start = new Date(election.startTime);
  const end = new Date(election.endTime);
  
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "live";
}

export default function ManageElections() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [deletingElection, setDeletingElection] = useState<Election | null>(null);

  const { data: elections, isLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
  });

  const form = useForm<InsertElection>({
    resolver: zodResolver(insertElectionSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertElection) => {
      return apiRequest("POST", "/api/elections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Election created",
        description: "The election has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create election",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertElection }) => {
      return apiRequest("PATCH", `/api/elections/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      setEditingElection(null);
      form.reset();
      toast({
        title: "Election updated",
        description: "The election has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update election",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/elections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeletingElection(null);
      toast({
        title: "Election deleted",
        description: "The election has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete election",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertElection) => {
    // Convert datetime-local strings to ISO format
    const convertToISO = (dateTimeLocal: string) => {
      if (!dateTimeLocal) return dateTimeLocal;
      // datetime-local format: "2025-12-01T14:30"
      // Convert to ISO: "2025-12-01T14:30:00Z"
      return new Date(dateTimeLocal).toISOString();
    };

    const convertedData = {
      ...data,
      startTime: convertToISO(data.startTime),
      endTime: convertToISO(data.endTime),
    };

    if (editingElection) {
      updateMutation.mutate({ id: editingElection.id, data: convertedData });
    } else {
      createMutation.mutate(convertedData);
    }
  };

  const openEditDialog = (election: Election) => {
    setEditingElection(election);
    form.reset({
      title: election.title,
      description: election.description,
      startTime: election.startTime.slice(0, 16),
      endTime: election.endTime.slice(0, 16),
    });
  };

  const closeDialog = () => {
    setIsCreateOpen(false);
    setEditingElection(null);
    form.reset();
  };

  if (isLoading) {
    return (
      <AdminLayout title="Manage Elections">
        <LoadingPage message="Loading elections..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manage Elections">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-muted-foreground">Create and manage school elections</p>
          </div>
          <Dialog open={isCreateOpen || !!editingElection} onOpenChange={(open) => {
            if (!open) closeDialog();
            else setIsCreateOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-election">
                <Plus className="h-4 w-4 mr-2" />
                Create Election
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingElection ? "Edit Election" : "Create New Election"}</DialogTitle>
                <DialogDescription>
                  {editingElection
                    ? "Update the election details below."
                    : "Fill in the details to create a new election."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Student Council Election 2024"
                            data-testid="input-election-title"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the election and its purpose..."
                            className="resize-none"
                            rows={3}
                            data-testid="input-election-description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date & Time</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              data-testid="input-election-start"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date & Time</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              data-testid="input-election-end"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-election"
                    >
                      {(createMutation.isPending || updateMutation.isPending) && (
                        <LoadingSpinner size="sm" className="mr-2" />
                      )}
                      {editingElection ? "Update Election" : "Create Election"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Elections List */}
        {!elections || elections.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No elections yet"
            description="Create your first election to get started with the voting process."
            action={{
              label: "Create Election",
              onClick: () => setIsCreateOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {elections.map((election) => {
              const status = getElectionStatus(election);
              const totalCandidates = election.posts?.reduce(
                (sum, post) => sum + (post.candidates?.length || 0),
                0
              ) || 0;

              return (
                <Card key={election.id} data-testid={`election-card-${election.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{election.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {election.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <ElectionStatusBadge status={status} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-election-menu-${election.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(election)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingElection(election)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(election.startTime).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>Ends: {new Date(election.endTime).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {election.posts?.length || 0} posts
                          </span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {totalCandidates} candidates
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingElection} onOpenChange={() => setDeletingElection(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Election</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingElection?.title}"? This action cannot be undone
                and will remove all associated posts, candidates, and votes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deletingElection && deleteMutation.mutate(deletingElection.id)}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
