
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

// --- 辅助工具：图片压缩 (解决 iOS 导出失败的关键) ---
const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 1000; // 适当降低尺寸以适配 iOS 内存限制

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

// --- AI 服务 ---
const enhancePetNotes = async (rawNotes: string, petName: string): Promise<string> => {
  try {
    // 修复：安全地获取 API Key
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : (window as any).process?.env?.API_KEY;
    
    if (!apiKey) {
      throw new Error("API Key is missing. Please check your environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一名宠物美容师。请润色这段笔记：宠物名字是"${petName}", 原始笔记内容是"${rawNotes}"。要求：语气专业温馨，字数100字以内，并包含一条简短的居家护理建议。只返回润色后的文本。`,
    });
    return response.text || rawNotes;
  } catch (e: any) { 
    console.error("AI 优化失败:", e);
    // 返回带错误提示的文本或原始文本
    return rawNotes; 
  }
};

// --- UI 组件 ---
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
        {/* 核心配置：不带 capture 属性，将触发系统原生的 拍照/相册 选择菜单 */}
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        {loading ? (
          <div className="flex flex-col items-center animate-pulse">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <span className="text-[8px] text-blue-500 font-bold">处理中...</span>
          </div>
        ) : image ? (
          <img src={image} className="w-full h-full object-cover animate-fadeIn" />
        ) : (
          <div className="text-blue-500 flex flex-col items-center p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-bold text-[10px]">从相册选择或拍照</span>
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
        <div>
          <h1 className="text-2xl font-black" style={{ color: template.primaryColor }}>洗护报告</h1>
          <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest">PET GROOMING REPORT</p>
        </div>
        <p className="font-bold opacity-60 text-sm">{report.date}</p>
      </div>
      
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 grid grid-cols-2 gap-4">
        <div><p className="text-[10px] text-slate-400 uppercase font-bold">宠物姓名</p><p className="font-bold text-slate-800">{report.pet.name || '小可爱'}</p></div>
        <div><p className="text-[10px] text-slate-400 uppercase font-bold">美容师</p><p className="font-bold text-slate-800">{report.groomerName || '-'}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {report.photos.before && (
          <div className="text-center">
            <p className="text-[9px] mb-1.5 font-bold text-slate-400">BEFORE / 洗前</p>
            <img src={report.photos.before} crossOrigin="anonymous" className="rounded-xl shadow-md aspect-square object-cover w-full border-2 border-white" />
          </div>
        )}
        {report.photos.after && (
          <div className="text-center">
            <p className="text-[9px] mb-1.5 font-bold text-slate-400">AFTER / 洗后</p>
            <img src={report.photos.after} crossOrigin="anonymous" className="rounded-xl shadow-md aspect-square object-cover w-full border-2 border-white" />
          </div>
        )}
      </div>

      <div className="mb-6">
        <p className="text-[10px] text-slate-400 uppercase mb-2 font-bold">服务项目</p>
        <div className="flex flex-wrap gap-2">
          {report.services.length > 0 ? (
            report.services.map((s: string, i: number) => (
              <span key={i} className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: template.primaryColor, color: '#fff' }}>{s}</span>
            ))
          ) : (
            <span className="text-[10px] text-slate-300 italic">暂未录入项目</span>
          )}
        </div>
      </div>

      <div className="p-4 bg-white rounded-2xl border-l-4 shadow-sm" style={{ borderColor: template.primaryColor }}>
        <p className="text-xs font-bold text-slate-400 mb-1 uppercase">洗护总结</p>
        <p className="text-sm italic text-slate-700 leading-relaxed font-medium">
          "{report.aiEnhancedNotes || report.notes || '宝贝今天非常配合，洗完香喷喷的！'}"
        </p>
      </div>
    </div>
  </div>
);

// --- 主应用 ---
const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [report, setReport] = useState<GroomingReport>({
    pet: { name: '', breed: '', weight: '' },
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
    const enhanced = await enhancePetNotes(report.notes, report.pet.name || '小可爱');
    setReport({ ...report, aiEnhancedNotes: enhanced });
    setIsEnhancing(false);
  };

  const generate = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const node = reportRef.current;
      
      // iOS Safari 预热渲染：第一次渲染到 Canvas 强制浏览器完成图形纹理加载
      await htmlToImage.toCanvas(node);
      await new Promise(r => setTimeout(r, 600)); // 给硬件一定的响应时间
      
      const dataUrl = await htmlToImage.toPng(node, { 
        pixelRatio: 2, // 限制像素比以防 iOS 崩溃 (Safari 无法处理超大 Canvas)
        cacheBust: true,
        backgroundColor: '#ffffff',
        fontEmbedCSS: '', 
      });
      
      setPreviewImage(dataUrl);
    } catch (e) { 
      console.error("生成失败:", e);
      alert('生成报告图片失败。如果是苹果手机，请尝试减少图片大小并重试。');
    }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto shadow-xl relative overflow-x-hidden">
      <header className="bg-white/95 backdrop-blur-md px-4 py-4 border-b sticky top-0 z-40 flex justify-between items-center">
        <h1 className="font-black text-slate-800 tracking-tight text-lg">🐾 宠爱洗护报告</h1>
        <div className="flex space-x-1">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200'}`} />
          ))}
        </div>
      </header>

      <main className="flex-1 p-6 pb-32 overflow-y-auto no-scrollbar">
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                <span className="w-1 h-4 bg-blue-600 rounded-full mr-2"></span>基本资料
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1">宠物姓名</label>
                  <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 ring-blue-500/5 border border-transparent focus:border-blue-500/20 text-base" placeholder="如：皮皮" value={report.pet.name} onChange={e => setReport({...report, pet: {...report.pet, name: e.target.value}})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1">美容师</label>
                  <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 ring-blue-500/5 border border-transparent focus:border-blue-500/20 text-base" placeholder="您的称呼" value={report.groomerName} onChange={e => setReport({...report, groomerName: e.target.value})} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                <span className="w-1 h-4 bg-blue-600 rounded-full mr-2"></span>洗护项目
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_SERVICES.map(s => (
                  <button key={s} onClick={() => {
                    const news = report.services.includes(s) ? report.services.filter(x => x !== s) : [...report.services, s];
                    setReport({...report, services: news});
                  }} className={`p-4 rounded-2xl text-xs font-bold transition-all border active:scale-95 ${report.services.includes(s) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-slate-500 border-slate-100'}`}>{s}</button>
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
                <h2 className="text-sm font-bold text-slate-800">美容师日志</h2>
                <button 
                  onClick={handleEnhance} 
                  disabled={!report.notes || isEnhancing} 
                  className="text-[10px] bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold disabled:bg-slate-200 transition-all active:scale-95 shadow-lg shadow-blue-100 flex items-center"
                >
                  {isEnhancing ? (
                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>润色中...</>
                  ) : '✨ AI 智能润色'}
                </button>
              </div>
              <textarea className="w-full p-4 bg-slate-50 rounded-2xl outline-none min-h-[140px] text-base focus:ring-4 ring-blue-500/5 border border-transparent focus:border-blue-500/20" placeholder="记录宠物的表现或洗护建议..." value={report.notes} onChange={e => setReport({...report, notes: e.target.value})} />
              {report.aiEnhancedNotes && (
                <div className="mt-4 p-5 bg-blue-50/50 rounded-2xl text-sm italic text-blue-900 border border-blue-100 leading-relaxed relative">
                   <div className="absolute -top-2 left-4 bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded-full font-bold">AI 推荐总结</div>
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
                <button key={t.id} onClick={() => setReport({...report, templateId: t.id})} className={`flex-shrink-0 px-6 py-3 rounded-full text-xs font-bold border-2 transition-all active:scale-95 ${report.templateId === t.id ? 'bg-slate-800 border-slate-800 text-white shadow-xl translate-y-[-2px]' : 'bg-white border-slate-100 text-slate-500'}`}>{t.name}</button>
              ))}
            </div>
            <div className="w-full flex justify-center px-1">
              <ReportPreview report={report} template={REPORT_TEMPLATES.find(x => x.id === report.templateId)} containerRef={reportRef} />
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto p-4 pb-8 bg-white/95 backdrop-blur-xl border-t flex space-x-3 z-50">
        {step > 1 && <button onClick={() => setStep(step - 1)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all">返回</button>}
        <button onClick={() => step < 3 ? setStep(step + 1) : generate()} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center">
          {isGenerating ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>正在生成中...</>
          ) : (step < 3 ? '下一步' : '预览并保存')}
        </button>
      </footer>

      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 no-select animate-fadeIn">
          <div className="w-full max-w-sm flex flex-col items-center">
            <p className="text-white text-sm font-bold mb-6 text-center bg-green-500/20 px-6 py-3 rounded-full border border-green-500/30">
               ✨ 报告已生成！长按下方图片保存
            </p>
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl mb-8 w-full border-4 border-white/10 overflow-y-auto max-h-[60vh]">
              <img src={previewImage} className="w-full h-auto" alt="Final Report" />
            </div>
            <div className="grid grid-cols-1 w-full gap-3">
               <button onClick={() => setPreviewImage(null)} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all">返回编辑</button>
            </div>
          </div>
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
