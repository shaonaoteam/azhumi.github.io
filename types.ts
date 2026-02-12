
export interface PetInfo {
  name: string;
  breed: string;
  age: string;
  weight: string;
  gender: 'male' | 'female' | 'other';
}

export interface GroomingService {
  id: string;
  name: string;
  checked: boolean;
}

export interface GroomingReport {
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

export interface ReportTemplate {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  accentColor: string;
  bgPattern?: string;
}
