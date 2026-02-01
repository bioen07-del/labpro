"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, UserCog, Mail, Shield, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { getUsers } from '@/lib/api'

interface User {
  id: string
  username: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUsers()
      setUsers(data || [])
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Не удалось загрузить пользователей')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      OPERATOR: 'default',
      LABORANT: 'secondary',
      MANAGER: 'secondary',
      QC_ADMIN: 'outline',
      ADMIN: 'outline'
    }
    const labels: Record<string, string> = {
      OPERATOR: 'Оператор',
      LABORANT: 'Лаборант',
      MANAGER: 'Менеджер',
      QC_ADMIN: 'QC-специалист',
      ADMIN: 'Администратор'
    }
    return <Badge variant={variants[role] || 'outline'}>{labels[role] || role}</Badge>
  }

  const handleAddUser = () => {
    // Navigate to add user page or open modal
    window.location.href = '/users/new'
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Пользователи</h1>
          <p className="text-muted-foreground">Управление пользователями системы</p>
        </div>
        <Button onClick={handleAddUser}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить пользователя
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? 'Загрузка...' : `Найдено пользователей: ${users.length}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              {error}
              <Button variant="outline" className="ml-4" onClick={loadUsers}>
                Повторить
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">@{user.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Активен' : 'Заблокирован'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Shield className="mr-1 h-3 w-3" />
                        Изменить роль
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Пользователи не найдены
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
