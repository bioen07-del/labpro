import { getLots } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { Plus, Search, Filter } from 'lucide-react'
import Link from 'next/link'

export default async function LotsPage() {
  const lots = await getLots()

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Лоты</h1>
          <p className="text-muted-foreground">Управление лотами культур</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Создать лот
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск по коду культуры..." className="pl-9" />
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
                <TableHead>Культура</TableHead>
                <TableHead>Номер лота</TableHead>
                <TableHead>Пассаж</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Контейнеров</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell>
                    <Link href={`/cultures/${lot.culture_id}`} className="hover:underline">
                      {lot.culture?.name || lot.culture_id}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/lots/${lot.id}`} className="hover:underline text-primary">
                      L{lot.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>P{lot.passage_number}</TableCell>
                  <TableCell>
                    <Badge variant={
                      lot.status === 'ACTIVE' ? 'default' :
                      lot.status === 'DISPOSE' ? 'destructive' : 'secondary'
                    }>
                      {lot.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{lot.containers?.length || 0}</TableCell>
                  <TableCell>{new Date(lot.created_at).toLocaleDateString('ru-RU')}</TableCell>
                  <TableCell>
                    <Link href={`/lots/${lot.id}`}>
                      <Button variant="ghost" size="sm">Открыть</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {lots.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Лоты не найдены
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
