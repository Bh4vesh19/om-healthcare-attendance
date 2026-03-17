import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../../firebase/auth';

const BottomNav = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] max-w-md h-[74px] bg-card/90 backdrop-blur-xl border border-white/5 rounded-3xl flex justify-around items-center px-2 z-50 md:hidden shadow-panel">
            <NavLink 
                to="/staff-dashboard" 
                className={({ isActive }) => `flex flex-col items-center gap-1 w-20 transition-colors ${isActive ? 'text-amber font-bold' : 'text-textSecondary hover:text-textPrimary'}`}
            >
                <span className="text-xl">🏠</span>
                <span className="text-[10px] tracking-wide">Home</span>
            </NavLink>
            
            <NavLink 
                to="/staff-history" 
                className={({ isActive }) => `flex flex-col items-center gap-1 w-20 transition-colors ${isActive ? 'text-blue font-bold' : 'text-textSecondary hover:text-textPrimary'}`}
            >
                <span className="text-xl">📋</span>
                <span className="text-[10px] tracking-wide">History</span>
            </NavLink>
            
            <button 
                onClick={handleLogout}
                className="flex flex-col items-center gap-1 w-20 text-red hover:text-red/80 transition-colors"
            >
                <span className="text-xl">🚪</span>
                <span className="text-[10px] tracking-wide">Logout</span>
            </button>
        </nav>
    );
};

export default BottomNav;
