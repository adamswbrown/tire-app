import { NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/requireAuth';

export const GET = requireAuth(async function handler(req: AuthenticatedRequest) {
  // Example protected data
  return NextResponse.json({ message: 'You are authenticated!', user: req.user });
});
