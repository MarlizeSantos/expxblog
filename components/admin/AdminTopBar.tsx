'use client'

import { useAdminTheme } from './AdminThemeProvider'
import { useChatPanel } from './ChatPanelContext'
import { usePageTitleValue } from './AdminPageTitleContext'

export function AdminTopBar() {
  const { theme, toggle } = useAdminTheme()
  const { toggle: toggleChat, isOpen: chatOpen } = useChatPanel()
  const isDark = theme === 'dark'
  const { title, subtitle } = usePageTitleValue()

  return (
    <div className="admin-topbar">
      <div className="flex-1 min-w-0">
        {title ? (
          <div className="min-w-0">
            <h1 className="text-2xl font-bold admin-text-primary leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm admin-text-secondary mt-1 truncate">{subtitle}</p>
            )}
          </div>
        ) : null}
      </div>
      <button
        onClick={toggleChat}
        aria-label={chatOpen ? 'Fechar assistente' : 'Abrir assistente de chat'}
        title={chatOpen ? 'Fechar assistente' : 'Assistente de chat'}
        className="admin-view-blog-btn"
        style={{ gap: '6px' }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Assistente
      </button>
      <a
        href={process.env.NEXT_PUBLIC_APP_URL ?? '/'}
        target="_blank"
        rel="noopener noreferrer"
        className="admin-view-blog-btn"
        title="Ver o blog"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Ver blog
      </a>
      <button
        onClick={toggle}
        aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        className="admin-theme-toggle"
        title={isDark ? 'Tema claro' : 'Tema escuro'}
      >
        <span className="admin-theme-track">
          <span className="admin-theme-thumb">
            {isDark ? (
              /* Moon */
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              /* Sun */
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </span>
        </span>
        <span className="admin-theme-label">
          {isDark ? 'Escuro' : 'Claro'}
        </span>
      </button>
    </div>
  )
}
