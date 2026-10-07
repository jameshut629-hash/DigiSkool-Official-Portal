import React from 'react';

interface DigiSkoolLogoProps {
  variant?: 'horizontal' | 'emblem' | 'emblem-white' | 'stacked' | 'white';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCampusAndContact?: boolean;
  showSubtitle?: boolean;
  campusText?: string;
  contactText?: string;
  className?: string;
}

export const DigiSkoolLogo: React.FC<DigiSkoolLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showCampusAndContact = false,
  showSubtitle = false,
  campusText = 'Lahore & Okara',
  contactText = '0331-7155174',
  className = ''
}) => {
  const heightClass = {
    xs: 'h-7',
    sm: 'h-9',
    md: 'h-11',
    lg: 'h-14',
    xl: 'h-20 sm:h-[84px]',
    '2xl': 'h-24 sm:h-28'
  }[size] || 'h-11';

  if (variant === 'emblem' || variant === 'emblem-white') {
    const emblemSrc = '/digiskool-emblem.png';
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${heightClass} ${className}`}>
        <img
          src={emblemSrc}
          alt="DigiSkool Emblem"
          className="h-full w-auto aspect-square object-contain select-none filter drop-shadow-xs"
          loading="eager"
        />
      </div>
    );
  }

  // Always use authentic original full-color DigiSkool logo
  const logoSrc = '/digiskool-logo.png';

  return (
    <div className={`inline-flex flex-col justify-center items-center ${className}`}>
      <div className={`flex items-center justify-center ${heightClass} max-w-full`}>
        <img
          src={logoSrc}
          alt="DigiSkool - Institute of Digital Skills"
          className="h-full w-auto object-contain max-w-full select-none"
          loading="eager"
        />
      </div>

      {showCampusAndContact && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-[11px] text-slate-600 font-medium border-t border-slate-200/90 pt-1.5 w-full max-w-md">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#6E1231]"></span>
            <span>Campuses: <strong className="text-slate-900 font-semibold">{campusText}</strong></span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1">
            <span className="text-slate-500">Contact:</span>
            <strong className="text-[#6E1231] font-mono font-bold tracking-tight">{contactText}</strong>
          </span>
        </div>
      )}
    </div>
  );
};
