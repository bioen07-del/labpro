"use client"

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileCheck,
  Download,
  Printer,
  FlaskConical,
  Dna,
  Snowflake,
  History,
  Building2,
  BarChart3,
  User,
  Droplets,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Package,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  getLotById,
  getContainersByLot,
  getOperations,
  getBanks,
  getDonationById,
  getDonorById,
} from '@/lib/api'
import { formatDate, formatDateTime, getStatusLabel, getStatusColor, getOperationTypeLabel } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXTRACTION_METHOD_LABELS: Record<string, string> = {
  ENZYMATIC: 'Ферментативный',
  EXPLANT: 'Эксплант',
  MECHANICAL: 'Механический',
  OTHER: 'Другой',
}

const INFECTION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NEGATIVE: { label: 'Отр.', color: 'bg-green-100 text-green-800 border-green-300' },
  POSITIVE: { label: 'Пол.', color: 'bg-red-100 text-red-800 border-red-300' },
  PENDING: { label: 'Ожид.', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  NOT_TESTED: { label: 'Не тест.', color: 'bg-gray-100 text-gray-600 border-gray-300' },
}

const INFECTION_FIELDS: { key: string; label: string }[] = [
  { key: 'inf_hiv', label: 'ВИЧ (HIV)' },
  { key: 'inf_hbv', label: 'Гепатит B (HBV)' },
  { key: 'inf_hcv', label: 'Гепатит C (HCV)' },
  { key: 'inf_syphilis', label: 'Сифилис' },
  { key: 'cmv_status', label: 'ЦМВ (CMV)' },
  { key: 'ebv_status', label: 'ЭБВ (EBV)' },
  { key: 'mycoplasma_status', label: 'Микоплазма' },
]

const LOT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Активен',
  DISPOSE: 'Утилизирован',
  CLOSED: 'Закрыт',
}

const CONTAINER_STATUS_LABEL: Record<string, string> = {
  IN_CULTURE: 'В культуре',
  IN_BANK: 'В банке',
  ISSUED: 'Выдан',
  DISPOSE: 'Утилизирован',
  QUARANTINE: 'Карантин',
  USED: 'Использован',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function InfectionBadge({ status }: { status: string | null | undefined }) {
  const config = INFECTION_STATUS_CONFIG[status || 'NOT_TESTED'] || INFECTION_STATUS_CONFIG.NOT_TESTED
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.color}`}>
      {config.label}
    </Badge>
  )
}

function getSexLabel(sex: string | null | undefined): string {
  if (!sex) return '-'
  const map: Record<string, string> = { M: 'Мужской', F: 'Женский', MALE: 'Мужской', FEMALE: 'Женский' }
  return map[sex.toUpperCase()] || sex
}

function calculateAge(birthDate: string | null | undefined): string {
  if (!birthDate) return '-'
  try {
    const birth = new Date(birthDate)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const monthDiff = now.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--
    }
    return `${age} лет`
  } catch {
    return '-'
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function LotPassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [lot, setLot] = useState<any>(null)
  const [containers, setContainers] = useState<any[]>([])
  const [operations, setOperations] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [donor, setDonor] = useState<any>(null)
  const [donation, setDonation] = useState<any>(null)
  const [documentNumber, setDocumentNumber] = useState('')
  const [generatedAt, setGeneratedAt] = useState('')

  useEffect(() => {
    generatePassport()
  }, [id])

  const generatePassport = async () => {
    setLoading(true)
    try {
      // 1. Lot with culture + culture_type
      const lotData = await getLotById(id)
      if (!lotData) {
        toast.error('Лот не найден')
        return
      }
      setLot(lotData)

      const culture = (lotData as any).culture

      // 2. Containers
      const containersData = await getContainersByLot(id)
      setContainers(containersData || [])

      // 3. Operations
      const opsData = await getOperations({ lot_id: id })
      const sortedOps = (opsData || []).sort(
        (a: any, b: any) =>
          new Date(b.started_at || b.created_at).getTime() -
          new Date(a.started_at || a.created_at).getTime()
      )
      setOperations(sortedOps)

      // 4. Banks for this culture (filter by lot)
      if (culture?.id) {
        try {
          const banksData = await getBanks({ culture_id: culture.id })
          // Filter banks that belong to this lot (via source_lot_id or operations)
          const lotBanks = (banksData || []).filter((b: any) => b.source_lot_id === id || b.lot_id === id)
          setBanks(lotBanks.length > 0 ? lotBanks : (banksData || []))
        } catch {
          // skip
        }
      }

      // 5. Donor
      if (culture?.donor_id) {
        try {
          const donorData = await getDonorById(culture.donor_id)
          setDonor(donorData)
        } catch {
          // skip
        }
      }

      // 6. Donation
      if (culture?.donation_id) {
        try {
          const donationData = await getDonationById(culture.donation_id)
          setDonation(donationData)
        } catch {
          // skip
        }
      }

      // 7. Document metadata
      const lotNumber = (lotData as any).lot_number || id.substring(0, 8)
      setDocumentNumber(`LP-${lotNumber}`)
      setGeneratedAt(new Date().toISOString())

      toast.success('Паспорт лота сгенерирован')
    } catch (error) {
      console.error('Error generating lot passport:', error)
      toast.error('Ошибка генерации паспорта')
    } finally {
      setLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    if (!lot) return
    const culture = lot.culture
    const lines: string[] = []
    lines.push('='.repeat(60))
    lines.push('  ПАСПОРТ ЛОТА КЛЕТОЧНОЙ КУЛЬТУРЫ / Lot Passport')
    lines.push('='.repeat(60))
    lines.push(`Документ: ${documentNumber}`)
    lines.push(`Дата: ${formatDateTime(generatedAt)}`)
    lines.push('')
    lines.push('--- Информация о лоте ---')
    lines.push(`Номер лота: ${lot.lot_number || '-'}`)
    lines.push(`Пассаж: P${lot.passage_number ?? 0}`)
    lines.push(`Статус: ${LOT_STATUS_LABEL[lot.status] || lot.status}`)
    lines.push(`Дата посева: ${formatDate(lot.seeded_at)}`)
    lines.push(`Клетки (нач.): ${lot.initial_cells ? (lot.initial_cells / 1e6).toFixed(2) + ' млн' : '-'}`)
    lines.push(`Клетки (кон.): ${lot.final_cells ? (lot.final_cells / 1e6).toFixed(2) + ' млн' : '-'}`)
    lines.push(`Viability: ${lot.viability ?? '-'}%`)
    lines.push('')

    if (culture) {
      lines.push('--- Родительская культура ---')
      lines.push(`Название: ${culture.name || '-'}`)
      lines.push(`Тип: ${culture.culture_type?.name || '-'}`)
      lines.push(`Метод выделения: ${EXTRACTION_METHOD_LABELS[culture.extraction_method] || '-'}`)
      lines.push('')
    }

    if (donor) {
      lines.push('--- Донор ---')
      lines.push(`Код: ${donor.code || '-'}`)
      lines.push(`Возраст: ${calculateAge(donor.birth_date)} / Пол: ${getSexLabel(donor.sex)}`)
      lines.push('')
    }

    if (donation) {
      lines.push('--- Донация ---')
      lines.push(`Тип ткани: ${donation.tissue_type?.name || '-'}`)
      lines.push(`Дата: ${formatDate(donation.collected_at)}`)
      lines.push('')
    }

    lines.push(`--- Контейнеры (${containers.length}) ---`)
    containers.forEach((c: any) => {
      lines.push(`  ${c.code || '-'} | ${c.container_type?.name || '-'} | ${CONTAINER_STATUS_LABEL[c.container_status] || c.container_status} | конфл. ${c.confluent_percent ?? '-'}%`)
    })
    lines.push('')

    if (banks.length > 0) {
      lines.push('--- Криобанки ---')
      banks.forEach((b: any) => {
        lines.push(`  ${b.code || '-'} | ${b.bank_type} | ${b.cryo_vials_count || 0} ампул | ${formatDate(b.created_at)}`)
      })
      lines.push('')
    }

    lines.push('--- Последние операции (до 20) ---')
    operations.slice(0, 20).forEach((op: any) => {
      lines.push(`  ${getOperationTypeLabel(op.type)} | ${formatDateTime(op.started_at || op.created_at)} | ${op.notes || ''}`)
    })
    lines.push('')

    lines.push('--- Подписи ---')
    lines.push('Исполнитель __________________ Дата __________')
    lines.push('Проверил    __________________ Дата __________')
    lines.push('')
    lines.push('='.repeat(60))
    lines.push(`LabPro | ${formatDateTime(generatedAt)}`)

    const blob = new Blob([lines.join('\n')], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `passport-lot-${(lot.lot_number || 'lot').replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="container py-6">
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Генерация паспорта лота...</p>
        </div>
      </div>
    )
  }

  if (!lot) {
    return (
      <div className="container py-6">
        <div className="text-center py-16">
          <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
          <p className="text-muted-foreground">Лот не найден</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
        </div>
      </div>
    )
  }

  const culture = lot.culture
  const activeContainers = containers.filter((c: any) => c.container_status === 'IN_CULTURE')

  // ===== Metrics =====
  let latestViability: number | null = null
  let latestConcentration: number | null = null
  let latestTotalCells: number | null = null
  for (const op of operations) {
    const m = (op as any).operation_metrics?.[0]
    if (m?.viability_percent != null && latestViability === null) latestViability = m.viability_percent
    if (m?.concentration != null && latestConcentration === null) latestConcentration = m.concentration
    if (m?.total_cells != null && latestTotalCells === null) latestTotalCells = m.total_cells
  }

  const maxConfluent = activeContainers.reduce((max: number, c: any) => Math.max(max, c.confluent_percent ?? 0), 0)
  const avgConfluent = activeContainers.length > 0
    ? activeContainers.reduce((sum: number, c: any) => sum + (c.confluent_percent ?? 0), 0) / activeContainers.length
    : 0

  // PDL
  let lotPDL: number | null = null
  const initCells = lot.initial_cells ?? 0
  const finCells = lot.final_cells || latestTotalCells || 0
  if (initCells > 0 && finCells > 0) {
    const pdl = Math.log2(finCells / initCells)
    if (isFinite(pdl) && pdl > 0) lotPDL = pdl
  }

  // Proliferation rate
  let prolifRate: number | null = null
  let doublingTime: number | null = null
  if (lotPDL && lotPDL > 0 && lot.seeded_at) {
    const startDate = new Date(lot.seeded_at).getTime()
    const lastOp = operations[0]
    const endDate = lastOp ? new Date(lastOp.started_at || lastOp.created_at).getTime() : Date.now()
    const days = (endDate - startDate) / (1000 * 60 * 60 * 24)
    if (days > 0) {
      prolifRate = lotPDL / days
      doublingTime = days / lotPDL
    }
  }

  // Confluence chart data
  const observeOps = operations.filter((op: any) => op.type === 'OBSERVE' || op.type === 'PASSAGE')
  const chartData: { date: string; confluency: number }[] = []
  for (const op of [...observeOps].reverse()) {
    const opContainers = op.operation_containers || op.containers || []
    for (const c of opContainers) {
      if (c.confluent_percent != null && c.confluent_percent > 0) {
        chartData.push({
          date: new Date(op.started_at || op.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
          confluency: c.confluent_percent,
        })
      }
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="container py-6 space-y-6">
      {/* ========== Page Header (hidden on print) ========== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Паспорт лота</h1>
            <p className="text-muted-foreground text-sm">
              {lot.lot_number || `Лот #${id.substring(0, 8)}`}
              {culture && ` — ${culture.name}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Скачать TXT
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Печать
          </Button>
        </div>
      </div>

      {/* ========== PASSPORT DOCUMENT ========== */}
      <div className="passport-print-area">
        <Card className="print:border-0 print:shadow-none">
          <CardContent className="p-8 print:p-0 space-y-8">

            {/* ====================== 1. HEADER ====================== */}
            <div className="text-center border-b-2 border-black pb-6">
              <h2 className="text-2xl font-bold tracking-wide uppercase">
                ПАСПОРТ ЛОТА КЛЕТОЧНОЙ КУЛЬТУРЫ
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Cell Culture Lot Passport</p>
              <div className="flex justify-center gap-8 mt-4 text-sm">
                <span>
                  <span className="text-muted-foreground">Документ: </span>
                  <span className="font-mono font-medium">{documentNumber}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Дата: </span>
                  <span className="font-medium">{formatDateTime(generatedAt)}</span>
                </span>
              </div>
            </div>

            {/* ====================== 2. LOT INFORMATION ====================== */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <FlaskConical className="h-5 w-5" />
                Информация о лоте
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Номер лота</span>
                  <p className="font-mono font-medium">{lot.lot_number || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Пассаж</span>
                  <p className="font-mono font-medium">P{lot.passage_number ?? 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Статус</span>
                  <p>
                    <Badge className={getStatusColor(lot.status)}>
                      {LOT_STATUS_LABEL[lot.status] || lot.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Дата посева</span>
                  <p className="font-medium">{lot.seeded_at ? formatDate(lot.seeded_at) : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Дата закрытия</span>
                  <p className="font-medium">{lot.end_date ? formatDate(lot.end_date) : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Контейнеров</span>
                  <p className="font-medium">{activeContainers.length} акт. / {containers.length} всего</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Клетки (начальные)</span>
                  <p className="font-medium">
                    {lot.initial_cells ? `${(lot.initial_cells / 1e6).toFixed(2)} млн` : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Клетки (конечные)</span>
                  <p className="font-medium">
                    {lot.final_cells ? `${(lot.final_cells / 1e6).toFixed(2)} млн` : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Viability</span>
                  <p className="font-medium">
                    {lot.viability != null ? `${lot.viability}%` : latestViability != null ? `${latestViability}%` : '-'}
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* ====================== 3. PARENT CULTURE ====================== */}
            {culture && (
              <>
                <section>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Dna className="h-5 w-5" />
                    Родительская культура
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Название</span>
                      <p className="font-medium">{culture.name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Тип культуры</span>
                      <p className="font-medium">{culture.culture_type?.name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Метод выделения</span>
                      <p className="font-medium">
                        {EXTRACTION_METHOD_LABELS[culture.extraction_method] || culture.extraction_method || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Статус культуры</span>
                      <Badge className={getStatusColor(culture.status)}>
                        {getStatusLabel(culture.status)}
                      </Badge>
                    </div>
                    {culture.passage_max && (
                      <div>
                        <span className="text-muted-foreground">Макс. пассаж</span>
                        <p className="font-medium">{culture.passage_max}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Дата создания</span>
                      <p className="font-medium">{formatDate(culture.created_at)}</p>
                    </div>
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* ====================== 4. DONOR ====================== */}
            {donor && (
              <>
                <section>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <User className="h-5 w-5" />
                    Информация о доноре
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Код донора</span>
                      <p className="font-mono font-medium">{donor.code || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Возраст</span>
                      <p className="font-medium">{calculateAge(donor.birth_date)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Пол</span>
                      <p className="font-medium">{getSexLabel(donor.sex)}</p>
                    </div>
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* ====================== 5. DONATION + INFECTIONS ====================== */}
            {donation && (
              <>
                <section>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Droplets className="h-5 w-5" />
                    Информация о донации
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Тип ткани</span>
                      <p className="font-medium">{donation.tissue_type?.name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Дата донации</span>
                      <p className="font-medium">{formatDate(donation.collected_at)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Статус</span>
                      <Badge className={getStatusColor(donation.status)}>
                        {getStatusLabel(donation.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Инфекционный статус
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {INFECTION_FIELDS.map((f) => (
                              <TableHead key={f.key} className="text-center text-xs whitespace-nowrap px-2">
                                {f.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            {INFECTION_FIELDS.map((f) => (
                              <TableCell key={f.key} className="text-center px-2">
                                <InfectionBadge status={(donation as any)[f.key] ?? null} />
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* ====================== 6. CONTAINERS TABLE ====================== */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Package className="h-5 w-5" />
                Контейнеры ({containers.length})
              </h3>
              {containers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет контейнеров</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Код</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead className="text-center">Площадь (см²)</TableHead>
                        <TableHead className="text-center">Конфл. %</TableHead>
                        <TableHead>Морфология</TableHead>
                        <TableHead className="text-center">Контамин.</TableHead>
                        <TableHead>Позиция</TableHead>
                        <TableHead className="text-center">Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {containers.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono font-medium text-sm">{c.code || '-'}</TableCell>
                          <TableCell className="text-sm">{c.container_type?.name || '-'}</TableCell>
                          <TableCell className="text-center text-sm">{c.container_type?.surface_area || '-'}</TableCell>
                          <TableCell className="text-center text-sm font-medium">
                            {c.confluent_percent != null ? `${c.confluent_percent}%` : '-'}
                          </TableCell>
                          <TableCell className="text-sm">{c.morphology || '-'}</TableCell>
                          <TableCell className="text-center">
                            {c.contaminated ? (
                              <Badge variant="destructive" className="text-xs">Да</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">Нет</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.position?.equipment?.name
                              ? `${c.position.equipment.name} / ${c.position.path || ''}`
                              : c.position?.path || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={getStatusColor(c.container_status)}>
                              {CONTAINER_STATUS_LABEL[c.container_status] || c.container_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <Separator />

            {/* ====================== 7. BANKS ====================== */}
            {banks.length > 0 && (
              <>
                <section>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Snowflake className="h-5 w-5" />
                    Криобанки ({banks.length})
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Код банка</TableHead>
                          <TableHead>Тип</TableHead>
                          <TableHead className="text-center">Статус</TableHead>
                          <TableHead className="text-center">Ампул</TableHead>
                          <TableHead>Дата</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {banks.map((bank: any) => (
                          <TableRow key={bank.id}>
                            <TableCell className="font-mono font-medium">{bank.code || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{bank.bank_type}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={getStatusColor(bank.status)}>
                                {getStatusLabel(bank.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">{bank.cryo_vials_count || 0}</TableCell>
                            <TableCell>{bank.freezing_date ? formatDate(bank.freezing_date) : formatDate(bank.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* ====================== 8. METRICS ====================== */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5" />
                Метрики лота
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">
                    {maxConfluent > 0 ? `${maxConfluent}%` : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Конфлюэнтность (макс.)</p>
                  {avgConfluent > 0 && activeContainers.length > 1 && (
                    <p className="text-xs text-muted-foreground">сред. {Math.round(avgConfluent)}%</p>
                  )}
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">
                    {latestViability != null ? `${latestViability}%` : lot.viability != null ? `${lot.viability}%` : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Жизнеспособность</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">
                    {latestConcentration != null ? latestConcentration.toLocaleString('ru-RU') : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Концентрация (кл/мл)</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">
                    {latestTotalCells != null
                      ? `${(latestTotalCells / 1e6).toFixed(2)} млн`
                      : lot.final_cells
                        ? `${(lot.final_cells / 1e6).toFixed(2)} млн`
                        : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Общее кол-во клеток</p>
                </div>
                {lotPDL != null && (
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold">{lotPDL.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">PDL (кумул. удвоения)</p>
                  </div>
                )}
                {prolifRate != null && (
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold">{prolifRate.toFixed(3)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Пролиферация (удв./день)</p>
                    {doublingTime != null && (
                      <p className="text-xs text-muted-foreground">{doublingTime.toFixed(1)} дн./удв.</p>
                    )}
                  </div>
                )}
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{operations.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Всего операций</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{containers.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Контейнеров
                    <span className="block text-[10px]">акт. {activeContainers.length}</span>
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* ====================== 9. CONFLUENCY CHART ====================== */}
            {chartData.length > 0 && (
              <>
                <section>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5" />
                    График конфлюэнтности
                  </h3>
                  <div className="border rounded-lg p-4" style={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Line
                          type="monotone"
                          dataKey="confluency"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Конфлюэнтность"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* ====================== 10. OPERATIONS TIMELINE ====================== */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <History className="h-5 w-5" />
                История операций ({operations.length})
              </h3>
              {operations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет операций</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Дата/время</TableHead>
                        <TableHead>Viability</TableHead>
                        <TableHead>Конц-ция</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Заметки</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {operations.slice(0, 30).map((op: any, i: number) => {
                        const m = op.operation_metrics?.[0]
                        return (
                          <TableRow key={op.id || i}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getOperationTypeLabel(op.type)}</Badge>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {formatDateTime(op.started_at || op.created_at)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {m?.viability_percent != null ? `${m.viability_percent}%` : '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {m?.concentration != null ? m.concentration.toLocaleString('ru-RU') : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(op.status)}>
                                {getStatusLabel(op.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {op.notes || '-'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <Separator />

            {/* ====================== 11. SIGNATURES ====================== */}
            <section className="pt-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <Building2 className="h-5 w-5" />
                Подписи
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-end gap-4">
                    <span className="text-sm font-medium whitespace-nowrap">Исполнитель</span>
                    <div className="flex-1 border-b border-black" />
                  </div>
                  <div className="flex items-end gap-4">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Дата</span>
                    <div className="flex-1 border-b border-black max-w-[200px]" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-end gap-4">
                    <span className="text-sm font-medium whitespace-nowrap">Проверил</span>
                    <div className="flex-1 border-b border-black" />
                  </div>
                  <div className="flex items-end gap-4">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Дата</span>
                    <div className="flex-1 border-b border-black max-w-[200px]" />
                  </div>
                </div>
              </div>
              <div className="mt-8 text-center">
                <div className="inline-block border-2 border-dashed border-muted-foreground/40 rounded-lg px-12 py-6">
                  <p className="text-sm text-muted-foreground">Печать организации</p>
                </div>
              </div>
            </section>

            <Separator />

            {/* ====================== 12. FOOTER ====================== */}
            <footer className="text-center text-xs text-muted-foreground pt-2">
              <p>LabPro | {formatDateTime(generatedAt)}</p>
            </footer>

          </CardContent>
        </Card>
      </div>

      {/* ========== Print Styles ========== */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .passport-print-area,
          .passport-print-area * {
            visibility: visible;
          }
          .passport-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .passport-print-area .border {
            border-color: #000 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ccc !important;
            padding: 4px 8px !important;
            font-size: 11px !important;
          }
          section {
            page-break-inside: avoid;
          }
          h2 { font-size: 18px !important; }
          h3 { font-size: 14px !important; }
          p, span { font-size: 11px !important; }
          .badge, [class*="Badge"] {
            border: 1px solid #999 !important;
            padding: 1px 6px !important;
            font-size: 10px !important;
          }
          @page {
            margin: 15mm;
            size: A4;
          }
        }
      `}</style>
    </div>
  )
}
