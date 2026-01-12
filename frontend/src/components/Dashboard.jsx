import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [systemLogs, setSystemLogs] = useState([]);

    // Camera & AI State
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [detectionStatus, setDetectionStatus] = useState("NORMAL");

    // Audio Refs
    const sirenOscRef = useRef(null);
    const sirenGainRef = useRef(null);
    const [isSirenActive, setIsSirenActive] = useState(false);

    // Log Scroll
    const logsEndRef = useRef(null);
    const lastAlertTimeRef = useRef(null);
    const isInitialLoad = useRef(true);

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
        stopSiren();
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const startTime = ctx.currentTime;
            const duration = 60;

            gain.gain.setValueAtTime(0.5, startTime);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, startTime);

            for (let t = 0; t < duration; t += 1) {
                osc.frequency.linearRampToValueAtTime(1200, startTime + t + 0.5);
                osc.frequency.linearRampToValueAtTime(600, startTime + t + 1.0);
            }

            osc.start(startTime);
            osc.stop(startTime + duration);

            sirenOscRef.current = osc;
            sirenGainRef.current = gain;
            setIsSirenActive(true);

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

    // --- CAMERA INIT ---
    useEffect(() => {
        if (!user) return;

        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 } }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Play is handled by autoPlay, but ensuring it starts
                    await videoRef.current.play();
                    setIsCameraActive(true);
                    addLog("Local Camera Initialized", "success");
                }
            } catch (err) {
                console.error("Camera Error:", err);
                addLog("Camera Access Denied: " + err.message, "error");
            }
        }
        startCamera();

        return () => {
            // Cleanup if needed? Usually browser handles stream stop on nav, 
            // but we could explicitly stop tracks here.
        }
    }, [user]);

    // --- FRAME PROCESSING LOOP ---
    const isProcessingRef = useRef(false);

    useEffect(() => {
        if (!isCameraActive) return;

        const interval = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current) return;
            if (isProcessingRef.current) return; // Prevent stacking requests

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // Match canvas size to video for overlay
            if (video.videoWidth > 0 && canvas.width !== video.videoWidth) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }

            // Capture Frame
            const offscreen = document.createElement('canvas');
            offscreen.width = video.videoWidth;
            offscreen.height = video.videoHeight;
            if (offscreen.width === 0) return;

            const offCtx = offscreen.getContext('2d');
            offCtx.drawImage(video, 0, 0);

            // Lock processing
            isProcessingRef.current = true;

            // Send to Backend
            offscreen.toBlob(async (blob) => {
                if (!blob) {
                    isProcessingRef.current = false;
                    return;
                }
                const formData = new FormData();
                formData.append('frame', blob);

                try {
                    const res = await fetch('http://localhost:5000/api/process_frame', {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) throw new Error("API Error");

                    const data = await res.json();

                    // Update Status
                    if (data.status) {
                        setDetectionStatus(data.status);
                        if (data.alert_active && !isSirenActive) {
                            playSiren();
                        }
                    }

                    // Draw Overlay
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Restore Status Text on Canvas
                    // Scale font based on resolution
                    const fontSize = Math.max(16, Math.floor(canvas.width / 30));
                    ctx.font = `${fontSize}px monospace`;
                    ctx.fillStyle = data.status === "FALL_DETECTED" ? "red" : "#00FF00";
                    ctx.fillText(data.status === "FALL_DETECTED" ? "WARNING: FALL DETECTED" : "AI MONITORING ACTIVE", 20, 40);

                    if (data.detections) {
                        data.detections.forEach(det => {
                            if (det.keypoints) {
                                drawSkeleton(ctx, det.keypoints);
                                drawBBox(ctx, det.keypoints, det.label === 'FALL' ? 'red' : 'green');
                            }
                        });
                    }

                } catch (e) {
                    // console.error(e);
                } finally {
                    // Unlock processing
                    isProcessingRef.current = false;
                }
            }, 'image/jpeg', 0.8);

        }, 50); // Check every 50ms, but bounded by network speed due to lock

        return () => clearInterval(interval);
    }, [isCameraActive, isSirenActive]);

    const drawSkeleton = (ctx, keypoints) => {
        const connections = [
            ['left shoulder', 'right shoulder'],
            ['left shoulder', 'left hip'],
            ['right shoulder', 'right hip'],
            ['left hip', 'right hip']
        ];

        ctx.lineWidth = 3;
        ctx.strokeStyle = "#00FF00";

        // Points
        for (const [name, coord] of Object.entries(keypoints)) {
            const x = coord[0];
            const y = coord[1];
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "#00FF00";
            ctx.fill();
        }

        // Lines
        connections.forEach(([start, end]) => {
            if (keypoints[start] && keypoints[end]) {
                ctx.beginPath();
                ctx.moveTo(keypoints[start][0], keypoints[start][1]);
                ctx.lineTo(keypoints[end][0], keypoints[end][1]);
                ctx.stroke();
            }
        });
    };

    const drawBBox = (ctx, keypoints, color) => {
        const xs = Object.values(keypoints).map(p => p[0]);
        const ys = Object.values(keypoints).map(p => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(minX - 10, minY - 10, (maxX - minX) + 20, (maxY - minY) + 20);
    };

    // System Log Polling (Reduced, mostly for backend events)
    useEffect(() => {
        if (!user) return;
        const fetchLogs = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/system_logs');
                const data = await res.json();
                if (Array.isArray(data)) setSystemLogs(data);
            } catch (e) { }
        };
        fetchLogs();
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
                <header className="h-20 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <h2 className="text-2xl font-display font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-blue-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                            GUARDIAN AI <span className="text-xs text-slate-500 font-mono tracking-widest ml-2">V2.0</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-bold text-green-500 uppercase">System Armed</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-display text-white flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${detectionStatus === 'FALL_DETECTED' ? 'bg-red-400' : 'bg-green-400'}`}></span>
                                        <span className={`relative inline-flex rounded-full h-3 w-3 ${detectionStatus === 'FALL_DETECTED' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                    </span>
                                    <span className={`${detectionStatus === 'FALL_DETECTED' ? 'text-red-500' : 'text-green-500'} font-bold tracking-widest`}>
                                        {detectionStatus === 'FALL_DETECTED' ? 'FALL DETECTED' : 'LIVE MONITORING'}
                                    </span>
                                    <span className="text-slate-500 text-sm font-mono ml-2">CAM-01 (LOCAL)</span>
                                </h3>
                                <div className="flex gap-2">
                                    <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-400 font-mono">1920x1080</span>
                                    <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-400 font-mono">30 FPS</span>
                                </div>
                            </div>
                            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video group shadow-2xl">
                                <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>

                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="absolute inset-0 w-full h-full object-contain"
                                    onLoadedMetadata={() => setIsVideoLoaded(true)}
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
                                />

                                {!isVideoLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                                        <div className="bg-slate-900/80 px-4 py-2 rounded border border-slate-700 text-slate-400 text-sm font-mono animate-pulse">
                                            ACCESSING CAMERA...
                                        </div>
                                    </div>
                                )}

                                <div className="absolute inset-0 z-20 pointer-events-none border-[30px] border-transparent">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyber-primary/50"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyber-primary/50"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyber-primary/50"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyber-primary/50"></div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="glass-panel p-6 rounded-xl relative overflow-hidden">
                                <h3 className="text-base font-bold text-slate-400 uppercase tracking-widest mb-4">Subject Status</h3>
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`text-3xl font-display font-bold ${detectionStatus === 'FALL_DETECTED' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                        {detectionStatus}
                                    </span>
                                    {isSirenActive ? (
                                        <button onClick={stopSiren} className="text-sm bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.7)]">
                                            STOP ALARM
                                        </button>
                                    ) : (
                                        <button onClick={playSiren} className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-1 rounded border border-red-500/30 transition-colors">
                                            TEST ALARM
                                        </button>
                                    )}
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                                    <div className={`h-full w-[98%] shadow-[0_0_15px_#3b82f6] ${detectionStatus === 'FALL_DETECTED' ? 'bg-red-500' : 'bg-gradient-to-r from-cyber-primary to-blue-500'}`}></div>
                                </div>
                                <div className="flex justify-between text-xs font-mono">
                                    <span className="text-slate-500">SYSTEM INTEGRITY</span>
                                    <span className="text-cyber-primary">OPTIMAL (98%)</span>
                                </div>
                            </div>

                            <div className="glass-panel p-6 rounded-xl h-64 flex flex-col">
                                <h3 className="text-base font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">System Log</h3>
                                <div className="flex-1 overflow-y-auto space-y-2 font-mono text-sm text-slate-500">
                                    {systemLogs.length === 0 ? (
                                        <p className="opacity-50 italic">Listening for events...</p>
                                    ) : (
                                        systemLogs.map((log, index) => (
                                            <p key={index} className="flex gap-2">
                                                <span className={log.type === 'error' ? 'text-red-500' : log.type === 'alert' ? 'text-yellow-500' : 'text-cyber-primary'}> {log.time} </span>
                                                <span className={log.type === 'error' ? 'text-red-400' : log.type === 'alert' ? 'text-white font-bold' : ''}> {log.message} </span>
                                            </p>
                                        ))
                                    )}
                                    <div ref={logsEndRef} />
                                </div>
                            </div>
                            <button onClick={() => navigate('/guide')} className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl flex items-center justify-center gap-2 transition-colors group">
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
