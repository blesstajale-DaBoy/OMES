import React from 'react';
import { Check } from 'lucide-react';

export interface SummativeMonitoringItem {
  id: string;
  numberLabel: string;
  description: string;
  movs: string;
}

export interface SummativeMonitoringSection {
  sectionTitle: string;
  items: SummativeMonitoringItem[];
}

export const SUMMATIVE_MONITORING_SECTIONS: SummativeMonitoringSection[] = [
  {
    sectionTitle: '1. Teacher Assessment Planning and Implementation',
    items: [
      {
        id: '1.1',
        numberLabel: '1.1.',
        description:
          'The teacher develops a Table of Specifications (TOS) that reflects the applicable curriculum, competencies taught, content coverage, and appropriate cognitive processes',
        movs: "MOV's: TOS, curriculum guide/MELCs; BOW",
      },
      {
        id: '1.2',
        numberLabel: '1.2.',
        description:
          'The teacher reviews and revises test questions for accuracy, clarity, fairness, language appropriateness, and alignment with the TOS and prescribed competencies before submitting them for validation.',
        movs: "MOV's: Revised test questionnaire indicating the revised items.",
      },
      {
        id: '1.3',
        numberLabel: '1.3.',
        description:
          'The teacher designs appropriate PISA-informed items that require learners to apply knowledge, interpret information, reason, evaluate evidence, and solve problems in contexts relevant to the subject and grade level.',
        movs: "MOV's: Test questionnaire; Sample revised item (s).",
      },
      {
        id: '1.4',
        numberLabel: '1.4.',
        description:
          'The teacher selects suitable item formats and cognitive demands based on the learning competencies and Budget of Work, assessment purpose, and characteristics of the learners.',
        movs: "MOV's: Test blueprint; Test questionnaire",
      },
      {
        id: '1.5',
        numberLabel: '1.5.',
        description:
          'The teacher prepares answer keys and scoring rubrics with clear, accurate, and consistent criteria for selected-response and constructed-response items.',
        movs: "MOV's: Answer key; Scoring rubrics.",
      },
      {
        id: '1.6',
        numberLabel: '1.6.',
        description:
          'The teacher follows school procedures for the reproduction, confidentiality, safekeeping, and controlled distribution of assessment materials.',
        movs: "MOV's: Printing/reproduction log; Printed test questionnaires with complete number of copies",
      },
      {
        id: '1.7',
        numberLabel: '1.7.',
        description:
          'The teacher implements the agreed assessment procedures and seeks technical assistance from the Master Teacher, and or subject or learning area coordinator.',
        movs: "MOV's: Monitoring tool; observation notes; PMCF; incident report, if any",
      },
      {
        id: '1.8',
        numberLabel: '1.8.',
        description:
          'The teacher analyzes learners’ assessment results by item and competency and uses the findings to plan remediation, enrichment, and appropriate instructional adjustments.',
        movs: "MOV's: Item analysis; MPS report and submission; least-learned competencies; intervention/enrichment plan;",
      },
    ],
  },
  {
    sectionTitle: '2. Test Materials',
    items: [
      {
        id: '2.1',
        numberLabel: '2.1.',
        description:
          'The test questionnaire is aligned with the applicable curriculum and covers the competencies taught in the identified assessment period.',
        movs: "MOV's: Curriculum guide/MELCs; BOW; lesson logs/DLL; TOS; test questionnaire",
      },
      {
        id: '2.2',
        numberLabel: '2.2.',
        description:
          'The test items are proportionately distributed according to the approved TOS, content coverage, and intended cognitive processes.',
        movs: "MOV's: Approved TOS; test questionnaire",
      },
      {
        id: '2.3',
        numberLabel: '2.3.',
        description:
          'Items use relevant and meaningful contexts, where appropriate, that allow learners to apply subject knowledge and skills rather than rely solely on recall.',
        movs: "MOV's: Test questionnaire containing stimulus/context review checklist",
      },
      {
        id: '2.4',
        numberLabel: '2.4.',
        description:
          'Items assess appropriate PISA-informed processes, such as interpreting information, applying concepts, reasoning, evaluating evidence, and solving problems, when relevant to the learning area or subject.',
        movs: "MOV's: PISA-informed items in the Questionnaire",
      },
      {
        id: '2.5',
        numberLabel: '2.5.',
        description:
          'Texts, tables, graphs, maps, diagrams, artworks, technical drawings, data sets, or other stimulus materials are accurate, accessible, age-appropriate, and relevant to the competencies and program being assessed.',
        movs: "MOV's: Stimuli in the test items",
      },
      {
        id: '2.6',
        numberLabel: '2.6.',
        description:
          'Directions, wording, response options, technical terms, units, illustrations, and layout are clear and appropriate to the learners’ grade level, language needs, and subject context.',
        movs: "MOV's: Approved test questionnaire",
      },
      {
        id: '2.7',
        numberLabel: '2.7.',
        description:
          'The test includes appropriate item types and levels of cognitive demand consistent with the TOS and intended competencies, including performance-related or applied tasks when suitable to the subject.',
        movs: "MOV's: TOS; item-type and difficulty matrix; test questionnaire",
      },
      {
        id: '2.8',
        numberLabel: '2.8.',
        description:
          'Answer keys, scoring guides, and rubrics provide clear criteria for evaluating responses, including explanations, analyses, creative outputs, and applied or technical tasks where appropriate.',
        movs: "MOV's: Answer key; analytic/holistic rubrics; scoring guide; sample scored responses",
      },
      {
        id: '2.9',
        numberLabel: '2.9.',
        description:
          'Test materials are complete, legible, accessible, and available in sufficient quantities, with appropriate accommodations or alternative formats arranged when needed.',
        movs: "MOV's: Master copy of test questionnaire; sample learner copy of test questionnaire",
      },
      {
        id: '2.10',
        numberLabel: '2.10.',
        description:
          'Assessment materials are organized and handled in accordance with school procedures for confidentiality, security, and responsible use.',
        movs: "MOV's: Secure storage log; issuance/return log; access record; confidentiality undertaking",
      },
    ],
  },
];

export const DEFAULT_SUMMATIVE_MONITORING_RATINGS: Record<string, 'E' | 'NE'> =
  SUMMATIVE_MONITORING_SECTIONS.reduce<Record<string, 'E' | 'NE'>>((acc, section) => {
    for (const item of section.items) {
      acc[item.id] = 'E';
    }
    return acc;
  }, {});

interface SummativeMonitoringToolSectionProps {
  ratings: Record<string, 'E' | 'NE'>;
  onChange: (itemId: string, status: 'E' | 'NE') => void;
}

export const SummativeMonitoringToolSection: React.FC<SummativeMonitoringToolSectionProps> = ({
  ratings,
  onChange,
}) => {
  const allItemIds = SUMMATIVE_MONITORING_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
  const evidentCount = allItemIds.filter((id) => (ratings[id] || 'E') === 'E').length;
  const notEvidentCount = allItemIds.length - evidentCount;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-3.5 sm:p-4 space-y-3">
      {/* Centered Header Title */}
      <div className="text-center py-2.5 px-3 bg-teal-50/90 rounded-lg border border-teal-200">
        <h4 className="text-xs sm:text-sm font-extrabold text-teal-950 tracking-wide">
          Monitoring Tool On The Conduct Of Summative Assessment
        </h4>
      </div>

      {/* Legend & Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-200 text-[11px]">
        <div className="font-bold text-stone-700">
          Indicator Legend:{' '}
          <span className="text-emerald-800">E = Evident</span> ·{' '}
          <span className="text-rose-800">NE = Not Evident</span>
        </div>
        <div className="flex items-center gap-2 font-bold">
          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            E: {evidentCount}/{allItemIds.length}
          </span>
          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
            NE: {notEvidentCount}
          </span>
        </div>
      </div>

      {/* Scrollable Checklist Container */}
      <div className="max-h-80 sm:max-h-96 overflow-y-scroll pr-1.5 space-y-4 border border-stone-100 rounded-lg p-2.5 bg-stone-50/60">
        {SUMMATIVE_MONITORING_SECTIONS.map((section) => (
          <div key={section.sectionTitle} className="space-y-2.5">
            {/* Left-Aligned Section Subtitle */}
            <div className="flex items-center justify-between gap-2 py-2 px-3 bg-amber-50/90 border border-amber-200 rounded-lg sticky top-0 z-10 shadow-2xs">
              <h5 className="text-left text-xs font-extrabold text-stone-900">
                {section.sectionTitle}
              </h5>
              <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider shrink-0">
                Indicator (E / NE)
              </span>
            </div>

            <div className="space-y-2">
              {section.items.map((item) => {
                const currentStatus = ratings[item.id] || 'E';
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-stone-200 bg-white hover:border-teal-300 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-xs text-stone-800 font-medium leading-relaxed">
                        <span className="font-extrabold text-stone-950 mr-1.5">
                          {item.numberLabel}
                        </span>
                        {item.description}
                      </p>
                      <p className="text-[11px] font-semibold text-teal-900 bg-teal-50/70 border border-teal-100 rounded px-2 py-1">
                        {item.movs}
                      </p>
                    </div>

                    {/* Right-Side Clickable Indicator Boxes (E = Evident, NE = Not Evident) */}
                    <div
                      className="flex items-center gap-1.5 shrink-0 self-end sm:self-center"
                      role="group"
                      aria-label={`Indicator ${item.id} rating`}
                    >
                      <button
                        type="button"
                        onClick={() => onChange(item.id, 'E')}
                        title="E = Evident"
                        aria-pressed={currentStatus === 'E'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                          currentStatus === 'E'
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-200'
                            : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center ${
                            currentStatus === 'E'
                              ? 'bg-white text-emerald-700 border-white'
                              : 'bg-white border-stone-400'
                          }`}
                        >
                          {currentStatus === 'E' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span>E = Evident</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onChange(item.id, 'NE')}
                        title="NE = Not Evident"
                        aria-pressed={currentStatus === 'NE'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                          currentStatus === 'NE'
                            ? 'bg-rose-700 text-white border-rose-800 shadow-xs ring-2 ring-rose-200'
                            : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center ${
                            currentStatus === 'NE'
                              ? 'bg-white text-rose-700 border-white'
                              : 'bg-white border-stone-400'
                          }`}
                        >
                          {currentStatus === 'NE' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span>NE = Not Evident</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
