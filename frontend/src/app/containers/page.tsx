import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { Plus, Search, Filter } from 'lucide-react'
import Link from 'next/link'

// Mock containers
const mockContainers = [
  {
    id: '1',
    code: 'CT-0001-L1-P4-FL-001',
    type: { name: 'T-75' },
    lot_id: 'lot-1',
    lot: { passage_number: 4 },
    status: 'ACTIVE',
    confluent_percent: 85,
    position: { path: 'INC-01/Полка-1/A1' }
  },
  {
    id: '2',
    code: 'CT-0001-L1-P4-FL-002',
    type: { name: 'T-75' },
    lot_id: 'lot-1',
    lot: { passage_number: 4 },
    status: 'ACTIVE',
    confluent_percent: 80,
    position: { path: 'INC-01/Полка-1/A2' }
  }
]

export default function ContainersPage() {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ACTIVE: 'default',
      IN_BANK: 'secondary',
      DISPOSE: 'destructive'
    }
    return <Badge variant={variants[status] || 'outline'}>
      {status === 'ACTIVE' ? 'В культуре' : status === 'IN_BANK' ? 'В банке' : 'Утилизирован'}
    </Badge>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Контейнеры</h1>
          <p className="text-muted-foreground">Управление контейнерами культур</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Создать контейнер
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск по коду..." className="pl-9 font-mono" />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Фильтр
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Лот</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Конфлюэнтность</TableHead>
                <TableHead>Позиция</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockContainers.map((container) => (
                <TableRow key={container.id}>
                  <TableCell className="font-mono font-medium">
                    <Link href={`/containers/${container.id}`} className="hover:underline text-primary">
                      {container.code}
                    </Link>
                  </TableCell>
                  <TableCell>{container.type?.name}</TableCell>
                  <TableCell>
                    <Link href={`/lots/${container.lot_id}`} className="hover:underline">
                      L{container.lot?.passage_number}
                    </Link>
                  </TableCell>
                  <TableCell>{getStatusBadge(container.status)}</TableCell>
                  <TableCell>
                    {container.confluent_percent ? `${container.confluent_percent}%` : '—'}
                  </TableCell>
                  <TableCell>
                    {container.position?.path || '—'}
                  </TableCell>
                  <TableCell>
                    <Link href={`/containers/${container.id}`}>
                      <Button variant="ghost" size="sm">Открыть</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {mockContainers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Контейнеры не найдены
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
