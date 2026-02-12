
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import * as htmlToImage from 'html-to-image';

// --- TYPES ---
interface PetInfo {
  name: string;
  breed: string;
  age: string;
  weight: string;
  gender: 'male' | 'female' | 'other';
}

interface GroomingService {
  id: string;
  name: string;
  checked: boolean;
}

interface GroomingReport {
  pet: PetInfo;
  services: string[];
  notes: string;
  aiEnhancedNotes?: string;
  date: string;
  groomerName: string;
  photos: {
    before?: string;
    after?: string;
  };
  templateId: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  accentColor: string;
}

// --- CONSTANTS ---
const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'modern-blue', name: '极简商务蓝', primaryColor: '#2563eb', secondaryColor: '#f0f9ff', textColor: '#1e293b', accentColor: '#3b82f6' },
  { id: 'sweet-pink', name: '温馨宠物粉', primaryColor: '#db2777', secondaryColor: '#fdf2f8', textColor: '#4c0519', accentColor: '#ec4899' },
  { id: 'nature-green', name: '生机草本绿', primaryColor: '#059669', secondaryColor: '#ecfdf5', textColor: '#064e3b', accentColor: '#10b981' },
  { id: 'elegant-gold', name: '奢华典雅金', primaryColor: '#92400e', secondaryColor: '#fffbeb', textColor: '#451a03', accentColor: '#d97706' }
];

const DEFAULT_SERVICES: GroomingService[] = [
  { id: '1', name: '洗浴', checked: false }, { id: '2', name: '修剪造型', checked: false },
  { id: '3', name: '剪指甲', checked: false }, { id: '4', name: '清理耳道', checked: false },
  { id: '5', name: '挤肛门腺', checked: false }, { id: '6', name: '刷牙/牙粉', checked: false },
  { id: '7', name: '去死毛', checked: false }, { id: '8', name: 'SPA按摩', checked: false },
];

// --- SERVICES ---
class GeminiService {
  private ai: any;
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }
  async enhanceNotes(rawNotes: string, petName: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你是一名宠物美容师。润色这段笔记：宠物:${petName}, 笔记:${rawNotes}。要求专业温馨，100字内。`,
      });
      return response.text || rawNotes;
    } catch (e) { return rawNotes; }
  }
}
const geminiService = new GeminiService();

// --- COMPONENTS ---
const PhotoUpload = ({ label, image, onUpload }: any) => {
  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onUpload(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="flex flex-col items-center w-full">
      <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">{label}</span>
      <label className="relative w-full aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all active:scale-[0.98]">
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        {image ? <img src={image} className="w-full h-full object-cover" /> : <div className="text-blue-500 font-bold text-xs">点击拍照</div>}
      </label>
    </div>
  );
};

const ReportPreview = ({ report, template, containerRef }: any) => (
  <div ref={containerRef} className="w-full bg-white shadow-xl rounded-3xl overflow-hidden" style={{ borderTop: `10px solid ${template.primaryColor}` }}>
    <div className="p-6" style={{ backgroundColor: template.secondaryColor }}>
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-2xl font-black" style={{ color: template.primaryColor }}>洗护报告</h1>
        <p className="font-bold opacity-60">{report.date}</p>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 grid grid-cols-2 gap-4">
        <div><p className="text-[10px] text-slate-400">姓名</p><p className="font-bold">{report.pet.name || '宝贝'}</p></div>
        <div><p className="text-[10px] text-slate-400">美容师</p><p className="font-bold">{report.groomerName || '-'}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {report.photos.before && <div className="text-center"><p className="text-[9px] mb-1">BEFORE</p><img src={report.photos.before} className="rounded-xl shadow-md aspect-square object-cover" /></div>}
        {report.photos.after && <div className="text-center"><p className="text-[9px] mb-1">AFTER</p><img src={report.photos.after} className="rounded-xl shadow-md aspect-square object-cover" /></div>}
      </div>
      <div className="p-4 bg-white rounded-2xl border-l-4" style={{ borderColor: template.primaryColor }}>
        <p className="text-sm italic">"{report.aiEnhancedNotes || report.notes || '宝贝今天很听话！'}"</p>
      </div>
    </div>
  </div>
);

// --- MAIN APP ---
const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [report, setReport] = useState<GroomingReport>({
    pet: { name: '', breed: '', age: '', weight: '', gender: 'male' },
    services: [], notes: '', date: new Date().toISOString().split('T')[0],
    groomerName: '', photos: {}, templateId: REPORT_TEMPLATES[0].id
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const download = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      const dataUrl = await htmlToImage.toPng(reportRef.current, { pixelRatio: 2 });
      setPreviewImage(dataUrl);
    } catch (e) { alert('生成失败，请重试'); }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto shadow-xl relative overflow-x-hidden">
      <header className="bg-white px-4 py-4 border-b sticky top-0 z-40 flex justify-between">
        <h1 className="font-bold">洗护报告生成器</h1>
        <div className="text-xs font-bold text-slate-400">STEP {step}/3</div>
      </header>

      <main className="flex-1 p-6 pb-32 overflow-y-auto no-scrollbar">
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-5 rounded-3xl border border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 block mb-1">宠物姓名</label>
              <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={report.pet.name} onChange={e => setReport({...report, pet: {...report.pet, name: e.target.value}})} />
              <label className="text-[10px] font-bold text-slate-400 block mt-4 mb-1">美容师</label>
              <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={report.groomerName} onChange={e => setReport({...report, groomerName: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {DEFAULT_SERVICES.map(s => (
                <button key={s.id} onClick={() => {
                  const news = report.services.includes(s.name) ? report.services.filter(x => x !== s.name) : [...report.services, s.name];
                  setReport({...report, services: news});
                }} className={`p-4 rounded-2xl text-xs font-bold transition-all ${report.services.includes(s.name) ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}>{s.name}</button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 gap-4 bg-white p-5 rounded-3xl">
              <PhotoUpload label="洗前" image={report.photos.before} onUpload={(img: string) => setReport({...report, photos: {...report.photos, before: img}})} />
              <PhotoUpload label="洗后" image={report.photos.after} onUpload={(img: string) => setReport({...report, photos: {...report.photos, after: img}})} />
            </div>
            <textarea className="w-full p-5 bg-white rounded-3xl outline-none min-h-[150px]" placeholder="写点什么..." value={report.notes} onChange={e => setReport({...report, notes: e.target.value})} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex space-x-2 overflow-x-auto no-scrollbar py-2">
              {REPORT_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setReport({...report, templateId: t.id})} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border ${report.templateId === t.id ? 'bg-slate-800 text-white' : 'bg-white'}`}>{t.name}</button>
              ))}
            </div>
            <ReportPreview report={report} template={REPORT_TEMPLATES.find(x => x.id === report.templateId)} containerRef={reportRef} />
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto p-4 bg-white/80 backdrop-blur-xl border-t flex space-x-3">
        {step > 1 && <button onClick={() => setStep(step - 1)} className="px-6 py-4 bg-slate-100 rounded-2xl font-bold">返回</button>}
        <button onClick={() => step < 3 ? setStep(step + 1) : download()} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200">
          {isGenerating ? '正在生成...' : (step < 3 ? '下一步' : '生成并保存报告')}
        </button>
      </footer>

      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 no-select">
          <p className="text-white text-sm font-bold mb-4">✨ 生成成功！请长按下方图片保存</p>
          <img src={previewImage} className="w-full max-w-sm rounded-2xl shadow-2xl" />
          <button onClick={() => setPreviewImage(null)} className="mt-8 px-10 py-3 bg-white rounded-full font-bold">完成</button>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
