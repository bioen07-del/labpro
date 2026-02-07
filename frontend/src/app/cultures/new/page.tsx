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
  FileText,
  Plus,
  Trash2,
  FlaskConical
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
import {
  getCultureTypes,
  getDonors,
  getDonations,
  getContainerTypes,
  getPositions,
  createCulture,
  createLot,
  createContainer
} from '@/lib/api'

const PROCESSING_METHODS = [
  { value: 'ENZYMATIC', label: 'Ферментативная обработка' },
  { value: 'MECHANICAL', label: 'Механическая обработка' },
  { value: 'EXPLANT', label: 'Метод эксплантов' },
  { value: 'DENSITY_GRADIENT', label: 'Градиент плотности' },
  { value: 'FICOLL', label: 'Фиколл-градиент' },
  { value: 'DIRECT_PLATING', label: 'Прямой посев' },
  { value: 'OTHER', label: 'Другое' },
]

function CultureForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const donorId = searchParams.get('donor_id')
  const donationIdParam = searchParams.get('donation_id')

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cultureTypes, setCultureTypes] = useState<any[]>([])
  const [containerTypes, setContainerTypes] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [donors, setDonors] = useState<any[]>([])
  const [donorDonations, setDonorDonations] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [typeId, setTypeId] = useState('')
  const [donorIdState, setDonorIdState] = useState(donorId || '')
  const [donationIdState, setDonationIdState] = useState(donationIdParam || '')
  const [processingMethod, setProcessingMethod] = useState('')
  const [notes, setNotes] = useState('')

  // P0 Containers
  const [p0Containers, setP0Containers] = useState<Array<{
    id: number
    containerTypeId: string
    positionId: string
    quantity: number
  }>>([
    { id: 1, containerTypeId: '', positionId: '', quantity: 1 }
  ])

  useEffect(() => {
    loadData()
  }, [])

  // Load donations when donor changes
  useEffect(() => {
    if (donorIdState) {
      loadDonorDonations(donorIdState)
    } else {
      setDonorDonations([])
      setDonationIdState('')
    }
  }, [donorIdState])

  const loadData = async () => {
    setLoading(true)
    try {
      const [typesData, donorsData, containerTypesData, positionsData] = await Promise.all([
        getCultureTypes(),
        getDonors(),
        getContainerTypes(),
        getPositions({ is_active: true })
      ])
      setCultureTypes(typesData || [])
      setDonors(donorsData || [])
      setContainerTypes(containerTypesData || [])
      setPositions(positionsData || [])

      // If donor_id came from URL, load donations immediately
      if (donorId) {
        await loadDonorDonations(donorId)
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const loadDonorDonations = async (dId: string) => {
    try {
      const data = await getDonations({ donor_id: dId, status: 'APPROVED' })
      setDonorDonations(data || [])
    } catch (err) {
      console.error('Error loading donations:', err)
      setDonorDonations([])
    }
  }

  const selectedDonation = donorDonations.find((d: any) => d.id === donationIdState)
  const selectedCultureType = cultureTypes.find(t => t.id === typeId)

  const totalContainers = p0Containers.reduce((sum, c) => sum + c.quantity, 0)

  const addP0Container = () => {
    setP0Containers([...p0Containers, {
      id: Date.now(),
      containerTypeId: containerTypes[0]?.id || '',
      positionId: '',
      quantity: 1
    }])
  }

  const removeP0Container = (id: number) => {
    if (p0Containers.length <= 1) return
    setP0Containers(p0Containers.filter(c => c.id !== id))
  }

  const updateP0Container = (id: number, field: string, value: string | number) => {
    setP0Containers(p0Containers.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  const handleSubmit = async () => {
    if (!typeId || !donorIdState || !donationIdState) {
      setError('Выберите тип культуры, донора и донацию')
      return
    }
    if (!processingMethod) {
      setError('Укажите метод обработки ткани')
      return
    }
    if (p0Containers.some(c => !c.containerTypeId)) {
      setError('Выберите тип для всех контейнеров')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // 1. Create culture (name auto-generated from culture type code)
      const cultureData: Record<string, unknown> = {
        name: `${selectedCultureType?.code || 'CULT'}-AUTO`,
        type_id: typeId,
        donor_id: donorIdState,
        donation_id: donationIdState,
        processing_method: processingMethod,
        status: 'ACTIVE',
        passage_number: 0,
        notes: notes || null,
      }

      const createdCulture = await createCulture(cultureData)

      const cultureCode = `${selectedCultureType?.code || 'CULT'}-${String(createdCulture.id).substring(0, 8).toUpperCase()}`

      // 2. Create initial lot (P0)
      const lotData: Record<string, unknown> = {
        culture_id: createdCulture.id,
        passage_number: 0,
        status: 'ACTIVE',
        seeded_at: new Date().toISOString(),
        notes: `Первичная культура. Обработка: ${PROCESSING_METHODS.find(m => m.value === processingMethod)?.label || processingMethod}`,
      }

      const createdLot = await createLot(lotData)

      // 3. Create P0 containers
      let containerIndex = 0
      for (const p0 of p0Containers) {
        const cType = containerTypes.find(t => t.id === p0.containerTypeId)
        for (let i = 0; i < p0.quantity; i++) {
          containerIndex++
          const containerCode = `CT-${cultureCode}-P0-${cType?.code || 'XX'}-${String(containerIndex).padStart(3, '0')}`

          await createContainer({
            lot_id: createdLot.id,
            container_type_id: p0.containerTypeId,
            position_id: p0.positionId || null,
            container_status: 'IN_CULTURE',
            passage_count: 0,
            confluent_percent: 5,
            code: containerCode,
            qr_code: `CNT:${containerCode}`,
            seeded_at: new Date().toISOString(),
          })
        }
      }

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
                Первичная культура P0 и {totalContainers} контейнер(ов) успешно созданы
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
          <h1 className="text-2xl font-bold">Формирование первичной культуры</h1>
          <p className="text-muted-foreground">Донация &rarr; Обработка &rarr; Рассев в контейнеры (P0)</p>
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
          {/* Step 1: Donor & Donation Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                1. Донор и донация
              </CardTitle>
              <CardDescription>Выберите донора, затем одобренную донацию</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="donor">Донор *</Label>
                <Select value={donorIdState} onValueChange={(v) => { setDonorIdState(v); setDonationIdState('') }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите донора" />
                  </SelectTrigger>
                  <SelectContent>
                    {donors.map((donor) => {
                      const fullName = [donor.last_name, donor.first_name, donor.middle_name].filter(Boolean).join(' ')
                      return (
                        <SelectItem key={donor.id} value={donor.id}>
                          {donor.code} — {fullName || 'ФИО не указано'}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {donorIdState && (
                <div className="space-y-2">
                  <Label htmlFor="donation">Донация (только одобренные) *</Label>
                  {donorDonations.length === 0 ? (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                      У донора нет одобренных донаций. Сначала создайте донацию и дождитесь результатов инфекционных тестов.
                    </div>
                  ) : (
                    <Select value={donationIdState} onValueChange={setDonationIdState}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите донацию" />
                      </SelectTrigger>
                      <SelectContent>
                        {donorDonations.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.code} — {d.collected_at} {d.tissue_type?.name ? `(${d.tissue_type.name})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {selectedDonation && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                  <p className="text-sm font-medium text-blue-800">Информация о донации</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                    <div>Тип ткани: <span className="font-medium">{selectedDonation.tissue_type?.name || '—'}</span></div>
                    <div>Форма: <span className="font-medium">{selectedDonation.tissue_form === 'SOLID' ? 'Твёрдая' : 'Жидкая'}</span></div>
                    {selectedDonation.tissue_volume_ml && (
                      <div>Объём: <span className="font-medium">{selectedDonation.tissue_volume_ml} мл</span></div>
                    )}
                    {selectedDonation.tissue_weight_g && (
                      <div>Масса: <span className="font-medium">{selectedDonation.tissue_weight_g} г</span></div>
                    )}
                    <div>
                      Статус: <Badge variant="outline" className="ml-1 text-green-700 border-green-300">
                        APPROVED
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Culture Type & Processing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                2. Тип культуры и обработка
              </CardTitle>
              <CardDescription>Укажите тип клеточной культуры и способ обработки ткани</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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

                <div className="space-y-2">
                  <Label htmlFor="processing">Метод обработки ткани *</Label>
                  <Select value={processingMethod} onValueChange={setProcessingMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите метод" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROCESSING_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedCultureType && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <FlaskConical className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    Код культуры будет сгенерирован автоматически: {selectedCultureType.code}-XXXXXXXX
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: P0 Containers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                3. Контейнеры для рассева (P0)
              </CardTitle>
              <CardDescription>
                Укажите культуральную посуду для первичного рассева клеток
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {p0Containers.map((container, index) => (
                <div key={container.id} className="flex gap-3 items-end p-3 border rounded-lg">
                  <div className="w-10 text-sm font-medium text-center">
                    #{index + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">Тип контейнера *</Label>
                    <Select
                      value={container.containerTypeId}
                      onValueChange={(v) => updateP0Container(container.id, 'containerTypeId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        {containerTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} {type.surface_area_cm2 ? `(${type.surface_area_cm2} см\u00B2)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-2">
                    <Label className="text-xs">Кол-во</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={container.quantity}
                      onChange={(e) => updateP0Container(container.id, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">Позиция</Label>
                    <Select
                      value={container.positionId}
                      onValueChange={(v) => updateP0Container(container.id, 'positionId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Авто" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map(pos => (
                          <SelectItem key={pos.id} value={pos.id}>
                            {pos.path || pos.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeP0Container(container.id)}
                    disabled={p0Containers.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addP0Container}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить тип посуды
              </Button>

              <div className="text-sm text-muted-foreground">
                Итого контейнеров: <span className="font-medium">{totalContainers}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Примечания</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Условия культивирования, особые отметки..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Сводка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Донор</span>
                <span className="font-medium text-sm">
                  {donors.find(d => d.id === donorIdState)?.code || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Донация</span>
                <span className="font-medium text-sm">
                  {donorDonations.find((d: any) => d.id === donationIdState)?.code || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Тип ткани</span>
                <span className="font-medium text-sm">
                  {selectedDonation?.tissue_type?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Тип культуры</span>
                <Badge variant="outline">
                  {selectedCultureType?.code || '—'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Обработка</span>
                <span className="font-medium text-sm">
                  {PROCESSING_METHODS.find(m => m.value === processingMethod)?.label || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Пассаж</span>
                <Badge>P0</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Контейнеров</span>
                <span className="font-medium text-sm">{totalContainers}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={!typeId || !donorIdState || !donationIdState || !processingMethod || submitting}
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Создание...</>
                ) : (
                  <><Beaker className="mr-2 h-4 w-4" />Создать культуру P0</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Процесс</AlertTitle>
            <AlertDescription>
              Будут созданы: культура, лот P0 и {totalContainers} контейнер(ов) для первичного рассева.
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
