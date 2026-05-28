// src/services/aiService.ts
import Anthropic from '@anthropic-ai/sdk';
import { AssignmentOutput, Section, CreateAssignmentDTO } from '../types';
import { buildAssessmentPrompt, buildRegenerateSectionPrompt } from './promptBuilder';
import { parseAssessmentResponse, parseSectionResponse, ParseError } from './responseParser';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 8192;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set in environment');
  client = new Anthropic({ apiKey });
  return client;
}

export interface GenerationResult {
  output: AssignmentOutput;
  rawPrompt: string;
  rawResponse: string;
  generationTimeMs: number;
  tokenUsage?: { inputTokens: number; outputTokens: number };
}

/**
 * Generate a full assessment question paper
 */
export async function generateAssessment(dto: CreateAssignmentDTO): Promise<GenerationResult> {
  const ai = getClient();
  const prompt = buildAssessmentPrompt(dto);
  const startTime = Date.now();

  let rawResponse = '';
  let inputTokens = 0;
  let outputTokens = 0;

  // Attempt with retries + fallback parser
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🤖 AI generation attempt ${attempt}/3...`);

      const message = await ai.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: `You are an expert educational assessment creator for Indian schools. 
You generate structured, curriculum-aligned question papers.
CRITICAL: Always respond with valid JSON only. Never add explanation or markdown.`,
        messages: [{ role: 'user', content: prompt }],
      });

      rawResponse = message.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('');

      inputTokens = message.usage.input_tokens;
      outputTokens = message.usage.output_tokens;

      const output = parseAssessmentResponse(rawResponse);
      const generationTimeMs = Date.now() - startTime;

      console.log(`✅ AI generation successful in ${generationTimeMs}ms (${inputTokens}+${outputTokens} tokens)`);

      return {
        output,
        rawPrompt: prompt,
        rawResponse,
        generationTimeMs,
        tokenUsage: { inputTokens, outputTokens },
      };
    } catch (err) {
      if (err instanceof ParseError && attempt < 3) {
        console.warn(`⚠️  Parse attempt ${attempt} failed: ${err.message}. Retrying with stricter prompt...`);
        // Add a stricter instruction on retry
        continue;
      }
      throw err;
    }
  }

  throw new Error('AI generation failed after 3 attempts');
}

/**
 * Regenerate a single section of an existing assessment
 */
export async function regenerateSection(
  dto: CreateAssignmentDTO,
  sectionIndex: number,
  existingSections: AssignmentOutput['sections']
): Promise<Section> {
  const ai = getClient();
  const prompt = buildRegenerateSectionPrompt(dto, sectionIndex, existingSections);

  console.log(`🔄 Regenerating section ${String.fromCharCode(65 + sectionIndex)}...`);

  const message = await ai.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: `You are an expert educational assessment creator. 
CRITICAL: Always respond with valid JSON only. Never add explanation or markdown.`,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawResponse = message.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  return parseSectionResponse(rawResponse);
}
