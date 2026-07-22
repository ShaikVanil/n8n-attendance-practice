import https from 'https';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction, Application } from 'express';

interface SSLConfig {
  enabled: boolean;
  keyPath?: string;
  certPath?: string;
  caPath?: string;
  port: number;
}

const getSSLConfig = (): SSLConfig => {
  const sslEnabled = process.env.SSL_ENABLED === 'true';
  const sslKeyPath = process.env.SSL_KEY_PATH;
  const sslCertPath = process.env.SSL_CERT_PATH;
  const sslCAPath = process.env.SSL_CA_PATH;
  const httpsPort = parseInt(process.env.HTTPS_PORT || '443');
  
  return {
    enabled: sslEnabled,
    keyPath: sslKeyPath,
    certPath: sslCertPath,
    caPath: sslCAPath,
    port: httpsPort
  };
};

export const createHTTPSServer = (app: Application): https.Server | null => {
  const config = getSSLConfig();
  
  if (!config.enabled || !config.keyPath || !config.certPath) {
    console.log('HTTPS not configured or disabled');
    return null;
  }
  
  try {
    const privateKey = fs.readFileSync(path.resolve(config.keyPath), 'utf8');
    const certificate = fs.readFileSync(path.resolve(config.certPath), 'utf8');
    
    const credentials: https.ServerOptions = {
      key: privateKey,
      cert: certificate
    };
    
    // Add CA certificate if provided
    if (config.caPath) {
      const ca = fs.readFileSync(path.resolve(config.caPath), 'utf8');
      credentials.ca = ca;
    }
    
    const httpsServer = https.createServer(credentials, app);
    
    httpsServer.listen(config.port, () => {
      console.log(`HTTPS Server running on port ${config.port}`);
    });
    
    return httpsServer;
  } catch (error) {
    console.error('Failed to create HTTPS server:', error);
    return null;
  }
};

// Middleware to redirect HTTP to HTTPS in production
export const httpsRedirect = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'production' && process.env.SSL_ENABLED === 'true') {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
      return;
    }
  }
  next();
};

// Security headers for HTTPS
export const secureHeaders = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  next();
};