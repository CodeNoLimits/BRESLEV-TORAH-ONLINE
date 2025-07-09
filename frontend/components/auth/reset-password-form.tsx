'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'

export default function ResetPasswordForm() {
  const [mode, setMode] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  
  const { forgotPassword, resetPassword, isLoading, error } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      setMode('reset')
    }
  }, [token])

  const handleChange = (field: string, value: string) => {
    if (field === 'email') {
      setEmail(value)
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
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

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    
    // Validation
    const errors: Record<string, string> = {}
    
    if (!email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email'
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    
    try {
      await forgotPassword(email)
      setSuccess(true)
    } catch (error) {
      console.error('Password reset request error:', error)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    
    if (!token) {
      setFieldErrors({ general: 'Invalid reset token' })
      return
    }
    
    // Validation
    const errors: Record<string, string> = {}
    
    if (!formData.newPassword) {
      errors.newPassword = 'Password is required'
    } else {
      const passwordErrors = validatePassword(formData.newPassword)
      if (passwordErrors.length > 0) {
        errors.newPassword = `Password must have: ${passwordErrors.join(', ')}`
      }
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    
    try {
      await resetPassword(token, formData.newPassword, formData.confirmPassword)
      setSuccess(true)
    } catch (error) {
      console.error('Password reset error:', error)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-600">Success!</CardTitle>
          <CardDescription>
            {mode === 'request' 
              ? 'Password reset email sent' 
              : 'Password reset successfully'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {mode === 'request' 
                ? 'Please check your email for password reset instructions.'
                : 'You can now sign in with your new password.'
              }
            </AlertDescription>
          </Alert>
          
          <Button
            onClick={() => router.push('/login')}
            className="w-full"
          >
            Go to Sign In
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {mode === 'request' ? 'Reset Password' : 'Set New Password'}
        </CardTitle>
        <CardDescription>
          {mode === 'request' 
            ? 'Enter your email to receive reset instructions'
            : 'Create a new password for your account'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={mode === 'request' ? handleRequestReset : handleResetPassword} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {fieldErrors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fieldErrors.general}</AlertDescription>
            </Alert>
          )}
          
          {mode === 'request' ? (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`pl-10 ${fieldErrors.email ? 'border-red-500' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-sm text-red-500">{fieldErrors.email}</p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.newPassword}
                    onChange={(e) => handleChange('newPassword', e.target.value)}
                    className={`pl-10 pr-10 ${fieldErrors.newPassword ? 'border-red-500' : ''}`}
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
                {fieldErrors.newPassword && (
                  <p className="text-sm text-red-500">{fieldErrors.newPassword}</p>
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
            </>
          )}
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'request' ? 'Sending...' : 'Resetting...'}
              </>
            ) : (
              mode === 'request' ? 'Send Reset Email' : 'Reset Password'
            )}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}