import { appEvents } from '../lib/events';
import { AUTH_EVENTS } from '../events/auth.events';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../lib/tokens';
import crypto from 'crypto';
import { ConflictError, UnauthorizedError } from '../lib/errors';
import { cacheGetOrSet, CACHE_TTL, simpleKey } from '../lib/cache';
import { trackFailedLoginAttempt, clearFailedLoginAttempts } from "../events/security"
import { recordAuthEvent, recordCacheOperation } from "../lib/metric"
import { logAuthEvent, logCacheOperation, logPerformance } from "../lib/structured-logger"


export async function register(data: {
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      passwordHash,
    },
  });
// Find the default role
const defaultRole = await prisma.role.findFirst({
  where: { isDefault: true },
});

if (defaultRole) {
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: defaultRole.id,
    },
  });
}



//   appEvents.emit(AUTH_EVENTS.USER_REGISTERED, {
//     id: user.id,
//     email: user.email,
//     tier: user.tier,
//   });

  return { id: user.id, email: user.email, tier: user.tier };
}
// export async function login(data: {
//   email: string;
//   password: string;
//   deviceInfo?: string;
// }) {
//   const user = await prisma.user.findUnique({
//     where: { email: data.email.toLowerCase().trim() },
//   });

//   // Same error for "user not found" and "wrong password"
//   // This prevents user enumeration attacks
//   if (!user || !user.isActive) {
//     throw new UnauthorizedError('Invalid credentials');
//   }

//   const valid = await verifyPassword(data.password, user.passwordHash);
//   if (!valid) {
//     throw new UnauthorizedError('Invalid credentials');
//   }

//   // Generate tokens
//   const accessToken = generateAccessToken(user);
//   const refreshToken = generateRefreshToken(user);

//   // Store the refresh token hash (never store the raw token)
//   const tokenHash = crypto
//     .createHash('sha256')
//     .update(refreshToken)
//     .digest('hex');


//   await prisma.refreshToken.create({
//     data: {
//       userId: user.id,
//       token: tokenHash,
//       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//     },
//   });

//   return {
//     accessToken,
//     refreshToken,
//     user: { id: user.id, email: user.email, tier: user.tier },
//   };
// }

type LoginInput = {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
};

export async function login({ email, password, ip, userAgent }: LoginInput) {
  const startTime = Date.now();
  
  try {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null }
    });

    if (!user) {
      // Track failed login attempt
      if (ip) {
        await trackFailedLoginAttempt(ip, userAgent, undefined, email);
        recordAuthEvent('login', 'failure', ip);
        logAuthEvent('login', 'failure', { ip, userAgent, email });
      }
      throw Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      // Track failed login attempt
      if (ip) {
        await trackFailedLoginAttempt(ip, userAgent, user.id, email);
        recordAuthEvent('login', 'failure', ip);
        logAuthEvent('login', 'failure', { ip, userAgent, userId: user.id, email });
      }
      throw Error("Invalid credentials");
    }

    // Clear failed login attempts on successful login
    if (ip) {
      await clearFailedLoginAttempts(ip);
    }

    const refreshToken = generateRefreshToken({id: user.id, tier: user.tier});
    
    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Record successful login
    if (ip) {
      recordAuthEvent('login', 'success', ip);
      logAuthEvent('login', 'success', { ip, userAgent, userId: user.id, email });
    }

    const duration = Date.now() - startTime;
    logPerformance('login', duration, { userId: user.id, email });

    return {
      accessToken: generateAccessToken({id: user.id, tier: user.tier}),
      refreshToken
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logPerformance('login', duration, { email, error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}


export async function refresh(rawRefreshToken: string) {
  // Verify the JWT signature and expiration
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new Error('Invalid refresh token');
  }

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  // Check if this token exists in the database (not revoked)
  const tokenHash = crypto
    .createHash('sha256')
    .update(rawRefreshToken)
    .digest('hex');

  const stored = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new Error('Refresh token expired or revoked');
  }

  // Get the user
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });
  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  // Rotate: delete the old token, create a new one
  await prisma.refreshToken.delete({ where: { token: tokenHash } });

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  const newHash = crypto
    .createHash('sha256')
    .update(newRefreshToken)
    .digest('hex');

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}


export async function logout(rawRefreshToken: string) {
  const tokenHash = crypto
    .createHash('sha256')
    .update(rawRefreshToken)
    .digest('hex');

  // Delete the token. If it doesn't exist, that's fine.
  await prisma.refreshToken.deleteMany({
    where: { token: tokenHash },
  });
}

export async function getUserPermissions(userId: string) {
  const cacheKey = simpleKey('permissions', userId);
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      console.log(`Fetching permissions for user ${userId} from database`);
      
      const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Define permissions based on role
      const permissions = {
        // Basic permissions for all users
        read: true,
        write: true,
        
        // Role-specific permissions
        admin: user.role === 'admin',
        moderator: user.role === 'admin' || user.role === 'moderator',
        
        // Resource-specific permissions
        canDeleteDocuments: user.role === 'admin',
        canManageUsers: user.role === 'admin',
        canViewAnalytics: user.role === 'admin' || user.role === 'moderator',
        
        // User metadata
        userId: user.id,
        userRole: user.role,
        userCreatedAt: user.createdAt
      };

      return permissions;
    },
    CACHE_TTL.PERMISSIONS // 5 minutes TTL
  );
}


export async function invalidateUserPermissionsCache(userId: string) {
  const cacheKey = simpleKey('permissions', userId);
  const { cacheDel } = await import('../lib/cache.js');
  
  const deleted = await cacheDel(cacheKey);
  console.log(`Invalidated permissions cache for user ${userId}: ${deleted ? 'success' : 'failed'}`);
  
  return deleted;
}

export async function updateUserRole(userId: string, roleName: string) {
  // 1. Find the role record
  const role = await prisma.role.findUnique({
    where: { name: roleName },
  });

  if (!role) {
    throw new Error(`Role '${roleName}' not found`);
  }

  // Update user roles
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      roles: {
        deleteMany: {},
        create: {
          roleId: role.id,
          assignedBy: userId, // or admin id if available
        },
      },
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  // 3. Invalidate cache
  try {
    const { cacheInvalidators } = await import('../events/cache.event.js');
    await cacheInvalidators.invalidatePermissions(userId);
  } catch (error) {
    console.error('Failed to invalidate permissions cache on role change:', error);
  }

  return user;
}


