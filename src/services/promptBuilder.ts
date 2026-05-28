// src/services/promptBuilder.ts
import { CreateAssignmentDTO, QuestionTypeConfig } from '../types';

function questionTypeToLabel(type: string): string {
  const map: Record<string, string> = {
    multiple_choice: 'Multiple Choice Questions (MCQ)',
    short_answer: 'Short Answer Questions',
    long_answer: 'Long Answer Questions',
    diagram_based: 'Diagram/Graph-Based Questions',
    numerical: 'Numerical Problems',
    true_false: 'True/False Questions',
  };
  return map[type] || type;
}

function questionTypeInstruction(type: string): string {
  const map: Record<string, string> = {
    multiple_choice: 'Each question must have exactly 4 options (A, B, C, D). Mark the correct answer.',
    short_answer: 'Each answer should be 2-3 sentences. Provide model answer.',
    long_answer: 'Each answer should be detailed (150-200 words). Provide model answer.',
    diagram_based: 'Questions should reference diagrams, graphs, or visual representations. Include what to draw.',
    numerical: 'Include step-by-step solution with formulas. Show all calculation steps.',
    true_false: 'Provide clear True or False answer with brief explanation.',
  };
  return map[type] || 'Provide complete model answer.';
}

function difficultyDistribution(count: number): { easy: number; moderate: number; hard: number } {
  // ~30% easy, 50% moderate, 20% hard
  const easy = Math.max(1, Math.round(count * 0.3));
  const hard = Math.max(1, Math.round(count * 0.2));
  const moderate = count - easy - hard;
  return { easy, moderate: Math.max(0, moderate), hard };
}

export function buildAssessmentPrompt(dto: CreateAssignmentDTO): string {
  const totalQuestions = dto.questionTypes.reduce((sum, qt) => sum + qt.numberOfQuestions, 0);
  const totalMarks = dto.questionTypes.reduce((sum, qt) => sum + qt.numberOfQuestions * qt.marksPerQuestion, 0);

  const sectionsSpec = dto.questionTypes
    .map((qt: QuestionTypeConfig, idx: number) => {
      const sectionLabel = String.fromCharCode(65 + idx); // A, B, C...
      const dist = difficultyDistribution(qt.numberOfQuestions);
      return `
Section ${sectionLabel}: ${questionTypeToLabel(qt.type)}
- Number of questions: ${qt.numberOfQuestions}
- Marks per question: ${qt.marksPerQuestion}
- Total marks for section: ${qt.numberOfQuestions * qt.marksPerQuestion}
- Difficulty distribution: ${dist.easy} Easy, ${dist.moderate} Moderate, ${dist.hard} Hard
- Special instruction: ${questionTypeInstruction(qt.type)}`;
    })
    .join('\n');

  const contextSection = dto.fileContent
    ? `\n\nREFERENCE MATERIAL (generate questions based on this content):\n---\n${dto.fileContent.slice(0, 3000)}\n---`
    : '';

  return `You are an expert educational assessment creator. Generate a complete, structured question paper for the following specifications.

SCHOOL INFORMATION:
- School: ${dto.schoolName}
- Subject: ${dto.subject}
- Grade/Class: ${dto.grade}
- Time Allowed: ${dto.timeAllowed || 45} minutes
- Total Marks: ${totalMarks}
- Total Questions: ${totalQuestions}

SECTIONS TO GENERATE:
${sectionsSpec}
${contextSection}

${dto.additionalInstructions ? `ADDITIONAL INSTRUCTIONS FROM TEACHER:\n${dto.additionalInstructions}` : ''}

CRITICAL OUTPUT RULES:
1. Output ONLY valid JSON. No markdown, no code fences, no explanation text before or after.
2. Every question must be educationally appropriate for Grade ${dto.grade} ${dto.subject}.
3. Questions must be clear, unambiguous, and not repeated.
4. MCQ options must be plausible but only one correct.
5. Answers must be accurate and complete.

OUTPUT FORMAT (strict JSON):
{
  "schoolName": "${dto.schoolName}",
  "subject": "${dto.subject}",
  "grade": "${dto.grade}",
  "timeAllowed": ${dto.timeAllowed || 45},
  "maximumMarks": ${totalMarks},
  "generalInstructions": [
    "All questions are compulsory unless stated otherwise.",
    "Write clearly and legibly.",
    "Start each section on a new page."
  ],
  "sections": [
    {
      "id": "section_a",
      "title": "Section A",
      "instruction": "Attempt all questions. Each question carries X marks.",
      "questionType": "multiple_choice",
      "totalMarks": 20,
      "questions": [
        {
          "id": "q_a_1",
          "text": "Full question text here?",
          "type": "multiple_choice",
          "difficulty": "easy",
          "marks": 1,
          "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
          "answer": "Option A text",
          "hint": "Think about..."
        }
      ]
    }
  ]
}

Generate all ${totalQuestions} questions across ${dto.questionTypes.length} sections now. Return ONLY the JSON object.`;
}

export function buildRegenerateSectionPrompt(
  dto: CreateAssignmentDTO,
  sectionIndex: number,
  existingSections: Array<{ title: string; questions: Array<{ text: string }> }>
): string {
  const qt = dto.questionTypes[sectionIndex];
  if (!qt) throw new Error(`No question type at index ${sectionIndex}`);

  const sectionLabel = String.fromCharCode(65 + sectionIndex);
  const dist = difficultyDistribution(qt.numberOfQuestions);

  // Build list of existing questions to avoid duplicates
  const existingQuestions = existingSections
    .flatMap((s) => s.questions.map((q) => q.text))
    .map((t, i) => `${i + 1}. ${t}`)
    .join('\n');

  return `You are an expert educational assessment creator. Regenerate ONLY Section ${sectionLabel} of a question paper.

CONTEXT:
- Subject: ${dto.subject}
- Grade: ${dto.grade}
- Section: ${sectionLabel}
- Type: ${questionTypeToLabel(qt.type)}
- Questions needed: ${qt.numberOfQuestions}
- Marks per question: ${qt.marksPerQuestion}
- Difficulty: ${dist.easy} Easy, ${dist.moderate} Moderate, ${dist.hard} Hard

AVOID these existing questions (do not repeat):
${existingQuestions || 'None'}

${dto.fileContent ? `REFERENCE MATERIAL:\n---\n${dto.fileContent.slice(0, 2000)}\n---` : ''}

Output ONLY valid JSON for the section:
{
  "id": "section_${sectionLabel.toLowerCase()}",
  "title": "Section ${sectionLabel}",
  "instruction": "Attempt all questions. Each question carries ${qt.marksPerQuestion} mark${qt.marksPerQuestion > 1 ? 's' : ''}.",
  "questionType": "${qt.type}",
  "totalMarks": ${qt.numberOfQuestions * qt.marksPerQuestion},
  "questions": [...]
}

Generate ${qt.numberOfQuestions} fresh, unique questions. Return ONLY the JSON object.`;
}
