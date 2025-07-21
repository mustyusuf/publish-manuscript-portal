import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = () => {
  const { user, signOut, userRole } = useAuth();

  return (
    <header className="bg-card border-b border-border academic-shadow">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <img 
                src="/lovable-uploads/4f1bb596-8115-434e-b44d-9923671ada12.png" 
                alt="AIPM Logo" 
                className="w-12 h-12 object-contain"
              />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-primary">AIPM</h1>
                <p className="text-sm text-muted-foreground">Manuscript Portal</p>
              </div>
            </Link>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{user.email}</span>
                {userRole && (
                  <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full border border-primary/20">
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center space-x-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;