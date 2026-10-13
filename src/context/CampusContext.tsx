import React, { createContext, useContext, useState, useEffect } from 'react';

export type CampusScope = 'all' | 'lahore' | 'okara' | 'split';

export interface CampusInfo {
  id: 'lahore' | 'okara';
  name: string;
  shortName: string;
  code: string;
  address: string;
  phone: string;
  color: string;
  bgLight: string;
  borderColor: string;
}

export const CAMPUS_DETAILS: Record<'lahore' | 'okara', CampusInfo> = {
  lahore: {
    id: 'lahore',
    name: 'Lahore Campus',
    shortName: 'Lahore',
    code: 'DGSL',
    address: 'First Floor 12-C, Commercial Market, NFC Society Lahore',
    phone: '+92 331-715-5174',
    color: '#6E1231',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200'
  },
  okara: {
    id: 'okara',
    name: 'Okara Campus',
    shortName: 'Okara',
    code: 'DGSO',
    address: '185 Faisal Colony Main Rd, Faisal Colony No. 2 Faisal Town 2, Okara',
    phone: '+92 310-436-7347',
    color: '#047857',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  }
};

interface CampusContextType {
  selectedCampus: CampusScope;
  setSelectedCampus: (campus: CampusScope) => void;
  campusInfo: CampusInfo | null;
  filterByCampus: <T extends { campus?: string; city?: string; student_code?: string; admission_no?: string; voucher_no?: string }>(items: T[]) => T[];
  isMatchCurrentCampus: (item: { campus?: string; city?: string; student_code?: string; admission_no?: string; voucher_no?: string }) => boolean;
}

const CampusContext = createContext<CampusContextType | undefined>(undefined);

const STORAGE_KEY = 'digiskool_active_campus_scope';

export const CampusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCampus, setSelectedCampusState] = useState<CampusScope>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'all' || saved === 'lahore' || saved === 'okara' || saved === 'split') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'all';
  });

  const setSelectedCampus = (campus: CampusScope) => {
    setSelectedCampusState(campus);
    try {
      localStorage.setItem(STORAGE_KEY, campus);
    } catch {
      // ignore
    }
  };

  const campusInfo = selectedCampus === 'lahore' 
    ? CAMPUS_DETAILS.lahore 
    : selectedCampus === 'okara' 
      ? CAMPUS_DETAILS.okara 
      : null;

  const isMatchCurrentCampus = (item: { campus?: string; city?: string; student_code?: string; admission_no?: string; voucher_no?: string }): boolean => {
    if (selectedCampus === 'all' || selectedCampus === 'split') return true;

    const c = (item.campus || '').toLowerCase();
    const city = (item.city || '').toLowerCase();
    const code = (item.student_code || item.admission_no || item.voucher_no || '').toLowerCase();

    const isOkara = c.includes('okara') || city === 'okara' || code.startsWith('dgso') || code.includes('-ok-');

    if (selectedCampus === 'okara') {
      return isOkara;
    }
    if (selectedCampus === 'lahore') {
      return !isOkara; // default or explicitly lahore
    }
    return true;
  };

  const filterByCampus = <T extends { campus?: string; city?: string; student_code?: string; admission_no?: string; voucher_no?: string }>(items: T[]): T[] => {
    if (selectedCampus === 'all' || selectedCampus === 'split') return items;
    return items.filter(isMatchCurrentCampus);
  };

  return (
    <CampusContext.Provider
      value={{
        selectedCampus,
        setSelectedCampus,
        campusInfo,
        filterByCampus,
        isMatchCurrentCampus
      }}
    >
      {children}
    </CampusContext.Provider>
  );
};

export const useCampus = (): CampusContextType => {
  const context = useContext(CampusContext);
  if (!context) {
    throw new Error('useCampus must be used within a CampusProvider');
  }
  return context;
};
