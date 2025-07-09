import { Suspense } from 'react'
import ResetPasswordForm from '@/components/auth/reset-password-form'
import { FloatingBackground } from '@/components/ui/FloatingBackground'
import { GlassPanel } from '@/components/ui/GlassPanel'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <GlassPanel className="w-full max-w-md">
          <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </GlassPanel>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Reset Password - Breslev Torah Online',
  description: 'Reset your Breslev Torah account password',
}