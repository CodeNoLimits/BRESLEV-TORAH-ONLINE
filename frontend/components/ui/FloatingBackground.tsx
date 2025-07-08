'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface FloatingOrb {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
  color: string
}

export default function FloatingBackground() {
  const [orbs, setOrbs] = useState<FloatingOrb[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Générer les orbes flottantes
    const generateOrbs = () => {
      const colors = [
        'rgba(59, 130, 246, 0.1)',   // blue-500
        'rgba(147, 51, 234, 0.1)',   // purple-500  
        'rgba(236, 72, 153, 0.1)',   // pink-500
        'rgba(16, 185, 129, 0.1)',   // emerald-500
        'rgba(245, 158, 11, 0.1)',   // amber-500
        'rgba(239, 68, 68, 0.1)',    // red-500
      ]
      
      const newOrbs: FloatingOrb[] = []
      
      for (let i = 0; i < 12; i++) {
        newOrbs.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 300 + 100, // 100-400px
          duration: Math.random() * 20 + 15, // 15-35s
          delay: Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)]
        })
      }
      
      setOrbs(newOrbs)
    }

    generateOrbs()
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient de base */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900" />
      
      {/* Étoiles statiques */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 1}s`
            }}
          />
        ))}
      </div>

      {/* Orbes flottantes animées */}
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full blur-xl"
          style={{
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
          }}
          animate={{
            x: [0, 50, -30, 20, 0],
            y: [0, -30, 40, -20, 0],
            scale: [1, 1.2, 0.8, 1.1, 1],
            opacity: [0.3, 0.6, 0.2, 0.5, 0.3],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Effets de lumière directionnelle */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse" 
           style={{ animationDelay: '2s' }} />
      
      {/* Particules flottantes */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-2 h-2 bg-white/10 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 6 + 4,
            delay: Math.random() * 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Vague lumineuse en bas */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-500/10 via-purple-500/5 to-transparent blur-sm" />
      
      {/* Halo central subtil */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-white/5 via-transparent to-transparent rounded-full blur-3xl" />
    </div>
  )
}