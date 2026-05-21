import React, { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import CheckInModal from './components/CheckInModal.jsx'
import DayBoard from './components/DayBoard.jsx'
import BrainDumpBar from './components/BrainDumpBar.jsx'
import NebulaReview from './components/NebulaReview.jsx'
import FloatingStars from './components/FloatingStars.jsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const DEFAULT_TODOS = [
  { id: 'default_1', title: '完成今日核心工作', status: 'pending' },
  { id: 'default_2', title: '回复重要邮件', status: 'pending' },
  { id: 'default_3', title: '下午散步 15 分钟', status: 'pending' },
]

const DEFAULT_SCHEDULE = {
  ai_message: '欢迎回来。在开始今天之前，先深呼吸一下。无论昨天发生了什么，今天都是新的开始。',
  timeline: [
    { time: '09:00 - 10:30', title: '深度工作块', type: 'focus', reason: '上午精力充沛，适合专注工作' },
    { time: '10:30 - 10:50', title: '放空休息', type: 'rest', reason: '保持可持续节奏' },
    { time: '11:00 - 12:00', title: '轻量事务处理', type: 'admin', reason: '利用上午尾段处理邮件等' },
    { time: '14:00 - 15:30', title: '下午深度工作', type: 'focus', reason: '午后调整后再次进入状态' },
    { time: '15:30 - 16:00', title: '户外或拉伸', type: 'life', reason: '身体需要休整' },
    { time: '16:00 - 17:30', title: '收尾与整理', type: 'soft', reason: '结束工作前梳理进展' },
  ],
  deferred_tasks: [],
  cancelled_tasks: [],
  brain_dump_next_actions: [],
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

function getYesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}

export default function App() {
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [showNebula, setShowNebula] = useState(false)
  const [schedule, setSchedule] = useState(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem(`todos:${getTodayKey()}`)
      return saved ? JSON.parse(saved) : DEFAULT_TODOS.map(t => ({ ...t }))
    } catch { return DEFAULT_TODOS.map(t => ({ ...t })) }
  })
  const [flyingStars, setFlyingStars] = useState([])
  const [nebulaEntryRef, setNebulaEntryRef] = useState(null)

  // Check if should show check-in
  useEffect(() => {
    const checkedDate = localStorage.getItem('checkedInDate')
    if (checkedDate !== getTodayKey()) {
      const timer = setTimeout(() => setShowCheckIn(true), 600)
      return () => clearTimeout(timer)
    } else {
      // Load cached schedule
      try {
        const cached = localStorage.getItem(`schedule:${getTodayKey()}`)
        if (cached) setSchedule(JSON.parse(cached))
        else setSchedule(DEFAULT_SCHEDULE)
      } catch { setSchedule(DEFAULT_SCHEDULE) }
    }
  }, [])

  // Check for weekend nebula suggestion
  useEffect(() => {
    const day = new Date().getDay()
    if (day === 6 || day === 0) {
      const lastPrompt = localStorage.getItem('nebulaPromptDate')
      if (lastPrompt !== getTodayKey()) {
        setTimeout(() => {
          // gentle nudge handled in UI
        }, 2000)
      }
    }
  }, [])

  // Save todos
  useEffect(() => {
    localStorage.setItem(`todos:${getTodayKey()}`, JSON.stringify(todos))
  }, [todos])

  const handleCheckInSubmit = useCallback(async (checkinData) => {
    localStorage.setItem('checkedInDate', getTodayKey())
    // Save checkin data
    const checkins = JSON.parse(localStorage.getItem('dailyCheckins') || '[]')
    checkins.push({ date: getTodayKey(), ...checkinData })
    localStorage.setItem('dailyCheckins', JSON.stringify(checkins.slice(-30)))

    setShowCheckIn(false)
    setScheduleLoading(true)

    // Get today todos
    const todayTodos = todos.filter(t => t.status === 'pending')
    const brainDump = JSON.parse(localStorage.getItem('brainDumpItems') || '[]')
    const yesterday = getYesterdayKey()
    // Simulate yesterday unfinished
    const unfinished = JSON.parse(localStorage.getItem(`unfinishedTasks:${yesterday}`) || '[]')

    const payload = {
      checkin: {
        sleep_time: checkinData.sleep_time,
        energy_level: checkinData.energy_level,
        mood: checkinData.mood,
      },
      yesterday_unfinished_tasks: unfinished,
      yesterday_unfinished_action: checkinData.unfinished_action || 'none',
      today_todos: todayTodos.map(t => ({ id: t.id, title: t.title })),
      brain_dump_items: brainDump.map(b => b.text),
    }

    try {
      const res = await fetch(`${API_BASE}/api/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setSchedule(data)
      localStorage.setItem(`schedule:${getTodayKey()}`, JSON.stringify(data))

      // Save to schedules history
      const schedules = JSON.parse(localStorage.getItem('schedules') || '[]')
      schedules.push({ date: getTodayKey(), ...data })
      localStorage.setItem('schedules', JSON.stringify(schedules.slice(-14)))
    } catch (err) {
      console.warn('Schedule API failed, using default:', err)
      setSchedule(DEFAULT_SCHEDULE)
    } finally {
      setScheduleLoading(false)
    }
  }, [todos])

  const handleTaskComplete = useCallback((task, cardRect) => {
    // Update todo status
    setTodos(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: 'done' } : t
    ))

    // Write to weeklyCompletedTasks
    const weeklyKey = `weeklyCompletedTasks:${getWeekStart()}`
    const weekly = JSON.parse(localStorage.getItem(weeklyKey) || '[]')
    weekly.push({
      id: task.id,
      title: task.title,
      completed_at: new Date().toISOString(),
      focus_minutes: Math.floor(Math.random() * 60) + 30,
      energy: task.type === 'focus' ? '高耗能' : '低耗能',
      type: task.type || 'focus',
    })
    localStorage.setItem(weeklyKey, JSON.stringify(weekly))
    // Also keep in general key for NebulaReview
    const generalWeekly = JSON.parse(localStorage.getItem('weeklyCompletedTasks') || '[]')
    generalWeekly.push({
      id: task.id,
      title: task.title,
      completed_at: new Date().toISOString(),
      focus_minutes: Math.floor(Math.random() * 60) + 30,
      energy: task.type === 'focus' ? '高耗能' : '低耗能',
      type: task.type || 'focus',
    })
    localStorage.setItem('weeklyCompletedTasks', JSON.stringify(generalWeekly))

    // Trigger flying star animation
    if (cardRect) {
      const starId = `star_${Date.now()}_${Math.random()}`
      setFlyingStars(prev => [...prev, { id: starId, fromRect: cardRect }])
      setTimeout(() => {
        setFlyingStars(prev => prev.filter(s => s.id !== starId))
      }, 2000)
    }
  }, [])

  const handleTaskDefer = useCallback((taskId) => {
    setTodos(prev => prev.map(t => t.id === taskId ? { ...t, status: 'deferred' } : t))
  }, [])

  const handleTaskCancel = useCallback((taskId) => {
    setTodos(prev => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' } : t))
  }, [])

  const handleAddTodo = useCallback((title) => {
    const newTask = {
      id: `task_${Date.now()}`,
      title,
      status: 'pending',
      type: 'focus',
    }
    setTodos(prev => [...prev, newTask])
  }, [])

  const isWeekend = [0, 6].includes(new Date().getDay())

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Nebula button hint for weekend */}
      <AnimatePresence>
        {isWeekend && !showNebula && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="glass-card px-5 py-2.5 text-sm text-center"
              style={{ color: 'var(--color-text-secondary)', maxWidth: 340 }}>
              ✨ 本周的微光已经积累成一片星云，要不要看一眼？
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main app */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="min-h-screen flex flex-col"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1 className="nebula-title text-xl" style={{ color: 'var(--color-text-primary)' }}>
              星云计划
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </motion.div>

          <motion.button
            ref={setNebulaEntryRef}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            whileHover={{ scale: 1.04, boxShadow: '0 0 0 2px rgba(109,184,196,0.35), 0 4px 16px rgba(109,184,196,0.18)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setShowNebula(true)
              localStorage.setItem('nebulaPromptDate', getTodayKey())
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(13, 19, 33, 0.88)',
              color: 'rgba(180, 210, 230, 0.92)',
              border: '1px solid rgba(109,184,196,0.25)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ fontSize: 14 }}>🌌</span>
            <span>查看本周星云</span>
          </motion.button>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 pb-32">
          <DayBoard
            schedule={schedule}
            scheduleLoading={scheduleLoading}
            todos={todos}
            onTaskComplete={handleTaskComplete}
            onTaskDefer={handleTaskDefer}
            onTaskCancel={handleTaskCancel}
            onAddTodo={handleAddTodo}
          />
        </main>

        {/* Brain Dump Bar */}
        <BrainDumpBar />
      </motion.div>

      {/* Flying Stars */}
      <FloatingStars flyingStars={flyingStars} nebulaEntryRef={nebulaEntryRef} />

      {/* Check-in Modal */}
      <AnimatePresence>
        {showCheckIn && (
          <CheckInModal onSubmit={handleCheckInSubmit} onClose={() => setShowCheckIn(false)} />
        )}
      </AnimatePresence>

      {/* Nebula Review */}
      <AnimatePresence>
        {showNebula && (
          <NebulaReview onClose={() => setShowNebula(false)} apiBase={API_BASE} />
        )}
      </AnimatePresence>
    </div>
  )
}
