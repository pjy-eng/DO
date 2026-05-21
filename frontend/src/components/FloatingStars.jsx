import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function FloatingStars({ flyingStars, nebulaEntryRef }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-40" aria-hidden="true">
      <AnimatePresence>
        {flyingStars.map(star => {
          // Calculate start position (center of task card)
          const startX = star.fromRect
            ? star.fromRect.left + star.fromRect.width / 2
            : window.innerWidth / 2
          const startY = star.fromRect
            ? star.fromRect.top + star.fromRect.height / 2
            : window.innerHeight / 2

          // Calculate end position (nebula button - top right)
          let endX = window.innerWidth - 120
          let endY = 32
          if (nebulaEntryRef) {
            try {
              const rect = nebulaEntryRef.getBoundingClientRect
                ? nebulaEntryRef.getBoundingClientRect()
                : null
              if (rect) {
                endX = rect.left + rect.width / 2
                endY = rect.top + rect.height / 2
              }
            } catch (e) { /* ignore */ }
          }

          // Arc control point (curved flight path)
          const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 100
          const midY = Math.min(startY, endY) - 80 - Math.random() * 60

          return (
            <motion.div
              key={star.id}
              initial={{
                x: startX,
                y: startY,
                scale: 0,
                opacity: 0,
              }}
              animate={{
                x: [startX, midX, endX],
                y: [startY, midY, endY],
                scale: [0, 1.4, 0.6],
                opacity: [0, 1, 0.8, 0],
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                duration: 1.2,
                ease: [0.22, 0.61, 0.36, 1],
                times: [0, 0.45, 1],
                opacity: { times: [0, 0.2, 0.8, 1] },
              }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                translateX: '-50%',
                translateY: '-50%',
                width: 12,
                height: 12,
              }}
            >
              {/* Star shape */}
              <svg width="12" height="12" viewBox="0 0 12 12">
                <defs>
                  <radialGradient id={`sg_${star.id}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="40%" stopColor="#7ab8d4" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#6db8c4" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="6" cy="6" r="5" fill={`url(#sg_${star.id})`} />
                {/* Cross sparkle */}
                <line x1="6" y1="1" x2="6" y2="11" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
                <line x1="1" y1="6" x2="11" y2="6" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
                <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
              </svg>

              {/* Trailing glow */}
              <motion.div
                animate={{ opacity: [0.6, 0], scale: [1, 2.5] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.2 }}
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(109,184,196,0.5) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
