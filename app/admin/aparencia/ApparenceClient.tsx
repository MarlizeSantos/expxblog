'use client'

import { useState } from 'react'
import type { SiteSettings, ThemeColors, DesignSystem } from '@/lib/settings'
import { DEFAULT_DESIGN_SYSTEM } from '@/lib/settings'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { DesignSystemImporter } from './DesignSystemImporter'

interface Props {
  initial: SiteSettings
}

const TEMPLATE_OPTIONS = [
  {
    id: 'default',
    name: 'Default',
    description: 'Layout limpo com sidebar de categorias e grid de posts',
    preview: (
      <svg viewBox="0 0 240 160" className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* Header */}
        <rect x="0" y="0" width="240" height="24" fill="#1A4FA0" rx="4" />
        <rect x="8" y="8" width="60" height="8" fill="white" rx="2" />
        <rect x="160" y="8" width="72" height="8" fill="white" opacity="0.5" rx="2" />
        {/* Sidebar */}
        <rect x="0" y="28" width="56" height="132" fill="#f3f4f6" rx="2" />
        <rect x="4" y="36" width="48" height="6" fill="#d1d5db" rx="1" />
        <rect x="4" y="46" width="40" height="4" fill="#d1d5db" rx="1" />
        <rect x="4" y="54" width="44" height="4" fill="#d1d5db" rx="1" />
        <rect x="4" y="62" width="36" height="4" fill="#d1d5db" rx="1" />
        {/* Post cards */}
        <rect x="62" y="28" width="56" height="70" fill="white" rx="3" />
        <rect x="62" y="28" width="56" height="32" fill="#e5e7eb" rx="3" />
        <rect x="66" y="64" width="48" height="5" fill="#d1d5db" rx="1" />
        <rect x="66" y="72" width="40" height="4" fill="#e5e7eb" rx="1" />
        <rect x="124" y="28" width="56" height="70" fill="white" rx="3" />
        <rect x="124" y="28" width="56" height="32" fill="#e5e7eb" rx="3" />
        <rect x="128" y="64" width="48" height="5" fill="#d1d5db" rx="1" />
        <rect x="128" y="72" width="40" height="4" fill="#e5e7eb" rx="1" />
        <rect x="184" y="28" width="56" height="70" fill="white" rx="3" />
        <rect x="184" y="28" width="56" height="32" fill="#e5e7eb" rx="3" />
        <rect x="188" y="64" width="48" height="5" fill="#d1d5db" rx="1" />
        <rect x="188" y="72" width="40" height="4" fill="#e5e7eb" rx="1" />
        {/* Footer */}
        <rect x="0" y="148" width="240" height="12" fill="#1A4FA0" rx="2" />
      </svg>
    ),
  },
  {
    id: 'portal',
    name: 'Portal',
    description: 'Estilo portal de notícias com hero destacado e grade editorial',
    preview: (
      <svg viewBox="0 0 240 160" className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* Header row 1 */}
        <rect x="0" y="0" width="240" height="18" fill="#CC0000" rx="4" />
        <rect x="8" y="5" width="60" height="8" fill="white" rx="2" />
        <rect x="160" y="5" width="72" height="8" fill="white" opacity="0.5" rx="2" />
        {/* Header row 2 - category nav */}
        <rect x="0" y="18" width="240" height="12" fill="#AA0000" />
        <rect x="8" y="21" width="20" height="5" fill="white" opacity="0.7" rx="1" />
        <rect x="34" y="21" width="24" height="5" fill="white" opacity="0.5" rx="1" />
        <rect x="64" y="21" width="28" height="5" fill="white" opacity="0.5" rx="1" />
        <rect x="98" y="21" width="20" height="5" fill="white" opacity="0.5" rx="1" />
        {/* Hero */}
        <rect x="0" y="30" width="240" height="52" fill="#555" rx="3" />
        <rect x="0" y="58" width="240" height="24" fill="black" opacity="0.5" />
        <rect x="8" y="56" width="40" height="5" fill="#FF6600" rx="1" />
        <rect x="8" y="64" width="180" height="7" fill="white" rx="2" />
        <rect x="8" y="74" width="120" height="4" fill="white" opacity="0.6" rx="1" />
        {/* Editorial grid */}
        <rect x="0" y="86" width="152" height="62" fill="white" rx="2" />
        <rect x="0" y="86" width="152" height="3" fill="#FF6600" rx="2" />
        <rect x="0" y="86" width="152" height="28" fill="#e5e7eb" rx="2" />
        <rect x="4" y="118" width="144" height="7" fill="#d1d5db" rx="1" />
        <rect x="4" y="128" width="100" height="5" fill="#e5e7eb" rx="1" />
        <rect x="156" y="86" width="84" height="28" fill="white" rx="2" />
        <rect x="156" y="86" width="84" height="3" fill="#FF6600" />
        <rect x="160" y="92" width="76" height="5" fill="#d1d5db" rx="1" />
        <rect x="156" y="118" width="84" height="28" fill="white" rx="2" />
        <rect x="156" y="118" width="84" height="3" fill="#FF6600" />
        <rect x="160" y="124" width="76" height="5" fill="#d1d5db" rx="1" />
        {/* Footer */}
        <rect x="0" y="150" width="240" height="10" fill="#CC0000" rx="2" />
      </svg>
    ),
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Estilo magazine corporativo com destaque, grid rico e newsletter',
    preview: (
      <svg viewBox="0 0 240 160" className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* White header */}
        <rect x="0" y="0" width="240" height="22" fill="white" rx="2" />
        <rect x="0" y="21" width="240" height="1" fill="#e5e7eb" />
        <rect x="8" y="7" width="48" height="8" fill="#1a1a2e" rx="2" />
        <rect x="100" y="9" width="18" height="4" fill="#9ca3af" rx="1" />
        <rect x="124" y="9" width="18" height="4" fill="#9ca3af" rx="1" />
        <rect x="148" y="9" width="18" height="4" fill="#9ca3af" rx="1" />
        <rect x="192" y="7" width="40" height="8" fill="#f3f4f6" rx="3" />
        {/* Featured: large left */}
        <rect x="0" y="26" width="144" height="72" fill="#d1d5db" rx="2" />
        <rect x="0" y="74" width="144" height="24" fill="black" opacity="0.5" rx="2" />
        <rect x="4" y="66" width="28" height="5" fill="#FF6B35" rx="1" />
        <rect x="4" y="74" width="134" height="6" fill="white" rx="1" />
        <rect x="4" y="83" width="90" height="4" fill="white" opacity="0.6" rx="1" />
        {/* Featured: 2 small right */}
        <rect x="148" y="26" width="92" height="33" fill="white" rx="2" />
        <rect x="148" y="26" width="30" height="33" fill="#e5e7eb" rx="2" />
        <rect x="182" y="31" width="54" height="5" fill="#d1d5db" rx="1" />
        <rect x="182" y="40" width="40" height="4" fill="#e5e7eb" rx="1" />
        <rect x="148" y="63" width="92" height="33" fill="white" rx="2" />
        <rect x="148" y="63" width="30" height="33" fill="#e5e7eb" rx="2" />
        <rect x="182" y="68" width="54" height="5" fill="#d1d5db" rx="1" />
        <rect x="182" y="77" width="40" height="4" fill="#e5e7eb" rx="1" />
        {/* 3-col grid */}
        <rect x="0" y="102" width="73" height="42" fill="white" rx="2" />
        <rect x="0" y="102" width="73" height="22" fill="#e5e7eb" rx="2" />
        <rect x="2" y="128" width="50" height="4" fill="#d1d5db" rx="1" />
        <rect x="83" y="102" width="73" height="42" fill="white" rx="2" />
        <rect x="83" y="102" width="73" height="22" fill="#e5e7eb" rx="2" />
        <rect x="85" y="128" width="50" height="4" fill="#d1d5db" rx="1" />
        <rect x="166" y="102" width="74" height="42" fill="white" rx="2" />
        <rect x="166" y="102" width="74" height="22" fill="#e5e7eb" rx="2" />
        <rect x="168" y="128" width="50" height="4" fill="#d1d5db" rx="1" />
        {/* Newsletter banner */}
        <rect x="0" y="148" width="240" height="12" fill="#0D1B4B" rx="2" />
        <rect x="70" y="151" width="50" height="4" fill="white" opacity="0.8" rx="1" />
        <rect x="132" y="150" width="36" height="6" fill="#FF6B35" rx="3" />
      </svg>
    ),
  },
  {
    id: 'tech',
    name: 'Tech',
    description: 'Estilo editorial tech com header escuro, hero em destaque e seções por categoria',
    preview: (
      <svg viewBox="0 0 240 160" className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* Dark header */}
        <rect x="0" y="0" width="240" height="20" fill="#111111" rx="3" />
        <rect x="8" y="6" width="44" height="8" fill="white" rx="2" />
        <rect x="64" y="8" width="16" height="4" fill="white" opacity="0.5" rx="1" />
        <rect x="86" y="8" width="20" height="4" fill="white" opacity="0.5" rx="1" />
        <rect x="112" y="8" width="18" height="4" fill="white" opacity="0.5" rx="1" />
        <rect x="186" y="6" width="46" height="8" fill="white" opacity="0.15" rx="3" />
        {/* Hero: large featured left */}
        <rect x="0" y="24" width="155" height="72" fill="#555" rx="2" />
        <rect x="0" y="72" width="155" height="24" fill="black" opacity="0.55" rx="2" />
        <rect x="6" y="66" width="30" height="5" fill="#00B140" rx="1" />
        <rect x="6" y="74" width="142" height="7" fill="white" rx="2" />
        <rect x="6" y="84" width="80" height="4" fill="white" opacity="0.5" rx="1" />
        {/* Hero: 2 secondary right */}
        <rect x="159" y="24" width="81" height="33" fill="white" rx="2" />
        <rect x="159" y="24" width="24" height="33" fill="#e5e7eb" rx="2" />
        <rect x="187" y="29" width="50" height="4" fill="#d1d5db" rx="1" />
        <rect x="187" y="36" width="36" height="3" fill="#e5e7eb" rx="1" />
        <rect x="159" y="61" width="81" height="33" fill="white" rx="2" />
        <rect x="159" y="61" width="24" height="33" fill="#e5e7eb" rx="2" />
        <rect x="187" y="66" width="50" height="4" fill="#d1d5db" rx="1" />
        <rect x="187" y="73" width="36" height="3" fill="#e5e7eb" rx="1" />
        {/* Category section heading */}
        <rect x="0" y="101" width="3" height="7" fill="#00B140" rx="1" />
        <rect x="7" y="103" width="40" height="4" fill="#1a1a2e" rx="1" />
        <rect x="186" y="102" width="20" height="5" fill="#00B140" opacity="0.5" rx="1" />
        {/* 3-col cards */}
        <rect x="0" y="112" width="73" height="38" fill="white" rx="2" />
        <rect x="0" y="112" width="73" height="20" fill="#e5e7eb" rx="2" />
        <rect x="2" y="135" width="50" height="4" fill="#d1d5db" rx="1" />
        <rect x="83" y="112" width="73" height="38" fill="white" rx="2" />
        <rect x="83" y="112" width="73" height="20" fill="#e5e7eb" rx="2" />
        <rect x="85" y="135" width="50" height="4" fill="#d1d5db" rx="1" />
        <rect x="166" y="112" width="74" height="38" fill="white" rx="2" />
        <rect x="166" y="112" width="74" height="20" fill="#e5e7eb" rx="2" />
        <rect x="168" y="135" width="50" height="4" fill="#d1d5db" rx="1" />
        {/* Footer */}
        <rect x="0" y="152" width="240" height="8" fill="#111111" rx="2" />
      </svg>
    ),
  },
  {
    id: 'news',
    name: 'News',
    description: 'Estilo portal de notícias com seções por categoria e sidebar de destaques',
    preview: (
      <svg viewBox="0 0 240 160" className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* Header row 1: white */}
        <rect x="0" y="0" width="240" height="16" fill="white" rx="3" />
        <rect x="0" y="15" width="240" height="1" fill="#e5e7eb" />
        <rect x="8" y="4" width="44" height="7" fill="#003580" rx="2" />
        <rect x="180" y="3" width="52" height="9" fill="#f3f4f6" rx="3" />
        {/* Header row 2: primary blue */}
        <rect x="0" y="16" width="240" height="13" fill="#003580" />
        <rect x="8" y="20" width="18" height="5" fill="white" opacity="0.9" rx="1" />
        <rect x="32" y="20" width="24" height="5" fill="white" opacity="0.55" rx="1" />
        <rect x="62" y="20" width="20" height="5" fill="white" opacity="0.55" rx="1" />
        <rect x="88" y="20" width="28" height="5" fill="white" opacity="0.55" rx="1" />
        {/* Section 1 heading */}
        <rect x="0" y="34" width="3" height="8" fill="#003580" rx="1" />
        <rect x="7" y="36" width="44" height="4" fill="#1a1a2e" rx="1" />
        <rect x="138" y="35" width="22" height="5" fill="#003580" opacity="0.4" rx="1" />
        {/* Section 1 cards row */}
        <rect x="0" y="45" width="52" height="38" fill="white" rx="2" />
        <rect x="0" y="45" width="52" height="22" fill="#e5e7eb" rx="2" />
        <rect x="2" y="70" width="44" height="4" fill="#d1d5db" rx="1" />
        <rect x="55" y="45" width="52" height="38" fill="white" rx="2" />
        <rect x="55" y="45" width="52" height="22" fill="#e5e7eb" rx="2" />
        <rect x="57" y="70" width="44" height="4" fill="#d1d5db" rx="1" />
        <rect x="110" y="45" width="52" height="38" fill="white" rx="2" />
        <rect x="110" y="45" width="52" height="22" fill="#e5e7eb" rx="2" />
        <rect x="112" y="70" width="44" height="4" fill="#d1d5db" rx="1" />
        {/* Section 2 heading */}
        <rect x="0" y="88" width="3" height="8" fill="#003580" rx="1" />
        <rect x="7" y="90" width="38" height="4" fill="#1a1a2e" rx="1" />
        {/* Section 2 cards row */}
        <rect x="0" y="98" width="52" height="34" fill="white" rx="2" />
        <rect x="0" y="98" width="52" height="18" fill="#e5e7eb" rx="2" />
        <rect x="2" y="120" width="44" height="4" fill="#d1d5db" rx="1" />
        <rect x="55" y="98" width="52" height="34" fill="white" rx="2" />
        <rect x="55" y="98" width="52" height="18" fill="#e5e7eb" rx="2" />
        <rect x="57" y="120" width="44" height="4" fill="#d1d5db" rx="1" />
        <rect x="110" y="98" width="52" height="34" fill="white" rx="2" />
        <rect x="110" y="98" width="52" height="18" fill="#e5e7eb" rx="2" />
        <rect x="112" y="120" width="44" height="4" fill="#d1d5db" rx="1" />
        {/* Right sidebar */}
        <rect x="167" y="30" width="73" height="104" fill="white" rx="3" />
        <rect x="169" y="33" width="3" height="7" fill="#E8002D" rx="1" />
        <rect x="176" y="35" width="36" height="4" fill="#1a1a2e" rx="1" />
        <rect x="169" y="45" width="16" height="11" fill="#e5e7eb" rx="1" />
        <rect x="169" y="45" width="7" height="7" fill="#003580" rx="3" />
        <rect x="189" y="46" width="46" height="3" fill="#d1d5db" rx="1" />
        <rect x="189" y="52" width="32" height="3" fill="#e5e7eb" rx="1" />
        <rect x="169" y="61" width="16" height="11" fill="#e5e7eb" rx="1" />
        <rect x="169" y="61" width="7" height="7" fill="#003580" rx="3" />
        <rect x="189" y="62" width="46" height="3" fill="#d1d5db" rx="1" />
        <rect x="189" y="68" width="32" height="3" fill="#e5e7eb" rx="1" />
        <rect x="169" y="77" width="16" height="11" fill="#e5e7eb" rx="1" />
        <rect x="169" y="77" width="7" height="7" fill="#003580" rx="3" />
        <rect x="189" y="78" width="46" height="3" fill="#d1d5db" rx="1" />
        <rect x="189" y="84" width="32" height="3" fill="#e5e7eb" rx="1" />
        <rect x="169" y="96" width="3" height="7" fill="#E8002D" rx="1" />
        <rect x="176" y="98" width="24" height="4" fill="#1a1a2e" rx="1" />
        <rect x="169" y="107" width="28" height="8" fill="#f3f4f6" rx="4" />
        <rect x="200" y="107" width="22" height="8" fill="#f3f4f6" rx="4" />
        <rect x="169" y="119" width="32" height="8" fill="#f3f4f6" rx="4" />
        <rect x="204" y="119" width="28" height="8" fill="#f3f4f6" rx="4" />
        {/* Footer */}
        <rect x="0" y="150" width="240" height="10" fill="#003580" rx="2" />
      </svg>
    ),
  },
]

const COLOR_LABELS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'primary', label: 'Cor primária (header, botões, links)' },
  { key: 'secondary', label: 'Cor de destaque (badges, acentos)' },
  { key: 'background', label: 'Fundo da página' },
  { key: 'surface', label: 'Fundo dos cards' },
]

const DEFAULT_COLORS: Record<string, ThemeColors> = {
  default: { primary: '#1A4FA0', secondary: '#F58A2D', background: '#F9FAFB', surface: '#FFFFFF' },
  portal: { primary: '#CC0000', secondary: '#FF6600', background: '#F5F5F5', surface: '#FFFFFF' },
  business: { primary: '#0D1B4B', secondary: '#FF6B35', background: '#F7F8FA', surface: '#FFFFFF' },
  news: { primary: '#003580', secondary: '#E8002D', background: '#F2F2F2', surface: '#FFFFFF' },
  tech: { primary: '#111111', secondary: '#00B140', background: '#F4F4F4', surface: '#FFFFFF' },
}

export function ApparenceClient({ initial }: Props) {
  const [template, setTemplate] = useState(initial.template)
  const [colors, setColors] = useState<ThemeColors>(initial.colors)
  const [logoUrl, setLogoUrl] = useState(initial.company.logo_url)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [designSystem, setDesignSystem] = useState<DesignSystem>(initial.design_system)

  function handleDSChange(key: keyof DesignSystem, value: string) {
    setDesignSystem((prev) => ({ ...prev, [key]: value }))
  }

  function handleDSReset(key: keyof DesignSystem) {
    setDesignSystem((prev) => ({ ...prev, [key]: DEFAULT_DESIGN_SYSTEM[key] }))
  }

  function handleImportApply(tokens: Partial<DesignSystem>) {
    setDesignSystem((prev) => ({ ...prev, ...tokens }))
  }

  function handleTemplateChange(id: string) {
    setTemplate(id)
    setColors(DEFAULT_COLORS[id] ?? DEFAULT_COLORS.default)
  }

  function handleColorChange(key: keyof ThemeColors, value: string) {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  function handleReset(key: keyof ThemeColors) {
    setColors((prev) => ({
      ...prev,
      [key]: (DEFAULT_COLORS[template] ?? DEFAULT_COLORS.default)[key],
    }))
  }

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, colors, company: { logo_url: logoUrl }, design_system: designSystem }),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      setToast({ type: 'success', msg: 'Configurações salvas! Recarregue a página para ver o novo tema.' })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar configurações.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Aparência</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      {toast && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Template selector */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleTemplateChange(opt.id)}
              className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                template === opt.id
                  ? 'border-brand-primary bg-brand-primary-light'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {template === opt.id && (
                <span className="absolute top-3 right-3 bg-brand-primary text-white text-xs px-2 py-0.5 rounded-full">
                  Ativo
                </span>
              )}
              <div className="mb-3 rounded overflow-hidden border border-gray-100 max-h-32">
                {opt.preview}
              </div>
              <p className="font-semibold text-neutral-900">{opt.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{opt.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Logo */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-1">Logotipo</h2>
        <p className="text-sm text-gray-500 mb-4">Aparece no canto esquerdo do header. Sem logo, o nome do blog é exibido no lugar.</p>
        <div className="max-w-sm">
          <ImageUpload value={logoUrl} onChange={setLogoUrl} variant="logo" />
        </div>
      </section>

      {/* Design System Importer */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">Importar design do site</h2>
        <DesignSystemImporter onApply={handleImportApply} />
      </section>

      {/* Color customizer */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Cores</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {COLOR_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900">{label}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{colors[key]}</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                />
                <input
                  type="text"
                  value={colors[key]}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleColorChange(key, v)
                  }}
                  className="w-24 text-sm font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <button
                  onClick={() => handleReset(key)}
                  className="text-xs text-gray-400 hover:text-brand-primary transition-colors"
                  title="Restaurar padrão"
                >
                  Padrão
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Tipografia</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {([
            { key: 'font_sans' as const, label: 'Fonte principal (sans-serif)', placeholder: 'Inter, system-ui, sans-serif' },
            { key: 'font_serif' as const, label: 'Fonte de títulos (serif)', placeholder: '"Source Serif 4", Georgia, serif' },
            { key: 'font_mono' as const, label: 'Fonte de código (mono)', placeholder: '"JetBrains Mono", monospace' },
          ]).map(({ key, label, placeholder }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900">{label}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{designSystem[key]}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={designSystem[key]}
                  onChange={(e) => handleDSChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-64 text-sm font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <button onClick={() => handleDSReset(key)} className="text-xs text-gray-400 hover:text-brand-primary transition-colors">
                  Padrão
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Font sizes */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Tamanhos de fonte</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {([
            { key: 'font_size_sm' as const, label: 'Pequeno (sm)' },
            { key: 'font_size_base' as const, label: 'Base' },
            { key: 'font_size_lg' as const, label: 'Grande (lg)' },
            { key: 'font_size_xl' as const, label: 'Extra grande (xl)' },
            { key: 'font_size_2xl' as const, label: '2XL' },
            { key: 'font_size_3xl' as const, label: '3XL (títulos)' },
          ]).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-5 py-3 gap-4">
              <p className="text-sm font-medium text-neutral-900 w-48">{label}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={designSystem[key]}
                  onChange={(e) => handleDSChange(key, e.target.value)}
                  className="w-28 text-sm font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <button onClick={() => handleDSReset(key)} className="text-xs text-gray-400 hover:text-brand-primary transition-colors">
                  Padrão
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Border radius */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Arredondamento (border-radius)</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {([
            { key: 'radius_sm' as const, label: 'Pequeno (sm)' },
            { key: 'radius_md' as const, label: 'Médio (md)' },
            { key: 'radius_lg' as const, label: 'Grande (lg)' },
            { key: 'radius_full' as const, label: 'Circular (full)' },
          ]).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-5 py-3 gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 border-2 border-brand-primary shrink-0"
                  style={{ borderRadius: designSystem[key] }}
                />
                <p className="text-sm font-medium text-neutral-900">{label}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={designSystem[key]}
                  onChange={(e) => handleDSChange(key, e.target.value)}
                  className="w-28 text-sm font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <button onClick={() => handleDSReset(key)} className="text-xs text-gray-400 hover:text-brand-primary transition-colors">
                  Padrão
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Extended colors */}
      <section className="mt-8 mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Cores semânticas</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {([
            { key: 'color_text_primary' as const, label: 'Texto principal' },
            { key: 'color_text_secondary' as const, label: 'Texto secundário' },
            { key: 'color_border' as const, label: 'Borda padrão' },
            { key: 'color_error' as const, label: 'Erro' },
            { key: 'color_success' as const, label: 'Sucesso' },
            { key: 'color_warning' as const, label: 'Alerta' },
          ]).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900">{label}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{designSystem[key]}</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={designSystem[key]}
                  onChange={(e) => handleDSChange(key, e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                />
                <input
                  type="text"
                  value={designSystem[key]}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleDSChange(key, v)
                  }}
                  className="w-24 text-sm font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <button onClick={() => handleDSReset(key)} className="text-xs text-gray-400 hover:text-brand-primary transition-colors">
                  Padrão
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
