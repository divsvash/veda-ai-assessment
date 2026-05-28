'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import { AssignmentOutput, Difficulty, Section, Question } from '@/types';
import { fetchAssignmentOutput, regenerateSection } from '@/lib/api';
import { wsManager } from '@/lib/websocket';
import { useAssignmentStore } from '@/store/assignmentStore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

/* ─── Difficulty badge ─────────────────────────────────────────────────────── */
const DIFF_STYLES: Record<Difficulty, { bg: string; text: string }> = {
  easy:     { bg: 'bg-green-50',  text: 'text-green-700'  },
  moderate: { bg: 'bg-amber-50',  text: 'text-amber-700'  },
  hard:     { bg: 'bg-red-50',    text: 'text-red-600'    },
};

function DiffBadge({ level }: { level: Difficulty }) {
  const s = DIFF_STYLES[level] ?? DIFF_STYLES.moderate;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0 text-[9.5px] font-semibold uppercase tracking-wide border',
        s.bg,
        s.text,
        level === 'easy'     ? 'border-green-200' :
        level === 'moderate' ? 'border-amber-200' :
                               'border-red-200'
      )}
    >
      {level}
    </span>
  );
}

/* ─── Question item ────────────────────────────────────────────────────────── */
function QuestionItem({ q, num }: { q: Question; num: number }) {
  return (
    <div className="flex gap-2 text-[12.5px] leading-relaxed text-gray-800 mb-4">
      <span className="flex-shrink-0 font-medium text-gray-700 tabular-nums">{num}.</span>
      <div className="flex-1">
        {/* difficulty tag inline in square brackets — exact Figma style */}
        <span className="text-gray-800">
          [<span className={cn(
            'font-medium',
            q.difficulty === 'easy'     ? 'text-green-700' :
            q.difficulty === 'moderate' ? 'text-amber-700' :
                                          'text-red-600'
          )}>
            {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
          </span>] {q.text}
        </span>{' '}
        <span className="text-gray-500 text-[11.5px] font-medium">[{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]</span>

        {/* MCQ options */}
        {q.options && q.options.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 ml-1">
            {q.options.map((opt, i) => (
              <li key={i} className="text-[12px] text-gray-600">
                ({String.fromCharCode(65 + i)}) {opt}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ─── Section block ────────────────────────────────────────────────────────── */
function SectionBlock({
  section,
  sectionIndex,
  onRegenerate,
  isRegenerating,
}: {
  section: Section;
  sectionIndex: number;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  const qType = section.questionType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mb-6">
      {/* Section title — centered, bold, matches Figma */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex-1 text-center">
          <h3 className="text-[13.5px] font-bold text-gray-900">{section.title}</h3>
          <p className="text-[11.5px] text-gray-600 font-medium">{qType}</p>
          <p className="text-[11px] text-gray-500 mt-0.5 italic">
            {section.instruction}
          </p>
        </div>

        {/* Regenerate button — floating right of section header */}
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors flex-shrink-0 mt-0.5 disabled:opacity-60"
        >
          {isRegenerating ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <RefreshCw size={10} />
          )}
          Regenerate
        </button>
      </div>

      <div className="mt-3">
        {section.questions.map((q, qIdx) => (
          <QuestionItem key={q.id} q={q} num={qIdx + 1} />
        ))}
      </div>

      <p className="text-[11px] text-gray-400 text-right font-medium border-t border-gray-100 pt-1.5 mt-1">
        End of {section.title}
      </p>
    </div>
  );
}

/* ─── Main export ──────────────────────────────────────────────────────────── */
interface OutputViewProps {
  assignmentId: string;
}

export default function OutputView({ assignmentId }: OutputViewProps) {
  const [output, setOutput] = useState<AssignmentOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const { outputs, setOutput: storeSetOutput } = useAssignmentStore();

  const loadOutput = useCallback(async () => {
    const cached = outputs.get(assignmentId);
    if (cached) { setOutput(cached); setLoading(false); return; }
    try {
      const data = await fetchAssignmentOutput(assignmentId);
      setOutput(data.output);
      storeSetOutput(assignmentId, data.output);
    } catch {
      toast.error('Output not ready yet');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, outputs, storeSetOutput]);

  useEffect(() => {
    loadOutput();
    const unsub = wsManager.subscribe(assignmentId, (update) => {
      if (update.status === 'completed' && update.result) {
        setOutput(update.result);
        storeSetOutput(assignmentId, update.result);
        setLoading(false);
      }
    });
    return unsub;
  }, [assignmentId, loadOutput, storeSetOutput]);

  const handleRegenerate = async (sectionIndex: number) => {
    setRegenerating(sectionIndex);
    try {
      const data = await regenerateSection(assignmentId, sectionIndex);
      if (data.fullOutput) {
        setOutput(data.fullOutput);
        storeSetOutput(assignmentId, data.fullOutput);
        toast.success(`Section ${String.fromCharCode(65 + sectionIndex)} regenerated!`);
      }
    } catch {
      toast.error('Regeneration failed');
    } finally {
      setRegenerating(null);
    }
  };

  /* Print-to-PDF */
  const handleDownload = () => {
    const el = document.getElementById('paper-printable');
    if (!el || !output) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head>
      <title>${output.schoolName} – ${output.subject}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Inter,sans-serif;padding:48px 56px;color:#111;max-width:760px;margin:0 auto;font-size:12px}
        h1{font-size:17px;font-weight:700;text-align:center}
        h2,h3{font-size:13px;font-weight:600;text-align:center;margin-top:3px}
        .meta{display:flex;justify-content:space-between;margin:14px 0 8px;font-size:11.5px}
        .instructions{font-size:11px;margin-bottom:12px}
        .student-row{display:flex;gap:32px;margin-bottom:18px;font-size:11.5px}
        .underline{display:inline-block;border-bottom:1px solid #333;width:120px;margin-left:4px}
        .section-header{text-align:center;font-weight:700;font-size:13px;border-top:1.5px solid #333;padding-top:10px;margin-top:12px;margin-bottom:2px}
        .q-type{text-align:center;font-size:11.5px;font-weight:600}
        .q-instruction{text-align:center;font-size:10.5px;font-style:italic;margin-bottom:10px;color:#555}
        .q{display:flex;gap:6px;margin-bottom:10px;font-size:11.5px;line-height:1.6}
        .q-num{flex-shrink:0;font-weight:600;min-width:16px}
        .options{margin:4px 0 0 4px;font-size:10.5px}
        .options li{margin:2px 0;list-style:none}
        .answer-key{border-top:2px solid #333;margin-top:24px;padding-top:14px}
        .answer-key h2{text-align:left;font-size:13px;margin-bottom:10px}
        .ak-q{display:flex;gap:6px;font-size:11px;margin-bottom:7px;line-height:1.55}
        @media print{body{padding:28px 36px}}
      </style>
    </head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-10 flex flex-col items-center gap-4 max-w-xs w-full">
          <Loader2 size={28} className="animate-spin text-gray-400" />
          <div className="text-center">
            <p className="text-[13.5px] font-semibold text-gray-800">Generating Question Paper</p>
            <p className="text-[12px] text-gray-400 mt-1">AI is crafting your assessment...</p>
          </div>
          {/* Animated stages */}
          <div className="w-full space-y-2 mt-2">
            {['Analyzing syllabus...', 'Generating sections...', 'Balancing difficulty...', 'Creating answer key...'].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[11.5px] text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-[13px] text-gray-400">No output available yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Dark Action Bar — exact Figma ── */}
      <div className="bg-[#1F2937] flex items-start gap-4 px-6 py-4 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] text-gray-300 leading-relaxed">
            <span className="text-white font-semibold">Certainly, Lakshya!</span>{' '}
            Here are customized Question Paper for your CBSE {output.grade}{' '}
            {output.subject} classes on the NCERT chapters:
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg px-4 py-2 text-[12.5px] font-medium transition-colors flex-shrink-0 whitespace-nowrap"
        >
          <Download size={13} />
          Download as PDF
        </button>
      </div>

      {/* ── Scrollable Paper Area ── */}
      <div className="flex-1 overflow-auto bg-[#F3F4F6] py-6 px-4">
        <div className="max-w-[680px] mx-auto">

          {/* White paper card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Printable content */}
            <div id="paper-printable" className="px-10 pt-8 pb-10">

              {/* ── School Header ── */}
              <div className="text-center mb-4 pb-4 border-b border-gray-300">
                <h1 className="text-[18px] font-bold text-gray-900 tracking-tight">
                  {output.schoolName}
                </h1>
                <p className="text-[13px] font-semibold text-gray-700 mt-1.5">
                  Subject: {output.subject}
                </p>
                <p className="text-[13px] text-gray-600">
                  Class: {output.grade}
                </p>
              </div>

              {/* ── Meta row ── */}
              <div className="flex items-center justify-between text-[12.5px] text-gray-700 mb-3">
                <span><span className="font-semibold">Time Allowed:</span> {output.timeAllowed} minutes</span>
                <span><span className="font-semibold">Maximum Marks:</span> {output.maximumMarks}</span>
              </div>

              {/* ── General instruction ── */}
              <p className="text-[12px] text-gray-600 mb-4">
                All questions are compulsory unless stated otherwise.
              </p>

              {/* ── Student info ── */}
              <div className="flex flex-col gap-1.5 mb-5 text-[12.5px] text-gray-700">
                <div>Name: <span className="inline-block border-b border-gray-500 w-36 ml-1" /></div>
                <div>Roll Number: <span className="inline-block border-b border-gray-500 w-28 ml-1" /></div>
                <div>Class: {output.grade} Section: <span className="inline-block border-b border-gray-500 w-16 ml-1" /></div>
              </div>

              {/* ── Question Sections ── */}
              {output.sections.map((section, sIdx) => (
                <SectionBlock
                  key={section.id}
                  section={section}
                  sectionIndex={sIdx}
                  onRegenerate={() => handleRegenerate(sIdx)}
                  isRegenerating={regenerating === sIdx}
                />
              ))}

              {/* ── Answer Key ── */}
              <div className="mt-6 pt-5 border-t-2 border-gray-300">
                <h2 className="text-[13.5px] font-bold text-gray-900 mb-4">Answer Key:</h2>
                {output.sections.map((section) => (
                  <div key={section.id} className="mb-4">
                    {output.sections.length > 1 && (
                      <p className="text-[12px] font-semibold text-gray-700 mb-1.5">{section.title}</p>
                    )}
                    <div className="space-y-2">
                      {section.questions.map((q, qIdx) => (
                        <div key={q.id} className="flex gap-2 text-[12px] text-gray-600 leading-relaxed">
                          <span className="font-semibold text-gray-700 flex-shrink-0 tabular-nums">{qIdx + 1}.</span>
                          <span className="flex-1">{q.answer || 'Refer to textbook chapter.'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>{/* /paper-printable */}
          </div>{/* /white card */}
        </div>{/* /max-w */}
      </div>{/* /scroll area */}
    </div>
  );
}
