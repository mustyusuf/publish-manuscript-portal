import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { FileText, Users, Clock, CheckCircle, XCircle, Eye, UserPlus, Settings } from 'lucide-react';
import UserManagement from '@/components/UserManagement';

interface Manuscript {
  id: string;
  title: string;
  status: 'submitted' | 'under_review' | 'revision_requested' | 'accepted' | 'rejected';
  submission_date: string;
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
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch manuscripts
      const { data: manuscriptsData, error: manuscriptsError } = await supabase
        .from('manuscripts')
        .select('id, title, status, submission_date, author_id')
        .order('submission_date', { ascending: false });

      if (manuscriptsError) throw manuscriptsError;

      // Fetch authors for manuscripts
      const authorIds = manuscriptsData?.map(m => m.author_id) || [];
      const { data: authorsData, error: authorsError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', authorIds);

      if (authorsError) throw authorsError;

      // Fetch reviewers
      const { data: reviewerRoles, error: reviewerRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'reviewer');

      if (reviewerRolesError) throw reviewerRolesError;

      const reviewerIds = reviewerRoles?.map(r => r.user_id) || [];
      const { data: reviewersData, error: reviewersError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, expertise_areas')
        .in('user_id', reviewerIds);

      if (reviewersError) throw reviewersError;

      // Transform manuscripts with author data
      const transformedManuscripts = manuscriptsData?.map(m => {
        const author = authorsData?.find(a => a.user_id === m.author_id);
        return {
          id: m.id,
          title: m.title,
          status: m.status,
          submission_date: m.submission_date,
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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignReviewer = async () => {
    if (!selectedManuscript || !selectedReviewer) return;

    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 2 weeks from now

      const { error } = await supabase
        .from('reviews')
        .insert({
          manuscript_id: selectedManuscript,
          reviewer_id: selectedReviewer,
          due_date: dueDate.toISOString(),
        });

      if (error) throw error;

      // Update manuscript status
      await supabase
        .from('manuscripts')
        .update({ status: 'under_review' })
        .eq('id', selectedManuscript);

      toast({
        title: "Success",
        description: "Reviewer assigned successfully.",
      });

      setSelectedManuscript('');
      setSelectedReviewer('');
      fetchData();
    } catch (error) {
      console.error('Error assigning reviewer:', error);
      toast({
        title: "Error",
        description: "Failed to assign reviewer.",
        variant: "destructive",
      });
    }
  };

  const updateManuscriptStatus = async (manuscriptId: string, status: 'submitted' | 'under_review' | 'revision_requested' | 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('manuscripts')
        .update({ 
          status,
          decision_date: status === 'accepted' || status === 'rejected' ? new Date().toISOString() : null
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manuscripts">Manuscript Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
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
                      
                      {manuscript.status === 'submitted' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedManuscript(manuscript.id)}>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Assign Reviewer
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Reviewer</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Select onValueChange={setSelectedReviewer}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a reviewer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {reviewers.map((reviewer) => (
                                    <SelectItem key={reviewer.id} value={reviewer.id}>
                                      {reviewer.first_name} {reviewer.last_name}
                                      {reviewer.expertise_areas?.length > 0 && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({reviewer.expertise_areas.join(', ')})
                                        </span>
                                      )}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button onClick={assignReviewer} className="w-full">
                                Assign Reviewer
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {manuscript.status === 'under_review' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() => updateManuscriptStatus(manuscript.id, 'accepted')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => updateManuscriptStatus(manuscript.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;