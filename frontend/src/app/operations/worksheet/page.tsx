"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FileText,
  Printer,
  Loader2,
  ClipboardList,
  FlaskConical,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { format, addHours } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getLots, getLotById, getContainersByLot, getOperations } from '@/lib/api'
import { formatDate } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPERATION_TYPE_LABELS: Record<string, string> = {
  OBSERVE: 'Наблюдение',
  FEED: 'Кормление',
  PASSAGE: 'Пассаж',
  FREEZE: 'Заморозка',
  THAW: 'Размораживание',
  DISPOSE: 'Утилизация',
}

const MORPHOLOGY_LABELS: Record<string, string> = {
  FIBROBLAST: 'Фибробластоподобная',
  EPITHELIAL: 'Эпителиоподобная',
  ROUND: 'Округлая',
  SPINDLE: 'Веретеновидная',
  POLYGONAL: 'Полигональная',
  MIXED: 'Смешанная',
  NORMAL: 'Нормальная',
  ABNORMAL: 'Аномальная',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активен',
  CLOSED: 'Закрыт',
  DISPOSE: 'Утилизирован',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 border-green-300',
  CLOSED: 'bg-gray-100 text-gray-800 border-gray-300',
  DISPOSE: 'bg-red-100 text-red-800 border-red-300',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(date: string | Date | undefined | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd.MM.yyyy HH:mm', { locale: ru })
}

function getMorphologyLabel(morphology: string | undefined | null): string {
  if (!morphology) return '-'
  return MORPHOLOGY_LABELS[morphology] ?? morphology
}

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams
// ---------------------------------------------------------------------------

function WorksheetContent() {
  const searchParams = useSearchParams()
  const preselectedLotId = searchParams.get('lot_id')

  const [lots, setLots] = useState<any[]>([])
  const [selectedLotId, setSelectedLotId] = useState<string>(preselectedLotId ?? '')
  const [lot, setLot] = useState<any>(null)
  const [containers, setContainers] = useState<any[]>([])
  const [operations, setOperations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [lotsLoading, setLotsLoading] = useState(true)
  const [generatedAt] = useState(() => new Date().toISOString())

  // Load lot list on mount
  useEffect(() => {
    async function fetchLots() {
      try {
        const data = await getLots()
        setLots(data ?? [])
      } catch (err) {
        console.error(err)
        toast.error('Не удалось загрузить список лотов')
      } finally {
        setLotsLoading(false)
      }
    }
    fetchLots()
  }, [])

  // Auto-load if lot_id was passed via query
  useEffect(() => {
    if (preselectedLotId && !loading && lots.length >= 0) {
      loadLotData(preselectedLotId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedLotId])

  const loadLotData = useCallback(async (lotId: string) => {
    setLoading(true)
    try {
      const [lotData, containersData, operationsData] = await Promise.all([
        getLotById(lotId),
        getContainersByLot(lotId),
        getOperations({ lot_id: lotId }),
      ])
      setLot(lotData)
      setContainers(containersData ?? [])
      setOperations(operationsData ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Ошибка загрузки данных лота')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLotChange = (lotId: string) => {
    setSelectedLotId(lotId)
    loadLotData(lotId)
  }

  const handlePrint = () => {
    window.print()
  }

  // Derived data
  const lastFeedOp = operations.find((op: any) => op.type === 'FEED')
  const nextFeedEstimate = lastFeedOp?.completed_at
    ? addHours(new Date(lastFeedOp.completed_at), 48)
    : null

  const readyForPassage = containers.filter(
    (c: any) => (c.confluent_percent ?? 0) >= 80 && c.status !== 'DISPOSE'
  )

  return (
    <div className="container py-6 space-y-6">
      {/* ============ SCREEN-ONLY: Lot selector & buttons ============ */}
      <div className="no-print space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-8 w-8" />
              Рабочий журнал
            </h1>
            <p className="text-muted-foreground">
              Печатный документ для журнала культивирования
            </p>
          </div>
          {lot && (
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Печать
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Выберите лот</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedLotId}
              onValueChange={handleLotChange}
              disabled={lotsLoading}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder={lotsLoading ? 'Загрузка...' : 'Выберите лот...'} />
              </SelectTrigger>
              <SelectContent>
                {lots.map((l: any) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.lot_number} &mdash; {l.culture?.name ?? 'Культура'} (P{l.passage_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 no-print">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Загрузка данных лота...</span>
        </div>
      )}

      {/* Empty state */}
      {!lot && !loading && (
        <div className="text-center py-16 no-print">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Выберите лот для генерации рабочего журнала</p>
        </div>
      )}

      {/* ============ PRINTABLE DOCUMENT ============ */}
      {lot && !loading && (
        <div className="print-area">
          {/* ---------- 1. HEADER ---------- */}
          <div className="border-b-2 border-black pb-4 mb-6">
            <h2 className="text-center text-xl font-bold uppercase tracking-wide">
              Рабочий журнал культивирования
            </h2>
            <div className="flex justify-between mt-2 text-sm">
              <span>Документ: <strong>WS-{lot.lot_number}</strong></span>
              <span>Дата формирования: <strong>{formatDate(generatedAt)}</strong></span>
            </div>
          </div>

          {/* ---------- 2. LOT INFORMATION ---------- */}
          <div className="mb-6">
            <h3 className="font-bold text-base mb-3 border-b pb-1">1. Информация о лоте</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Номер лота:</span>{' '}
                <strong>{lot.lot_number}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Пассаж:</span>{' '}
                <strong>P{lot.passage_number}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Культура:</span>{' '}
                <strong>{lot.culture?.name ?? '-'}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Тип культуры:</span>{' '}
                <strong>{lot.culture?.culture_type?.name ?? lot.culture?.type_id ?? '-'}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Дата посева:</span>{' '}
                <strong>{lot.seeded_at ? formatDate(lot.seeded_at) : '-'}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Статус:</span>{' '}
                <Badge
                  variant="outline"
                  className={STATUS_COLORS[lot.status] ?? ''}
                >
                  {STATUS_LABELS[lot.status] ?? lot.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* ---------- 3. CONTAINERS TABLE ---------- */}
          <div className="mb-6">
            <h3 className="font-bold text-base mb-3 border-b pb-1">
              2. Контейнеры ({containers.length})
            </h3>
            {containers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Нет контейнеров в лоте</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-1 pr-2 font-semibold w-8">#</th>
                    <th className="text-left py-1 pr-2 font-semibold">Код контейнера</th>
                    <th className="text-left py-1 pr-2 font-semibold">Тип</th>
                    <th className="text-center py-1 pr-2 font-semibold">Конфлюэнтность (%)</th>
                    <th className="text-left py-1 pr-2 font-semibold">Морфология</th>
                    <th className="text-center py-1 pr-2 font-semibold">Контаминация</th>
                    <th className="text-left py-1 font-semibold">Расположение</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map((c: any, idx: number) => (
                    <tr key={c.id} className="border-b border-gray-300">
                      <td className="py-1 pr-2">{idx + 1}</td>
                      <td className="py-1 pr-2 font-mono text-xs">{c.code}</td>
                      <td className="py-1 pr-2">{c.container_type?.name ?? '-'}</td>
                      <td className="py-1 pr-2 text-center">{c.confluent_percent ?? '-'}</td>
                      <td className="py-1 pr-2">{getMorphologyLabel(c.morphology)}</td>
                      <td className="py-1 pr-2 text-center">
                        {c.contaminated ? (
                          <span className="text-red-600 font-semibold">Да</span>
                        ) : (
                          'Нет'
                        )}
                      </td>
                      <td className="py-1">{c.position?.path ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ---------- 4. OPERATIONS LOG TABLE ---------- */}
          <div className="mb-6 break-before-auto">
            <h3 className="font-bold text-base mb-3 border-b pb-1">
              3. Журнал операций ({operations.length})
            </h3>
            {operations.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Нет операций для данного лота</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-1 pr-2 font-semibold">Дата/время</th>
                    <th className="text-left py-1 pr-2 font-semibold">Тип операции</th>
                    <th className="text-left py-1 pr-2 font-semibold">Оператор</th>
                    <th className="text-left py-1 font-semibold">Примечания</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op: any) => (
                    <tr key={op.id} className="border-b border-gray-300">
                      <td className="py-1 pr-2 whitespace-nowrap">
                        {formatTimestamp(op.completed_at ?? op.started_at)}
                      </td>
                      <td className="py-1 pr-2">
                        {OPERATION_TYPE_LABELS[op.type] ?? op.type}
                      </td>
                      <td className="py-1 pr-2">
                        {op.operator?.full_name ?? op.operator?.username ?? '-'}
                      </td>
                      <td className="py-1 text-xs">{op.notes ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ---------- 5. EMPTY ROWS FOR MANUAL ENTRIES ---------- */}
          <div className="mb-6 break-before-auto">
            <h3 className="font-bold text-base mb-3 border-b pb-1">
              4. Ручные записи
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-1 pr-2 font-semibold w-28">Дата</th>
                  <th className="text-left py-1 pr-2 font-semibold w-32">Операция</th>
                  <th className="text-left py-1 pr-2 font-semibold w-36">Контейнер</th>
                  <th className="text-left py-1 pr-2 font-semibold">Результат</th>
                  <th className="text-left py-1 font-semibold w-28">Подпись</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-300">
                    <td className="py-3 pr-2">&nbsp;</td>
                    <td className="py-3 pr-2">&nbsp;</td>
                    <td className="py-3 pr-2">&nbsp;</td>
                    <td className="py-3 pr-2">&nbsp;</td>
                    <td className="py-3">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------- 6. PLAN SECTION ---------- */}
          <div className="mb-6 break-before-auto">
            <h3 className="font-bold text-base mb-3 border-b pb-1">
              5. План
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="border rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-semibold">Следующее кормление (48ч от последнего)</span>
                </div>
                {nextFeedEstimate ? (
                  <p>{format(nextFeedEstimate, "dd.MM.yyyy HH:mm", { locale: ru })}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Нет данных о последнем кормлении
                  </p>
                )}
              </div>
              <div className="border rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="h-4 w-4" />
                  <span className="font-semibold">
                    Контейнеры готовые к пассажу (конфл. &ge; 80%)
                  </span>
                </div>
                {readyForPassage.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {readyForPassage.map((c: any) => (
                      <li key={c.id}>
                        {c.code} &mdash; {c.confluent_percent}%
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground italic">Нет контейнеров с конфл. &ge; 80%</p>
                )}
              </div>
            </div>
          </div>

          {/* ---------- 7. SIGNATURES ---------- */}
          <div className="mb-8 pt-6">
            <div className="flex justify-between text-sm">
              <div>
                Исполнитель ________________________ Дата ______________
              </div>
              <div>
                Проверил ________________________ Дата ______________
              </div>
            </div>
          </div>

          {/* ---------- 8. FOOTER ---------- */}
          <div className="border-t pt-3 text-center text-xs text-muted-foreground">
            LabPro v1.0 | Документ сформирован: {formatTimestamp(generatedAt)}
          </div>
        </div>
      )}

      {/* ============ PRINT STYLES ============ */}
      <style jsx global>{`
        @media print {
          /* Hide everything that is NOT the printable area */
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
          }
          .no-print,
          .no-print * {
            display: none !important;
          }

          /* Remove backgrounds for clean printing */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: transparent !important;
            color: black !important;
          }

          /* Proper page breaks */
          .break-before-auto {
            page-break-inside: avoid;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }

          /* Badge should remain readable */
          .print-area [data-slot="badge"] {
            border: 1px solid #333 !important;
            padding: 1px 6px !important;
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
// Default export wrapped in Suspense (required for useSearchParams)
// ---------------------------------------------------------------------------

export default function WorksheetPage() {
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
      <WorksheetContent />
    </Suspense>
  )
}
