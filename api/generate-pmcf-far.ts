import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const PRIMARY_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-4-hydrogen';

const PMCF_FAR_SYSTEM_INSTRUCTION = `You are an expert DepEd Master Teacher, Instructional Supervisor, and Performance Management and Evaluation System (PMES) specialist integrated into an Online Monitoring and Evaluation System (OMES).

Whenever an evaluation record is submitted (COT-PMES, Lesson Plan, Summative/Formative Assessment, Classroom Observation, Fleeting Observation, or IMs/LMs), analyze the ratings and observer notes to generate two official outputs:
1. Performance Monitoring and Coaching Form (PMCF)
2. Findings, Analysis, and Recommendations (FAR) table row

STRICT RULES:
- Base every point strictly on the provided ratings and observer notes. Do not fabricate classroom events.
- Use objective, constructive, PPST-aligned supervisory language.
- For PMCF:
  * date: The exact date of the observation or evaluation.
  * critical_incidents_and_outputs: Summarize concrete observed strengths (high ratings/evident indicators) and specific performance gaps or areas for improvement (low ratings/not evident indicators).
  * action_plan_intervention: Provide specific, actionable technical assistance, coaching steps, and next steps agreed upon.
  * expected_output: State the expected measurable improvement in teaching practice, lesson plan, assessment, or instructional material.
- For the FAR output, ensure clear differentiation across the four exact columns:
  * teacher: Full name of the ratee (and grade/subject if provided).
  * findings: Concrete, observable facts from the evaluation (e.g., high-rated indicators, missing lesson plan components, or specific classroom/IM/assessment observations).
  * analysis: The instructional root cause or impact on student learning explaining why those findings matter.
  * recommendations: Specific, actionable technical assistance or instructional adjustments for the teacher.
- Return ONLY valid JSON matching the required schema.`;

const PMCF_FAR_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    pmcf: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description: 'Date of the observation or evaluation.',
        },
        critical_incidents_and_outputs: {
          type: Type.STRING,
          description:
            'Summary of observed strengths and specific performance gaps based on the evaluation.',
        },
        action_plan_intervention: {
          type: Type.STRING,
          description: 'Agreed technical assistance, coaching steps, and timeline.',
        },
        expected_output: {
          type: Type.STRING,
          description:
            'Expected improvement in teaching practice, lesson plan, or instructional material.',
        },
      },
      required: [
        'date',
        'critical_incidents_and_outputs',
        'action_plan_intervention',
        'expected_output',
      ],
    },
    far: {
      type: Type.OBJECT,
      properties: {
        teacher: {
          type: Type.STRING,
          description: 'Name of the teacher evaluated (with grade/subject if provided).',
        },
        findings: {
          type: Type.STRING,
          description:
            'Factual observations, scores, and specific strengths or gaps found during evaluation.',
        },
        analysis: {
          type: Type.STRING,
          description:
            'Root cause analysis and pedagogical impact of the findings on learners.',
        },
        recommendations: {
          type: Type.STRING,
          description:
            'Concrete, actionable recommendations and technical assistance.',
        },
      },
      required: ['teacher', 'findings', 'analysis', 'recommendations'],
    },
  },
  required: ['pmcf', 'far'],
};

interface VercelRequestLike extends IncomingMessage {
  body?: unknown;
}

interface VercelResponseLike extends ServerResponse {
  status?: (code: number) => VercelResponseLike;
  json?: (payload: unknown) => void;
}

interface GeneratePmcfFarRequestBody {
  evaluationType?: unknown;
  type?: unknown;
  date?: unknown;
  teacherName?: unknown;
  careerStage?: unknown;
  subjectGrade?: unknown;
  teacher?: {
    fullName?: unknown;
    careerStage?: unknown;
    position?: unknown;
    subjectGrade?: unknown;
  };
  indicatorScoresList?: unknown;
  ratings?: unknown;
  observerNotes?: unknown;
  notes?: unknown;
}

function sendJson(res: VercelResponseLike, statusCode: number, payload: unknown): void {
  if (typeof res.status === 'function') {
    const next = res.status(statusCode);
    if (typeof next?.json === 'function') {
      next.json(payload);
      return;
    }
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: VercelRequestLike): Promise<unknown> {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      return req.body.trim() ? JSON.parse(req.body) : {};
    }
    return req.body;
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  const maxBytes = 256 * 1024;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > maxBytes) {
      throw new Error('PAYLOAD_TOO_LARGE');
    }
    chunks.push(buf);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function sanitizeField(value: unknown, maxLen: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLen);
}

function normalizeRatingsInput(indicatorScoresList: unknown, ratings: unknown): string {
  if (typeof indicatorScoresList === 'string' && indicatorScoresList.trim()) {
    return sanitizeField(indicatorScoresList, 6000);
  }
  if (typeof ratings === 'string' && ratings.trim()) {
    return sanitizeField(ratings, 6000);
  }
  if (Array.isArray(ratings) && ratings.length > 0) {
    const formatted = ratings
      .slice(0, 60)
      .map((item) => {
        if (typeof item === 'string') return `- ${item.trim()}`;
        if (item && typeof item === 'object') {
          const rec = item as { indicator?: unknown; rating?: unknown; comment?: unknown };
          const ind = sanitizeField(rec.indicator, 200, 'Indicator');
          const rat =
            typeof rec.rating === 'number' || typeof rec.rating === 'string'
              ? String(rec.rating).trim().slice(0, 80)
              : 'N/A';
          const cmt = sanitizeField(rec.comment, 300);
          return `- ${ind}: ${rat}${cmt ? ` | Note: ${cmt}` : ''}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
    if (formatted) return formatted.slice(0, 6000);
  }
  return 'No individual indicator scores provided.';
}

function isRetryableError(err: unknown): boolean {
  const status =
    (err as { status?: number; statusCode?: number })?.status ??
    (err as { status?: number; statusCode?: number })?.statusCode;
  if (typeof status === 'number') {
    return status === 429 || status >= 500;
  }
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('unavailable') ||
    msg.includes('econnreset')
  );
}

async function generateWithRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !isRetryableError(err)) {
        throw err;
      }
      const delayMs = 600 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export default async function handler(
  req: VercelRequestLike,
  res: VercelResponseLike
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed. Use POST /api/generate-pmcf-far.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    sendJson(res, 503, {
      error:
        'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables and redeploy.',
    });
    return;
  }

  let rawBody: unknown;
  try {
    rawBody = await readJsonBody(req);
  } catch (err) {
    if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
      sendJson(res, 413, { error: 'Request payload is too large.' });
      return;
    }
    sendJson(res, 400, { error: 'Invalid JSON request body.' });
    return;
  }

  if (typeof rawBody !== 'object' || rawBody === null || Array.isArray(rawBody)) {
    sendJson(res, 400, { error: 'Invalid request body. Expected a JSON object.' });
    return;
  }

  const body = rawBody as GeneratePmcfFarRequestBody;
  const evaluationType = sanitizeField(body.evaluationType ?? body.type, 160);
  const date = sanitizeField(body.date, 40, new Date().toISOString().slice(0, 10));
  const teacherName = sanitizeField(body.teacherName ?? body.teacher?.fullName, 160);
  const careerStage = sanitizeField(
    body.careerStage ?? body.teacher?.careerStage ?? body.teacher?.position,
    120,
    'Proficient'
  );
  const subjectGrade = sanitizeField(
    body.subjectGrade ?? body.teacher?.subjectGrade,
    200,
    'General Subject'
  );
  const indicatorScoresList = normalizeRatingsInput(body.indicatorScoresList, body.ratings);
  const observerNotes = sanitizeField(
    body.observerNotes ?? body.notes,
    4000,
    'No additional observer notes provided.'
  );

  if (!evaluationType || !teacherName) {
    sendJson(res, 400, {
      error: 'Both evaluationType and teacherName are required to generate PMCF and FAR.',
    });
    return;
  }

  const userPrompt = `Generate the PMCF and FAR based on the following OMES evaluation record:

- Evaluation Tool Used: ${evaluationType}
- Date of Observation/Evaluation: ${date}
- Teacher/Ratee: ${teacherName} (${careerStage})
- Subject & Grade Level: ${subjectGrade}
- Ratings per Indicator:
  ${indicatorScoresList}
- Raw Observer Notes:
  "${observerNotes}"`;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const callModel = (model: string) =>
      generateWithRetry(() =>
        ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: PMCF_FAR_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: PMCF_FAR_RESPONSE_SCHEMA,
            ...(model.startsWith('gemini-4')
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
              : {}),
          },
        })
      );

    let response;
    try {
      response = await callModel(PRIMARY_MODEL);
    } catch (primaryErr: unknown) {
      const primaryStatus =
        (primaryErr as { status?: number; statusCode?: number })?.status ??
        (primaryErr as { status?: number; statusCode?: number })?.statusCode;
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : '';
      if (
        PRIMARY_MODEL !== FALLBACK_MODEL &&
        (primaryStatus === 404 || primaryMsg.includes('NOT_FOUND'))
      ) {
        response = await callModel(FALLBACK_MODEL);
      } else {
        throw primaryErr;
      }
    }

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      sendJson(res, 502, {
        error: 'Gemini returned an empty response while generating PMCF and FAR.',
      });
      return;
    }

    let parsed: {
      pmcf?: {
        date?: string;
        critical_incidents_and_outputs?: string;
        action_plan_intervention?: string;
        expected_output?: string;
      };
      far?: {
        teacher?: string;
        findings?: string;
        analysis?: string;
        recommendations?: string;
      };
    };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      sendJson(res, 502, {
        error: 'Gemini returned malformed JSON. Please retry generation.',
      });
      return;
    }

    if (!parsed.pmcf || !parsed.far) {
      sendJson(res, 502, {
        error: 'Gemini response did not include both pmcf and far fields. Please retry.',
      });
      return;
    }

    sendJson(res, 200, {
      pmcf: {
        date: sanitizeField(parsed.pmcf.date, 40, date),
        critical_incidents_and_outputs: sanitizeField(
          parsed.pmcf.critical_incidents_and_outputs,
          3000
        ),
        action_plan_intervention: sanitizeField(parsed.pmcf.action_plan_intervention, 3000),
        expected_output: sanitizeField(parsed.pmcf.expected_output, 2000),
      },
      far: {
        teacher: sanitizeField(parsed.far.teacher, 200, `${teacherName} (${subjectGrade})`),
        findings: sanitizeField(parsed.far.findings, 3000),
        analysis: sanitizeField(parsed.far.analysis, 3000),
        recommendations: sanitizeField(parsed.far.recommendations, 3000),
      },
    });
  } catch (err: unknown) {
    const status =
      (err as { status?: number; statusCode?: number })?.status ??
      (err as { status?: number; statusCode?: number })?.statusCode ??
      500;
    const errMessage = err instanceof Error ? err.message : 'Unknown Gemini API error';

    if (status === 403 || status === 400 || errMessage.includes('API_KEY_INVALID')) {
      sendJson(res, status === 403 ? 403 : 400, {
        error:
          'Gemini API rejected the request or API key. Please check GEMINI_API_KEY in your server environment variables.',
      });
      return;
    }

    if (status === 429 || errMessage.includes('RESOURCE_EXHAUSTED')) {
      sendJson(res, 429, {
        error:
          'Gemini API rate limit or quota reached. Please wait a moment and retry.',
      });
      return;
    }

    if (status === 404 || errMessage.includes('NOT_FOUND')) {
      sendJson(res, 500, {
        error: `Gemini model "${PRIMARY_MODEL}" was not found or is temporarily unavailable. Please retry in a moment.`,
      });
      return;
    }

    sendJson(res, 502, {
      error: `Failed to generate PMCF and FAR via Gemini API: ${errMessage}`,
    });
  }
}
