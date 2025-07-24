import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserProfile from '@/components/UserProfile';
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
  cover_letter_path?: string;
  cover_letter_name?: string;
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

interface FinalDocument {
  id: string;
  file_name: string;
  file_path: string;
  upload_date: string;
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
  const [finalDocuments, setFinalDocuments] = useState<FinalDocument[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchManuscripts();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchManuscripts = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('manuscripts')
        .select('*')
        .eq('author_id', user.id)
        .order('submission_date', { ascending: false });

      if (error) {
        console.error('Supabase error fetching manuscripts:', error);
        throw error;
      }

      setManuscripts(data || []);
    } catch (error) {
      console.error('Error fetching manuscripts:', error);
      toast({
        title: "Error",
        description: "Failed to load manuscripts. Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManuscript = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !manuscriptFile || !coverLetterFile) return;

    setSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const title = formData.get('title') as string;

      // Upload manuscript file
      const manuscriptFileExt = manuscriptFile.name.split('.').pop();
      const manuscriptFileName = `${user.id}/manuscripts/${Date.now()}.${manuscriptFileExt}`;
      
      const { error: manuscriptUploadError } = await supabase.storage
        .from('manuscripts')
        .upload(manuscriptFileName, manuscriptFile);

      if (manuscriptUploadError) throw manuscriptUploadError;

      // Upload cover letter - now required
      const coverLetterFileExt = coverLetterFile.name.split('.').pop();
      const coverLetterFileName = `${user.id}/cover-letters/${Date.now()}.${coverLetterFileExt}`;
      
      const { error: coverLetterUploadError } = await supabase.storage
        .from('manuscripts')
        .upload(coverLetterFileName, coverLetterFile);

      if (coverLetterUploadError) throw coverLetterUploadError;

      // Create manuscript record with auto-generated unique ID
      const { error: insertError } = await supabase
        .from('manuscripts')
        .insert({
          title,
          abstract: '', // Set empty abstract since it's not required
          author_id: user.id,
          file_path: manuscriptFileName,
          file_name: manuscriptFile.name,
          file_size: manuscriptFile.size,
          cover_letter_path: coverLetterFileName,
          cover_letter_name: coverLetterFile.name,
          cover_letter_size: coverLetterFile.size,
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
      // Only fetch completed reviews that are assigned to the author
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('manuscript_id', manuscriptId)
        .eq('status', 'admin_approved')
        .not('completed_date', 'is', null); // Only show reviews that are actually completed

      if (error) {
        console.error('Error fetching reviews:', error);
        return;
      }

      setManuscriptReviews(reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchFinalDocuments = async (manuscriptId: string) => {
    try {
      const { data, error } = await supabase
        .from('final_documents')
        .select('id, file_name, file_path, upload_date')
        .eq('manuscript_id', manuscriptId)
        .order('upload_date', { ascending: false });

      if (error) {
        console.error('Error fetching final documents:', error);
        return;
      }

      setFinalDocuments(data || []);
    } catch (error) {
      console.error('Error fetching final documents:', error);
    }
  };

  const handleViewManuscript = async (manuscript: Manuscript) => {
    setSelectedManuscript(manuscript);
    if (manuscript.id) {
      await Promise.all([
        fetchManuscriptReviews(manuscript.id),
        fetchFinalDocuments(manuscript.id)
      ]);
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
      case 'internal_review':
        return 'bg-purple-100 text-purple-800';
      case 'external_review':
        return 'bg-indigo-100 text-indigo-800';
      case 'revision_requested':
        return 'bg-orange-100 text-orange-800';
      case 'accepted':
      case 'accept_without_correction':
      case 'accept_minor_corrections':
      case 'accept_major_corrections':
        return 'bg-green-100 text-green-800';
      case 'published':
        return 'bg-emerald-100 text-emerald-800';
      case 'rejected':
      case 'reject':
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-muted-foreground">Loading manuscripts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Tabs defaultValue="manuscripts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manuscripts">Manuscripts</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manuscripts" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">Author Dashboard</h1>
              <p className="text-muted-foreground">Manage your manuscript submissions for AIPM</p>
            </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto medical-gradient text-primary-foreground hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4 mr-2" />
              Submit New Manuscript
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-primary">Submit New Manuscript</DialogTitle>
              <DialogDescription>
                Upload your manuscript and cover letter for review. A unique ID will be automatically generated for your submission.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitManuscript} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Manuscript Title *</Label>
                <Input 
                  id="title" 
                  name="title" 
                  placeholder="Enter the title of your manuscript"
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manuscriptFile">Upload Manuscript *</Label>
                <Input
                  id="manuscriptFile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setManuscriptFile(e.target.files?.[0] || null)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Accepted formats: PDF, DOC, DOCX
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="coverLetterFile">Upload Cover Letter *</Label>
                <Input
                  id="coverLetterFile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCoverLetterFile(e.target.files?.[0] || null)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Accepted formats: PDF, DOC, DOCX
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full medical-gradient text-primary-foreground hover:opacity-90 transition-opacity" 
                disabled={submitting || !manuscriptFile || !coverLetterFile}
              >
                {submitting ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Manuscript
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="academic-shadow">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            My Manuscripts
          </CardTitle>
          <CardDescription>
            Track the status of your submitted manuscripts to AIPM
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="font-semibold text-primary">S/N</TableHead>
                  <TableHead className="font-semibold text-primary">File ID</TableHead>
                  <TableHead className="font-semibold text-primary">Title</TableHead>
                  <TableHead className="font-semibold text-primary">Submitted</TableHead>
                  <TableHead className="font-semibold text-primary">Status</TableHead>
                  <TableHead className="font-semibold text-primary">View</TableHead>
                  <TableHead className="font-semibold text-primary">Reviewer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manuscripts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="w-12 h-12 text-muted-foreground/50" />
                        <span>No manuscripts submitted yet. Click "Submit New Manuscript" to get started.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  manuscripts.map((manuscript, index) => (
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
                          {manuscript.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
                    {selectedManuscript.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Abstract:</h4>
                <p className="text-sm text-muted-foreground">{selectedManuscript.abstract}</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {selectedManuscript.file_path && (
                  <Button
                    variant="outline"
                    onClick={() => downloadFile(selectedManuscript.file_path!, selectedManuscript.file_name || 'manuscript.pdf')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Manuscript
                  </Button>
                )}
                {selectedManuscript.cover_letter_path && (
                  <Button
                    variant="outline"
                    onClick={() => downloadFile(selectedManuscript.cover_letter_path!, selectedManuscript.cover_letter_name || 'cover-letter.pdf')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Cover Letter
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Admin Review Documents ({finalDocuments.length})</h4>
                  {finalDocuments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No review documents available yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {finalDocuments.map((doc) => (
                        <Card key={doc.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{doc.file_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(doc.file_path, doc.file_name)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>
        
        <TabsContent value="profile">
          <UserProfile />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuthorDashboard;