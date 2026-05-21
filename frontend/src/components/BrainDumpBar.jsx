import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function BrainDumpBar() {
  const [input, setInput] = useState('')
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('brainDumpItems') || '[]')
    } catch { return [] }
  })
  const [successFlash, setSuccessFlash] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return

    const newItem = {
      id: `dump_${Date.now()}`,
      text,
      created_at: new Date().toISOString(),
    }
    const newItems = [...items, newItem]
    setItems(newItems)
    localStorage.setItem('brainDumpItems', JSON.stringify(newItems))
    setInput('')

    // Flash animation
    setSuccessFlash(true)
    setTimeout(() => setSuccessFlash(false), 800)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="fixed bottom-0 left-0 right-0 z-20 pb-4 px-4"
      style={{
        background: 'linear-gradient(to top, rgba(239,241,245,1) 60%, rgba(239,241,245,0))',
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Count badge */}
        <AnimatePresence>
          {items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center mb-2"
            >
              <span className="text-xs px-3 py-1 rounded-full inline-block"
                style={{
                  background: 'rgba(109,184,196,0.1)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid rgba(109,184,196,0.2)',
                }}>
                已收纳 {items.length} 条杂念，可在复盘时统一整理
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <motion.div
          animate={successFlash ? {
            boxShadow: ['0 0 0 0 rgba(109,184,196,0)', '0 0 0 12px rgba(109,184,196,0.2)', '0 0 0 0 rgba(109,184,196,0)'],
          } : {}}
          transition={{ duration: 0.7 }}
          className="glass-card flex items-center gap-3 px-5 py-3.5"
          style={{
            boxShadow: focused
              ? '0 0 0 2px rgba(109,184,196,0.3), var(--shadow-float)'
              : 'var(--shadow-float)',
            transition: 'box-shadow 0.3s ease',
          }}
        >
          <span className="text-base flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>🧠</span>

          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="+ 随手记：把脑子里的碎片先丢进来"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />

          <AnimatePresence>
            {input && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleSubmit}
                className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #6db8c4, #7a9bb5)',
                  color: 'white',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Success ripple */}
          <AnimatePresence>
            {successFlash && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(109,184,196,0.2) 0%, transparent 70%)',
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  )
}
