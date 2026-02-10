"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Menu, User, Search, LogOut, Settings, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getNotifications, getCurrentUser, signOut, markAllNotificationsRead } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

interface UserData {
  id: string
  email?: string
  full_name?: string
  user_metadata?: {
    full_name?: string
  }
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    loadNotifications()
    loadCurrentUser()
  }, [])

  const loadNotifications = async () => {
    try {
      const data = await getNotifications({ limit: 10 })
      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
      setNotifications([])
    } finally {
      setLoadingNotifications(false)
    }
  }

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser()
      setCurrentUser(user)
    } catch (error) {
      console.error('Error loading current user:', error)
      setLoadingUser(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Error marking all notifications read:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const userInitials = currentUser?.user_metadata?.full_name 
    ? getInitials(currentUser.user_metadata.full_name)
    : currentUser?.email 
      ? getInitials(currentUser.email.split('@')[0])
      : 'ПО'

  const userName = currentUser?.user_metadata?.full_name 
    || currentUser?.full_name 
    || 'Пользователь'

  const userEmail = currentUser?.email || ''

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo & Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm">LP</span>
            </div>
            <span className="hidden sm:inline">LabPro</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/" pathname={pathname}>Дашборд</NavLink>
            <NavLink href="/donors" pathname={pathname}>Доноры</NavLink>
            <NavLink href="/cultures" pathname={pathname}>Культуры</NavLink>
            <NavLink href="/banks" pathname={pathname}>Банки</NavLink>
            <NavLink href="/operations" pathname={pathname}>Операции</NavLink>
            <NavLink href="/qc" pathname={pathname}>QC</NavLink>
            <NavLink href="/inventory" pathname={pathname}>Склад</NavLink>
            <NavLink href="/equipment" pathname={pathname}>Оборудование</NavLink>
            <NavLink href="/references" pathname={pathname}>Справочники</NavLink>
            <NavLink href="/orders" pathname={pathname}>Заявки</NavLink>
            <NavLink href="/tasks" pathname={pathname}>Задачи</NavLink>
            <NavLink href="/audit" pathname={pathname}>Аудит</NavLink>
            <NavLink href="/scan" pathname={pathname}>QR</NavLink>
          </nav>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-9"
            />
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Уведомления
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={handleMarkAllRead}>
                    Прочитать все
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {loadingNotifications ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Нет уведомлений
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3">
                    <div className="flex items-center gap-2 w-full">
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                      )}
                      <span className="font-medium">{notification.title}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{notification.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/notifications" className="w-full text-center text-blue-600">
                  Все уведомления
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                    {loadingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{loadingUser ? 'Загрузка...' : userName}</span>
                  {userEmail && (
                    <span className="text-xs text-muted-foreground font-normal">{userEmail}</span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Профиль
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs">LP</span>
              </div>
              LabPro
            </SheetTitle>
            <SheetDescription className="sr-only">Навигация</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-3 overflow-y-auto">
            <MobileNavLink href="/" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Дашборд</MobileNavLink>
            <MobileNavLink href="/donors" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Доноры</MobileNavLink>
            <MobileNavLink href="/cultures" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Культуры</MobileNavLink>
            <MobileNavLink href="/banks" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Банки</MobileNavLink>
            <MobileNavLink href="/operations" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Операции</MobileNavLink>
            <MobileNavLink href="/qc" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>QC</MobileNavLink>
            <MobileNavLink href="/inventory" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Склад</MobileNavLink>
            <MobileNavLink href="/equipment" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Оборудование</MobileNavLink>
            <MobileNavLink href="/references" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Справочники</MobileNavLink>
            <MobileNavLink href="/orders" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Заявки</MobileNavLink>
            <MobileNavLink href="/tasks" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Задачи</MobileNavLink>
            <MobileNavLink href="/audit" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Аудит</MobileNavLink>
            <MobileNavLink href="/documents" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Документы</MobileNavLink>
            <MobileNavLink href="/scan" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>QR-сканер</MobileNavLink>
            <MobileNavLink href="/users" pathname={pathname} onClick={() => setMobileMenuOpen(false)}>Пользователи</MobileNavLink>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  )
}

function NavLink({ href, pathname, children }: { href: string; pathname: string; children: React.ReactNode }) {
  const invPaths = ['/inventory', '/ready-media']
  const refPaths = ['/references']
  const eqPaths = ['/equipment']
  const isActive = href === '/inventory'
    ? invPaths.some(p => pathname === p || pathname.startsWith(p + '/'))
    : href === '/references'
      ? refPaths.some(p => pathname === p || pathname.startsWith(p + '/'))
      : href === '/equipment'
        ? eqPaths.some(p => pathname === p || pathname.startsWith(p + '/'))
        : pathname === href || pathname.startsWith(href + '/')
  
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ href, pathname, onClick, children }: { href: string; pathname: string; onClick: () => void; children: React.ReactNode }) {
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href + '/'))

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
