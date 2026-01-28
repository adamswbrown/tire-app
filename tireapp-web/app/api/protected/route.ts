import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';

export const GET = requireAuth(async function handler(req: NextRequest) {
  // Example protected data
  return NextResponse.json({ message: 'You are authenticated!', user: req.user });
});
