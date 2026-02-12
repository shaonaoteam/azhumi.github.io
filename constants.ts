
import { ReportTemplate, GroomingService } from './types';

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'modern-blue',
    name: '极简商务蓝',
    primaryColor: '#2563eb', // blue-600
    secondaryColor: '#f0f9ff', // blue-50
    textColor: '#1e293b', // slate-800
    accentColor: '#3b82f6',
  },
  {
    id: 'sweet-pink',
    name: '温馨宠物粉',
    primaryColor: '#db2777', // pink-600
    secondaryColor: '#fdf2f8', // pink-50
    textColor: '#4c0519', // rose-950
    accentColor: '#ec4899',
  },
  {
    id: 'nature-green',
    name: '生机草本绿',
    primaryColor: '#059669', // emerald-600
    secondaryColor: '#ecfdf5', // emerald-50
    textColor: '#064e3b', // emerald-950
    accentColor: '#10b981',
  },
  {
    id: 'elegant-gold',
    name: '奢华典雅金',
    primaryColor: '#92400e', // amber-800
    secondaryColor: '#fffbeb', // amber-50
    textColor: '#451a03', // amber-950
    accentColor: '#d97706',
  }
];

export const DEFAULT_SERVICES: GroomingService[] = [
  { id: '1', name: '洗浴', checked: false },
  { id: '2', name: '修剪造型', checked: false },
  { id: '3', name: '剪指甲', checked: false },
  { id: '4', name: '清理耳道', checked: false },
  { id: '5', name: '挤肛门腺', checked: false },
  { id: '6', name: '刷牙/牙粉', checked: false },
  { id: '7', name: '去死毛', checked: false },
  { id: '8', name: 'SPA按摩', checked: false },
];
