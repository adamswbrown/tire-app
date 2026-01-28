import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export interface AuthenticatedRequest extends NextRequest {
  user?: jwt.JwtPayload | string;
}

export function requireAuth(handler: (req: AuthenticatedRequest, ...args: unknown[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: unknown[]) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      (req as AuthenticatedRequest).user = payload;
      return handler(req as AuthenticatedRequest, ...args);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
  };
}
