import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { allowAdminAttempt, isValidAdminCode, GuardConfig } from '@/lib/usage-guard'

const GUARD: GuardConfig = { prefix: 'dp', limit: 5, noun: 'analyses' }

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
    }
    // Limit guessing: a few tries per hour per network address.
    const allowed = await allowAdminAttempt(req, createServerSupabaseClient(), GUARD)
    if (!allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }
    const body = await req.json()
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }
    if (isValidAdminCode(code)) {
      return NextResponse.json({ valid: true }, { status: 200 })
    }
    return NextResponse.json({ valid: false, error: 'Invalid code' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
