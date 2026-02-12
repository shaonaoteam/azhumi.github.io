
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import * as htmlToImage from 'html-to-image';

// --- 类型定义 ---
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

// --- 常量配置 ---
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

// --- AI 服务 ---
class GeminiService {
  private ai: any;
  constructor() {
    // 环境变量由系统注入
    this.ai = new GoogleGenAI({ apiKey: (window as any).process?.env?.API_KEY || '' });
  }
  async enhanceNotes(rawNotes: string, petName: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你是一名宠物美容师。润色这段笔记：宠物:${petName}, 笔记:${rawNotes}。要求专业温馨，100字内。`,
      });
      return response.text || rawNotes;
    } catch (e) { 
      console.error("AI Error", e);
      return rawNotes; 
    }
  }
}
const gemini = new GeminiService();

// --- UI 组件 ---
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
        {image ? (
          <img src={image} className="w-full h-full object-cover" />
        ) : (
          <div className="text-blue-500 flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <span className="font-bold text-[10px]">点击拍照</span>
          </div>
        )}
      </label>
    </div>
  );
};

const ReportPreview = ({ report, template, containerRef }: any) => (
  <div ref={containerRef} className="w-full bg-white shadow-xl rounded-3xl overflow-hidden" style={{ borderTop: `10px solid ${template.primaryColor}` }}>
    <div className="p-6" style={{ backgroundColor: template.secondaryColor }}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: template.primaryColor }}>洗护报告</h1>
          <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest">PET GROOMING REPORT</p>
        </div>
        <p className="font-bold opacity-60 text-sm">{report.date}</p>
      </div>
      
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 grid grid-cols-2 gap-4">
        <div><p className="text-[10px] text-slate-400 uppercase">宠物姓名</p><p className="font-bold text-slate-800">{report.pet.name || '小可爱'}</p></div>
        <div><p className="text-[10px] text-slate-400 uppercase">美容师</p><p className="font-bold text-slate-800">{report.groomerName || '-'}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {report.photos.before && (
          <div className="text-center">
            <p className="text-[9px] mb-1 font-bold text-slate-400">BEFORE / 洗前</p>
            <img src={report.photos.before} className="rounded-xl shadow-md aspect-square object-cover w-full border-2 border-white" />
          </div>
        )}
        {report.photos.after && (
          <div className="text-center">
            <p className="text-[9px] mb-1 font-bold text-slate-400">AFTER / 洗后</p>
            <img src={report.photos.after} className="rounded-xl shadow-md aspect-square object-cover w-full border-2 border-white" />
          </div>
        )}
      </div>

      <div className="mb-6">
        <p className="text-[10px] text-slate-400 uppercase mb-2 font-bold">服务项目</p>
        <div className="flex flex-wrap gap-2">
          {report.services.map((s: string, i: number) => (
            <span key={i} className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: template.primaryColor, color: '#fff' }}>{s}</span>
          ))}
        </div>
      </div>

      <div className="p-4 bg-white rounded-2xl border-l-4 shadow-sm" style={{ borderColor: template.primaryColor }}>
        <p className="text-xs font-bold text-slate-400 mb-1 uppercase">美容师点评</p>
        <p className="text-sm italic text-slate-700 leading-relaxed">"{report.aiEnhancedNotes || report.notes || '宝贝今天非常配合，洗完香喷喷的！'}"</p>
      </div>
    </div>
  </div>
);

// --- 主应用 ---
const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [report, setReport] = useState<GroomingReport>({
    pet: { name: '', breed: '', age: '', weight: '', gender: 'male' },
    services: [], notes: '', date: new Date().toISOString().split('T')[0],
    groomerName: '', photos: {}, templateId: REPORT_TEMPLATES[0].id
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleEnhance = async () => {
    if (!report.notes) return;
    setIsEnhancing(true);
    const enhanced = await gemini.enhanceNotes(report.notes, report.pet.name || '小可爱');
    setReport({ ...report, aiEnhancedNotes: enhanced });
    setIsEnhancing(false);
  };

  const generate = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await htmlToImage.toPng(reportRef.current, { pixelRatio: 2, cacheBust: true });
      setPreviewImage(dataUrl);
    } catch (e) { 
      alert('生成报告失败，请尝试截图保存或重试。');
    }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto shadow-xl relative overflow-x-hidden">
      <header className="bg-white/90 backdrop-blur-md px-4 py-4 border-b sticky top-0 z-40 flex justify-between items-center">
        <h1 className="font-bold text-slate-800">爱宠洗护报告</h1>
        <div className="flex space-x-1">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${step === s ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200'}`} />
          ))}
        </div>
      </header>

      <main className="flex-1 p-6 pb-32 overflow-y-auto no-scrollbar">
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4">基本信息</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1">宠物姓名</label>
                  <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500/10" placeholder="名字" value={report.pet.name} onChange={e => setReport({...report, pet: {...report.pet, name: e.target.value}})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1">美容师</label>
                  <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500/10" placeholder="称呼" value={report.groomerName} onChange={e => setReport({...report, groomerName: e.target.value})} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4">洗护项目</h2>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_SERVICES.map(s => (
                  <button key={s.id} onClick={() => {
                    const news = report.services.includes(s.name) ? report.services.filter(x => x !== s.name) : [...report.services, s.name];
                    setReport({...report, services: news});
                  }} className={`p-4 rounded-2xl text-xs font-bold transition-all border ${report.services.includes(s.name) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-100'}`}>{s.name}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <PhotoUpload label="洗护前 (Before)" image={report.photos.before} onUpload={(img: string) => setReport({...report, photos: {...report.photos, before: img}})} />
              <PhotoUpload label="洗护后 (After)" image={report.photos.after} onUpload={(img: string) => setReport({...report, photos: {...report.photos, after: img}})} />
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-slate-800">美容师点评</h2>
                <button onClick={handleEnhance} disabled={!report.notes || isEnhancing} className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-full font-bold disabled:bg-slate-200">
                  {isEnhancing ? 'AI 润色中...' : '✨ AI 优化文字'}
                </button>
              </div>
              <textarea className="w-full p-4 bg-slate-50 rounded-2xl outline-none min-h-[120px] text-sm" placeholder="写点宠物今天的表现吧..." value={report.notes} onChange={e => setReport({...report, notes: e.target.value})} />
              {report.aiEnhancedNotes && <div className="mt-3 p-4 bg-blue-50 rounded-2xl text-xs italic text-blue-800 border border-blue-100">{report.aiEnhancedNotes}</div>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex space-x-2 overflow-x-auto no-scrollbar py-2">
              {REPORT_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setReport({...report, templateId: t.id})} className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold border-2 transition-all ${report.templateId === t.id ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-500'}`}>{t.name}</button>
              ))}
            </div>
            <div className="w-full flex justify-center px-2">
              <ReportPreview report={report} template={REPORT_TEMPLATES.find(x => x.id === report.templateId)} containerRef={reportRef} />
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto p-4 pb-8 bg-white/80 backdrop-blur-xl border-t flex space-x-3 z-50">
        {step > 1 && <button onClick={() => setStep(step - 1)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all">返回</button>}
        <button onClick={() => step < 3 ? setStep(step + 1) : generate()} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 active:scale-[0.98] transition-all">
          {isGenerating ? '正在渲染图片...' : (step < 3 ? '继续' : '预览并保存')}
        </button>
      </footer>

      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 no-select animate-fadeIn">
          <div className="w-full max-w-sm flex flex-col items-center">
            <p className="text-white text-sm font-bold mb-6 flex items-center">
               <span className="bg-green-500 w-2 h-2 rounded-full mr-2 animate-pulse"></span>
               制作完成！长按下方图片保存
            </p>
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl mb-8 w-full">
              <img src={previewImage} className="w-full h-auto" />
            </div>
            <button onClick={() => setPreviewImage(null)} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm shadow-xl">返回编辑</button>
          </div>
        </div>
      )}
    </div>
  );
};

// 挂载应用
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}
