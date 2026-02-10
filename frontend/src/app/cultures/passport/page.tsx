"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  getCultures,
  getCultureById,
  getLots,
  getContainersByLot,
  getOperations,
  getBanks,
  getDonationById,
  getDonorById,
  getCryoVials,
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

// ---------------------------------------------------------------------------
// Helper: Infection status badge
// ---------------------------------------------------------------------------

function InfectionBadge({ status }: { status: string | null | undefined }) {
  const config = INFECTION_STATUS_CONFIG[status || 'NOT_TESTED'] || INFECTION_STATUS_CONFIG.NOT_TESTED
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.color}`}>
      {config.label}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Helper: Sex label
// ---------------------------------------------------------------------------

function getSexLabel(sex: string | null | undefined): string {
  if (!sex) return '-'
  const map: Record<string, string> = { M: 'Мужской', F: 'Женский', MALE: 'Мужской', FEMALE: 'Женский' }
  return map[sex.toUpperCase()] || sex
}

// ---------------------------------------------------------------------------
// Helper: calculate age from birth_date
// ---------------------------------------------------------------------------

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
// Inner component with useSearchParams
// ---------------------------------------------------------------------------

function CulturePassportContent() {
  const searchParams = useSearchParams()
  const preselectedCultureId = searchParams.get('culture_id') || ''

  const [cultures, setCultures] = useState<any[]>([])
  const [selectedCultureId, setSelectedCultureId] = useState<string>(preselectedCultureId)
  const [loading, setLoading] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string>('')
  const [documentNumber, setDocumentNumber] = useState<string>('')

  // Data sections
  const [culture, setCulture] = useState<any>(null)
  const [donor, setDonor] = useState<any>(null)
  const [donation, setDonation] = useState<any>(null)
  const [lots, setLots] = useState<any[]>([])
  const [containersByLot, setContainersByLot] = useState<Record<string, any[]>>({})
  const [banks, setBanks] = useState<any[]>([])
  const [operations, setOperations] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalLots: 0,
    totalContainers: 0,
    activeContainers: 0,
    frozenContainers: 0,
    disposedContainers: 0,
    totalBanks: 0,
    totalVials: 0,
    totalOperations: 0,
  })

  // -----------------------------------------------------------------------
  // Load cultures list
  // -----------------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCultures()
        setCultures(data || [])
      } catch (error) {
        console.error('Error loading cultures:', error)
        toast.error('Не удалось загрузить список культур')
      }
    }
    load()
  }, [])

  // -----------------------------------------------------------------------
  // Auto-load when preselected
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (preselectedCultureId && cultures.length > 0) {
      generatePassport(preselectedCultureId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedCultureId, cultures])

  // -----------------------------------------------------------------------
  // Generate passport
  // -----------------------------------------------------------------------
  const generatePassport = useCallback(async (cultureId: string) => {
    if (!cultureId) return
    setLoading(true)
    setCulture(null)
    setDonor(null)
    setDonation(null)

    try {
      // 1. Culture data
      const cultureData = await getCultureById(cultureId)
      if (!cultureData) {
        toast.error('Культура не найдена')
        return
      }
      setCulture(cultureData)

      // 2. Donor data
      let donorData: any = null
      if (cultureData.donor_id) {
        try {
          donorData = await getDonorById(cultureData.donor_id)
          setDonor(donorData)
        } catch {
          // donor not found - skip
        }
      } else if (cultureData.donor) {
        donorData = cultureData.donor
        setDonor(donorData)
      }

      // 3. Donation data
      let donationData: any = null
      if (cultureData.donation_id) {
        try {
          donationData = await getDonationById(cultureData.donation_id)
          setDonation(donationData)
        } catch {
          // donation not found - skip
        }
      } else if (cultureData.donation) {
        donationData = cultureData.donation
        setDonation(donationData)
      }

      // 4. Lots
      const lotsData = await getLots({ culture_id: cultureId })
      const sortedLots = (lotsData || []).sort(
        (a: any, b: any) => (a.passage_number ?? 0) - (b.passage_number ?? 0)
      )
      setLots(sortedLots)

      // 5. Containers per lot
      const containersMap: Record<string, any[]> = {}
      let allContainers: any[] = []
      for (const lot of sortedLots) {
        try {
          const containers = await getContainersByLot(lot.id)
          containersMap[lot.id] = containers || []
          allContainers = allContainers.concat(containers || [])
        } catch {
          containersMap[lot.id] = []
        }
      }
      setContainersByLot(containersMap)

      // 6. Banks
      const banksData = await getBanks({ culture_id: cultureId })
      setBanks(banksData || [])

      // 7. Vial count across all banks
      let totalVials = 0
      for (const bank of (banksData || [])) {
        if (bank.cryo_vials_count !== undefined && bank.cryo_vials_count !== null) {
          totalVials += bank.cryo_vials_count
        } else {
          try {
            const vials = await getCryoVials({ bank_id: bank.id })
            totalVials += (vials || []).length
          } catch {
            // skip
          }
        }
      }

      // 8. Operations across all lots
      let allOperations: any[] = []
      for (const lot of sortedLots) {
        try {
          const ops = await getOperations({ lot_id: lot.id })
          allOperations = allOperations.concat(ops || [])
        } catch {
          // skip
        }
      }
      allOperations.sort(
        (a: any, b: any) =>
          new Date(b.started_at || b.created_at).getTime() -
          new Date(a.started_at || a.created_at).getTime()
      )
      setOperations(allOperations)

      // 9. Statistics
      setStats({
        totalLots: sortedLots.length,
        totalContainers: allContainers.length,
        activeContainers: allContainers.filter((c: any) => c.status === 'IN_CULTURE' || c.status === 'ACTIVE').length,
        frozenContainers: allContainers.filter((c: any) => c.status === 'IN_BANK' || c.status === 'FROZEN').length,
        disposedContainers: allContainers.filter((c: any) => c.status === 'DISPOSE').length,
        totalBanks: (banksData || []).length,
        totalVials,
        totalOperations: allOperations.length,
      })

      // 10. Document metadata
      const timestamp = Date.now()
      const cultureCode = cultureData.name || cultureData.id.substring(0, 8)
      setDocumentNumber(`CP-${cultureCode}-${timestamp}`)
      setGeneratedAt(new Date().toISOString())

      toast.success('Паспорт успешно сгенерирован')
    } catch (error) {
      console.error('Error generating passport:', error)
      toast.error('Ошибка при генерации паспорта')
    } finally {
      setLoading(false)
    }
  }, [])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handleCultureSelect = (id: string) => {
    setSelectedCultureId(id)
    generatePassport(id)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    if (!culture) return

    const lines: string[] = []
    lines.push('=' .repeat(60))
    lines.push('  ПАСПОРТ КЛЕТОЧНОЙ КУЛЬТУРЫ / Cell Culture Passport')
    lines.push('=' .repeat(60))
    lines.push(`Документ: ${documentNumber}`)
    lines.push(`Дата: ${formatDateTime(generatedAt)}`)
    lines.push('')
    lines.push('--- Информация о культуре ---')
    lines.push(`Название: ${culture.name || '-'}`)
    lines.push(`Код: ${culture.name || '-'}`)
    lines.push(`Тип: ${culture.culture_type?.name || '-'}`)
    lines.push(`Описание: ${culture.description || '-'}`)
    lines.push(`Метод выделения: ${EXTRACTION_METHOD_LABELS[culture.extraction_method] || '-'}`)
    lines.push(`Макс. пассаж: ${culture.passage_max || 'Не ограничен'}`)
    lines.push(`Дата создания: ${formatDate(culture.created_at)}`)
    lines.push('')

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

    lines.push('--- Статистика ---')
    lines.push(`Лотов: ${stats.totalLots}`)
    lines.push(`Контейнеров: ${stats.totalContainers} (акт: ${stats.activeContainers} / замор: ${stats.frozenContainers} / утил: ${stats.disposedContainers})`)
    lines.push(`Банков: ${stats.totalBanks}`)
    lines.push(`Ампул: ${stats.totalVials}`)
    lines.push(`Операций: ${stats.totalOperations}`)
    lines.push('')

    lines.push('--- Лоты ---')
    lots.forEach((l: any) => {
      lines.push(`  P${l.passage_number} | ${l.lot_number || '-'} | ${formatDate(l.seeded_at)} | ${(containersByLot[l.id] || []).length} конт. | ${getStatusLabel(l.status)}`)
    })
    lines.push('')

    if (banks.length > 0) {
      lines.push('--- Банки ---')
      banks.forEach((b: any) => {
        lines.push(`  ${b.code || '-'} | ${b.bank_type} | ${getStatusLabel(b.status)} | ${b.cryo_vials_count || 0} ампул | ${formatDate(b.created_at)}`)
      })
      lines.push('')
    }

    lines.push('--- Последние операции (до 20) ---')
    operations.slice(0, 20).forEach((op: any) => {
      lines.push(`  ${getOperationTypeLabel(op.type)} | ${formatDateTime(op.started_at || op.created_at)} | ${op.lot?.lot_number || '-'} | ${op.notes || ''}`)
    })
    lines.push('')

    lines.push('--- Подписи ---')
    lines.push('Руководитель __________________ Дата __________')
    lines.push('Оператор      __________________ Дата __________')
    lines.push('Печать организации')
    lines.push('')
    lines.push('=' .repeat(60))
    lines.push(`LabPro v1.0 | ${formatDateTime(generatedAt)}`)

    const blob = new Blob([lines.join('\n')], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `passport-${(culture.name || 'culture').replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const passportReady = !!culture && !loading

  return (
    <div className="container py-6 space-y-6">
      {/* ========== Page Header (hidden on print) ========== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Паспорт культуры</h1>
          <p className="text-muted-foreground">
            Генерация печатного документа "Паспорт клеточной культуры"
          </p>
        </div>
        <div className="flex gap-2">
          {passportReady && (
            <>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Скачать TXT
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Печать
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ========== Culture selector (hidden on print) ========== */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Выберите культуру</CardTitle>
          <CardDescription>Паспорт будет сгенерирован для выбранной культуры</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Select value={selectedCultureId} onValueChange={handleCultureSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите культуру..." />
              </SelectTrigger>
              <SelectContent>
                {cultures.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.culture_type?.name ? `(${c.culture_type.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ========== Loading ========== */}
      {loading && (
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Генерация паспорта...</p>
        </div>
      )}

      {/* ========== Empty state ========== */}
      {!culture && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Выберите культуру для генерации паспорта</p>
        </div>
      )}

      {/* ========== PASSPORT DOCUMENT ========== */}
      {passportReady && (
        <div className="passport-print-area">
          <Card className="print:border-0 print:shadow-none">
            <CardContent className="p-8 print:p-0 space-y-8">

              {/* ====================== 1. HEADER ====================== */}
              <div className="text-center border-b-2 border-black pb-6">
                <h2 className="text-2xl font-bold tracking-wide uppercase">
                  ПАСПОРТ КЛЕТОЧНОЙ КУЛЬТУРЫ
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Cell Culture Passport</p>
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

              {/* ====================== 2. CULTURE INFORMATION ====================== */}
              <section>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <FlaskConical className="h-5 w-5" />
                  Информация о культуре
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Название</span>
                    <p className="font-medium">{culture.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Код</span>
                    <p className="font-mono font-medium">{culture.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Тип культуры</span>
                    <p className="font-medium">{culture.culture_type?.name || '-'}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-muted-foreground">Описание</span>
                    <p className="font-medium">{culture.description || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Метод выделения</span>
                    <p className="font-medium">
                      {EXTRACTION_METHOD_LABELS[culture.extraction_method] || culture.extraction_method || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Максимальный пассаж</span>
                    <p className="font-medium">{culture.passage_max || 'Не ограничен'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Дата создания</span>
                    <p className="font-medium">{formatDate(culture.created_at)}</p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* ====================== 3. DONOR INFORMATION ====================== */}
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

              {/* ====================== 4. DONATION INFORMATION ====================== */}
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
                        <span className="text-muted-foreground">Статус донации</span>
                        <Badge className={getStatusColor(donation.status)}>
                          {getStatusLabel(donation.status)}
                        </Badge>
                      </div>
                    </div>

                    {/* Infection statuses table */}
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
                                  <InfectionBadge
                                    status={
                                      (donation as any)[f.key] ?? null
                                    }
                                  />
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

              {/* ====================== 5. PASSAGE HISTORY ====================== */}
              <section>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Dna className="h-5 w-5" />
                  История пассажей ({lots.length})
                </h3>
                {lots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет данных о лотах</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Пассаж</TableHead>
                          <TableHead>Номер лота</TableHead>
                          <TableHead>Дата посева</TableHead>
                          <TableHead className="text-center">Контейнеров</TableHead>
                          <TableHead className="text-center">Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lots.map((lot: any) => (
                          <TableRow key={lot.id}>
                            <TableCell className="font-mono font-medium">P{lot.passage_number ?? '-'}</TableCell>
                            <TableCell className="font-mono">{lot.lot_number || '-'}</TableCell>
                            <TableCell>{lot.seeded_at ? formatDate(lot.seeded_at) : '-'}</TableCell>
                            <TableCell className="text-center">{(containersByLot[lot.id] || []).length}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={getStatusColor(lot.status)}>
                                {getStatusLabel(lot.status)}
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

              {/* ====================== 6. BANKS ====================== */}
              <section>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Snowflake className="h-5 w-5" />
                  Криобанки ({banks.length})
                </h3>
                {banks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет криобанков</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Код банка</TableHead>
                          <TableHead>Тип</TableHead>
                          <TableHead className="text-center">Статус</TableHead>
                          <TableHead className="text-center">Ампул</TableHead>
                          <TableHead>Дата создания</TableHead>
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
                            <TableCell>{formatDate(bank.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>

              <Separator />

              {/* ====================== 7. STATISTICS ====================== */}
              <section>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5" />
                  Сводная статистика
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">{stats.totalLots}</p>
                    <p className="text-xs text-muted-foreground mt-1">Всего лотов</p>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">{stats.totalContainers}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Контейнеров
                      <span className="block text-[10px]">
                        акт. {stats.activeContainers} / замор. {stats.frozenContainers} / утил. {stats.disposedContainers}
                      </span>
                    </p>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">{stats.totalBanks}</p>
                    <p className="text-xs text-muted-foreground mt-1">Банков</p>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">{stats.totalVials}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ампул</p>
                  </div>
                  <div className="border rounded-lg p-4 text-center col-span-2 md:col-span-4">
                    <p className="text-3xl font-bold">{stats.totalOperations}</p>
                    <p className="text-xs text-muted-foreground mt-1">Всего операций</p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* ====================== 7b. CONFLUENCY CHART ====================== */}
              {(() => {
                // Собрать данные конфлюэнтности из OBSERVE операций
                const observeOps = operations.filter((op: any) => op.type === 'OBSERVE' || op.type === 'PASSAGE')
                const chartData: { date: string; confluency: number }[] = []
                for (const op of observeOps) {
                  const containers = op.containers || op.operation_containers || []
                  for (const c of containers) {
                    if (c.confluent_percent != null && c.confluent_percent > 0) {
                      chartData.push({
                        date: new Date(op.started_at || op.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
                        confluency: c.confluent_percent,
                      })
                    }
                  }
                }
                if (chartData.length === 0) return null
                return (
                  <>
                    <section>
                      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <BarChart3 className="h-5 w-5" />
                        График конфлюэнтности
                      </h3>
                      <div className="border rounded-lg p-4" style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                            <Tooltip formatter={(v: number) => `${v}%`} />
                            <Line type="monotone" dataKey="confluency" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Конфлюэнтность" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                    <Separator />
                  </>
                )
              })()}

              {/* ====================== 8. OPERATIONS TIMELINE ====================== */}
              <section>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <History className="h-5 w-5" />
                  Хронология операций (последние 20)
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
                          <TableHead>Лот</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Заметки</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {operations.slice(0, 20).map((op: any, i: number) => (
                          <TableRow key={op.id || i}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getOperationTypeLabel(op.type)}</Badge>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {formatDateTime(op.started_at || op.created_at)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {op.lot?.lot_number || '-'}
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>

              <Separator />

              {/* ====================== 9. SIGNATURES ====================== */}
              <section className="pt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
                  <Building2 className="h-5 w-5" />
                  Подписи
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-end gap-4">
                      <span className="text-sm font-medium whitespace-nowrap">Руководитель</span>
                      <div className="flex-1 border-b border-black" />
                    </div>
                    <div className="flex items-end gap-4">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Дата</span>
                      <div className="flex-1 border-b border-black max-w-[200px]" />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-end gap-4">
                      <span className="text-sm font-medium whitespace-nowrap">Оператор</span>
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

              {/* ====================== 10. FOOTER ====================== */}
              <footer className="text-center text-xs text-muted-foreground pt-2">
                <p>LabPro v1.0 | {formatDateTime(generatedAt)}</p>
              </footer>

            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== Print Styles ========== */}
      <style jsx global>{`
        @media print {
          /* Hide everything not in the passport */
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
          /* Remove card styling */
          .passport-print-area .border {
            border-color: #000 !important;
          }
          /* Hide non-print elements */
          .print\\:hidden {
            display: none !important;
          }
          /* Table styling for print */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ccc !important;
            padding: 4px 8px !important;
            font-size: 11px !important;
          }
          /* Page breaks */
          section {
            page-break-inside: avoid;
          }
          /* Font sizes for print */
          h2 { font-size: 18px !important; }
          h3 { font-size: 14px !important; }
          p, span { font-size: 11px !important; }
          /* Ensure badges print well */
          .badge, [class*="Badge"] {
            border: 1px solid #999 !important;
            padding: 1px 6px !important;
            font-size: 10px !important;
          }
          /* Page margins */
          @page {
            margin: 15mm;
            size: A4;
          }
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Default export with Suspense boundary
// ---------------------------------------------------------------------------

export default function CulturePassportPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </div>
      }
    >
      <CulturePassportContent />
    </Suspense>
  )
}
