import React, { useState } from 'react';
import Sidebar from './Sidebar';

const Guide = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-cyber-dark font-sans text-slate-200 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full md:w-auto">
                <header className="h-20 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <h2 className="text-xl font-display font-bold tracking-wide">SYSTEM KNOWLEDGE BASE</h2>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">

                    {/* Welcome Card */}
                    <section className="glass-panel p-8 rounded-xl border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <svg className="w-64 h-64 text-cyber-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
                        </div>
                        <h3 className="text-2xl font-display font-bold text-white mb-4">Welcome to Intelligent Fall Detection</h3>
                        <p className="text-slate-400 leading-relaxed max-w-3xl">
                            This system uses advanced computer vision to monitor video feeds in real-time.
                            It is designed to detect falls instantly and alert caregivers via Telegram or Email.
                            Created by <b>Panth Haveliwala</b>.
                        </p>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* How it Works */}
                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-cyber-primary uppercase tracking-widest border-b border-white/10 pb-2">How It Works</h3>
                            <div className="bg-slate-800/50 p-6 rounded-lg border border-white/5 hover:border-cyber-primary/30 transition-colors">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-cyber-primary/20 text-cyber-primary flex items-center justify-center text-xs">1</span>
                                    Vision Analysis
                                </h4>
                                <p className="text-sm text-slate-400">The AI tracks human body keypoints (shoulders, hips, knees) 30 times per second using PoseNet technology.</p>
                            </div>
                            <div className="bg-slate-800/50 p-6 rounded-lg border border-white/5 hover:border-cyber-primary/30 transition-colors">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-cyber-primary/20 text-cyber-primary flex items-center justify-center text-xs">2</span>
                                    Fall Logic
                                </h4>
                                <p className="text-sm text-slate-400">It calculates the speed and angle of movement. If a rapid vertical descent is followed by inactivity, a FALL is flagged.</p>
                            </div>
                            <div className="bg-slate-800/50 p-6 rounded-lg border border-white/5 hover:border-cyber-primary/30 transition-colors">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-cyber-primary/20 text-cyber-primary flex items-center justify-center text-xs">3</span>
                                    Instant Alert
                                </h4>
                                <p className="text-sm text-slate-400">The system captures a snapshot and sends it to your Telegram immediately.</p>
                            </div>
                        </section>

                        {/* Setup Guide */}
                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-green-500 uppercase tracking-widest border-b border-white/10 pb-2">Setup Guide</h3>
                            <div className="glass-panel p-6 rounded-lg border border-dashed border-white/20">
                                <h4 className="font-bold text-white mb-4">Telegram Bot Setup</h4>
                                <ol className="space-y-3 text-sm text-slate-400 list-decimal list-inside font-mono">
                                    <li>Open Telegram and find <b>@BotFather</b></li>
                                    <li>Send command <span className="text-cyber-primary">/newbot</span></li>
                                    <li>Copy the <b>API Token</b></li>
                                    <li>Find <b>@userinfobot</b> to get your <b>Chat ID</b></li>
                                    <li>Enter both in the <b>Settings</b> page</li>
                                    <li className="text-green-400">Important: Click START on your new bot!</li>
                                </ol>
                            </div>

                            <div className="glass-panel p-6 rounded-lg">
                                <h4 className="font-bold text-white mb-2">Camera Placement Tips</h4>
                                <ul className="space-y-2 text-sm text-slate-400">
                                    <li className="flex gap-2">✅ <b>Height:</b> Place camera at eye-level (4-6ft).</li>
                                    <li className="flex gap-2">✅ <b>Light:</b> Ensure the room is well-lit.</li>
                                    <li className="flex gap-2">✅ <b>View:</b> Capture the full floor area where falls might happen.</li>
                                </ul>
                            </div>
                        </section>
                    </div>

                    {/* FAQ / Troubleshooting */}
                    <section className="glass-panel p-8 rounded-xl border border-white/5">
                        <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest">Troubleshooting FAQ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h5 className="font-bold text-cyber-primary mb-2">Why am I not getting alerts?</h5>
                                <p className="text-sm text-slate-400 mb-4">
                                    1. Check if you clicked "Start" on your Telegram bot.<br />
                                    2. Verify Token and Chat ID in Settings.<br />
                                    3. Ensure "Phone Notifications" is enabled.
                                </p>
                            </div>
                            <div>
                                <h5 className="font-bold text-cyber-primary mb-2">The video is lagging.</h5>
                                <p className="text-sm text-slate-400 mb-4">
                                    Computer vision is heavy. Ensure your PC is plugged in and set to "High Performance" mode. Close other heavy apps.
                                </p>
                            </div>
                            <div>
                                <h5 className="font-bold text-cyber-primary mb-2">False Alarms?</h5>
                                <p className="text-sm text-slate-400 mb-4">
                                    If the system detects someone tying shoes as a fall, try moving the camera to see the full body more clearly.
                                </p>
                            </div>
                            <div>
                                <h5 className="font-bold text-cyber-primary mb-2">Is my data safe?</h5>
                                <p className="text-sm text-slate-400 mb-4">
                                    Yes. All video processing happens LOCALLY on this computer. No video is sent to the internet unless a fall is detected (snapshot only).
                                </p>
                            </div>
                        </div>
                    </section>

                </main>
            </div>
        </div>
    );
};

export default Guide;
