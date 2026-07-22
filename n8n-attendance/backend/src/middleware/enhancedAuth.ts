import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../types/device';
import pool from '../config/database';

export interface AuthRequest extends Request {
  user?: User;
  sessionId?: string;
}

interface LoginAttempt {
  ip: string;
  attempts: number;
  lastAttempt: Date;
  blockedUntil?: Date;
}

interface SecurityEvent {
  type: string;
  ip: string;
  userAgent: string;
  userId?: string;
  details: any;
  timestamp: Date;
}

class SecurityService {
  private loginAttempts: Map<string, LoginAttempt> = new Map();
  private blockedIPs: Set<string> = new Set();
  private activeSessions: Map<string, any> = new Map();
  
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  
  async trackLoginAttempt(ip: string, success: boolean): Promise<boolean> {
    const now = new Date();
    const attempt = this.loginAttempts.get(ip) || {
      ip,
      attempts: 0,
      lastAttempt: now
    };
    
    if (success) {
      this.loginAttempts.delete(ip);
      this.blockedIPs.delete(ip);
      return true;
    }
    
    attempt.attempts++;
    attempt.lastAttempt = now;
    
    if (attempt.attempts >= this.MAX_LOGIN_ATTEMPTS) {
      attempt.blockedUntil = new Date(now.getTime() + this.BLOCK_DURATION);
      this.blockedIPs.add(ip);
      
      // Store in database
      try {
        await pool.query(
          'INSERT INTO blocked_ips (ip_address, blocked_until, reason) VALUES ($1, $2, $3) ON CONFLICT (ip_address) DO UPDATE SET blocked_until = $2, reason = $3',
          [ip, attempt.blockedUntil, 'Too many failed login attempts']
        );
      } catch (error) {
        console.error('Failed to store blocked IP:', error);
      }
    }
    
    this.loginAttempts.set(ip, attempt);
    return false;
  }
  
  isIPBlocked(ip: string): boolean {
    const attempt = this.loginAttempts.get(ip);
    if (!attempt || !attempt.blockedUntil) return false;
    
    if (new Date() > attempt.blockedUntil) {
      this.loginAttempts.delete(ip);
      this.blockedIPs.delete(ip);
      return false;
    }
    
    return true;
  }
  
  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  async createSession(userId: string, ip: string, userAgent: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT);
    
    const session = {
      userId,
      ip,
      userAgent,
      createdAt: new Date(),
      expiresAt,
      lastActivity: new Date()
    };
    
    this.activeSessions.set(sessionId, session);
    
    // Store in database
    try {
      await pool.query(
        'INSERT INTO active_sessions (session_id, user_id, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5)',
        [sessionId, userId, ip, userAgent, expiresAt]
      );
    } catch (error) {
      console.error('Failed to store session:', error);
    }
    
    return sessionId;
  }
  
  async validateSession(sessionId: string, ip: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      // Check database
      try {
        const result = await pool.query(
          'SELECT * FROM active_sessions WHERE session_id = $1 AND expires_at > NOW()',
          [sessionId]
        );
        
        if (result.rows.length === 0) return false;
        
        const dbSession = result.rows[0];
        this.activeSessions.set(sessionId, {
          userId: dbSession.user_id,
          ip: dbSession.ip_address,
          userAgent: dbSession.user_agent,
          createdAt: dbSession.created_at,
          expiresAt: dbSession.expires_at,
          lastActivity: new Date()
        });
        
        return dbSession.ip_address === ip;
      } catch (error) {
        console.error('Failed to validate session:', error);
        return false;
      }
    }
    
    if (new Date() > session.expiresAt) {
      this.activeSessions.delete(sessionId);
      return false;
    }
    
    if (session.ip !== ip) {
      return false;
    }
    
    session.lastActivity = new Date();
    return true;
  }
  
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await pool.query(
        'INSERT INTO security_logs (event_type, ip_address, user_agent, user_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [event.type, event.ip, event.userAgent, event.userId, JSON.stringify(event.details), event.timestamp]
      );
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

const securityService = new SecurityService();

export const enhancedAuthenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Check if IP is blocked
    if (securityService.isIPBlocked(ip)) {
      await securityService.logSecurityEvent({
        type: 'BLOCKED_IP_ACCESS_ATTEMPT',
        ip,
        userAgent,
        details: { path: req.path, method: req.method },
        timestamp: new Date()
      });
      
      res.status(429).json({ 
        error: 'IP temporarily blocked due to suspicious activity',
        retryAfter: '15 minutes'
      });
      return;
    }
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'JWT secret not configured' });
      return;
    }
    
    const decoded = jwt.verify(token, jwtSecret) as any;
    const sessionId = req.headers['x-session-id'] as string;
    
    // Validate session if provided
    if (sessionId) {
      const isValidSession = await securityService.validateSession(sessionId, ip);
      if (!isValidSession) {
        await securityService.logSecurityEvent({
          type: 'INVALID_SESSION',
          ip,
          userAgent,
          userId: decoded.userId,
          details: { sessionId, path: req.path },
          timestamp: new Date()
        });
        
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }
      
      req.sessionId = sessionId;
    }
    
    // Fetch fresh user data from database for critical operations
    if (req.path.includes('/admin') || req.method !== 'GET') {
      try {
        const userResult = await pool.query(
          'SELECT id, email, first_name, last_name, role, created_at, updated_at FROM users WHERE id = $1',
          [decoded.userId]
        );
        
        if (userResult.rows.length === 0) {
          res.status(401).json({ error: 'User not found' });
          return;
        }
        
        const dbUser = userResult.rows[0];
        req.user = {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.first_name,
          lastName: dbUser.last_name,
          role: dbUser.role,
          createdAt: dbUser.created_at,
          updatedAt: dbUser.updated_at
        };
      } catch (error) {
        console.error('Failed to fetch user:', error);
        res.status(500).json({ error: 'Authentication error' });
        return;
      }
    } else {
      // Use token data for read operations
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        role: decoded.role,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    next();
  } catch (error) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    await securityService.logSecurityEvent({
      type: 'AUTHENTICATION_ERROR',
      ip,
      userAgent,
      details: { error: error instanceof Error ? error.message : String(error), path: req.path },
      timestamp: new Date()
    });
    
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const secureLogin = async (
  email: string,
  password: string,
  ip: string,
  userAgent: string
): Promise<{ success: boolean; token?: string; sessionId?: string; user?: any; error?: string }> => {
  try {
    // Check if IP is blocked
    if (securityService.isIPBlocked(ip)) {
      return {
        success: false,
        error: 'IP temporarily blocked due to too many failed attempts'
      };
    }
    
    // Fetch user from database
    const userResult = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      await securityService.trackLoginAttempt(ip, false);
      await securityService.logSecurityEvent({
        type: 'LOGIN_ATTEMPT_INVALID_EMAIL',
        ip,
        userAgent,
        details: { email },
        timestamp: new Date()
      });
      
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }
    
    const user = userResult.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      await securityService.trackLoginAttempt(ip, false);
      await securityService.logSecurityEvent({
        type: 'LOGIN_ATTEMPT_INVALID_PASSWORD',
        ip,
        userAgent,
        userId: user.id,
        details: { email },
        timestamp: new Date()
      });
      
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }
    
    // Successful login
    await securityService.trackLoginAttempt(ip, true);
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT secret not configured');
    }
    
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '24h' }
    );
    
    const sessionId = await securityService.createSession(user.id, ip, userAgent);
    
    await securityService.logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      ip,
      userAgent,
      userId: user.id,
      details: { email, sessionId },
      timestamp: new Date()
    });
    
    return {
      success: true,
      token,
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    await securityService.logSecurityEvent({
      type: 'LOGIN_ERROR',
      ip,
      userAgent,
      details: { error: error instanceof Error ? error.message : String(error), email },
      timestamp: new Date()
    });
    
    return {
      success: false,
      error: 'Login failed due to server error'
    };
  }
};

export { securityService };