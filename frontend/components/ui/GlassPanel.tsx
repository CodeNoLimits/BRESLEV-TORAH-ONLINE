"use client"

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'subtle' | 'strong'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function GlassPanel({ 
  children, 
  className, 
  variant = 'default',
  padding = 'md'
}: GlassPanelProps) {
  const variants = {
    default: 'bg-white/10 backdrop-blur-md border border-white/20',
    subtle: 'bg-white/5 backdrop-blur-sm border border-white/10',
    strong: 'bg-white/20 backdrop-blur-lg border border-white/30'
  }

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div 
      className={cn(
        'rounded-xl shadow-xl backdrop-saturate-150',
        variants[variant],
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  )
}