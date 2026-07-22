import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import validator from 'validator';
import xss from 'xss';
import { Request, Response, NextFunction } from 'express';

// Rate limiting configurations with environment variable support
export const apiRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: process.env.NODE_ENV === 'production' 
    ? parseInt(process.env.API_RATE_LIMIT_MAX || '500')
    : parseInt(process.env.API_RATE_LIMIT_MAX_DEV || '1000'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 60000) + ' minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting if disabled via environment variable
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return true;
    }
    return req.path === '/health' || req.path.startsWith('/api/monitoring/health');
  }
});

export const authRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: process.env.NODE_ENV === 'production'
    ? parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20')
    : parseInt(process.env.AUTH_RATE_LIMIT_MAX_DEV || '50'),
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 60000) + ' minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting if disabled via environment variable
    return process.env.DISABLE_RATE_LIMIT === 'true';
  }
});

// Slow down middleware for additional protection
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

// Enhanced security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false
});

// Request size limiter
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const maxSize = process.env.MAX_REQUEST_SIZE || '10mb';
  
  // Check content-length header
  const contentLength = req.headers['content-length'];
  if (contentLength) {
    const sizeInMB = parseInt(contentLength) / (1024 * 1024);
    const maxSizeInMB = parseInt(maxSize.replace('mb', ''));
    
    if (sizeInMB > maxSizeInMB) {
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: maxSize
      });
    }
  }
  
  next();
};

// Input validation middleware
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize and validate all string inputs
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        // XSS protection
        let sanitized = xss(obj, {
          whiteList: {}, // No HTML tags allowed
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script']
        });
        
        // Additional validation
        sanitized = validator.escape(sanitized);
        return sanitized;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitizedObj: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // More permissive validation for query parameters
          if (typeof key === 'string' && /^[a-zA-Z0-9_-]+$/.test(key)) {
            sanitizedObj[key] = sanitizeObject(value);
          } else {
            // Log rejected keys for debugging
            console.warn(`Rejected query parameter key: ${key}`);
          }
        }
        return sanitizedObj;
      }
      
      return obj;
    };
    
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Invalid input data',
      message: 'Request contains invalid or potentially harmful content'
    });
  }
};

// SQL injection prevention
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const sqlInjectionPatterns = [
    /('|(\-\-)|(;))/i,
    // More specific patterns that look for actual SQL injection attempts
    /\b(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|update\s+.*\s+set|drop\s+table|create\s+table|alter\s+table)\b/i,
    /(script|javascript|vbscript|onload|onerror|onclick)/i,
    // Look for SQL injection with quotes and operators
    /'\s*(or|and)\s*'\s*=\s*'/i,
    /'\s*(or|and)\s*\d+\s*=\s*\d+/i,
    /\bor\s+1\s*=\s*1\b/i,
    /\bunion\s+all\s+select\b/i
  ];
  
  const checkForSQLInjection = (value: string): boolean => {
    // Skip checking if the value is just a single word or simple address
    if (typeof value === 'string' && value.length < 100 && !value.includes("'") && !value.includes('--')) {
      // Only check for more complex SQL injection patterns
      const complexPatterns = [
        /\b(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|update\s+.*\s+set|drop\s+table)\b/i,
        /'\s*(or|and)\s*'\s*=\s*'/i,
        /\bor\s+1\s*=\s*1\b/i
      ];
      return complexPatterns.some(pattern => pattern.test(value));
    }
    
    return sqlInjectionPatterns.some(pattern => pattern.test(value));
  };
  
  const validateObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkForSQLInjection(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(validateObject);
    }
    
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(validateObject);
    }
    
    return false;
  };
  
  try {
    let hasSQLInjection = false;
    
    if (req.body && validateObject(req.body)) {
      hasSQLInjection = true;
    }
    
    if (req.query && validateObject(req.query)) {
      hasSQLInjection = true;
    }
    
    if (req.params && validateObject(req.params)) {
      hasSQLInjection = true;
    }
    
    if (hasSQLInjection) {
      return res.status(400).json({
        error: 'Potential SQL injection detected',
        message: 'Request blocked for security reasons'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Security validation error',
      message: 'Unable to validate request security'
    });
  }
};