"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, Loader2, AlertCircle, User, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { signIn } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(email, password)
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка входа')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    setError('')

    try {
      await signIn('admin@labpro.local', 'demo1234')
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError('Демо-аккаунт не существует. Создайте его в Supabase Dashboard → Authentication → Users → Add User')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (role: string, roleEmail: string) => {
    setLoading(true)
    setError('')

    try {
      await signIn(roleEmail, 'demo1234')
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(`Аккаунт ${role} не существует в Supabase Auth. ${err.message || ''}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white mb-4">
            <FlaskConical className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">LabPro</h1>
          <p className="text-gray-600 mt-1">Система управления клеточными банками</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Вход в систему</CardTitle>
            <CardDescription className="text-center">
              Введите ваши учётные данные для доступа к системе
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Вход...
                  </>
                ) : (
                  'Войти'
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">или</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleDemoLogin}
              type="button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вход...
                </>
              ) : (
                'Войти как демо-пользователь'
              )}
            </Button>

            <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Быстрый вход (Supabase Auth)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickLogin('Администратор', 'admin@labpro.local')}
                  disabled={loading}
                  className="text-xs"
                >
                  <User className="h-3 w-3 mr-1" />
                  Админ
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickLogin('Оператор 1', 'operator1@labpro.local')}
                  disabled={loading}
                  className="text-xs"
                >
                  <User className="h-3 w-3 mr-1" />
                  Оператор 1
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickLogin('Лаборант', 'laborant1@labpro.local')}
                  disabled={loading}
                  className="text-xs"
                >
                  <User className="h-3 w-3 mr-1" />
                  Лаборант
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickLogin('Менеджер', 'manager1@labpro.local')}
                  disabled={loading}
                  className="text-xs"
                >
                  <User className="h-3 w-3 mr-1" />
                  Менеджер
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Пароль: demo1234 | См. seed.sql
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          © 2026 LabPro. Все права защищены.
        </p>
      </div>
    </div>
  )
}
