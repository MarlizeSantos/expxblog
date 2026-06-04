'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { usePageTitle } from '@/components/admin/AdminPageTitleContext'
import type { SiteSettings, ThemeColors, DesignSystem } from '@/lib/settings'
import { DEFAULT_DESIGN_SYSTEM } from '@/lib/settings-constants'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { DesignSystemImporter } from './DesignSystemImporter'
import { AdminFormActions } from '@/components/admin/AdminFormActions'

interface Props {
  initial: SiteSettings
}

const TEMPLATE_OPTIONS = [
  {
    id: 'default',
    name: 'Default',
    description: 'Layout limpo com sidebar de categorias e grid de posts',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="def-img1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DDE2EA" />
            <stop offset="100%" stopColor="#C8CDD7" />
          </linearGradient>
          <linearGradient id="def-img2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E2E6EC" />
            <stop offset="100%" stopColor="#CDD2DB" />
          </linearGradient>
        </defs>
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="#F8F9FB" rx="7" />
        {/* Chrome top bar */}
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* Page header */}
        <rect x="2" y="18" width="276" height="22" fill="#1A4FA0" />
        <rect x="12" y="24" width="44" height="6" fill="white" rx="2" opacity="0.95" />
        <rect x="170" y="25" width="22" height="4" fill="white" rx="1" opacity="0.45" />
        <rect x="198" y="25" width="18" height="4" fill="white" rx="1" opacity="0.45" />
        <rect x="222" y="25" width="20" height="4" fill="white" rx="1" opacity="0.45" />
        <rect x="248" y="23" width="26" height="7" fill="white" rx="3" opacity="0.18" />
        {/* Layout: sidebar + main */}
        {/* Sidebar */}
        <rect x="10" y="46" width="58" height="122" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="16" y="53" width="32" height="4" fill="#1A4FA0" rx="1" opacity="0.7" />
        <rect x="16" y="63" width="38" height="3" fill="#C8CDD7" rx="1" />
        <rect x="16" y="70" width="30" height="3" fill="#D4D8DF" rx="1" />
        <rect x="16" y="77" width="36" height="3" fill="#D4D8DF" rx="1" />
        <rect x="16" y="84" width="26" height="3" fill="#D4D8DF" rx="1" />
        <rect x="16" y="91" width="34" height="3" fill="#D4D8DF" rx="1" />
        <rect x="16" y="98" width="28" height="3" fill="#D4D8DF" rx="1" />
        {/* Divider */}
        <rect x="16" y="107" width="40" height="0.5" fill="#E8EBF0" />
        <rect x="16" y="113" width="32" height="3" fill="#C8CDD7" rx="1" opacity="0.6" />
        {/* Tag pills in sidebar */}
        <rect x="16" y="120" width="20" height="6" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="0.5" rx="3" />
        <rect x="40" y="120" width="14" height="6" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="0.5" rx="3" />
        <rect x="16" y="130" width="16" height="6" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="0.5" rx="3" />
        <rect x="36" y="130" width="22" height="6" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="0.5" rx="3" />
        {/* Post cards — 3 col */}
        {/* Card 1 */}
        <rect x="74" y="46" width="62" height="78" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="74" y="46" width="62" height="38" fill="url(#def-img1)" rx="4" />
        <rect x="79" y="89" width="12" height="5" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="0.5" rx="2.5" />
        <rect x="79" y="98" width="50" height="4" fill="#B0B8C8" rx="1" />
        <rect x="79" y="105" width="38" height="3" fill="#CDD2DB" rx="1" opacity="0.7" />
        <rect x="79" y="111" width="44" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        {/* Card 2 */}
        <rect x="142" y="46" width="62" height="78" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="142" y="46" width="62" height="38" fill="url(#def-img2)" rx="4" />
        <rect x="147" y="89" width="16" height="5" fill="#FFF3E8" stroke="#FDD0A8" strokeWidth="0.5" rx="2.5" />
        <rect x="147" y="98" width="50" height="4" fill="#B0B8C8" rx="1" />
        <rect x="147" y="105" width="42" height="3" fill="#CDD2DB" rx="1" opacity="0.7" />
        <rect x="147" y="111" width="34" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        {/* Card 3 */}
        <rect x="210" y="46" width="62" height="78" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="210" y="46" width="62" height="38" fill="url(#def-img1)" rx="4" />
        <rect x="215" y="89" width="14" height="5" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="0.5" rx="2.5" />
        <rect x="215" y="98" width="50" height="4" fill="#B0B8C8" rx="1" />
        <rect x="215" y="105" width="36" height="3" fill="#CDD2DB" rx="1" opacity="0.7" />
        <rect x="215" y="111" width="46" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        {/* Second row cards (partial) */}
        <rect x="74" y="130" width="62" height="34" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="74" y="130" width="62" height="18" fill="url(#def-img2)" rx="4" />
        <rect x="142" y="130" width="62" height="34" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="142" y="130" width="62" height="18" fill="url(#def-img1)" rx="4" />
        <rect x="210" y="130" width="62" height="34" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="210" y="130" width="62" height="18" fill="url(#def-img2)" rx="4" />
        {/* Footer */}
        <rect x="2" y="166" width="276" height="14" fill="#1A4FA0" opacity="0.9" rx="4" />
        <rect x="100" y="170" width="80" height="3" fill="white" rx="1" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: 'portal',
    name: 'Portal',
    description: 'Estilo portal de notícias com hero destacado e grade editorial',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="por-hero" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A5568" />
            <stop offset="100%" stopColor="#2D3748" />
          </linearGradient>
          <linearGradient id="por-overlay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="por-img" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DDE2EA" />
            <stop offset="100%" stopColor="#C5CAD4" />
          </linearGradient>
        </defs>
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="#F8F9FB" rx="7" />
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* Primary header */}
        <rect x="2" y="18" width="276" height="18" fill="#CC0000" />
        <rect x="12" y="23" width="40" height="6" fill="white" rx="2" opacity="0.95" />
        <rect x="180" y="24" width="20" height="4" fill="white" rx="1" opacity="0.4" />
        <rect x="206" y="24" width="16" height="4" fill="white" rx="1" opacity="0.4" />
        <rect x="228" y="24" width="20" height="4" fill="white" rx="1" opacity="0.4" />
        {/* Secondary nav */}
        <rect x="2" y="36" width="276" height="10" fill="#AA0000" />
        <rect x="12" y="39" width="16" height="3.5" fill="white" rx="1" opacity="0.85" />
        <rect x="34" y="39" width="22" height="3.5" fill="white" rx="1" opacity="0.55" />
        <rect x="62" y="39" width="18" height="3.5" fill="white" rx="1" opacity="0.55" />
        <rect x="86" y="39" width="24" height="3.5" fill="white" rx="1" opacity="0.55" />
        <rect x="116" y="39" width="16" height="3.5" fill="white" rx="1" opacity="0.55" />
        {/* Hero image */}
        <rect x="8" y="50" width="264" height="56" fill="url(#por-hero)" rx="4" />
        <rect x="8" y="78" width="264" height="28" fill="url(#por-overlay)" rx="4" />
        {/* Category pill on hero */}
        <rect x="16" y="72" width="30" height="7" fill="#CC0000" rx="3.5" />
        {/* Hero headline */}
        <rect x="16" y="82" width="180" height="6" fill="white" rx="2" opacity="0.95" />
        <rect x="16" y="91" width="130" height="4" fill="white" rx="1" opacity="0.6" />
        <rect x="16" y="97" width="100" height="3" fill="white" rx="1" opacity="0.4" />
        {/* Editorial grid — large left + 2 right stacked */}
        {/* Large left */}
        <rect x="8" y="112" width="158" height="58" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="8" y="112" width="158" height="32" fill="url(#por-img)" rx="4" />
        <rect x="14" y="148" width="26" height="5" fill="#FFF0F0" stroke="#FCC" strokeWidth="0.5" rx="2.5" />
        <rect x="14" y="156" width="140" height="4" fill="#B0B8C8" rx="1" />
        <rect x="14" y="163" width="100" height="3" fill="#CDD2DB" rx="1" opacity="0.6" />
        {/* Right stacked card 1 */}
        <rect x="172" y="112" width="100" height="26" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="172" y="112" width="36" height="26" fill="url(#por-img)" rx="4" />
        <rect x="214" y="116" width="52" height="4" fill="#B0B8C8" rx="1" />
        <rect x="214" y="123" width="38" height="3" fill="#CDD2DB" rx="1" opacity="0.6" />
        <rect x="214" y="129" width="44" height="3" fill="#CDD2DB" rx="1" opacity="0.4" />
        {/* Right stacked card 2 */}
        <rect x="172" y="144" width="100" height="26" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="172" y="144" width="36" height="26" fill="url(#por-img)" rx="4" />
        <rect x="214" y="148" width="52" height="4" fill="#B0B8C8" rx="1" />
        <rect x="214" y="155" width="38" height="3" fill="#CDD2DB" rx="1" opacity="0.6" />
        <rect x="214" y="161" width="44" height="3" fill="#CDD2DB" rx="1" opacity="0.4" />
        {/* Footer */}
        <rect x="2" y="172" width="276" height="6" fill="#CC0000" opacity="0.85" rx="3" />
      </svg>
    ),
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Estilo magazine corporativo com destaque, grid rico e newsletter',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="biz-hero" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BFC6D3" />
            <stop offset="100%" stopColor="#A8B2C2" />
          </linearGradient>
          <linearGradient id="biz-overlay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="#0D1B4B" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="biz-img" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DDE2EA" />
            <stop offset="100%" stopColor="#C8CDD7" />
          </linearGradient>
        </defs>
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="#F8F9FB" rx="7" />
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* White header */}
        <rect x="2" y="18" width="276" height="20" fill="white" />
        <rect x="2" y="37" width="276" height="0.5" fill="#E2E5EA" />
        <rect x="12" y="23" width="38" height="7" fill="#0D1B4B" rx="2" opacity="0.9" />
        <rect x="90" y="25" width="16" height="3.5" fill="#9CA3AF" rx="1" />
        <rect x="112" y="25" width="18" height="3.5" fill="#9CA3AF" rx="1" />
        <rect x="136" y="25" width="16" height="3.5" fill="#9CA3AF" rx="1" />
        <rect x="158" y="25" width="20" height="3.5" fill="#9CA3AF" rx="1" />
        <rect x="234" y="23" width="36" height="8" fill="#FF6B35" rx="4" opacity="0.9" />
        {/* Featured large left */}
        <rect x="8" y="42" width="150" height="78" fill="url(#biz-hero)" rx="4" />
        <rect x="8" y="90" width="150" height="30" fill="url(#biz-overlay)" rx="4" />
        <rect x="14" y="86" width="32" height="7" fill="#FF6B35" rx="3.5" />
        <rect x="14" y="96" width="136" height="5" fill="white" rx="2" opacity="0.95" />
        <rect x="14" y="104" width="100" height="3.5" fill="white" rx="1" opacity="0.65" />
        <rect x="14" y="110" width="80" height="3" fill="white" rx="1" opacity="0.4" />
        {/* Right: 2 side articles */}
        <rect x="164" y="42" width="108" height="36" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="164" y="42" width="36" height="36" fill="url(#biz-img)" rx="4" />
        <rect x="206" y="48" width="58" height="4" fill="#B0B8C8" rx="1" />
        <rect x="206" y="55" width="44" height="3" fill="#CDD2DB" rx="1" opacity="0.6" />
        <rect x="206" y="61" width="50" height="3" fill="#CDD2DB" rx="1" opacity="0.4" />
        <rect x="206" y="69" width="28" height="5" fill="#FFF3EE" stroke="#FECBA6" strokeWidth="0.5" rx="2.5" />
        <rect x="164" y="84" width="108" height="36" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="164" y="84" width="36" height="36" fill="url(#biz-img)" rx="4" />
        <rect x="206" y="90" width="58" height="4" fill="#B0B8C8" rx="1" />
        <rect x="206" y="97" width="44" height="3" fill="#CDD2DB" rx="1" opacity="0.6" />
        <rect x="206" y="103" width="50" height="3" fill="#CDD2DB" rx="1" opacity="0.4" />
        <rect x="206" y="111" width="22" height="5" fill="#FFF3EE" stroke="#FECBA6" strokeWidth="0.5" rx="2.5" />
        {/* 3-col grid */}
        <rect x="8" y="126" width="82" height="40" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="8" y="126" width="82" height="22" fill="url(#biz-img)" rx="4" />
        <rect x="12" y="152" width="60" height="4" fill="#B0B8C8" rx="1" />
        <rect x="12" y="158" width="44" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        <rect x="99" y="126" width="82" height="40" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="99" y="126" width="82" height="22" fill="url(#biz-img)" rx="4" />
        <rect x="103" y="152" width="60" height="4" fill="#B0B8C8" rx="1" />
        <rect x="103" y="158" width="44" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        <rect x="190" y="126" width="82" height="40" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="190" y="126" width="82" height="22" fill="url(#biz-img)" rx="4" />
        <rect x="194" y="152" width="60" height="4" fill="#B0B8C8" rx="1" />
        <rect x="194" y="158" width="44" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        {/* Newsletter strip */}
        <rect x="2" y="168" width="276" height="10" fill="#0D1B4B" rx="4" />
        <rect x="80" y="171" width="40" height="3" fill="white" rx="1" opacity="0.5" />
        <rect x="130" y="170" width="32" height="6" fill="#FF6B35" rx="3" opacity="0.9" />
      </svg>
    ),
  },
  {
    id: 'tech',
    name: 'Tech',
    description: 'Estilo editorial tech com header escuro, hero em destaque e seções por categoria',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="tech-hero" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A2A2A" />
            <stop offset="100%" stopColor="#1A1A1A" />
          </linearGradient>
          <linearGradient id="tech-overlay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="tech-img" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D1D5DB" />
            <stop offset="100%" stopColor="#B8BDC6" />
          </linearGradient>
          <linearGradient id="tech-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F8F9FB" />
            <stop offset="100%" stopColor="#F2F4F7" />
          </linearGradient>
        </defs>
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="url(#tech-bg)" rx="7" />
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* Dark header */}
        <rect x="2" y="18" width="276" height="20" fill="#111111" />
        <rect x="12" y="23" width="36" height="7" fill="white" rx="2" opacity="0.9" />
        <rect x="60" y="25" width="14" height="3.5" fill="white" rx="1" opacity="0.45" />
        <rect x="80" y="25" width="18" height="3.5" fill="white" rx="1" opacity="0.45" />
        <rect x="104" y="25" width="16" height="3.5" fill="white" rx="1" opacity="0.45" />
        <rect x="126" y="25" width="20" height="3.5" fill="white" rx="1" opacity="0.45" />
        <rect x="238" y="23" width="30" height="7" fill="#00B140" rx="3.5" opacity="0.9" />
        {/* Hero section: large left + 2 right */}
        {/* Large hero */}
        <rect x="8" y="43" width="168" height="78" fill="url(#tech-hero)" rx="4" />
        <rect x="8" y="95" width="168" height="26" fill="url(#tech-overlay)" rx="4" />
        <rect x="14" y="88" width="34" height="7" fill="#00B140" rx="3.5" opacity="0.9" />
        <rect x="14" y="98" width="154" height="5" fill="white" rx="2" opacity="0.95" />
        <rect x="14" y="106" width="110" height="3.5" fill="white" rx="1" opacity="0.6" />
        <rect x="14" y="112" width="80" height="3" fill="white" rx="1" opacity="0.35" />
        {/* Secondary cards right */}
        <rect x="182" y="43" width="90" height="36" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="182" y="43" width="30" height="36" fill="url(#tech-img)" rx="4" />
        <rect x="218" y="49" width="48" height="4" fill="#B0B8C8" rx="1" />
        <rect x="218" y="56" width="36" height="3" fill="#CDD2DB" rx="1" opacity="0.6" />
        <rect x="218" y="63" width="42" height="3" fill="#CDD2DB" rx="1" opacity="0.4" />
        <rect x="218" y="70" width="22" height="5" fill="#E8FFF0" stroke="#A3E9B5" strokeWidth="0.5" rx="2.5" />
        <rect x="182" y="85" width="90" height="36" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="182" y="85" width="30" height="36" fill="url(#tech-img)" rx="4" />
        <rect x="218" y="91" width="48" height="4" fill="#B0B8C8" rx="1" />
        <rect x="218" y="98" width="36" height="3" fill="#CDD2DB" rx="1" opacity="0.6" />
        <rect x="218" y="105" width="42" height="3" fill="#CDD2DB" rx="1" opacity="0.4" />
        <rect x="218" y="112" width="22" height="5" fill="#E8FFF0" stroke="#A3E9B5" strokeWidth="0.5" rx="2.5" />
        {/* Category section heading */}
        <rect x="8" y="128" width="4" height="8" fill="#00B140" rx="2" />
        <rect x="16" y="130" width="44" height="4" fill="#1A1A1A" rx="1" opacity="0.8" />
        <rect x="240" y="129" width="32" height="6" fill="#E8FFF0" stroke="#A3E9B5" strokeWidth="0.5" rx="3" />
        {/* 3-col cards row */}
        <rect x="8" y="140" width="82" height="32" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="8" y="140" width="82" height="18" fill="url(#tech-img)" rx="4" />
        <rect x="12" y="162" width="54" height="3.5" fill="#B0B8C8" rx="1" />
        <rect x="99" y="140" width="82" height="32" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="99" y="140" width="82" height="18" fill="url(#tech-img)" rx="4" />
        <rect x="103" y="162" width="54" height="3.5" fill="#B0B8C8" rx="1" />
        <rect x="190" y="140" width="82" height="32" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        <rect x="190" y="140" width="82" height="18" fill="url(#tech-img)" rx="4" />
        <rect x="194" y="162" width="54" height="3.5" fill="#B0B8C8" rx="1" />
        {/* Footer */}
        <rect x="2" y="174" width="276" height="4" fill="#111111" rx="2" />
      </svg>
    ),
  },
  {
    id: 'news',
    name: 'News',
    description: 'Estilo portal de notícias com seções por categoria e sidebar de destaques',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="news-img" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DDE2EA" />
            <stop offset="100%" stopColor="#C8CDD7" />
          </linearGradient>
          <linearGradient id="news-img2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D5DAE3" />
            <stop offset="100%" stopColor="#C0C6D2" />
          </linearGradient>
        </defs>
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="#F8F9FB" rx="7" />
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* White topbar */}
        <rect x="2" y="18" width="276" height="14" fill="white" />
        <rect x="2" y="31" width="276" height="0.5" fill="#E2E5EA" />
        <rect x="12" y="22" width="36" height="7" fill="#003580" rx="2" opacity="0.9" />
        <rect x="210" y="21" width="56" height="9" fill="#F3F4F6" rx="3" stroke="#E2E5EA" strokeWidth="0.5" />
        {/* Blue navbar */}
        <rect x="2" y="32" width="276" height="12" fill="#003580" />
        <rect x="12" y="36" width="16" height="3.5" fill="white" rx="1" opacity="0.9" />
        <rect x="34" y="36" width="20" height="3.5" fill="white" rx="1" opacity="0.5" />
        <rect x="60" y="36" width="18" height="3.5" fill="white" rx="1" opacity="0.5" />
        <rect x="84" y="36" width="24" height="3.5" fill="white" rx="1" opacity="0.5" />
        <rect x="114" y="36" width="16" height="3.5" fill="white" rx="1" opacity="0.5" />
        <rect x="242" y="35" width="26" height="6" fill="#E8002D" rx="3" opacity="0.9" />
        {/* Content area + sidebar */}
        {/* Section 1 heading */}
        <rect x="8" y="50" width="4" height="7" fill="#003580" rx="2" />
        <rect x="16" y="52" width="40" height="4" fill="#1A1A2E" rx="1" opacity="0.75" />
        <rect x="122" y="51" width="24" height="5" fill="#EEF3FF" stroke="#B8CAED" strokeWidth="0.5" rx="2.5" />
        {/* Section 1 cards */}
        <rect x="8" y="62" width="52" height="38" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="3" />
        <rect x="8" y="62" width="52" height="22" fill="url(#news-img)" rx="3" />
        <rect x="10" y="87" width="40" height="3.5" fill="#B0B8C8" rx="1" />
        <rect x="10" y="93" width="30" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        <rect x="66" y="62" width="52" height="38" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="3" />
        <rect x="66" y="62" width="52" height="22" fill="url(#news-img2)" rx="3" />
        <rect x="68" y="87" width="40" height="3.5" fill="#B0B8C8" rx="1" />
        <rect x="68" y="93" width="30" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        <rect x="124" y="62" width="52" height="38" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="3" />
        <rect x="124" y="62" width="52" height="22" fill="url(#news-img)" rx="3" />
        <rect x="126" y="87" width="40" height="3.5" fill="#B0B8C8" rx="1" />
        <rect x="126" y="93" width="30" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        {/* Section 2 heading */}
        <rect x="8" y="106" width="4" height="7" fill="#E8002D" rx="2" />
        <rect x="16" y="108" width="34" height="4" fill="#1A1A2E" rx="1" opacity="0.75" />
        {/* Section 2 cards */}
        <rect x="8" y="118" width="52" height="34" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="3" />
        <rect x="8" y="118" width="52" height="18" fill="url(#news-img2)" rx="3" />
        <rect x="10" y="139" width="40" height="3.5" fill="#B0B8C8" rx="1" />
        <rect x="10" y="145" width="30" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        <rect x="66" y="118" width="52" height="34" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="3" />
        <rect x="66" y="118" width="52" height="18" fill="url(#news-img)" rx="3" />
        <rect x="68" y="139" width="40" height="3.5" fill="#B0B8C8" rx="1" />
        <rect x="68" y="145" width="30" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        <rect x="124" y="118" width="52" height="34" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="3" />
        <rect x="124" y="118" width="52" height="18" fill="url(#news-img2)" rx="3" />
        <rect x="126" y="139" width="40" height="3.5" fill="#B0B8C8" rx="1" />
        <rect x="126" y="145" width="30" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        {/* Right sidebar */}
        <rect x="184" y="48" width="88" height="106" fill="white" stroke="#E8EBF0" strokeWidth="0.5" rx="4" />
        {/* Sidebar header */}
        <rect x="184" y="48" width="88" height="14" fill="#003580" rx="4" />
        <rect x="190" y="52" width="4" height="5" fill="#E8002D" rx="1" />
        <rect x="198" y="53" width="32" height="3.5" fill="white" rx="1" opacity="0.9" />
        {/* Sidebar items */}
        <rect x="190" y="68" width="22" height="14" fill="url(#news-img)" rx="2" />
        <rect x="216" y="70" width="50" height="3.5" fill="#B0B8C8" rx="1" />
        <rect x="216" y="76" width="38" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        <rect x="190" y="68" width="2" height="14" fill="#003580" rx="1" />
        <rect x="190" y="88" width="22" height="14" fill="url(#news-img2)" rx="2" />
        <rect x="216" y="90" width="50" height="3.5" fill="#B0B8C8" rx="1" />
        <rect x="216" y="96" width="38" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        <rect x="190" y="88" width="2" height="14" fill="#003580" rx="1" />
        <rect x="190" y="108" width="22" height="14" fill="url(#news-img)" rx="2" />
        <rect x="216" y="110" width="50" height="3.5" fill="#B0B8C8" rx="1" />
        <rect x="216" y="116" width="38" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
        <rect x="190" y="108" width="2" height="14" fill="#003580" rx="1" />
        {/* Sidebar tag section */}
        <rect x="188" y="128" width="80" height="0.5" fill="#E8EBF0" />
        <rect x="190" y="132" width="30" height="3.5" fill="#B0B8C8" rx="1" opacity="0.7" />
        <rect x="190" y="139" width="24" height="8" fill="#EEF3FF" stroke="#B8CAED" strokeWidth="0.5" rx="4" />
        <rect x="218" y="139" width="18" height="8" fill="#FFF0F2" stroke="#F9B8C2" strokeWidth="0.5" rx="4" />
        <rect x="190" y="149" width="20" height="8" fill="#EEF3FF" stroke="#B8CAED" strokeWidth="0.5" rx="4" />
        <rect x="214" y="149" width="26" height="8" fill="#FFF0F2" stroke="#F9B8C2" strokeWidth="0.5" rx="4" />
        {/* Footer */}
        <rect x="2" y="156" width="276" height="6" fill="#003580" opacity="0.9" rx="3" />
        <rect x="2" y="162" width="276" height="16" fill="#F8F9FB" rx="3" />
        <rect x="90" y="166" width="100" height="3" fill="#CDD2DB" rx="1" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-clean, tipográfico, foco total no texto com muito whitespace',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="#FFFFFF" rx="7" />
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* Centered header */}
        <rect x="2" y="18" width="276" height="32" fill="#FFFFFF" />
        <rect x="2" y="49" width="276" height="0.5" fill="#E5E7EB" />
        {/* Blog name centered */}
        <rect x="90" y="26" width="100" height="9" fill="#111111" rx="2" opacity="0.85" />
        {/* Nav links centered */}
        <rect x="70" y="40" width="18" height="3" fill="#D1D5DB" rx="1" />
        <rect x="94" y="40" width="22" height="3" fill="#D1D5DB" rx="1" />
        <rect x="122" y="40" width="18" height="3" fill="#D1D5DB" rx="1" />
        <rect x="146" y="40" width="24" height="3" fill="#D1D5DB" rx="1" />
        <rect x="176" y="40" width="16" height="3" fill="#D1D5DB" rx="1" />
        {/* Large whitespace then centered article list */}
        {/* Article 1 — divider style */}
        <rect x="40" y="62" width="200" height="0.5" fill="#E5E7EB" />
        <rect x="40" y="68" width="60" height="3.5" fill="#9CA3AF" rx="1" />
        <rect x="40" y="75" width="190" height="6" fill="#111111" rx="1.5" opacity="0.85" />
        <rect x="40" y="84" width="170" height="3.5" fill="#6B7280" rx="1" opacity="0.6" />
        <rect x="40" y="91" width="140" height="3" fill="#D1D5DB" rx="1" opacity="0.6" />
        {/* Article 2 */}
        <rect x="40" y="104" width="200" height="0.5" fill="#E5E7EB" />
        <rect x="40" y="110" width="50" height="3.5" fill="#9CA3AF" rx="1" />
        <rect x="40" y="117" width="190" height="6" fill="#111111" rx="1.5" opacity="0.85" />
        <rect x="40" y="126" width="160" height="3.5" fill="#6B7280" rx="1" opacity="0.6" />
        <rect x="40" y="133" width="120" height="3" fill="#D1D5DB" rx="1" opacity="0.6" />
        {/* Article 3 */}
        <rect x="40" y="146" width="200" height="0.5" fill="#E5E7EB" />
        <rect x="40" y="152" width="55" height="3.5" fill="#9CA3AF" rx="1" />
        <rect x="40" y="159" width="185" height="6" fill="#111111" rx="1.5" opacity="0.85" />
        {/* Footer minimal */}
        <rect x="2" y="172" width="276" height="6" fill="#F9FAFB" />
        <rect x="100" y="174" width="80" height="2" fill="#E5E7EB" rx="1" />
      </svg>
    ),
  },
  {
    id: 'magazine',
    name: 'Magazine',
    description: 'Editorial de revista com tipografia serif grande e grid assimétrico',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mag-img" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D1D5DB" />
            <stop offset="100%" stopColor="#B8BDC6" />
          </linearGradient>
          <linearGradient id="mag-img2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8CDD7" />
            <stop offset="100%" stopColor="#ADB4C0" />
          </linearGradient>
        </defs>
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="#F8F5F0" rx="7" />
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* Top strip: date */}
        <rect x="2" y="18" width="276" height="8" fill="white" />
        <rect x="2" y="25" width="276" height="0.5" fill="#E5E7EB" />
        <rect x="12" y="21" width="80" height="2.5" fill="#9CA3AF" rx="1" />
        <rect x="218" y="20" width="48" height="5" fill="#F3F4F6" rx="2" stroke="#E5E7EB" strokeWidth="0.5" />
        {/* Masthead */}
        <rect x="2" y="26" width="276" height="16" fill="#FFFFFF" />
        <rect x="2" y="41" width="276" height="4" fill="#C8102E" />
        {/* Large italic blog name */}
        <rect x="50" y="29" width="180" height="10" fill="#1A1A1A" rx="2" opacity="0.9" />
        {/* Dark nav strip */}
        <rect x="2" y="45" width="276" height="12" fill="#1A1A1A" />
        <rect x="12" y="49" width="18" height="3.5" fill="white" rx="1" opacity="0.9" />
        <rect x="36" y="49" width="22" height="3.5" fill="white" rx="1" opacity="0.5" />
        <rect x="64" y="49" width="18" height="3.5" fill="white" rx="1" opacity="0.5" />
        <rect x="88" y="49" width="24" height="3.5" fill="white" rx="1" opacity="0.5" />
        {/* Asymmetric grid: large left + right column */}
        {/* Large feature */}
        <rect x="8" y="62" width="162" height="90" fill="url(#mag-img)" rx="3" />
        <rect x="8" y="118" width="162" height="34" fill="#1A1A1A" opacity="0.75" rx="3" />
        {/* Red category pill */}
        <rect x="16" y="114" width="32" height="7" fill="#C8102E" rx="3.5" />
        {/* Feature headline */}
        <rect x="14" y="124" width="148" height="6" fill="white" rx="1.5" opacity="0.95" />
        <rect x="14" y="133" width="110" height="4" fill="white" rx="1" opacity="0.6" />
        <rect x="14" y="140" width="80" height="3" fill="white" rx="1" opacity="0.35" />
        {/* Right stacked articles */}
        <rect x="176" y="62" width="96" height="40" fill="white" stroke="#E5E7EB" strokeWidth="0.5" rx="3" />
        <rect x="176" y="62" width="96" height="22" fill="url(#mag-img2)" rx="3" />
        <rect x="180" y="87" width="80" height="4" fill="#1A1A1A" rx="1" opacity="0.75" />
        <rect x="180" y="94" width="60" height="3" fill="#6B7280" rx="1" opacity="0.6" />
        <rect x="176" y="108" width="96" height="40" fill="white" stroke="#E5E7EB" strokeWidth="0.5" rx="3" />
        <rect x="176" y="108" width="96" height="22" fill="url(#mag-img)" rx="3" />
        <rect x="180" y="133" width="80" height="4" fill="#1A1A1A" rx="1" opacity="0.75" />
        <rect x="180" y="140" width="60" height="3" fill="#6B7280" rx="1" opacity="0.6" />
        <rect x="176" y="152" width="96" height="4" fill="url(#mag-img2)" rx="3" opacity="0.5" />
        {/* Footer */}
        <rect x="2" y="156" width="276" height="4" fill="#C8102E" />
        <rect x="2" y="160" width="276" height="18" fill="#1A1A1A" rx="3" />
        <rect x="90" y="166" width="100" height="3" fill="white" rx="1" opacity="0.2" />
      </svg>
    ),
  },
  {
    id: 'dark-aurora',
    name: 'Dark Aurora',
    description: 'Dark mode elegante com acentos roxo/ciano e gradientes aurora',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="aurora-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F1422" />
            <stop offset="100%" stopColor="#0B0F1A" />
          </linearGradient>
          <linearGradient id="aurora-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="aurora-hero" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E1040" />
            <stop offset="100%" stopColor="#0A2030" />
          </linearGradient>
          <linearGradient id="aurora-card" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A1E2E" />
            <stop offset="100%" stopColor="#141824" />
          </linearGradient>
        </defs>
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="url(#aurora-bg)" rx="7" />
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* Dark header */}
        <rect x="2" y="18" width="276" height="20" fill="#0B0F1A" />
        {/* Gradient border bottom of header */}
        <rect x="2" y="37" width="276" height="1.5" fill="url(#aurora-grad)" opacity="0.7" />
        {/* Blog name with gradient text suggestion */}
        <rect x="12" y="23" width="56" height="8" fill="url(#aurora-grad)" rx="2" opacity="0.9" />
        {/* Nav items */}
        <rect x="84" y="26" width="14" height="3.5" fill="white" rx="1" opacity="0.4" />
        <rect x="104" y="26" width="18" height="3.5" fill="white" rx="1" opacity="0.4" />
        <rect x="128" y="26" width="16" height="3.5" fill="white" rx="1" opacity="0.4" />
        <rect x="150" y="26" width="20" height="3.5" fill="white" rx="1" opacity="0.4" />
        <rect x="238" y="23" width="32" height="8" fill="#1A1E2E" rx="3" stroke="#8B5CF6" strokeWidth="0.5" />
        {/* Hero card with gradient overlay */}
        <rect x="8" y="45" width="168" height="80" fill="url(#aurora-hero)" rx="4" />
        {/* Aurora glow effect on hero */}
        <ellipse cx="92" cy="65" rx="60" ry="25" fill="#8B5CF6" opacity="0.12" />
        <ellipse cx="130" cy="80" rx="50" ry="20" fill="#22D3EE" opacity="0.08" />
        {/* Gradient accent line on hero */}
        <rect x="8" y="45" width="168" height="2" fill="url(#aurora-grad)" rx="2" opacity="0.8" />
        {/* Hero category pill */}
        <rect x="14" y="94" width="38" height="8" fill="#8B5CF6" rx="4" opacity="0.9" />
        {/* Hero headline */}
        <rect x="14" y="105" width="154" height="6" fill="white" rx="1.5" opacity="0.9" />
        <rect x="14" y="114" width="110" height="4" fill="white" rx="1" opacity="0.5" />
        <rect x="14" y="121" width="80" height="3" fill="white" rx="1" opacity="0.3" />
        {/* Side cards */}
        <rect x="182" y="45" width="90" height="37" fill="url(#aurora-card)" rx="4" stroke="#8B5CF6" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="182" y="45" width="90" height="2" fill="url(#aurora-grad)" rx="2" opacity="0.6" />
        <rect x="188" y="52" width="50" height="4" fill="white" rx="1" opacity="0.7" />
        <rect x="188" y="59" width="38" height="3" fill="white" rx="1" opacity="0.35" />
        <rect x="188" y="65" width="44" height="3" fill="white" rx="1" opacity="0.25" />
        <rect x="188" y="72" width="24" height="6" fill="#8B5CF6" rx="3" opacity="0.7" />
        <rect x="182" y="88" width="90" height="37" fill="url(#aurora-card)" rx="4" stroke="#22D3EE" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="182" y="88" width="90" height="2" fill="url(#aurora-grad)" rx="2" opacity="0.6" />
        <rect x="188" y="95" width="50" height="4" fill="white" rx="1" opacity="0.7" />
        <rect x="188" y="102" width="38" height="3" fill="white" rx="1" opacity="0.35" />
        <rect x="188" y="108" width="44" height="3" fill="white" rx="1" opacity="0.25" />
        <rect x="188" y="115" width="24" height="6" fill="#22D3EE" rx="3" opacity="0.7" />
        {/* Section heading */}
        <rect x="8" y="132" width="60" height="4" fill="url(#aurora-grad)" rx="1" opacity="0.8" />
        {/* 3-col cards */}
        <rect x="8" y="142" width="82" height="28" fill="url(#aurora-card)" rx="4" stroke="#8B5CF6" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="12" y="148" width="54" height="3.5" fill="white" rx="1" opacity="0.5" />
        <rect x="12" y="155" width="40" height="3" fill="white" rx="1" opacity="0.25" />
        <rect x="99" y="142" width="82" height="28" fill="url(#aurora-card)" rx="4" stroke="#8B5CF6" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="103" y="148" width="54" height="3.5" fill="white" rx="1" opacity="0.5" />
        <rect x="103" y="155" width="40" height="3" fill="white" rx="1" opacity="0.25" />
        <rect x="190" y="142" width="82" height="28" fill="url(#aurora-card)" rx="4" stroke="#22D3EE" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="194" y="148" width="54" height="3.5" fill="white" rx="1" opacity="0.5" />
        <rect x="194" y="155" width="40" height="3" fill="white" rx="1" opacity="0.25" />
        {/* Footer */}
        <rect x="2" y="174" width="276" height="1.5" fill="url(#aurora-grad)" rx="1" opacity="0.6" />
        <rect x="2" y="170" width="276" height="4" fill="#0B0F1A" />
      </svg>
    ),
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Jornal/revista clássico, serifado, colunas e tons sóbrios broadsheet',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ed-img" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D1D5DB" />
            <stop offset="100%" stopColor="#B8BDC6" />
          </linearGradient>
        </defs>
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="#F5F3EE" rx="7" />
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* Masthead — large serif title centered */}
        <rect x="2" y="18" width="276" height="28" fill="white" />
        <rect x="2" y="45" width="276" height="0.5" fill="#111111" />
        <rect x="60" y="24" width="160" height="10" fill="#111111" rx="1" opacity="0.85" />
        {/* Nav bar below masthead */}
        <rect x="2" y="46" width="276" height="10" fill="white" />
        <rect x="2" y="56" width="276" height="0.5" fill="#D1D5DB" />
        <rect x="12" y="49" width="18" height="4" fill="#111111" rx="1" opacity="0.9" />
        <rect x="36" y="49" width="22" height="4" fill="#9CA3AF" rx="1" />
        <rect x="64" y="49" width="18" height="4" fill="#9CA3AF" rx="1" />
        <rect x="88" y="49" width="24" height="4" fill="#9CA3AF" rx="1" />
        <rect x="118" y="49" width="18" height="4" fill="#9CA3AF" rx="1" />
        <rect x="222" y="47" width="50" height="8" fill="#F3F4F6" rx="2" stroke="#E5E7EB" strokeWidth="0.5" />
        {/* 3-col editorial grid */}
        {/* Col 1 — wide */}
        <rect x="8" y="62" width="128" height="78" fill="white" stroke="#E5E7EB" strokeWidth="0.5" />
        <rect x="8" y="62" width="128" height="44" fill="url(#ed-img)" />
        <rect x="12" y="110" width="80" height="5" fill="#111111" rx="1" opacity="0.85" />
        <rect x="12" y="118" width="116" height="3" fill="#6B7280" rx="1" opacity="0.6" />
        <rect x="12" y="124" width="100" height="3" fill="#9CA3AF" rx="1" opacity="0.5" />
        <rect x="12" y="130" width="112" height="3" fill="#9CA3AF" rx="1" opacity="0.4" />
        {/* Col 2 */}
        <rect x="142" y="62" width="60" height="36" fill="url(#ed-img)" />
        <rect x="142" y="102" width="58" height="5" fill="#111111" rx="1" opacity="0.8" />
        <rect x="142" y="110" width="56" height="3" fill="#9CA3AF" rx="1" opacity="0.5" />
        <rect x="142" y="116" width="50" height="3" fill="#9CA3AF" rx="1" opacity="0.4" />
        <rect x="142" y="130" width="60" height="0.5" fill="#D1D5DB" />
        <rect x="142" y="134" width="56" height="5" fill="#111111" rx="1" opacity="0.8" />
        <rect x="142" y="142" width="52" height="3" fill="#9CA3AF" rx="1" opacity="0.4" />
        {/* Col 3 */}
        <rect x="208" y="62" width="64" height="36" fill="url(#ed-img)" />
        <rect x="208" y="102" width="62" height="5" fill="#111111" rx="1" opacity="0.8" />
        <rect x="208" y="110" width="58" height="3" fill="#9CA3AF" rx="1" opacity="0.5" />
        <rect x="208" y="116" width="52" height="3" fill="#9CA3AF" rx="1" opacity="0.4" />
        <rect x="208" y="130" width="64" height="0.5" fill="#D1D5DB" />
        <rect x="208" y="134" width="60" height="5" fill="#111111" rx="1" opacity="0.8" />
        <rect x="208" y="142" width="54" height="3" fill="#9CA3AF" rx="1" opacity="0.4" />
        {/* Footer dark */}
        <rect x="2" y="152" width="276" height="26" fill="#111111" rx="3" />
        <rect x="90" y="162" width="100" height="3" fill="white" rx="1" opacity="0.2" />
      </svg>
    ),
  },
  {
    id: 'saas',
    name: 'Startup / SaaS',
    description: 'Header limpo com gradiente, cantos arredondados, vibe de landing page',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="saas-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1A4FA0" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="saas-img" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DBEAFE" />
            <stop offset="100%" stopColor="#BFDBFE" />
          </linearGradient>
          <linearGradient id="saas-hero" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#EFF6FF" />
            <stop offset="100%" stopColor="#DBEAFE" />
          </linearGradient>
        </defs>
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="#F8FAFC" rx="7" />
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* White header with subtle shadow */}
        <rect x="2" y="18" width="276" height="20" fill="white" />
        <rect x="2" y="37" width="276" height="1" fill="#F1F5F9" />
        {/* Gradient logo */}
        <rect x="12" y="23" width="50" height="8" fill="url(#saas-grad)" rx="4" opacity="0.9" />
        {/* Nav links */}
        <rect x="80" y="25" width="16" height="4" fill="#94A3B8" rx="2" />
        <rect x="102" y="25" width="20" height="4" fill="#94A3B8" rx="2" />
        <rect x="128" y="25" width="16" height="4" fill="#94A3B8" rx="2" />
        <rect x="150" y="25" width="18" height="4" fill="#94A3B8" rx="2" />
        {/* Active nav pill */}
        <rect x="72" y="22" width="32" height="10" fill="#EFF6FF" rx="5" />
        <rect x="78" y="25" width="20" height="4" fill="#1A4FA0" rx="2" />
        {/* Search */}
        <rect x="232" y="22" width="38" height="10" fill="#F1F5F9" rx="5" stroke="#E2E8F0" strokeWidth="0.5" />
        {/* Hero gradient banner */}
        <rect x="8" y="43" width="264" height="44" fill="url(#saas-hero)" rx="8" />
        <rect x="20" y="55" width="120" height="7" fill="url(#saas-grad)" rx="3" opacity="0.8" />
        <rect x="20" y="65" width="90" height="4" fill="#64748B" rx="2" opacity="0.6" />
        <rect x="168" y="50" width="38" height="14" fill="url(#saas-grad)" rx="7" opacity="0.9" />
        {/* 3-col cards with rounded corners */}
        <rect x="8" y="93" width="82" height="42" fill="white" stroke="#E2E8F0" strokeWidth="0.5" rx="8" />
        <rect x="8" y="93" width="82" height="22" fill="url(#saas-img)" rx="8" />
        <rect x="12" y="119" width="60" height="4" fill="#94A3B8" rx="2" />
        <rect x="12" y="126" width="44" height="3" fill="#CBD5E1" rx="1.5" opacity="0.6" />
        <rect x="99" y="93" width="82" height="42" fill="white" stroke="#E2E8F0" strokeWidth="0.5" rx="8" />
        <rect x="99" y="93" width="82" height="22" fill="url(#saas-img)" rx="8" />
        <rect x="103" y="119" width="60" height="4" fill="#94A3B8" rx="2" />
        <rect x="103" y="126" width="44" height="3" fill="#CBD5E1" rx="1.5" opacity="0.6" />
        <rect x="190" y="93" width="82" height="42" fill="white" stroke="#E2E8F0" strokeWidth="0.5" rx="8" />
        <rect x="190" y="93" width="82" height="22" fill="url(#saas-img)" rx="8" />
        <rect x="194" y="119" width="60" height="4" fill="#94A3B8" rx="2" />
        <rect x="194" y="126" width="44" height="3" fill="#CBD5E1" rx="1.5" opacity="0.6" />
        {/* Second row */}
        <rect x="8" y="141" width="82" height="28" fill="white" stroke="#E2E8F0" strokeWidth="0.5" rx="8" />
        <rect x="12" y="148" width="54" height="4" fill="#94A3B8" rx="2" />
        <rect x="12" y="155" width="40" height="3" fill="#CBD5E1" rx="1.5" opacity="0.5" />
        <rect x="99" y="141" width="82" height="28" fill="white" stroke="#E2E8F0" strokeWidth="0.5" rx="8" />
        <rect x="103" y="148" width="54" height="4" fill="#94A3B8" rx="2" />
        <rect x="103" y="155" width="40" height="3" fill="#CBD5E1" rx="1.5" opacity="0.5" />
        <rect x="190" y="141" width="82" height="28" fill="white" stroke="#E2E8F0" strokeWidth="0.5" rx="8" />
        <rect x="194" y="148" width="54" height="4" fill="#94A3B8" rx="2" />
        <rect x="194" y="155" width="40" height="3" fill="#CBD5E1" rx="1.5" opacity="0.5" />
        {/* Footer */}
        <rect x="2" y="172" width="276" height="6" fill="#F8FAFC" rx="3" />
        <rect x="90" y="174" width="100" height="2" fill="#E2E8F0" rx="1" />
      </svg>
    ),
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    description: 'Revista de moda/lifestyle, tipografia grande, elegante e muito whitespace',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ls-img" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E7E0D8" />
            <stop offset="100%" stopColor="#D4C8BB" />
          </linearGradient>
          <linearGradient id="ls-img2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DDD6CE" />
            <stop offset="100%" stopColor="#C9C0B6" />
          </linearGradient>
        </defs>
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="#FAFAF8" rx="7" />
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* Lifestyle header: large centered serif name */}
        <rect x="2" y="18" width="276" height="30" fill="#FAFAF8" />
        <rect x="2" y="47" width="276" height="0.5" fill="#E5E0D9" />
        {/* Italic serif blog name centered */}
        <rect x="70" y="25" width="140" height="14" fill="#1A1A1A" rx="2" opacity="0.82" />
        {/* Thin nav bar */}
        <rect x="2" y="48" width="276" height="12" fill="white" />
        <rect x="2" y="60" width="276" height="0.5" fill="#E5E0D9" />
        <rect x="56" y="52" width="18" height="3.5" fill="#1A1A1A" rx="1" opacity="0.8" />
        <rect x="80" y="52" width="22" height="3.5" fill="#9CA3AF" rx="1" />
        <rect x="108" y="52" width="20" height="3.5" fill="#9CA3AF" rx="1" />
        <rect x="134" y="52" width="24" height="3.5" fill="#9CA3AF" rx="1" />
        <rect x="210" y="50" width="50" height="8" fill="#F5F3F0" rx="2" stroke="#E5E0D9" strokeWidth="0.5" />
        {/* Hero large image */}
        <rect x="8" y="66" width="264" height="54" fill="url(#ls-img)" rx="2" />
        {/* Hero text overlay */}
        <rect x="8" y="96" width="264" height="24" fill="#1A1A1A" opacity="0.35" rx="2" />
        <rect x="20" y="99" width="34" height="7" fill="#F8B400" rx="3.5" opacity="0.9" />
        <rect x="20" y="109" width="160" height="6" fill="white" rx="1.5" opacity="0.9" />
        {/* 2-col grid below */}
        <rect x="8" y="126" width="128" height="40" fill="white" stroke="#E5E0D9" strokeWidth="0.5" rx="2" />
        <rect x="8" y="126" width="128" height="22" fill="url(#ls-img2)" rx="2" />
        <rect x="14" y="152" width="80" height="5" fill="#1A1A1A" rx="1" opacity="0.75" />
        <rect x="14" y="160" width="60" height="3" fill="#9CA3AF" rx="1" opacity="0.5" />
        <rect x="144" y="126" width="128" height="40" fill="white" stroke="#E5E0D9" strokeWidth="0.5" rx="2" />
        <rect x="144" y="126" width="128" height="22" fill="url(#ls-img)" rx="2" />
        <rect x="150" y="152" width="80" height="5" fill="#1A1A1A" rx="1" opacity="0.75" />
        <rect x="150" y="160" width="60" height="3" fill="#9CA3AF" rx="1" opacity="0.5" />
        {/* Footer */}
        <rect x="2" y="170" width="276" height="8" fill="#F5F3F0" rx="3" />
        <rect x="90" y="173" width="100" height="2" fill="#D4C8BB" rx="1" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'brutalist',
    name: 'Brutalista',
    description: 'Bordas grossas, alto contraste preto/branco, font-mono, estilo criativo',
    preview: (
      <svg viewBox="0 0 280 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="brut-img" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D1D5DB" />
            <stop offset="100%" stopColor="#9CA3AF" />
          </linearGradient>
        </defs>
        {/* Browser chrome */}
        <rect x="0" y="0" width="280" height="180" fill="#E4E7EC" rx="8" />
        <rect x="2" y="2" width="276" height="176" fill="#FFFFFF" rx="7" />
        <rect x="2" y="2" width="276" height="16" fill="#ECEEF2" rx="7" />
        <circle cx="11" cy="10" r="3" fill="#FC5F57" />
        <circle cx="20" cy="10" r="3" fill="#FEBC2E" />
        <circle cx="29" cy="10" r="3" fill="#28C840" />
        <rect x="60" y="6" width="130" height="8" fill="white" rx="3" opacity="0.8" />
        {/* Header: black with thick bottom border */}
        <rect x="2" y="18" width="276" height="20" fill="#000000" />
        <rect x="2" y="38" width="276" height="3" fill="#F58A2D" />
        {/* Mono blog name */}
        <rect x="12" y="23" width="48" height="8" fill="white" rx="1" opacity="0.95" />
        {/* Nav links mono */}
        <rect x="72" y="25" width="22" height="4" fill="white" rx="1" opacity="0.75" />
        <rect x="100" y="25" width="18" height="4" fill="white" rx="1" opacity="0.45" />
        <rect x="124" y="25" width="24" height="4" fill="white" rx="1" opacity="0.45" />
        <rect x="152" y="25" width="20" height="4" fill="white" rx="1" opacity="0.45" />
        {/* Search with border */}
        <rect x="230" y="22" width="40" height="10" fill="none" stroke="white" strokeWidth="1.5" />
        {/* Hero: big bordered box */}
        <rect x="8" y="46" width="264" height="52" fill="#000000" />
        <rect x="8" y="46" width="264" height="52" fill="none" stroke="#F58A2D" strokeWidth="2" />
        <rect x="16" y="62" width="100" height="10" fill="white" rx="1" opacity="0.9" />
        <rect x="16" y="75" width="140" height="6" fill="white" rx="1" opacity="0.5" />
        <rect x="180" y="56" width="44" height="18" fill="#F58A2D" />
        <rect x="188" y="62" width="28" height="6" fill="#000000" rx="1" opacity="0.8" />
        {/* 3-col cards with thick borders */}
        <rect x="8" y="104" width="82" height="42" fill="white" stroke="#000000" strokeWidth="2" />
        <rect x="8" y="104" width="82" height="22" fill="url(#brut-img)" />
        <rect x="12" y="130" width="60" height="5" fill="#000000" rx="1" opacity="0.85" />
        <rect x="12" y="138" width="44" height="3.5" fill="#6B7280" rx="1" opacity="0.6" />
        <rect x="99" y="104" width="82" height="42" fill="white" stroke="#000000" strokeWidth="2" />
        <rect x="99" y="104" width="82" height="22" fill="url(#brut-img)" />
        <rect x="103" y="130" width="60" height="5" fill="#000000" rx="1" opacity="0.85" />
        <rect x="103" y="138" width="44" height="3.5" fill="#6B7280" rx="1" opacity="0.6" />
        <rect x="190" y="104" width="82" height="42" fill="white" stroke="#000000" strokeWidth="2" />
        <rect x="190" y="104" width="82" height="22" fill="url(#brut-img)" />
        <rect x="194" y="130" width="60" height="5" fill="#000000" rx="1" opacity="0.85" />
        <rect x="194" y="138" width="44" height="3.5" fill="#6B7280" rx="1" opacity="0.6" />
        {/* Footer: black with orange top border */}
        <rect x="2" y="152" width="276" height="3" fill="#F58A2D" />
        <rect x="2" y="155" width="276" height="23" fill="#000000" rx="3" />
        <rect x="90" y="163" width="100" height="3" fill="white" rx="1" opacity="0.2" />
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
  minimal: { primary: '#111111', secondary: '#6B7280', background: '#FFFFFF', surface: '#FFFFFF' },
  magazine: { primary: '#1A1A1A', secondary: '#C8102E', background: '#F8F5F0', surface: '#FFFFFF' },
  'dark-aurora': { primary: '#8B5CF6', secondary: '#22D3EE', background: '#0B0F1A', surface: '#141824' },
  editorial: { primary: '#1A1A1A', secondary: '#B91C1C', background: '#F5F3EE', surface: '#FFFFFF' },
  saas: { primary: '#1A4FA0', secondary: '#3B82F6', background: '#F8FAFC', surface: '#FFFFFF' },
  lifestyle: { primary: '#1A1A1A', secondary: '#F8B400', background: '#FAFAF8', surface: '#FFFFFF' },
  brutalist: { primary: '#000000', secondary: '#F58A2D', background: '#FFFFFF', surface: '#FFFFFF' },
}

type SectionId = 'template' | 'logo' | 'import' | 'colors' | 'typography' | 'font-sizes' | 'radius' | 'semantic-colors'

const SIDEBAR_ITEMS: { id: SectionId; label: string; icon: ReactNode }[] = [
  {
    id: 'template',
    label: 'Template',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
  {
    id: 'logo',
    label: 'Logotipo',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
      </svg>
    ),
  },
  {
    id: 'import',
    label: 'Importar design',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    id: 'colors',
    label: 'Cores',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="10.5" r="2.5" />
        <circle cx="8.5" cy="7.5" r="2.5" />
        <circle cx="6.5" cy="12.5" r="2.5" />
        <path d="M12 22a7 7 0 0 0 7-7c0-2.5-2-3.5-4-4.5-2-1-4-2-4-4.5" />
        <path d="M12 22c-2.5 0-7-1.5-7-7 0-2.5 2-3.5 4-4.5" />
      </svg>
    ),
  },
  {
    id: 'typography',
    label: 'Tipografia',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    id: 'font-sizes',
    label: 'Tamanhos de fonte',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h4" />
        <path d="M6 4v16" />
        <path d="M14 12h6" />
        <path d="M17 4v16" />
        <path d="M4 4h8" />
        <path d="M14 12v8" />
      </svg>
    ),
  },
  {
    id: 'radius',
    label: 'Arredondamento',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13V9a6 6 0 0 1 6-6h4" />
        <path d="M21 11v4a6 6 0 0 1-6 6H9" />
        <path d="M3 13v2a6 6 0 0 0 6 6h2" />
        <path d="M21 11V9a6 6 0 0 0-6-6h-2" />
      </svg>
    ),
  },
  {
    id: 'semantic-colors',
    label: 'Cores semânticas',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
]

export function ApparenceClient({ initial }: Props) {
  const [template, setTemplate] = useState(initial.template)
  const [colors, setColors] = useState<ThemeColors>(initial.colors)
  const [logoUrl, setLogoUrl] = useState(initial.company.logo_url)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [designSystem, setDesignSystem] = useState<DesignSystem>(initial.design_system)
  const [activeSection, setActiveSection] = useState<SectionId>('template')

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

  function renderContent() {
    switch (activeSection) {
      case 'template':
        return (
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Template</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TEMPLATE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleTemplateChange(opt.id)}
                  className={`relative text-left rounded-xl border-2 p-3 transition-all ${
                    template === opt.id
                      ? 'border-brand-primary bg-brand-primary-light'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {template === opt.id && (
                    <span className="absolute top-2 right-2 bg-brand-primary text-white text-xs px-2 py-0.5 rounded-full">
                      Ativo
                    </span>
                  )}
                  <div className="mb-2 rounded overflow-hidden border border-gray-100 max-h-24">
                    {opt.preview}
                  </div>
                  <p className="font-semibold text-neutral-900">{opt.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </section>
        )

      case 'logo':
        return (
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Logotipo</h2>
            <p className="text-sm text-gray-500 mb-4">Aparece no canto esquerdo do header. Sem logo, o nome do blog é exibido no lugar.</p>
            <div className="max-w-sm">
              <ImageUpload value={logoUrl} onChange={setLogoUrl} variant="logo" />
            </div>
          </section>
        )

      case 'import':
        return (
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Importar design do site</h2>
            <DesignSystemImporter
              onApply={handleImportApply}
              onColorsApply={(themeColors) => setColors((prev) => ({ ...prev, ...themeColors }))}
              onLogoApply={setLogoUrl}
            />
          </section>
        )

      case 'colors':
        return (
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
        )

      case 'typography':
        return (
          <section>
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
        )

      case 'font-sizes':
        return (
          <section>
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
        )

      case 'radius':
        return (
          <section>
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
        )

      case 'semantic-colors':
        return (
          <section>
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
        )
    }
  }

  usePageTitle('Aparência')

  return (
    <div>
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

      <div className="flex gap-6">
        <nav className="w-56 shrink-0">
          <ul className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {SIDEBAR_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-colors ${
                    activeSection === item.id
                      ? 'bg-brand-primary text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>

      <AdminFormActions>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </AdminFormActions>
    </div>
  )
}
