import { getSettings, getLgpdSettings, getChatAssistantConfig, type FacebookPixelConfig } from '@/lib/settings'
import { getSeoSettings } from '@/lib/seo'
import { getDefaultModels, getAIApiKey, getAIModelFromDB } from '@/lib/ai'
import { getTelegramConfig } from '@/lib/telegram'
import { getFirecrawlApiKey } from '@/lib/firecrawl'
import { getPexelsApiKey } from '@/lib/pexels'
import { getResendApiKey, getNewsletterFromEmail, getNewsletterAutoSend } from '@/lib/email'
import { getAdSenseConfig } from '@/lib/db-queries'
import { ConfiguracoesClient } from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const settings = await getSettings()
  const aiApiKey = (await getAIApiKey()) ?? ''

  const defaults = getDefaultModels()
  const aiModels: Record<string, string> = {}
  for (const feature of Object.keys(defaults)) {
    aiModels[feature] = await getAIModelFromDB(feature)
  }

  const telegramConfig = await getTelegramConfig()
  const firecrawlApiKey = (await getFirecrawlApiKey()) ?? ''
  const pexelsApiKey = (await getPexelsApiKey()) ?? ''
  const lgpdSettings = await getLgpdSettings()
  const resendApiKey = (await getResendApiKey()) ?? ''
  const resendFromEmail = await getNewsletterFromEmail()
  const resendAutoSend = await getNewsletterAutoSend()
  const chatAssistantConfig = await getChatAssistantConfig()
  const adSenseConfig = await getAdSenseConfig()

  // Facebook Pixel config — lida diretamente de getSettings()
  const facebookPixelConfig: FacebookPixelConfig = settings.facebook_pixel

  const seoSettings = await getSeoSettings()

  return (
    <ConfiguracoesClient
      initial={settings.company}
      initialAI={{ api_key: aiApiKey, models: aiModels }}
      initialTelegram={{
        bot_token: telegramConfig?.bot_token ?? '',
        allowed_chat_ids: telegramConfig?.allowed_chat_ids ?? '',
      }}
      initialFirecrawl={{ api_key: firecrawlApiKey }}
      initialPexels={{ api_key: pexelsApiKey }}
      initialLgpd={lgpdSettings}
      initialResend={{ api_key: resendApiKey, from_email: resendFromEmail, auto_send: resendAutoSend }}
      initialChatAssistant={chatAssistantConfig}
      initialAdSense={adSenseConfig}
      initialFacebookPixel={facebookPixelConfig}
      initialSeo={seoSettings}
    />
  )
}
