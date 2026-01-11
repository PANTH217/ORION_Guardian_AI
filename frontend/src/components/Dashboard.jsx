import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [fcmDebug, setFcmDebug] = useState('Initializing...');
    const [systemLogs, setSystemLogs] = useState([]);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const logsEndRef = React.useRef(null);
    const lastAlertTimeRef = React.useRef(null);

    const sirenOscRef = React.useRef(null);
    const sirenGainRef = React.useRef(null);
    const [isSirenActive, setIsSirenActive] = useState(false);

    const stopSiren = async () => {
        try {
            if (sirenOscRef.current) {
                sirenOscRef.current.stop();
                sirenOscRef.current.disconnect();
                sirenOscRef.current = null;
            }
            if (sirenGainRef.current) {
                sirenGainRef.current.disconnect();
                sirenGainRef.current = null;
            }
            setIsSirenActive(false);

            // Notify Backend to reset state
            await fetch('/api/reset_alert', { method: 'POST' });
            addLog("Alarm Manually Reset", "info");

        } catch (e) {
            console.error("Failed to stop siren:", e);
        }
    };

    const playSiren = () => {
        // Stop any existing siren first
        stopSiren();

        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            // Siren Parameters
            const startTime = ctx.currentTime;
            const duration = 60; // 1 minute

            // Volume Setup
            gain.gain.setValueAtTime(0.5, startTime);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);

            // Frequency Modulation (Emergency Whoop)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, startTime);

            // Create a modulation loop for 1 minute
            for (let t = 0; t < duration; t += 1) { // 1 second cycles
                // High Pitch
                osc.frequency.linearRampToValueAtTime(1200, startTime + t + 0.5);
                // Low Pitch
                osc.frequency.linearRampToValueAtTime(600, startTime + t + 1.0);
            }

            osc.start(startTime);
            osc.stop(startTime + duration);

            // Store refs to stop later
            sirenOscRef.current = osc;
            sirenGainRef.current = gain;
            setIsSirenActive(true);

            // Auto-reset state after duration
            osc.onended = () => setIsSirenActive(false);

        } catch (e) {
            console.error("Audio playback failed", e);
        }
    };

    const addLog = (message, type = 'info') => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
        setSystemLogs(prev => [...prev.slice(-50), { time: timeStr, message, type }]);
    };

    // Auto-scroll to bottom of logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [systemLogs]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) navigate('/');
            else setUser(currentUser);
        });
        return () => unsubscribe();
    }, [navigate]);

    // Setup Geolocation and FCM (Simplified for rebuild)
    useEffect(() => {
        if (!user) return;

        // Initial System Checks
        addLog("Initializing Dashboard...", "info");

        const checkBackend = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/status');
                if (res.ok) addLog("Backend Connection: ESTABLISHED", "success");
                else addLog("Backend Connection: FAILED", "error");
            } catch (e) {
                addLog("Backend Unreachable", "error");
            }
        };
        checkBackend();

        const setupFCM = async () => {
            // Mock FCM setup for UI demo
            setFcmDebug('Active');
            addLog("Notification Service: READY", "info");
        };
        setupFCM();

        // Check for recent fall history
        const fetchHistory = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/history');
                const data = await res.json();
                if (data && data.length > 0) {
                    const lastEvent = data[data.length - 1];
                    addLog(`History: Last Event ${lastEvent.type} at ${lastEvent.timestamp}`, "info"); // Changed to info to avoid startup siren
                }
            } catch (e) { }
        };
        fetchHistory();

        // Periodic Health Check
        const interval = setInterval(() => {
            // In a real app we might poll for new events here
        }, 30000);

        return () => clearInterval(interval);
    }, [user]);

    const isInitialLoad = React.useRef(true);

    // Poll for System Logs
    useEffect(() => {
        if (!user) return;

        const fetchLogs = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/system_logs');
                const data = await res.json();
                if (Array.isArray(data)) {
                    // We just replace the logs with the latest buffer from backend
                    // Reverse it if needed, or backend keeps order. Backend appends io end, so latest is last.
                    // But we want to show it as a stream.
                    setSystemLogs(data);

                    // Check for new high-priority alerts to trigger sound
                    if (data.length > 0) {
                        // Find the most recent alert in the batch
                        const latestAlert = [...data].reverse().find(l =>
                            // Only trigger on explicit FALL alerts, not just any error
                            (l.type === 'alert' && l.message.includes('FALL')) ||
                            l.message.includes('FALL DETECTED') ||
                            l.message.includes('Fall detected')
                        );

                        // Only trigger if it's NOT the first load (avoid blast from past)
                        // AND it's a new alert we haven't seen 
                        if (!isInitialLoad.current && latestAlert && latestAlert.time !== lastAlertTimeRef.current) {

                            // Check uniqueness by time
                            lastAlertTimeRef.current = latestAlert.time;
                            console.log("Triggering Siren for:", latestAlert.message);
                            playSiren();
                        }

                        // If it IS the first load, just mark this point so we don't trigger on it later
                        if (isInitialLoad.current && latestAlert) {
                            lastAlertTimeRef.current = latestAlert.time;
                        }
                    }
                    isInitialLoad.current = false;
                }
            } catch (e) {
                // Silent fail on polling
            }
        };

        // Initial fetch
        fetchLogs();

        // Periodic Poll (every 2 seconds)
        const interval = setInterval(fetchLogs, 2000);

        return () => clearInterval(interval);
    }, [user]);

    if (!user) return (
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-cyber-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="flex h-screen bg-cyber-dark font-sans text-slate-200 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full md:w-auto">
                {/* Header */}
                <header className="h-20 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <h2 className="text-xl font-display font-bold tracking-wide">DASHBOARD</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-bold text-green-500 uppercase">System Armed</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    {/* Video Feed */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-display text-white flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                    LIVE FEED: CAM-01
                                </h3>
                            </div>
                            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video group shadow-2xl">
                                {/* Scanline Overlay */}
                                <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>

                                <img
                                    src="/video_feed"
                                    alt="Live surveillance feed"
                                    className={`w-full h-full object-contain ${isVideoLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
                                    onLoad={() => setIsVideoLoaded(true)}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        setIsVideoLoaded(false);
                                    }}
                                />
                                {!isVideoLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-slate-900/80 px-4 py-2 rounded border border-slate-700 text-slate-400 text-sm font-mono animate-pulse">
                                            ESTABLISHING FEED...
                                        </div>
                                    </div>
                                )}

                                {/* HUD */}
                                <div className="absolute inset-0 z-20 pointer-events-none border-[30px] border-transparent">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyber-primary/50"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyber-primary/50"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyber-primary/50"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyber-primary/50"></div>
                                </div>
                            </div>
                        </div>

                        {/* Status Panel */}
                        <div className="space-y-6">
                            <div className="glass-panel p-6 rounded-xl relative overflow-hidden">
                                <h3 className="text-base font-bold text-slate-400 uppercase tracking-widest mb-4">Subject Status</h3>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-3xl font-display font-bold text-white">NORMAL</span>

                                    {isSirenActive ? (
                                        <button
                                            onClick={stopSiren}
                                            className="text-sm bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.7)]"
                                        >
                                            STOP ALARM
                                        </button>
                                    ) : (
                                        <button
                                            onClick={playSiren}
                                            className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-1 rounded border border-red-500/30 transition-colors"
                                        >
                                            TEST ALARM
                                        </button>
                                    )}
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-cyber-primary h-full w-[98%] shadow-[0_0_10px_#06b6d4]"></div>
                                </div>
                                <p className="text-sm text-right text-cyber-primary mt-1 font-mono">CONFIDENCE: 98%</p>
                            </div>

                            <div className="glass-panel p-6 rounded-xl h-64 flex flex-col">
                                <h3 className="text-base font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">System Log</h3>
                                <div className="flex-1 overflow-y-auto space-y-2 font-mono text-sm text-slate-500">
                                    {systemLogs.length === 0 ? (
                                        <p className="opacity-50 italic">Initializing stream...</p>
                                    ) : (
                                        systemLogs.map((log, index) => (
                                            <p key={index} className="flex gap-2">
                                                <span className={log.type === 'error' ? 'text-red-500' : log.type === 'alert' ? 'text-yellow-500' : 'text-cyber-primary'}>
                                                    {log.time}
                                                </span>
                                                <span className={log.type === 'error' ? 'text-red-400' : log.type === 'alert' ? 'text-white font-bold' : ''}>
                                                    {log.message}
                                                </span>
                                            </p>
                                        ))
                                    )}
                                    <div ref={logsEndRef} />
                                </div>
                            </div>

                            {/* Help Shortcut */}
                            <button
                                onClick={() => navigate('/guide')}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl flex items-center justify-center gap-2 transition-colors group"
                            >
                                <svg className="w-5 h-5 text-slate-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="text-sm font-bold text-slate-400 group-hover:text-white">SYSTEM KNOWLEDGE BASE</span>
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
