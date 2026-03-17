import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../common/Logo';
import { logout } from '../../firebase/auth';

const AdminSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Overview', icon: '▣' },
    { name: 'Staff', icon: '◫' },
    { name: 'Attendance', icon: '◪' },
    { name: 'Status', icon: '●' },
  ];

  return (
    <aside className="w-[272px] h-screen bg-surface/95 backdrop-blur-xl border-r border-white/5 fixed left-0 top-0 flex flex-col z-40 hidden md:flex shadow-panel">
      <div className="p-7 flex items-center gap-4 border-b border-white/5">
        <Logo size="sm" />
        <div>
          <h2 className="text-amber font-bold text-lg tracking-wide">OM Health Care</h2>
          <span className="text-textSecondary text-xs uppercase tracking-[0.24em]">Admin Console</span>
        </div>
      </div>

      <nav className="flex flex-col gap-2 p-4 flex-grow">
        <div className="px-3 pt-2 pb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-textSecondary">
          Workspace
        </div>
        {navItems.map((item, index) => (
          <button
            key={item.name}
            type="button"
            className={`flex items-center gap-3 p-3 rounded-2xl text-sm font-medium transition-colors text-left ${
              index === 0
                ? 'bg-white/5 text-textPrimary border border-white/5 shadow-soft'
                : 'text-textSecondary hover:bg-cardHover hover:text-textPrimary'
            }`}
          >
            <span className={`text-lg ${index === 3 ? 'text-green' : ''}`}>{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 rounded-2xl text-sm font-medium text-red hover:bg-red/10 w-full transition-colors"
        >
          <span className="text-lg">🚪</span>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
