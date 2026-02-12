
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
      const MAX_SIZE = 1200; 
      if (width > height) {
        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
      } else {
        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
  });
};

// --- AI 逻辑 ---
const getEffectiveApiKey = () => {
  const userKey = localStorage.getItem('PET_GROOMING_API_KEY');
  if (userKey) return userKey;

  // 安全检查 process 环境，防止在浏览器环境下报错
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // 忽略环境检查错误
  }
  return '';
};

const enhancePetNotes = async (rawNotes: string, petName: string): Promise<string> => {
  const apiKey = getEffectiveApiKey();
  if (!apiKey) {
    // 逻辑已在 handleEnhance 中处理，这里作为最后防线
    throw new Error("请先配置 API Key");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一名宠物美容师。请润色这段笔记：宠物名字是"${petName}", 原始内容是"${rawNotes}"。要求：语气专业温馨，100字以内，并包含一条简短的居家护理建议。只返回润色后的文本。`,
    });
    return response.text || rawNotes;
  } catch (e: any) { 
    console.error("AI 优化失败:", e);
    if (e.message?.includes('503') || e.message?.includes('high demand')) {
      throw new Error("Gemini 服务器目前请求量过大（503），请稍后重试。");
    }
    throw new Error(e.message || "AI 润色请求失败，请检查 API Key 是否有效。");
  }
};

// --- 子组件 ---
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
      <span className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{label}</span>
      <label className="relative w-full aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden active:scale-95 transition-transform">
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        {loading ? (
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        ) : image ? (
          <img src={image} className="w-full h-full object-cover animate-fadeIn" alt="uploaded" />
        ) : (
          <div className="text-blue-500 flex flex-col items-center p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="font-bold text-[10px]">拍照或上传</span>
          </div>
        )}
      </label>
    </div>
  );
};

const ReportPreview = ({ report, template, containerRef }: any) => (
  <div ref={containerRef} className="w-full bg-white shadow-2xl rounded-[2.5rem] overflow-hidden" style={{ borderTop: `12px solid ${template.primaryColor}` }}>
    <div className="p-8" style={{ backgroundColor: template.secondaryColor }}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black" style={{ color: template.primaryColor }}>洗护报告</h1>
          <p className="text-[10px] opacity-40 font-bold uppercase tracking-[0.2em] mt-1">Grooming Master Report</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black opacity-60">{report.date}</p>
        </div>
      </div>
      
      <div className="bg-white p-5 rounded-3xl shadow-sm mb-8 grid grid-cols-2 gap-4 border border-slate-50">
        <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">宝贝姓名</p><p className="font-bold text-slate-800">{report.pet.name || '可爱宝贝'}</p></div>
        <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">主理美容师</p><p className="font-bold text-slate-800">{report.groomerName || '-'}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8">
        {report.photos.before && (
          <div className="space-y-2">
            <p className="text-center text-[9px] font-black text-slate-400 tracking-widest uppercase">Before 洗前</p>
            <img src={report.photos.before} className="rounded-2xl shadow-md aspect-square object-cover w-full border-4 border-white" crossOrigin="anonymous" />
          </div>
        )}
        {report.photos.after && (
          <div className="space-y-2">
            <p className="text-center text-[9px] font-black text-slate-400 tracking-widest uppercase">After 洗后</p>
            <img src={report.photos.after} className="rounded-2xl shadow-md aspect-square object-cover w-full border-4 border-white" crossOrigin="anonymous" />
          </div>
        )}
      </div>

      <div className="mb-8">
        <p className="text-[10px] text-slate-400 uppercase mb-3 font-bold tracking-widest">服务项目清单</p>
        <div className="flex flex-wrap gap-2">
          {report.services.length > 0 ? (
            report.services.map((s: string, i: number) => (
              <span key={i} className="px-4 py-2 rounded-xl text-[10px] font-black" style={{ backgroundColor: template.primaryColor, color: '#fff' }}>{s}</span>
            ))
          ) : (
            <span className="text-slate-300 italic text-[10px]">未选定项目</span>
          )}
        </div>
      </div>

      <div className="p-6 bg-white rounded-3xl border-l-8 shadow-sm" style={{ borderColor: template.primaryColor }}>
        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">专家点评</p>
        <p className="text-sm italic text-slate-700 leading-relaxed font-medium">
          "{report.aiEnhancedNotes || report.notes || '宝贝今天非常勇敢，洗护过程很顺利。'}"
        </p>
      </div>
    </div>
  </div>
);

// --- 主应用 ---
const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('PET_GROOMING_API_KEY') || "");
  const [report, setReport] = useState<GroomingReport>({
    pet: { name: '', breed: '', weight: '' },
    services: [], notes: '', date: new Date().toISOString().split('T')[0],
    groomerName: '', photos: {}, templateId: REPORT_TEMPLATES[0].id
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleSaveApiKey = () => {
    localStorage.setItem('PET_GROOMING_API_KEY', apiKeyInput.trim());
    setShowSettings(false);
    alert("设置已保存");
  };

  const handleEnhance = async () => {
    if (!report.notes) return;

    // 先获取 Key，安全检查
    const apiKey = getEffectiveApiKey();
    if (!apiKey) {
      alert("为了使用 AI 润色功能，请先配置您的 Gemini API Key。");
      setShowSettings(true); // 自动打开设置界面
      return;
    }

    setIsEnhancing(true);
    try {
      const enhanced = await enhancePetNotes(report.notes, report.pet.name || '小宝贝');
      setReport({ ...report, aiEnhancedNotes: enhanced });
    } catch (e: any) {
      alert(e.message);
    }
    setIsEnhancing(false);
  };

  const generate = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const node = reportRef.current;
      await htmlToImage.toCanvas(node);
      await new Promise(r => setTimeout(r, 800));
      const dataUrl = await htmlToImage.toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
      setPreviewImage(dataUrl);
    } catch (e) { 
      console.error(e);
      alert('生成报告失败，请尝试刷新页面重试。');
    }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto shadow-2xl relative">
      <header className="bg-white/95 backdrop-blur-md px-6 py-5 border-b sticky top-0 z-40 flex justify-between items-center">
        <h1 className="font-black text-slate-900 text-xl flex items-center">
          <span className="mr-2">🐾</span> A猪咪宠物洗护报告
        </h1>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-blue-600 active:scale-90 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <div className="flex space-x-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 pb-40 overflow-y-auto no-scrollbar">
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 mb-6 flex items-center">
                <span className="w-1.5 h-4 bg-blue-600 rounded-full mr-3"></span>基本资料
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full p-5 bg-slate-50 rounded-2xl outline-none focus:ring-4 ring-blue-500/5 transition-all text-base border border-transparent focus:border-blue-100" placeholder="宠物姓名" value={report.pet.name} onChange={e => setReport({...report, pet: {...report.pet, name: e.target.value}})} />
                <input className="w-full p-5 bg-slate-50 rounded-2xl outline-none focus:ring-4 ring-blue-500/5 transition-all text-base border border-transparent focus:border-blue-100" placeholder="主理美容师" value={report.groomerName} onChange={e => setReport({...report, groomerName: e.target.value})} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 mb-6 flex items-center">
                <span className="w-1.5 h-4 bg-blue-600 rounded-full mr-3"></span>服务项目
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {DEFAULT_SERVICES.map(s => (
                  <button key={s} onClick={() => {
                    const news = report.services.includes(s) ? report.services.filter(x => x !== s) : [...report.services, s];
                    setReport({...report, services: news});
                  }} className={`p-4 rounded-2xl text-[11px] font-black transition-all border active:scale-95 ${report.services.includes(s) ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-100' : 'bg-white text-slate-400 border-slate-100'}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <PhotoUpload label="Before 洗前" image={report.photos.before} onUpload={(img: string) => setReport({...report, photos: {...report.photos, before: img}})} />
              <PhotoUpload label="After 洗后" image={report.photos.after} onUpload={(img: string) => setReport({...report, photos: {...report.photos, after: img}})} />
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-black text-slate-800">专业点评</h2>
                <button onClick={handleEnhance} disabled={!report.notes || isEnhancing} className="text-[10px] bg-blue-600 text-white px-5 py-2.5 rounded-full font-black disabled:bg-slate-200 shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center">
                  {isEnhancing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : '✨ AI 智能润色'}
                </button>
              </div>
              <textarea className="w-full p-5 bg-slate-50 rounded-2xl outline-none min-h-[160px] text-base focus:ring-4 ring-blue-500/5 transition-all border border-transparent focus:border-blue-100" placeholder="在这里输入洗护心得或建议..." value={report.notes} onChange={e => setReport({...report, notes: e.target.value})} />
              {report.aiEnhancedNotes && (
                <div className="mt-5 p-5 bg-blue-50/50 rounded-2xl text-[13px] italic text-blue-900 border border-blue-100 leading-relaxed relative animate-fadeIn shadow-sm">
                   <div className="absolute -top-2 left-5 bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black">AI 润色预览</div>
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
                <button key={t.id} onClick={() => setReport({...report, templateId: t.id})} className={`flex-shrink-0 px-6 py-3 rounded-full text-[11px] font-black border-2 transition-all ${report.templateId === t.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl translate-y-[-2px]' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>{t.name}</button>
              ))}
            </div>
            <div className="px-1">
              <ReportPreview report={report} template={REPORT_TEMPLATES.find(x => x.id === report.templateId)} containerRef={reportRef} />
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto p-6 pb-10 bg-white/80 backdrop-blur-2xl border-t flex space-x-3 z-50">
        {step > 1 && <button onClick={() => setStep(step - 1)} className="px-8 py-5 bg-slate-100 text-slate-600 rounded-3xl font-black text-sm active:scale-95 transition-all">返回</button>}
        <button onClick={() => step < 3 ? setStep(step + 1) : generate()} className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black text-sm shadow-2xl shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center">
          {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" /> : (step < 3 ? '下一步' : '导出精美报告')}
        </button>
      </footer>

      {/* API Key 设置模态框 */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-2">API 设置</h3>
            <p className="text-xs text-slate-400 mb-6">请输入您的 Gemini API Key。该 Key 将保存在本地浏览器中。</p>
            <input 
              type="password"
              className="w-full p-5 bg-slate-50 rounded-2xl outline-none focus:ring-4 ring-blue-500/10 border border-transparent focus:border-blue-100 text-sm mb-6"
              placeholder="在这里粘贴您的 API Key..."
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
            />
            <div className="flex space-x-3">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm active:scale-95">取消</button>
              <button onClick={handleSaveApiKey} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-100 active:scale-95">保存设置</button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8 animate-fadeIn">
          <div className="absolute top-6 right-6">
            <button onClick={() => setPreviewImage(null)} className="p-3 bg-white/10 rounded-full text-white active:scale-90 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <p className="text-white text-xs font-black mb-6 text-center bg-blue-500/20 px-6 py-3 rounded-full border border-blue-500/30">✨ 报告已就绪！长按保存图片分享</p>
          <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl mb-8 w-full max-h-[70vh] overflow-y-auto border-4 border-white/20">
             <img src={previewImage} className="w-full h-auto" alt="final report" />
          </div>
          <button onClick={() => setPreviewImage(null)} className="w-full max-w-xs py-5 bg-white text-slate-900 rounded-3xl font-black text-sm active:scale-95">完成</button>
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
