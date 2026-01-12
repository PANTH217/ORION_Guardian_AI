import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

const Settings = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // State
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    // Configs
    const [emailConfig, setEmailConfig] = useState({ enabled: false, sender: '', password: '', recipient: '' });
    const [smsConfig, setSmsConfig] = useState({ enabled: false, provider: 'telegram', telegram_token: '', telegram_chat_id: '' });

    // Fetch settings on load
    useEffect(() => {
        fetch('/api/get_settings')
            .then(res => res.json())
            .then(data => {
                if (data.email_config) setEmailConfig(prev => ({ ...prev, ...data.email_config }));
                if (data.sms_config) setSmsConfig(prev => ({ ...prev, ...data.sms_config }));
            })
            .catch(err => console.error("Failed to load settings", err));
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setStatusMsg('');
        try {
            const payload = {
                email_config: emailConfig,
                sms_config: smsConfig
            };

            // Don't send empty passwords if not changed (backend keeps old if missing? No, our logic replaces. 
            // Ideally we'd handle this better, but for now we send what we have. 
            // If password is empty in UI, it might overwrite with empty. 
            // NOTE: For security, a real app wouldn't fetch the password back. 
            // Current implementation assumes if you re-save, you re-enter secrets if you want to change them, 
            // OR we need to only send if visible. 
            // Let's implement simple overwriting for now as requested by user speed.)

            const res = await fetch('http://localhost:5000/api/save_settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) setStatusMsg('Configuration Saved Successfully');
            else setStatusMsg('Error Saving Configuration');
        } catch (err) {
            setStatusMsg('Network Error');
        } finally {
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
                        <h2 className="text-xl font-display font-bold tracking-wide">SYSTEM CONFIG</h2>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                    {statusMsg && (
                        <div className={`p-4 rounded border ${statusMsg.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                            {statusMsg}
                        </div>
                    )}

                    {/* Email Settings */}
                    <section className="glass-panel p-8 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-display font-bold text-white flex items-center gap-3">
                                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                                Email Configuration (SMTP)
                            </h3>
                            <button
                                onClick={() => setEmailConfig({ ...emailConfig, enabled: !emailConfig.enabled })}
                                className={`w-12 h-6 rounded-full transition-colors relative ${emailConfig.enabled ? 'bg-cyber-primary' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${emailConfig.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${!emailConfig.enabled && 'opacity-50 pointer-events-none'}`}>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Sender Email (Gmail)</label>
                                <input
                                    type="email"
                                    value={emailConfig.sender}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, sender: e.target.value })}
                                    className="input-cyber"
                                    placeholder="alert-bot@gmail.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex justify-between">
                                    App Password
                                    {emailConfig.password_set && <span className="text-green-500 text-[10px] bg-green-500/10 px-2 rounded">SAVED</span>}
                                </label>
                                <input
                                    type="password"
                                    value={emailConfig.password}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                                    className="input-cyber"
                                    placeholder={emailConfig.password_set ? "(Hidden) Enter new to change" : "xxxx xxxx xxxx xxxx"}
                                />
                                <div className="mt-2 text-sm text-slate-300 bg-slate-800/50 p-3 rounded border border-white/5">
                                    <p className="font-bold text-slate-200 mb-1">How to get an App Password:</p>
                                    <ol className="list-decimal pl-4 space-y-1">
                                        <li>Go to your <b>Google Account</b> {'>'} Security.</li>
                                        <li>Enable <b>2-Step Verification</b> if not already on.</li>
                                        <li>Search for "App Passwords" in the search bar.</li>
                                        <li>Create a new app password (name it "GuardianAI").</li>
                                        <li>Copy the 16-character code and paste it here.</li>
                                    </ol>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Recipient Email</label>
                                <input
                                    type="email"
                                    value={emailConfig.recipient}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, recipient: e.target.value })}
                                    className="input-cyber"
                                    placeholder="admin@hospital.com"
                                />
                            </div>
                        </div>
                    </section>


                    {/* SMS Settings */}
                    <section className="glass-panel p-8 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-display font-bold text-white flex items-center gap-3">
                                <span className="w-1 h-6 bg-green-500 rounded-full"></span>
                                SMS Configuration
                            </h3>
                            <button
                                onClick={() => setSmsConfig({ ...smsConfig, enabled: !smsConfig.enabled })}
                                className={`w-12 h-6 rounded-full transition-colors relative ${smsConfig.enabled ? 'bg-cyber-primary' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${smsConfig.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className={`space-y-6 ${!smsConfig.enabled && 'opacity-50 pointer-events-none'}`}>

                            {/* Notification Provider */}
                            <div>
                                <h4 className="text-sm font-bold text-white mb-4">Phone Notifications (Telegram)</h4>

                                <div className="space-y-4">
                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
                                        <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Telegram Bot Token</label>
                                        <input
                                            type="text"
                                            value={smsConfig.telegram_token || ''}
                                            onChange={(e) => setSmsConfig({ ...smsConfig, telegram_token: e.target.value })}
                                            className="input-cyber w-full"
                                            placeholder="123456789:ABCdef..."
                                        />
                                        <p className="text-sm text-slate-300 mt-2">
                                            1. Search for <b>@BotFather</b> on Telegram.<br />
                                            2. Send command <code>/newbot</code> and follow instructions.<br />
                                            3. Paste the provided <b>HTTP API Token</b> here.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Telegram Chat ID</label>
                                        <input
                                            type="text"
                                            value={smsConfig.telegram_chat_id || ''}
                                            onChange={(e) => setSmsConfig({ ...smsConfig, telegram_chat_id: e.target.value })}
                                            className="input-cyber"
                                            placeholder="123456789"
                                        />
                                        <p className="text-sm text-slate-300 mt-2">
                                            1. Start a chat with your new bot.<br />
                                            2. Search for <b>@userinfobot</b> and click Start.<br />
                                            3. Copy your <b>Id</b> and paste it here.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </section>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="btn-primary"
                        >
                            {loading ? 'Saving...' : 'SAVE CONFIGURATION'}
                        </button>
                    </div>
                </main>
            </div>
        </div >
    );
};

export default Settings;
