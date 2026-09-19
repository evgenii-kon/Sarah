import { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import CallPanel from './components/CallPanel.jsx'
import { CHARACTERS } from './characters.js'
import { API_URL } from './api.js'

let nextId = 100

const GREETING_PROMPT =
  'Hello! Please introduce yourself briefly and invite me to practice English.'

export default function App() {
  const [messages, setMessages] = useState([])
  const [activeChar, setActiveChar] = useState('jake')
  const [greeting, setGreeting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setMessages([])
    setGreeting(true)

    fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: GREETING_PROMPT, character: activeChar, history: [] }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setMessages([
          { id: nextId++, role: 'ai', sender: CHARACTERS[activeChar].name, text: data.reply ?? '' },
        ])
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setMessages([
          { id: nextId++, role: 'system', text: 'Failed to reach the server. Please try again.' },
        ])
      })
      .finally(() => {
        if (!controller.signal.aborted) setGreeting(false)
      })

    return () => controller.abort()
  }, [activeChar])

  function handleUserMessage(text) {
    const id = nextId++
    setMessages((prev) => [...prev, { id, role: 'user', text, errors: [] }])
    return id
  }

  function handleExchangeComplete({ character, messageId, errors, correctedMessage, reply }) {
    setMessages((prev) => {
      if (!prev.some((m) => m.id === messageId)) return prev
      return [
        ...prev.map((m) => (m.id === messageId ? { ...m, errors, correctedMessage } : m)),
        { id: nextId++, role: 'ai', sender: CHARACTERS[character].name, text: reply },
      ]
    })
  }

  function handleExchangeError({ messageId }) {
    setMessages((prev) => {
      if (!prev.some((m) => m.id === messageId)) return prev
      return [
        ...prev,
        { id: nextId++, role: 'system', text: 'Failed to reach the server. Please try again.' },
      ]
    })
  }

  function handleSystemMessage(text) {
    setMessages((prev) => [...prev, { id: nextId++, role: 'system', text }])
  }

  return (
    <div className="app">
      <Header activeChar={activeChar} onSwitchChar={setActiveChar} />
      <div className="layout">
        <ChatPanel
          key={activeChar}
          messages={messages}
          activeChar={activeChar}
          loading={greeting}
          onUserMessage={handleUserMessage}
          onExchangeComplete={handleExchangeComplete}
          onExchangeError={handleExchangeError}
          onSystemMessage={handleSystemMessage}
        />
        <CallPanel activeChar={activeChar} />
      </div>
    </div>
  )
}
