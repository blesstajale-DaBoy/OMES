import React from 'react';
import { useData } from '../context/DataContext';

export const SchoolBanner: React.FC = () => {
  const { schoolProfile } = useData();

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-2.5 sm:px-4 lg:px-6 pt-2.5 sm:pt-4 pb-1 sm:pb-2 print:hidden">
      {/* 
        Sized according to the requested 2763 x 394 pixel proportions (ratio ~7.013:1).
        Plain image display without text overlay.
      */}
      <div className="relative w-full overflow-hidden rounded-xl border border-stone-200 shadow-md bg-stone-950">
        <div className="relative w-full flex items-center justify-center overflow-hidden">
          {/* Plain Banner Image - Fitted cleanly to full width */}
          <img
            src={schoolProfile.bannerPhotoUrl || '/src/assets/images/bnhs_panoramic_campus_1792741601010.jpg'}
            alt="Barobo National High School Official Banner"
            referrerPolicy="no-referrer"
            className="w-full h-auto min-h-[64px] sm:min-h-[100px] md:min-h-[135px] lg:min-h-[160px] max-h-[340px] object-cover sm:object-contain object-center block transition-all"
            onError={(e) => {
              // Fallback to default campus panorama if custom link fails
              (e.target as HTMLImageElement).src = '/src/assets/images/bnhs_panoramic_campus_1792741601010.jpg';
            }}
          />
        </div>

        {/* Announcement Ticker Bar (if active) */}
        {schoolProfile.announcementTicker && (
          <div className="bg-[#4d0c18] border-t border-amber-500/20 px-4 py-2 flex items-center gap-3 text-xs text-amber-100">
            <span className="font-semibold bg-amber-400 text-stone-900 px-2 py-0.5 rounded text-[11px] tracking-wide shrink-0">
              NOTICE
            </span>
            <div className="truncate font-medium">{schoolProfile.announcementTicker}</div>
          </div>
        )}
      </div>
    </div>
  );
};
