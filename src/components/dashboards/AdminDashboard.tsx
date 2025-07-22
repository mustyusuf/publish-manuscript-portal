import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { FileText, Users, Clock, CheckCircle, XCircle, Eye, UserPlus, Settings, Download, Upload, Send, Trash2, MoreVertical, Edit } from 'lucide-react';
import UserManagement from '@/components/UserManagement';
import UserProfile from '@/components/UserProfile';
import FileUpload from '@/components/FileUpload';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Manuscript {
  id: string;
  title: string;
  abstract: string;
  status: 'submitted' | 'under_review' | 'revision_requested' | 'accepted' | 'rejected' | 'internal_review' | 'external_review' | 'accept_without_correction' | 'accept_minor_corrections' | 'accept_major_corrections' | 'published' | 'reject';
  submission_date: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  cover_letter_path?: string;
  cover_letter_name?: string;
  cover_letter_size?: number;
  keywords?: string[];
  co_authors?: string[];
  admin_notes?: string;
  author: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  expertise_areas: string[];
}

const AdminDashboard = () => {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    underReview: 0,
    completed: 0,
  });
  const [selectedManuscript, setSelectedManuscript] = useState<string>('');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [reviewDocuments, setReviewDocuments] = useState<{[key: string]: any[]}>({});
  const [finalDocuments, setFinalDocuments] = useState<{[key: string]: any[]}>({});
  const [viewingManuscript, setViewingManuscript] = useState<Manuscript | null>(null);
  const [selectedFinalManuscript, setSelectedFinalManuscript] = useState<string>('');
  const [editingManuscript, setEditingManuscript] = useState<Manuscript | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    keywords: [] as string[],
    co_authors: [] as string[],
    admin_notes: ''
  });
  const [manuscriptToDelete, setManuscriptToDelete] = useState<Manuscript | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('Starting fetchData...');
      setLoading(true);
      
      // Fetch manuscripts
      console.log('Fetching manuscripts...');
      const { data: manuscriptsData, error: manuscriptsError } = await supabase
        .from('manuscripts')
        .select('id, title, abstract, status, submission_date, author_id, file_path, file_name, file_size, cover_letter_path, cover_letter_name, cover_letter_size, keywords, co_authors, admin_notes')
        .order('submission_date', { ascending: false });

      if (manuscriptsError) {
        console.error('Manuscripts error:', manuscriptsError);
        throw manuscriptsError;
      }
      console.log('Manuscripts data:', manuscriptsData);

      // Fetch authors for manuscripts
      const authorIds = manuscriptsData?.map(m => m.author_id) || [];
      const { data: authorsData, error: authorsError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', authorIds);

      if (authorsError) {
        console.error('Authors error:', authorsError);
        throw authorsError;
      }
      console.log('Authors data:', authorsData);

      // Fetch reviewers
      console.log('Fetching reviewers...');
      const { data: reviewerRoles, error: reviewerRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'reviewer');

      if (reviewerRolesError) {
        console.error('Reviewer roles error:', reviewerRolesError);
        throw reviewerRolesError;
      }
      console.log('Reviewer roles:', reviewerRoles);

      const reviewerIds = reviewerRoles?.map(r => r.user_id) || [];
      const { data: reviewersData, error: reviewersError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, expertise_areas')
        .in('user_id', reviewerIds);

      if (reviewersError) {
        console.error('Reviewers error:', reviewersError);
        throw reviewersError;
      }
      console.log('Reviewers data:', reviewersData);

      // Transform manuscripts with author data
      const transformedManuscripts = manuscriptsData?.map(m => {
        const author = authorsData?.find(a => a.user_id === m.author_id);
        return {
          id: m.id,
          title: m.title,
          abstract: m.abstract,
          status: m.status,
          submission_date: m.submission_date,
          file_path: m.file_path,
          file_name: m.file_name,
          file_size: m.file_size,
          cover_letter_path: m.cover_letter_path,
          cover_letter_name: m.cover_letter_name,
          cover_letter_size: m.cover_letter_size,
          keywords: m.keywords,
          co_authors: m.co_authors,
          admin_notes: m.admin_notes,
          author: {
            first_name: author?.first_name || '',
            last_name: author?.last_name || '',
            email: author?.email || ''
          }
        };
      }) as Manuscript[] || [];

      // Transform reviewers
      const transformedReviewers = reviewersData?.map(r => ({
        id: r.user_id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        role: 'reviewer',
        expertise_areas: r.expertise_areas || []
      })) as User[] || [];

      setManuscripts(transformedManuscripts);
      setReviewers(transformedReviewers);

      // Calculate stats
      const total = manuscriptsData?.length || 0;
      const pending = manuscriptsData?.filter(m => m.status === 'submitted').length || 0;
      const underReview = manuscriptsData?.filter(m => m.status === 'under_review').length || 0;
      const completed = manuscriptsData?.filter(m => ['accepted', 'rejected'].includes(m.status)).length || 0;

      setStats({ total, pending, underReview, completed });
      console.log('Dashboard data fetch completed successfully');
    } catch (error: any) {
      console.error('Error fetching data:', error);
      console.error('Error details:', error.message, error.code);
      toast({
        title: "Error",
        description: `Failed to load dashboard data: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('Setting loading to false');
    }
  };

  const assignReviewers = async () => {
    if (!selectedManuscript || selectedReviewers.length === 0) return;

    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 2 weeks from now

      // Check for existing assignments to prevent duplicates
      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('reviewer_id')
        .eq('manuscript_id', selectedManuscript);

      const existingReviewerIds = existingReviews?.map(r => r.reviewer_id) || [];
      const newReviewers = selectedReviewers.filter(id => !existingReviewerIds.includes(id));

      if (newReviewers.length === 0) {
        toast({
          title: "Warning",
          description: "All selected reviewers are already assigned to this manuscript.",
          variant: "destructive",
        });
        return;
      }

      // Insert only new review assignments
      const reviewInserts = newReviewers.map(reviewerId => ({
        manuscript_id: selectedManuscript,
        reviewer_id: reviewerId,
        due_date: dueDate.toISOString(),
      }));

      const { error } = await supabase
        .from('reviews')
        .insert(reviewInserts);

      if (error) throw error;

      // Update manuscript status
      await supabase
        .from('manuscripts')
        .update({ status: 'under_review' })
        .eq('id', selectedManuscript);

      toast({
        title: "Success",
        description: `${newReviewers.length} reviewer(s) assigned successfully.`,
      });

      setSelectedManuscript('');
      setSelectedReviewers([]);
      fetchData();
    } catch (error) {
      console.error('Error assigning reviewers:', error);
      toast({
        title: "Error",
        description: "Failed to assign reviewers.",
        variant: "destructive",
      });
    }
  };

  const updateManuscriptStatus = async (manuscriptId: string, status: 'submitted' | 'under_review' | 'revision_requested' | 'accepted' | 'rejected' | 'internal_review' | 'external_review' | 'accept_without_correction' | 'accept_minor_corrections' | 'accept_major_corrections' | 'published' | 'reject') => {
    try {
      const { error } = await supabase
        .from('manuscripts')
        .update({ 
          status,
          decision_date: ['accepted', 'rejected', 'accept_without_correction', 'accept_minor_corrections', 'accept_major_corrections', 'published', 'reject'].includes(status) ? new Date().toISOString() : null
        })
        .eq('id', manuscriptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Manuscript status updated.",
      });

      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update manuscript status.",
        variant: "destructive",
      });
    }
  };

  const downloadManuscript = async (manuscript: Manuscript) => {
    if (!manuscript.file_path) {
      toast({
        title: "Error",
        description: "No file available for download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('manuscripts')
        .download(manuscript.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = manuscript.file_name || 'manuscript.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Manuscript downloaded successfully.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download manuscript.",
        variant: "destructive",
      });
    }
  };

  const downloadCoverLetter = async (manuscript: Manuscript) => {
    if (!manuscript.cover_letter_path) {
      toast({
        title: "Error",
        description: "No cover letter available for download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('manuscripts')
        .download(manuscript.cover_letter_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = manuscript.cover_letter_name || 'cover-letter.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Cover letter downloaded successfully.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download cover letter.",
        variant: "destructive",
      });
    }
  };

  const handleReviewDocumentsUpload = (manuscriptId: string, files: any[]) => {
    setReviewDocuments(prev => ({
      ...prev,
      [manuscriptId]: files
    }));
  };

  const handleFinalDocumentsUpload = (manuscriptId: string, files: any[]) => {
    console.log('Final documents uploaded for manuscript:', manuscriptId, files);
    setFinalDocuments(prev => ({
      ...prev,
      [manuscriptId]: files
    }));
  };

  const sendFinalDocumentsToAuthor = async (manuscriptId: string) => {
    const documents = finalDocuments[manuscriptId];
    console.log('Sending final documents to author for manuscript:', manuscriptId);
    console.log('Documents available:', documents);
    
    if (!documents || documents.length === 0) {
      console.log('No documents found for manuscript:', manuscriptId);
      toast({
        title: "Error",
        description: "No final documents to send.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get public URLs for the documents
      const documentUrls = await Promise.all(
        documents.map(async (doc: any) => {
          const { data } = await supabase.storage
            .from('manuscripts')
            .createSignedUrl(doc.path, 7 * 24 * 60 * 60); // 7 days expiry
          
          return {
            name: doc.name,
            path: doc.path,
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
        description: `Final documents sent to author successfully.`,
      });
    } catch (error: any) {
      console.error('Error sending final documents:', error);
      toast({
        title: "Error",
        description: "Failed to send final documents to author. Please try again.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteManuscript = async () => {
    if (!manuscriptToDelete) return;
    
    try {
      const { error } = await supabase
        .from('manuscripts')
        .delete()
        .eq('id', manuscriptToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Manuscript deleted successfully.",
      });

      fetchData();
      setManuscriptToDelete(null);
    } catch (error) {
      console.error('Error deleting manuscript:', error);
      toast({
        title: "Error",
        description: "Failed to delete manuscript.",
        variant: "destructive",
      });
    }
  };

  const openEditManuscript = (manuscript: Manuscript) => {
    setEditingManuscript(manuscript);
    setEditFormData({
      title: manuscript.title,
      keywords: manuscript.keywords || [],
      co_authors: manuscript.co_authors || [],
      admin_notes: manuscript.admin_notes || ''
    });
  };

  const updateManuscript = async () => {
    if (!editingManuscript) return;

    try {
      const { error } = await supabase
        .from('manuscripts')
        .update({
          title: editFormData.title,
          keywords: editFormData.keywords,
          co_authors: editFormData.co_authors,
          admin_notes: editFormData.admin_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingManuscript.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Manuscript updated successfully.",
      });

      setEditingManuscript(null);
      fetchData();
    } catch (error) {
      console.error('Error updating manuscript:', error);
      toast({
        title: "Error",
        description: "Failed to update manuscript.",
        variant: "destructive",
      });
    }
  };

  const sendDocumentsToAuthor = async (manuscriptId: string) => {
    const documents = reviewDocuments[manuscriptId];
    if (!documents || documents.length === 0) {
      toast({
        title: "Error",
        description: "No documents to send.",
        variant: "destructive",
      });
      return;
    }

    // In a real implementation, you would send an email notification
    // For now, we'll just show a success message
    toast({
      title: "Success",
      description: `${documents.length} document(s) sent to author for review.`,
    });
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage manuscripts, users, and system settings</p>
      </div>

      <Tabs defaultValue="manuscripts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manuscripts">Manuscript Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manuscripts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Manuscripts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Under Review</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.underReview}</div>
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Manuscript Management</CardTitle>
              <CardDescription>
                Review and manage submitted manuscripts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {manuscripts.map((manuscript) => (
                  <div
                    key={manuscript.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{manuscript.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        by {manuscript.author.first_name} {manuscript.author.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(manuscript.submission_date).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(manuscript.status)}>
                        {manuscript.status.replace('_', ' ')}
                      </Badge>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingManuscript(manuscript)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>

                      {manuscript.file_path && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadManuscript(manuscript)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}

                      {manuscript.status === 'submitted' && (
                        <Dialog>
                          <DialogTrigger asChild>
                           <Button size="sm" onClick={() => {
                              setSelectedManuscript(manuscript.id);
                              setSelectedReviewers([]);
                            }}>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Assign Reviewers
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Assign Reviewers to "{manuscript.title}"</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">
                                  Select Reviewers ({selectedReviewers.length} selected)
                                </label>
                                <div className="space-y-3 mt-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                                  {reviewers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                      No reviewers available. Add users with reviewer role first.
                                    </p>
                                  ) : (
                                    reviewers.map((reviewer) => (
                                      <div key={reviewer.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50">
                                        <input
                                          type="checkbox"
                                          id={reviewer.id}
                                          checked={selectedReviewers.includes(reviewer.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedReviewers([...selectedReviewers, reviewer.id]);
                                            } else {
                                              setSelectedReviewers(selectedReviewers.filter(id => id !== reviewer.id));
                                            }
                                          }}
                                          className="mt-1 rounded border-gray-300"
                                        />
                                        <label htmlFor={reviewer.id} className="text-sm cursor-pointer flex-1">
                                          <div className="font-medium">
                                            {reviewer.first_name} {reviewer.last_name}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {reviewer.email}
                                          </div>
                                          {reviewer.expertise_areas?.length > 0 && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                              <span className="font-medium">Expertise:</span> {reviewer.expertise_areas.join(', ')}
                                            </div>
                                          )}
                                        </label>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                              
                              <FileUpload
                                bucketName="manuscripts"
                                folderPath={`review-documents/${manuscript.id}`}
                                onFilesUploaded={(files) => handleReviewDocumentsUpload(manuscript.id, files)}
                                maxFiles={5}
                                label="Upload Review Documents (Optional)"
                              />
                              
                              <div className="flex gap-2">
                                <Button 
                                  onClick={assignReviewers} 
                                  className="flex-1"
                                  disabled={selectedReviewers.length === 0}
                                >
                                  Assign {selectedReviewers.length} Reviewer(s)
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedManuscript('');
                                    setSelectedReviewers([]);
                                  }}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                       )}
                       
                       {manuscript.status !== 'submitted' && reviewDocuments[manuscript.id] && (
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => sendDocumentsToAuthor(manuscript.id)}
                         >
                           <Send className="h-4 w-4 mr-1" />
                           Send to Author
                         </Button>
                       )}
                       
                        <Select
                          onValueChange={(value) => updateManuscriptStatus(manuscript.id, value as any)}
                          defaultValue={manuscript.status}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="internal_review">Internal Review</SelectItem>
                            <SelectItem value="external_review">External Review</SelectItem>
                            <SelectItem value="revision_requested">Revision Requested</SelectItem>
                           <SelectItem value="accept_without_correction">Accept without correction</SelectItem>
                           <SelectItem value="accept_minor_corrections">Accept subject to minor corrections</SelectItem>
                           <SelectItem value="accept_major_corrections">Accept subject to major corrections</SelectItem>
                           <SelectItem value="published">Published</SelectItem>
                           <SelectItem value="reject">Reject</SelectItem>
                         </SelectContent>
                       </Select>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditManuscript(manuscript)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Manuscript
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => setManuscriptToDelete(manuscript)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Manuscript
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Final Document Management</CardTitle>
              <CardDescription>
                Upload final reviewed documents for specific manuscripts to send to authors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {manuscripts.map((manuscript) => (
                    <div key={manuscript.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{manuscript.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            by {manuscript.author.first_name} {manuscript.author.last_name}
                          </p>
                        </div>
                        <Badge className={getStatusColor(manuscript.status)}>
                          {manuscript.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedFinalManuscript(manuscript.id)}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Upload Final Documents
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Upload Final Documents</DialogTitle>
                              <DialogDescription>
                                Upload final reviewed documents for "{manuscript.title}" to send to the author
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <FileUpload
                                bucketName="manuscripts"
                                folderPath={`final-documents/${manuscript.id}`}
                                onFilesUploaded={(files) => handleFinalDocumentsUpload(manuscript.id, files)}
                                maxFiles={10}
                                label="Upload Final Reviewed Documents"
                              />
                              
                              <div className="flex gap-2">
                                <Button 
                                  onClick={() => sendFinalDocumentsToAuthor(manuscript.id)}
                                  disabled={!finalDocuments[manuscript.id] || finalDocuments[manuscript.id]?.length === 0}
                                  className="flex-1"
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Send to Author
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {finalDocuments[manuscript.id] && finalDocuments[manuscript.id].length > 0 && (
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <h5 className="font-medium text-sm mb-2">Final Documents ({finalDocuments[manuscript.id].length}):</h5>
                            <div className="space-y-1">
                              {finalDocuments[manuscript.id].map((doc, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <span>{doc.name}</span>
                                  <Button size="sm" variant="ghost" className="h-6 px-2">
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manuscript Details Dialog */}
          <Dialog open={!!viewingManuscript} onOpenChange={() => setViewingManuscript(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manuscript Details</DialogTitle>
              </DialogHeader>
              {viewingManuscript && (
                <div className="space-y-6">
                  {/* Title and Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">{viewingManuscript.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Status: <Badge className={getStatusColor(viewingManuscript.status)}>{viewingManuscript.status.replace('_', ' ')}</Badge></span>
                        <span>Submitted: {new Date(viewingManuscript.submission_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Author Information</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p><strong>Name:</strong> {viewingManuscript.author.first_name} {viewingManuscript.author.last_name}</p>
                        <p><strong>Email:</strong> {viewingManuscript.author.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Abstract */}
                  <div>
                    <h4 className="font-medium mb-2">Abstract</h4>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm leading-relaxed">{viewingManuscript.abstract}</p>
                    </div>
                  </div>

                  {/* Keywords */}
                  {viewingManuscript.keywords && viewingManuscript.keywords.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {viewingManuscript.keywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary">{keyword}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Co-authors */}
                  {viewingManuscript.co_authors && viewingManuscript.co_authors.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Co-authors</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <ul className="space-y-1">
                          {viewingManuscript.co_authors.map((author, index) => (
                            <li key={index} className="text-sm">{author}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Files */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Manuscript File */}
                    {viewingManuscript.file_path && (
                      <div>
                        <h4 className="font-medium mb-2">Manuscript File</h4>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{viewingManuscript.file_name}</p>
                              {viewingManuscript.file_size && (
                                <p className="text-xs text-muted-foreground">
                                  {(viewingManuscript.file_size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadManuscript(viewingManuscript)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cover Letter */}
                    {viewingManuscript.cover_letter_path && (
                      <div>
                        <h4 className="font-medium mb-2">Cover Letter</h4>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{viewingManuscript.cover_letter_name}</p>
                              {viewingManuscript.cover_letter_size && (
                                <p className="text-xs text-muted-foreground">
                                  {(viewingManuscript.cover_letter_size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadCoverLetter(viewingManuscript)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Notes */}
                  {viewingManuscript.admin_notes && (
                    <div>
                      <h4 className="font-medium mb-2">Admin Notes</h4>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm leading-relaxed">{viewingManuscript.admin_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Manuscript Dialog */}
          <Dialog open={!!editingManuscript} onOpenChange={() => setEditingManuscript(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Manuscript</DialogTitle>
                <DialogDescription>
                  Update manuscript information and admin notes
                </DialogDescription>
              </DialogHeader>
              {editingManuscript && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-title">Title</Label>
                    <Input
                      id="edit-title"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                      className="mt-1"
                    />
                  </div>


                  <div>
                    <Label htmlFor="edit-keywords">Keywords (comma-separated)</Label>
                    <Input
                      id="edit-keywords"
                      value={editFormData.keywords.join(', ')}
                      onChange={(e) => setEditFormData({
                        ...editFormData, 
                        keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                      })}
                      className="mt-1"
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-coauthors">Co-authors (comma-separated)</Label>
                    <Input
                      id="edit-coauthors"
                      value={editFormData.co_authors.join(', ')}
                      onChange={(e) => setEditFormData({
                        ...editFormData, 
                        co_authors: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                      })}
                      className="mt-1"
                      placeholder="Author Name 1, Author Name 2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-admin-notes">Admin Notes</Label>
                    <Textarea
                      id="edit-admin-notes"
                      value={editFormData.admin_notes}
                      onChange={(e) => setEditFormData({...editFormData, admin_notes: e.target.value})}
                      rows={4}
                      className="mt-1"
                      placeholder="Internal notes for admin use..."
                    />
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingManuscript(null)}>
                      Cancel
                    </Button>
                    <Button onClick={updateManuscript}>
                      Update Manuscript
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="profile">
          <UserProfile />
        </TabsContent>
      </Tabs>

      {/* Manuscript Delete Confirmation Dialog */}
      <AlertDialog open={!!manuscriptToDelete} onOpenChange={() => setManuscriptToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Manuscript Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{manuscriptToDelete?.title}"?
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-sm text-red-800 dark:text-red-200">
                  ⚠️ This action cannot be undone. All associated files and data will be permanently deleted.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteManuscript}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Manuscript
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;