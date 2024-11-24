// client/src/components/Profile.jsx
import { useState } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Settings, 
  Heart, 
  Clock, 
  Bell, 
  ChevronRight,
  ArrowLeft 
} from 'lucide-react';

const ProfileItem = ({ Icon, label, onClick, chevron = true, danger = false }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between w-full p-4 
      ${danger 
        ? 'text-red-600 hover:bg-red-50 active:bg-red-100' 
        : 'hover:bg-black/5 active:bg-black/10'} 
      transition-colors rounded-xl`}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5" strokeWidth={1.5} />
      <span className="font-medium">{label}</span>
    </div>
    {chevron && <ChevronRight className="w-5 h-5 text-gray-400" strokeWidth={1.5} />}
  </button>
);

const Profile = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-yellow-50 to-green-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-yellow-50 to-yellow-50/80 backdrop-blur-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <button 
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-bold">Profile</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 pb-24"> {/* Container for content */}
          {/* Profile Info */}
          <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-yellow-50 text-2xl font-bold">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold truncate">{user?.name || 'User'}</h2>
                <p className="text-gray-600 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-white/50 rounded-2xl border border-black/5 p-4">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-gray-600">Saved Products</div>
            </div>
            <div className="bg-white/50 rounded-2xl border border-black/5 p-4">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-gray-600">Scanned Items</div>
            </div>
          </div>

          {/* Profile Options */}
          <div className="mt-4 bg-white/50 rounded-2xl border border-black/5 overflow-hidden">
            <ProfileItem
              Icon={Heart}
              label="Saved Products"
              onClick={() => navigate('/saved')}
            />
            <div className="h-px bg-black/5" />
            <ProfileItem
              Icon={Clock}
              label="Scan History"
              onClick={() => navigate('/history')}
            />
            <div className="h-px bg-black/5" />
            <ProfileItem
              Icon={Bell}
              label="Notifications"
              onClick={() => navigate('/notifications')}
            />
            <div className="h-px bg-black/5" />
            <ProfileItem
              Icon={Settings}
              label="Settings"
              onClick={() => navigate('/settings')}
            />
          </div>

          {/* Logout Button */}
          <div className="mt-4 bg-white/50 rounded-2xl border border-black/5 overflow-hidden">
            <ProfileItem
              Icon={LogOut}
              label={loading ? 'Logging out...' : 'Logout'}
              onClick={handleLogout}
              chevron={false}
              danger
            />
          </div>

          {/* Version Info */}
          <div className="mt-6 mb-4 text-center text-sm text-gray-500">
            <p>Version 1.0.0</p>
            <p>Made with ❤️ By Aditya Raj Panjiyara</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;