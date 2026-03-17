import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const secret = process.env.ADMIN_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
    }

    if (code.trim() === secret) {
      return NextResponse.json({ valid: true }, { status: 200 })
    }

    return NextResponse.json({ valid: false, error: 'Invalid code' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
