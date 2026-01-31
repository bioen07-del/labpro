import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { Plus, Search, Filter, FlaskConical } from 'lucide-react'
import Link from 'next/link'

// Mock QC tests data
const mockQCTests = [
  {
    id: '1',
    target_type: 'BANK',
    target_id: 'bank-1',
    test_type: 'MYCOPLASMA',
    status: 'PENDING',
    created_at: '2026-01-28T10:00:00Z',
    culture: { name: 'MSC-001' }
  },
  {
    id: '2',
    target_type: 'BANK',
    target_id: 'bank-1',
    test_type: 'STERILITY',
    status: 'IN_PROGRESS',
    created_at: '2026-01-26T10:00:00Z',
    culture: { name: 'MSC-001' }
  },
  {
    id: '3',
    target_type: 'BANK',
    target_id: 'bank-2',
    test_type: 'LAL',
    status: 'COMPLETED',
    result: 'PASSED',
    created_at: '2026-01-20T10:00:00Z',
    culture: { name: 'CHONDRO-001' }
  }
]

export default function QCTestsPage() {
  const pendingTests = mockQCTests.filter(t => t.status === 'PENDING')
  const inProgressTests = mockQCTests.filter(t => t.status === 'IN_PROGRESS')
  const completedTests = mockQCTests.filter(t => t.status === 'COMPLETED')

  const getTestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      MYCOPLASMA: 'Микоплазма',
      STERILITY: 'Стерильность',
      LAL: 'LAL-тест',
      VIA: 'VIA'
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string, result?: string) => {
    if (status === 'COMPLETED') {
      return result === 'PASSED' 
        ? <Badge variant="default">Пройден</Badge>
        : <Badge variant="destructive">Не пройден</Badge>
    }
    if (status === 'IN_PROGRESS') {
      return <Badge variant="secondary">В процессе</Badge>
    }
    return <Badge variant="outline">Ожидает</Badge>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">QC-тесты</h1>
          <p className="text-muted-foreground">Контроль качества культур и материалов</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Назначить тест
        </Button>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Ожидают ({pendingTests.length})</TabsTrigger>
          <TabsTrigger value="in_progress">В процессе ({inProgressTests.length})</TabsTrigger>
          <TabsTrigger value="completed">Завершённые ({completedTests.length})</TabsTrigger>
          <TabsTrigger value="all">Все</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Тесты, ожидающие выполнения
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип теста</TableHead>
                    <TableHead>Объект</TableHead>
                    <TableHead>Дата создания</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTests.map(test => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        {getTestTypeLabel(test.test_type)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/banks/${test.target_id}`} className="hover:underline">
                          {test.culture?.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(test.created_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>{getStatusBadge(test.status)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Начать</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingTests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Нет тестов, ожидающих выполнения
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in_progress">
          <Card>
            <CardHeader>
              <CardTitle>Тесты в процессе выполнения</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип теста</TableHead>
                    <TableHead>Объект</TableHead>
                    <TableHead>Дата начала</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inProgressTests.map(test => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        {getTestTypeLabel(test.test_type)}
                      </TableCell>
                      <TableCell>{test.culture?.name}</TableCell>
                      <TableCell>
                        {new Date(test.created_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>{getStatusBadge(test.status)}</TableCell>
                      <TableCell>
                        <Button size="sm">Внести результат</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {inProgressTests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Нет тестов в процессе
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Завершённые тесты</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип теста</TableHead>
                    <TableHead>Объект</TableHead>
                    <TableHead>Дата завершения</TableHead>
                    <TableHead>Результат</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedTests.map(test => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        {getTestTypeLabel(test.test_type)}
                      </TableCell>
                      <TableCell>{test.culture?.name}</TableCell>
                      <TableCell>
                        {new Date(test.created_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>{getStatusBadge(test.status, test.result)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Детали</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {completedTests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Нет завершённых тестов
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Поиск..." className="pl-9" />
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
                    <TableHead>Тип теста</TableHead>
                    <TableHead>Объект</TableHead>
                    <TableHead>Тип объекта</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockQCTests.map(test => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        {getTestTypeLabel(test.test_type)}
                      </TableCell>
                      <TableCell>{test.culture?.name}</TableCell>
                      <TableCell>{test.target_type}</TableCell>
                      <TableCell>{getStatusBadge(test.status, test.result)}</TableCell>
                      <TableCell>
                        {new Date(test.created_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Открыть</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
