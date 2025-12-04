import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Upload, Play, Pause, Music, Tag, Image as ImageIcon, 
  Download, Video, CheckCircle2, X, 
  Film, Mic2, Layers, Archive, Activity, AlertCircle, Loader2,
  HelpCircle, Keyboard, Settings2, Sparkles, Type, Aperture, Palette, Video as VideoIcon,
  Move, Eye, EyeOff, MousePointer2, RefreshCw, Maximize2, Minimize2, Grid, Magnet, Briefcase,
  Calculator, FileText, Clock, ListChecks, DollarSign, Calendar, Hash, Radio, Mic, Music2, PenTool, Speaker, Copy,
  ScrollText, Receipt, Menu, Youtube, FileSignature, Lock, Key, ShieldCheck, Laptop, Info
} from 'lucide-react';
import Knob from './components/Knob';
import Waveform from './components/Waveform';
import { AudioFile, EQSettings, TagSettings, VideoSettings, BulkExportState, ColorGradeType, VisualizerType, VideoOverlay, Theme } from './types';
import { decodeAudio, renderProcessedAudio, bufferToWav, generateZip, createLimiter } from './utils/audioUtils';

// --- LICENSE CONFIGURATION ---
const LICENSE_API_URL = "https://script.google.com/macros/s/AKfycbzu9YX6ml-xZxuEadUvtXk9H479xA3fJTj1inzhFeWGPeaSbg2YxkjvaHteu2mfIUZgSg/exec";

// --- Global Constants ---
const DEFAULT_EQ: EQSettings = { low: 0, lowMid: 0, mid: 0, highMid: 0, high: 0 };
const MAX_EQ_DB = 12;

// --- THEMES ---
const THEMES: Theme[] = [
    { id: 'steel', name: 'Steel Mono', colors: { accent: '#71717a', accentDim: 'rgba(113, 113, 122, 0.2)', bgMain: '#09090b', bgPanel: '#18181b', textMain: '#fafafa', textDim: '#a1a1aa', border: 'rgba(255,255,255,0.15)' } },
    { id: 'red', name: 'Studio Red', colors: { accent: '#dc2626', accentDim: 'rgba(220, 38, 38, 0.1)', bgMain: '#09090b', bgPanel: '#0c0c0e', textMain: '#e4e4e7', textDim: '#a1a1aa', border: 'rgba(255,255,255,0.1)' } },
    { id: 'blue', name: 'Midnight Blue', colors: { accent: '#2563eb', accentDim: 'rgba(37, 99, 235, 0.1)', bgMain: '#020617', bgPanel: '#0f172a', textMain: '#e2e8f0', textDim: '#94a3b8', border: 'rgba(255,255,255,0.1)' } },
    { id: 'gold', name: 'Royal Gold', colors: { accent: '#d97706', accentDim: 'rgba(217, 119, 6, 0.1)', bgMain: '#1c1917', bgPanel: '#292524', textMain: '#f5f5f4', textDim: '#a8a29e', border: 'rgba(255,255,255,0.1)' } },
    { id: 'purple', name: 'Cyber Purple', colors: { accent: '#9333ea', accentDim: 'rgba(147, 51, 234, 0.1)', bgMain: '#0f0716', bgPanel: '#1a0b2e', textMain: '#f3e8ff', textDim: '#d8b4fe', border: 'rgba(255,255,255,0.1)' } },
    { id: 'emerald', name: 'Emerald City', colors: { accent: '#059669', accentDim: 'rgba(5, 150, 105, 0.1)', bgMain: '#022c22', bgPanel: '#064e3b', textMain: '#ecfdf5', textDim: '#6ee7b7', border: 'rgba(255,255,255,0.1)' } },
    { id: 'orange', name: 'Sunset Orange', colors: { accent: '#ea580c', accentDim: 'rgba(234, 88, 12, 0.1)', bgMain: '#1a0c06', bgPanel: '#2c1208', textMain: '#ffedd5', textDim: '#fdba74', border: 'rgba(255,255,255,0.1)' } },
    { id: 'pink', name: 'Hot Pink', colors: { accent: '#db2777', accentDim: 'rgba(219, 39, 119, 0.1)', bgMain: '#1f0814', bgPanel: '#360f24', textMain: '#fce7f3', textDim: '#f9a8d4', border: 'rgba(255,255,255,0.1)' } },
    { id: 'lime', name: 'Toxic Lime', colors: { accent: '#65a30d', accentDim: 'rgba(101, 163, 13, 0.1)', bgMain: '#0e1403', bgPanel: '#182405', textMain: '#ecfccb', textDim: '#bef264', border: 'rgba(255,255,255,0.1)' } },
    { id: 'teal', name: 'Ocean Teal', colors: { accent: '#0d9488', accentDim: 'rgba(13, 148, 136, 0.1)', bgMain: '#041517', bgPanel: '#082529', textMain: '#ccfbf1', textDim: '#5eead4', border: 'rgba(255,255,255,0.1)' } },
];

type DragZone = 'bulk' | 'main' | 'tag' | 'art' | 'bg_video' | 'logo' | 'font' | null;

interface Toast {
  id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'error' | 'loading';
  progress?: number; // 0-100
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

// --- HELPER FUNCTIONS ---
const formatTime = (seconds: number) => {
  if (!seconds && seconds !== 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const generatePDF = (title: string, content: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to generate the PDF.");
        return;
    }
    const html = `
        <html>
        <head>
            <title>${title}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1a1a1a; }
                .print-container { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 40px; }
                @media print { .print-container { border: none; padding: 0; } }
            </style>
        </head>
        <body>
            <div class="print-container">
                ${content}
            </div>
            <script>
                setTimeout(() => { window.print(); window.close(); }, 500);
            </script>
        </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
};

const getDeviceId = () => {
    let id = localStorage.getItem('beatboy_device_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('beatboy_device_id', id);
    }
    return id;
};

// --- ACTIVATION COMPONENT ---
interface ActivationProps {
    onSuccess: () => void;
    initialError?: string | null;
}

const ActivationModal: React.FC<ActivationProps> = ({ onSuccess, initialError }) => {
    const [serial, setSerial] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError || null);

    // Update error if prop changes
    useEffect(() => {
        if (initialError) setError(initialError);
    }, [initialError]);

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
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute -top-20 -left-20 w-60 h-60 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 mb-6 shadow-inner">
                        <Lock className="text-red-500" size={32} />
                    </div>
                    
                    <h1 className="text-2xl font-black text-white mb-2 tracking-tight">ACTIVATE BEATBOY</h1>
                    <p className="text-zinc-500 text-sm mb-8">Enter your serial key to unlock the workstation.</p>

                    <div className="w-full space-y-4">
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input 
                                type="text" 
                                value={serial}
                                onChange={handleInput}
                                placeholder="XXX-XXX-XXX"
                                className="w-full bg-black border border-zinc-700 text-white font-mono text-center text-xl py-4 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 tracking-widest placeholder-zinc-700"
                            />
                        </div>

                        {error && (
                            <div className="flex flex-col gap-1 text-red-500 bg-red-500/10 p-4 rounded-lg text-xs font-bold justify-center items-center animate-in fade-in slide-in-from-top-1 text-center">
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={14} /> <span>{error}</span>
                                </div>
                                {error.includes('Phonicore') && (
                                    <a href="https://phonicore.com" target="_blank" rel="noreferrer" className="underline mt-1 hover:text-red-400">
                                        https://phonicore.com/
                                    </a>
                                )}
                            </div>
                        )}

                        <button 
                            onClick={activate}
                            disabled={loading || serial.length < 11}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20}/> : <ShieldCheck size={20} />}
                            {loading ? 'VALIDATING...' : 'ACTIVATE LICENSE'}
                        </button>
                    </div>
                    
                    <div className="mt-8 flex items-center gap-2 text-[10px] text-zinc-600">
                        <Laptop size={12} />
                        <span>Device ID: {getDeviceId().slice(0,8)}...</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- BPM Tapper Component ---
const BPMButton = () => {
    const [taps, setTaps] = useState<number[]>([]);
    const [bpm, setBpm] = useState(0);
    const [isTapped, setIsTapped] = useState(false);

    const handleTap = () => {
        const now = Date.now();
        const newTaps = [...taps, now].filter(t => now - t < 2000); // Keep taps within last 2 seconds
        setTaps(newTaps);
        setIsTapped(true);
        setTimeout(() => setIsTapped(false), 150);

        if (newTaps.length > 1) {
            const intervals = [];
            for (let i = 1; i < newTaps.length; i++) {
                intervals.push(newTaps[i] - newTaps[i-1]);
            }
            const avg = intervals.reduce((a,b)=>a+b, 0) / intervals.length;
            setBpm(Math.round(60000 / avg));
        } else {
            setBpm(0); // Reset on first tap after pause
        }
    };

    return (
        <div className="flex flex-col items-center gap-2 mr-6 select-none" title="Tap to calculate BPM">
            <button 
                onMouseDown={handleTap}
                className={`w-16 h-16 rounded-full border border-zinc-950 shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center transition-all active:scale-95 active:shadow-inner relative overflow-hidden ${isTapped ? 'bg-[var(--accent)]' : 'bg-gradient-to-b from-zinc-800 to-zinc-900'}`}
            >
                 <div className="absolute inset-0 bg-black/10 rounded-full" />
                 <span className={`relative font-black text-lg ${isTapped ? 'text-white' : 'text-zinc-500'}`}>TAP</span>
            </button>
            <div className="text-center">
                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest drop-shadow-md">BPM</div>
                <div className="text-[9px] font-mono text-[var(--accent)]">{bpm > 0 ? bpm : '--'}</div>
            </div>
        </div>
    );
};

// --- Business Tool Components ---
const ContractTool = () => {
    const [data, setData] = useState({ 
        producer: 'Beatboy', artist: '', title: '', price: '29.99', date: new Date().toISOString().split('T')[0],
        rights: 'Non-Exclusive' 
    });

    const handleGenerate = () => {
        const content = `
            <div class="text-center mb-8 border-b pb-4">
                <h1 class="text-2xl font-bold uppercase tracking-widest mb-2">Beat Lease Agreement</h1>
                <p class="text-sm text-gray-500">Date: ${data.date}</p>
            </div>
            
            <div class="mb-6 space-y-2">
                <p><strong>Producer:</strong> ${data.producer}</p>
                <p><strong>Artist:</strong> ${data.artist || '[Artist Name]'}</p>
                <p><strong>Track Title:</strong> ${data.title || '[Track Title]'}</p>
                <p><strong>License Type:</strong> ${data.rights}</p>
            </div>

            <div class="mb-6 text-sm leading-relaxed space-y-4">
                <p><strong>1. GRANT OF LICENSE</strong><br/>The Producer hereby grants the Artist a limited, non-exclusive license to use the musical composition (the "Beat") for the creation of a new sound recording.</p>
                
                <p><strong>2. PAYMENT</strong><br/>The Artist shall pay the Producer a total fee of <strong>$${data.price}</strong> for this license.</p>
                
                <p><strong>3. RIGHTS & LIMITATIONS</strong><br/>
                - Streaming Limit: 500,000 streams<br/>
                - Music Videos: 1 permitted<br/>
                - Radio Stations: 2 permitted<br/>
                - Performance Rights: For-profit performances allowed.</p>
                
                <p><strong>4. CREDIT</strong><br/>The Artist must credit the Producer as "Produced by ${data.producer}" in all metadata, descriptions, and liner notes.</p>
            </div>

            <div class="mt-12 flex justify-between">
                <div class="w-5/12 border-t border-black pt-2">
                    <p class="font-bold mb-8">Producer Signature</p>
                    <p>${data.producer}</p>
                </div>
                <div class="w-5/12 border-t border-black pt-2">
                    <p class="font-bold mb-8">Artist Signature</p>
                    <p>${data.artist || '(Artist Name)'}</p>
                </div>
            </div>
        `;
        generatePDF(`CONTRACT_${data.title}`, content);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">PRODUCER</label><input value={data.producer} onChange={e => setData({...data, producer: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">ARTIST</label><input value={data.artist} onChange={e => setData({...data, artist: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
                <div className="col-span-2 space-y-1"><label className="text-[10px] font-bold text-zinc-500">TRACK TITLE</label><input value={data.title} onChange={e => setData({...data, title: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">PRICE ($)</label><input type="number" value={data.price} onChange={e => setData({...data, price: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">LICENSE TYPE</label>
                    <select value={data.rights} onChange={e => setData({...data, rights: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white">
                        <option>Non-Exclusive</option>
                        <option>Premium Lease</option>
                        <option>Unlimited</option>
                        <option>Exclusive Rights</option>
                    </select>
                </div>
            </div>
            <button onClick={handleGenerate} className="mt-auto w-full bg-[var(--accent)] hover:opacity-90 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2"><FileSignature size={14}/> GENERATE PDF AGREEMENT</button>
        </div>
    );
};

const InvoiceTool = () => {
    const [data, setData] = useState({ 
        from: 'Beatboy Productions', to: '', invNum: `INV-${Math.floor(Math.random()*10000)}`, 
        date: new Date().toISOString().split('T')[0],
        item: 'Custom Beat Production', amount: '150.00'
    });

    const handleGenerate = () => {
        const content = `
            <div class="flex justify-between items-start mb-12">
                <div>
                    <h1 class="text-4xl font-bold text-red-600 mb-2">INVOICE</h1>
                    <p class="text-gray-500">#${data.invNum}</p>
                </div>
                <div class="text-right">
                    <h3 class="font-bold">${data.from}</h3>
                    <p class="text-sm text-gray-500">${data.date}</p>
                </div>
            </div>
            
            <div class="mb-8 p-4 bg-gray-50 rounded">
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Bill To</p>
                <p class="font-bold text-lg">${data.to || '[Client Name]'}</p>
            </div>

            <table class="w-full mb-8">
                <thead class="border-b-2 border-gray-200">
                    <tr>
                        <th class="text-left py-2">Description</th>
                        <th class="text-right py-2">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="border-b border-gray-100">
                        <td class="py-4">${data.item}</td>
                        <td class="text-right py-4">$${data.amount}</td>
                    </tr>
                </tbody>
            </table>

            <div class="text-right">
                <p class="text-sm text-gray-500 mb-1">Total Due</p>
                <p class="text-3xl font-bold">$${data.amount}</p>
            </div>

            <div class="mt-12 pt-8 border-t text-center text-sm text-gray-400">
                <p>Thank you for your business!</p>
            </div>
        `;
        generatePDF(`INVOICE_${data.invNum}`, content);
    };

    return (
        <div className="h-full flex flex-col gap-4">
             <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">CLIENT NAME</label><input value={data.to} onChange={e => setData({...data, to: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">INVOICE #</label><input value={data.invNum} onChange={e => setData({...data, invNum: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">DATE</label><input type="date" value={data.date} onChange={e => setData({...data, date: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
             </div>
             <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">SERVICE DESCRIPTION</label><input value={data.item} onChange={e => setData({...data, item: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
             <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">AMOUNT ($)</label><input type="number" value={data.amount} onChange={e => setData({...data, amount: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
             <button onClick={handleGenerate} className="mt-auto w-full bg-zinc-100 hover:bg-white text-black py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2"><ScrollText size={14}/> CREATE INVOICE PDF</button>
        </div>
    );
};

const PriceMenuTool = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [prices, setPrices] = useState({ mp3: '29.99', wav: '49.99', stems: '99.99', unlim: '199.99' });
    const [footerText, setFooterText] = useState('BUY 2 GET 1 FREE');
    const [template, setTemplate] = useState<1 | 2 | 3 | 4 | 5>(1);

    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        
        // High Res Canvas
        canvas.width = 1080;
        canvas.height = 1350;
        
        const w = canvas.width;
        const h = canvas.height;
        
        // --- TEMPLATE RENDERING ---
        
        if (template === 1) { // Classic Red
            // BG
            const grad = ctx.createLinearGradient(0,0,0,h);
            grad.addColorStop(0, '#09090b');
            grad.addColorStop(1, '#18181b');
            ctx.fillStyle = grad;
            ctx.fillRect(0,0,w,h);
            
            // Border
            ctx.strokeStyle = '#dc2626'; // Red
            ctx.lineWidth = 10;
            ctx.strokeRect(30,30,w-60,h-60);

            // Title
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 80px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('LEASING MENU', w/2, 180);
            
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(w/2 - 100, 210, 200, 5);

        } else if (template === 2) { // Minimal Light
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0,0,w,h);
            ctx.fillStyle = '#000';
            ctx.font = '300 90px serif';
            ctx.textAlign = 'center';
            ctx.fillText('PRICING', w/2, 200);

        } else if (template === 3) { // Gold Luxury
            const grad = ctx.createLinearGradient(0,0,w,h);
            grad.addColorStop(0, '#000');
            grad.addColorStop(1, '#1a1a1a');
            ctx.fillStyle = grad;
            ctx.fillRect(0,0,w,h);
            
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 4;
            ctx.strokeRect(50,50,w-100,h-100);
            
            ctx.fillStyle = '#d4af37';
            ctx.font = 'bold 80px serif';
            ctx.textAlign = 'center';
            ctx.fillText('OFFICIAL RATES', w/2, 200);

        } else if (template === 4) { // Cyberpunk
            ctx.fillStyle = '#0f0f1a';
            ctx.fillRect(0,0,w,h);
            // Grid
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.2;
            for(let i=0; i<w; i+=100) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,h); ctx.stroke(); }
            for(let i=0; i<h; i+=100) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(w,i); ctx.stroke(); }
            ctx.globalAlpha = 1;
            
            ctx.fillStyle = '#00f0ff';
            ctx.font = '900 90px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 20;
            ctx.fillText('LEASE BEATS', w/2, 180);
            ctx.shadowBlur = 0;

        } else if (template === 5) { // Bold Red
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(0,0,w,h);
            ctx.fillStyle = '#fff';
            ctx.font = 'italic 900 100px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('BEAT STORE', w/2, 250);
        }

        // --- DRAW ITEMS ---
        const drawItem = (y: number, title: string, price: string, accent: string, textCol: string) => {
            ctx.fillStyle = textCol;
            ctx.font = 'bold 50px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(title, 100, y);
            
            ctx.textAlign = 'right';
            ctx.fillStyle = accent;
            ctx.fillText(`$${price}`, w-100, y);
            
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            if (template === 2) ctx.strokeStyle = '#eee';
            if (template === 5) ctx.strokeStyle = '#ffaaaa';
            
            ctx.beginPath();
            ctx.moveTo(100, y+30);
            ctx.lineTo(w-100, y+30);
            ctx.stroke();
        };

        const startY = 400;
        const gap = 150;
        
        let accent = '#dc2626';
        let text = '#fff';
        if (template === 2) { accent = '#000'; text = '#333'; }
        if (template === 3) { accent = '#d4af37'; text = '#f3e5ab'; }
        if (template === 4) { accent = '#ff00ff'; text = '#fff'; }
        if (template === 5) { accent = '#fff'; text = '#fff'; }

        drawItem(startY, 'MP3 LEASE', prices.mp3, accent, text);
        drawItem(startY + gap, 'WAV LEASE', prices.wav, accent, text);
        drawItem(startY + gap*2, 'TRACK STEMS', prices.stems, accent, text);
        drawItem(startY + gap*3, 'UNLIMITED', prices.unlim, accent, text);
        
        // Footer
        ctx.fillStyle = template === 2 ? '#666' : (template === 5 ? '#ffcccc' : '#888');
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(footerText, w/2, h-100);
        
    }, [prices, footerText, template]);

    const downloadMenu = () => {
        if(!canvasRef.current) return;
        const url = canvasRef.current.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'PRICING_MENU.png';
        a.click();
    };

    return (
        <div className="h-full flex flex-col gap-4">
             <div className="flex gap-2 mb-2 bg-zinc-900 p-1 rounded-lg shrink-0">
                {[1,2,3,4,5].map(t => (
                    <button 
                        key={t}
                        onClick={() => setTemplate(t as any)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded ${template === t ? 'bg-[var(--accent)] text-white' : 'text-zinc-500 hover:bg-zinc-800'}`}
                    >
                        T{t}
                    </button>
                ))}
             </div>
             <div className="grid grid-cols-2 gap-3 shrink-0">
                 <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">MP3 PRICE</label><input value={prices.mp3} onChange={e => setPrices({...prices, mp3: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">WAV PRICE</label><input value={prices.wav} onChange={e => setPrices({...prices, wav: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">STEMS PRICE</label><input value={prices.stems} onChange={e => setPrices({...prices, stems: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">UNLIMITED PRICE</label><input value={prices.unlim} onChange={e => setPrices({...prices, unlim: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
             </div>
             <div className="space-y-1 shrink-0"><label className="text-[10px] font-bold text-zinc-500">FOOTER TEXT</label><input value={footerText} onChange={e => setFooterText(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
             
             {/* Canvas Container with Scroll */}
             <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-900 rounded-lg border border-zinc-800 p-2">
                 <div className="flex items-center justify-center min-h-full">
                    <canvas ref={canvasRef} className="h-[400px] w-auto object-contain shadow-lg" />
                 </div>
             </div>
             
             <button onClick={downloadMenu} className="w-full bg-[var(--accent)] hover:opacity-90 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shrink-0"><ImageIcon size={14}/> DOWNLOAD MENU IMAGE</button>
        </div>
    );
};

const SplitSheetTool = () => {
    const [collaborators, setCollaborators] = useState([{role: 'Producer', percent: 50}, {role: 'Artist', percent: 50}]);
    
    const updatePercent = (idx: number, val: number) => {
        const newCollabs = [...collaborators];
        newCollabs[idx].percent = val;
        setCollaborators(newCollabs);
    };

    const total = collaborators.reduce((a,b) => a + b.percent, 0);

    const handleDownloadSplits = () => {
        const headers = "Role,Percentage\n";
        const rows = collaborators.map(c => `${c.role},${c.percent}%`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SPLIT_SHEET.csv';
        a.click();
    };

    return (
        <div className="h-full flex flex-col">
             <div className="flex justify-between items-center mb-4">
                 <span className="text-xs font-bold text-white">Publishing Splits</span>
                 <span className={`text-xs font-bold ${total === 100 ? 'text-[var(--accent)]' : 'text-zinc-500'}`}>{total}%</span>
             </div>
             <div className="space-y-2 flex-1 overflow-y-auto mb-4">
                 {collaborators.map((c, i) => (
                     <div key={i} className="flex gap-2">
                         <input type="text" value={c.role} onChange={e => {
                             const n = [...collaborators]; n[i].role = e.target.value; setCollaborators(n);
                         }} className="flex-1 bg-black border border-zinc-800 rounded px-2 py-2 text-xs text-white" />
                         <div className="flex items-center gap-1">
                             <input type="number" value={c.percent} onChange={e => updatePercent(i, Number(e.target.value))} className="w-12 bg-black border border-zinc-800 rounded px-1 py-2 text-right text-xs text-white" />
                             <span className="text-zinc-500 text-xs">%</span>
                         </div>
                     </div>
                 ))}
                 <button onClick={() => setCollaborators([...collaborators, {role: 'New Person', percent: 0}])} className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-bold mt-2 text-zinc-300">+ ADD COLLABORATOR</button>
             </div>
             <button onClick={handleDownloadSplits} className="w-full py-3 bg-zinc-100 hover:bg-white text-black rounded-lg text-xs font-bold flex items-center justify-center gap-2"><Download size={14}/> DOWNLOAD CSV</button>
        </div>
    );
};

const ReceiptTool = () => {
    const [data, setData] = useState({ 
        id: `TX-${Math.floor(Math.random()*100000)}`, item: 'Untagged WAV Lease', price: '49.99', date: new Date().toISOString().split('T')[0] 
    });

    const handleGenerate = () => {
        const content = `
            <div class="text-center mb-8">
                <h2 class="text-xl font-bold mb-2">RECEIPT</h2>
                <p class="text-sm text-gray-500">Transaction ID: ${data.id}</p>
                <p class="text-sm text-gray-500">Date: ${data.date}</p>
            </div>
            
            <div class="border-t border-b border-gray-200 py-4 mb-4">
                <div class="flex justify-between mb-2">
                    <span class="font-bold">${data.item}</span>
                    <span>$${data.price}</span>
                </div>
            </div>
            
            <div class="flex justify-between text-lg font-bold">
                <span>TOTAL PAID</span>
                <span>$${data.price}</span>
            </div>
            
            <div class="mt-8 text-center">
                <p class="text-xs text-gray-400">Thank you for your purchase.</p>
            </div>
        `;
        generatePDF(`RECEIPT_${data.id}`, content);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">ITEM PURCHASED</label><input value={data.item} onChange={e => setData({...data, item: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
            <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">PRICE ($)</label><input type="number" value={data.price} onChange={e => setData({...data, price: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
            <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">TRANSACTION ID</label><input value={data.id} onChange={e => setData({...data, id: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
            <button onClick={handleGenerate} className="mt-auto w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2"><Receipt size={14}/> GENERATE RECEIPT PDF</button>
        </div>
    );
};

const HashtagTool = () => {
    const [genre, setGenre] = useState('Trap');
    const [mood, setMood] = useState('Dark');
    const [result, setResult] = useState({ title: '', tags: '' });

    const generate = () => {
        const title = `FREE ${mood} ${genre} Type Beat - "VISION" | Hard ${genre} Instrumental 2024`;
        const tags = `#${genre.toLowerCase()}typebeat #${mood.toLowerCase()}beat #freebeat #instrumental #${genre.toLowerCase()} #producer #newbeat`;
        setResult({ title, tags });
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">GENRE</label>
                    <select value={genre} onChange={e => setGenre(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white">
                        <option>Trap</option><option>Drill</option><option>R&B</option><option>LoFi</option><option>Boombap</option>
                    </select>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">MOOD/VIBE</label><input value={mood} onChange={e => setMood(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
            </div>
            <button onClick={generate} className="w-full bg-[var(--accent)] hover:opacity-90 text-white py-2 rounded font-bold text-xs">GENERATE SEO</button>
            
            <div className="flex-1 bg-black rounded border border-zinc-800 p-3 space-y-4">
                <div>
                    <label className="text-[9px] font-bold text-zinc-500 block mb-1">OPTIMIZED TITLE</label>
                    <div className="flex gap-2">
                        <input value={result.title} readOnly className="flex-1 bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white" />
                        <button onClick={() => navigator.clipboard.writeText(result.title)} className="px-3 bg-zinc-800 rounded hover:bg-zinc-700"><Copy size={12}/></button>
                    </div>
                </div>
                <div>
                    <label className="text-[9px] font-bold text-zinc-500 block mb-1">OPTIMIZED TAGS</label>
                    <div className="flex gap-2">
                        <textarea value={result.tags} readOnly className="flex-1 bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white h-20 resize-none" />
                        <button onClick={() => navigator.clipboard.writeText(result.tags)} className="px-3 bg-zinc-800 rounded hover:bg-zinc-700"><Copy size={12}/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DescriptionTool = () => {
    const [data, setData] = useState({ link: 'beatstars.com/beat', bpm: '140', key: 'C Minor', website: 'www.beatboy.com', email: 'contact@beatboy.com' });
    const [output, setOutput] = useState('');

    const generate = () => {
        setOutput(`
🎹 Purchase Link (Untagged): ${data.link}
🌐 Website: ${data.website}
📧 Contact: ${data.email}

Information:
BPM: ${data.bpm}
Key: ${data.key}

USAGE:
Absolutely ANY USE of this beat (Including leasing) REQUIRES CREDIT (Prod. by Beatboy). There are NO exceptions.

Socials:
Instagram: @beatboy
Twitter: @beatboy

#producer #typebeat #instrumental
        `.trim());
    };

    return (
        <div className="h-full flex flex-col gap-4">
             <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">PURCHASE LINK</label><input value={data.link} onChange={e => setData({...data, link: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">WEBSITE</label><input value={data.website} onChange={e => setData({...data, website: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">EMAIL</label><input value={data.email} onChange={e => setData({...data, email: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">BPM</label><input value={data.bpm} onChange={e => setData({...data, bpm: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500">KEY</label><input value={data.key} onChange={e => setData({...data, key: e.target.value})} className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white"/></div>
             </div>
             <button onClick={generate} className="w-full bg-[var(--accent)] hover:opacity-90 text-white py-2 rounded font-bold text-xs flex items-center justify-center gap-2"><Youtube size={14}/> GENERATE DESCRIPTION</button>
             <textarea value={output} onChange={e => setOutput(e.target.value)} className="flex-1 bg-black border border-zinc-800 rounded p-3 text-xs text-zinc-300 font-mono resize-none focus:outline-none" placeholder="Generated description will appear here..." />
             <button onClick={() => navigator.clipboard.writeText(output)} className="w-full bg-zinc-800 hover:bg-zinc-700 py-2 rounded text-xs font-bold">COPY TO CLIPBOARD</button>
        </div>
    );
};

const NotesApp = () => {
    const [notes, setNotes] = useState("");
    
    useEffect(() => {
        const saved = localStorage.getItem('beatboy_notes');
        if (saved) setNotes(saved);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
        localStorage.setItem('beatboy_notes', e.target.value);
    };

    return (
        <div className="h-full flex flex-col gap-2">
            <textarea 
                value={notes} 
                onChange={handleChange}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs resize-none focus:outline-none focus:border-[var(--accent)] leading-relaxed font-mono text-zinc-300 shadow-inner" 
                placeholder="Session notes, lyrics, to-do list... (Auto-saved)"
            ></textarea>
        </div>
    );
};

const LicenseTool = () => {
    const serial = localStorage.getItem('beatboy_serial') || 'UNKNOWN';
    const deviceId = localStorage.getItem('beatboy_device_id') || 'UNKNOWN';
    const date = localStorage.getItem('beatboy_activation_date') || 'Unknown';

    return (
        <div className="h-full flex flex-col gap-6 p-4">
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="text-[var(--accent)]" /> License Details
                </h3>
                <div className="space-y-2">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-zinc-500 text-xs font-bold uppercase">Serial Key</span>
                        <span className="text-white font-mono text-sm tracking-wide">{serial}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-zinc-500 text-xs font-bold uppercase">Device ID</span>
                        <span className="text-zinc-400 font-mono text-xs">{deviceId}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-zinc-500 text-xs font-bold uppercase">Activated On</span>
                        <span className="text-white font-mono text-sm">{date}</span>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-red-900/10 border border-red-900/30 rounded-xl">
                <h4 className="text-red-500 font-bold flex items-center gap-2 mb-2 text-sm">
                    <AlertCircle size={16} /> LICENSE AGREEMENT & ABUSE POLICY
                </h4>
                <p className="text-zinc-400 text-xs leading-relaxed">
                    This license is <strong>single-seat</strong> and strictly tied to this unique hardware configuration. 
                    <br/><br/>
                    <strong>WARNING:</strong> Unauthorized sharing, public leaking, or reselling of this serial key is a violation of terms and will result in an <strong>immediate, permanent ban</strong> across all devices without refund. Your IP address and unique hardware ID are logged for security verification.
                </p>
            </div>
        </div>
    );
};

export default function App() {
  // --- Licensing State ---
  const [isActivated, setIsActivated] = useState(false);
  const [isLoadingLicense, setIsLoadingLicense] = useState(true);
  const [activationError, setActivationError] = useState<string | null>(null);

  // --- State ---
  const [activeFile, setActiveFile] = useState<AudioFile | null>(null);
  const [bulkFiles, setBulkFiles] = useState<AudioFile[]>([]);
  const [tagBuffer, setTagBuffer] = useState<AudioBuffer | null>(null);
  const [tagName, setTagName] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<string | null>(null);
  
  // UI State
  const [activeTheme, setActiveTheme] = useState<Theme>(THEMES[0]);
  const [dragActive, setDragActive] = useState<DragZone>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showBusinessTools, setShowBusinessTools] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [activeTool, setActiveTool] = useState('contract');
  const [videoTab, setVideoTab] = useState<'visual' | 'assets' | 'text'>('visual');
  const [isExpandedPreview, setIsExpandedPreview] = useState(false);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [eqSettings, setEqSettings] = useState<EQSettings>(DEFAULT_EQ);
  
  // Effects State
  const [fadeEnding, setFadeEnding] = useState(false);
  const [normalize, setNormalize] = useState(false);
  const [limiter, setLimiter] = useState(false);
  const [tagSettings, setTagSettings] = useState<TagSettings>({ interval: 30, volume: 0.5, enabled: false });
  const [targetSampleRate, setTargetSampleRate] = useState<44100 | 48000>(44100);

  // Video State
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    aspectRatio: '16:9',
    isGenerating: false,
    previewUrl: null,
    artistName: "BEATBOY",
    videoDuration: 0,
    backgroundType: 'image',
    backgroundUrl: null,
    logoUrl: null,
    logoScale: 1.0,
    logoX: 0.05,
    logoY: 0.05,
    fontFamily: 'sans-serif',
    visualizer: 'waveform',
    motionBlur: false,
    colorGrade: 'none',
    showGrid: false,
    snapToGrid: false,
    overlays: [
        { id: 'producer', label: 'Producer / Artist Name', text: 'PRODUCED BY BEATBOY', x: 0.5, y: 0.85, visible: true, fontSize: 60, color: '#ffffff' },
        { id: 'title', label: 'Track Title', text: 'TRACK TITLE', x: 0.5, y: 0.15, visible: true, fontSize: 80, color: '#ffffff' },
        { id: 'price', label: 'Price Card', text: '$20 LEASE / $100 EXCLUSIVE', x: 0.9, y: 0.9, visible: false, fontSize: 30, color: '#ffffff' },
    ]
  });

  // --- Refs ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const limiterNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);
  const activeFileRef = useRef<AudioFile | null>(null); // Ref to track active file in loops
  const logoRef = useRef<HTMLDivElement>(null); // Ref for logo animation
  
  // Ref to track playback state in loops to avoid closure staleness
  const isPlayingRef = useRef(false);

  // Visualizer Refs
  const particlesRef = useRef<Particle[]>([]);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Preview Refs
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewRequestRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Interaction Refs
  const draggingOverlayRef = useRef<string | null>(null);

  // Define stopAudio early to be used in loops
  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e){}
    }
    if (audioCtxRef.current) {
        pauseTimeRef.current = audioCtxRef.current.currentTime - startTimeRef.current;
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
    cancelAnimationFrame(animationFrameRef.current);
  }, []);

  // --- LICENSE CHECK LOGIC ---
  useEffect(() => {
    // 1. Ensure Device ID
    getDeviceId();

    // 2. Optimistic Local Check (Fast Startup)
    const savedSerial = localStorage.getItem('beatboy_serial');
    if (savedSerial) {
        setIsActivated(true);
    } else {
        setIsActivated(false);
    }
    setIsLoadingLicense(false);
  }, []);

  // --- BACKGROUND LICENSE VALIDATION (Centralized Polling & Kill Switch) ---
  useEffect(() => {
      // Only run if the app thinks it's activated
      if (!isActivated) return;

      const validate = async () => {
          const savedSerial = localStorage.getItem('beatboy_serial');
          const deviceId = getDeviceId();
          
          if (!savedSerial) {
              setIsActivated(false);
              return;
          }

          try {
              // Add timestamp to ensure no caching
              const res = await fetch(`${LICENSE_API_URL}?action=validate&serial=${savedSerial}&pc_id=${deviceId}&_t=${Date.now()}`);
              const data = await res.json();
              
              // DEBUG: Log the full response to help diagnosis
              console.log("BEATBOY LICENSE CHECK:", data);

              // --- KILL SWITCH PROTOCOL ---
              // Strict Logic: Lock if valid is explicitly false, or force_lock is true, or ok is false.
              // We also handle string 'false' which some APIs return.
              const isInvalid = data.valid === false || data.valid === 'false';
              const isLocked = data.force_lock === true || data.force_lock === 'true';
              const isNotOk = data.ok === false;
              // Add explicit check for activated status (handling string "FALSE" from sheets)
              const isDeactivated = data.activated === false || data.activated === 'false' || data.activated === 'FALSE';

              if (isLocked || isInvalid || isNotOk || isDeactivated) {
                  
                  // 1. STOP AUDIO
                  stopAudio();

                  // 2. WIPE CREDENTIALS
                  localStorage.removeItem('beatboy_serial');
                  // We keep device_id as it identifies the machine

                  // 3. LOCK UI
                  setIsActivated(false);

                  // 4. SET ERROR REASON
                  if (data.reason === 'device_limit_reached' || data.error === 'device_limit_reached') {
                      setActivationError("Session terminated. Activation limit reached.");
                  } else if (isLocked) {
                      setActivationError("Session terminated. License locked by administrator.");
                  } else if (isDeactivated) {
                      setActivationError("Session terminated. Serial has been deactivated. Contact Phonicore support.");
                  } else if (data.reason === 'license_deactivated_server') {
                      setActivationError("Session terminated. License deactivated.");
                  } else {
                      setActivationError("Session terminated. License deactivated or invalid.");
                  }
              }
          } catch (e) {
              // Network error in background check - ignore to prevent false lockouts on unstable connection
              console.warn("Background license check failed (network)");
          }
      };

      // Execute immediately on mount/activation
      validate();

      // Repeat every 5 seconds (Aggressive Polling)
      const interval = setInterval(validate, 5000); 

      // Cleanup
      return () => clearInterval(interval);
  }, [isActivated, stopAudio]);


  // --- Initialization ---
  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioCtxRef.current.createAnalyser();
    analyserRef.current.fftSize = 512;
    analyserRef.current.smoothingTimeConstant = 0.8;
    
    return () => {
      audioCtxRef.current?.close();
    };
  }, []);

  // Sync state to refs for animation loops
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Sync Video Settings to Loaded File
  useEffect(() => {
      if (activeFile) {
          // Sync Duration
          setVideoSettings(prev => ({ ...prev, videoDuration: activeFile.duration }));
          
          // Sync Track Title Overlay
          const title = activeFile.name.replace(/\.[^/.]+$/, "").toUpperCase();
          setVideoSettings(prev => ({
              ...prev,
              overlays: prev.overlays.map(o => o.id === 'title' ? { ...o, text: title } : o)
          }));
      }
  }, [activeFile]);

  // Sync legacy artistName to overlay
  useEffect(() => {
      setVideoSettings(prev => ({
          ...prev,
          overlays: prev.overlays.map(o => o.id === 'producer' ? { ...o, text: `PRODUCED BY ${prev.artistName.toUpperCase()}` } : o)
      }));
  }, [videoSettings.artistName]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault(); 
        if (activeFileRef.current) {
           const btn = document.getElementById('play-pause-btn');
           if(btn) btn.click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Toast System ---
  const addToast = (toast: Toast) => {
    setToasts(prev => [...prev, toast]);
  };

  const updateToast = (id: string, updates: Partial<Toast>) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showSuccessToast = (title: string, message: string) => {
     const id = crypto.randomUUID();
     addToast({ id, title, message, type: 'success' });
     setTimeout(() => removeToast(id), 4000);
  };

  // --- Manual Download ---
  const handleDownloadManual = () => {
    const text = `
BEATBOY USER GUIDE
==================

SHORTCUTS
- Play/Pause: SPACE bar (when not typing in a field)

FEATURES

1. AUDIO WORKSTATION
- Main Audio: Drag & Drop MP3 or WAV files into the center player.
- EQ: Use the 5-band equalizer knobs at the top to adjust frequencies.
- Effects: Toggle "Fade Out", "Normalize", or "Limiter" in the top bar.
  - Limiter: Prevents audio clipping (red lighting indicates active).
  - Fade Out: Adds a 3-second fade to the end of your track.
  - Normalize: Boosts audio to -1.0dB.
- Voice Tags: Drag an audio file into the "Voice Tag" box. Select interval (15s/20s/30s).
- Scrubbing: Click and drag the red playhead on the waveform to seek.

2. FILE MANAGER (LEFT PANEL)
- Bulk Mode: Drag multiple files into the "Drag Bulk Beats" zone.
- Play Queue: Click any file in the list to audition it.
- Export Bundle: Renders all queued files with EQ, Tags, and Effects into a ZIP file.

3. VIDEO STUDIO (RIGHT PANEL)
- Drag Background: Drag an Image or Video file into the "Assets" tab drop zones.
- Drag Logo: Drag a PNG logo to overlay.
- Drag Font: Drag a .ttf or .otf file to use custom typography.
- Visualizers: Choose from Matrix, Eclipse, Trap Nation, etc.
- Editor: Click the "Maximize" button to open the full-screen editor.
- Text Layout: You can drag "Track Title", "Producer Name", and "Price Card" directly on the preview to position them.
- Generate: Click "Generate Video" to render a social-media ready video (16:9 or 9:16).

4. BUSINESS TOOLS
- Click the "Business Tools" button at the bottom center.
- Contract Gen: Create PDF lease agreements.
- Invoice/Receipt: Generate professional financial documents.
- Price Menu: Create a high-res pricing menu for Instagram.
- Split Sheet: Calculate and export CSVs for publishing splits.

NEED HELP?
Contact support@beatboy.com
    `;
    const blob = new Blob([text.trim()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BEATBOY_MANUAL.txt';
    a.click();
    URL.revokeObjectURL(url);
  };


  // --- Audio Engine Logic (Playback) ---

  // Rebuild graph when limiter toggle changes dynamically
  useEffect(() => {
    if (audioCtxRef.current && isPlaying) {
        // Just trigger a rebuild if playing to insert/remove limiter
        const currentTime = audioCtxRef.current.currentTime - startTimeRef.current;
        pauseTimeRef.current = currentTime;
        playAudio(activeFileRef.current);
    }
  }, [limiter]);

  const buildAudioGraph = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    // Disconnect old
    eqNodesRef.current.forEach(n => n.disconnect());
    if (gainNodeRef.current) gainNodeRef.current.disconnect();
    if (limiterNodeRef.current) limiterNodeRef.current.disconnect();

    // Create Filters
    const createFilter = (type: BiquadFilterType, freq: number, gain: number) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.gain.value = gain;
      return f;
    };

    const filters = [
      createFilter('lowshelf', 60, eqSettings.low),
      createFilter('peaking', 250, eqSettings.lowMid),
      createFilter('peaking', 1000, eqSettings.mid),
      createFilter('peaking', 5000, eqSettings.highMid),
      createFilter('highshelf', 12000, eqSettings.high),
    ];
    eqNodesRef.current = filters;

    // Create Gain
    const gain = ctx.createGain();
    gain.gain.value = 1.0;
    gainNodeRef.current = gain;

    // Create Limiter (if enabled)
    if (limiter) {
       limiterNodeRef.current = createLimiter(ctx);
    } else {
       limiterNodeRef.current = null;
    }
  };

  const updateEQ = useCallback(() => {
    if (eqNodesRef.current.length === 5) {
      eqNodesRef.current[0].gain.value = eqSettings.low;
      eqNodesRef.current[1].gain.value = eqSettings.lowMid;
      eqNodesRef.current[2].gain.value = eqSettings.mid;
      eqNodesRef.current[3].gain.value = eqSettings.highMid;
      eqNodesRef.current[4].gain.value = eqSettings.high;
    }
  }, [eqSettings]);

  useEffect(() => {
    updateEQ();
  }, [eqSettings, updateEQ]);

  const updatePlaybackTime = () => {
    // Check against Ref, not State, to avoid closure issues in rAF loop
    if (!isPlayingRef.current || !audioCtxRef.current || !activeFileRef.current) return;
    const now = audioCtxRef.current.currentTime - startTimeRef.current;
    
    if (now >= activeFileRef.current.duration) {
       setCurrentTime(activeFileRef.current.duration);
       stopAudio(); // Auto-stop at end
       return;
    }
    setCurrentTime(now);
    animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
  };

  const playAudio = (fileToPlay: AudioFile | null = activeFile) => {
    if (!fileToPlay?.buffer || !audioCtxRef.current) return;
    
    // If switching files
    if (activeFile && fileToPlay.id !== activeFile.id) {
        stopAudio();
    }
    
    setActiveFile(fileToPlay);

    // If starting a new file or different from active
    if (!activeFile || fileToPlay.id !== activeFile.id) {
       pauseTimeRef.current = 0;
       setCurrentTime(0);
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Clean up previous source if any (rebuilding graph)
    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); sourceNodeRef.current.disconnect(); } catch(e){}
    }

    buildAudioGraph();
    
    const source = ctx.createBufferSource();
    source.buffer = fileToPlay.buffer;
    sourceNodeRef.current = source;

    // Chain: Source -> EQ -> Gain -> [Analyser] -> [Limiter?] -> Destination
    let currentNode: AudioNode = source;
    
    // EQ
    eqNodesRef.current.forEach(f => {
      currentNode.connect(f);
      currentNode = f;
    });
    
    // Gain
    if (gainNodeRef.current) {
      currentNode.connect(gainNodeRef.current);
      currentNode = gainNodeRef.current;
    }

    // Connect Analyser (Always, so visualizers work without limiter)
    if (analyserRef.current) {
        currentNode.connect(analyserRef.current);
    }

    // Connect Limiter (Optional)
    if (limiter && limiterNodeRef.current) {
        // Create a separate path for the limited audio to speakers
        // Analyser is effectively pre-limiter in this routing, which is standard for monitoring mix input
        const preLimiter = currentNode;
        preLimiter.connect(limiterNodeRef.current);
        currentNode = limiterNodeRef.current;
    }

    // Output
    currentNode.connect(ctx.destination);

    const offset = pauseTimeRef.current % fileToPlay.duration;
    startTimeRef.current = ctx.currentTime - offset;
    
    source.start(0, offset);
    source.onended = () => {
       // Loop logic handled by time check
    };

    setIsPlaying(true);
    isPlayingRef.current = true; // Set ref immediately for loop start
    
    // Start animation loop
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
  };

  // --- Scrubbing Handlers (Smooth Playhead) ---
  const handleScrubStart = () => {
      wasPlayingRef.current = isPlaying;
      if (isPlaying) {
          stopAudio();
      }
  };

  const handleScrub = (time: number) => {
    pauseTimeRef.current = time;
    setCurrentTime(time);
  };

  const handleScrubEnd = () => {
      if (wasPlayingRef.current) {
          playAudio(activeFileRef.current);
      }
  };

  // --- Drag & Drop Handlers ---

  const handleDragEnter = (e: React.DragEvent, zone: DragZone) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(zone);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragActive(null);
  };

  const handleDragStart = (e: React.DragEvent, file: File) => {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("DownloadURL", `${file.type}:${file.name}:${URL.createObjectURL(file)}`);
      showSuccessToast("Dragging File", "Drop to your desktop");
  };

  const handleBulkDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    if (!e.dataTransfer.files || !audioCtxRef.current) return;
    const files: File[] = Array.from(e.dataTransfer.files);
    const newAudioFiles: AudioFile[] = [];
    for (const f of files) {
       if (f.type.startsWith('audio/')) {
           const ab = await f.arrayBuffer();
           const buf = await decodeAudio(audioCtxRef.current, ab);
           newAudioFiles.push({
               id: crypto.randomUUID(),
               name: f.name,
               file: f,
               buffer: buf,
               duration: buf.duration
           });
       }
    }
    setBulkFiles(prev => [...prev, ...newAudioFiles]);
  };

  const handleMainDrop = async (e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);

    let file: File | null = null;
    if ('dataTransfer' in e) {
        if (e.dataTransfer.files && e.dataTransfer.files[0]) file = e.dataTransfer.files[0];
    } else {
        if (e.target.files && e.target.files[0]) file = e.target.files[0];
    }

    if (file && audioCtxRef.current) {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg)$/i)) {
          alert("Please drop a valid audio file (MP3/WAV)");
          return;
      }
      const arrayBuffer = await file.arrayBuffer();
      try {
        const audioBuffer = await decodeAudio(audioCtxRef.current, arrayBuffer);
        const newFile = {
          id: crypto.randomUUID(),
          name: file.name,
          file: file,
          buffer: audioBuffer,
          duration: audioBuffer.duration
        };
        setActiveFile(newFile);
        pauseTimeRef.current = 0;
        setCurrentTime(0);
        setIsPlaying(false);
      } catch (err) {
        console.error("Error decoding audio:", err);
        alert("Failed to decode audio file.");
      }
    }
  };

  const handleTagDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    const file = e.dataTransfer.files[0];
    if (file && audioCtxRef.current) {
        const ab = await file.arrayBuffer();
        const buf = await decodeAudio(audioCtxRef.current, ab);
        setTagBuffer(buf);
        setTagName(file.name);
        setTagSettings(prev => ({...prev, enabled: true}));
    }
  };

  const handleArtworkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setArtwork(url);
        if (!videoSettings.backgroundUrl || videoSettings.backgroundType === 'image') {
           setVideoSettings(prev => ({...prev, backgroundUrl: url, backgroundType: 'image'}));
        }
    }
  };

  const handleBgVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm)$/i))) {
        const url = URL.createObjectURL(file);
        setVideoSettings(prev => ({...prev, backgroundUrl: url, backgroundType: 'video'}));
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setVideoSettings(prev => ({...prev, logoUrl: url}));
    }
  };

  const handleFontDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.ttf') || file.name.endsWith('.otf'))) {
        try {
            const buffer = await file.arrayBuffer();
            const fontName = 'CustomFont-' + Math.random().toString(36).substr(2, 9);
            const font = new FontFace(fontName, buffer);
            await font.load();
            document.fonts.add(font);
            setVideoSettings(prev => ({...prev, fontFamily: fontName}));
            showSuccessToast("Font Loaded", `Using ${file.name}`);
        } catch(err) {
            console.error(err);
        }
    }
  };

  // --- Export Processors ---

  const generateTaggedBuffer = async (sourceBuffer: AudioBuffer) => {
      return await renderProcessedAudio(
          sourceBuffer,
          tagSettings.enabled ? tagBuffer : null,
          eqSettings,
          {
              normalize,
              fadeEnding,
              tagInterval: tagSettings.interval,
              targetSampleRate,
              limiter
          }
      );
  };

  const handleExportSingle = async () => {
    if (!activeFile?.buffer) return;
    const toastId = 'export-single';
    addToast({ id: toastId, title: 'Exporting WAV...', type: 'loading', progress: 0 });
    setTimeout(async () => {
      try {
        const processed = await generateTaggedBuffer(activeFile.buffer!);
        const wav = bufferToWav(processed);
        const url = URL.createObjectURL(wav);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BEATBOY_EXPORT_${activeFile.name}.wav`;
        a.click();
        URL.revokeObjectURL(url);
        removeToast(toastId);
        showSuccessToast('Export Complete', 'WAV file downloaded successfully.');
      } catch (err) {
        updateToast(toastId, { type: 'error', title: 'Export Failed', message: 'Something went wrong.' });
      }
    }, 100);
  };

  const handleBulkExport = async () => {
    if (bulkFiles.length === 0) return;
    const toastId = 'export-bulk';
    addToast({ id: toastId, title: 'Preparing Bulk Export...', type: 'loading', progress: 0 });
    
    const processedFiles: { name: string; blob: Blob }[] = [];
    
    try {
      // Process in batches to speed up
      const batchSize = 4;
      for (let i = 0; i < bulkFiles.length; i += batchSize) {
          const batch = bulkFiles.slice(i, i + batchSize);
          const promises = batch.map(async (file) => {
              if (file.buffer) {
                  const processed = await generateTaggedBuffer(file.buffer);
                  const blob = bufferToWav(processed);
                  return { name: `TAGGED_${file.name}.wav`, blob };
              }
              return null;
          });
          
          const results = await Promise.all(promises);
          results.forEach(r => { if(r) processedFiles.push(r); });
          
          const progress = Math.round(((i + batch.length) / bulkFiles.length) * 100);
           updateToast(toastId, { 
             title: `Processing...`, 
             message: `${Math.min(i + batchSize, bulkFiles.length)} / ${bulkFiles.length} files`,
             progress 
          });
      }

      updateToast(toastId, { title: 'Zipping Files...', message: 'Almost done...', progress: 99 });
      const zipBlob = await generateZip(processedFiles);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'BEATBOY_BULK_EXPORT.zip';
      a.click();
      URL.revokeObjectURL(url);
      removeToast(toastId);
      showSuccessToast('Bulk Export Complete', 'ZIP file downloaded.');
    } catch (e) {
      updateToast(toastId, { type: 'error', title: 'Export Failed', message: 'An error occurred.' });
    }
  };

  // --- Video Generator Engine ---

  const drawVideoFrame = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, dataArray: Uint8Array, timeDataArray: Uint8Array) => {
     // 0. Audio Analysis for Pulse/Reactivity
     let bassSum = 0;
     for(let i=0; i<6; i++) bassSum += dataArray[i];
     const bass = bassSum / 6; 
     const pulse = 1 + (bass / 255) * 0.15;
     
     const cx = width / 2;
     const cy = height / 2;

     // 1. Clear / Motion Blur
     if (videoSettings.motionBlur && videoSettings.backgroundType !== 'video') {
         ctx.fillStyle = 'rgba(0,0,0,0.15)';
         ctx.fillRect(0,0,width,height);
     } else {
         if(videoSettings.backgroundType !== 'video') ctx.clearRect(0, 0, width, height);
     }

     // 2. Background Layer
     ctx.save();
     if (videoSettings.backgroundType === 'video' && bgVideoRef.current) {
        try {
            ctx.drawImage(bgVideoRef.current, 0, 0, width, height);
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; // Dim video bg for visualizer pop
            ctx.fillRect(0,0,width,height);
        } catch(e) {}
     } else if (videoSettings.backgroundUrl) {
        const img = new Image();
        img.src = videoSettings.backgroundUrl;
        if(img.complete) {
            const ratio = Math.max(width / img.width, height / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            const bgZoom = 1 + (bass/255)*0.05;
            const zw = w * bgZoom;
            const zh = h * bgZoom;
            
            ctx.filter = 'blur(20px) brightness(0.4)';
            ctx.drawImage(img, (width-zw)/2, (height-zh)/2, zw, zh);
            ctx.filter = 'none';
        }
     } else {
         const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width,height));
         gradient.addColorStop(0, '#1f1f22'); 
         gradient.addColorStop(1, '#09090b'); 
         ctx.fillStyle = gradient;
         ctx.fillRect(0, 0, width, height);
     }
     ctx.restore();

     // 3. Visualizer Layer
     
     if (videoSettings.visualizer === 'particles') {
         // Improved Particles
         if (bass > 200 || Math.random() > 0.8) {
             particlesRef.current.push({
                 x: Math.random() * width,
                 y: height + 20,
                 vx: (Math.random() - 0.5) * 4,
                 vy: -Math.random() * 10 - (bass / 15),
                 size: Math.random() * 5 + 1,
                 color: `hsla(${time/10 % 360}, 70%, 60%, 1)`,
                 life: 1.0
             });
         }
         
         ctx.globalCompositeOperation = 'screen';
         for (let i = particlesRef.current.length - 1; i >= 0; i--) {
             const p = particlesRef.current[i];
             p.x += p.vx;
             p.y += p.vy;
             p.life -= 0.02;
             
             if(p.life <= 0) {
                 particlesRef.current.splice(i, 1);
                 continue;
             }

             ctx.fillStyle = p.color;
             ctx.globalAlpha = p.life;
             ctx.beginPath();
             ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
             ctx.fill();
         }
         ctx.globalCompositeOperation = 'source-over';
         ctx.globalAlpha = 1;

     } else if (videoSettings.visualizer === 'trap-nation') {
         const radius = Math.min(width, height) * 0.25 * pulse;
         const bars = 120;
         const step = (Math.PI * 2) / bars;
         
         ctx.strokeStyle = '#fff';
         ctx.lineWidth = 4;
         ctx.lineCap = 'round';
         ctx.shadowBlur = 15;
         ctx.shadowColor = 'rgba(255,255,255,0.5)';

         for (let i = 0; i < bars; i++) {
             const dataIndex = i < bars/2 ? i : bars - i;
             const val = dataArray[dataIndex * 2] || 0;
             const barLen = (val / 255) * (Math.min(width,height) * 0.3);
             
             const ang = i * step - Math.PI/2;
             const x1 = cx + Math.cos(ang) * (radius + 10);
             const y1 = cy + Math.sin(ang) * (radius + 10);
             const x2 = cx + Math.cos(ang) * (radius + 10 + barLen);
             const y2 = cy + Math.sin(ang) * (radius + 10 + barLen);
             
             ctx.beginPath();
             ctx.moveTo(x1, y1);
             ctx.lineTo(x2, y2);
             ctx.strokeStyle = `hsla(${i/bars * 360 + time/20}, 80%, 60%, 0.8)`;
             ctx.stroke();
         }
         ctx.shadowBlur = 0;

     } else if (videoSettings.visualizer === 'eclipse') {
         const radius = Math.min(width, height) * 0.25 * pulse;
         ctx.save();
         ctx.translate(cx, cy);
         ctx.rotate(time / 5000);
         const rays = 32;
         ctx.fillStyle = `hsla(${time/20}, 70%, 50%, 0.2)`;
         for(let i=0; i<rays; i++) {
             const val = dataArray[i*4];
             const len = (val/255) * (Math.min(width,height)*0.8);
             ctx.rotate((Math.PI*2)/rays);
             ctx.beginPath();
             ctx.moveTo(0,0);
             ctx.lineTo(10, radius + len);
             ctx.lineTo(-10, radius + len);
             ctx.fill();
         }
         ctx.restore();

     } else if (videoSettings.visualizer === 'matrix') {
         ctx.fillStyle = '#0f0';
         ctx.font = '20px monospace';
         const cols = Math.floor(width / 20);
         for (let i=0; i<cols; i++) {
             const val = dataArray[i % 128] || 0;
             if (Math.random() > 0.95) {
                 const x = i * 20;
                 const speed = (val/255) * 20 + 5;
                 const grad = ctx.createLinearGradient(x, (time/2 * speed) % height, x, ((time/2 * speed) % height) - 100);
                 grad.addColorStop(0, '#0f0');
                 grad.addColorStop(1, 'transparent');
                 ctx.fillStyle = grad;
                 ctx.fillRect(x, ((time/2 * speed) % height) - 100, 15, 100);
             }
         }

     } else if (videoSettings.visualizer === 'oscilloscope') {
         ctx.lineWidth = 6;
         ctx.lineCap = 'round';
         ctx.lineJoin = 'round';
         ctx.strokeStyle = '#00f0ff';
         ctx.shadowColor = '#00f0ff';
         ctx.shadowBlur = 20;
         
         ctx.beginPath();
         const sliceW = width / timeDataArray.length;
         let x = 0;
         for(let i=0; i<timeDataArray.length; i++) {
             const v = timeDataArray[i] / 128.0;
             const y = v * height/2; 
             if(i===0) ctx.moveTo(x,y);
             else ctx.lineTo(x,y);
             x += sliceW;
         }
         ctx.stroke();
         ctx.shadowBlur = 0;
     } else if (videoSettings.visualizer === 'bars') {
         const barW = (width / 64);
         const gap = 2;
         for(let i=0; i<64; i++) {
             const val = dataArray[i*2];
             const barH = (val / 255) * (height * 0.6);
             const x = i * (barW + gap);
             
             const grad = ctx.createLinearGradient(0, height, 0, height - barH);
             grad.addColorStop(0, '#ec4899'); // Pink
             grad.addColorStop(1, '#8b5cf6'); // Violet
             ctx.fillStyle = grad;
             ctx.fillRect(x, height - barH, barW, barH);
         }
     } else if (videoSettings.visualizer === 'dual-bars') {
         const barW = (width / 64);
         const gap = 2;
         const mid = height / 2;
         for(let i=0; i<64; i++) {
             const val = dataArray[i*2];
             const barH = (val / 255) * (height * 0.3);
             const x = i * (barW + gap);
             
             ctx.fillStyle = '#10b981';
             ctx.fillRect(x, mid - barH, barW, barH);
             ctx.fillStyle = 'rgba(16,185,129,0.3)';
             ctx.fillRect(x, mid, barW, barH);
         }
     }

     // 4. Center Artwork
     const artRadius = Math.min(width, height) * 0.25; 
     const displayRadius = artRadius * pulse;
     
     ctx.save();
     ctx.translate(cx, cy);
     ctx.shadowColor = 'rgba(0,0,0,0.8)';
     ctx.shadowBlur = 30 * pulse;
     
     ctx.beginPath();
     if (videoSettings.visualizer === 'trap-nation' || videoSettings.visualizer === 'eclipse') {
         ctx.arc(0, 0, displayRadius, 0, Math.PI*2);
     } else {
         const r = displayRadius;
         const corner = 20 * pulse;
         ctx.roundRect(-r, -r, r*2, r*2, corner);
     }
     ctx.save();
     ctx.clip();
     
     if (artwork) {
         const img = new Image(); img.src = artwork;
         if (img.complete) ctx.drawImage(img, -displayRadius, -displayRadius, displayRadius*2, displayRadius*2);
     } else {
         ctx.fillStyle = '#18181b';
         ctx.fill();
         ctx.fillStyle = '#27272a';
         ctx.font = `${displayRadius}px sans-serif`;
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         ctx.fillText('♫', 0, 0);
     }
     ctx.restore(); // End Clip
     
     ctx.lineWidth = 4;
     ctx.strokeStyle = videoSettings.visualizer === 'trap-nation' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)';
     ctx.stroke();
     ctx.restore(); // Restore Translation

     // 5. Logo
     if (videoSettings.logoUrl) {
         const img = new Image(); img.src = videoSettings.logoUrl;
         if (img.complete) {
             const baseSize = 120;
             const scale = videoSettings.logoScale || 1;
             const logoW = baseSize * scale;
             const logoH = (img.height/img.width) * logoW;
             
             // X, Y are 0-1 percentages
             const x = (videoSettings.logoX || 0.05) * width;
             const y = (videoSettings.logoY || 0.05) * height;
             
             ctx.drawImage(img, x, y, logoW, logoH);
         }
     }

     // 6. Text Overlays
     videoSettings.overlays.forEach(overlay => {
         if (overlay.visible && overlay.text) {
             ctx.save();
             const scaleFactor = width / 1920; 
             const fontSize = overlay.fontSize * scaleFactor;
             ctx.font = `900 ${fontSize}px ${videoSettings.fontFamily}, sans-serif`;
             
             const x = overlay.x * width;
             const y = overlay.y * height;
             
             // Price Card Badge
             if (overlay.id === 'price') {
                 const metrics = ctx.measureText(overlay.text);
                 const paddingH = fontSize * 0.8;
                 const paddingV = fontSize * 0.4;
                 const bgW = metrics.width + paddingH * 2;
                 const bgH = fontSize * 1.6;
                 
                 ctx.shadowColor = 'rgba(0,0,0,0.5)';
                 ctx.shadowBlur = 20;
                 ctx.shadowOffsetY = 5;

                 // Draw Badge
                 ctx.fillStyle = '#dc2626'; // Red
                 ctx.beginPath();
                 ctx.roundRect(x - bgW/2, y - bgH/2, bgW, bgH, bgH/2);
                 ctx.fill();
                 
                 // Text color (White on Red)
                 ctx.fillStyle = '#ffffff';
             } else {
                 ctx.fillStyle = overlay.color;
                 ctx.shadowColor = 'rgba(0,0,0,0.8)';
                 ctx.shadowBlur = 8;
                 ctx.shadowOffsetX = 2;
                 ctx.shadowOffsetY = 2;
             }

             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillText(overlay.text, x, y);
             ctx.restore();
         }
     });
     
     // 7. Grid Overlay (Editor Only)
     if (videoSettings.showGrid && !videoSettings.isGenerating) {
         ctx.save();
         ctx.strokeStyle = '#06b6d4'; // Cyan
         ctx.lineWidth = 1;
         ctx.globalAlpha = 0.3;
         const gridStepX = width * 0.1;
         const gridStepY = height * 0.1;
         
         ctx.beginPath();
         for(let x = 0; x <= width; x += gridStepX) {
             ctx.moveTo(x, 0); ctx.lineTo(x, height);
         }
         for(let y = 0; y <= height; y += gridStepY) {
             ctx.moveTo(0, y); ctx.lineTo(width, y);
         }
         ctx.stroke();
         ctx.restore();
     }

     // 8. Post-Processing Filters
     // FIX: Use min(width, height) for radius to support 9:16
     const minDim = Math.min(width, height);

     if (videoSettings.colorGrade === 'noir') {
         const idata = ctx.getImageData(0,0,width,height);
         const data = idata.data;
         for(let i=0; i<data.length; i+=4) {
             if(Math.random() > 0.9) {
                 const v = Math.random() * 50;
                 data[i] = Math.min(255, data[i]+v);
                 data[i+1] = Math.min(255, data[i+1]+v);
                 data[i+2] = Math.min(255, data[i+2]+v);
             }
         }
         ctx.putImageData(idata, 0, 0);
         
         const grad = ctx.createRadialGradient(cx, cy, minDim*0.4, cx, cy, minDim*0.8);
         grad.addColorStop(0, 'transparent');
         grad.addColorStop(1, 'rgba(0,0,0,0.8)');
         ctx.fillStyle = grad;
         ctx.fillRect(0,0,width,height);
     }
     
     if (videoSettings.colorGrade === 'dreamy') {
         const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * 1.5);
         grad.addColorStop(0, 'rgba(255,255,255,0.1)');
         grad.addColorStop(1, 'transparent');
         ctx.fillStyle = grad;
         ctx.globalCompositeOperation = 'overlay';
         ctx.fillRect(0,0,width,height);
         ctx.globalCompositeOperation = 'source-over';
     }
     
     if (videoSettings.colorGrade === 'vhs') {
         // Simple RGB Split (Chromatic Aberration)
         const idata = ctx.getImageData(0,0,width,height);
         const data = idata.data;
         const offset = 4 * 10; // 10 pixels roughly
         const copy = new Uint8ClampedArray(data);
         for(let i=0; i<data.length; i+=4) {
             if (i+offset < data.length) data[i] = copy[i+offset]; // R
         }
         ctx.putImageData(idata, 0, 0);
         
         // Scanlines
         ctx.fillStyle = 'rgba(0,0,0,0.1)';
         for(let y=0; y<height; y+=4) {
             ctx.fillRect(0,y,width,2);
         }
     }
  };

  const resetVideoState = () => {
      setVideoSettings(prev => ({
          ...prev,
          isGenerating: false,
          previewUrl: null
      }));
  };

  // --- Realtime Preview Loop ---
  useEffect(() => {
     // Run loop if generating OR previewing live (no generated URL yet) OR expanded
     if (videoSettings.previewUrl && !isExpandedPreview) return;
     if (videoSettings.isGenerating) return;

     const canvas = previewCanvasRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext('2d', { willReadFrequently: true });
     if (!ctx) return;

     const loop = (time: number) => {
         const renderW = videoSettings.aspectRatio === '16:9' ? 640 : 360;
         const renderH = videoSettings.aspectRatio === '16:9' ? 360 : 640;
         
         const scale = isExpandedPreview ? 2 : 1;
         const finalW = renderW * scale;
         const finalH = renderH * scale;

         if (canvas.width !== finalW) canvas.width = finalW;
         if (canvas.height !== finalH) canvas.height = finalH;

         const dataArray = new Uint8Array(256);
         const timeDataArray = new Uint8Array(256);

         if (analyserRef.current && isPlaying) {
             analyserRef.current.getByteFrequencyData(dataArray);
             analyserRef.current.getByteTimeDomainData(timeDataArray);
             
             // --- Logo Animation (Red Bounce) ---
             let bassSum = 0;
             for(let i=0; i<4; i++) bassSum += dataArray[i];
             const bass = bassSum / 4;
             if (logoRef.current) {
                 const scale = 1 + (bass / 255) * 0.15;
                 logoRef.current.style.transform = `scale(${scale})`;
                 // Glow Effect from active theme
                 logoRef.current.style.boxShadow = `0 0 ${bass/2}px var(--accent)`;
                 logoRef.current.style.borderColor = `var(--accent-dim)`;
             }

         } else {
             for(let i=0; i<256; i++) {
                 dataArray[i] = 10;
                 timeDataArray[i] = 128;
             }
             if (logoRef.current) {
                 logoRef.current.style.transform = 'scale(1)';
                 logoRef.current.style.boxShadow = 'none';
                 logoRef.current.style.borderColor = 'rgba(255,255,255,0.1)';
             }
         }

         drawVideoFrame(ctx, finalW, finalH, time, dataArray, timeDataArray);
         previewRequestRef.current = requestAnimationFrame(loop);
     };

     previewRequestRef.current = requestAnimationFrame(loop);
     return () => cancelAnimationFrame(previewRequestRef.current);
  }, [videoSettings, isPlaying, artwork, isExpandedPreview]);


  const handlePreviewPointerDown = (e: React.PointerEvent) => {
     if (!previewCanvasRef.current) return;
     const canvas = previewCanvasRef.current;
     const rect = canvas.getBoundingClientRect();
     const x = (e.clientX - rect.left) / rect.width;
     const y = (e.clientY - rect.top) / rect.height;

     const hit = videoSettings.overlays.find(o => {
         if (!o.visible) return false;
         const dx = x - o.x;
         const dy = y - o.y;
         return Math.sqrt(dx*dx + dy*dy) < 0.1;
     });

     if (hit) {
         draggingOverlayRef.current = hit.id;
         e.currentTarget.setPointerCapture(e.pointerId);
     }
  };

  const handlePreviewPointerMove = (e: React.PointerEvent) => {
      if (!previewCanvasRef.current) return;
      const canvas = previewCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const rawX = (e.clientX - rect.left) / rect.width;
      const rawY = (e.clientY - rect.top) / rect.height;

      if (!draggingOverlayRef.current) {
          const hit = videoSettings.overlays.find(o => o.visible && Math.sqrt(Math.pow(rawX-o.x,2) + Math.pow(rawY-o.y,2)) < 0.1);
          canvas.style.cursor = hit ? 'move' : 'default';
          return;
      }

      let x = Math.max(0.05, Math.min(0.95, rawX));
      let y = Math.max(0.05, Math.min(0.95, rawY));

      // Snapping Logic
      if (videoSettings.snapToGrid) {
          const snapThreshold = 0.05;
          const gridSize = 0.1;
          const nearestX = Math.round(x / gridSize) * gridSize;
          const nearestY = Math.round(y / gridSize) * gridSize;
          if (Math.abs(x - nearestX) < snapThreshold) x = nearestX;
          if (Math.abs(y - nearestY) < snapThreshold) y = nearestY;
      }

      setVideoSettings(prev => ({
          ...prev,
          overlays: prev.overlays.map(o => o.id === draggingOverlayRef.current ? { ...o, x, y } : o)
      }));
  };

  const handlePreviewPointerUp = (e: React.PointerEvent) => {
      draggingOverlayRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // --- Generation Logic ---

  const generateSocialVideo = async () => {
     if (!activeFile?.buffer) return;
     stopAudio();
     setVideoSettings(prev => ({ ...prev, isGenerating: true }));
     const toastId = 'video-gen';
     addToast({ id: toastId, title: 'Rendering Video...', type: 'loading', progress: 0 });

     const width = videoSettings.aspectRatio === '16:9' ? 1920 : 1080;
     const height = videoSettings.aspectRatio === '16:9' ? 1080 : 1920;
     const fps = 30;

     if (audioCtxRef.current?.state === 'suspended') await audioCtxRef.current.resume();

     const processedAudio = await generateTaggedBuffer(activeFile.buffer);
     
     const canvas = document.createElement('canvas');
     canvas.width = width;
     canvas.height = height;
     const ctx = canvas.getContext('2d');
     
     const dest = audioCtxRef.current!.createMediaStreamDestination();
     const source = audioCtxRef.current!.createBufferSource();
     source.buffer = processedAudio;
     source.connect(dest);

     const canvasStream = canvas.captureStream(fps);
     const combinedStream = new MediaStream([
         ...canvasStream.getVideoTracks(),
         ...dest.stream.getAudioTracks()
     ]);

     const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') ? 'video/webm; codecs=vp9' : 'video/webm';
     const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5000000 }); // 5Mbps
     const chunks: Blob[] = [];
     
     recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
     recorder.onstop = () => {
         const blob = new Blob(chunks, { type: 'video/webm' });
         const url = URL.createObjectURL(blob);
         setVideoSettings(prev => ({ ...prev, isGenerating: false, previewUrl: url }));
         removeToast(toastId);
         showSuccessToast('Video Ready', 'Preview generated successfully.');
     };

     source.start();
     recorder.start();
     
     if (videoSettings.backgroundType === 'video' && bgVideoRef.current) {
         bgVideoRef.current.currentTime = 0;
         bgVideoRef.current.play();
     }

     const analyser = audioCtxRef.current!.createAnalyser();
     analyser.fftSize = 512;
     source.connect(analyser);
     const dataArray = new Uint8Array(analyser.frequencyBinCount);
     const timeDataArray = new Uint8Array(analyser.frequencyBinCount);

     const renderDurationSec = videoSettings.videoDuration > 0 ? videoSettings.videoDuration : processedAudio.duration;
     const durationMs = renderDurationSec * 1000;
     
     const startTime = performance.now();

     const render = () => {
         const elapsed = performance.now() - startTime;
         const progress = Math.min(100, (elapsed / durationMs) * 100);
         updateToast(toastId, { progress });

         if (elapsed > durationMs) {
             recorder.stop();
             source.stop();
             if(bgVideoRef.current) bgVideoRef.current.pause();
             return;
         }
         
         analyser.getByteFrequencyData(dataArray);
         analyser.getByteTimeDomainData(timeDataArray);
         
         if (ctx) drawVideoFrame(ctx, width, height, elapsed, dataArray, timeDataArray);
         requestAnimationFrame(render);
     };
     render();
  };

  const handleDownloadThumbnail = () => {
     if (!videoSettings.previewUrl && !videoSettings.backgroundUrl && !activeFile) return;
     
     const width = 1920; 
     const height = 1080;
     const canvas = document.createElement('canvas');
     canvas.width = width;
     canvas.height = height;
     const ctx = canvas.getContext('2d');
     if(!ctx) return;

     const dataArray = new Uint8Array(256).fill(50);
     const timeDataArray = new Uint8Array(256).fill(128);
     
     drawVideoFrame(ctx, width, height, 2000, dataArray, timeDataArray);
     
     const url = canvas.toDataURL('image/png');
     const a = document.createElement('a');
     a.href = url;
     a.download = `THUMBNAIL_${videoSettings.artistName}.png`;
     a.click();
  };

  // --- Business Tools List ---
  const BUSINESS_TOOLS = [
    { id: 'contract', label: 'Contract Gen', icon: FileSignature, component: <ContractTool /> },
    { id: 'invoice', label: 'Invoice Creator', icon: FileText, component: <InvoiceTool /> },
    { id: 'price', label: 'Price Menu', icon: Menu, component: <PriceMenuTool /> },
    { id: 'splits', label: 'Split Sheet', icon: Calculator, component: <SplitSheetTool /> },
    { id: 'receipt', label: 'Receipt Gen', icon: Receipt, component: <ReceiptTool /> },
    { id: 'seo', label: 'Hashtag Gen', icon: Hash, component: <HashtagTool /> },
    { id: 'desc', label: 'Desc Builder', icon: Youtube, component: <DescriptionTool /> },
    { id: 'notes', label: 'Note Pad', icon: ScrollText, component: <NotesApp /> },
    { id: 'license', label: 'License Info', icon: ShieldCheck, component: <LicenseTool /> }
  ];

  if (isLoadingLicense) {
      return (
          <div className="h-screen w-screen bg-black flex items-center justify-center flex-col gap-4">
              <div className="w-16 h-16 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin"></div>
              <p className="text-zinc-500 text-xs tracking-widest uppercase">Initializing System...</p>
          </div>
      )
  }

  return (
    <>
    {!isActivated && <ActivationModal onSuccess={() => { setIsActivated(true); setActivationError(null); }} initialError={activationError} />}

    {isActivated && (
    <div 
        className="flex h-screen w-full bg-[var(--bg-main)] text-zinc-300 overflow-hidden font-sans select-none relative"
        style={{
            '--accent': activeTheme.colors.accent,
            '--accent-dim': activeTheme.colors.accentDim,
            '--bg-main': activeTheme.colors.bgMain,
            '--bg-panel': activeTheme.colors.bgPanel,
            '--border': activeTheme.colors.border
        } as React.CSSProperties}
    >
      
      {/* Hidden Video Element for Background Loops */}
      {videoSettings.backgroundUrl && videoSettings.backgroundType === 'video' && (
          <video 
             ref={bgVideoRef} 
             src={videoSettings.backgroundUrl} 
             className="hidden" 
             loop 
             muted 
             playsInline
             crossOrigin="anonymous"
          />
      )}

      {/* ================= MODALS & OVERLAYS ================= */}
      
      {showHelp && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-200" onClick={() => setShowHelp(false)}>
           <div className="bg-[#121214] border border-white/10 rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
               <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white" title="Close Help">
                  <X size={20} />
               </button>
               <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                 <HelpCircle className="text-[var(--accent)]" />
                 BEATBOY MANUAL
               </h2>
               <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                     <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">Shortcuts</h3>
                     <ul className="space-y-3">
                        <li className="flex items-center justify-between">
                           <span className="text-sm text-zinc-300">Play / Pause</span>
                           <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs font-mono text-zinc-400">SPACE</kbd>
                        </li>
                     </ul>
                  </div>
                  <div className="space-y-4">
                     <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">Features</h3>
                     <ul className="text-sm text-zinc-400 space-y-2 list-disc pl-4">
                        <li>Drag & Drop audio, video, fonts, and images.</li>
                        <li>Limiter: Catch peaks transparently.</li>
                        <li>Visualizers: Matrix, Eclipse, Trap Nation, etc.</li>
                        <li>Drag files OUT of the queue to your Desktop.</li>
                        <li>Drag Producer, Title & Price directly on the preview.</li>
                     </ul>
                  </div>
               </div>
               <button 
                  onClick={handleDownloadManual}
                  className="w-full bg-[var(--accent)] hover:opacity-90 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                  title="Download Manual as Text File"
               >
                   <Download size={14} /> DOWNLOAD USER GUIDE (TXT)
               </button>
           </div>
        </div>
      )}

      {/* BUSINESS TOOLS MODAL */}
      {showBusinessTools && (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-200" onClick={() => setShowBusinessTools(false)}>
           <div className="bg-[#121214] border border-[var(--border)] rounded-2xl max-w-7xl w-full h-[85vh] flex shadow-[0_0_50px_var(--accent-dim)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
               {/* Close Button */}
               <button onClick={() => setShowBusinessTools(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white z-10" title="Close Business Tools">
                  <X size={20} />
               </button>

               {/* Sidebar */}
               <div className="w-64 bg-black/40 border-r border-white/5 p-4 flex flex-col gap-2 overflow-y-auto">
                   <div className="flex items-center gap-3 mb-4 px-2">
                       <div className="p-2 bg-[var(--accent-dim)] rounded-lg">
                           <Briefcase className="text-[var(--accent)]" size={20} />
                       </div>
                       <h2 className="text-lg font-bold text-white tracking-tight leading-none">BUSINESS<br/><span className="text-[var(--accent)]">TOOLS</span></h2>
                   </div>
                   {BUSINESS_TOOLS.map(tool => (
                       <button
                          key={tool.id}
                          onClick={() => setActiveTool(tool.id)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTool === tool.id ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
                       >
                           <tool.icon size={14} />
                           {tool.label}
                       </button>
                   ))}
               </div>

               {/* Content Area */}
               <div className="flex-1 p-8 bg-gradient-to-br from-[#121214] to-black flex flex-col min-w-0">
                   <div className="mb-6 pb-4 border-b border-white/5 shrink-0">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            {React.createElement(BUSINESS_TOOLS.find(t => t.id === activeTool)?.icon || Briefcase, { size: 24, className: 'text-[var(--accent)]' })}
                            {BUSINESS_TOOLS.find(t => t.id === activeTool)?.label}
                        </h3>
                   </div>
                   <div className="flex-1 min-h-0 overflow-hidden">
                        {BUSINESS_TOOLS.find(t => t.id === activeTool)?.component}
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* TOAST CONTAINER */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-[100] pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl w-80 pointer-events-auto animate-in slide-in-from-right-10 fade-in duration-300">
             <div className="flex items-start gap-3">
                {toast.type === 'loading' && <Loader2 className="animate-spin text-[var(--accent)] shrink-0" size={20} />}
                {toast.type === 'success' && <CheckCircle2 className="text-[var(--accent)] shrink-0" size={20} />}
                {toast.type === 'error' && <AlertCircle className="text-[var(--accent)] shrink-0" size={20} />}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white">{toast.title}</h4>
                    {toast.message && <p className="text-xs text-zinc-400 mt-1 truncate">{toast.message}</p>}
                    {typeof toast.progress === 'number' && (
                       <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-[var(--accent)] transition-all duration-200" style={{ width: `${toast.progress}%` }} />
                       </div>
                    )}
                </div>
                {toast.type !== 'loading' && (
                    <button onClick={() => removeToast(toast.id)} className="text-zinc-500 hover:text-white" title="Close Toast">
                        <X size={16} />
                    </button>
                )}
             </div>
          </div>
        ))}
      </div>

      {/* ================= LEFT PANEL: FILE MANAGER ================= */}
      <div className="w-72 bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-gradient-to-r from-zinc-900/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-800 p-1.5 rounded-lg shadow-inner border border-white/5" ref={logoRef} style={{ transition: 'all 0.1s' }}>
                <Music size={16} className="text-[var(--accent)]" />
            </div>
            <div>
                <h1 className="text-lg font-black tracking-tight text-white leading-none font-sans drop-shadow-md">BEATBOY</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="relative">
                <button onClick={() => setShowThemeMenu(!showThemeMenu)} className="text-zinc-600 hover:text-white transition-colors" title="Change Theme">
                    <Palette size={18} />
                </button>
                {showThemeMenu && (
                    <div className="absolute top-8 left-0 w-40 bg-[#121214] border border-zinc-800 rounded-lg shadow-xl z-50 p-1">
                        {THEMES.map(theme => (
                            <button
                                key={theme.id}
                                onClick={() => { setActiveTheme(theme); setShowThemeMenu(false); }}
                                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10 rounded"
                            >
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                                {theme.name}
                            </button>
                        ))}
                    </div>
                )}
             </div>
             <button onClick={() => setShowHelp(true)} className="text-zinc-600 hover:text-white transition-colors" title="Help & Manual">
                <HelpCircle size={18} />
             </button>
          </div>
        </div>

        <div className="p-3">
           <div 
             className={`border border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer group relative overflow-hidden ${dragActive === 'bulk' ? 'border-[var(--accent)] bg-[var(--accent-dim)] shadow-[inset_0_0_20px_var(--accent-dim)]' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'}`}
             onDragEnter={e => handleDragEnter(e, 'bulk')}
             onDragLeave={handleDragLeave}
             onDragOver={e => e.preventDefault()}
             onDrop={handleBulkDrop}
           >
             <div className="relative z-10">
                 <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-colors ${dragActive === 'bulk' ? 'bg-[var(--accent)] text-white' : 'bg-zinc-800 text-zinc-500 group-hover:text-white'}`}>
                    <Upload size={14} />
                 </div>
                 <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">Drag Bulk Beats</p>
             </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
          <h3 className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2 pl-2">Queue</h3>
          {bulkFiles.length === 0 && (
             <div className="flex flex-col items-center justify-center py-8 opacity-20 space-y-2">
                <Layers size={24} />
                <p className="text-[10px] font-medium">Empty</p>
             </div>
          )}
          {bulkFiles.map((f) => (
             <div 
               key={f.id} 
               draggable="true"
               onDragStart={(e) => handleDragStart(e, f.file)}
               className={`group p-2.5 rounded-lg flex items-center justify-center transition-all border ${activeFile?.id === f.id ? 'bg-zinc-800 border-zinc-700 shadow-lg shadow-black/20' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'}`}
             >
                <div className="flex flex-col truncate w-36 cursor-pointer" onClick={() => playAudio(f)} title="Click to Play">
                   <span className={`text-[11px] font-bold truncate ${activeFile?.id === f.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}>{f.name}</span>
                   <span className="text-[9px] text-zinc-600 font-mono">{Math.floor(f.duration)}s</span>
                </div>
                <button 
                  onClick={() => {
                      if (activeFile?.id === f.id && isPlaying) stopAudio();
                      else playAudio(f);
                  }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${activeFile?.id === f.id && isPlaying ? 'bg-[var(--accent)] text-white shadow-[0_0_10px_var(--accent-dim)]' : 'bg-zinc-900 border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500'}`}
                  title={isPlaying && activeFile?.id === f.id ? "Pause" : "Play"}
                >
                  {isPlaying && activeFile?.id === f.id ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-0.5" />}
                </button>
             </div>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--border)] bg-zinc-900/50 backdrop-blur-md">
            <button 
                onClick={handleBulkExport}
                disabled={bulkFiles.length === 0}
                className="w-full group bg-white hover:bg-zinc-200 text-black py-3 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                title="Process and Download All Files"
            >
                 <Archive size={12} className="group-hover:scale-110 transition-transform" /> 
                 <span>EXPORT BUNDLE</span>
            </button>
        </div>
      </div>

      {/* ================= CENTER PANEL: WORKSTATION ================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)] relative shadow-inner overflow-hidden">
        
        {/* EQ SECTION (TOP) */}
        <div className="h-40 border-b border-[var(--border)] bg-gradient-to-b from-[#121214] to-[#0c0c0e] flex items-center justify-center px-8 shadow-md relative z-10 shrink-0">
           
           {/* BPM TAPPER LEFT */}
           <BPMButton />

           <div className="flex items-center gap-8 transform scale-90 lg:scale-100 transition-transform">
               <Knob label="Low" subLabel="60Hz" value={eqSettings.low} min={-MAX_EQ_DB} max={MAX_EQ_DB} onChange={v => setEqSettings(prev => ({...prev, low: v}))} title="Low Frequency Gain" />
               <Knob label="Low-Mid" subLabel="250Hz" value={eqSettings.lowMid} min={-MAX_EQ_DB} max={MAX_EQ_DB} onChange={v => setEqSettings(prev => ({...prev, lowMid: v}))} title="Low-Mid Frequency Gain" />
               <Knob label="Mid" subLabel="1kHz" value={eqSettings.mid} min={-MAX_EQ_DB} max={MAX_EQ_DB} onChange={v => setEqSettings(prev => ({...prev, mid: v}))} title="Mid Frequency Gain" />
               <Knob label="Hi-Mid" subLabel="5kHz" value={eqSettings.highMid} min={-MAX_EQ_DB} max={MAX_EQ_DB} onChange={v => setEqSettings(prev => ({...prev, highMid: v}))} title="High-Mid Frequency Gain" />
               <Knob label="High" subLabel="12kHz" value={eqSettings.high} min={-MAX_EQ_DB} max={MAX_EQ_DB} onChange={v => setEqSettings(prev => ({...prev, high: v}))} title="High Frequency Gain" />
           </div>

           <div className="h-16 w-px bg-gradient-to-b from-transparent via-zinc-800 to-transparent mx-8"></div>

           <div className="flex flex-col gap-3 p-3 bg-zinc-900/50 rounded-xl border border-white/5 shadow-inner">
             {/* Master Chain Controls */}
             {[
                { label: 'Fade Out', active: fadeEnding, toggle: () => setFadeEnding(!fadeEnding) },
                { label: 'Normalize', active: normalize, toggle: () => setNormalize(!normalize) },
                { label: 'Limiter', active: limiter, toggle: () => setLimiter(!limiter) }
             ].map((ctrl) => (
                <div key={ctrl.label} className="flex items-center justify-between gap-6" title={`Toggle ${ctrl.label}`}>
                    <span className="text-[9px] uppercase font-bold text-zinc-500 w-16">{ctrl.label}</span>
                    <button 
                    onClick={ctrl.toggle}
                    className={`w-9 h-5 rounded-full relative transition-all shadow-inner ${ctrl.active ? 'bg-[var(--accent)] border-transparent shadow-[0_0_15px_var(--accent-dim)]' : 'bg-zinc-800 border border-zinc-700'}`}
                    >
                    <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full shadow-md transition-all ${ctrl.active ? 'translate-x-4 bg-white shadow-sm' : 'bg-zinc-500'}`} />
                    </button>
                </div>
             ))}
           </div>
        </div>

        {/* MAIN WORKSPACE SCROLLABLE */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 flex flex-col gap-6">
                {/* WAVEFORM CONTAINER */}
                <div 
                    className={`bg-black/40 border border-[var(--border)] rounded-2xl p-6 shadow-2xl relative group overflow-hidden transition-all duration-300 min-h-[260px] flex flex-col justify-between backdrop-blur-sm ${dragActive === 'main' ? 'ring-2 ring-[var(--accent)] bg-[var(--accent-dim)]' : ''}`}
                    onDragEnter={e => handleDragEnter(e, 'main')}
                    onDragLeave={handleDragLeave}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleMainDrop}
                >
                    {activeFile && dragActive === 'main' && (
                        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm pointer-events-none">
                            <span className="text-[var(--accent)] font-bold text-lg tracking-widest border-2 border-[var(--accent)] px-4 py-2 rounded-lg animate-pulse">DROP TO REPLACE</span>
                        </div>
                    )}

                    {/* PLAYER HEADER */}
                    <div className="flex items-center justify-between mb-6 relative z-10 pointer-events-none">
                        <div className="flex items-center gap-4 pointer-events-auto" draggable={!!activeFile} onDragStart={(e) => activeFile && handleDragStart(e, activeFile.file)}>
                            <div className="w-14 h-14 bg-[#121214] rounded-xl flex items-center justify-center border border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] cursor-grab active:cursor-grabbing">
                                <Music className="text-zinc-600 drop-shadow-md" size={24} />
                            </div>
                            <div>
                                <h2 className="text-white font-black text-xl tracking-tight leading-none mb-1.5 drop-shadow-lg">{activeFile ? activeFile.name : "Load Main Audio"}</h2>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded border border-white/5">
                                        <Clock size={10} className="text-[var(--accent)]"/>
                                        <span className="text-[var(--accent)] text-[11px] font-mono tracking-wide">
                                            {formatTime(currentTime)}
                                        </span>
                                    </div>
                                    <span className="text-zinc-700 text-[10px] font-bold">/</span>
                                    <span className="text-zinc-500 text-[11px] font-mono">
                                        {activeFile ? formatTime(activeFile.duration) : "00:00"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button 
                            id="play-pause-btn"
                            onClick={() => isPlaying ? stopAudio() : playAudio()}
                            disabled={!activeFile}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] active:scale-95 disabled:opacity-20 pointer-events-auto border border-white/10 ${isPlaying ? 'bg-zinc-900 text-[var(--accent)] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]' : 'bg-[var(--accent)] text-white hover:opacity-90'}`}
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                    </div>

                    {/* WAVEFORM VISUAL */}
                    <div className="relative rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl h-full min-h-[140px] bg-black/60">
                        {!activeFile && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center transition-all pointer-events-none">
                                <label className="cursor-pointer flex flex-col items-center group/label pointer-events-auto">
                                    <input type="file" className="hidden" onChange={handleMainDrop} accept="audio/*" />
                                    <div className={`w-16 h-16 rounded-full bg-zinc-800 border-2 flex items-center justify-center mb-3 transition-all shadow-xl ${dragActive === 'main' ? 'border-[var(--accent)] scale-110' : 'border-zinc-700 group-hover/label:border-zinc-500 group-hover/label:scale-105'}`}>
                                        <Upload className={dragActive === 'main' ? 'text-[var(--accent)]' : 'text-zinc-400'} size={24} />
                                    </div>
                                    <span className={`text-xs font-bold tracking-wide transition-colors ${dragActive === 'main' ? 'text-[var(--accent)]' : 'text-zinc-300'}`}>
                                        DRAG MAIN BEAT
                                    </span>
                                </label>
                            </div>
                        )}
                        <Waveform 
                            buffer={activeFile?.buffer || null} 
                            currentTime={currentTime} 
                            duration={activeFile?.duration || 1} 
                            onScrub={handleScrub}
                            onScrubStart={handleScrubStart}
                            onScrubEnd={handleScrubEnd}
                            isPlaying={isPlaying}
                        />
                    </div>
                </div>

                {/* SPLIT SECTION: TAGGING & ARTWORK (COMPACT) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-56 shrink-0">
                    
                    {/* TAGGING */}
                    <div className="bg-[#121214] border border-[var(--border)] rounded-xl p-4 flex flex-col shadow-lg relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="p-1 bg-[var(--accent-dim)] rounded">
                                <Mic2 size={12} className="text-[var(--accent)]" />
                                </div>
                                <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Voice Tag</h3>
                            </div>
                            {tagSettings.enabled && (
                                <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-[var(--accent-dim)] rounded-full border border-[var(--accent)]">
                                    <div className="w-1 h-1 rounded-full bg-[var(--accent)] animate-pulse" />
                                    <span className="text-[8px] text-[var(--accent)] font-bold">ON</span>
                                </div>
                            )}
                        </div>

                        <div 
                            className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all relative overflow-hidden mb-3 ${dragActive === 'tag' ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-zinc-800 hover:border-zinc-600 hover:bg-white/5'}`}
                            onDragEnter={e => handleDragEnter(e, 'tag')}
                            onDragLeave={handleDragLeave}
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleTagDrop}
                        >
                            {tagBuffer ? (
                                <div className="w-full h-full flex flex-col justify-center items-center relative p-2 bg-black/40">
                                    <div className="absolute top-2 right-2 z-20">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setTagBuffer(null); setTagName(null); setTagSettings(s=>({...s, enabled:false})); }}
                                            className="p-1 bg-[var(--accent)] hover:opacity-90 rounded text-white"
                                            title="Remove Tag"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                    {/* GLOWING TEXT VISUAL */}
                                    <div className="text-center px-4">
                                        <div className="text-[var(--accent)] font-black text-xl tracking-tight drop-shadow-[0_0_15px_var(--accent-dim)] truncate max-w-[200px]">
                                            {tagName || "VOICE TAG"}
                                        </div>
                                        <div className="text-[9px] text-[var(--accent)] font-mono mt-1 tracking-widest">TAG LOADED</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center z-10 pointer-events-none">
                                    <p className={`text-[10px] font-bold mb-0.5 transition-colors ${dragActive === 'tag' ? 'text-[var(--accent)]' : 'text-zinc-500'}`}>DRAG TAG</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-white/5">
                            {[15, 20, 30].map(sec => (
                                <button 
                                key={sec}
                                onClick={() => setTagSettings(prev => ({...prev, interval: sec as any}))}
                                className={`flex-1 py-1.5 text-[9px] font-bold rounded-md transition-all border shadow-sm ${tagSettings.interval === sec ? 'bg-zinc-200 text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'bg-transparent text-zinc-500 border-transparent hover:bg-white/5 hover:text-zinc-300'}`}
                                >
                                    {sec}s
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ARTWORK */}
                    <div className="bg-[#121214] border border-[var(--border)] rounded-xl p-4 flex flex-col shadow-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1 bg-purple-500/10 rounded">
                                <ImageIcon size={12} className="text-purple-500" />
                            </div>
                            <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Cover Art</h3>
                        </div>

                        <div className="flex gap-4 h-full">
                            <div 
                                className={`flex-1 rounded-lg overflow-hidden relative group border-2 transition-all ${dragActive === 'art' ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-zinc-800 bg-zinc-900'}`}
                                onDragEnter={e => handleDragEnter(e, 'art')}
                                onDragLeave={handleDragLeave}
                                onDragOver={e => e.preventDefault()}
                                onDrop={handleArtworkDrop}
                            >
                                {artwork ? (
                                    <>
                                        <img src={artwork} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button 
                                                onClick={() => setArtwork(null)} 
                                                className="p-1.5 bg-[var(--accent)] hover:opacity-90 rounded-full text-white backdrop-blur-sm transition-transform hover:scale-110"
                                                title="Remove Artwork"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950">
                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 transition-colors ${dragActive === 'art' ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-800 bg-zinc-900'}`}>
                                            <ImageIcon size={14} className={dragActive === 'art' ? 'text-purple-500' : 'text-zinc-600'} />
                                        </div>
                                        <span className={`text-[9px] font-bold ${dragActive === 'art' ? 'text-purple-400' : 'text-zinc-600'}`}>ARTWORK</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col justify-center space-y-3">
                                <div className="p-2 bg-zinc-900/50 border border-zinc-800 rounded text-[9px] text-zinc-500 leading-relaxed">
                                    Drag custom fonts and logos in the right panel. Customize text in "Text" tab.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* SPACER for Button */}
                <div className="h-10"></div>
            </div>
        </div>
        
        {/* BUSINESS TOOLS FOOTER BUTTON (FIXED POS IN FLEX) */}
        <div className="p-4 bg-[var(--bg-main)] border-t border-[var(--border)] flex items-center justify-center z-20 shrink-0">
             <button 
                  onClick={() => setShowBusinessTools(true)}
                  className="px-8 py-2.5 bg-[#121214] border border-[var(--accent)] rounded-full hover:bg-[var(--accent-dim)] transition-all flex items-center gap-2 group shadow-lg shadow-black/40"
                  title="Open Business Suite"
              >
                  <Briefcase size={16} className="text-[var(--accent)] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-[var(--accent)] tracking-wider">BUSINESS TOOLS</span>
              </button>
        </div>

      </div>

      {/* ================= RIGHT PANEL: ACTIONS & VIDEO ================= */}
      <div className="w-72 bg-[var(--bg-panel)] border-l border-[var(--border)] flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.5)] z-20">
         
         <div className="p-5 border-b border-[var(--border)] bg-gradient-to-l from-zinc-900/50 to-transparent">
            <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Export Single</h3>
            <button 
              onClick={handleExportSingle}
              disabled={!activeFile}
              className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none text-xs"
              title="Download current file as WAV"
            >
               <Download size={14} /> DOWNLOAD WAV
            </button>
         </div>

         <div className="flex-1 p-5 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                  <Film size={12} className="text-zinc-400" />
                  <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Video Studio</h3>
               </div>
               <div className="flex items-center gap-2">
                  <button 
                       onClick={() => resetVideoState()}
                       className="text-zinc-500 hover:text-[var(--accent)] transition-colors"
                       title="Reset Video"
                   >
                       <RefreshCw size={14} />
                   </button>
                   <button 
                       onClick={() => setIsExpandedPreview(true)}
                       className="text-zinc-500 hover:text-white transition-colors"
                       title="Maximize Editor"
                   >
                       <Maximize2 size={14} />
                   </button>
               </div>
            </div>

            {/* Video Tab Switcher */}
            <div className="flex bg-zinc-900 p-1 rounded-lg mb-4 border border-zinc-800">
               <button onClick={() => setVideoTab('visual')} className={`flex-1 py-1.5 text-[9px] font-bold rounded flex items-center justify-center gap-1 transition-all ${videoTab === 'visual' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-600'}`} title="Visual Settings">
                 <Sparkles size={10} /> VISUAL
               </button>
               <button onClick={() => setVideoTab('text')} className={`flex-1 py-1.5 text-[9px] font-bold rounded flex items-center justify-center gap-1 transition-all ${videoTab === 'text' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-600'}`} title="Text Overlays">
                 <Type size={10} /> TEXT
               </button>
               <button onClick={() => setVideoTab('assets')} className={`flex-1 py-1.5 text-[9px] font-bold rounded flex items-center justify-center gap-1 transition-all ${videoTab === 'assets' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-600'}`} title="Assets & Logos">
                 <Layers size={10} /> ASSETS
               </button>
            </div>

            {/* EXPANDED VIDEO OVERLAY (MODAL) */}
            {isExpandedPreview && (
                <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
                        <div className="flex items-center gap-3">
                           <Film className="text-[var(--accent)]" />
                           <h2 className="text-white font-bold tracking-widest">VIDEO EDITOR</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Editor Tools in Modal */}
                            <div className="flex items-center gap-2 bg-zinc-800 p-1 rounded-lg border border-zinc-700">
                                <button 
                                    onClick={() => setVideoSettings(p => ({...p, showGrid: !p.showGrid}))}
                                    className={`p-2 rounded ${videoSettings.showGrid ? 'bg-[var(--accent)] text-black' : 'text-zinc-400 hover:bg-zinc-700'}`}
                                    title="Toggle Grid"
                                >
                                    <Grid size={16} />
                                </button>
                                <button 
                                    onClick={() => setVideoSettings(p => ({...p, snapToGrid: !p.snapToGrid}))}
                                    className={`p-2 rounded ${videoSettings.snapToGrid ? 'bg-[var(--accent)] text-black' : 'text-zinc-400 hover:bg-zinc-700'}`}
                                    title="Snap to Grid"
                                >
                                    <Magnet size={16} />
                                </button>
                            </div>

                            <button 
                                onClick={() => setIsExpandedPreview(false)}
                                className="bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--accent)] hover:text-white px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2"
                                title="Close Editor"
                            >
                                CLOSE EDITOR <X size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 p-8 flex items-center justify-center overflow-hidden">
                        {/* The Canvas in Expanded Mode */}
                        <div 
                           key={videoSettings.aspectRatio}
                           className={`relative shadow-2xl transition-all ${videoSettings.aspectRatio === '16:9' ? 'aspect-video w-full max-w-6xl' : 'aspect-[9/16] h-full max-h-[90vh]'}`}
                           onPointerDown={handlePreviewPointerDown}
                           onPointerMove={handlePreviewPointerMove}
                           onPointerUp={handlePreviewPointerUp}
                           onPointerLeave={handlePreviewPointerUp}
                        >
                             <canvas ref={previewCanvasRef} className="w-full h-full bg-black rounded-lg border border-white/10" />
                             <div className="absolute top-4 right-4 pointer-events-none">
                                <span className="bg-black/60 text-white/50 px-2 py-1 rounded text-xs font-mono border border-white/5">DRAG TEXT TO EDIT LAYOUT</span>
                             </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Video Preview Canvas (Sidebar Version - only shows if NOT expanded) */}
            <div 
               key={videoSettings.aspectRatio}
               className={`
                  transition-all duration-500 shadow-2xl overflow-hidden relative
                  w-full bg-black rounded-lg border border-zinc-800 mb-4 ${videoSettings.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}
                  ${isExpandedPreview ? 'hidden' : 'block'} 
               `}
               onPointerDown={handlePreviewPointerDown}
               onPointerMove={handlePreviewPointerMove}
               onPointerUp={handlePreviewPointerUp}
               onPointerLeave={handlePreviewPointerUp}
            >
               {videoSettings.previewUrl ? (
                   <video src={videoSettings.previewUrl} controls className="w-full h-full object-contain" autoPlay loop />
               ) : videoSettings.isGenerating ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/50 backdrop-blur-sm">
                      <div className="relative">
                          <div className="w-10 h-10 rounded-full border-4 border-[var(--accent-dim)] border-t-[var(--accent)] animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                              <Activity size={14} className="text-[var(--accent)]" />
                          </div>
                      </div>
                      <span className="text-[8px] text-[var(--accent)] font-mono tracking-widest animate-pulse">RENDERING...</span>
                   </div>
               ) : (
                   <>
                       <canvas ref={!isExpandedPreview ? previewCanvasRef : null} className="w-full h-full touch-none" />
                       <div className="absolute top-2 right-2 pointer-events-none">
                            <span className="text-[8px] text-white/50 font-mono bg-black/50 px-1 rounded">LIVE PREVIEW</span>
                       </div>
                   </>
               )}
            </div>

            {videoTab === 'visual' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex p-1 bg-zinc-950 rounded-lg border border-zinc-800 shadow-inner">
                        {(['16:9', '9:16'] as const).map(ratio => (
                            <button 
                                key={ratio}
                                onClick={() => setVideoSettings(prev => ({...prev, aspectRatio: ratio}))}
                                className={`flex-1 py-1.5 text-[9px] font-bold rounded-md flex items-center justify-center gap-1.5 transition-all ${videoSettings.aspectRatio === ratio ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-600 hover:text-zinc-400'}`}
                                title={`Set Aspect Ratio to ${ratio}`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase">Editor Tools</label>
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setVideoSettings(p => ({...p, showGrid: !p.showGrid}))}
                                className={`flex-1 py-1.5 rounded text-[9px] font-bold border transition-all ${videoSettings.showGrid ? 'bg-zinc-800 border-[var(--accent)] text-[var(--accent)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                             >
                                 GRID {videoSettings.showGrid ? 'ON' : 'OFF'}
                             </button>
                             <button 
                                onClick={() => setVideoSettings(p => ({...p, snapToGrid: !p.snapToGrid}))}
                                className={`flex-1 py-1.5 rounded text-[9px] font-bold border transition-all ${videoSettings.snapToGrid ? 'bg-zinc-800 border-[var(--accent)] text-[var(--accent)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                             >
                                 SNAP {videoSettings.snapToGrid ? 'ON' : 'OFF'}
                             </button>
                        </div>
                    </div>
                    
                    {/* Video Duration Slider */}
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase">Video Length</label>
                            <span className="text-[9px] font-mono text-zinc-400">{formatTime(videoSettings.videoDuration)}</span>
                        </div>
                        <input 
                            type="range" 
                            min="5" 
                            max={activeFile ? activeFile.duration : 60} 
                            step="1"
                            value={videoSettings.videoDuration}
                            disabled={!activeFile}
                            onChange={(e) => setVideoSettings(p => ({...p, videoDuration: parseFloat(e.target.value)}))}
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Visualizer</label>
                        <select 
                             value={videoSettings.visualizer}
                             onChange={(e) => setVideoSettings(p => ({...p, visualizer: e.target.value as VisualizerType}))}
                             className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-bold rounded p-2 outline-none focus:border-[var(--accent)]"
                        >
                            <option value="waveform">Classic Wave</option>
                            <option value="trap-nation">Trap Nation (Circle)</option>
                            <option value="particles">Particles</option>
                            <option value="bars">Modern Bars</option>
                            <option value="dual-bars">Mirrored Bars</option>
                            <option value="oscilloscope">Neon Line</option>
                            <option value="eclipse">Eclipse</option>
                            <option value="matrix">Matrix Rain</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                         <label className="text-[9px] font-bold text-zinc-500 uppercase">Filters & Effects</label>
                         <div className="flex items-center justify-between p-2 bg-zinc-900 rounded border border-zinc-800">
                             <span className="text-[10px] text-zinc-400 font-bold">Motion Blur</span>
                             <button onClick={() => setVideoSettings(p => ({...p, motionBlur: !p.motionBlur}))} className={`w-8 h-4 rounded-full relative transition-colors ${videoSettings.motionBlur ? 'bg-[var(--accent)]' : 'bg-zinc-700'}`}>
                                 <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${videoSettings.motionBlur ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                             </button>
                         </div>
                         <select 
                             value={videoSettings.colorGrade}
                             onChange={(e) => setVideoSettings(p => ({...p, colorGrade: e.target.value as ColorGradeType}))}
                             className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] rounded p-2 mt-2 outline-none"
                         >
                             <option value="none">No Filter</option>
                             <option value="noir">Film Noir (Grain)</option>
                             <option value="vhs">VHS Tape</option>
                             <option value="glitch">Digital Glitch</option>
                             <option value="dreamy">Dreamy Glow</option>
                             <option value="cyberpunk">Cyberpunk</option>
                             <option value="sepia">Sepia Vintage</option>
                             <option value="high-contrast">High Contrast</option>
                             <option value="bw">Black & White</option>
                             <option value="1980s">1980s Retro</option>
                         </select>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-white/5">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Audio Export Sample Rate</label>
                        <select 
                        value={targetSampleRate}
                        onChange={(e) => setTargetSampleRate(Number(e.target.value) as 44100 | 48000)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-mono rounded p-2 focus:outline-none focus:border-zinc-500"
                        >
                            <option value={44100}>44.1 kHz</option>
                            <option value={48000}>48.0 kHz</option>
                        </select>
                    </div>
                </div>
            )}

            {videoTab === 'text' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <p className="text-[9px] text-zinc-500 italic">Drag text directly on the preview to position.</p>
                    {videoSettings.overlays.map((overlay) => (
                        <div key={overlay.id} className="space-y-1 pb-4 border-b border-zinc-800 last:border-0">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase">{overlay.label}</label>
                                <button 
                                    onClick={() => setVideoSettings(prev => ({
                                        ...prev,
                                        overlays: prev.overlays.map(o => o.id === overlay.id ? { ...o, visible: !o.visible } : o)
                                    }))}
                                    className="text-zinc-600 hover:text-white"
                                    title="Toggle Visibility"
                                >
                                    {overlay.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                </button>
                            </div>
                            <input 
                                type="text"
                                value={overlay.text}
                                onChange={(e) => {
                                    if (overlay.id === 'producer') setVideoSettings(p => ({...p, artistName: e.target.value})); // Sync backward compat
                                    setVideoSettings(prev => ({
                                        ...prev,
                                        overlays: prev.overlays.map(o => o.id === overlay.id ? { ...o, text: e.target.value } : o)
                                    }))
                                }}
                                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-bold rounded p-2 outline-none focus:border-[var(--accent)]"
                                placeholder={`ENTER ${overlay.label.toUpperCase()}`}
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-zinc-600">Size</span>
                                <input 
                                    type="range" min="10" max="200"
                                    value={overlay.fontSize}
                                    onChange={(e) => setVideoSettings(prev => ({
                                        ...prev,
                                        overlays: prev.overlays.map(o => o.id === overlay.id ? { ...o, fontSize: parseInt(e.target.value) } : o)
                                    }))}
                                    className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-[9px] font-mono text-zinc-500 w-6">{overlay.fontSize}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {videoTab === 'assets' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                     {/* BG Video Drop */}
                     <div 
                        className={`h-20 border border-dashed rounded-lg flex flex-col items-center justify-center transition-all relative ${dragActive === 'bg_video' ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-zinc-800 hover:bg-zinc-900'}`}
                        onDragEnter={e => handleDragEnter(e, 'bg_video')}
                        onDragLeave={handleDragLeave}
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleBgVideoDrop}
                     >
                        <VideoIcon size={16} className="text-zinc-600 mb-1" />
                        <span className="text-[9px] font-bold text-zinc-500">DRAG BACKGROUND VIDEO</span>
                        {videoSettings.backgroundType === 'video' && videoSettings.backgroundUrl && <div className="absolute right-2 top-2 w-2 h-2 bg-[var(--accent)] rounded-full" />}
                     </div>

                     {/* Logo Drop */}
                     <div 
                        className={`h-20 border border-dashed rounded-lg flex flex-col items-center justify-center transition-all relative ${dragActive === 'logo' ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-zinc-800 hover:bg-zinc-900'}`}
                        onDragEnter={e => handleDragEnter(e, 'logo')}
                        onDragLeave={handleDragLeave}
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleLogoDrop}
                     >
                        <Aperture size={16} className="text-zinc-600 mb-1" />
                        <span className="text-[9px] font-bold text-zinc-500">DRAG LOGO (PNG)</span>
                        {videoSettings.logoUrl && <div className="absolute right-2 top-2 w-2 h-2 bg-[var(--accent)] rounded-full" />}
                     </div>

                     {/* Logo Controls */}
                     {videoSettings.logoUrl && (
                         <div className="space-y-2 p-2 bg-zinc-900 rounded border border-zinc-800">
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] text-zinc-500 w-8">Scale</span>
                                <input type="range" min="0.1" max="3" step="0.1" value={videoSettings.logoScale} onChange={e => setVideoSettings(p=>({...p, logoScale: parseFloat(e.target.value)}))} className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] text-zinc-500 w-8">Pos X</span>
                                <input type="range" min="0" max="1" step="0.01" value={videoSettings.logoX} onChange={e => setVideoSettings(p=>({...p, logoX: parseFloat(e.target.value)}))} className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] text-zinc-500 w-8">Pos Y</span>
                                <input type="range" min="0" max="1" step="0.01" value={videoSettings.logoY} onChange={e => setVideoSettings(p=>({...p, logoY: parseFloat(e.target.value)}))} className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                             </div>
                         </div>
                     )}

                     {/* Font Drop */}
                     <div 
                        className={`h-20 border border-dashed rounded-lg flex flex-col items-center justify-center transition-all relative ${dragActive === 'font' ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-zinc-800 hover:bg-zinc-900'}`}
                        onDragEnter={e => handleDragEnter(e, 'font')}
                        onDragLeave={handleDragLeave}
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleFontDrop}
                     >
                        <Type size={16} className="text-zinc-600 mb-1" />
                        <span className="text-[9px] font-bold text-zinc-500">DRAG FONT (.TTF/.OTF)</span>
                     </div>
                </div>
            )}

            <div className="mt-auto space-y-2 pt-4">
               {videoSettings.previewUrl ? (
                   <button 
                       onClick={resetVideoState}
                       className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-[10px] border border-zinc-700 transition-all flex items-center justify-center gap-2"
                   >
                       <RefreshCw size={12} /> RESET PREVIEW
                   </button>
               ) : (
                    <button 
                        onClick={generateSocialVideo}
                        disabled={!activeFile || videoSettings.isGenerating}
                        className="w-full py-3.5 border border-zinc-700 hover:border-white text-zinc-300 hover:text-white rounded-lg font-bold text-[10px] transition-all disabled:opacity-30 disabled:border-zinc-800 disabled:cursor-not-allowed group"
                        title="Render and Download Video"
                    >
                        <span className="group-hover:scale-105 inline-block transition-transform">GENERATE VIDEO</span>
                    </button>
               )}

               <div className="flex gap-2">
                   {videoSettings.previewUrl && (
                    <a 
                        href={videoSettings.previewUrl} 
                        download={`BEATBOY_SOCIAL_${videoSettings.aspectRatio}.webm`}
                        className="flex-1 flex items-center justify-center py-3.5 bg-[var(--accent)] hover:opacity-90 text-white rounded-lg font-bold text-[10px] shadow-[0_4px_12px_var(--accent-dim)] hover:shadow-[0_6px_20px_var(--accent-dim)] transition-all active:scale-95"
                    >
                        <Download size={14} className="mr-2" /> VIDEO
                    </a>
                   )}
                   <button 
                        onClick={handleDownloadThumbnail}
                        disabled={!activeFile}
                        className="flex-1 flex items-center justify-center py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-[10px] border border-zinc-700 transition-all active:scale-95 disabled:opacity-50"
                        title="Download current frame as PNG"
                   >
                       <ImageIcon size={14} className="mr-2" /> THUMBNAIL
                   </button>
               </div>
            </div>
         </div>
      </div>

    </div>
    )}
    </>
  );
}