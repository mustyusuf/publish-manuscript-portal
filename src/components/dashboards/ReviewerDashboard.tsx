import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { FileText, Clock, CheckCircle, Star, Eye, Upload, Download, Plus, FileDown } from 'lucide-react';
import UserProfile from '@/components/UserProfile';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

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
      first_name: string; // Will always be "Anonymous"
      last_name: string;  // Will always be "Author"
    };
  };
}

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

const ReviewerDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
  const [reviewedManuscriptFile, setReviewedManuscriptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingManuscript, setSubmittingManuscript] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAssignments();
      fetchManuscripts();
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

  // Transform assignments with manuscript data only (blind review - no author info)
  const transformedAssignments = reviewsData?.map(review => {
    const manuscript = manuscriptsData?.find(m => m.id === review.manuscript_id);
    
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
          first_name: 'Anonymous',
          last_name: 'Author'
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

  const fetchManuscripts = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('manuscripts')
        .select('*')
        .eq('author_id', user.id)
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
    }
  };

  const handleSubmitManuscript = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !manuscriptFile || !coverLetterFile) return;

    setSubmittingManuscript(true);
    
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

      // Upload cover letter
      const coverLetterFileExt = coverLetterFile.name.split('.').pop();
      const coverLetterFileName = `${user.id}/cover-letters/${Date.now()}.${coverLetterFileExt}`;
      
      const { error: coverLetterUploadError } = await supabase.storage
        .from('manuscripts')
        .upload(coverLetterFileName, coverLetterFile);

      if (coverLetterUploadError) throw coverLetterUploadError;

      // Create manuscript record
      const { error: insertError } = await supabase
        .from('manuscripts')
        .insert({
          title,
          abstract: '',
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
      setSubmittingManuscript(false);
    }
  };

  const submitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingReview(true);

    try {
      const formData = new FormData(e.currentTarget);
      const reviewId = formData.get('reviewId') as string;
      const recommendation = formData.get('recommendation') as string;
      const comments = formData.get('comments') as string;

      let assessmentFilePath = '';
      let reviewedManuscriptPath = '';

      // Upload assessment form if provided
      if (assessmentFile) {
        const assessmentFileExt = assessmentFile.name.split('.').pop();
        const assessmentFileName = `${user?.id}/assessments/${reviewId}_${Date.now()}.${assessmentFileExt}`;
        
        const { error: assessmentUploadError } = await supabase.storage
          .from('manuscripts')
          .upload(assessmentFileName, assessmentFile);

        if (assessmentUploadError) throw assessmentUploadError;
        assessmentFilePath = assessmentFileName;
      }

      // Upload reviewed manuscript if provided
      if (reviewedManuscriptFile) {
        const reviewedFileExt = reviewedManuscriptFile.name.split('.').pop();
        const reviewedFileName = `${user?.id}/reviewed/${reviewId}_${Date.now()}.${reviewedFileExt}`;
        
        const { error: reviewedUploadError } = await supabase.storage
          .from('manuscripts')
          .upload(reviewedFileName, reviewedManuscriptFile);

        if (reviewedUploadError) throw reviewedUploadError;
        reviewedManuscriptPath = reviewedFileName;
      }

      const { error } = await supabase
        .from('reviews')
        .update({
          recommendation,
          comments,
          status: 'pending_admin_approval',
          completed_date: new Date().toISOString(),
          assessment_file_path: assessmentFilePath || null,
          reviewed_manuscript_path: reviewedManuscriptPath || null
        })
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review submitted for admin approval!",
      });

      // Reset file inputs
      setAssessmentFile(null);
      setReviewedManuscriptFile(null);
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
      case 'pending_admin_approval':
        return 'bg-orange-100 text-orange-800';
      case 'admin_approved':
        return 'bg-green-100 text-green-800';
      case 'admin_rejected':
        return 'bg-red-100 text-red-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getManuscriptStatusColor = (status: string) => {
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

  const downloadAssessmentForm = async () => {
    try {
      // Create a Word document using docx library
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "ANNALS OF IBADAN POSTGRADUATE MEDICINE (AIPM)",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: "A PubMed indexed biomedical journal",
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: "INTERNAL REVIEWER'S ASSESSMENT FORM FOR SUBMITTED MANUSCRIPTS",
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "TITLE OF ARTICLE: ",
                  bold: true,
                }),
                new TextRun({
                  text: "________________________________",
                }),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "RATING",
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              text: "1 = Poor     2 = Average     3 = Good     4 = Excellent",
            }),
            new Paragraph({
              text: "ASSESSMENT",
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "1. TITLE.",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "i. Content and adequacy of description ………….………………………..........................",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "2. STRUCTURED ABSTRACT – For clinical studies, it should not be more than 250 words.",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "i. Length ……………………………………………………………….…………………….",
            }),
            new Paragraph({
              text: "ii. Appropriateness of contents ………………………………….………...………………….",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "3. OBJECTIVES OF THE ARTICLE - Keywords 3 – 6 words and abbreviations explicit.",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "i. Clarity ………………………………………………………….…….……….",
            }),
            new Paragraph({
              text: "ii. Relevance to current practice……………………………………………………",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "4. INTRODUCTION AND LITERATURE REVIEW – Figures referenced as e.g., Fig. 2.",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "i. Relevance to research objectives……………………….….………………………….",
            }),
            new Paragraph({
              text: "ii. How current ……………….………………………………………………………….",
            }),
            new Paragraph({
              text: "iii. Use of African/ Nigerian Literatures…………………………………………….",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "5. STUDY DESIGN – Review either STROBES, PRISMA, CONSORT Guideline e.t.c below.",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "i. Was it stated ………………………………..…………………………………………",
            }),
            new Paragraph({
              text: "ii. Appropriates to study objectives ………………….…………………………………….",
            }),
            new Paragraph({
              text: "iii. Sampling technique used ……………………..………………………...........................",
            }),
            new Paragraph({
              text: "iv. Sample size ……………………………………………………………………….",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "6. STATISTICAL ANALYSIS",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "i. Statement on the type used ……………………………..…………………………………",
            }),
            new Paragraph({
              text: "ii. Appropriateness ……………………………………………………………………",
            }),
            new Paragraph({
              text: "iii. Adequacy …………………………………………………………………………",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "7. RESULTS – Each table should be numbered in Arabic's, have title and be at a new page.",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "i. Is it applicable …………………………………………………………………….",
            }),
            new Paragraph({
              text: "ii. Accuracy …………………………………………………………………………...",
            }),
            new Paragraph({
              text: "iii. Appropriateness of illustrations ……………………………….………………….",
            }),
            new Paragraph({
              text: "iv. Effectiveness of display methods ………………………………………………….",
            }),
            new Paragraph({
              text: "v. Can any of the tables or figures be deleted without losing intended information? ….",
            }),
            new Paragraph({
              text: "vi. Yes / No. If yes, please specify ……….……………………………………………….",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "8. DISCUSSION – Original article word count 2000 – 3000, and 1500 words for commentaries.",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "i. Internal Consistency of arguments ……………………………………………….",
            }),
            new Paragraph({
              text: "ii. Clarity of presentation …………………………………………………….",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "9. CONCLUSIONS – British conventions of spelling, punctuation, and grammar.",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "i. Consistency with study design ……………………………………………………….",
            }),
            new Paragraph({
              text: "ii. Consistency with results ………………......................................................................",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "10. REFERENCES (VANCOUVER SUPERSCRIPT) – Not > 6 references for short commentaries.",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "i. Conform to Journal formal: Inconsistency in writing the authors of the references. Also there is inconsistency in use of case of name of authors.…………………….",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "11. OVERALL QUALITY,",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "i. Originality of value ………….…………............................................................................",
            }),
            new Paragraph({
              text: "ii. Contribution to knowledge.………………………………….………………………........",
            }),
            new Paragraph({
              text: "iii. Overall length…………………………………………………………………………..…...",
            }),
            new Paragraph({
              text: "iv. Literary style (e.g., sequence of tenses et cetera) ………………………….………………...",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "12. FINAL RECOMMENDATION",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: "The paper is:",
            }),
            new Paragraph({
              text: "i. Accepted……………………………………………………………………………………...",
            }),
            new Paragraph({
              text: "ii. Accepted subject to the modifications indicated below in the comment session: ……….",
            }),
            new Paragraph({
              text: "iii. Rejected……….………………………………………………………………………….",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "13. ADDITIONAL COMMENTS: ",
                  bold: true,
                }),
                new TextRun({
                  text: "……………………………………………………………....."}),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "Thank you.",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "_________________________",
            }),
            new Paragraph({
              text: "Name, Signature & Date.",
            }),
          ],
        }],
      });

      // Generate the document as a blob
      const blob = await Packer.toBlob(doc);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'assessment_form_template.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Assessment Form Downloaded",
        description: "Fill out the Word template and upload it with your review.",
      });
    } catch (error) {
      console.error('Error creating assessment form:', error);
      toast({
        title: "Error",
        description: "Failed to generate assessment form template.",
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
        <p className="text-muted-foreground">Review assigned manuscripts and submit your own</p>
      </div>

      <Tabs defaultValue="reviews" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reviews">Review Assignments</TabsTrigger>
          <TabsTrigger value="submissions">My Submissions</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reviews" className="space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Review Assignments
              </CardTitle>
              <CardDescription>
                Track and submit reviews for assigned manuscripts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/50">
                    <TableRow>
                      <TableHead className="font-semibold text-primary min-w-[50px]">S/N</TableHead>
                      <TableHead className="font-semibold text-primary min-w-[100px]">ID</TableHead>
                      <TableHead className="font-semibold text-primary min-w-[200px]">Title</TableHead>
                      <TableHead className="font-semibold text-primary min-w-[150px]">Author</TableHead>
                      <TableHead className="font-semibold text-primary min-w-[120px]">Due Date</TableHead>
                      <TableHead className="font-semibold text-primary min-w-[100px]">Status</TableHead>
                      <TableHead className="font-semibold text-primary min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                          <div className="flex flex-col items-center gap-3">
                            <FileText className="w-12 h-12 text-muted-foreground/50" />
                            <span>No review assignments yet. You'll see manuscripts assigned to you here.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignments.map((assignment, index) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-mono text-xs">
                            <span className="hidden sm:inline">{assignment.manuscript.id?.slice(0, 8)}...</span>
                            <span className="sm:hidden">{assignment.manuscript.id?.slice(0, 6)}...</span>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="max-w-[200px] sm:max-w-none truncate" title={assignment.manuscript.title}>
                              {assignment.manuscript.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[150px] sm:max-w-none truncate">
                              {assignment.manuscript.author.first_name} {assignment.manuscript.author.last_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{new Date(assignment.due_date).toLocaleDateString()}</span>
                              {isOverdue(assignment.due_date) && (
                                <span className="text-red-500 text-xs">(Overdue)</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(assignment.status)}>
                              {assignment.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                           <TableCell>
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                      <Eye className="h-4 w-4 mr-1" />
                                      <span className="hidden sm:inline">View</span>
                                      <span className="sm:hidden">View Manuscript</span>
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-[95vw] sm:max-w-lg">
                                    <DialogHeader>
                                      <DialogTitle>Document Information</DialogTitle>
                                      <DialogDescription>
                                        Manuscript assigned for review
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="bg-muted p-4 rounded-lg space-y-3">
                                        <div>
                                          <strong className="text-sm">Title:</strong>
                                          <p className="text-sm mt-1">{assignment.manuscript.title}</p>
                                        </div>
                                        <div>
                                          <strong className="text-sm">Author:</strong>
                                          <p className="text-sm mt-1">
                                            {assignment.manuscript.author.first_name} {assignment.manuscript.author.last_name}
                                          </p>
                                        </div>
                                        <div>
                                          <strong className="text-sm">File:</strong>
                                          <p className="text-sm mt-1">{assignment.manuscript.file_name}</p>
                                        </div>
                                        <div>
                                          <strong className="text-sm">Due Date:</strong>
                                          <p className="text-sm mt-1">{new Date(assignment.due_date).toLocaleDateString()}</p>
                                        </div>
                                        {assignment.manuscript.abstract && (
                                          <div>
                                            <strong className="text-sm">Abstract:</strong>
                                            <p className="text-sm mt-1">{assignment.manuscript.abstract}</p>
                                          </div>
                                        )}
                                        {assignment.manuscript.keywords?.length > 0 && (
                                          <div>
                                            <strong className="text-sm">Keywords:</strong>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {assignment.manuscript.keywords.map((keyword, index) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                  {keyword}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-col sm:flex-row gap-2">
                                        <Button
                                          onClick={() => downloadFile(assignment.manuscript.file_path, assignment.manuscript.file_name)}
                                          className="flex-1"
                                        >
                                          <Download className="h-4 w-4 mr-2" />
                                          Download Manuscript
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={downloadAssessmentForm}
                                          className="flex-1"
                                        >
                                          <FileDown className="h-4 w-4 mr-2" />
                                          Assessment Template
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                               
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={downloadAssessmentForm}
                                 className="w-full sm:w-auto"
                               >
                                 <FileDown className="h-4 w-4 mr-1" />
                                 <span className="hidden sm:inline">Form</span>
                                 <span className="sm:hidden">Assessment Form</span>
                               </Button>
                               
                               {assignment.status !== 'completed' ? (
                                 <Dialog>
                                   <DialogTrigger asChild>
                                     <Button size="sm" className="w-full sm:w-auto">
                                       <span className="hidden sm:inline">Submit Review</span>
                                       <span className="sm:hidden">Submit</span>
                                     </Button>
                                   </DialogTrigger>
                                   <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Submit Review for: {assignment.manuscript.title}</DialogTitle>
                                      <DialogDescription>
                                        Provide your detailed review and recommendation
                                      </DialogDescription>
                                    </DialogHeader>
                                     <form onSubmit={submitReview} className="space-y-4 p-1">
                                       <input type="hidden" name="reviewId" value={assignment.id} />
                                       
                                        <div>
                                           <Label htmlFor="recommendation">Recommendation</Label>
                                           <Select name="recommendation" required>
                                             <SelectTrigger>
                                               <SelectValue placeholder="Select recommendation" />
                                             </SelectTrigger>
                                             <SelectContent>
                                               <SelectItem value="Reject">Reject</SelectItem>
                                               <SelectItem value="Accept without correction">Accept without correction</SelectItem>
                                               <SelectItem value="Accept subject to minor corrections">Accept subject to minor corrections</SelectItem>
                                               <SelectItem value="Accept subject to major corrections">Accept subject to major corrections</SelectItem>
                                               <SelectItem value="Published">Published</SelectItem>
                                             </SelectContent>
                                           </Select>
                                         </div>
                                      
                                        <div>
                                          <Label htmlFor="comments">Detailed Comments (Optional)</Label>
                                          <Textarea
                                            id="comments"
                                            name="comments"
                                            rows={6}
                                            placeholder="Provide detailed feedback for the author, including strengths, weaknesses, and suggestions for improvement..."
                                          />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                            <Label htmlFor="assessmentFile">Upload Assessment Form</Label>
                                            <Input
                                              id="assessmentFile"
                                              type="file"
                                              accept=".doc,.docx"
                                              onChange={(e) => setAssessmentFile(e.target.files?.[0] || null)}
                                              required
                                            />
                                            <p className="text-sm text-muted-foreground mt-1">
                                              Upload your completed assessment template (Word format required)
                                            </p>
                                          </div>
                                          
                                          <div>
                                            <Label htmlFor="reviewedManuscript">Upload Reviewed Manuscript</Label>
                                            <Input
                                              id="reviewedManuscript"
                                              type="file"
                                              accept=".pdf,.doc,.docx"
                                              onChange={(e) => setReviewedManuscriptFile(e.target.files?.[0] || null)}
                                              required
                                            />
                                            <p className="text-sm text-muted-foreground mt-1">
                                              Upload manuscript with your annotations/comments (required)
                                            </p>
                                          </div>
                                        </div>
                                      
                                      <div className="bg-muted p-3 rounded-lg">
                                        <h4 className="font-medium mb-2">Manuscript Details:</h4>
                                        <p className="text-sm text-muted-foreground mb-2">
                                          <strong>Abstract:</strong> {assignment.manuscript.abstract}
                                        </p>
                                        {assignment.manuscript.keywords?.length > 0 && (
                                          <div>
                                            <strong className="text-sm">Keywords:</strong>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {assignment.manuscript.keywords.map((keyword, index) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                  {keyword}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <Button type="submit" className="w-full" disabled={submittingReview}>
                                        {submittingReview ? 'Submitting Review...' : 'Submit Review'}
                                      </Button>
                                    </form>
                                  </DialogContent>
                                </Dialog>
                               ) : (
                                 <Button variant="outline" size="sm" disabled className="w-full sm:w-auto">
                                   <CheckCircle className="h-4 w-4 mr-1" />
                                   <span className="hidden sm:inline">Completed</span>
                                   <span className="sm:hidden">Done</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="submissions" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">My Manuscript Submissions</h2>
              <p className="text-muted-foreground">Manage your submitted manuscripts</p>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Submit New Manuscript</span>
                  <span className="sm:hidden">New Manuscript</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Submit New Manuscript</DialogTitle>
                  <DialogDescription>
                    Upload your manuscript and cover letter for review.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitManuscript} className="space-y-4 p-1">
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
                    className="w-full" 
                    disabled={submittingManuscript || !manuscriptFile || !coverLetterFile}
                  >
                    {submittingManuscript ? (
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                My Manuscripts
              </CardTitle>
              <CardDescription>
                Track the status of your submitted manuscripts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Title</TableHead>
                      <TableHead className="min-w-[120px]">Submitted</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manuscripts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          <div className="flex flex-col items-center gap-3">
                            <FileText className="w-12 h-12 text-muted-foreground/50" />
                            <span>No manuscripts submitted yet. Click "Submit New Manuscript" to get started.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      manuscripts.map((manuscript) => (
                        <TableRow key={manuscript.id}>
                          <TableCell className="font-medium">
                            <div className="max-w-[200px] sm:max-w-none truncate" title={manuscript.title}>
                              {manuscript.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(manuscript.submission_date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getManuscriptStatusColor(manuscript.status)}>
                              <span className="hidden sm:inline">
                                {manuscript.status.charAt(0).toUpperCase() + manuscript.status.slice(1)}
                              </span>
                              <span className="sm:hidden">
                                {manuscript.status.split('_')[0]}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(manuscript.file_path, manuscript.file_name)}
                              className="w-full sm:w-auto"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Download</span>
                              <span className="sm:hidden">Get</span>
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
        </TabsContent>
        
        <TabsContent value="profile">
          <UserProfile />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReviewerDashboard;