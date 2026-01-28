import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email: username } });
  if (!user || !user.password) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const token = jwt.sign({ userId: user.id, username: user.email }, JWT_SECRET, { expiresIn: '1d' });
  return NextResponse.json({ token, user: { id: user.id, username: user.email } });
}
