import Header from '@/components/Header';
import UserProfile from '@/components/UserProfile';

const Profile = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <UserProfile />
      </main>
    </div>
  );
};

export default Profile;