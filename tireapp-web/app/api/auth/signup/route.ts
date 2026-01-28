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
  const existing = await prisma.user.findUnique({ where: { email: username } });
  if (existing) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email: username, name: username, password: hash },
  });
  const token = jwt.sign({ userId: user.id, username: user.email }, JWT_SECRET, { expiresIn: '1d' });
  return NextResponse.json({ token, user: { id: user.id, username: user.email } });
}
