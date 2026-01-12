import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

const History = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        // Poll every 5 seconds for updates
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/history');
            const data = await res.json();

            if (Array.isArray(data)) {
                setHistoryData(data);
            } else {
                console.error("API returned non-array:", data);
                setHistoryData([]);
            }
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch history:", error);
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-cyber-dark font-sans text-slate-200 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full md:w-auto">
                <header className="h-20 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <h2 className="text-xl font-display font-bold tracking-wide">EVENT LOGS</h2>
                        <button
                            onClick={async () => {
                                if (confirm("Are you sure you want to delete ALL history logs? This cannot be undone.")) {
                                    try {
                                        await fetch('http://localhost:5000/api/history', { method: 'DELETE' });
                                        fetchData();
                                    } catch (e) {
                                        console.error(e);
                                        alert("Failed to delete history");
                                    }
                                }
                            }}
                            className="bg-red-500/20 hover:bg-red-500/40 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                        >
                            DELETE ALL HISTORY
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-900/50 text-xs uppercase font-mono tracking-widest text-slate-500 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Event Type</th>
                                    <th className="px-6 py-4 text-center">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading && (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8">Loading events...</td>
                                    </tr>
                                )}
                                {!loading && historyData.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-slate-600">No events recorded.</td>
                                    </tr>
                                )}
                                {historyData.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`
                                                px-3 py-1 rounded text-xs font-bold border
                                                ${item.status === 'CONFIRMED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''}
                                                ${item.status === 'CLEARED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}
                                                ${item.status === 'FALSE_ALARM' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : ''}
                                            `}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono">
                                            <div className="text-white">{item.timestamp?.split(' ')[0]}</div>
                                            <div className="text-xs text-slate-500">{item.timestamp?.split(' ')[1]}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white">{item.type}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="font-mono font-bold text-green-400">
                                                    {item.confidence}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default History;
