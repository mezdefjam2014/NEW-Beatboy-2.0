
import React, { useState, useRef } from 'react';
import { 
  X, Download, Copy, FileText, Hash, Search, DollarSign, 
  PenTool, FileSignature, Receipt, Image as ImageIcon, Briefcase, 
  Check, ChevronRight, Settings, Share2, Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ProducerToolsProps {
    onClose: () => void;
}

type ToolId = 'receipt' | 'hashtag' | 'seo' | 'price' | 'social' | 'split' | 'license' | 'invoice';

const ProducerTools: React.FC<ProducerToolsProps> = ({ onClose }) => {
    const [activeTool, setActiveTool] = useState<ToolId>('receipt');
    const previewRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    // --- SHARED UTILS ---
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    const downloadTxt = (filename: string, text: string) => {
        const element = document.createElement("a");
        const file = new Blob([text], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const exportImage = async () => {
        if (!previewRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(previewRef.current, { scale: 3, useCORS: true, backgroundColor: null });
            const link = document.createElement('a');
            link.download = `BEATBOY_EXPORT_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch(e) { console.error(e); }
        setIsExporting(false);
    };

    const exportPDF = async () => {
        if (!previewRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'l' : 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`BEATBOY_DOC_${Date.now()}.pdf`);
        } catch(e) { console.error(e); }
        setIsExporting(false);
    };

    // --- TOOL: RECEIPT MAKER ---
    const [receiptData, setReceiptData] = useState({
        producer: '', client: '', title: '', type: 'Exclusive Rights', amount: '$500.00', date: new Date().toLocaleDateString(), signature: '', logo: null as string | null
    });
    
    const renderReceipt = () => (
        <div className="flex gap-8 h-full">
            <div className="w-80 space-y-4 overflow-y-auto pr-2 pb-20">
                <h3 className="text-xs font-bold text-zinc-500 uppercase">Details</h3>
                <input type="text" placeholder="Producer Name" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs" value={receiptData.producer} onChange={e => setReceiptData({...receiptData, producer: e.target.value})} />
                <input type="text" placeholder="Client Name" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs" value={receiptData.client} onChange={e => setReceiptData({...receiptData, client: e.target.value})} />
                <input type="text" placeholder="Beat Title" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs" value={receiptData.title} onChange={e => setReceiptData({...receiptData, title: e.target.value})} />
                <select className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs" value={receiptData.type} onChange={e => setReceiptData({...receiptData, type: e.target.value})}>
                    <option>MP3 Lease</option><option>WAV Lease</option><option>Trackout Lease</option><option>Unlimited Lease</option><option>Exclusive Rights</option>
                </select>
                <input type="text" placeholder="Amount ($)" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs" value={receiptData.amount} onChange={e => setReceiptData({...receiptData, amount: e.target.value})} />
                <input type="text" placeholder="Signature Text" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs" value={receiptData.signature} onChange={e => setReceiptData({...receiptData, signature: e.target.value})} />
                <label className="flex items-center gap-2 text-xs bg-zinc-900 p-2 rounded cursor-pointer border border-zinc-800 hover:bg-zinc-800">
                    <ImageIcon size={14} /> Upload Logo
                    <input type="file" className="hidden" accept="image/*" onChange={e => {
                        if(e.target.files?.[0]) {
                            const url = URL.createObjectURL(e.target.files[0]);
                            setReceiptData({...receiptData, logo: url});
                        }
                    }} />
                </label>
            </div>
            <div className="flex-1 bg-zinc-900 rounded-xl flex items-center justify-center p-8 overflow-y-auto">
                 <div ref={previewRef} className="bg-white text-black p-8 w-[400px] shadow-2xl relative font-mono text-sm">
                    {receiptData.logo && <img src={receiptData.logo} className="h-12 mb-4 mx-auto" />}
                    <div className="text-center border-b-2 border-black pb-4 mb-4">
                        <h2 className="text-2xl font-black uppercase tracking-tighter">{receiptData.producer || 'PRODUCER'}</h2>
                        <p className="text-[10px] uppercase tracking-widest">Official Transaction Receipt</p>
                    </div>
                    <div className="space-y-2 mb-8">
                        <div className="flex justify-between"><span>DATE:</span><span>{receiptData.date}</span></div>
                        <div className="flex justify-between"><span>ORDER #:</span><span>{Math.floor(Math.random()*100000)}</span></div>
                    </div>
                    <div className="space-y-4 mb-8">
                        <div>
                            <span className="text-[10px] text-gray-500">SOLD TO:</span>
                            <div className="font-bold uppercase">{receiptData.client || 'CLIENT NAME'}</div>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-500">ITEM:</span>
                            <div className="font-bold uppercase">{receiptData.title || 'UNTITLED BEAT'}</div>
                            <div className="text-xs">{receiptData.type}</div>
                        </div>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t-2 border-black pt-4 mb-12">
                        <span>TOTAL</span>
                        <span>{receiptData.amount}</span>
                    </div>
                    <div className="text-center">
                        <div className="font-cursive text-2xl mb-1">{receiptData.signature || receiptData.producer}</div>
                        <div className="border-t border-black w-32 mx-auto pt-1 text-[10px]">AUTHORIZED SIGNATURE</div>
                    </div>
                 </div>
            </div>
        </div>
    );

    // --- TOOL: HASHTAG GENERATOR ---
    const [hashInput, setHashInput] = useState('');
    const [generatedTags, setGeneratedTags] = useState('');
    const generateHashtags = () => {
        const baseTags = ['#producer', '#beatmaker', '#flstudio', '#typebeat', '#musicproducer', '#beats', '#instrumental'];
        const genreTags: Record<string, string[]> = {
            'trap': ['#trapbeat', '#trapmusic', '#808', '#hiphopbeat'],
            'lofi': ['#lofi', '#lofihiphop', '#chill', '#studybeats'],
            'drill': ['#drillbeat', '#ukdrill', '#nydrill', '#hardbeats'],
            'r&b': ['#rnbbeat', '#smooth', '#soul', '#rnb']
        };
        let pool = [...baseTags];
        const lowerInput = hashInput.toLowerCase();
        Object.keys(genreTags).forEach(k => {
            if (lowerInput.includes(k)) pool = [...pool, ...genreTags[k]];
        });
        
        // Add random filler
        const extras = ['#newmusic', '#upcomingartist', '#studio', '#beatstars', '#sellingbeats', '#rapper', '#artist'];
        pool = [...pool, ...extras];
        
        // Shuffle and pick 25
        const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, 25);
        setGeneratedTags(shuffled.join(' '));
    };

    const renderHashtags = () => (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500">Describe Your Vibe / Genre</label>
                <input value={hashInput} onChange={e=>setHashInput(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-sm" placeholder="e.g. Dark Trap, Drake Type Beat, Emotional" />
                <button onClick={generateHashtags} className="bg-[var(--accent)] text-black px-6 py-2 rounded-lg text-xs font-bold hover:opacity-90">GENERATE TAGS</button>
            </div>
            {generatedTags && (
                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 relative group">
                    <p className="text-zinc-300 text-sm leading-relaxed font-mono">{generatedTags}</p>
                    <div className="absolute top-2 right-2 flex gap-2">
                        <button onClick={() => copyToClipboard(generatedTags)} className="p-2 bg-black rounded hover:text-white text-zinc-500"><Copy size={14} /></button>
                        <button onClick={() => downloadTxt('hashtags.txt', generatedTags)} className="p-2 bg-black rounded hover:text-white text-zinc-500"><Download size={14} /></button>
                    </div>
                </div>
            )}
        </div>
    );

    // --- TOOL: YOUTUBE SEO ---
    const [seoData, setSeoData] = useState({ topic: '', artist: '', genre: '' });
    const [seoOutput, setSeoOutput] = useState<{titles: string[], tags: string, desc: string} | null>(null);
    
    const generateSEO = () => {
        const t = seoData.topic || 'Type Beat';
        const a = seoData.artist || 'Unknown Artist';
        const titles = [
            `FREE ${a} Type Beat - "${t}" | ${seoData.genre} Instrumental 2024`,
            `"${t}" - ${a} Style Instrumental | Hard ${seoData.genre} Beat`,
            `[FREE] ${a} x ${seoData.genre} Type Beat - ${t}`,
            `HARD ${seoData.genre} Beat 2024 - "${t}" (${a} Type Beat)`,
            `${seoData.genre} Instrumental - "${t}" | Inspired by ${a}`
        ];
        const tags = `${a} type beat, ${seoData.genre} beat, free beat, instrumental 2024, ${t}, ${a} style instrumental, hard beats, beatstars, new music, producer`;
        const desc = `
🎹 Buy 1 Get 1 FREE: https://[YOUR-STORE-LINK]
➕ Subscribe for more beats: https://youtube.com/[YOUR-CHANNEL]

Title: ${t}
BPM: [BPM]
Key: [KEY]

In the style of ${a}, this ${seoData.genre} instrumental brings a unique vibe...

Socials:
IG: @[YOUR-IG]
Twitter: @[YOUR-TWITTER]

#${a.replace(/\s/g,'')} #TypeBeat #${seoData.genre}
        `.trim();
        setSeoOutput({ titles, tags, desc });
    };

    const renderSEO = () => (
        <div className="flex gap-8 h-full">
            <div className="w-80 space-y-4">
                 <h3 className="text-xs font-bold text-zinc-500 uppercase">Video Details</h3>
                 <input placeholder="Track Title / Topic" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs" onChange={e=>setSeoData({...seoData, topic: e.target.value})} />
                 <input placeholder="Artist Influence" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs" onChange={e=>setSeoData({...seoData, artist: e.target.value})} />
                 <input placeholder="Genre" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs" onChange={e=>setSeoData({...seoData, genre: e.target.value})} />
                 <button onClick={generateSEO} className="w-full bg-[var(--accent)] text-black py-3 rounded-lg text-xs font-bold">GENERATE SEO</button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 pb-20">
                {seoOutput ? (
                    <>
                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Optimized Titles</h4>
                            <ul className="space-y-2">
                                {seoOutput.titles.map((t,i) => (
                                    <li key={i} className="flex justify-between items-center text-sm bg-black/40 p-2 rounded">
                                        <span className="truncate mr-2">{t}</span>
                                        <button onClick={()=>copyToClipboard(t)}><Copy size={12} className="text-zinc-500 hover:text-white"/></button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                         <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                            <div className="flex justify-between mb-2">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase">Tags</h4>
                                <button onClick={()=>copyToClipboard(seoOutput.tags)}><Copy size={12} className="text-zinc-500 hover:text-white"/></button>
                            </div>
                            <p className="text-xs text-zinc-400 font-mono bg-black/40 p-2 rounded">{seoOutput.tags}</p>
                        </div>
                         <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                            <div className="flex justify-between mb-2">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase">Description</h4>
                                <button onClick={()=>copyToClipboard(seoOutput.desc)}><Copy size={12} className="text-zinc-500 hover:text-white"/></button>
                            </div>
                            <pre className="text-xs text-zinc-400 font-mono bg-black/40 p-2 rounded whitespace-pre-wrap">{seoOutput.desc}</pre>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-sm">Enter details to generate SEO metadata</div>
                )}
            </div>
        </div>
    );

    // --- TOOL: PRICE CHART ---
    const [prices, setPrices] = useState([
        { service: 'MP3 Lease', price: '$29.99', features: 'MP3 File, Non-Exclusive' },
        { service: 'WAV Lease', price: '$49.99', features: 'WAV File, High Quality' },
        { service: 'Trackout', price: '$99.99', features: 'WAV + Stems, Mix Freedom' },
        { service: 'Exclusive', price: '$499.99', features: 'Full Ownership, Unlimited' },
    ]);
    const [priceTheme, setPriceTheme] = useState('dark');

    const renderPriceChart = () => (
         <div className="flex gap-8 h-full">
             <div className="w-72 space-y-4">
                 <h3 className="text-xs font-bold text-zinc-500 uppercase">Services</h3>
                 {prices.map((p, i) => (
                     <div key={i} className="bg-zinc-900 p-2 rounded border border-zinc-800 space-y-2">
                         <input className="w-full bg-black border border-zinc-800 p-1 rounded text-xs" value={p.service} onChange={e => {const n=[...prices]; n[i].service=e.target.value; setPrices(n)}} />
                         <input className="w-full bg-black border border-zinc-800 p-1 rounded text-xs" value={p.price} onChange={e => {const n=[...prices]; n[i].price=e.target.value; setPrices(n)}} />
                         <input className="w-full bg-black border border-zinc-800 p-1 rounded text-xs" value={p.features} onChange={e => {const n=[...prices]; n[i].features=e.target.value; setPrices(n)}} />
                     </div>
                 ))}
                 <div className="flex gap-2">
                    <button onClick={() => setPriceTheme('dark')} className={`flex-1 py-2 text-xs border rounded ${priceTheme==='dark' ? 'bg-zinc-800 border-white' : 'border-zinc-800'}`}>Dark</button>
                    <button onClick={() => setPriceTheme('light')} className={`flex-1 py-2 text-xs border rounded ${priceTheme==='light' ? 'bg-zinc-200 text-black border-black' : 'border-zinc-800'}`}>Light</button>
                 </div>
             </div>
             <div className="flex-1 bg-zinc-900 rounded-xl flex items-center justify-center p-8 overflow-y-auto">
                 <div ref={previewRef} className={`p-12 w-[500px] shadow-2xl ${priceTheme === 'light' ? 'bg-white text-black' : 'bg-[#09090b] text-white border border-zinc-800'}`}>
                     <div className="text-center mb-12">
                         <h2 className="text-3xl font-black tracking-tighter mb-2">PRICING MENU</h2>
                         <div className={`w-12 h-1 mx-auto ${priceTheme==='light' ? 'bg-black' : 'bg-white'}`} />
                     </div>
                     <div className="space-y-6">
                         {prices.map((p, i) => (
                             <div key={i} className={`flex justify-between items-center p-4 border-b ${priceTheme==='light' ? 'border-gray-200' : 'border-zinc-800'}`}>
                                 <div>
                                     <h3 className="font-bold text-lg uppercase">{p.service}</h3>
                                     <p className={`text-xs ${priceTheme==='light' ? 'text-gray-500' : 'text-zinc-500'}`}>{p.features}</p>
                                 </div>
                                 <div className="text-2xl font-black">{p.price}</div>
                             </div>
                         ))}
                     </div>
                     <div className="mt-12 text-center text-[10px] uppercase tracking-widest opacity-50">
                         Serious Inquiries Only
                     </div>
                 </div>
             </div>
         </div>
    );

    // --- TOOL: SOCIAL CAPTIONS ---
    const renderCaptions = () => (
        <div className="max-w-2xl mx-auto space-y-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase">Caption Templates</h3>
            <div className="grid grid-cols-1 gap-4">
                {[
                    "Cooked up this heat today 🔥 What y'all think? #producer #beats",
                    "Just dropped a new pack! Link in bio 🎹 #typebeat #flstudio",
                    "Who needs beats? Send me a DM, let's work 📩 #artist #rapper",
                    "Late night studio sessions are the best sessions 🌑 #grind #music",
                    "Tag an artist who would kill this beat! 👇 #hiphop #trap"
                ].map((cap, i) => (
                    <div key={i} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center group">
                        <p className="text-sm text-zinc-300 italic">"{cap}"</p>
                        <button onClick={() => copyToClipboard(cap)} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-white"><Copy size={16} /></button>
                    </div>
                ))}
            </div>
        </div>
    );

    // --- TOOL: SPLIT SHEET ---
    const [splitData, setSplitData] = useState({ track: '', date: '', parties: [{name: '', role: 'Producer', share: '50%'}] });
    const addParty = () => setSplitData({...splitData, parties: [...splitData.parties, {name: '', role: 'Writer', share: '0%'}]});
    
    const renderSplitSheet = () => (
        <div className="flex gap-8 h-full">
            <div className="w-80 space-y-4">
                <input placeholder="Track Title" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs" onChange={e => setSplitData({...splitData, track: e.target.value})} />
                <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs" onChange={e => setSplitData({...splitData, date: e.target.value})} />
                <hr className="border-zinc-800"/>
                {splitData.parties.map((p, i) => (
                    <div key={i} className="space-y-2 bg-zinc-900 p-2 rounded">
                        <input placeholder="Name" className="w-full bg-black border border-zinc-800 p-1 rounded text-xs" value={p.name} onChange={e => {const n=[...splitData.parties]; n[i].name=e.target.value; setSplitData({...splitData, parties: n})}} />
                        <div className="flex gap-2">
                             <input placeholder="Role" className="w-full bg-black border border-zinc-800 p-1 rounded text-xs" value={p.role} onChange={e => {const n=[...splitData.parties]; n[i].role=e.target.value; setSplitData({...splitData, parties: n})}} />
                             <input placeholder="%" className="w-16 bg-black border border-zinc-800 p-1 rounded text-xs" value={p.share} onChange={e => {const n=[...splitData.parties]; n[i].share=e.target.value; setSplitData({...splitData, parties: n})}} />
                        </div>
                    </div>
                ))}
                <button onClick={addParty} className="w-full border border-dashed border-zinc-700 text-zinc-500 py-2 rounded text-xs hover:text-white hover:border-white">+ Add Person</button>
            </div>
            <div className="flex-1 bg-zinc-900 rounded-xl flex items-center justify-center p-8 overflow-y-auto">
                 <div ref={previewRef} className="bg-white text-black p-12 w-[600px] shadow-2xl font-serif">
                     <h1 className="text-3xl font-bold text-center mb-8 uppercase border-b-2 border-black pb-4">Split Sheet Agreement</h1>
                     <div className="mb-8">
                         <p><strong>Track Title:</strong> {splitData.track}</p>
                         <p><strong>Date:</strong> {splitData.date}</p>
                     </div>
                     <table className="w-full text-left mb-12 border-collapse">
                         <thead>
                             <tr className="border-b border-black">
                                 <th className="py-2">Legal Name</th>
                                 <th className="py-2">Role</th>
                                 <th className="py-2 text-right">Ownership</th>
                             </tr>
                         </thead>
                         <tbody>
                             {splitData.parties.map((p, i) => (
                                 <tr key={i} className="border-b border-gray-300">
                                     <td className="py-4">{p.name || '___________'}</td>
                                     <td className="py-4">{p.role}</td>
                                     <td className="py-4 text-right">{p.share}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                     <div className="mt-20 grid grid-cols-2 gap-12">
                         {splitData.parties.map((p, i) => (
                             <div key={i} className="border-t border-black pt-2">
                                 <p className="text-xs uppercase">Sign: {p.name}</p>
                             </div>
                         ))}
                     </div>
                 </div>
            </div>
        </div>
    );

    // --- RENDER MAIN ---
    return (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#09090b]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--accent)] rounded-lg text-black"><Briefcase size={20} /></div>
                    <h1 className="text-lg font-black tracking-tight text-white">PRODUCER TOOLS</h1>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-[#121214] border-r border-white/5 flex flex-col p-2 space-y-1">
                    {[
                        { id: 'receipt', label: 'Receipt Maker', icon: Receipt },
                        { id: 'hashtag', label: 'Hashtag Gen', icon: Hash },
                        { id: 'seo', label: 'YouTube SEO', icon: Search },
                        { id: 'price', label: 'Price Chart', icon: DollarSign },
                        { id: 'social', label: 'Social Captions', icon: Share2 },
                        { id: 'split', label: 'Split Sheet', icon: FileSignature },
                        { id: 'license', label: 'License Gen', icon: FileText },
                        { id: 'invoice', label: 'Invoice Builder', icon: FileText },
                    ].map((tool) => (
                        <button 
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id as ToolId)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold transition-all ${activeTool === tool.id ? 'bg-[var(--accent)] text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <tool.icon size={16} /> {tool.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)]">
                    <div className="flex-1 p-8 overflow-hidden">
                        {activeTool === 'receipt' && renderReceipt()}
                        {activeTool === 'hashtag' && renderHashtags()}
                        {activeTool === 'seo' && renderSEO()}
                        {activeTool === 'price' && renderPriceChart()}
                        {activeTool === 'social' && renderCaptions()}
                        {activeTool === 'split' && renderSplitSheet()}
                        {activeTool === 'license' && (
                            <div className="h-full flex items-center justify-center text-zinc-500">
                                <div className="text-center">
                                    <FileText size={48} className="mx-auto mb-4 opacity-50"/>
                                    <h3 className="text-lg font-bold mb-2">License Generator</h3>
                                    <p className="text-xs max-w-md">Coming soon in next update. Use the Receipt Maker for proof of purchase.</p>
                                </div>
                            </div>
                        )}
                        {activeTool === 'invoice' && (
                             <div className="h-full flex items-center justify-center text-zinc-500">
                                <div className="text-center">
                                    <FileText size={48} className="mx-auto mb-4 opacity-50"/>
                                    <h3 className="text-lg font-bold mb-2">Invoice Builder</h3>
                                    <p className="text-xs max-w-md">Use Split Sheet or Receipt Maker for now. Full invoicing system arriving v4.2.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Action Bar */}
                    <div className="h-16 border-t border-white/5 bg-[#121214] flex items-center justify-end px-8 gap-4">
                        {(activeTool === 'receipt' || activeTool === 'price' || activeTool === 'split') && (
                            <>
                                <button onClick={exportImage} disabled={isExporting} className="flex items-center gap-2 px-6 py-2 bg-zinc-800 text-white rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors">
                                    {isExporting ? <Loader2 className="animate-spin" size={14}/> : <ImageIcon size={14} />} EXPORT PNG
                                </button>
                                <button onClick={exportPDF} disabled={isExporting} className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-black rounded-lg text-xs font-bold hover:opacity-90 transition-colors">
                                    {isExporting ? <Loader2 className="animate-spin" size={14}/> : <Download size={14} />} EXPORT PDF
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProducerTools;
