import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import NebulaCanvas from './NebulaCanvas.jsx'

// ---- Utilities ----
function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(new Date().setDate(diff))
  return monday.toISOString().split('T')[0]
}

function useCountUp(target, duration = 1800, delay = 0) {
  const [value, setValue] = useState(0)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (target === 0) return
    if (prefersReduced) { setValue(target); return }
    let start = null
    let raf
    const startAnim = () => {
      raf = requestAnimationFrame(function tick(timestamp) {
        if (!start) start = timestamp
        const elapsed = timestamp - start
        const progress = Math.min(elapsed / duration, 1)
        const ease = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(ease * target))
        if (progress < 1) raf = requestAnimationFrame(tick)
        else setValue(target)
      })
    }
    const timer = setTimeout(startAnim, delay)
    return () => { clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [target, duration, delay, prefersReduced])

  return value
}

// ---- Sub-components ----
function StatCard({ label, value, unit = '', delay = 0, accent = '#7ab8d4' }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0, 1600, delay)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 + 0.4, duration: 0.5 }}
      className="flex flex-col items-center justify-center p-4 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div
        className="count-up-number text-3xl font-light mb-1 nebula-title"
        style={{ color: accent }}
      >
        {animated}{unit}
      </div>
      <div className="text-xs text-center" style={{ color: 'rgba(180,210,230,0.65)' }}>
        {label}
      </div>
    </motion.div>
  )
}

function GlassSection({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
      className={`rounded-3xl p-6 ${className}`}
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
    >
      {children}
    </motion.div>
  )
}

// ---- Mock data for fallback ----
const FALLBACK_REVIEW = {
  summary_message: '这一周，无论完成了多少，你都在继续。微光不是用来和别人比较的，它只是记录你没有放弃。',
  effort_highlights: [
    '你在今天写下了今日计划，这本身就是一种自我关照。',
    '每一条 Brain Dump 都是你愿意梳理自己思绪的证明。',
  ],
  pattern_insights: [
    '数据还在积累中，再用几天系统就能读出你的节奏。',
  ],
  next_week_suggestions: [
    '下周不妨试试每天只设定 1-3 个"核心任务"，其余弹性处理。',
    '可以试试在日历里预留一段"空白时间"，什么都不做。',
  ],
  gentle_closing: '星云不是用来展示的，它只属于你。好好休息。',
}

// ---- Main Component ----
export default function NebulaReview({ onClose, apiBase }) {
  const [completedTasks, setCompletedTasks] = useState([])
  const [checkins, setCheckins] = useState([])
  const [brainDumpItems, setBrainDumpItems] = useState([])
  const [schedules, setSchedules] = useState([])
  const [review, setReview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(true)
  const [stats, setStats] = useState({ taskCount: 0, focusMinutes: 0, avgPerDay: 0, topType: '—', moodTrend: null })
  const [contentVisible, setContentVisible] = useState(false)

  // Load local data
  useEffect(() => {
    try {
      const tasks = JSON.parse(localStorage.getItem('weeklyCompletedTasks') || '[]')
      setCompletedTasks(tasks)

      const ci = JSON.parse(localStorage.getItem('dailyCheckins') || '[]')
      setCheckins(ci)

      const bd = JSON.parse(localStorage.getItem('brainDumpItems') || '[]')
      setBrainDumpItems(bd)

      const sc = JSON.parse(localStorage.getItem('schedules') || '[]')
      setSchedules(sc)

      // Compute stats
      const taskCount = tasks.length
      const focusMinutes = tasks.reduce((sum, t) => sum + (t.focus_minutes || 0), 0)
      const avgPerDay = ci.length > 0 ? +(taskCount / Math.max(ci.length, 1)).toFixed(1) : 0

      const typeCount = {}
      tasks.forEach(t => { typeCount[t.type || 'focus'] = (typeCount[t.type || 'focus'] || 0) + 1 })
      const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
      const typeLabels = { focus: '深度专注', rest: '恢复休息', soft: '轻量推进', admin: '事务处理', life: '生活关照' }

      const moods = ci.slice(-7).map(c => c.mood).filter(Boolean)
      const moodTrend = moods.length > 0 ? moods[moods.length - 1] : null

      setStats({
        taskCount,
        focusMinutes,
        avgPerDay,
        topType: typeLabels[topType] || topType,
        moodTrend,
      })
    } catch (e) {
      console.warn('Failed to load local data:', e)
    }
  }, [])

  // Delay content reveal for canvas to load first
  useEffect(() => {
    const timer = setTimeout(() => setContentVisible(true), 400)
    return () => clearTimeout(timer)
  }, [])

  // Fetch AI review
  useEffect(() => {
    const fetchReview = async () => {
      try {
        const tasks = JSON.parse(localStorage.getItem('weeklyCompletedTasks') || '[]')
        const ci = JSON.parse(localStorage.getItem('dailyCheckins') || '[]')
        const bd = JSON.parse(localStorage.getItem('brainDumpItems') || '[]')
        const sc = JSON.parse(localStorage.getItem('schedules') || '[]')

        const res = await fetch(`${apiBase}/api/weekly-review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completed_tasks: tasks,
            daily_checkins: ci.slice(-7),
            brain_dump_items: bd.map(b => b.text || b),
            schedules: sc.slice(-7),
          }),
        })

        if (!res.ok) throw new Error('API error')
        const data = await res.json()
        setReview(data)
      } catch (err) {
        console.warn('Weekly review API failed, using fallback:', err)
        setReview(FALLBACK_REVIEW)
      } finally {
        setReviewLoading(false)
      }
    }

    fetchReview()
  }, [apiBase])

  const isEmpty = completedTasks.length === 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: '#060d18' }}
    >
      {/* Canvas background - full screen */}
      <div className="fixed inset-0">
        <NebulaCanvas completedTasks={completedTasks} />
      </div>

      {/* Overlay gradient for readability */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(6,13,24,0.15) 0%, rgba(6,13,24,0.05) 50%, rgba(6,13,24,0.2) 100%)',
        }}
      />

      {/* Content */}
      <AnimatePresence>
        {contentVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 min-h-screen pb-16"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="flex items-center justify-between px-6 pt-6 pb-4"
            >
              <div>
                <p className="text-xs tracking-widest uppercase mb-1"
                  style={{ color: 'rgba(109,184,196,0.7)' }}>
                  Nebula Review
                </p>
                <h1 className="nebula-title text-2xl"
                  style={{ color: 'rgba(200,225,240,0.92)' }}>
                  本周星云复盘
                </h1>
              </div>

              <motion.button
                whileHover={{ scale: 1.04, borderColor: 'rgba(109,184,196,0.45)' }}
                whileTap={{ scale: 0.96 }}
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl text-sm font-medium transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(180,210,230,0.8)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                收好这片星云 ✦
              </motion.button>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="px-6 pb-8 text-sm leading-relaxed"
              style={{ color: 'rgba(160,195,215,0.6)', maxWidth: 480 }}
            >
              这些微光不是证明你有多完美，而是证明你有在继续。
            </motion.p>

            {/* Empty state */}
            {isEmpty && (
              <GlassSection delay={0.35} className="mx-4 mb-4">
                <div className="text-center py-4">
                  <div className="text-4xl mb-4">🌌</div>
                  <p className="text-base font-light mb-2"
                    style={{ color: 'rgba(180,210,230,0.85)' }}>
                    这周的星云还很安静
                  </p>
                  <p className="text-sm leading-relaxed"
                    style={{ color: 'rgba(140,175,200,0.6)' }}>
                    没关系，微光不是用来比较的，它只是记录你没有放弃。
                  </p>
                </div>
              </GlassSection>
            )}

            {/* Stats grid */}
            <div className="px-4 mb-4">
              <GlassSection delay={0.25}>
                <p className="text-xs tracking-widest uppercase mb-4"
                  style={{ color: 'rgba(109,184,196,0.65)' }}>
                  本周数据
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="完成任务"
                    value={stats.taskCount}
                    unit=" 项"
                    delay={300}
                    accent="#7ab8d4"
                  />
                  <StatCard
                    label="累计专注"
                    value={stats.focusMinutes}
                    unit=" 分钟"
                    delay={450}
                    accent="#8aab96"
                  />
                  <StatCard
                    label="日均完成"
                    value={Math.round(stats.avgPerDay)}
                    unit=" 项"
                    delay={600}
                    accent="#b5a1c8"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + 750 / 1000, duration: 0.5 }}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="text-2xl font-light mb-1 text-center"
                      style={{ color: '#c4a87a' }}>
                      {stats.topType}
                    </div>
                    <div className="text-xs text-center"
                      style={{ color: 'rgba(180,210,230,0.65)' }}>
                      最多任务类型
                    </div>
                  </motion.div>
                </div>

                {/* Mood trend */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 }}
                  className="mt-4 pt-4"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-xs" style={{ color: 'rgba(140,175,200,0.55)' }}>
                    {stats.moodTrend
                      ? `近期情绪倾向：${stats.moodTrend}`
                      : '数据还不够，但系统已经开始记住你的节奏'}
                  </p>
                </motion.div>
              </GlassSection>
            </div>

            {/* AI Review content */}
            <div className="px-4">
              {reviewLoading ? (
                <GlassSection delay={0.4}>
                  <div className="flex items-center gap-3">
                    <span style={{ color: 'rgba(109,184,196,0.7)' }}>🌌</span>
                    <div>
                      <p className="text-sm mb-2" style={{ color: 'rgba(160,195,215,0.7)' }}>
                        星云正在收集这周的光...
                      </p>
                      <div className="flex gap-1.5">
                        {[0, 1, 2, 3].map(i => (
                          <motion.div
                            key={i}
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: 'rgba(109,184,196,0.6)' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassSection>
              ) : review && (
                <div className="space-y-4">
                  {/* Summary message */}
                  <GlassSection delay={0.35}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">✦</span>
                      <div>
                        <p className="text-xs tracking-widest uppercase mb-2"
                          style={{ color: 'rgba(109,184,196,0.65)' }}>
                          本周总结
                        </p>
                        <p className="text-base leading-relaxed font-light"
                          style={{ color: 'rgba(210,230,245,0.88)' }}>
                          {review.summary_message}
                        </p>
                      </div>
                    </div>
                  </GlassSection>

                  {/* Effort highlights */}
                  {review.effort_highlights && review.effort_highlights.length > 0 && (
                    <GlassSection delay={0.5}>
                      <p className="text-xs tracking-widest uppercase mb-3"
                        style={{ color: 'rgba(138,171,150,0.65)' }}>
                        你做到了
                      </p>
                      <div className="space-y-2">
                        {review.effort_highlights.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.55 + i * 0.1, duration: 0.4 }}
                            className="flex items-start gap-2.5"
                          >
                            <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                              style={{ background: 'rgba(138,171,150,0.6)' }} />
                            <p className="text-sm leading-relaxed"
                              style={{ color: 'rgba(190,220,205,0.8)' }}>
                              {item}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </GlassSection>
                  )}

                  {/* Pattern insights */}
                  {review.pattern_insights && review.pattern_insights.length > 0 && (
                    <GlassSection delay={0.65}>
                      <p className="text-xs tracking-widest uppercase mb-3"
                        style={{ color: 'rgba(181,161,200,0.65)' }}>
                        节奏观察
                      </p>
                      <div className="space-y-2">
                        {review.pattern_insights.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
                            className="flex items-start gap-2.5"
                          >
                            <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                              style={{ background: 'rgba(181,161,200,0.5)' }} />
                            <p className="text-sm leading-relaxed"
                              style={{ color: 'rgba(205,190,225,0.8)' }}>
                              {item}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </GlassSection>
                  )}

                  {/* Next week suggestions */}
                  {review.next_week_suggestions && review.next_week_suggestions.length > 0 && (
                    <GlassSection delay={0.8}>
                      <p className="text-xs tracking-widest uppercase mb-3"
                        style={{ color: 'rgba(196,168,122,0.65)' }}>
                        下周可以试试
                      </p>
                      <div className="space-y-2">
                        {review.next_week_suggestions.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.85 + i * 0.1, duration: 0.4 }}
                            className="flex items-start gap-2.5"
                          >
                            <span className="mt-1 flex-shrink-0 text-xs"
                              style={{ color: 'rgba(196,168,122,0.5)' }}>→</span>
                            <p className="text-sm leading-relaxed"
                              style={{ color: 'rgba(220,205,180,0.8)' }}>
                              {item}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </GlassSection>
                  )}

                  {/* Gentle closing */}
                  {review.gentle_closing && (
                    <GlassSection delay={0.95}>
                      <div className="text-center py-2">
                        <div className="text-2xl mb-3">🌌</div>
                        <p className="text-base font-light leading-relaxed nebula-title"
                          style={{ color: 'rgba(180,210,230,0.8)' }}>
                          {review.gentle_closing}
                        </p>
                      </div>
                    </GlassSection>
                  )}

                  {/* Close button */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1 }}
                    className="text-center pt-4"
                  >
                    <motion.button
                      whileHover={{ scale: 1.04, boxShadow: '0 0 0 1px rgba(109,184,196,0.3), 0 8px 24px rgba(0,0,0,0.3)' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={onClose}
                      className="px-8 py-3.5 rounded-2xl text-sm font-medium"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        color: 'rgba(180,210,230,0.85)',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      收好这片星云 ✦
                    </motion.button>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
