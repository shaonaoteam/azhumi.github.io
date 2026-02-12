
import React, { useState, useRef, useEffect } from 'react';
import { GroomingReport, PetInfo, GroomingService, ReportTemplate } from './types';
import { DEFAULT_SERVICES, REPORT_TEMPLATES } from './constants';
import { PhotoUpload } from './components/PhotoUpload';
import { ReportPreview } from './components/ReportPreview';
import { geminiService } from './services/geminiService';

// Import html-to-image
import * as htmlToImage from 'html-to-image';

const App: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [report, setReport] = useState<GroomingReport>({
    pet: { name: '', breed: '', age: '', weight: '', gender: 'male' },
    services: [],
    notes: '',
    date: new Date().toISOString().split('T')[0],
    groomerName: '',
    photos: {},
    templateId: REPORT_TEMPLATES[0].id
  });
  const [services, setServices] = useState<GroomingService[]>(DEFAULT_SERVICES);
  const reportRef = useRef<HTMLDivElement>(null);

  const currentTemplate = REPORT_TEMPLATES.find(t => t.id === report.templateId) || REPORT_TEMPLATES[0];

  const handlePetInfoChange = (field: keyof PetInfo, value: string) => {
    setReport(prev => ({
      ...prev,
      pet: { ...prev.pet, [field]: value }
    }));
  };

  const toggleService = (id: string) => {
    const updated = services.map(s => s.id === id ? { ...s, checked: !s.checked } : s);
    setServices(updated);
    setReport(prev => ({
      ...prev,
      services: updated.filter(s => s.checked).map(s => s.name)
    }));
  };

  const handleEnhanceNotes = async () => {
    if (!report.notes) return;
    setIsEnhancing(true);
    const enhanced = await geminiService.enhanceNotes(report.notes, report.pet.name || '小可爱');
    setReport(prev => ({ ...prev, aiEnhancedNotes: enhanced }));
    setIsEnhancing(false);
  };

  const downloadReport = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      // Small buffer for rendering
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const dataUrl = await htmlToImage.toPng(reportRef.current, { 
        quality: 1, 
        pixelRatio: 3, // Higher pixel ratio for better clarity on Retina displays
        cacheBust: true,
        fontEmbedCSS: '', 
      });
      
      setPreviewImage(dataUrl);
      
      // Auto-trigger download where supported
      const link = document.createElement('a');
      link.download = `洗护报告-${report.pet.name || '宝贝'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error('Export failed', err);
      alert('图片生成受限。请长按下方预览图直接保存。');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto shadow-xl relative overflow-x-hidden">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md px-4 sm:px-6 py-4 border-b flex justify-between items-center sticky top-0 z-40">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">爱宠洗护报告</h1>
        <div className="flex space-x-1.5 items-center">
          {[1, 2, 3].map(step => (
            <div 
              key={step} 
              className={`w-2 h-2 rounded-full transition-all duration-300 ${activeStep === step ? 'bg-blue-600 w-6' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 pb-44 overflow-y-auto no-scrollbar">
        {activeStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-md font-bold mb-5 text-slate-800 flex items-center">
                <span className="w-1.5 h-5 bg-blue-600 rounded-full mr-2.5"></span>
                宠物基本资料
              </h2>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-5">
                {[
                  { label: '宠物姓名', field: 'name', placeholder: '请输入名字' },
                  { label: '宠物品种', field: 'breed', placeholder: '如：柯基' },
                  { label: '体重 (kg)', field: 'weight', placeholder: '体重', type: 'number' },
                  { label: '美容师', field: 'groomer', placeholder: '您的称呼', isGroomer: true }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 block ml-1 uppercase tracking-wider">{item.label}</label>
                    <input 
                      type={item.type || 'text'} 
                      className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-slate-100 focus:border-blue-500/50 focus:ring-4 ring-blue-500/5 text-slate-900 placeholder-slate-400 text-base transition-all appearance-none"
                      placeholder={item.placeholder}
                      value={item.isGroomer ? report.groomerName : (report.pet as any)[item.field]}
                      onChange={(e) => item.isGroomer 
                        ? setReport(prev => ({ ...prev, groomerName: e.target.value }))
                        : handlePetInfoChange(item.field as keyof PetInfo, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-md font-bold mb-5 text-slate-800 flex items-center">
                <span className="w-1.5 h-5 bg-blue-600 rounded-full mr-2.5"></span>
                洗护服务项目
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={`py-4 px-3 rounded-2xl text-sm font-bold transition-all border ${
                      s.checked 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' 
                        : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50 active:bg-slate-100'
                    } active:scale-95 no-select`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-md font-bold mb-5 text-slate-800 flex items-center">
                <span className="w-1.5 h-5 bg-blue-600 rounded-full mr-2.5"></span>
                洗护对比图
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <PhotoUpload 
                  label="洗护前" 
                  image={report.photos.before}
                  onUpload={(img) => setReport(prev => ({ ...prev, photos: { ...prev.photos, before: img } }))} 
                />
                <PhotoUpload 
                  label="洗护后" 
                  image={report.photos.after}
                  onUpload={(img) => setReport(prev => ({ ...prev, photos: { ...prev.photos, after: img } }))} 
                />
              </div>
            </section>

            <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-md font-bold text-slate-800 flex items-center">
                  <span className="w-1.5 h-5 bg-blue-600 rounded-full mr-2.5"></span>
                  记录点评
                </h2>
                <button 
                  onClick={handleEnhanceNotes}
                  disabled={!report.notes || isEnhancing}
                  className="text-xs bg-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-lg shadow-blue-100 disabled:bg-slate-200 transition-all flex items-center active:scale-95 no-select"
                >
                  {isEnhancing ? '润色中...' : '✨ AI 优化'}
                </button>
              </div>
              <textarea 
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none min-h-[160px] text-base focus:ring-4 ring-blue-500/5 border border-slate-100 focus:border-blue-500/50 text-slate-900 placeholder-slate-400 transition-all appearance-none"
                placeholder="记录宠物今天洗护的表现..."
                value={report.notes}
                onChange={(e) => setReport(prev => ({ ...prev, notes: e.target.value }))}
              />
              {report.aiEnhancedNotes && (
                <div className="mt-5 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl relative">
                  <p className="text-sm text-blue-900 leading-relaxed italic">{report.aiEnhancedNotes}</p>
                </div>
              )}
            </section>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-6 animate-fadeIn pb-12">
            <section>
              <h2 className="text-md font-bold mb-4 text-slate-800 ml-1 flex items-center">
                <span className="w-1.5 h-5 bg-blue-600 rounded-full mr-2.5"></span>
                选择报告模板
              </h2>
              <div className="flex flex-nowrap space-x-3 overflow-x-auto pb-6 pt-2 px-1 no-scrollbar touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                {REPORT_TEMPLATES.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setReport(prev => ({ ...prev, templateId: t.id }))}
                    className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-bold border-2 transition-all duration-300 no-select ${
                      report.templateId === t.id 
                        ? 'bg-slate-800 border-slate-800 text-white shadow-xl scale-105 -translate-y-1' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 active:bg-slate-50'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
                <div className="flex-shrink-0 w-10"></div>
              </div>
            </section>

            <div className="px-2 w-full flex justify-center">
              <div className="w-full max-w-md">
                <ReportPreview 
                  report={report} 
                  template={currentTemplate} 
                  containerRef={reportRef} 
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Actions */}
      <footer className="bg-white/80 backdrop-blur-xl p-4 sm:p-6 border-t fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-50" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <div className="flex space-x-3 max-w-md mx-auto">
          {activeStep > 1 && (
            <button 
              onClick={() => setActiveStep(prev => prev - 1)}
              className="px-6 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 active:bg-slate-300 transition-all active:scale-95 no-select"
            >
              返回
            </button>
          )}
          
          <button 
            onClick={activeStep < 3 ? () => setActiveStep(prev => prev + 1) : downloadReport}
            disabled={isGenerating}
            className={`flex-1 py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-95 no-select flex items-center justify-center ${
              activeStep < 3 ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-green-600 text-white shadow-green-200'
            }`}
          >
            {isGenerating ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (activeStep < 3 ? '下一步' : '生成并保存报告')}
          </button>
        </div>
      </footer>

      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 animate-fadeIn no-select">
          <div className="absolute top-6 right-6">
            <button onClick={() => setPreviewImage(null)} className="p-3 bg-white/10 rounded-full text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <p className="text-white text-sm font-bold mb-4">✨ 生成成功！长按下方图片保存至相册</p>
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-h-[75vh] w-full max-w-sm">
            <img src={previewImage} alt="Report Preview" className="w-full h-auto object-contain" />
          </div>
          <button onClick={() => setPreviewImage(null)} className="mt-8 px-10 py-3 bg-white text-slate-900 font-bold rounded-full">完成</button>
        </div>
      )}
    </div>
  );
};

export default App;
