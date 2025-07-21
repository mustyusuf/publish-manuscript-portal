import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, Edit, Save } from 'lucide-react';

interface UserProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  institution?: string;
  role?: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'author' | 'reviewer' | 'editor';
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    try {
      // Fetch all user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, institution');

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      setUsers(profilesData || []);
      setUserRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching users and roles:', error);
      toast({
        title: "Error",
        description: "Failed to load users and roles.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = (userId: string) => {
    const userRole = userRoles.find(role => role.user_id === userId);
    return userRole?.role || 'author'; // Default to author if no role found
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'author' | 'reviewer' | 'editor') => {
    setUpdatingRoles(prev => new Set(prev).add(userId));
    
    try {
      const existingRole = userRoles.find(role => role.user_id === userId);
      
      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      // Update local state
      setUserRoles(prev => {
        const updated = prev.filter(role => role.user_id !== userId);
        return [...updated, { user_id: userId, role: newRole }];
      });

      toast({
        title: "Success",
        description: `User role updated to ${newRole}.`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    } finally {
      setUpdatingRoles(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'editor':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'reviewer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'author':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full system access and user management';
      case 'editor':
        return 'Can submit manuscripts and review assigned papers';
      case 'reviewer':
        return 'Can review assigned manuscripts';
      case 'author':
        return 'Can submit manuscripts for review';
      default:
        return 'Standard user access';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-muted-foreground">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="academic-shadow">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions. Editors can both submit manuscripts and review assigned papers.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="font-semibold text-primary">Name</TableHead>
                  <TableHead className="font-semibold text-primary">Email</TableHead>
                  <TableHead className="font-semibold text-primary">Institution</TableHead>
                  <TableHead className="font-semibold text-primary">Current Role</TableHead>
                  <TableHead className="font-semibold text-primary">Change Role</TableHead>
                  <TableHead className="font-semibold text-primary">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="w-12 h-12 text-muted-foreground/50" />
                        <span>No users found.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const currentRole = getUserRole(user.user_id);
                    const isUpdating = updatingRoles.has(user.user_id);
                    
                    return (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.institution || 'Not provided'}</TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(currentRole)}>
                            <Shield className="w-3 h-3 mr-1" />
                            {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={currentRole}
                              onValueChange={(newRole: 'admin' | 'author' | 'reviewer' | 'editor') => 
                                updateUserRole(user.user_id, newRole)
                              }
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="reviewer">Reviewer</SelectItem>
                                <SelectItem value="author">Author</SelectItem>
                              </SelectContent>
                            </Select>
                            {isUpdating && (
                              <Save className="w-4 h-4 text-muted-foreground animate-spin" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-48">
                          {getRoleDescription(currentRole)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Information Card */}
      <Card className="academic-shadow">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Role Permissions
          </CardTitle>
          <CardDescription>
            Understanding different user roles and their capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Manage all user roles</li>
                <li>• View all manuscripts</li>
                <li>• Assign reviewers</li>
                <li>• Make final decisions</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                  <Edit className="w-3 h-3 mr-1" />
                  Editor
                </Badge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Submit manuscripts</li>
                <li>• Review assigned papers</li>
                <li>• Access to both dashboards</li>
                <li>• Dual privileges</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  <Shield className="w-3 h-3 mr-1" />
                  Reviewer
                </Badge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Review assigned manuscripts</li>
                <li>• Provide ratings and feedback</li>
                <li>• Access reviewer dashboard</li>
                <li>• Cannot submit papers</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  <Edit className="w-3 h-3 mr-1" />
                  Author
                </Badge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Submit manuscripts</li>
                <li>• Track submission status</li>
                <li>• View reviews of their papers</li>
                <li>• Basic user access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;