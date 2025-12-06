import React, { useState, useEffect } from 'react';
import { 
  Music, CheckCircle2, AlertCircle, Loader2,
  Key, ShieldCheck, Laptop, Info, Globe, Mail, Youtube,
  Zap, Users, Monitor, ChevronDown, Check, Lock
} from 'lucide-react';

// --- LICENSE CONFIGURATION ---
const LICENSE_API_URL = "https://script.google.com/macros/s/AKfycbzu9YX6ml-xZxuEadUvtXk9H479xA3fJTj1inzhFeWGPeaSbg2YxkjvaHteu2mfIUZgSg/exec";

// --- HELPER FUNCTIONS ---
const getDeviceId = () => {
    let id = localStorage.getItem('beatboy_device_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('beatboy_device_id', id);
    }
    return id;
};

interface ActivationProps {
    onSuccess: () => void;
    initialError?: string | null;
}

const LandingScreen: React.FC<ActivationProps> = ({ onSuccess, initialError }) => {
    const [serial, setSerial] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError || null);
    const [tab, setTab] = useState<'activate' | 'about' | 'pricing' | 'contact'>('activate');
    
    // Feature State
    const [onlineUsers, setOnlineUsers] = useState(1243);
    const [systemReady, setSystemReady] = useState<boolean | null>(null);
    const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD');

    // Update error if prop changes
    useEffect(() => {
        if (initialError) setError(initialError);
    }, [initialError]);

    // Initial System Check & User Counter Simulation
    useEffect(() => {
        // System Check
        const check = !!(window.AudioContext || (window as any).webkitAudioContext) && !!window.MediaRecorder;
        setSystemReady(check);

        // Simulated User Counter
        const baseUsers = 800 + Math.floor(Math.random() * 500);
        setOnlineUsers(baseUsers);

        const interval = setInterval(() => {
            // Fluctuate count slightly
            setOnlineUsers(prev => prev + Math.floor(Math.random() * 5) - 2);
        }, 60000 * 60);

        return () => clearInterval(interval);
    }, []);

    // Format Serial as XXX-XXX-XXX
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (val.length > 9) val = val.slice(0, 9);
        
        let formatted = val;
        if (val.length > 6) formatted = `${val.slice(0,3)}-${val.slice(3,6)}-${val.slice(6)}`;
        else if (val.length > 3) formatted = `${val.slice(0,3)}-${val.slice(3)}`;
        
        setSerial(formatted);
        setError(null);
    };

    const activate = async () => {
        if (serial.length !== 11) {
            setError('Invalid serial format (XXX-XXX-XXX)');
            return;
        }

        setLoading(true);
        const deviceId = getDeviceId();
        
        try {
            const res = await fetch(`${LICENSE_API_URL}?action=activate&serial=${serial}&pc_id=${deviceId}&user=User`, {
                method: 'GET',
            });
            const data = await res.json();
            
            if (data.ok && data.activated) {
                localStorage.setItem('beatboy_serial', serial);
                localStorage.setItem('beatboy_activation_date', new Date().toLocaleDateString());
                onSuccess();
            } else {
                if (data.error === 'device_limit_reached') setError(`Device limit reached (${data.limit} devices max).`);
                else if (data.error === 'not_found') setError('Serial number not found.');
                else setError('Activation failed. Please contact support.');
            }
        } catch (err) {
            setError('Connection error. Please check internet.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-[#09090b] text-white flex flex-col font-sans overflow-y-auto custom-scrollbar">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-black to-black opacity-50 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-20" />
            
            {/* Header / Nav */}
            <header className="relative z-10 container mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3 select-none cursor-pointer" onClick={() => setTab('activate')}>
                    <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-900/50">
                        <Music size={24} className="text-white" />
                    </div>
                    <span className="text-2xl font-black tracking-tighter">BEATBOY</span>
                </div>
                
                <div className="flex items-center gap-4">
                    <nav className="flex items-center gap-1 bg-zinc-900/80 p-1.5 rounded-full border border-zinc-800 backdrop-blur-md">
                        {[
                            { id: 'activate', label: 'Activate' },
                            { id: 'about', label: 'About' },
                            { id: 'pricing', label: 'Pricing' },
                            { id: 'contact', label: 'Contact' }
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => setTab(item.id as any)}
                                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${tab === item.id ? 'bg-zinc-100 text-black shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Language/Currency Toggle */}
                    <button 
                        onClick={() => setCurrency(c => c === 'USD' ? 'EUR' : 'USD')}
                        className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                        title="Toggle Currency"
                    >
                        <Globe size={12} />
                        {currency}
                        <ChevronDown size={10} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 min-h-[600px]">
                
                {/* ACTIVATE TAB */}
                {tab === 'activate' && (
                    <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
                        
                        {/* Status Badges */}
                        <div className="flex justify-center gap-3 mb-8">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-full text-[10px] font-bold text-emerald-400 shadow-lg shadow-emerald-900/10">
                                <Users size={12} />
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                {onlineUsers.toLocaleString()} PRODUCERS ONLINE
                            </div>
                            {systemReady && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-full text-[10px] font-bold text-zinc-400">
                                    <Check size={12} className="text-zinc-500" />
                                    SYSTEM READY
                                </div>
                            )}
                        </div>

                        <div className="text-center mb-10">
                            {systemReady && (
                                <div className="inline-block mb-4 px-3 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-widest rounded border border-green-500/20">
                                    ✅ Your System is Ready for Beatboy
                                </div>
                            )}
                            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
                                UNLOCK YOUR<br/>WORKSTATION
                            </h1>
                            <p className="text-zinc-400 text-lg">Enter your serial key to begin.</p>
                        </div>

                        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            
                            <div className="space-y-6 relative z-10">
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2 mb-2 block">Serial Key</label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                        <input 
                                            type="text" 
                                            value={serial}
                                            onChange={handleInput}
                                            placeholder="XXX-XXX-XXX"
                                            className="w-full bg-black border border-zinc-700 text-white font-mono text-center text-xl py-4 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 tracking-widest placeholder-zinc-800 transition-all"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-3 text-red-400 bg-red-950/30 border border-red-900/50 p-4 rounded-xl text-xs font-bold justify-center animate-in zoom-in-95">
                                        <AlertCircle size={16} /> <span>{error}</span>
                                    </div>
                                )}

                                <button 
                                    onClick={activate}
                                    disabled={loading || serial.length < 11}
                                    className="w-full bg-white hover:bg-zinc-200 text-black font-black py-4 rounded-xl shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-3 text-sm tracking-wide"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18}/> : <ShieldCheck size={18} />}
                                    {loading ? 'VALIDATING...' : 'ACTIVATE LICENSE'}
                                </button>
                            </div>
                        </div>
                        <div className="mt-8 text-center">
                            <p className="text-zinc-600 text-[10px] uppercase tracking-widest">
                                <Laptop size={12} className="inline mr-2 mb-0.5" />
                                Device ID: {getDeviceId().slice(0,8)}
                            </p>
                        </div>
                    </div>
                )}

                {/* ABOUT TAB */}
                {tab === 'about' && (
                    <div className="max-w-4xl w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-black mb-4">THE MODERN AUDIO SUITE</h2>
                            <div className="space-y-4 max-w-2xl mx-auto text-zinc-400 leading-relaxed">
                                <p>
                                    Beatboy is the ultimate browser-based audio workstation designed specifically for beatmakers and content creators. 
                                    We've stripped away the bloat of traditional DAWs to focus purely on what matters: finishing and packaging your beats.
                                </p>
                                <p>
                                    With a powerful audio engine running entirely on your device, you get zero-latency EQ, professional limiting, and instant visual feedback. 
                                    Whether you're batch processing an entire folder of beats for sale or creating viral visualizers for social media, Beatboy streamlines your workflow so you can focus on creating.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* PRICING TAB */}
                {tab === 'pricing' && (
                    <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center relative overflow-hidden mb-8 shadow-2xl">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-red-900" />
                            <div className="absolute top-4 right-4 animate-pulse">
                                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded shadow-lg shadow-red-900/50">
                                    -60% OFF
                                </span>
                            </div>
                            
                            <div className="inline-block bg-zinc-800/50 border border-zinc-700/50 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-8">
                                Early Adopter License
                            </div>
                            
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <span className="text-xl text-zinc-600 line-through font-bold">
                                    {currency === 'USD' ? '$49.99' : '€45.99'}
                                </span>
                                <h2 className="text-6xl font-black text-white tracking-tighter">
                                    {currency === 'USD' ? '$19.99' : '€18.99'}
                                </h2>
                            </div>
                            
                            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-8">
                                One-time payment • Lifetime updates
                            </p>
                            
                            <div className="bg-zinc-950/50 rounded-xl p-6 border border-zinc-800/50 mb-8">
                                <ul className="text-left space-y-3">
                                    {[
                                        "Unlimited Audio Exports (WAV/MP3)",
                                        "4K Video Rendering (No Watermark)",
                                        "Bulk Tagging & Processing Tools",
                                        "All Premium Visualizers Included",
                                        "Commercial Usage Rights"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                                            <div className="p-0.5 bg-green-500/20 rounded-full">
                                                <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <a 
                                href="https://phonicore.com/products/beatboy-workstation?variant=62771639615857"
                                target="_blank"
                                rel="noreferrer"
                                className="w-full bg-white hover:bg-zinc-200 text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Zap size={18} className="fill-black" />
                                GET INSTANT ACCESS
                            </a>
                            
                            <p className="text-[10px] text-zinc-600 mt-4 flex items-center justify-center gap-1">
                                <Lock size={10} /> Secure SSL encryption via Phonicore
                            </p>
                        </div>

                        {/* TRUST BADGES */}
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { icon: Lock, label: 'Secure Payment' },
                                { icon: Zap, label: 'Instant Delivery' },
                                { icon: ShieldCheck, label: 'Virus Free' },
                                { icon: Monitor, label: 'Chrome/Safari' }
                            ].map((badge, i) => (
                                <div key={i} className="flex flex-col items-center justify-center p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl text-center">
                                    <badge.icon size={20} className="text-zinc-500 mb-2" />
                                    <span className="text-[9px] font-bold text-zinc-400 leading-tight">{badge.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CONTACT TAB */}
                {tab === 'contact' && (
                    <div className="max-w-4xl w-full animate-in fade-in slide-in-from-bottom-8 duration-500 text-center">
                        <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-3xl">
                            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Info size={32} className="text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Get in Touch</h2>
                            <p className="text-zinc-400 mb-8">Beatboy is a product of Phonicore. We are dedicated to building the best tools for producers.</p>
                            
                            <div className="flex flex-col md:flex-row gap-4 justify-center">
                                <a href="https://phonicore.com" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-xl font-bold transition-all group">
                                    <span>Visit Phonicore.com</span>
                                    <Globe size={14} className="group-hover:translate-x-1 transition-transform" />
                                </a>
                                <a href="mailto:cookupking18@gmail.com" className="flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white px-6 py-4 rounded-xl font-bold transition-all">
                                    <Mail size={14} /> Contact Support
                                </a>
                                <a href="https://www.youtube.com/@Phonicore" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20">
                                    <Youtube size={14} /> Phonicore TV
                                </a>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* Footer */}
            <footer className="relative z-10 py-6 text-center text-[10px] text-zinc-600 uppercase tracking-widest">
                &copy; {new Date().getFullYear()} Phonicore. All rights reserved.
            </footer>
        </div>
    );
};

export default LandingScreen;