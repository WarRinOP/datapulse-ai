'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'

interface QAMessage {
  role: 'user' | 'assistant'
  content: string
}

interface QAPanelProps {
  analysisId: string
  initialMessages?: QAMessage[]
}

const SAMPLE_QUESTIONS = [
  'Which month had highest revenue?',
  'What\'s driving the biggest variance?',
  'Which category is most profitable?',
]

export function QAPanel({ analysisId, initialMessages = [] }: QAPanelProps) {
  const [messages, setMessages] = useState<QAMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (question: string) => {
    if (!question.trim() || loading) return
    const q = question.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)

    try {
      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          question: q,
          messageHistory: messages.slice(-10),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }])
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to get answer', 'error')
      // Remove the user message we optimistically added
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Header */}
      <h2 style={{
        fontSize: '13px', fontWeight: '600', color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        margin: '0 0 16px',
      }}>Ask About Your Data</h2>

      {/* Sample questions — shown when empty */}
      {messages.length === 0 && !loading && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {SAMPLE_QUESTIONS.map((q) => (
            <button key={q} onClick={() => send(q)} style={{
              background: '#171923', border: '1px solid #2d3548',
              borderRadius: '20px', padding: '6px 14px',
              fontSize: '12px', color: '#94a3b8', cursor: 'pointer',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.color = '#818cf8' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2d3548'; e.currentTarget.style.color = '#94a3b8' }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {(messages.length > 0 || loading) && (
        <div style={{
          maxHeight: '400px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '12px',
          marginBottom: '16px', paddingRight: '4px',
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: msg.role === 'user' ? '#818cf8' : '#171923',
                border: msg.role === 'user' ? 'none' : '1px solid #1f2433',
                color: msg.role === 'user' ? '#0f1117' : '#94a3b8',
                fontSize: '14px', lineHeight: '1.6',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '12px 16px',
                background: '#171923', border: '1px solid #1f2433',
                borderRadius: '12px 12px 12px 4px',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          ref={inputRef}
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question about your data..."
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="btn btn-primary btn-md"
          style={{ flexShrink: 0 }}
        >
          {loading ? <span className="spinner spinner-sm" /> : 'Send'}
        </button>
      </div>
    </div>
  )
}
