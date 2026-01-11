import React, { useState } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            navigate('/dashboard');
        } catch (error) {
            console.error("Error signing in with Google", error);
            alert("Failed to sign in. Check console for details.");
        }
    };

    const handleEmailSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard');
        } catch (error) {
            console.error("Error signing in with Email", error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-cyber-dark font-sans relative overflow-hidden text-slate-200">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-cyber-primary/5 blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                {/* Tech Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%),linear-gradient(90deg,rgba(255,255,255,0.01),rgba(255,255,255,0.01))] bg-[length:100%_4px,50px_100%] opacity-20"></div>
            </div>

            {/* Main Container */}
            <div className="w-full h-full flex z-10">

                {/* LEFT SIDE - Info & Branding (Enhanced) */}
                <div className="hidden xl:flex w-7/12 flex-col justify-between p-20 relative">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-primary/10 border border-cyber-primary/20 text-cyber-primary text-sm font-mono font-bold tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-cyber-primary animate-pulse"></span>
                            SYSTEM V2.0 // ONLINE
                        </div>
                        <h1 className="text-7xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-blue-400 filter drop-shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                            FALL<br />DETECTOR
                        </h1>
                        <p className="text-xl text-slate-400 max-w-xl leading-relaxed">
                            Advanced Autonomous Safety Grid.
                            <br />
                            <span className="text-slate-500 text-lg">Powered by Computer Vision & Real-time Neural Logic.</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-12">
                        <div className="glass-panel p-6 rounded-xl border border-white/5 hover:border-cyber-primary/30 transition-colors group">
                            <div className="w-12 h-12 bg-cyber-primary/10 rounded-lg flex items-center justify-center text-cyber-primary mb-4 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Visual Intelligence</h3>
                            <p className="text-lg text-slate-400">99.8% Accuracy in fall pattern recognition.</p>
                        </div>
                        <div className="glass-panel p-6 rounded-xl border border-white/5 hover:border-cyber-primary/30 transition-colors group">
                            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500 mb-4 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Instant Response</h3>
                            <p className="text-lg text-slate-400">Zero-latency alerts via Bot & Email.</p>
                        </div>
                        <div className="glass-panel p-6 rounded-xl border border-white/5 hover:border-cyber-primary/30 transition-colors group">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Secure Core</h3>
                            <p className="text-lg text-slate-400">Local processing. No cloud data leaks.</p>
                        </div>
                    </div>

                    <p className="text-xs text-slate-600 font-mono mt-8">
                        COPYRIGHT © 2026 FALL DETECTOR SYSTEMS. ALL RIGHTS RESERVED.
                    </p>
                </div>

                {/* RIGHT SIDE - Login Form */}
                <div className="w-full xl:w-5/12 bg-slate-900/50 backdrop-blur-xl border-l border-white/5 flex flex-col items-center justify-center p-8 relative">
                    <div className="w-full max-w-md space-y-8">

                        <div className="text-center xl:text-left">
                            <h2 className="text-3xl font-display font-bold text-white mb-2">Identify Yourself</h2>
                            <p className="text-slate-500">Access to Fall Detector requires authorization.</p>
                        </div>

                        <div className="glass-panel p-8 rounded-2xl border-t border-white/10 shadow-2xl">
                            <form onSubmit={handleEmailSignIn} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-cyber-primary uppercase tracking-widest ml-1">Operative ID (Email)</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyber-primary transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-700 text-white text-base rounded-lg focus:ring-2 focus:ring-cyber-primary focus:border-transparent block pl-10 p-3 placeholder-slate-600 transition-all font-mono"
                                            placeholder="admin@falldetector.ai"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-cyber-primary uppercase tracking-widest ml-1">Passcode</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyber-primary transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-700 text-white text-base rounded-lg focus:ring-2 focus:ring-cyber-primary focus:border-transparent block pl-10 p-3 placeholder-slate-600 transition-all font-mono"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-cyber-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all transform hover:-translate-y-0.5 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <span className="relative flex items-center justify-center gap-2 tracking-wider">
                                        {loading ? 'AUTHENTICATING...' : 'ESTABLISH LINK'}
                                        {!loading && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
                                    </span>
                                </button>
                            </form>

                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">Or Access Via Protocol</span></div>
                            </div>

                            <button
                                onClick={handleGoogleSignIn}
                                className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg transition-colors font-medium border border-white/10 group"
                            >
                                <svg className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" viewBox="0 0 24 24"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.027-1.133 8.133-2.907 2.147-1.787 2.813-4.427 2.813-6.507 0-.587-.04-1.28-.107-1.667H12.48z" /></svg>
                                Google Auth
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
