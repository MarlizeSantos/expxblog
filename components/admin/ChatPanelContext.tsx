'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface ChatPanelContextValue {
  isOpen: boolean
  open(): void
  close(): void
  toggle(): void
}

const ChatPanelContext = createContext<ChatPanelContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
})

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <ChatPanelContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((prev) => !prev),
      }}
    >
      {children}
    </ChatPanelContext.Provider>
  )
}

export function useChatPanel() {
  return useContext(ChatPanelContext)
}
