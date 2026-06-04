'use client'

import { useFacebookViewContent } from '@/components/blog/FacebookPixel'
import type { FacebookPixelConfig } from '@/lib/settings'

interface Props {
  config: FacebookPixelConfig
  contentName: string
  contentCategory?: string
}

export function PostViewTracker({ config, contentName, contentCategory }: Props) {
  useFacebookViewContent(config, { contentName, contentCategory })
  return null
}
