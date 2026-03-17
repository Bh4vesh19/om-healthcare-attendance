import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
            <div className="card w-full max-w-md p-6 text-center flex flex-col items-center sm:p-10 md:p-12">
                <Logo size="lg" className="mb-8" priority />
                
                <h1 className="mb-2 text-2xl font-bold tracking-wide text-amber sm:text-3xl">
                    OM HEALTH CARE
                </h1>
                <p className="mb-8 text-sm text-textSecondary sm:mb-10">Attendance Management & Staff Portal</p>

                <div className="flex flex-col w-full gap-5">
                    <button 
                        onClick={() => navigate('/staff-login')} 
                        className="btn btn-blue h-[60px]"
                    >
                        STAFF ACCESS PORTAL
                    </button>
                    
                    <button 
                        onClick={() => navigate('/admin-login')} 
                        className="btn btn-outline h-[60px]"
                    >
                        ADMINISTRATOR LOGIN
                    </button>
                </div>
                
                <div className="mt-16 text-textSecondary text-xs opacity-60">
                    &copy; {new Date().getFullYear()} OM Health Care. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default Landing;
