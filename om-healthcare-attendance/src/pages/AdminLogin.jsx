import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { loginAdmin } from '../firebase/auth';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!password.trim()) {
            setError("Please enter your password.");
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            await loginAdmin(password);
            setTimeout(() => {
                 navigate('/admin-dashboard');
            }, 800);
        } catch (err) {
            console.error('Login error:', err);
            setError("Incorrect password. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
            <div className="card w-full max-w-[420px] p-6 flex flex-col items-center gap-5 sm:p-8 md:p-10">
                <Logo size="md" priority />
                
                <div className="text-center w-full mb-2">
                    <h1 className="text-3xl font-bold text-amber">Admin Portal</h1>
                    <p className="text-textSecondary mt-1 text-sm">Secure Access Required</p>
                </div>

                <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                    <div className="relative w-full">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Administrator Password"
                            className="input-field pr-12"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                        <button
                            type="button"
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-textSecondary hover:text-textPrimary bg-transparent border-none cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                        >
                            {showPassword ? '👁️' : '🙈'}
                        </button>
                    </div>

                    {error && <div className="text-red text-sm text-center animate-fade-in bg-red/10 p-2 rounded-lg border border-red/20">{error}</div>}

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="btn btn-gold h-[52px] mt-2 relative overflow-hidden"
                    >
                        {loading ? 'VERIFYING...' : 'AUTHORIZE'}
                    </button>
                </form>
                
                <button onClick={() => navigate('/')} className="text-textSecondary hover:text-textPrimary text-sm mt-4 transition-colors">
                    &larr; Back to Portal
                </button>
            </div>
        </div>
    );
};

export default AdminLogin;
