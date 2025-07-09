import RegisterForm from '@/components/auth/register-form'
import { FloatingBackground } from '@/components/ui/FloatingBackground'
import { GlassPanel } from '@/components/ui/GlassPanel'

export default function RegisterPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <GlassPanel className="w-full max-w-md">
          <RegisterForm />
        </GlassPanel>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Sign Up - Breslev Torah Online',
  description: 'Create your Breslev Torah account',
}