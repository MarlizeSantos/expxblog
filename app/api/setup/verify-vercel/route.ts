import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  if (process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Already installed' }, { status: 403 })
  }

  const { token } = await req.json()
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
  }

  const res = await fetch('https://api.vercel.com/v2/user', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    return NextResponse.json({ valid: false, error: 'Token inválido' })
  }

  const projectId = process.env.VERCEL_PROJECT_ID ?? null
  const teamId = process.env.VERCEL_TEAM_ID ?? null

  return NextResponse.json({ valid: true, projectId, teamId })
}
