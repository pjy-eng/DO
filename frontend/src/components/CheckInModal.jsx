import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MOOD_OPTIONS = [
  { value: '平静', emoji: '😌', desc: '内心稳稳的' },
  { value: '疲惫', emoji: '😮‍💨', desc: '需要慢一点' },
  { value: '有点焦虑', emoji: '😰', desc: '脑子转太快了' },
  { value: '脑子很散', emoji: '🌫️', desc: '今天有点飘' },
  { value: '还想努力一下', emoji: '💫', desc: '有一点小斗志' },
]

const SLEEP_TIMES = ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '24:00', '00:30', '01:00']

function getYesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export default function CheckInModal({ onSubmit, onClose }) {
  const [step, setStep] = useState(1) // 1: main, 2: unfinished action
  const [sleepTime, setSleepTime] = useState('23:00')
  const [energyLevel, setEnergyLevel] = useState(5)
  const [mood, setMood] = useState('')
  const [unfinishedAction, setUnfinishedAction] = useState('none')
  const [yesterdayUnfinished, setYesterdayUnfinished] = useState([])

  useEffect(() => {
    // Check for yesterday's unfinished tasks
    try {
      const key = `todos:${getYesterdayKey()}`
      const yesterdayTodos = JSON.parse(localStorage.getItem(key) || '[]')
      const unfinished = yesterdayTodos.filter(t => t.status === 'pending')
      setYesterdayUnfinished(unfinished)
    } catch (e) {
      // ignore
    }
  }, [])

  const hasUnfinished = yesterdayUnfinished.length > 0

  const handleMainSubmit = () => {
    if (!mood) return
    if (hasUnfinished) {
      setStep(2)
    } else {
      onSubmit({ sleep_time: sleepTime, energy_level: energyLevel, mood, unfinished_action: 'none' })
    }
  }

  const handleFinalSubmit = () => {
    onSubmit({
      sleep_time: sleepTime,
      energy_level: energyLevel,
      mood,
      unfinished_action: unfinishedAction,
    })
  }

  const energyLabel = energyLevel <= 3 ? '精力充沛' : energyLevel <= 5 ? '状态还好' : energyLevel <= 7 ? '有些疲惫' : '比较累了'
  const energyColor = energyLevel <= 3 ? '#8aab96' : energyLevel <= 5 ? '#7a9bb5' : energyLevel <= 7 ? '#c4a87a' : '#b57a7a'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(15, 20, 30, 0.35)' }}
    >
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="glass-card w-full max-w-md p-7"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Header */}
            <div className="mb-6">
              <p className="text-xs font-medium tracking-widest uppercase mb-2"
                style={{ color: 'var(--color-aurora)' }}>
                每日签到
              </p>
              <h2 className="nebula-title text-2xl" style={{ color: 'var(--color-text-primary)' }}>
                今天，状态怎么样？
              </h2>
              <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                告诉我，我来帮你安排一个合适的节奏
              </p>
            </div>

            {/* Sleep time */}
            <div className="mb-5">
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
                今晚预计几点休息
              </label>
              <div className="flex flex-wrap gap-2">
                {SLEEP_TIMES.map(t => (
                  <motion.button
                    key={t}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setSleepTime(t)}
                    className="px-3 py-1.5 rounded-xl text-sm transition-all"
                    style={{
                      background: sleepTime === t ? 'rgba(122,155,181,0.18)' : 'rgba(200,212,224,0.25)',
                      border: sleepTime === t ? '1.5px solid rgba(122,155,181,0.55)' : '1.5px solid transparent',
                      color: sleepTime === t ? 'var(--color-dusty-blue)' : 'var(--color-text-secondary)',
                      fontWeight: sleepTime === t ? 500 : 400,
                    }}
                  >
                    {t}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Energy level slider */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  疲劳指数
                </label>
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-lg"
                  style={{ background: `${energyColor}18`, color: energyColor }}>
                  {energyLevel} · {energyLabel}
                </span>
              </div>
              <div className="relative py-2">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={energyLevel}
                  onChange={e => setEnergyLevel(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${energyColor} ${(energyLevel - 1) / 9 * 100}%, rgba(200,212,224,0.4) ${(energyLevel - 1) / 9 * 100}%)`,
                    accentColor: energyColor,
                  }}
                />
                <div className="flex justify-between text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  <span>精力满满 1</span>
                  <span>10 力竭</span>
                </div>
              </div>
            </div>

            {/* Mood selection */}
            <div className="mb-7">
              <label className="text-sm font-medium mb-3 block" style={{ color: 'var(--color-text-secondary)' }}>
                今天的心情
              </label>
              <div className="flex flex-col gap-2">
                {MOOD_OPTIONS.map(opt => (
                  <motion.button
                    key={opt.value}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setMood(opt.value)}
                    className="mood-tag flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                    style={{
                      background: mood === opt.value ? 'rgba(109,184,196,0.12)' : 'rgba(200,212,224,0.2)',
                      border: mood === opt.value ? '1.5px solid rgba(109,184,196,0.45)' : '1.5px solid transparent',
                    }}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <div>
                      <div className="text-sm font-medium" style={{ color: mood === opt.value ? 'var(--color-aurora)' : 'var(--color-text-primary)' }}>
                        {opt.value}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{opt.desc}</div>
                    </div>
                    {mood === opt.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(109,184,196,0.25)', color: 'var(--color-aurora)' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(109,184,196,0.25)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleMainSubmit}
              disabled={!mood}
              className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all"
              style={{
                background: mood
                  ? 'linear-gradient(135deg, #6db8c4 0%, #7a9bb5 100%)'
                  : 'rgba(200,212,224,0.45)',
                color: mood ? 'white' : 'var(--color-text-muted)',
                cursor: mood ? 'pointer' : 'not-allowed',
              }}
            >
              {mood ? '好，帮我安排今天 →' : '先选一个心情吧'}
            </motion.button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="glass-card w-full max-w-md p-7"
          >
            <div className="mb-6">
              <p className="text-xs font-medium tracking-widest uppercase mb-2"
                style={{ color: 'var(--color-dusty-blue)' }}>
                昨日未完成
              </p>
              <h2 className="nebula-title text-xl" style={{ color: 'var(--color-text-primary)' }}>
                昨天有些小任务没来得及做
              </h2>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                需要我帮你把它们打散平摊到今天，还是往后延，或者干脆取消掉？
              </p>
            </div>

            {/* Show unfinished tasks */}
            <div className="mb-5 flex flex-col gap-1.5">
              {yesterdayUnfinished.slice(0, 5).map(task => (
                <div key={task.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'rgba(200,212,224,0.25)', color: 'var(--color-text-secondary)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                  {task.title}
                </div>
              ))}
            </div>

            {/* Options */}
            <div className="flex flex-col gap-2.5 mb-6">
              {[
                { value: 'split_today', emoji: '🔀', label: '打散平摊到今天', desc: '拆成小块放进今天' },
                { value: 'postpone', emoji: '📅', label: '往后延', desc: '先放着，以后再说' },
                { value: 'cancel', emoji: '🌬️', label: '干脆取消', desc: '卸下来，轻装前行' },
              ].map(opt => (
                <motion.button
                  key={opt.value}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setUnfinishedAction(opt.value)}
                  className="mood-tag flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                  style={{
                    background: unfinishedAction === opt.value ? 'rgba(122,155,181,0.12)' : 'rgba(200,212,224,0.2)',
                    border: unfinishedAction === opt.value ? '1.5px solid rgba(122,155,181,0.45)' : '1.5px solid transparent',
                  }}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: unfinishedAction === opt.value ? 'var(--color-dusty-blue)' : 'var(--color-text-primary)' }}>
                      {opt.label}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{opt.desc}</div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-2xl text-sm"
                style={{ background: 'rgba(200,212,224,0.3)', color: 'var(--color-text-secondary)' }}
              >
                返回
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFinalSubmit}
                className="flex-2 py-3 px-6 rounded-2xl text-sm font-medium"
                style={{
                  background: 'linear-gradient(135deg, #7a9bb5 0%, #6db8c4 100%)',
                  color: 'white',
                }}
              >
                好，开始今天 →
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
