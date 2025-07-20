import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Clock, CheckCircle, Star, Eye } from 'lucide-react';

interface ReviewAssignment {
  id: string;
  status: string;
  assigned_date: string;
  due_date: string;
  completed_date: string | null;
  rating: number | null;
  comments: string | null;
  recommendation: string | null;
  manuscript: {
    id: string;
    title: string;
    abstract: string;
    keywords: string[];
    file_path: string;
    file_name: string;
    author: {
      first_name: string;
      last_name: string;
    };
  };
}

const ReviewerDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, status, assigned_date, due_date, completed_date, rating, comments, recommendation, manuscript_id')
        .eq('reviewer_id', user?.id)
        .order('assigned_date', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Fetch manuscripts for reviews
      const manuscriptIds = reviewsData?.map(r => r.manuscript_id) || [];
      const { data: manuscriptsData, error: manuscriptsError } = await supabase
        .from('manuscripts')
        .select('id, title, abstract, keywords, file_path, file_name, author_id')
        .in('id', manuscriptIds);

      if (manuscriptsError) throw manuscriptsError;

      // Fetch authors for manuscripts
      const authorIds = manuscriptsData?.map(m => m.author_id) || [];
      const { data: authorsData, error: authorsError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', authorIds);

      if (authorsError) throw authorsError;

      // Transform assignments with manuscript and author data
      const transformedAssignments = reviewsData?.map(review => {
        const manuscript = manuscriptsData?.find(m => m.id === review.manuscript_id);
        const author = authorsData?.find(a => a.user_id === manuscript?.author_id);
        
        return {
          id: review.id,
          status: review.status,
          assigned_date: review.assigned_date,
          due_date: review.due_date,
          completed_date: review.completed_date,
          rating: review.rating,
          comments: review.comments,
          recommendation: review.recommendation,
          manuscript: {
            id: manuscript?.id || '',
            title: manuscript?.title || '',
            abstract: manuscript?.abstract || '',
            keywords: manuscript?.keywords || [],
            file_path: manuscript?.file_path || '',
            file_name: manuscript?.file_name || '',
            author: {
              first_name: author?.first_name || '',
              last_name: author?.last_name || ''
            }
          }
        };
      }) as ReviewAssignment[] || [];
      
      setAssignments(transformedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load review assignments.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingReview(true);

    try {
      const formData = new FormData(e.currentTarget);
      const reviewId = formData.get('reviewId') as string;
      const rating = parseInt(formData.get('rating') as string);
      const recommendation = formData.get('recommendation') as string;
      const comments = formData.get('comments') as string;

      const { error } = await supabase
        .from('reviews')
        .update({
          rating,
          recommendation,
          comments,
          status: 'completed',
          completed_date: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review submitted successfully!",
      });

      fetchAssignments();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && !assignments.find(a => a.due_date === dueDate)?.completed_date;
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('manuscripts')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file.",
        variant: "destructive",
      });
    }
  };

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status !== 'completed').length,
    completed: assignments.filter(a => a.status === 'completed').length,
    overdue: assignments.filter(a => isOverdue(a.due_date)).length,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviewer Dashboard</h1>
        <p className="text-muted-foreground">Review assigned manuscripts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No review assignments</h3>
              <p className="text-muted-foreground">
                You don't have any manuscripts to review at the moment
              </p>
            </CardContent>
          </Card>
        ) : (
          assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{assignment.manuscript.title}</CardTitle>
                    <CardDescription>
                      by {assignment.manuscript.author.first_name} {assignment.manuscript.author.last_name}
                    </CardDescription>
                    <CardDescription>
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                      {isOverdue(assignment.due_date) && (
                        <span className="text-red-500 ml-2">(Overdue)</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(assignment.status)}>
                      {assignment.status.replace('_', ' ')}
                    </Badge>
                    {assignment.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{assignment.rating}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {assignment.manuscript.abstract}
                </p>
                
                {assignment.manuscript.keywords?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Keywords:</p>
                    <div className="flex flex-wrap gap-2">
                      {assignment.manuscript.keywords.map((keyword, index) => (
                        <Badge key={index} variant="outline">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {assignment.status === 'completed' && assignment.comments && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Your Review:</p>
                    <p className="text-sm text-muted-foreground">{assignment.comments}</p>
                    <p className="text-sm mt-2">
                      <strong>Recommendation:</strong> {assignment.recommendation}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile(assignment.manuscript.file_path, assignment.manuscript.file_name)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Manuscript
                  </Button>
                  
                  {assignment.status !== 'completed' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">Submit Review</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Submit Review</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submitReview} className="space-y-4">
                          <input type="hidden" name="reviewId" value={assignment.id} />
                          
                          <div>
                            <Label htmlFor="rating">Rating (1-5)</Label>
                            <Select name="rating" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rating" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 - Poor</SelectItem>
                                <SelectItem value="2">2 - Fair</SelectItem>
                                <SelectItem value="3">3 - Good</SelectItem>
                                <SelectItem value="4">4 - Very Good</SelectItem>
                                <SelectItem value="5">5 - Excellent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="recommendation">Recommendation</Label>
                            <Select name="recommendation" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recommendation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="accept">Accept</SelectItem>
                                <SelectItem value="minor_revision">Minor Revision</SelectItem>
                                <SelectItem value="major_revision">Major Revision</SelectItem>
                                <SelectItem value="reject">Reject</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="comments">Comments</Label>
                            <Textarea
                              id="comments"
                              name="comments"
                              rows={6}
                              placeholder="Provide detailed feedback for the author..."
                              required
                            />
                          </div>
                          
                          <Button type="submit" className="w-full" disabled={submittingReview}>
                            {submittingReview ? 'Submitting...' : 'Submit Review'}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewerDashboard;