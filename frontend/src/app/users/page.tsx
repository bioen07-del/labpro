import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { Plus, UserCog, Mail, Shield } from 'lucide-react'

// Mock users
const mockUsers = [
  {
    id: '1',
    username: 'operator1',
    email: 'operator@labpro.ru',
    full_name: 'Иванов Иван Иванович',
    role: 'OPERATOR',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: '2',
    username: 'laborant1',
    email: 'laborant@labpro.ru',
    full_name: 'Петрова Анна Сергеевна',
    role: 'LABORANT',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: '3',
    username: 'manager1',
    email: 'manager@labpro.ru',
    full_name: 'Сидоров Алексей Петрович',
    role: 'MANAGER',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: '4',
    username: 'qc_admin',
    email: 'qc@labpro.ru',
    full_name: 'Козлова Елена Николаевна',
    role: 'QC_ADMIN',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: '5',
    username: 'admin',
    email: 'admin@labpro.ru',
    full_name: 'Администратор Системы',
    role: 'ADMIN',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z'
  }
]

export default function UsersPage() {
  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      OPERATOR: 'default',
      LABORANT: 'secondary',
      MANAGER: 'secondary',
      QC_ADMIN: 'outline',
      ADMIN: 'destructive'
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Пользователи</h1>
          <p className="text-muted-foreground">Управление пользователями системы</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Добавить пользователя
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
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
              {mockUsers.map(user => (
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
