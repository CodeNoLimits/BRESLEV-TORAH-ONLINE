'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  
  const { register, isLoading, error } = useAuthStore()
  const router = useRouter()

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validatePassword = (password: string) => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('At least 8 characters')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('One uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('One lowercase letter')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('One number')
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('One special character')
    }
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    
    // Validation
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters'
    }
    
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email'
    }
    
    if (!formData.password) {
      errors.password = 'Password is required'
    } else {
      const passwordErrors = validatePassword(formData.password)
      if (passwordErrors.length > 0) {
        errors.password = `Password must have: ${passwordErrors.join(', ')}`
      }
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    
    try {
      await register(
        formData.email,
        formData.password,
        formData.name.trim(),
        formData.confirmPassword
      )
      
      // Redirect to home or intended page
      const searchParams = new URLSearchParams(window.location.search)
      const redirect = searchParams.get('redirect') || '/'
      router.push(redirect)
    } catch (error) {
      // Error is handled by the store
      console.error('Registration error:', error)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Join Our Community</CardTitle>
        <CardDescription>
          Create your account to start your spiritual journey
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`pl-10 ${fieldErrors.name ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
            </div>
            {fieldErrors.name && (
              <p className="text-sm text-red-500">{fieldErrors.name}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`pl-10 ${fieldErrors.email ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-sm text-red-500">{fieldErrors.email}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className={`pl-10 pr-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-sm text-red-500">{fieldErrors.password}</p>
            )}
            
            {/* Password strength indicator */}
            {formData.password && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1">
                  {formData.password.length >= 8 ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                  )}
                  <span className={formData.password.length >= 8 ? 'text-green-500' : 'text-muted-foreground'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/[A-Z]/.test(formData.password) ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                  )}
                  <span className={/[A-Z]/.test(formData.password) ? 'text-green-500' : 'text-muted-foreground'}>
                    One uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/[0-9]/.test(formData.password) ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                  )}
                  <span className={/[0-9]/.test(formData.password) ? 'text-green-500' : 'text-muted-foreground'}>
                    One number
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className={`pl-10 pr-10 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-sm text-red-500">{fieldErrors.confirmPassword}</p>
            )}
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}