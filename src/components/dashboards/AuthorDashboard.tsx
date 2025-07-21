import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Download, Eye, Plus } from 'lucide-react';

interface Manuscript {
  id: string;
  title: string;
  abstract: string;
  status: string;
  submission_date: string;
  file_name: string;
  file_path: string;
  keywords: string[];
}

interface Review {
  id: string;
  manuscript_id: string;
  reviewer_id: string;
  rating: number | null;
  comments: string | null;
  recommendation: string | null;
  completed_date: string | null;
}

const AuthorDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedManuscript, setSelectedManuscript] = useState<Manuscript | null>(null);
  const [manuscriptReviews, setManuscriptReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (user) {
      fetchManuscripts();
    }
  }, [user]);

  const fetchManuscripts = async () => {
    try {
      const { data, error } = await supabase
        .from('manuscripts')
        .select('*')
        .eq('author_id', user?.id)
        .order('submission_date', { ascending: false });

      if (error) throw error;
      setManuscripts(data || []);
    } catch (error) {
      console.error('Error fetching manuscripts:', error);
      toast({
        title: "Error",
        description: "Failed to load manuscripts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManuscript = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !manuscriptFile) return;

    setSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const title = formData.get('title') as string;
      const abstract = formData.get('abstract') as string;

      // Upload manuscript file
      const manuscriptFileExt = manuscriptFile.name.split('.').pop();
      const manuscriptFileName = `${user.id}/manuscripts/${Date.now()}.${manuscriptFileExt}`;
      
      const { error: manuscriptUploadError } = await supabase.storage
        .from('manuscripts')
        .upload(manuscriptFileName, manuscriptFile);

      if (manuscriptUploadError) throw manuscriptUploadError;

      // Upload cover letter if provided
      let coverLetterFileName = null;
      if (coverLetterFile) {
        const coverLetterFileExt = coverLetterFile.name.split('.').pop();
        coverLetterFileName = `${user.id}/cover-letters/${Date.now()}.${coverLetterFileExt}`;
        
        const { error: coverLetterUploadError } = await supabase.storage
          .from('manuscripts')
          .upload(coverLetterFileName, coverLetterFile);

        if (coverLetterUploadError) throw coverLetterUploadError;
      }

      // Create manuscript record
      const { error: insertError } = await supabase
        .from('manuscripts')
        .insert({
          title,
          abstract,
          author_id: user.id,
          file_path: manuscriptFileName,
          file_name: manuscriptFile.name,
          file_size: manuscriptFile.size,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Manuscript submitted successfully!",
      });

      setManuscriptFile(null);
      setCoverLetterFile(null);
      fetchManuscripts();
      
      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error submitting manuscript:', error);
      toast({
        title: "Error",
        description: "Failed to submit manuscript.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchManuscriptReviews = async (manuscriptId: string) => {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('manuscript_id', manuscriptId)
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching reviews:', error);
        return;
      }

      setManuscriptReviews(reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleViewManuscript = async (manuscript: Manuscript) => {
    setSelectedManuscript(manuscript);
    if (manuscript.id) {
      await fetchManuscriptReviews(manuscript.id);
    }
  };

  const downloadReview = async (review: Review) => {
    try {
      // Since reviews are stored as text comments, we'll create a downloadable text file
      const reviewContent = `
Review for: ${selectedManuscript?.title}
Reviewer ID: ${review.reviewer_id}
Rating: ${review.rating || 'Not rated'}
Recommendation: ${review.recommendation || 'No recommendation provided'}
Comments: ${review.comments || 'No comments provided'}
Completed Date: ${review.completed_date ? new Date(review.completed_date).toLocaleDateString() : 'Not completed'}
      `;

      const blob = new Blob([reviewContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `review_${selectedManuscript?.title}_${review.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Review downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading review:', error);
      toast({
        title: "Error",
        description: "Failed to download review",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'revision_requested':
        return 'bg-orange-100 text-orange-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Author Dashboard</h1>
          <p className="text-muted-foreground">Manage your manuscript submissions</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Submit New Manuscript
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit New Manuscript</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitManuscript} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              
              <div>
                <Label htmlFor="abstract">Abstract</Label>
                <Textarea id="abstract" name="abstract" rows={4} required />
              </div>
              
              <div>
                <Label htmlFor="manuscriptFile">Upload Manuscript</Label>
                <Input
                  id="manuscriptFile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setManuscriptFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="coverLetterFile">Upload Cover Letter (Optional)</Label>
                <Input
                  id="coverLetterFile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCoverLetterFile(e.target.files?.[0] || null)}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={submitting || !manuscriptFile}>
                {submitting ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Manuscript'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Manuscripts</CardTitle>
          <CardDescription>
            Track the status of your submitted manuscripts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {manuscripts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No manuscripts submitted yet. Click "Submit New Manuscript" to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S/N</TableHead>
                    <TableHead>File ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>View</TableHead>
                    <TableHead>Reviewer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manuscripts.map((manuscript, index) => (
                    <TableRow key={manuscript.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {manuscript.id?.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {manuscript.title}
                      </TableCell>
                      <TableCell>
                        {new Date(manuscript.submission_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(manuscript.status)}>
                          {manuscript.status.charAt(0).toUpperCase() + manuscript.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewManuscript(manuscript)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewManuscript(manuscript)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Reviews
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manuscript Details Dialog */}
      <Dialog open={!!selectedManuscript} onOpenChange={() => setSelectedManuscript(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedManuscript?.title}</DialogTitle>
            <DialogDescription>
              Manuscript details and reviews
            </DialogDescription>
          </DialogHeader>
          
          {selectedManuscript && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Submission Date:</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedManuscript.submission_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Status:</h4>
                  <Badge className={getStatusColor(selectedManuscript.status)}>
                    {selectedManuscript.status.charAt(0).toUpperCase() + selectedManuscript.status.slice(1)}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Abstract:</h4>
                <p className="text-sm text-muted-foreground">{selectedManuscript.abstract}</p>
              </div>

              <div className="flex gap-2">
                {selectedManuscript.file_path && (
                  <Button
                    variant="outline"
                    onClick={() => downloadFile(selectedManuscript.file_path!, selectedManuscript.file_name || 'manuscript.pdf')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Manuscript
                  </Button>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-4">Reviews ({manuscriptReviews.length})</h4>
                {manuscriptReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reviews available yet.</p>
                ) : (
                  <div className="space-y-4">
                    {manuscriptReviews.map((review) => (
                      <Card key={review.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium">Review #{review.id?.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              Completed: {review.completed_date ? new Date(review.completed_date).toLocaleDateString() : 'Pending'}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReview(review)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                        
                        {review.rating && (
                          <div className="mb-2">
                            <span className="font-medium">Rating: </span>
                            <Badge variant="secondary">{review.rating}/10</Badge>
                          </div>
                        )}
                        
                        {review.recommendation && (
                          <div className="mb-2">
                            <span className="font-medium">Recommendation: </span>
                            <span className="text-sm">{review.recommendation}</span>
                          </div>
                        )}
                        
                        {review.comments && (
                          <div>
                            <span className="font-medium">Comments: </span>
                            <p className="text-sm text-muted-foreground mt-1">{review.comments}</p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthorDashboard;