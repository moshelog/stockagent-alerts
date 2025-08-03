const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Authentication Service
 * Handles secure authentication with bcrypt password hashing and JWT tokens
 */
class AuthService {
  constructor() {
    // Get credentials from environment variables
    this.adminUsername = process.env.ADMIN_USERNAME || 'admin';
    this.adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    // Rate limiting storage (in production, use Redis)
    this.loginAttempts = new Map();
    this.maxAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    
    // Validate required environment variables
    if (!this.adminPasswordHash) {
      console.error('❌ ADMIN_PASSWORD_HASH not set in environment variables');
      console.log('To generate a password hash, run: npm run hash-password');
    }
    
    if (!this.jwtSecret) {
      console.error('❌ JWT_SECRET not set in environment variables');
      console.log('Generate a secure secret: openssl rand -base64 32');
    }
  }

  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against a hash
   * @param {string} password - Plain text password
   * @param {string} hash - Bcrypt hash
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Check if an IP is rate limited
   * @param {string} identifier - IP address or email
   * @returns {Object} Rate limit status
   */
  checkRateLimit(identifier) {
    const attempts = this.loginAttempts.get(identifier);
    
    if (!attempts) {
      return { isLocked: false, remainingAttempts: this.maxAttempts };
    }
    
    // Check if lockout has expired
    if (attempts.lockedUntil && Date.now() > attempts.lockedUntil) {
      this.loginAttempts.delete(identifier);
      return { isLocked: false, remainingAttempts: this.maxAttempts };
    }
    
    if (attempts.lockedUntil) {
      const remainingTime = Math.ceil((attempts.lockedUntil - Date.now()) / 1000 / 60);
      return { 
        isLocked: true, 
        remainingTime,
        message: `Too many failed attempts. Please try again in ${remainingTime} minutes.`
      };
    }
    
    return { 
      isLocked: false, 
      remainingAttempts: this.maxAttempts - attempts.count 
    };
  }

  /**
   * Record a failed login attempt
   * @param {string} identifier - IP address or email
   */
  recordFailedAttempt(identifier) {
    const attempts = this.loginAttempts.get(identifier) || { count: 0 };
    attempts.count += 1;
    
    if (attempts.count >= this.maxAttempts) {
      attempts.lockedUntil = Date.now() + this.lockoutDuration;
    }
    
    this.loginAttempts.set(identifier, attempts);
  }

  /**
   * Clear login attempts for an identifier
   * @param {string} identifier - IP address or email
   */
  clearAttempts(identifier) {
    this.loginAttempts.delete(identifier);
  }

  /**
   * Authenticate a user
   * @param {string} username - Username
   * @param {string} password - User password
   * @param {string} ipAddress - Client IP address
   * @returns {Object} Authentication result
   */
  async authenticate(username, password, ipAddress) {
    try {
      // Check rate limiting by IP
      const rateLimitStatus = this.checkRateLimit(ipAddress);
      if (rateLimitStatus.isLocked) {
        return { 
          success: false, 
          error: rateLimitStatus.message,
          statusCode: 429 
        };
      }
      
      // Validate credentials exist
      if (!this.adminPasswordHash || !this.jwtSecret) {
        console.error('Authentication not configured properly');
        return { 
          success: false, 
          error: 'Authentication system not configured',
          statusCode: 500 
        };
      }
      
      // Check username
      if (username !== this.adminUsername) {
        this.recordFailedAttempt(ipAddress);
        return { 
          success: false, 
          error: 'Invalid credentials',
          remainingAttempts: rateLimitStatus.remainingAttempts - 1,
          statusCode: 401 
        };
      }
      
      // Verify password
      const isValidPassword = await this.verifyPassword(password, this.adminPasswordHash);
      if (!isValidPassword) {
        this.recordFailedAttempt(ipAddress);
        const newStatus = this.checkRateLimit(ipAddress);
        return { 
          success: false, 
          error: newStatus.isLocked ? newStatus.message : 'Invalid credentials',
          remainingAttempts: newStatus.remainingAttempts,
          statusCode: 401 
        };
      }
      
      // Clear failed attempts on successful login
      this.clearAttempts(ipAddress);
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          username: this.adminUsername,
          isAdmin: true,
          loginTime: Date.now()
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn }
      );
      
      return {
        success: true,
        token,
        expiresIn: this.jwtExpiresIn
      };
      
    } catch (error) {
      console.error('Authentication error:', error);
      return { 
        success: false, 
        error: 'Authentication failed',
        statusCode: 500 
      };
    }
  }

  /**
   * Verify a JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token or null
   */
  verifyToken(token) {
    try {
      if (!this.jwtSecret) {
        console.error('JWT_SECRET not configured');
        return null;
      }
      
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        console.log('Invalid token');
      }
      return null;
    }
  }

  /**
   * Middleware to protect routes
   * @returns {Function} Express middleware
   */
  requireAuth() {
    return (req, res, next) => {
      try {
        // Get token from cookie or Authorization header
        const token = req.cookies?.authToken || 
                     req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        const decoded = this.verifyToken(token);
        if (!decoded) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        // Attach user info to request
        req.user = decoded;
        next();
      } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Authentication failed' });
      }
    };
  }

  /**
   * Cleanup expired rate limit entries (run periodically)
   */
  cleanupRateLimits() {
    const now = Date.now();
    for (const [identifier, attempts] of this.loginAttempts.entries()) {
      if (attempts.lockedUntil && now > attempts.lockedUntil) {
        this.loginAttempts.delete(identifier);
      }
    }
  }
}

module.exports = new AuthService();