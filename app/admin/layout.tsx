import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { AdminThemeProvider } from '@/components/admin/AdminThemeProvider'
import { AdminTopBar } from '@/components/admin/AdminTopBar'
import { AdminPageTitleProvider } from '@/components/admin/AdminPageTitleContext'
import { ChatPanelProvider } from '@/components/admin/ChatPanelContext'
import { ChatPanel } from '@/components/admin/ChatPanel'
import { getDbPendingMigrations } from '@/lib/db-migrations'
import { MIGRATION_ORDER } from '@/lib/migrations-embedded'
import { DbUpdateModal } from '@/components/blog/DbUpdateModal'
import OnboardingWizard from '@/components/admin/OnboardingWizard'
import {
  IconDashboard,
  IconAnalytics,
  IconArtigos,
  IconNewsletter,
  IconAPI,
  IconAparencia,
  IconConfiguracoes,
  IconAvatar,
  IconLogout,
} from '@/components/admin/icons/ExpxIcons'

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: <IconDashboard />,
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: <IconAnalytics />,
  },
  {
    href: '/admin/artigos',
    label: 'Artigos',
    icon: <IconArtigos />,
  },
  {
    href: '/admin/newsletter',
    label: 'Newsletter',
    icon: <IconNewsletter />,
  },
  {
    href: '/admin/api',
    label: 'API',
    icon: <IconAPI />,
  },
  {
    href: '/admin/aparencia',
    label: 'Aparência',
    icon: <IconAparencia />,
  },
  {
    href: '/admin/configuracoes',
    label: 'Configurações',
    icon: <IconConfiguracoes />,
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
    <ChatPanelProvider>
    <AdminThemeProvider>
      <DbUpdateModal pending={pendingMigrations} />
      <OnboardingWizard />
      <ChatPanel />
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
                <IconAvatar style={{ color: 'rgba(255,255,255,0.75)' }} />
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
                <IconLogout className="shrink-0" />
                Sair
              </button>
            </form>
          </div>
        </aside>

        {/* Main area */}
        <AdminPageTitleProvider>
          <div className="flex-1 admin-main flex flex-col overflow-hidden">
            <AdminTopBar />
            <div className="flex-1 overflow-y-auto">
              <div className="p-8">
                {children}
              </div>
            </div>
          </div>
        </AdminPageTitleProvider>
      </div>
    </AdminThemeProvider>
    </ChatPanelProvider>
  )
}
