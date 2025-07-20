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
      case 'reviewer':
        return <ReviewerDashboard />;
      case 'author':
      default:
        return <AuthorDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {renderDashboard()}
      </main>
    </div>
  );
};

export default Dashboard;