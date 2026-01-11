import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';

const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { path: '/dashboard', label: 'Overview', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
        { path: '/history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        { path: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
        { path: '/guide', label: 'Help & Guide', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ];

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate('/');
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                ></div>
            )}

            {/* Sidebar Content */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50 w-64 
                bg-slate-900/95 backdrop-blur-xl border-r border-white/10
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="h-full flex flex-col">
                    {/* Logo Area */}
                    <div className="p-6 border-b border-white/10">
                        <h1 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-blue-500 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                            🛡️ GUARDIAN AI
                        </h1>
                        <p className="text-xs text-slate-500 font-mono mt-1 tracking-widest text-right">VERSION 2.0</p>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 px-4 font-mono">Main Menu</div>
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        if (window.innerWidth < 768) onClose();
                                    }}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200
                                        ${isActive
                                            ? 'bg-cyber-primary/10 text-cyber-primary border-r-2 border-cyber-primary'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'}
                                    `}
                                >
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                                    </svg>
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* User Profile / Logout */}
                    <div className="p-4 border-t border-white/10">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyber-primary to-blue-500 flex items-center justify-center font-bold text-white shadow-lg uppercase">
                                    {auth.currentUser?.email?.charAt(0) || 'U'}
                                </div>
                                <div className="overflow-hidden">
                                    <div className="text-base font-medium text-white truncate" title={auth.currentUser?.email}>
                                        {auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Unknown User'}
                                    </div>
                                    <div className="text-sm text-green-400 flex items-center gap-1 font-mono">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                        CONNECTED
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full py-2 text-sm font-bold font-mono tracking-wide text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20 hover:border-red-500/40"
                            >
                                DISCONNECT
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
