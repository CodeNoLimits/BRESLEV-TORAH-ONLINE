'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassPanelProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
  variant?: 'default' | 'intense' | 'subtle' | 'accent'
  blur?: 'sm' | 'md' | 'lg' | 'xl'
  glow?: boolean
  border?: boolean
  shadow?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const variants = {
  default: 'bg-white/10 border-white/20',
  intense: 'bg-white/20 border-white/30', 
  subtle: 'bg-white/5 border-white/10',
  accent: 'bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-pink-500/20 border-white/25'
}

const blurLevels = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md', 
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl'
}

const shadowLevels = {
  sm: 'shadow-lg shadow-black/10',
  md: 'shadow-xl shadow-black/20',
  lg: 'shadow-2xl shadow-black/30', 
  xl: 'shadow-2xl shadow-black/50'
}

export default function GlassPanel({
  children,
  variant = 'default',
  blur = 'md',
  glow = false,
  border = true,
  shadow = 'md',
  className,
  ...props
}: GlassPanelProps) {
  return (
    <motion.div
      className={cn(
        // Base styles
        'relative rounded-xl overflow-hidden',
        
        // Glass effect
        variants[variant],
        blurLevels[blur],
        
        // Border
        border && 'border',
        
        // Shadow
        shadowLevels[shadow],
        
        // Glow effect
        glow && 'ring-1 ring-white/20 ring-offset-2 ring-offset-transparent',
        
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      {...props}
    >
      {/* Gradient overlay for extra depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 pointer-events-none" />
      
      {/* Glow effect */}
      {glow && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-xl blur-sm -z-10" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Interactive shine effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000" />
    </motion.div>
  )
}

// Variantes spécialisées
export function GlassCard({ children, className, ...props }: Omit<GlassPanelProps, 'variant'>) {
  return (
    <GlassPanel 
      variant="default" 
      glow 
      className={cn('p-6', className)} 
      {...props}
    >
      {children}
    </GlassPanel>
  )
}

export function GlassHeader({ children, className, ...props }: Omit<GlassPanelProps, 'variant'>) {
  return (
    <GlassPanel 
      variant="intense" 
      blur="lg"
      className={cn('px-6 py-4', className)} 
      {...props}
    >
      {children}
    </GlassPanel>
  )
}

export function GlassSidebar({ children, className, ...props }: Omit<GlassPanelProps, 'variant'>) {
  return (
    <GlassPanel 
      variant="subtle"
      blur="xl" 
      className={cn('h-full', className)}
      {...props}
    >
      {children}
    </GlassPanel>
  )
}

export function GlassModal({ children, className, ...props }: Omit<GlassPanelProps, 'variant'>) {
  return (
    <GlassPanel 
      variant="accent"
      glow
      shadow="xl"
      className={cn('p-8 max-w-2xl mx-auto', className)}
      {...props}
    >
      {children}
    </GlassPanel>
  )
}