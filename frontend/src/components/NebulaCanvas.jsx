import React, { useRef, useEffect, useCallback } from 'react'

// Clamp utility
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)) }

export default function NebulaCanvas({ completedTasks = [] }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const starsRef = useRef([])
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const buildStars = useCallback((width, height, tasks) => {
    const stars = []
    const taskCount = tasks.length
    const mainCount = clamp(taskCount, 0, 80)
    const bgCount = clamp(120 - mainCount, 30, 80)

    // Background star dust (dim)
    for (let i = 0; i < bgCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseX: Math.random() * width,
        baseY: Math.random() * height,
        radius: Math.random() * 0.8 + 0.2,
        opacity: Math.random() * 0.25 + 0.05,
        speed: Math.random() * 0.3 + 0.1,
        phase: Math.random() * Math.PI * 2,
        parallaxFactor: Math.random() * 0.015 + 0.003,
        isBg: true,
        color: '#b0c8e0',
        glowRadius: 0,
      })
    }

    // Main task stars
    for (let i = 0; i < mainCount; i++) {
      const task = tasks[i] || {}
      const focusMinutes = task.focus_minutes || Math.random() * 60 + 20
      const isHighEnergy = task.energy === '高耗能'
      const type = task.type || 'focus'

      const colorMap = {
        focus: ['#7ab8d4', '#5a9ec4', '#8ccce0'],
        rest: ['#8aab96', '#6a9b80', '#aacbb8'],
        soft: ['#b5a1c8', '#9585b8', '#c8b8dc'],
        admin: ['#c4a87a', '#a8885a', '#d8bc90'],
        life: ['#6db8c4', '#4da8b8', '#88ccd8'],
      }
      const colors = colorMap[type] || colorMap.focus
      const color = colors[Math.floor(Math.random() * colors.length)]

      const angle = (i / mainCount) * Math.PI * 2 + Math.random() * 0.6
      const dist = Math.random() * Math.min(width, height) * 0.38 + 60
      const cx = width * 0.5 + Math.cos(angle) * dist * (0.7 + Math.random() * 0.6)
      const cy = height * 0.5 + Math.sin(angle) * dist * (0.7 + Math.random() * 0.6)

      const baseRadius = clamp(focusMinutes / 20, 1.2, 4.5)
      const radius = isHighEnergy ? baseRadius * 1.4 : baseRadius

      stars.push({
        x: clamp(cx, 20, width - 20),
        y: clamp(cy, 20, height - 20),
        baseX: clamp(cx, 20, width - 20),
        baseY: clamp(cy, 20, height - 20),
        radius,
        opacity: Math.random() * 0.35 + 0.55,
        speed: Math.random() * 0.6 + 0.2,
        phase: Math.random() * Math.PI * 2,
        parallaxFactor: Math.random() * 0.03 + 0.008,
        isBg: false,
        color,
        glowRadius: radius * (isHighEnergy ? 5 : 3.5),
        task,
      })
    }

    return stars
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1)
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1)
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
      starsRef.current = buildStars(canvas.offsetWidth, canvas.offsetHeight, completedTasks)
    }

    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      }
    }
    window.addEventListener('mousemove', handleMouse)

    let t = 0
    const draw = () => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight

      // Background gradient
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.8)
      bg.addColorStop(0, '#162032')
      bg.addColorStop(0.4, '#0f1826')
      bg.addColorStop(0.75, '#0a1220')
      bg.addColorStop(1, '#060d18')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Nebula clouds (multi-layer soft glows)
      const nebulaCenters = [
        { x: W * 0.35, y: H * 0.45, r: W * 0.32, color: 'rgba(30,60,95,0.28)' },
        { x: W * 0.65, y: H * 0.38, r: W * 0.25, color: 'rgba(45,30,75,0.18)' },
        { x: W * 0.5, y: H * 0.6, r: W * 0.28, color: 'rgba(20,55,70,0.22)' },
        { x: W * 0.2, y: H * 0.3, r: W * 0.18, color: 'rgba(50,80,60,0.1)' },
      ]

      nebulaCenters.forEach(n => {
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r)
        grd.addColorStop(0, n.color)
        grd.addColorStop(1, 'transparent')
        ctx.fillStyle = grd
        ctx.fillRect(0, 0, W, H)
      })

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // Draw connections between nearby main stars (very faint)
      const mainStars = starsRef.current.filter(s => !s.isBg)
      ctx.save()
      for (let i = 0; i < mainStars.length; i++) {
        for (let j = i + 1; j < mainStars.length; j++) {
          const a = mainStars[i]
          const b = mainStars[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.06
            ctx.beginPath()
            ctx.strokeStyle = `rgba(150,190,220,${alpha})`
            ctx.lineWidth = 0.4
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      ctx.restore()

      // Draw stars
      starsRef.current.forEach(star => {
        if (!prefersReducedMotion) {
          const breathe = Math.sin(t * star.speed + star.phase) * 0.18
          const floatX = Math.cos(t * 0.3 * star.speed + star.phase) * 0.8
          const floatY = Math.sin(t * 0.4 * star.speed + star.phase * 0.7) * 0.8
          const parallaxX = (mx - 0.5) * W * star.parallaxFactor * (star.isBg ? 0.4 : 1)
          const parallaxY = (my - 0.5) * H * star.parallaxFactor * (star.isBg ? 0.4 : 1)
          star.x = star.baseX + floatX + parallaxX
          star.y = star.baseY + floatY + parallaxY
          star.currentOpacity = star.opacity * (0.82 + breathe)
        } else {
          star.currentOpacity = star.opacity
        }

        const r = star.radius
        const op = star.currentOpacity || star.opacity

        if (!star.isBg && star.glowRadius > 0) {
          // Glow
          const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.glowRadius)
          glow.addColorStop(0, star.color.replace(')', `,${op * 0.35})`).replace('rgb', 'rgba'))
          glow.addColorStop(1, 'transparent')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.glowRadius, 0, Math.PI * 2)
          ctx.fill()
        }

        // Core
        ctx.beginPath()
        ctx.arc(star.x, star.y, r, 0, Math.PI * 2)
        ctx.fillStyle = hexWithAlpha(star.color, op)
        ctx.fill()

        // Sparkle cross for main stars
        if (!star.isBg && r > 2) {
          ctx.save()
          ctx.globalAlpha = op * 0.35
          ctx.strokeStyle = star.color
          ctx.lineWidth = 0.6
          const sl = r * 2.5
          ctx.beginPath()
          ctx.moveTo(star.x - sl, star.y)
          ctx.lineTo(star.x + sl, star.y)
          ctx.moveTo(star.x, star.y - sl)
          ctx.lineTo(star.x, star.y + sl)
          ctx.stroke()
          ctx.restore()
        }
      })

      t += 0.012
      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [completedTasks, buildStars, prefersReducedMotion])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  )
}

function hexWithAlpha(hex, alpha) {
  if (hex.startsWith('#')) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  return hex
}
