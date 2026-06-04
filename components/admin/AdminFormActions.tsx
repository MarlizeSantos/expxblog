import type { ReactNode } from 'react'

interface AdminFormActionsProps {
  children: ReactNode
  align?: 'start' | 'end'
}

/**
 * Barra padronizada de ações de formulário (Salvar, Cancelar, Aplicar, etc.).
 * Posicionada no RODAPÉ do conteúdo — sem sticky/fixed.
 * Apenas ações de submit/persistência devem ser colocadas aqui.
 * Controles de toolbar/navegação permanecem no topo onde estão.
 */
export function AdminFormActions({ children, align = 'end' }: AdminFormActionsProps) {
  return (
    <div
      className={`flex items-center gap-3 mt-6 pt-5 border-t border-gray-100 ${
        align === 'start' ? 'justify-start' : 'justify-end'
      }`}
    >
      {children}
    </div>
  )
}
