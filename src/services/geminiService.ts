import type {
  AiGeneratedPmcfPayload,
  AiGeneratedFarPayload,
} from '../types';

/**
 * Teacher / ratee metadata passed in an OMES evaluation request.
 */
export interface EvaluationTeacherDetails {
  fullName: string;
  careerStage?: string;
  position?: string;
  subjectGrade: string;
}

/**
 * Individual indicator score / evidence item from an evaluation rubric.
 */
export interface EvaluationRatingItem {
  indicator: string;
  rating: string | number;
  comment?: string;
}

/**
 * Structured evaluation request accepted by `evaluateWithGemini`.
 */
export interface EvaluationRequest {
  type: string;
  date: string;
  teacher: EvaluationTeacherDetails;
  ratings: EvaluationRatingItem[] | string;
  notes: string;
}

/**
 * Flat evaluation payload alias supported by `generatePmcfAndFar`.
 */
export interface PmcfFarEvaluationInput {
  evaluationType: string;
  date: string;
  teacherName: string;
  careerStage?: string;
  subjectGrade: string;
  indicatorScoresList: string;
  observerNotes: string;
}

/**
 * Formatted response object containing the required PMCF and 4-column FAR fields.
 */
export interface PmcfFarStructuredOutput {
  pmcf: AiGeneratedPmcfPayload;
  far: AiGeneratedFarPayload;
}

/**
 * Canonical JSON Schema contract enforced on the server via @google/genai
 * Structured Outputs (responseMimeType: "application/json") so PMCF and
 * 4-column FAR (Teacher | Findings | Analysis | Recommendations) always
 * return exact, database-ready fields.
 */
export const PMCF_FAR_JSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    pmcf: {
      type: 'OBJECT',
      properties: {
        date: {
          type: 'STRING',
          description: 'Date of the observation or evaluation.',
        },
        critical_incidents_and_outputs: {
          type: 'STRING',
          description:
            'Summary of observed strengths and specific performance gaps based on the evaluation.',
        },
        action_plan_intervention: {
          type: 'STRING',
          description: 'Agreed technical assistance, coaching steps, and timeline.',
        },
        expected_output: {
          type: 'STRING',
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
      type: 'OBJECT',
      properties: {
        teacher: {
          type: 'STRING',
          description: 'Name of the teacher evaluated (with grade/subject if provided).',
        },
        findings: {
          type: 'STRING',
          description:
            'Factual observations, scores, and specific strengths or gaps found during evaluation.',
        },
        analysis: {
          type: 'STRING',
          description:
            'Root cause analysis and pedagogical impact of the findings on learners.',
        },
        recommendations: {
          type: 'STRING',
          description:
            'Concrete, actionable recommendations and technical assistance.',
        },
      },
      required: ['teacher', 'findings', 'analysis', 'recommendations'],
    },
  },
  required: ['pmcf', 'far'],
} as const;

export class GeminiServiceError extends Error {
  public readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'GeminiServiceError';
    this.status = status;
  }
}

const GENERATE_ENDPOINT_PATH = 'api/generate-pmcf-far';
const HEALTH_ENDPOINT_PATH = 'api/health';

function getCandidateApiUrls(apiPath: string): string[] {
  const rootUrl = `/${apiPath.replace(/^\/+/, '')}`;
  const urls: string[] = [rootUrl];

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const baseResolved = new URL(apiPath.replace(/^\/+/, ''), document.baseURI).toString();
      const sameOriginPath = new URL(baseResolved).pathname;
      if (sameOriginPath !== rootUrl && !urls.includes(baseResolved)) {
        urls.push(baseResolved);
      }
    } catch {
      // Ignore malformed baseURI
    }
  }

  return urls;
}

function formatRatingsList(ratings: EvaluationRatingItem[] | string): string {
  if (typeof ratings === 'string') {
    return ratings.trim() || 'No individual indicator scores provided.';
  }
  if (!Array.isArray(ratings) || ratings.length === 0) {
    return 'No individual indicator scores provided.';
  }
  return ratings
    .map(
      (item) =>
        `- ${item.indicator}: ${item.rating}${item.comment ? ` | Note: ${item.comment}` : ''}`
    )
    .join('\n');
}

/**
 * Sends structured evaluation data (type, teacher details, ratings, notes)
 * to the server-side Gemini API route (`POST /api/generate-pmcf-far`), which
 * securely retrieves `process.env.GEMINI_API_KEY` on the server and returns
 * a validated JSON object containing the required PMCF and 4-column FAR fields.
 */
export async function evaluateWithGemini(
  request: EvaluationRequest,
  signal?: AbortSignal
): Promise<PmcfFarStructuredOutput> {
  const evaluationType = request.type.trim();
  const teacherName = request.teacher?.fullName?.trim() || '';
  const careerStage =
    request.teacher?.careerStage?.trim() ||
    request.teacher?.position?.trim() ||
    'Proficient';
  const subjectGrade = request.teacher?.subjectGrade?.trim() || 'General Subject';
  const date = request.date?.trim() || new Date().toISOString().slice(0, 10);
  const indicatorScoresList = formatRatingsList(request.ratings);
  const observerNotes =
    request.notes?.trim() || 'No additional observer notes provided.';

  if (!evaluationType || !teacherName) {
    throw new GeminiServiceError(
      'Both evaluation type and teacher full name are required to generate PMCF and FAR.',
      400
    );
  }

  const requestBody = JSON.stringify({
    evaluationType,
    date,
    teacherName,
    careerStage,
    subjectGrade,
    indicatorScoresList,
    observerNotes,
  });

  const candidateUrls = getCandidateApiUrls(GENERATE_ENDPOINT_PATH);
  let response: Response | null = null;
  let attemptedUrl = candidateUrls[0];
  let lastNetworkError: unknown = null;

  for (let i = 0; i < candidateUrls.length; i++) {
    const endpointUrl = candidateUrls[i];
    attemptedUrl = endpointUrl;
    try {
      const res = await fetch(endpointUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal,
        body: requestBody,
      });

      if (res.status === 404 && i < candidateUrls.length - 1) {
        continue;
      }

      response = res;
      break;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      lastNetworkError = err;
    }
  }

  if (!response) {
    const detail = lastNetworkError instanceof Error ? lastNetworkError.message : 'Network error';
    throw new GeminiServiceError(
      `Could not connect to the Gemini generation service: ${detail}`,
      0
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const originHint =
      typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}${attemptedUrl.startsWith('/') ? attemptedUrl : ''}`
        : attemptedUrl;
    const serverMsg =
      payload && typeof payload.error === 'string' && payload.error.trim()
        ? payload.error.trim()
        : response.status === 404
        ? `The Gemini API endpoint (${originHint}) returned 404 because this deployment is serving static files without the Express backend server. Please use the live full-stack preview or redeploy with the Node server.`
        : `Gemini API request failed with status ${response.status}.`;
    throw new GeminiServiceError(serverMsg, response.status);
  }

  if (!payload || typeof payload !== 'object' || !payload.pmcf || !payload.far) {
    throw new GeminiServiceError(
      'Server returned an incomplete PMCF/FAR JSON structure.',
      502
    );
  }

  return {
    pmcf: {
      date: String(payload.pmcf.date ?? date),
      critical_incidents_and_outputs: String(
        payload.pmcf.critical_incidents_and_outputs ?? ''
      ),
      action_plan_intervention: String(
        payload.pmcf.action_plan_intervention ?? ''
      ),
      expected_output: String(payload.pmcf.expected_output ?? ''),
    },
    far: {
      teacher: String(payload.far.teacher ?? teacherName),
      findings: String(payload.far.findings ?? ''),
      analysis: String(payload.far.analysis ?? ''),
      recommendations: String(payload.far.recommendations ?? ''),
    },
  };
}

/**
 * Convenience wrapper accepting flat OMES evaluation fields and delegating
 * to `evaluateWithGemini`.
 */
export async function generatePmcfAndFar(
  input: PmcfFarEvaluationInput,
  signal?: AbortSignal
): Promise<PmcfFarStructuredOutput> {
  return evaluateWithGemini(
    {
      type: input.evaluationType,
      date: input.date,
      teacher: {
        fullName: input.teacherName,
        careerStage: input.careerStage,
        subjectGrade: input.subjectGrade,
      },
      ratings: input.indicatorScoresList,
      notes: input.observerNotes,
    },
    signal
  );
}

/**
 * Checks whether the backend OMES Gemini API server is reachable.
 */
export async function checkGeminiServiceHealth(): Promise<boolean> {
  const urls = getCandidateApiUrls(HEALTH_ENDPOINT_PATH);
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // Try next candidate URL
    }
  }
  return false;
}
