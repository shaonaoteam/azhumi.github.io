
import React from 'react';

interface PhotoUploadProps {
  label: string;
  image?: string;
  onUpload: (base64: string) => void;
  className?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ label, image, onUpload, className }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onUpload(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      <span className="text-xs sm:text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">{label}</span>
      <label className="relative w-full aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100 hover:border-blue-300 transition-all active:scale-[0.98]">
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={handleFileChange}
        />
        {image ? (
          <img src={image} alt={label} className="w-full h-full object-cover animate-fadeIn" />
        ) : (
          <div className="flex flex-col items-center text-slate-400 p-4">
            <div className="p-3 bg-white rounded-full shadow-sm mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500">点击拍照/上传</span>
          </div>
        )}
      </label>
    </div>
  );
};
