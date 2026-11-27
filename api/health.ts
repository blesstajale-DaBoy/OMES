import type { IncomingMessage, ServerResponse } from 'node:http';

interface VercelResponseLike extends ServerResponse {
  status?: (code: number) => VercelResponseLike;
  json?: (payload: unknown) => void;
}

export default function handler(_req: IncomingMessage, res: VercelResponseLike): void {
  const payload = {
    status: 'ok',
    service: 'bnhs-omes-api',
    model: 'gemini-4-hydrogen',
    configured: Boolean(
      process.env.GEMINI_API_KEY?.trim() &&
        process.env.GEMINI_API_KEY.trim() !== 'MY_GEMINI_API_KEY'
    ),
  };

  if (typeof res.status === 'function') {
    const next = res.status(200);
    if (typeof next?.json === 'function') {
      next.json(payload);
      return;
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}
