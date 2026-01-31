"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Beaker,
  User,
  FileText
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
import { getCultureTypes, getDonors, createCulture, createLot } from '@/lib/api'

function CultureForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const donorId = searchParams.get('donor_id')
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cultureTypes, setCultureTypes] = useState<any[]>([])
  const [donors, setDonors] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [typeId, setTypeId] = useState('')
  const [donorIdState, setDonorIdState] = useState(donorId || '')
  const [description, setDescription] = useState('')
  const [passageNumber, setPassageNumber] = useState(1)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [typesData, donorsData] = await Promise.all([
        getCultureTypes(),
        getDonors()
      ])
      setCultureTypes(typesData || [])
      setDonors(donorsData || [])
      
      // Auto-select first type
      if (typesData?.length > 0 && !typeId) {
        setTypeId(typesData[0].id)
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!name || !typeId) {
      setError('Заполните обязательные поля')
      return
    }
    
    setSubmitting(true)
    setError(null)
    
    try {
      // Create culture
      const culture = {
        name,
        type_id: typeId,
        donor_id: donorIdState || null,
        status: 'ACTIVE',
        description,
        coefficient: null,
      }
      
      const createdCulture = await createCulture(culture)
      
      // Create initial lot
      const lot = {
        culture_id: createdCulture.id,
        passage_number: passageNumber,
        status: 'ACTIVE',
        start_date: new Date().toISOString().split('T')[0],
        notes: notes || null,
      }
      
      await createLot(lot)
      
      setSuccess(true)
      setTimeout(() => router.push(`/cultures/${createdCulture.id}`), 2000)
    } catch (err: any) {
      setError(err.message || 'Ошибка создания культуры')
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
              <h2 className="text-xl font-semibold mb-2">Культура создана</h2>
              <p className="text-muted-foreground">
                Культура "{name}" и лот P{passageNumber} успешно созданы
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cultures"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Новая культура</h1>
          <p className="text-muted-foreground">Создание клеточной культуры и лота</p>
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
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
              <CardDescription>Параметры новой культуры</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Название культуры *</Label>
                  <Input
                    id="name"
                    placeholder="MSC-001"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Тип культуры *</Label>
                  <Select value={typeId} onValueChange={setTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {cultureTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  placeholder="Описание культуры, источник, особые характеристики..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Donor Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Донор</CardTitle>
              <CardDescription>Связь с донором (необязательно)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="donor">Донор ткани</Label>
                <Select value={donorIdState} onValueChange={setDonorIdState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Без донора" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Без донора</SelectItem>
                    {donors.map((donor) => (
                      <SelectItem key={donor.id} value={donor.id}>
                        {donor.code} — {donor.tissue_type || 'Не указано'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {donorIdState && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    Культура будет связана с выбранным донором
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Initial Lot */}
          <Card>
            <CardHeader>
              <CardTitle>Первичный лот</CardTitle>
              <CardDescription>Создание первого лота культуры</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="passage">Номер пассажа</Label>
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
                  <span className="text-sm text-muted-foreground">Название</span>
                  <span className="font-medium">{name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Тип</span>
                  <Badge variant="outline">
                    {cultureTypes.find(t => t.id === typeId)?.code || '-'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Донор</span>
                  <span className="font-medium">
                    {donors.find(d => d.id === donorIdState)?.code || 'Нет'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Пассаж</span>
                  <span className="font-medium">P{passageNumber}</span>
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
                disabled={!name || !typeId || submitting}
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Создание...</>
                ) : (
                  <><Beaker className="mr-2 h-4 w-4" />Создать культуру</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Информация</AlertTitle>
            <AlertDescription>
              При создании культуры автоматически будет создан первичный лот с указанным номером пассажа.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="container py-6 flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function NewCulturePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CultureForm />
    </Suspense>
  )
}
