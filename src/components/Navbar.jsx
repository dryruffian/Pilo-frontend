//NavBar.jsx
import { History, ScanBarcode, User } from 'lucide-react';
import React from 'react';
import { useNavigate } from "react-router-dom";

const NavbarItem = ({ Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-0.5 w-16 active:opacity-60 transition-opacity"
  >
    <Icon className="w-6 h-6" strokeWidth={1.5} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const Navbar = () => {
  const navigate = useNavigate()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t border-black">
      <div className="flex justify-between items-center px-9 pb-[calc(env(safe-area-inset-bottom))]">
        <NavbarItem 
          Icon={History} 
          label="History" 
          onClick={() => navigate('/history')}
        />
        
        <div className="relative -top-7">
          <button 
            className="flex flex-col items-center gap-0.5 bg-black text-yellow-50 p-5 rounded-full active:opacity-60 transition-opacity"
            onClick={() => navigate('/scan')}
          >
            <ScanBarcode className="w-10 h-10" strokeWidth={1.5} />
          </button>
        </div>
        
        <NavbarItem 
          Icon={User} 
          label="Profile" 
          onClick={() => navigate('/user')}
        />
      </div>
    </nav>
  );
};

export default React.memo(Navbar);