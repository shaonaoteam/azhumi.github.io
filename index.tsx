
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import * as htmlToImage from 'html-to-image';

// --- 类型定义 ---
interface PetInfo {
  name: string;
  breed: string;
  weight: string;
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
}

// --- 常量配置 ---
const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'modern-blue', name: '极简商务蓝', primaryColor: '#2563eb', secondaryColor: '#f0f9ff', textColor: '#1e293b' },
  { id: 'sweet-pink', name: '温馨宠物粉', primaryColor: '#db2777', secondaryColor: '#fdf2f8', textColor: '#4c0519' },
  { id: 'nature-green', name: '生机草本绿', primaryColor: '#059669', secondaryColor: '#ecfdf5', textColor: '#064e3b' },
  { id: 'elegant-gold', name: '奢华典雅金', primaryColor: '#92400e', secondaryColor: '#fffbeb', textColor: '#451a03' }
];

const DEFAULT_SERVICES = ['洗浴', '修剪造型', '剪指甲', '清理耳道', '挤肛门腺', '刷牙/牙粉', '去死毛', 'SPA按摩'];

// --- 辅助工具 ---
const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 1000;
      if (width > height) {
        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
      } else {
        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

// --- AI 服务核心逻辑 ---
const getEffectiveApiKey = () => {
  // 1. 尝试从浏览器本地存储获取用户输入的 Key
  const userKey = localStorage.getItem('PET_REPORT_AI_KEY');
  if (userKey) return userKey;

  // 2. 尝试安全地从环境注入获取（针对自动注入环境）
  try {
    return (globalThis as any).process?.env?.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const enhancePetNotes = async (rawNotes: string, petName: string, apiKey: string): Promise<string> => {
  if (!apiKey) throw new Error("Missing API Key");
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一名宠物美容师。请润色这段笔记：宠物名字是"${petName}", 原始笔记内容是"${rawNotes}"。要求：语气专业温馨，字数100字以内，并包含一条简短的居家护理建议。只返回润色后的文本。`,
    });
    return response.text || rawNotes;
  } catch (e: any) { 
    console.error("AI 优化请求失败:", e);
    throw e;
  }
};

// --- UI 子组件 ---
const PhotoUpload = ({ label, image, onUpload }: any) => {
  const [loading, setLoading] = useState(false);
  const handleFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      onUpload(compressed);
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">{label}</span>
      <label className="relative w-full aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all active:scale-[0.98]">
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        {loading ? (
          <div className="flex flex-col items-center animate-pulse"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div></div>
        ) : image ? (
          <img src={image} className="w-full h-full object-cover animate-fadeIn" />
        ) : (
          <div className="text-blue-500 flex flex-col items-center p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-bold text-[10px]">选择相册或拍照</span>
          </div>
        )}
      </label>
    </div>
  );
};

const ReportPreview = ({ report, template, containerRef }: any) => (
  <div ref={containerRef} className="w-full bg-white shadow-xl rounded-3xl overflow-hidden" style={{ borderTop: `8px solid ${template.primaryColor}` }}>
    <div className="p-6" style={{ backgroundColor: template.secondaryColor }}>
      <div className="flex justify-between items-start mb-6">
        <div><h1 className="text-2xl font-black" style={{ color: template.primaryColor }}>洗护报告</h1><p className="text-[10px] opacity-50 font-bold uppercase tracking-widest">PET GROOMING REPORT</p></div>
        <p className="font-bold opacity-60 text-sm">{report.date}</p>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 grid grid-cols-2 gap-4">
        <div><p className="text-[10px] text-slate-400 uppercase font-bold">宠物姓名</p><p className="font-bold text-slate-800">{report.pet.name || '小可爱'}</p></div>
        <div><p className="text-[10px] text-slate-400 uppercase font-bold">美容师</p><p className="font-bold text-slate-800">{report.groomerName || '-'}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {report.photos.before && <img src={report.photos.before} className="rounded-xl shadow-md aspect-square object-cover w-full border-2 border-white" />}
        {report.photos.after && <img src={report.photos.after} className="rounded-xl shadow-md aspect-square object-cover w-full border-2 border-white" />}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {report.services.map((s: string, i: number) => (
          <span key={i} className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: template.primaryColor, color: '#fff' }}>{s}</span>
        ))}
      </div>
      <div className="p-4 bg-white rounded-2xl border-l-4 shadow-sm" style={{ borderColor: template.primaryColor }}>
        <p className="text-xs font-bold text-slate-400 mb-1 uppercase">洗护总结</p>
        <p className="text-sm italic text-slate-700 leading-relaxed font-medium">"{report.aiEnhancedNotes || report.notes || '宝贝今天非常配合！'}"</p>
      </div>
    </div>
  </div>
);

// --- 主应用 ---
const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('PET_REPORT_AI_KEY') || "");
  const [report, setReport] = useState<GroomingReport>({
    pet: { name: '', breed: '', weight: '' },
    services: [], notes: '', date: new Date().toISOString().split('T')[0],
    groomerName: '', photos: {}, templateId: REPORT_TEMPLATES[0].id
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('PET_REPORT_AI_KEY', key);
    setShowSettings(false);
  };

  const handleEnhance = async () => {
    const currentKey = getEffectiveApiKey();
    if (!currentKey) {
      alert("请先在设置中配置 Gemini API Key");
      setShowSettings(true);
      return;
    }
    if (!report.notes) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePetNotes(report.notes, report.pet.name || '小可爱', currentKey);
      setReport({ ...report, aiEnhancedNotes: enhanced });
    } catch (e) {
      alert("AI 优化失败，请检查 API Key 是否正确。");
    }
    setIsEnhancing(false);
  };

  const generate = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const node = reportRef.current;
      await htmlToImage.toCanvas(node);
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await htmlToImage.toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
      setPreviewImage(dataUrl);
    } catch (e) { alert('导出失败，请尝试截图保存。'); }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto shadow-xl relative overflow-x-hidden">
      <header className="bg-white/95 backdrop-blur-md px-4 py-4 border-b sticky top-0 z-40 flex justify-between items-center">
        <h1 className="font-black text-slate-800 tracking-tight text-lg">🐾 宠爱洗护报告</h1>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <div className="flex space-x-1">
            {[1, 2, 3].map(s => <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200'}`} />)}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 pb-32 overflow-y-auto no-scrollbar">
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center"><span className="w-1 h-4 bg-blue-600 rounded-full mr-2"></span>基本资料</h2>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 ring-blue-500/5 border border-transparent focus:border-blue-500/20 text-base" placeholder="宠物姓名" value={report.pet.name} onChange={e => setReport({...report, pet: {...report.pet, name: e.target.value}})} />
                <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 ring-blue-500/5 border border-transparent focus:border-blue-500/20 text-base" placeholder="美容师" value={report.groomerName} onChange={e => setReport({...report, groomerName: e.target.value})} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center"><span className="w-1 h-4 bg-blue-600 rounded-full mr-2"></span>洗护项目</h2>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_SERVICES.map(s => (
                  <button key={s} onClick={() => {
                    const news = report.services.includes(s) ? report.services.filter(x => x !== s) : [...report.services, s];
                    setReport({...report, services: news});
                  }} className={`p-4 rounded-2xl text-xs font-bold transition-all border ${report.services.includes(s) ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-500 border-slate-100'}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <PhotoUpload label="洗护前 (Before)" image={report.photos.before} onUpload={(img: string) => setReport({...report, photos: {...report.photos, before: img}})} />
              <PhotoUpload label="洗护后 (After)" image={report.photos.after} onUpload={(img: string) => setReport({...report, photos: {...report.photos, after: img}})} />
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-slate-800">美容点评</h2>
                <button onClick={handleEnhance} disabled={!report.notes || isEnhancing} className="text-[10px] bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold disabled:bg-slate-200 transition-all active:scale-95 shadow-lg shadow-blue-100 flex items-center">
                  {isEnhancing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> : '✨ AI 智能润色'}
                </button>
              </div>
              <textarea className="w-full p-4 bg-slate-50 rounded-2xl outline-none min-h-[140px] text-base focus:ring-4 ring-blue-500/5 border border-transparent focus:border-blue-500/20" placeholder="记录宠物的表现或洗护建议..." value={report.notes} onChange={e => setReport({...report, notes: e.target.value})} />
              {report.aiEnhancedNotes && (
                <div className="mt-4 p-5 bg-blue-50/50 rounded-2xl text-sm italic text-blue-900 border border-blue-100 leading-relaxed relative animate-fadeIn">
                   <div className="absolute -top-2 left-4 bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded-full font-bold">AI 优化结果</div>
                   "{report.aiEnhancedNotes}"
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex space-x-2 overflow-x-auto no-scrollbar py-2 px-1">
              {REPORT_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setReport({...report, templateId: t.id})} className={`flex-shrink-0 px-6 py-3 rounded-full text-xs font-bold border-2 transition-all ${report.templateId === t.id ? 'bg-slate-800 border-slate-800 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-500'}`}>{t.name}</button>
              ))}
            </div>
            <ReportPreview report={report} template={REPORT_TEMPLATES.find(x => x.id === report.templateId)} containerRef={reportRef} />
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto p-4 pb-8 bg-white/95 backdrop-blur-xl border-t flex space-x-3 z-50">
        {step > 1 && <button onClick={() => setStep(step - 1)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all">返回</button>}
        <button onClick={() => step < 3 ? setStep(step + 1) : generate()} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl active:scale-[0.98] transition-all flex items-center justify-center">
          {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div> : (step < 3 ? '下一步' : '预览并保存')}
        </button>
      </footer>

      {/* API Key 设置面板 */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-fadeIn">
            <h3 className="text-xl font-black text-slate-800 mb-2">AI 服务配置</h3>
            <p className="text-sm text-slate-400 mb-6">请输入您的 Gemini API Key 以启用 AI 润色功能。Key 将保存在您的浏览器中，不会被发送至除 Google 以外的第三方。</p>
            <input 
              type="password"
              className="w-full p-5 bg-slate-100 rounded-2xl outline-none focus:ring-4 ring-blue-500/10 border border-transparent focus:border-blue-500/20 text-sm mb-6"
              placeholder="粘贴您的 API Key..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowSettings(false)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm">取消</button>
              <button onClick={() => handleSaveKey(apiKey)} className="py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-100">保存并使用</button>
            </div>
            <p className="mt-6 text-center text-[10px] text-slate-300">还没有 Key？访问 <a href="https://ai.google.dev/" target="_blank" className="underline">ai.google.dev</a> 免费申请</p>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 animate-fadeIn">
          <p className="text-white text-sm font-bold mb-6 text-center bg-green-500/20 px-6 py-3 rounded-full border border-green-500/30">✨ 报告已生成！长按图片保存</p>
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl mb-8 w-full border-4 border-white/10 max-h-[70vh] overflow-y-auto"><img src={previewImage} className="w-full h-auto" /></div>
          <button onClick={() => setPreviewImage(null)} className="w-full max-w-sm py-4 bg-white text-slate-900 rounded-2xl font-bold active:scale-95">关闭预览</button>
        </div>
      )}
    </div>
  );
};

// 挂载
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}
