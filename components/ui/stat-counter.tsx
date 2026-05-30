'use client'

import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 800, decimals = 0) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setCurrent(0); return }
    const startTime = performance.now()

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = 1 - (1 - t) ** 3 // cubic ease-out
      setCurrent(parseFloat((target * ease).toFixed(decimals)))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else setCurrent(target)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, decimals])

  return current
}

export function AnimatedNumber({ value, decimals = 0, duration = 800 }: { value: number; decimals?: number; duration?: number }) {
  const counted = useCountUp(value, duration, decimals)
  return <>{decimals > 0 ? counted.toFixed(decimals) : String(Math.round(counted))}</>
}
