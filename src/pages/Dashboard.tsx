import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import AuthorDashboard from '@/components/dashboards/AuthorDashboard';
import ReviewerDashboard from '@/components/dashboards/ReviewerDashboard';
import Header from '@/components/Header';

const Dashboard = () => {
  const { userRole } = useAuth();

  const renderDashboard = () => {
    switch (userRole) {
      case 'admin':
        return <AdminDashboard />;
      case 'editor':
        // Editors have dual access - show both author and reviewer dashboards in tabs
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-primary">Editor Dashboard</h1>
              <p className="text-muted-foreground">As an editor, you can both submit manuscripts and review assigned papers</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Author Functions</h2>
                <AuthorDashboard />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-4">Reviewer Functions</h2>
                <ReviewerDashboard />
              </div>
            </div>
          </div>
        );
      case 'reviewer':
        return <ReviewerDashboard />;
      case 'author':
      default:
        return <AuthorDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-background">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderDashboard()}
      </main>
    </div>
  );
};

export default Dashboard;