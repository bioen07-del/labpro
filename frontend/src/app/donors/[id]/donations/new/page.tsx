"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Beaker,
  FileText,
  Shield
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
import { Checkbox } from '@/components/ui/checkbox'
import { getDonorById, getTissueTypes, createDonation } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function NewDonationPage() {
  const params = useParams()
  const router = useRouter()
  const donorId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [donor, setDonor] = useState<any>(null)
  const [tissueTypes, setTissueTypes] = useState<any[]>([])
  const [createdDonation, setCreatedDonation] = useState<any>(null)

  // Form state
  const [collectedAt, setCollectedAt] = useState(new Date().toISOString().split('T')[0])
  const [tissueTypeId, setTissueTypeId] = useState('')
  const [tissueVolumeMl, setTissueVolumeMl] = useState<number | undefined>()
  const [tissueWeightG, setTissueWeightG] = useState<number | undefined>()
  const [consentReceived, setConsentReceived] = useState(false)
  const [consentDocument, setConsentDocument] = useState('')
  const [contractNumber, setContractNumber] = useState('')
  const [contractDate, setContractDate] = useState('')
  const [infHiv, setInfHiv] = useState('PENDING')
  const [infHbv, setInfHbv] = useState('PENDING')
  const [infHcv, setInfHcv] = useState('PENDING')
  const [infSyphilis, setInfSyphilis] = useState('PENDING')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [donorId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [donorData, tissueTypesData] = await Promise.all([
        getDonorById(donorId),
        getTissueTypes(),
      ])
      setDonor(donorData)
      setTissueTypes(tissueTypesData || [])
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const selectedTissueType = tissueTypes.find((t: any) => t.id === tissueTypeId)
  const tissueForm = selectedTissueType?.tissue_form || null

  // Compute status preview
  const getStatusPreview = () => {
    const tests = [infHiv, infHbv, infHcv, infSyphilis]
    if (tests.some(t => t === 'POSITIVE')) return { label: 'Отклонена', color: 'destructive' as const }
    if (tests.every(t => t === 'NEGATIVE')) return { label: 'Одобрена', color: 'default' as const }
    return { label: 'Карантин', color: 'secondary' as const }
  }

  const statusPreview = getStatusPreview()

  const handleSubmit = async () => {
    if (!collectedAt) {
      setError('Укажите дату забора')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const donation = {
        donor_id: donorId,
        collected_at: collectedAt,
        status: 'RECEIVED',
        tissue_type_id: tissueTypeId || null,
        tissue_form: tissueForm,
        tissue_volume_ml: tissueVolumeMl || null,
        tissue_weight_g: tissueWeightG || null,
        consent_received: consentReceived,
        consent_document: consentDocument || null,
        contract_number: contractNumber || null,
        contract_date: contractDate || null,
        inf_hiv: infHiv,
        inf_hbv: infHbv,
        inf_hcv: infHcv,
        inf_syphilis: infSyphilis,
        notes: notes || null,
      }

      const created = await createDonation(donation)
      setCreatedDonation(created)
      setSuccess(true)
      setTimeout(() => router.push(`/donors/${donorId}`), 2000)
    } catch (err: any) {
      setError(err.message || 'Ошибка создания донации')
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
              <h2 className="text-xl font-semibold mb-2">Донация зарегистрирована</h2>
              <p className="text-muted-foreground">
                Код: {createdDonation?.code} | Статус: {statusPreview.label}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Перенаправление на карточку донора...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const donorFullName = donor
    ? [donor.last_name, donor.first_name, donor.middle_name].filter(Boolean).join(' ')
    : ''

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/donors/${donorId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Новая донация</h1>
          <p className="text-muted-foreground">
            Донор: {donorFullName} ({donor?.code})
          </p>
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
          {/* Collection Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Данные забора
              </CardTitle>
              <CardDescription>Информация о полученном биоматериале</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="collectedAt">Дата забора *</Label>
                  <Input
                    id="collectedAt"
                    type="date"
                    value={collectedAt}
                    onChange={(e) => setCollectedAt(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tissueTypeId">Тип ткани</Label>
                  <Select value={tissueTypeId} onValueChange={setTissueTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип ткани" />
                    </SelectTrigger>
                    <SelectContent>
                      {tissueTypes.map((tt: any) => (
                        <SelectItem key={tt.id} value={tt.id}>
                          {tt.name} ({tt.tissue_form === 'LIQUID' ? 'жидкая' : 'твёрдая'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {tissueForm === 'LIQUID' ? (
                  <div className="space-y-2">
                    <Label htmlFor="tissueVolumeMl">Объём (мл)</Label>
                    <Input
                      id="tissueVolumeMl"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="50"
                      value={tissueVolumeMl || ''}
                      onChange={(e) => setTissueVolumeMl(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="tissueWeightG">Масса (г)</Label>
                    <Input
                      id="tissueWeightG"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="15"
                      value={tissueWeightG || ''}
                      onChange={(e) => setTissueWeightG(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Consent & Contract */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Согласие и договор
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="consentReceived"
                  checked={consentReceived}
                  onCheckedChange={(checked) => setConsentReceived(checked === true)}
                />
                <Label htmlFor="consentReceived">Информированное согласие получено</Label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="consentDocument">Документ согласия</Label>
                  <Input
                    id="consentDocument"
                    placeholder="ИС-2026-001"
                    value={consentDocument}
                    onChange={(e) => setConsentDocument(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractNumber">Номер договора</Label>
                  <Input
                    id="contractNumber"
                    placeholder="ДОГ-2026-001"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractDate">Дата договора</Label>
                  <Input
                    id="contractDate"
                    type="date"
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Infection Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Результаты инфекционных исследований
              </CardTitle>
              <CardDescription>
                Все 4 теста NEGATIVE = донация одобрена. Хотя бы один POSITIVE = отклонена.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>ВИЧ</Label>
                  <Select value={infHiv} onValueChange={setInfHiv}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Ожидает</SelectItem>
                      <SelectItem value="NEGATIVE">Отрицательный</SelectItem>
                      <SelectItem value="POSITIVE">Положительный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Гепатит B (HBV)</Label>
                  <Select value={infHbv} onValueChange={setInfHbv}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Ожидает</SelectItem>
                      <SelectItem value="NEGATIVE">Отрицательный</SelectItem>
                      <SelectItem value="POSITIVE">Положительный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Гепатит C (HCV)</Label>
                  <Select value={infHcv} onValueChange={setInfHcv}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Ожидает</SelectItem>
                      <SelectItem value="NEGATIVE">Отрицательный</SelectItem>
                      <SelectItem value="POSITIVE">Положительный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Сифилис</Label>
                  <Select value={infSyphilis} onValueChange={setInfSyphilis}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Ожидает</SelectItem>
                      <SelectItem value="NEGATIVE">Отрицательный</SelectItem>
                      <SelectItem value="POSITIVE">Положительный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 rounded-md bg-muted">
                <p className="text-sm">
                  Статус донации: <Badge variant={statusPreview.color}>{statusPreview.label}</Badge>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="notes">Примечания</Label>
                <Textarea
                  id="notes"
                  placeholder="Дополнительная информация о донации..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Донор</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{donorFullName}</p>
              <p className="text-sm text-muted-foreground font-mono">{donor?.code}</p>
              {donor?.birth_date && (
                <p className="text-sm text-muted-foreground">
                  Дата рождения: {formatDate(donor.birth_date)}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Пол: {donor?.sex === 'M' ? 'Мужской' : donor?.sex === 'F' ? 'Женский' : 'Не указан'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Сводка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Дата забора</span>
                <span className="font-medium">{collectedAt || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Тип ткани</span>
                <span className="font-medium">{selectedTissueType?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Согласие</span>
                <Badge variant={consentReceived ? 'default' : 'secondary'}>
                  {consentReceived ? 'Да' : 'Нет'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Статус</span>
                <Badge variant={statusPreview.color}>{statusPreview.label}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={!collectedAt || !tissueTypeId || submitting}
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Создание...</>
                ) : (
                  <><Beaker className="mr-2 h-4 w-4" />Зарегистрировать донацию</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
