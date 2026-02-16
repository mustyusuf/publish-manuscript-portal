import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Send, FileText } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface ReviewSubmission {
  id: string;
  reviewer_id: string;
  status: string;
  completed_date: string | null;
  assessment_file_path: string | null;
  reviewed_manuscript_path: string | null;
  comments: string | null;
  recommendation: string | null;
  reviewer: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ManuscriptReviews {
  manuscript_id: string;
  title: string;
  author_name: string;
  status: string;
  reviews: ReviewSubmission[];
}

interface FinalDocument {
  id: string;
  file_name: string;
  file_path: string;
  upload_date: string;
}

const ReviewManagement = () => {
  const [manuscriptReviews, setManuscriptReviews] = useState<ManuscriptReviews[]>([]);
  const [finalDocuments, setFinalDocuments] = useState<{[key: string]: FinalDocument[]}>({});
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reviewPage, setReviewPage] = useState(1);
  const REVIEWS_PER_PAGE = 10;
  const { toast } = useToast();

  useEffect(() => {
    fetchReviewSubmissions();
    fetchFinalDocuments();
  }, []);

  const fetchReviewSubmissions = async () => {
    try {
      // Fetch reviews with pending_admin_approval status
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          reviewer_id,
          manuscript_id,
          status,
          completed_date,
          assessment_file_path,
          reviewed_manuscript_path,
          comments,
          recommendation
        `)
        .eq('status', 'pending_admin_approval')
        .order('completed_date', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Get unique manuscript IDs
      const manuscriptIds = [...new Set(reviewsData?.map(r => r.manuscript_id) || [])];

      // Fetch manuscripts
      const { data: manuscriptsData, error: manuscriptsError } = await supabase
        .from('manuscripts')
        .select('id, title, author_id, status')
        .in('id', manuscriptIds);

      if (manuscriptsError) throw manuscriptsError;

      // Get author and reviewer IDs
      const authorIds = manuscriptsData?.map(m => m.author_id) || [];
      const reviewerIds = reviewsData?.map(r => r.reviewer_id) || [];

      // Fetch authors - try direct query first (works for admins), fallback to restricted access
      let authorsData;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', authorIds);
        
        if (error && error.message.includes('policy')) {
          // If policy blocks access, create minimal data from available info
          authorsData = authorIds.map(id => ({ 
            user_id: id, 
            first_name: 'Author', 
            last_name: `(${id.slice(0, 8)})` 
          }));
        } else if (error) {
          throw error;
        } else {
          authorsData = data;
        }
      } catch (error) {
        console.error('Error fetching authors:', error);
        authorsData = authorIds.map(id => ({ 
          user_id: id, 
          first_name: 'Author', 
          last_name: `(${id.slice(0, 8)})` 
        }));
      }

      // Fetch reviewers - should work for admins
      let reviewersData;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', reviewerIds);
        
        if (error && error.message.includes('policy')) {
          reviewersData = reviewerIds.map(id => ({ 
            user_id: id, 
            first_name: 'Reviewer', 
            last_name: `(${id.slice(0, 8)})`,
            email: 'restricted@example.com'
          }));
        } else if (error) {
          throw error;
        } else {
          reviewersData = data;
        }
      } catch (error) {
        console.error('Error fetching reviewers:', error);
        reviewersData = reviewerIds.map(id => ({ 
          user_id: id, 
          first_name: 'Reviewer', 
          last_name: `(${id.slice(0, 8)})`,
          email: 'restricted@example.com'
        }));
      }

      // Group reviews by manuscript
      const groupedReviews: ManuscriptReviews[] = manuscriptIds.map(manuscriptId => {
        const manuscript = manuscriptsData?.find(m => m.id === manuscriptId);
        const author = authorsData?.find(a => a.user_id === manuscript?.author_id);
        const manuscriptReviewsData = reviewsData?.filter(r => r.manuscript_id === manuscriptId) || [];

        const reviews: ReviewSubmission[] = manuscriptReviewsData.map(review => {
          const reviewer = reviewersData?.find(r => r.user_id === review.reviewer_id);
          return {
            id: review.id,
            reviewer_id: review.reviewer_id,
            status: review.status,
            completed_date: review.completed_date,
            assessment_file_path: review.assessment_file_path,
            reviewed_manuscript_path: review.reviewed_manuscript_path,
            comments: review.comments,
            recommendation: review.recommendation,
            reviewer: {
              first_name: reviewer?.first_name || '',
              last_name: reviewer?.last_name || '',
              email: reviewer?.email || ''
            }
          };
        });

        return {
          manuscript_id: manuscriptId,
          title: manuscript?.title || '',
          author_name: `${author?.first_name || ''} ${author?.last_name || ''}`.trim(),
          status: manuscript?.status || '',
          reviews
        };
      });

      setManuscriptReviews(groupedReviews);
    } catch (error) {
      console.error('Error fetching review submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load review submissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFinalDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('final_documents')
        .select('id, manuscript_id, file_name, file_path, upload_date')
        .order('upload_date', { ascending: false });

      if (error) throw error;

      // Group by manuscript_id
      const grouped = (data || []).reduce((acc, doc) => {
        if (!acc[doc.manuscript_id]) {
          acc[doc.manuscript_id] = [];
        }
        acc[doc.manuscript_id].push(doc);
        return acc;
      }, {} as {[key: string]: FinalDocument[]});

      setFinalDocuments(grouped);
    } catch (error) {
      console.error('Error fetching final documents:', error);
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

  const handleFinalDocumentsUpload = async (manuscriptId: string, files: any[]) => {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Insert records into final_documents table
      const documentInserts = files.map(file => ({
        manuscript_id: manuscriptId,
        file_name: file.name,
        file_path: file.path,
        file_size: file.size || 0,
        uploaded_by: user.id
      }));

      const { error } = await supabase
        .from('final_documents')
        .insert(documentInserts);

      if (error) throw error;

      // Update manuscript status to "under review"
      await supabase
        .from('manuscripts')
        .update({ 
          status: 'under_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', manuscriptId);

      toast({
        title: "Success",
        description: "Final documents uploaded successfully!",
      });

      fetchFinalDocuments();
    } catch (error) {
      console.error('Error uploading final documents:', error);
      toast({
        title: "Error",
        description: "Failed to upload final documents.",
        variant: "destructive",
      });
    }
  };

  const sendFinalDocumentsToAuthor = async (manuscriptId: string) => {
    try {
      const documents = finalDocuments[manuscriptId];
      if (!documents || documents.length === 0) {
        toast({
          title: "Error",
          description: "No final documents to send.",
          variant: "destructive",
        });
        return;
      }

      // Get public URLs for the documents
      const documentUrls = await Promise.all(
        documents.map(async (doc) => {
          const { data } = await supabase.storage
            .from('manuscripts')
            .createSignedUrl(doc.file_path, 7 * 24 * 60 * 60); // 7 days expiry
          
          return {
            name: doc.file_name,
            path: doc.file_path,
            url: data?.signedUrl || ''
          };
        })
      );

      // Call edge function to send email
      const { error } = await supabase.functions.invoke('send-final-documents', {
        body: {
          manuscriptId,
          documents: documentUrls
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Final documents sent to author successfully!",
      });
    } catch (error) {
      console.error('Error sending final documents:', error);
      toast({
        title: "Error",
        description: "Failed to send final documents to author.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading review submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Submissions Management</CardTitle>
          <CardDescription>
            Review submitted documents by reviewers and upload consolidated versions for authors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {manuscriptReviews.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No pending review submissions.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {(() => {
                const totalReviewPages = Math.ceil(manuscriptReviews.length / REVIEWS_PER_PAGE);
                const paginatedReviews = manuscriptReviews.slice((reviewPage - 1) * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE);
                return (<>
              {paginatedReviews.map((manuscript) => (
                <div key={manuscript.manuscript_id} className="border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{manuscript.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Author: {manuscript.author_name}
                      </p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">
                      {manuscript.reviews.length} Review{manuscript.reviews.length !== 1 ? 's' : ''} Pending
                    </Badge>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Reviewer Submissions</h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>S/N</TableHead>
                            <TableHead>Reviewer</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Download Assessment Form</TableHead>
                            <TableHead>Download Review</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {manuscript.reviews.map((review, index) => (
                            <TableRow key={review.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {review.reviewer.first_name} {review.reviewer.last_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {review.reviewer.email}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  Submitted
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {review.assessment_file_path ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadFile(review.assessment_file_path!, 'assessment_form.pdf')}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Download
                                  </Button>
                                ) : (
                                  <span className="text-sm text-muted-foreground">No file</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {review.reviewed_manuscript_path ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadFile(review.reviewed_manuscript_path!, 'reviewed_manuscript.pdf')}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Download
                                  </Button>
                                ) : (
                                  <span className="text-sm text-muted-foreground">No file</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Admin Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button onClick={() => setSelectedManuscriptId(manuscript.manuscript_id)}>
                            <Upload className="h-4 w-4 mr-1" />
                            Upload Consolidated Documents
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Upload Final Documents</DialogTitle>
                            <DialogDescription>
                              Upload the consolidated reviewed documents for "{manuscript.title}" to send to the author
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <FileUpload
                              bucketName="manuscripts"
                              folderPath={`final-documents/${manuscript.manuscript_id}`}
                              onFilesUploaded={(files) => {
                                handleFinalDocumentsUpload(manuscript.manuscript_id, files);
                              }}
                              maxFiles={10}
                              label="Upload Final Documents"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>

                      {finalDocuments[manuscript.manuscript_id] && finalDocuments[manuscript.manuscript_id].length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => sendFinalDocumentsToAuthor(manuscript.manuscript_id)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send to Author ({finalDocuments[manuscript.manuscript_id].length} files)
                        </Button>
                      )}
                    </div>

                    {finalDocuments[manuscript.manuscript_id] && finalDocuments[manuscript.manuscript_id].length > 0 && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <h5 className="font-medium text-sm mb-2">
                          Uploaded Final Documents ({finalDocuments[manuscript.manuscript_id].length}):
                        </h5>
                        <div className="space-y-1">
                          {finalDocuments[manuscript.manuscript_id].map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between text-sm">
                              <span>{doc.file_name}</span>
                              <span className="text-muted-foreground">
                                {new Date(doc.upload_date).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {totalReviewPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setReviewPage(p => Math.max(1, p - 1))}
                        className={reviewPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalReviewPages }, (_, i) => i + 1).map(page => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === reviewPage}
                          onClick={() => setReviewPage(page)}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setReviewPage(p => Math.min(totalReviewPages, p + 1))}
                        className={reviewPage === totalReviewPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Showing {((reviewPage - 1) * REVIEWS_PER_PAGE) + 1}–{Math.min(reviewPage * REVIEWS_PER_PAGE, manuscriptReviews.length)} of {manuscriptReviews.length} reviews
              </p>
              </>);
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewManagement;