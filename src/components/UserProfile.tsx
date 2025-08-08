import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { saveAs } from 'file-saver';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Building, BookOpen, Plus, X, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const UserProfile = () => {
  const { user, profile, userRole } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    institution: '',
    bio: '',
    expertise_areas: [] as string[],
  });
  const { toast } = useToast();
  const [fromDateTime, setFromDateTime] = useState<string>("");
  const [toDateTime, setToDateTime] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        institution: profile.institution || '',
        bio: profile.bio || '',
        expertise_areas: profile.expertise_areas || [],
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          institution: formData.institution,
          bio: formData.bio,
          expertise_areas: formData.expertise_areas,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addExpertiseArea = () => {
    if (expertiseInput.trim() && !formData.expertise_areas.includes(expertiseInput.trim())) {
      setFormData({
        ...formData,
        expertise_areas: [...formData.expertise_areas, expertiseInput.trim()],
      });
      setExpertiseInput('');
    }
  };

  const removeExpertiseArea = (area: string) => {
    setFormData({
      ...formData,
      expertise_areas: formData.expertise_areas.filter(a => a !== area),
    });
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) throw error;

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for password reset instructions.",
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      toast({
        title: "Error",
        description: "Failed to send password reset email.",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password changed successfully.",
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordDialogOpen(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access to manage manuscripts, users, and system settings';
      case 'reviewer':
        return 'Can review assigned manuscripts and provide feedback';
      case 'author':
        return 'Can submit manuscripts and view review feedback';
      default:
        return 'Standard user access';
    }
  };

  if (!user || !profile) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const exportAuditLogs = async () => {
    try {
      setExporting(true);
      // Fetch manuscripts within range
      const { data: manuscripts } = await supabase
        .from('manuscripts')
        .select('id, title, submission_date, author_id')
        .order('submission_date', { ascending: false });

      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, manuscript_id, reviewer_id, completed_date, status')
        .order('completed_date', { ascending: false });

      const { data: finalDocs } = await supabase
        .from('final_documents')
        .select('id, manuscript_id, uploaded_by, upload_date, file_name')
        .order('upload_date', { ascending: false });

      // Collect user ids to map emails
      const userIds = new Set<string>();
      (manuscripts || []).forEach(m => userIds.add(m.author_id));
      (reviews || []).forEach(r => r.reviewer_id && userIds.add(r.reviewer_id));
      (finalDocs || []).forEach(d => userIds.add(d.uploaded_by));

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .in('user_id', Array.from(userIds));
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const inRange = (iso?: string | null) => {
        if (!iso) return false;
        const t = new Date(iso).getTime();
        const fromOk = fromDateTime ? t >= new Date(fromDateTime).getTime() : true;
        const toOk = toDateTime ? t <= new Date(toDateTime).getTime() : true;
        return fromOk && toOk;
      };

      type Row = { timestamp: string; event_type: string; actor_email: string; actor_name: string; target_type: string; target_id: string; title: string };
      const rows: Row[] = [];

      (manuscripts || []).forEach(m => {
        if (!fromDateTime && !toDateTime || inRange(m.submission_date)) {
          const author = profileMap.get(m.author_id);
          rows.push({
            timestamp: m.submission_date,
            event_type: 'manuscript_submitted',
            actor_email: author?.email || '',
            actor_name: author ? `${author.first_name} ${author.last_name}` : '',
            target_type: 'manuscript',
            target_id: m.id,
            title: m.title,
          });
        }
      });

      (reviews || []).forEach(r => {
        if (r.completed_date && ( !fromDateTime && !toDateTime || inRange(r.completed_date))) {
          const reviewer = r.reviewer_id ? profileMap.get(r.reviewer_id) : undefined;
          rows.push({
            timestamp: r.completed_date!,
            event_type: 'review_submitted',
            actor_email: reviewer?.email || '',
            actor_name: reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : '',
            target_type: 'review',
            target_id: r.id,
            title: r.manuscript_id,
          });
        }
      });

      (finalDocs || []).forEach(d => {
        if (!fromDateTime && !toDateTime || inRange(d.upload_date)) {
          const uploader = profileMap.get(d.uploaded_by);
          rows.push({
            timestamp: d.upload_date,
            event_type: 'final_document_uploaded',
            actor_email: uploader?.email || '',
            actor_name: uploader ? `${uploader.first_name} ${uploader.last_name}` : '',
            target_type: 'final_document',
            target_id: d.id,
            title: d.file_name,
          });
        }
      });

      // Sort by time desc
      rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const headers = ['timestamp','event_type','actor_email','actor_name','target_type','target_id','title'];
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const filename = `audit_export_${new Date().toISOString().slice(0,10)}.csv`;
      saveAs(blob, filename);
      toast({ title: 'Exported', description: `Saved ${rows.length} log entries.` });
    } catch (e) {
      console.error('Export error', e);
      toast({ title: 'Error', description: 'Failed to export logs', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </CardTitle>
          <CardDescription>
            Manage your personal information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                  <p className="text-sm">{profile.first_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                  <p className="text-sm">{profile.last_name}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <p className="text-sm">{profile.email}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  Institution
                </Label>
                <p className="text-sm">{profile.institution || 'Not specified'}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Bio</Label>
                <p className="text-sm">{profile.bio || 'No bio provided'}</p>
              </div>
              
              {profile.expertise_areas && profile.expertise_areas.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    Expertise Areas
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.expertise_areas.map((area: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {(userRole === 'admin' || userRole === 'super_admin') && (
                <div className="mt-4 border rounded-lg p-4 space-y-3">
                  <Label className="text-sm font-medium">Admin Tools • Export Audit Logs</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      type="datetime-local"
                      value={fromDateTime}
                      onChange={(e) => setFromDateTime(e.target.value)}
                      aria-label="From date-time"
                    />
                    <Input
                      type="datetime-local"
                      value={toDateTime}
                      onChange={(e) => setToDateTime(e.target.value)}
                      aria-label="To date-time"
                    />
                    <Button onClick={exportAuditLogs} disabled={exporting}>
                      {exporting ? 'Exporting...' : 'Export CSV'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Exports submissions, review submissions, and final document uploads within range.</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={userRole === 'admin' ? 'destructive' : 'default'}>
                    {userRole}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getRoleDescription(userRole || '')}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => setIsEditing(true)} className="flex-1">
                  Edit Profile
                </Button>
                <div className="flex gap-2 flex-1">
                  <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <Lock className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                          Enter your new password below.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            placeholder="Enter new password"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            placeholder="Confirm new password"
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            disabled={changingPassword}
                            className="flex-1"
                          >
                            {changingPassword ? 'Changing...' : 'Change Password'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPasswordDialogOpen(false);
                              setPasswordData({
                                currentPassword: '',
                                newPassword: '',
                                confirmPassword: '',
                              });
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <Lock className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          We'll send a password reset link to your email address.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                          <p className="text-sm">{user?.email}</p>
                        </div>
                        <Button
                          onClick={handlePasswordReset}
                          disabled={resettingPassword}
                          className="w-full"
                        >
                          {resettingPassword ? 'Sending...' : 'Send Reset Email'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed here
                </p>
              </div>
              
              <div>
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  placeholder="Your institution or organization"
                />
              </div>
              
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Expertise Areas</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={expertiseInput}
                    onChange={(e) => setExpertiseInput(e.target.value)}
                    placeholder="Add expertise area"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertiseArea())}
                  />
                  <Button type="button" onClick={addExpertiseArea} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.expertise_areas.map((area, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {area}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 w-4 h-4"
                        onClick={() => removeExpertiseArea(area)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;