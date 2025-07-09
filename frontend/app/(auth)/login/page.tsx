import LoginForm from '@/components/auth/login-form'
import { FloatingBackground } from '@/components/ui/FloatingBackground'
import { GlassPanel } from '@/components/ui/GlassPanel'

export default function LoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <GlassPanel className="w-full max-w-md">
          <LoginForm />
        </GlassPanel>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Sign In - Breslev Torah Online',
  description: 'Sign in to your Breslev Torah account',
}