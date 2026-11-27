import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

const PMCF_FAR_SYSTEM_INSTRUCTION = `You are an expert Instructional Supervisor and DepEd Performance Management and Evaluation System (PMES) specialist integrated into an Online Monitoring and Evaluation System (OMES).

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

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  const healthHandler = (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'bnhs-omes-api', model: MODEL_NAME });
  };

  app.get(['/api/health', '/api/health/'], healthHandler);
  app.get(/^\/.+\/api\/health\/?$/, healthHandler);

  const generatePmcfFarHandler = async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error:
          'Gemini API key is not configured on the server. Please configure GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const body = (req.body ?? {}) as GeneratePmcfFarRequestBody;
    if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
      res.status(400).json({ error: 'Invalid request body. Expected a JSON object.' });
      return;
    }

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
      res.status(400).json({
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

      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: userPrompt,
          config: {
            systemInstruction: PMCF_FAR_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: PMCF_FAR_RESPONSE_SCHEMA,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
          },
        })
      );

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
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
        res.status(502).json({
          error: 'Gemini returned malformed JSON. Please retry generation.',
        });
        return;
      }

      if (!parsed.pmcf || !parsed.far) {
        res.status(502).json({
          error: 'Gemini response did not include both pmcf and far fields. Please retry.',
        });
        return;
      }

      res.json({
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
        res.status(status === 403 ? 403 : 400).json({
          error:
            'Gemini API rejected the request or API key. Please check your GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }

      if (status === 429 || errMessage.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error:
            'Gemini API rate limit or quota reached. Please wait a moment and retry, or select a billing-enabled API key in Settings > Secrets.',
        });
        return;
      }

      if (status === 404 || errMessage.includes('NOT_FOUND')) {
        res.status(502).json({
          error: `Gemini model "${MODEL_NAME}" was not found or is temporarily unavailable. Please retry in a moment.`,
        });
        return;
      }

      res.status(502).json({
        error: `Failed to generate PMCF and FAR via Gemini API: ${errMessage}`,
      });
    }
  };

  app.post(['/api/generate-pmcf-far', '/api/generate-pmcf-far/'], generatePmcfFarHandler);
  app.post(/^\/.+\/api\/generate-pmcf-far\/?$/, generatePmcfFarHandler);

  // Ensure unmatched /api/* requests always return structured JSON instead of HTML 404s
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  const distDir = path.resolve(__dirname, 'dist');
  const distIndexPath = path.join(distDir, 'index.html');
  const isDev = process.env.NODE_ENV === 'development';
  const isProd = !isDev && fs.existsSync(distIndexPath);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(distIndexPath);
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BNHS OMES server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BNHS OMES server:', err);
  process.exit(1);
});
