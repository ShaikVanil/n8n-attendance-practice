import { Request } from 'express';
import cors, { CorsOptions } from 'cors';

const envOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  process.env.MOBILE_APP_URL,
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : [])
].filter(Boolean) as string[];

const normalizeOrigin = (o?: string) => (o ? o.replace(/\/$/, '') : o);

const allowedOrigins = [
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
  ...envOrigins
].map(normalizeOrigin);

const isDevOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin);

const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const incoming = normalizeOrigin(origin)!;

    if (
      allowedOrigins.includes(incoming) ||
      (process.env.NODE_ENV !== 'production' && isDevOrigin(incoming))
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Session-ID',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Session-ID'],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

export const corsMiddleware = cors(corsOptions);
export { corsOptions };