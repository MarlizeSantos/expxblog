import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { AdminThemeProvider } from '@/components/admin/AdminThemeProvider'
import { AdminTopBar } from '@/components/admin/AdminTopBar'
import { getDbPendingMigrations } from '@/lib/db-migrations'
import { MIGRATION_ORDER } from '@/lib/migrations-embedded'
import { DbUpdateModal } from '@/components/blog/DbUpdateModal'
import OnboardingWizard from '@/components/admin/OnboardingWizard'

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/admin/artigos',
    label: 'Artigos',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: '/admin/fontes',
    label: 'Fontes',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    href: '/admin/newsletter',
    label: 'Newsletter',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    href: '/admin/api',
    label: 'API',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  },
  {
    href: '/admin/aparencia',
    label: 'Aparência',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  {
    href: '/admin/configuracoes',
    label: 'Configurações',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  const user = token ? await verifyToken(token) : null

  if (!user) {
    return <>{children}</>
  }

  const { company } = await getSettings()
  const blogName = company.blog_name || process.env.NEXT_PUBLIC_BLOG_NAME || 'Blog'
  const initials = blogName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  let pendingMigrations: string[] = []
  try {
    pendingMigrations = await getDbPendingMigrations()
  } catch {
    // Se falhar, admin continua acessível — modal não aparece
    pendingMigrations = MIGRATION_ORDER
  }

  return (
    <AdminThemeProvider>
      <DbUpdateModal pending={pendingMigrations} />
      <OnboardingWizard />
      <div className="min-h-screen flex admin-shell">
        {/* Sidebar */}
        <aside className="admin-sidebar w-[220px] flex flex-col shrink-0">
          {/* Brand */}
          <div className="px-5 py-5 flex items-center gap-3 border-b" style={{ borderColor: 'var(--at-sidebar-border)' }}>
            <div className="w-8 h-8 rounded-lg admin-brand-badge flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[13px] leading-tight truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>{blogName}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>Admin</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 admin-nav-label">Menu</p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group"
              >
                <span className="shrink-0 transition-opacity">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User / Logout */}
          <div className="px-3 pb-4 pt-3 border-t" style={{ borderColor: 'var(--at-sidebar-border)' }}>
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div className="w-7 h-7 rounded-full admin-avatar-badge flex items-center justify-center shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <p className="text-[12px] font-medium truncate" style={{ color: 'var(--at-user-text)' }}>Administrador</p>
            </div>
            <form action={async () => {
              'use server'
              cookies().set('auth_token', '', { maxAge: 0, path: '/' })
              redirect('/admin/login')
            }}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 hover:bg-white/5"
                style={{ color: 'var(--at-logout-text)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sair
              </button>
            </form>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 admin-main flex flex-col overflow-hidden">
          <AdminTopBar />
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </AdminThemeProvider>
  )
}
