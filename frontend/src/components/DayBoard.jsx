import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TYPE_LABELS = {
  focus: '专注',
  rest: '休息',
  soft: '轻量',
  admin: '事务',
  life: '生活',
}

const TYPE_EMOJIS = {
  focus: '🎯',
  rest: '☁️',
  soft: '🌿',
  admin: '📋',
  life: '🌸',
}

function TodoItem({ task, onComplete, onDefer, onCancel }) {
  const [showMenu, setShowMenu] = useState(false)
  const [completing, setCompleting] = useState(false)
  const cardRef = useRef(null)

  const handleComplete = () => {
    if (completing || task.status === 'done') return
    setCompleting(true)
    setTimeout(() => {
      const rect = cardRef.current?.getBoundingClientRect()
      onComplete(task, rect)
    }, 300)
  }

  if (task.status === 'cancelled') return null

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: task.status === 'done' ? 0.45 : task.status === 'deferred' ? 0.6 : 1,
        y: 0,
      }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.3 } }}
      transition={{ duration: 0.25 }}
      className="group relative flex items-start gap-3 px-4 py-3.5 rounded-2xl mb-2"
      style={{
        background: task.status === 'done'
          ? 'rgba(138,171,150,0.08)'
          : 'rgba(255,255,255,0.6)',
        border: task.status === 'done'
          ? '1px solid rgba(138,171,150,0.25)'
          : '1px solid rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Checkbox */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleComplete}
        disabled={task.status !== 'pending'}
        className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
        style={{
          border: task.status === 'done'
            ? '1.5px solid rgba(138,171,150,0.6)'
            : '1.5px solid rgba(122,155,181,0.45)',
          background: task.status === 'done' ? 'rgba(138,171,150,0.2)' : 'transparent',
          cursor: task.status === 'pending' ? 'pointer' : 'default',
        }}
      >
        <AnimatePresence>
          {task.status === 'done' && (
            <motion.svg
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              width="11" height="11" viewBox="0 0 11 11" fill="none"
            >
              <path d="M2 5.5l2.5 2.5 4.5-5" stroke="#8aab96" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug"
          style={{
            color: task.status === 'done' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
            textDecorationColor: 'rgba(138,171,150,0.5)',
          }}>
          {task.title}
        </p>
        {task.status === 'deferred' && (
          <span className="text-xs mt-0.5 inline-block" style={{ color: 'var(--color-text-muted)' }}>
            已延后 →
          </span>
        )}
        {/* Shimmer on complete */}
        {completing && (
          <motion.div
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(138,171,150,0.15), transparent)',
              transformOrigin: 'left',
            }}
          />
        )}
      </div>

      {/* Context menu */}
      {task.status === 'pending' && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(200,212,224,0.3)', color: 'var(--color-text-muted)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="6" cy="2" r="1" />
              <circle cx="6" cy="6" r="1" />
              <circle cx="6" cy="10" r="1" />
            </svg>
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-8 z-10 glass-card py-1.5 min-w-24"
                style={{ boxShadow: 'var(--shadow-float)' }}
              >
                <button
                  onClick={() => { onDefer(task.id); setShowMenu(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  📅 延后
                </button>
                <button
                  onClick={() => { onCancel(task.id); setShowMenu(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  ✕ 取消
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

function TimelineItem({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="flex gap-3 mb-3"
    >
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
          style={{ background: 'var(--color-dusty-blue)' }} />
        <div className="w-px flex-1 mt-1"
          style={{ background: 'rgba(122,155,181,0.18)' }} />
      </div>
      <div className="flex-1 pb-3">
        <div className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
          {item.time}
        </div>
        <div className="rounded-2xl px-4 py-3"
          style={{
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(8px)',
            border: `1.5px solid transparent`,
            borderLeft: `3px solid`,
            borderLeftColor: item.type === 'focus' ? '#7a9bb5'
              : item.type === 'rest' ? '#8aab96'
              : item.type === 'soft' ? '#b5a1c8'
              : item.type === 'admin' ? '#c4a87a'
              : '#6db8c4',
          }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                {TYPE_EMOJIS[item.type]} {item.title}
              </p>
              {item.reason && (
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {item.reason}
                </p>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-lg flex-shrink-0 type-badge-${item.type}`}>
              {TYPE_LABELS[item.type] || item.type}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function DayBoard({
  schedule, scheduleLoading, todos,
  onTaskComplete, onTaskDefer, onTaskCancel, onAddTodo
}) {
  const [newTaskInput, setNewTaskInput] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  const handleAddTask = () => {
    if (!newTaskInput.trim()) return
    onAddTodo(newTaskInput.trim())
    setNewTaskInput('')
    setAddingTask(false)
  }

  const pendingTodos = todos.filter(t => t.status === 'pending')
  const doneTodos = todos.filter(t => t.status === 'done')
  const deferredTodos = todos.filter(t => t.status === 'deferred')

  return (
    <div className="max-w-5xl mx-auto">
      {/* AI Message Card */}
      <AnimatePresence>
        {schedule && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-card px-6 py-5 mb-5"
            style={{
              background: 'linear-gradient(135deg, rgba(109,184,196,0.08) 0%, rgba(122,155,181,0.06) 100%)',
              borderColor: 'rgba(109,184,196,0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="text-xl mt-0.5">🌙</div>
              <div>
                <p className="text-xs font-medium mb-1.5 tracking-wide" style={{ color: 'var(--color-aurora)' }}>
                  今日 AI 留言
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                  {schedule.ai_message}
                </p>
              </div>
            </div>
          </motion.div>
        )}
        {scheduleLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card px-6 py-5 mb-5"
          >
            <div className="flex items-center gap-3">
              <div className="text-xl">🌙</div>
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>AI 正在为你安排今天...</p>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--color-aurora)' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Todo list */}
        <div>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  今日任务
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {pendingTodos.length} 项待办 · {doneTodos.length} 项完成
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAddingTask(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
                style={{
                  background: 'rgba(109,184,196,0.12)',
                  color: 'var(--color-aurora)',
                  border: '1px solid rgba(109,184,196,0.2)',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                添加
              </motion.button>
            </div>

            {/* Add task input */}
            <AnimatePresence>
              {addingTask && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 overflow-hidden"
                >
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newTaskInput}
                      onChange={e => setNewTaskInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddTask()
                        if (e.key === 'Escape') setAddingTask(false)
                      }}
                      placeholder="新任务名称..."
                      className="flex-1 px-3 py-2 rounded-xl text-sm"
                      style={{
                        background: 'rgba(200,212,224,0.3)',
                        border: '1px solid rgba(200,212,224,0.5)',
                        color: 'var(--color-text-primary)',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleAddTask}
                      className="px-3 py-2 rounded-xl text-xs font-medium"
                      style={{ background: 'rgba(109,184,196,0.2)', color: 'var(--color-aurora)' }}
                    >
                      添加
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pending tasks */}
            <div>
              <AnimatePresence>
                {pendingTodos.map(task => (
                  <TodoItem
                    key={task.id}
                    task={task}
                    onComplete={onTaskComplete}
                    onDefer={onTaskDefer}
                    onCancel={onTaskCancel}
                  />
                ))}
              </AnimatePresence>

              {pendingTodos.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-6 text-center"
                >
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    ✨ 今天的任务都完成了
                  </p>
                </motion.div>
              )}
            </div>

            {/* Deferred tasks */}
            {deferredTodos.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(200,212,224,0.4)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>已延后</p>
                {deferredTodos.map(task => (
                  <div key={task.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1.5 text-sm"
                    style={{ background: 'rgba(200,212,224,0.2)', color: 'var(--color-text-muted)' }}>
                    <span>📅</span> {task.title}
                  </div>
                ))}
              </div>
            )}

            {/* Done tasks */}
            {doneTodos.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(200,212,224,0.4)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  已完成 {doneTodos.length} 项 ✨
                </p>
                {doneTodos.map(task => (
                  <TodoItem
                    key={task.id}
                    task={task}
                    onComplete={() => {}}
                    onDefer={() => {}}
                    onCancel={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Timeline */}
        <div>
          <div className="glass-card p-5">
            <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-primary)' }}>
              今日时间轴
            </h2>

            {schedule && schedule.timeline && schedule.timeline.length > 0 ? (
              <div>
                {schedule.timeline.map((item, i) => (
                  <TimelineItem key={i} item={item} index={i} />
                ))}
              </div>
            ) : scheduleLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    className="h-16 rounded-2xl"
                    style={{ background: 'rgba(200,212,224,0.35)' }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>
                完成签到后，AI 会为你生成今日时间轴
              </p>
            )}

            {/* Deferred / cancelled info */}
            {schedule && schedule.deferred_tasks && schedule.deferred_tasks.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(200,212,224,0.4)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>AI 建议延后</p>
                {schedule.deferred_tasks.map((t, i) => (
                  <div key={i} className="text-xs px-3 py-2 rounded-xl mb-1"
                    style={{ background: 'rgba(196,168,122,0.1)', color: '#9a7a52' }}>
                    📅 {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
