'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Beaker
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCultures, createLot, createContainer, getContainerTypes } from '@/lib/api'

export default function NewLotPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cultures, setCultures] = useState<any[]>([])
  const [containerTypes, setContainerTypes] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [selectedCultureId, setSelectedCultureId] = useState('')
  const [passageNumber, setPassageNumber] = useState(1)
  const [containerTypeId, setContainerTypeId] = useState('')
  const [containerCount, setContainerCount] = useState(1)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [culturesData, typesData] = await Promise.all([
        getCultures({ status: 'ACTIVE' }),
        getContainerTypes()
      ])
      setCultures(culturesData || [])
      setContainerTypes(typesData || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedCultureId) {
      setError('Выберите культуру')
      return
    }
    
    setSubmitting(true)
    setError(null)
    
    try {
      const culture = cultures.find(c => c.id === selectedCultureId)
      
      // Create lot
      const lot = {
        culture_id: selectedCultureId,
        passage_number: passageNumber,
        status: 'ACTIVE',
        start_date: new Date().toISOString().split('T')[0],
        notes: notes || null,
      }
      
      const createdLot = await createLot(lot)
      
      // Create containers
      for (let i = 0; i < containerCount; i++) {
        const container = {
          lot_id: createdLot.id,
          code: `${culture?.code || 'CT'}-${createdLot.id.slice(0, 4)}-P${passageNumber}-${i + 1}`,
          type_id: containerTypeId || null,
          status: 'ACTIVE',
          confluent_percent: 0,
        }
        await createContainer(container)
      }
      
      setSuccess(true)
      setTimeout(() => router.push(`/lots/${createdLot.id}`), 2000)
    } catch (err: any) {
      setError(err.message || 'Ошибка создания лота')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="container py-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Лот создан</h2>
              <p className="text-muted-foreground">
                Лот P{passageNumber} с {containerCount} контейнерами успешно создан
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const selectedCulture = cultures.find(c => c.id === selectedCultureId)

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/lots"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Новый лот</h1>
          <p className="text-muted-foreground">Создание лота для культуры</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Culture Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Культура</CardTitle>
              <CardDescription>Выберите культуру для нового лота</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="culture">Культура *</Label>
                <Select value={selectedCultureId} onValueChange={setSelectedCultureId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите культуру" />
                  </SelectTrigger>
                  <SelectContent>
                    {cultures.map((culture) => (
                      <SelectItem key={culture.id} value={culture.id}>
                        {culture.name} ({culture.culture_type?.code || '—'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedCulture && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Beaker className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-700">{selectedCulture.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">Тип: {selectedCulture.culture_type?.code}</Badge>
                    <Badge variant="outline">Пассаж: P{selectedCulture.passage_number || 0}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lot Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Параметры лота</CardTitle>
              <CardDescription>Номер пассажа и дата</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="passage">Номер пассажа *</Label>
                  <Input
                    id="passage"
                    type="number"
                    min={1}
                    value={passageNumber}
                    onChange={(e) => setPassageNumber(parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Дата начала</Label>
                  <Input
                    type="date"
                    value={new Date().toISOString().split('T')[0]}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lotNotes">Примечания к лоту</Label>
                <Textarea
                  id="lotNotes"
                  placeholder="Условия культивирования, особые отметки..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Containers */}
          <Card>
            <CardHeader>
              <CardTitle>Контейнеры</CardTitle>
              <CardDescription>Создание контейнеров для лота</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="containerType">Тип контейнера</Label>
                  <Select value={containerTypeId} onValueChange={setContainerTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {containerTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="containerCount">Количество</Label>
                  <Input
                    id="containerCount"
                    type="number"
                    min={1}
                    max={10}
                    value={containerCount}
                    onChange={(e) => setContainerCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Сводка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Культура</span>
                  <span className="font-medium text-sm">{selectedCulture?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Пассаж</span>
                  <Badge variant="outline">P{passageNumber}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Контейнеры</span>
                  <span className="font-medium">{containerCount} шт.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Тип</span>
                  <span className="text-sm">
                    {containerTypes.find(t => t.id === containerTypeId)?.name || '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleSubmit} 
                disabled={!selectedCultureId || submitting}
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Создание...</>
                ) : (
                  <><Beaker className="mr-2 h-4 w-4" />Создать лот</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Alert>
            <AlertTitle>Информация</AlertTitle>
            <AlertDescription>
              Будет создан лот с указанным номером пассажа и контейнеры для культивирования.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}
