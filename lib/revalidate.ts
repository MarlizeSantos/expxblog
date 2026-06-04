import { revalidatePath } from 'next/cache'

/**
 * Invalida o cache ISR das páginas públicas afetadas por uma mutação de post.
 *
 * As páginas públicas usam `revalidate = 300` (ISR) para não bater no Postgres
 * a cada visita. Sem esta revalidação on-demand, um post recém-publicado ou
 * editado só apareceria após a janela de 5 min. Chame esta função em toda rota
 * que cria, edita, publica ou remove um post (admin, v1 e o Publisher do pipeline).
 *
 * Fire-and-forget é seguro: revalidatePath apenas marca o path como stale.
 * Passe o slug quando disponível para invalidar também a página do artigo.
 */
export function revalidatePublicPosts(slug?: string): void {
  // Home (listagem) e layout público (header/footer/newsletter vêm de settings).
  revalidatePath('/', 'page')
  // Página do artigo específico, quando conhecida.
  if (slug) revalidatePath(`/${slug}`, 'page')
}
