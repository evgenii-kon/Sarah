import { useState } from 'react'
import Header from './components/Header.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import CallPanel from './components/CallPanel.jsx'
import { CHARACTERS } from './characters.js'

let nextId = 100

const INITIAL_MESSAGES = [
  { id: 1, role: 'system', text: 'Session started · Jake is ready to chat' },
  {
    id: 2,
    role: 'ai',
    sender: CHARACTERS.jake.name,
    text: "Hey! I'm Jake. Let's practice your English — just talk to me like you would to a friend. What's on your mind today? 😊",
  },
  {
    id: 3,
    role: 'user',
    text: 'I study English from three months and it is difficulter than I expected.',
    errors: [
      { original: 'study', correction: 'have been studying', explanation: "use 'have been studying'" },
      { original: 'from', correction: 'for', explanation: "use 'for' not 'from'" },
      { original: 'difficulter', correction: 'harder', explanation: "use 'harder'" },
    ],
    correctedMessage: 'I have been studying English for three months and it is harder than I expected.',
  },
  {
    id: 4,
    role: 'ai',
    sender: CHARACTERS.jake.name,
    text: "That's totally understandable! Three months is great progress though. What feels hardest — speaking or writing?",
  },
]

export default function App() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [activeChar, setActiveChar] = useState('jake')

  function handleExchangeComplete({ character, userText, errors, correctedMessage, reply }) {
    setMessages((prev) => [
      ...prev,
      { id: nextId++, role: 'user', text: userText, errors, correctedMessage },
      { id: nextId++, role: 'ai', sender: CHARACTERS[character].name, text: reply },
    ])
  }

  function handleExchangeError({ userText }) {
    setMessages((prev) => [
      ...prev,
      { id: nextId++, role: 'user', text: userText, errors: [], correctedMessage: userText },
      { id: nextId++, role: 'system', text: 'Failed to reach the server. Please try again.' },
    ])
  }

  return (
    <div className="app">
      <Header activeChar={activeChar} onSwitchChar={setActiveChar} />
      <div className="layout">
        <ChatPanel
          messages={messages}
          activeChar={activeChar}
          onExchangeComplete={handleExchangeComplete}
          onExchangeError={handleExchangeError}
        />
        <CallPanel activeChar={activeChar} />
      </div>
    </div>
  )
}
