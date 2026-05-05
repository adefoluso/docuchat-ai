import { appEvents } from '../lib/events';
import { AUTH_EVENTS } from '../events/auth.events';
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
export async function login(data: {
  email: string;
  password: string;
  deviceInfo?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });

  // Same error for "user not found" and "wrong password"
  // This prevents user enumeration attacks
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Store the refresh token hash (never store the raw token)
  const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');


  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, tier: user.tier },
  };
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


