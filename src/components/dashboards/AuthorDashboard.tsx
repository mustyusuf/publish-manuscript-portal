import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Upload, Eye } from 'lucide-react';

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
  rating: number;
  comments: string;
  recommendation: string;
  completed_date: string;
}

const AuthorDashboard = () => {
  const { user } = useAuth();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

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
    if (!user || !selectedFile) return;

    setSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const title = formData.get('title') as string;
      const abstract = formData.get('abstract') as string;
      const keywords = (formData.get('keywords') as string).split(',').map(k => k.trim());
      const coAuthors = (formData.get('coAuthors') as string).split(',').map(a => a.trim()).filter(a => a);

      // Upload file
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('manuscripts')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Create manuscript record
      const { error: insertError } = await supabase
        .from('manuscripts')
        .insert({
          title,
          abstract,
          keywords,
          co_authors: coAuthors,
          author_id: user.id,
          file_path: fileName,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Manuscript submitted successfully!",
      });

      setSelectedFile(null);
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
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input id="keywords" name="keywords" placeholder="keyword1, keyword2, keyword3" />
              </div>
              
              <div>
                <Label htmlFor="coAuthors">Co-authors (comma-separated)</Label>
                <Input id="coAuthors" name="coAuthors" placeholder="Author 1, Author 2" />
              </div>
              
              <div>
                <Label htmlFor="file">Manuscript File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={submitting || !selectedFile}>
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

      <div className="grid gap-4">
        {manuscripts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No manuscripts yet</h3>
              <p className="text-muted-foreground mb-4">
                Submit your first manuscript to get started
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Submit Manuscript</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Submit New Manuscript</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitManuscript} className="space-y-4">
                    {/* Same form content as above */}
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" name="title" required />
                    </div>
                    
                    <div>
                      <Label htmlFor="abstract">Abstract</Label>
                      <Textarea id="abstract" name="abstract" rows={4} required />
                    </div>
                    
                    <div>
                      <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                      <Input id="keywords" name="keywords" placeholder="keyword1, keyword2, keyword3" />
                    </div>
                    
                    <div>
                      <Label htmlFor="coAuthors">Co-authors (comma-separated)</Label>
                      <Input id="coAuthors" name="coAuthors" placeholder="Author 1, Author 2" />
                    </div>
                    
                    <div>
                      <Label htmlFor="file">Manuscript File</Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        required
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={submitting || !selectedFile}>
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
            </CardContent>
          </Card>
        ) : (
          manuscripts.map((manuscript) => (
            <Card key={manuscript.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{manuscript.title}</CardTitle>
                    <CardDescription>
                      Submitted: {new Date(manuscript.submission_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(manuscript.status)}>
                    {manuscript.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {manuscript.abstract}
                </p>
                
                {manuscript.keywords?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Keywords:</p>
                    <div className="flex flex-wrap gap-2">
                      {manuscript.keywords.map((keyword, index) => (
                        <Badge key={index} variant="outline">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    File: {manuscript.file_name}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile(manuscript.file_path, manuscript.file_name)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View File
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AuthorDashboard;