
import React from 'react';
import { GroomingReport, ReportTemplate } from '../types';
import { REPORT_TEMPLATES } from '../constants';

interface ReportPreviewProps {
  report: GroomingReport;
  template: ReportTemplate;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({ report, template, containerRef }) => {
  return (
    <div 
      ref={containerRef}
      className="w-full bg-white shadow-xl rounded-3xl overflow-hidden"
      style={{ 
        borderColor: template.primaryColor, 
        borderTopWidth: '10px',
        boxSizing: 'border-box'
      }}
    >
      <div className="p-5 sm:p-6" style={{ backgroundColor: template.secondaryColor }}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: template.primaryColor }}>洗护服务报告</h1>
            <p className="text-[10px] sm:text-xs opacity-70 font-bold uppercase tracking-widest mt-1" style={{ color: template.textColor }}>Pet Grooming Daily Report</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black" style={{ color: template.primaryColor }}>{report.date}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-slate-50">
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">宠物姓名 / NAME</p>
              <p className="font-bold text-slate-800 text-sm">{report.pet.name || '宝贝'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">宠物品种 / BREED</p>
              <p className="font-bold text-slate-800 text-sm">{report.pet.breed || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">体重 / WEIGHT</p>
              <p className="font-bold text-slate-800 text-sm">{report.pet.weight ? `${report.pet.weight}kg` : '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">美容师 / GROOMER</p>
              <p className="font-bold text-slate-800 text-sm">{report.groomerName || '-'}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xs font-black mb-3 flex items-center uppercase tracking-widest" style={{ color: template.primaryColor }}>
            <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: template.primaryColor }}></span>
            服务项目 / Services
          </h2>
          <div className="flex flex-wrap gap-2">
            {report.services.length > 0 ? report.services.map((s, idx) => (
              <span key={idx} className="px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm" style={{ backgroundColor: template.primaryColor, color: '#fff' }}>
                {s}
              </span>
            )) : <span className="text-slate-400 text-xs italic">无选定服务</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {report.photos.before && (
            <div className="flex flex-col items-center">
              <p className="text-[9px] text-slate-400 mb-1.5 uppercase font-black tracking-widest">BEFORE / 洗护前</p>
              <div className="w-full aspect-square overflow-hidden rounded-xl border-2 border-white shadow-md">
                <img src={report.photos.before} className="w-full h-full object-cover" alt="Before" />
              </div>
            </div>
          )}
          {report.photos.after && (
            <div className="flex flex-col items-center">
              <p className="text-[9px] text-slate-400 mb-1.5 uppercase font-black tracking-widest">AFTER / 洗护后</p>
              <div className="w-full aspect-square overflow-hidden rounded-xl border-2 border-white shadow-md">
                <img src={report.photos.after} className="w-full h-full object-cover" alt="After" />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl border-l-4" style={{ backgroundColor: '#fff', borderLeftColor: template.primaryColor }}>
          <h2 className="text-xs font-black mb-2 flex items-center uppercase tracking-widest" style={{ color: template.primaryColor }}>
            <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: template.primaryColor }}></span>
            美容师点评 / FEEDBACK
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-700 italic font-medium">
            "{report.aiEnhancedNotes || report.notes || '宝贝今天表现得非常棒，期待下次再见！'}"
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Professional Pet Grooming Service</p>
        </div>
      </div>
    </div>
  );
};
