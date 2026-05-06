import { Request, Response, NextFunction } from 'express';
import jwt from "jsonwebtoken"
import { verifyAccessToken } from '../lib/tokens';
import { UnauthorizedError } from "../lib/errors"
import { prisma } from "../lib/prisma"

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; sub:string; role: string };
    }
  }
}

export const authenticate = async(
  req: Request, res: Response, next: NextFunction
) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

 const token = req.headers.authorization?.split(" ")[1]

   if (!token) throw new UnauthorizedError()

 // Check if token is blacklisted
 const blacklistedToken = await prisma.blacklistedToken.findUnique({
  where: { token }
 })

  if (blacklistedToken) {
  throw new UnauthorizedError()
 }

  const decoded = jwt.verify(
  token,
  process.env.JWT_ACCESS_SECRET!
) as { sub: string; role?: string; [key: string]: any }

 req.user = {
  id: decoded.sub,
  sub: decoded.sub,
  role: decoded.role ?? 'user',
 }
}
