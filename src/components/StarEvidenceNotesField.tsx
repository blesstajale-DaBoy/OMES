import React from 'react';

interface StarEvidenceNotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export const STAR_EVIDENCE_COLUMN_HEADER = 'Brief Evidence/Notes';
export const STAR_EVIDENCE_COLUMN_SUBHEADER =
  '(Use STAR (Situation, Task, Activity and Result) in noting the observation)';

export const StarEvidenceNotesField: React.FC<StarEvidenceNotesFieldProps> = ({
  value,
  onChange,
  rows = 3,
  placeholder = 'Situation: ... | Task: ... | Activity: ... | Result: ...',
}) => {
  return (
    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
      <label className="block font-bold text-stone-800 text-xs">
        Brief Evidence/Notes
        <span className="block text-[11px] font-medium text-stone-500 mt-0.5">
          (Use STAR (Situation, Task, Activity and Result) in noting the observation)
        </span>
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-stone-300 rounded-lg p-2.5 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#701628]"
      />
    </div>
  );
};
