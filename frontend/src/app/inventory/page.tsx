"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Package,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  AlertTriangle,
  Loader2,
  Minus,
  ArrowDownToLine,
  Trash2,
  Beaker,
  FlaskConical,
  TestTubes,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Note: Tabs still used for status filter
import { getBatches, updateBatch, createInventoryMovement, getReadyMedia } from '@/lib/api'
// Note: updateBatch and createInventoryMovement still used by Dispose handler
import { formatDate, formatNumber, daysUntilExpiration, getExpirationWarningLevel } from '@/lib/utils'

type CategoryTab = 'all' | 'CONSUMABLE' | 'MEDIUM' | 'SERUM' | 'BUFFER' | 'SUPPLEMENT' | 'ENZYME' | 'REAGENT' | 'ready_media' | 'stock_solutions'

const MEDIA_CATEGORIES = new Set(['MEDIUM', 'SERUM', 'BUFFER', 'SUPPLEMENT', 'ENZYME', 'REAGENT'])

/** Суммарный доступный объём (мл) для пофлаконных партий */
function getTotalVolume(batch: any): number {
  if (!batch.volume_per_unit || batch.volume_per_unit <= 0) return 0
  return (batch.quantity - 1) * batch.volume_per_unit
    + (batch.current_unit_volume ?? batch.volume_per_unit)
}

/** Проверяет, является ли остаток партии «Мало» по настраиваемому порогу номенклатуры */
function isLowStock(batch: any): boolean {
  if (batch.quantity <= 0) return false
  if (batch.status === 'EXPIRED') return false

  const nom = batch.nomenclature
  const threshold = nom?.min_stock_threshold
  const thresholdType = nom?.min_stock_threshold_type

  // Если порог не задан или 0 — fallback: quantity <= 5
  if (!threshold || threshold <= 0) return batch.quantity <= 5

  switch (thresholdType) {
    case 'VOLUME': {
      // Сравнение по суммарному доступному объёму (мл)
      const vol = getTotalVolume(batch)
      // Если нет пофлаконного учёта — fallback на quantity
      return vol > 0 ? vol <= threshold : batch.quantity <= threshold
    }
    case 'PERCENT': {
      // Процент от начального кол-ва
      const initial = batch.initial_quantity ?? batch.quantity
      if (initial <= 0) return false
      const percentLeft = (batch.quantity / initial) * 100
      return percentLeft <= threshold
    }
    default: // 'QTY' или legacy 'ABSOLUTE'
      // Сравнение по кол-ву штук/упаковок
      return batch.quantity <= threshold
  }
}

export default function InventoryPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('AVAILABLE')
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('all')
  const [batches, setBatches] = useState<any[]>([])
  const [readyMedia, setReadyMedia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Dispose dialog
  const [disposeOpen, setDisposeOpen] = useState(false)
  const [disposeTarget, setDisposeTarget] = useState<any>(null)
  const [disposeQty, setDisposeQty] = useState('')
  const [disposeReason, setDisposeReason] = useState('')
  const [disposeNotes, setDisposeNotes] = useState('')
  const [disposeSaving, setDisposeSaving] = useState(false)

  // Collapsible aliquot groups
  const [expandedAliquotGroups, setExpandedAliquotGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    setLoading(true)
    try {
      const [batchData, mediaData] = await Promise.all([
        getBatches({}),
        getReadyMedia(),
      ])
      setBatches(batchData || [])
      setReadyMedia(mediaData || [])
    } catch (error) {
      console.error('Error loading batches:', error)
      setBatches([])
      setReadyMedia([])
    } finally {
      setLoading(false)
    }
  }

  // Filter batches by category, status, and search
  const filteredBatches = batches.filter(batch => {
    // Category filter
    if (categoryTab === 'ready_media' || categoryTab === 'stock_solutions') return false // separate section
    if (categoryTab === 'MEDIUM') {
      if (!MEDIA_CATEGORIES.has(batch.nomenclature?.category)) return false
    } else if (categoryTab !== 'all' && batch.nomenclature?.category !== categoryTab) return false

    // Status filter
    if (selectedStatus === 'LOW_STOCK') {
      if (!isLowStock(batch)) return false
    } else if (selectedStatus !== 'all' && batch.status !== selectedStatus) return false

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        batch.batch_number?.toLowerCase().includes(q) ||
        batch.nomenclature?.name?.toLowerCase().includes(q) ||
        batch.id?.toLowerCase().includes(q)
      if (!matchesSearch) return false
    }

    return true
  })

  // Split ready_media into working solutions and stock solutions
  const workingMedia = readyMedia.filter(m => !m.physical_state || m.physical_state === 'WORKING_SOLUTION' || m.physical_state === 'AS_RECEIVED' || m.physical_state === 'ALIQUOT')
  const stockMedia = readyMedia.filter(m => m.physical_state === 'STOCK_SOLUTION')

  // Filtered ready media (working solutions for "Готовые среды" tab, stocks for "Стоки" tab)
  const activeMediaList = categoryTab === 'stock_solutions' ? stockMedia : workingMedia

  // Ready media uses ACTIVE instead of AVAILABLE
  // LOW_STOCK / USED не применимы к ready_media — трактуем как 'all'
  const filteredReadyMedia = activeMediaList.filter(media => {
    if (selectedStatus !== 'all' && selectedStatus !== 'LOW_STOCK' && selectedStatus !== 'USED') {
      const mediaStatus = selectedStatus === 'AVAILABLE' ? 'ACTIVE' : selectedStatus
      if (media.status !== mediaStatus) return false
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return media.code?.toLowerCase().includes(q) ||
        media.name?.toLowerCase().includes(q) ||
        media.batch?.nomenclature?.name?.toLowerCase().includes(q)
    }
    return true
  })
  // FEFO sort: expiring soonest first
  .sort((a, b) => {
    const aExp = getMediaExpiresAt(a)
    const bExp = getMediaExpiresAt(b)
    if (!aExp) return 1
    if (!bExp) return -1
    return aExp.getTime() - bExp.getTime()
  })

  // Group ALIQUOTs by source for collapsible display
  type AliquotGroup = { key: string; name: string; volumeMl: number; items: typeof filteredReadyMedia; activeCount: number }
  const groupedMediaRows = useMemo(() => {
    if (categoryTab === 'stock_solutions') return { groups: new Map<string, AliquotGroup>(), nonAliquots: filteredReadyMedia, aliquotIds: new Set<string>() }

    const groups = new Map<string, AliquotGroup>()
    const aliquotIds = new Set<string>()

    for (const media of filteredReadyMedia) {
      if (media.physical_state !== 'ALIQUOT') continue
      const sourceId = media.composition?.source_id || media.parent_medium_id || ''
      const vol = media.volume_ml ?? 0
      const groupKey = `${media.name || ''}::${vol}::${sourceId}`
      aliquotIds.add(media.id)
      const existing = groups.get(groupKey)
      if (existing) {
        existing.items.push(media)
        if (media.status === 'ACTIVE') existing.activeCount++
      } else {
        groups.set(groupKey, {
          key: groupKey,
          name: media.name || media.batch?.nomenclature?.name || '—',
          volumeMl: vol,
          items: [media],
          activeCount: media.status === 'ACTIVE' ? 1 : 0,
        })
      }
    }

    // Only group if there are 2+ aliquots in a group; singles stay as regular rows
    for (const [key, group] of groups) {
      if (group.items.length < 2) {
        group.items.forEach(m => aliquotIds.delete(m.id))
        groups.delete(key)
      }
    }

    const nonAliquots = filteredReadyMedia.filter(m => !aliquotIds.has(m.id))
    return { groups, nonAliquots, aliquotIds }
  }, [filteredReadyMedia, categoryTab])

  const toggleAliquotGroup = (key: string) => {
    setExpandedAliquotGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Stats for current category
  const isMediaTab = categoryTab === 'ready_media' || categoryTab === 'stock_solutions'
  const categoryBatches = categoryTab === 'all'
    ? batches
    : isMediaTab
      ? []
      : categoryTab === 'MEDIUM'
        ? batches.filter(b => MEDIA_CATEGORIES.has(b.nomenclature?.category))
        : batches.filter(b => b.nomenclature?.category === categoryTab)

  const stats = {
    total: isMediaTab ? activeMediaList.length : categoryBatches.length,
    available: isMediaTab
      ? activeMediaList.filter(m => m.status === 'ACTIVE').length
      : categoryBatches.filter(b => b.status === 'AVAILABLE' || b.status === 'ACTIVE').length,
    lowStock: isMediaTab
      ? 0
      : categoryBatches.filter(b => isLowStock(b)).length,
    expired: isMediaTab
      ? activeMediaList.filter(m => m.status === 'EXPIRED').length
      : categoryBatches.filter(b => b.status === 'EXPIRED').length,
  }

  const categoryStats = {
    consumable: batches.filter(b => b.nomenclature?.category === 'CONSUMABLE').length,
    media: batches.filter(b => MEDIA_CATEGORIES.has(b.nomenclature?.category)).length,
    readyMedia: workingMedia.length,
    stocks: stockMedia.length,
  }

  // ==================== Dispose handler ====================
  const handleDispose = async () => {
    if (!disposeTarget || !disposeQty || Number(disposeQty) <= 0) {
      toast.error('Укажите корректное количество')
      return
    }
    if (Number(disposeQty) > (disposeTarget.quantity || 0)) {
      toast.error('Количество превышает остаток')
      return
    }
    setDisposeSaving(true)
    try {
      const newQty = (disposeTarget.quantity || 0) - Number(disposeQty)
      const updates: Record<string, unknown> = { quantity: newQty }
      if (newQty <= 0) updates.status = 'USED'
      await updateBatch(disposeTarget.id, updates)

      const movementType = disposeReason === 'EXPIRED' ? 'DISPOSE' :
                           disposeReason === 'DAMAGED' ? 'DISPOSE' : 'CONSUME'
      await createInventoryMovement({
        batch_id: disposeTarget.id,
        movement_type: movementType,
        quantity: Number(disposeQty),
        notes: [disposeReason ? `Причина: ${getDisposeReasonLabel(disposeReason)}` : '', disposeNotes].filter(Boolean).join('. ') || null,
      })
      toast.success(`Списано ${disposeQty} ${disposeTarget.unit || 'шт'}`)
      setDisposeOpen(false)
      setDisposeQty('')
      setDisposeReason('')
      setDisposeNotes('')
      loadBatches()
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка при списании')
    } finally {
      setDisposeSaving(false)
    }
  }

  // ==================== Render ====================
  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Склад</h1>
          <p className="text-muted-foreground">
            Расходные материалы, среды и реагенты
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/inventory/new">
              <Plus className="mr-2 h-4 w-4" />
              Добавить партию
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/ready-media/new">
              <Beaker className="mr-2 h-4 w-4" />
              Приготовить среду
            </Link>
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button variant={categoryTab === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryTab('all')} className="gap-1.5">
          <Package className="h-4 w-4" />Все<Badge variant="secondary" className="ml-1 text-xs">{batches.length}</Badge>
        </Button>
        <Button variant={categoryTab === 'CONSUMABLE' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryTab('CONSUMABLE')} className="gap-1.5">
          <TestTubes className="h-4 w-4" />Контейнеры<Badge variant="secondary" className="ml-1 text-xs">{categoryStats.consumable}</Badge>
        </Button>
        <Button variant={categoryTab === 'MEDIUM' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryTab('MEDIUM')} className="gap-1.5">
          <FlaskConical className="h-4 w-4" />Поступления<Badge variant="secondary" className="ml-1 text-xs">{categoryStats.media}</Badge>
        </Button>
        <Button variant={categoryTab === 'stock_solutions' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryTab('stock_solutions')} className="gap-1.5">
          <FlaskConical className="h-4 w-4" />Стоки<Badge variant="secondary" className="ml-1 text-xs">{categoryStats.stocks}</Badge>
        </Button>
        <Button variant={categoryTab === 'ready_media' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryTab('ready_media')} className="gap-1.5">
          <Beaker className="h-4 w-4" />Готовые среды<Badge variant="secondary" className="ml-1 text-xs">{categoryStats.readyMedia}</Badge>
        </Button>
      </div>

      {/* Stats — clickable filters */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className={`cursor-pointer transition-shadow hover:shadow-md ${selectedStatus === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedStatus('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего позиций
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-shadow hover:shadow-md ${selectedStatus === 'AVAILABLE' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setSelectedStatus('AVAILABLE')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              В наличии
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-shadow hover:shadow-md ${selectedStatus === 'LOW_STOCK' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => setSelectedStatus('LOW_STOCK')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Мало на складе
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-shadow hover:shadow-md ${selectedStatus === 'EXPIRED' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setSelectedStatus('EXPIRED')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Просрочено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, номеру партии..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="AVAILABLE">В наличии</TabsTrigger>
            <TabsTrigger value="LOW_STOCK">Мало</TabsTrigger>
            <TabsTrigger value="EXPIRED">Просрочено</TabsTrigger>
            <TabsTrigger value="USED">Использовано</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Inventory Table or Ready Media */}
      <Card>
        <CardHeader>
          <CardTitle>
            {getCategoryTitle(categoryTab)}
          </CardTitle>
          <CardDescription>
            {loading ? 'Загрузка...' : isMediaTab ? `${filteredReadyMedia.length} ${categoryTab === 'stock_solutions' ? 'стоков' : 'готовых сред'}` : `${filteredBatches.length} позиций`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isMediaTab ? (
            /* Ready media / Stock solutions table */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Состав</TableHead>
                  {categoryTab === 'stock_solutions' && <TableHead className="text-center">Концентрация</TableHead>}
                  <TableHead className="text-center">Объём</TableHead>
                  <TableHead>Приготовлено</TableHead>
                  <TableHead>Годность</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const renderMediaRow = (media: any, indent = false) => {
                    const expInfo = getMediaExpiration(media)
                    return (
                      <TableRow key={media.id} className={`cursor-pointer hover:bg-muted/50 ${indent ? 'bg-cyan-50/30' : ''}`} onClick={() => router.push(`/ready-media/${media.id}`)}>
                        <TableCell className={indent ? 'pl-8' : ''}>
                          <span className="font-medium">
                            {media.code || media.id?.slice(0, 8)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{media.name || media.batch?.nomenclature?.name || '—'}</span>
                            {media.physical_state === 'ALIQUOT' && !indent && (
                              <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-300">Аликвота</Badge>
                            )}
                          </div>
                          {media.notes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{media.notes}</p>}
                        </TableCell>
                        {categoryTab === 'stock_solutions' && (
                          <TableCell className="text-center">
                            {media.concentration ? (
                              <span className="font-semibold">{media.concentration}{media.concentration_unit || '×'}</span>
                            ) : '—'}
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <span className="font-semibold">{media.current_volume_ml ?? media.volume_ml ?? 0}</span>
                          <span className="text-muted-foreground text-xs ml-1">мл</span>
                        </TableCell>
                        <TableCell>{media.created_at ? formatDate(media.created_at) : '—'}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 text-sm ${
                            expInfo.level === 'expired' ? 'text-red-600 font-medium' :
                            expInfo.level === 'warning' ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            <Clock className="h-3 w-3" />
                            {expInfo.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getReadyMediaStatusColor(media.status)}>
                            {getReadyMediaStatusLabel(media.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/ready-media/${media.id}`} onClick={e => e.stopPropagation()}>
                            <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  }

                  const rows: React.ReactNode[] = []

                  // Render non-aliquot items (and single aliquots not in groups)
                  for (const media of groupedMediaRows.nonAliquots) {
                    rows.push(renderMediaRow(media))
                  }

                  // Render aliquot groups
                  for (const [, group] of groupedMediaRows.groups) {
                    const isExpanded = expandedAliquotGroups.has(group.key)
                    const totalVol = group.items.reduce((s, m) => s + (m.current_volume_ml ?? m.volume_ml ?? 0), 0)
                    // Find earliest expiration among group items
                    const earliestExp = group.items.reduce<{ level: string; label: string }>((best, m) => {
                      const exp = getMediaExpiration(m)
                      if (exp.level === 'expired') return exp
                      if (exp.level === 'warning' && best.level !== 'expired') return exp
                      return best
                    }, getMediaExpiration(group.items[0]))

                    rows.push(
                      <TableRow
                        key={`group-${group.key}`}
                        className="cursor-pointer hover:bg-cyan-50/50 bg-cyan-50/20 border-l-2 border-l-cyan-400"
                        onClick={() => toggleAliquotGroup(group.key)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-cyan-600 shrink-0" />
                              : <ChevronRight className="h-4 w-4 text-cyan-600 shrink-0" />
                            }
                            <span className="text-xs text-muted-foreground">{group.items.length} шт</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{group.name}</span>
                            <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-300">
                              Аликвоты {group.activeCount}/{group.items.length}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">по {group.volumeMl} мл</p>
                        </TableCell>
                        {categoryTab === 'stock_solutions' && <TableCell />}
                        <TableCell className="text-center">
                          <span className="font-semibold">{totalVol}</span>
                          <span className="text-muted-foreground text-xs ml-1">мл</span>
                        </TableCell>
                        <TableCell>{group.items[0]?.created_at ? formatDate(group.items[0].created_at) : '—'}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 text-sm ${
                            earliestExp.level === 'expired' ? 'text-red-600 font-medium' :
                            earliestExp.level === 'warning' ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            <Clock className="h-3 w-3" />
                            {earliestExp.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">
                            {group.activeCount > 0 ? `${group.activeCount} актив.` : 'нет актив.'}
                          </Badge>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )

                    if (isExpanded) {
                      for (const media of group.items) {
                        rows.push(renderMediaRow(media, true))
                      }
                    }
                  }

                  return rows.length > 0 ? rows : (
                    <TableRow>
                      <TableCell colSpan={categoryTab === 'stock_solutions' ? 8 : 7} className="text-center py-8 text-muted-foreground">
                        <Beaker className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p>{categoryTab === 'stock_solutions' ? 'Стоковые растворы не найдены' : 'Готовые среды не найдены'}</p>
                        <p className="mt-2 text-sm">{categoryTab === 'stock_solutions' ? 'Приготовьте сток через калькулятор' : 'Нет приготовленных сред'}</p>
                      </TableCell>
                    </TableRow>
                  )
                })()}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номенклатура</TableHead>
                  <TableHead>Партия</TableHead>
                  <TableHead className="text-center">Остаток</TableHead>
                  <TableHead>Срок годности</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => {
                  const daysLeft = daysUntilExpiration(batch.expiration_date)
                  const warningLevel = getExpirationWarningLevel(daysLeft)

                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <Link href={`/inventory/${batch.id}`} className="font-medium hover:underline text-blue-600">
                          {batch.nomenclature?.name || '---'}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {batch.batch_number || batch.id?.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${batch.quantity <= 0 ? 'text-red-600' : isLowStock(batch) ? 'text-amber-600' : ''}`}>
                          {formatNumber(batch.quantity)}
                        </span>
                        {batch.nomenclature?.category === 'CONSUMABLE' && batch.volume_per_unit ? (
                          <span className="text-muted-foreground text-xs ml-1">
                            уп × {batch.volume_per_unit} шт
                            {batch.current_unit_volume != null && batch.current_unit_volume < batch.volume_per_unit && (
                              <> + {batch.current_unit_volume} шт (откр.)</>
                            )}
                          </span>
                        ) : batch.volume_per_unit && batch.nomenclature?.category !== 'CONSUMABLE' ? (
                          <span className="text-muted-foreground text-xs ml-1">
                            фл, тек: {batch.current_unit_volume ?? batch.volume_per_unit}/{batch.volume_per_unit} мл
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs ml-1">{batch.unit || 'шт'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {warningLevel === 'critical' && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          <span className={
                            warningLevel === 'critical' ? 'text-red-600 font-medium' :
                            warningLevel === 'warning' ? 'text-yellow-600' : ''
                          }>
                            {batch.expiration_date ? formatDate(batch.expiration_date) : '---'}
                          </span>
                          {daysLeft !== null && daysLeft > 0 && daysLeft <= 60 && (
                            <Badge variant="outline" className="text-xs">
                              {daysLeft} дн
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryColor(batch.nomenclature?.category)}>
                          {getCategoryLabel(batch.nomenclature?.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={getStatusColor(batch.status)}>
                            {getStatusLabel(batch.status)}
                          </Badge>
                          {isLowStock(batch) && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                              Мало
                            </Badge>
                          )}
                          {batch.status === 'EXPIRED' && (
                            <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-xs">
                              Просрочено
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Действия</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/inventory/${batch.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Просмотр
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/inventory/new?nomenclature_id=${batch.nomenclature_id}&category=${batch.nomenclature?.category || ''}`}>
                                <ArrowDownToLine className="mr-2 h-4 w-4" />
                                Приёмка
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setDisposeTarget(batch)
                                setDisposeQty('')
                                setDisposeReason('')
                                setDisposeNotes('')
                                setDisposeOpen(true)
                              }}
                              disabled={batch.quantity <= 0}
                            >
                              <Minus className="mr-2 h-4 w-4" />
                              Списание
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredBatches.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>Позиции не найдены</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ==================== Dispose Dialog ==================== */}
      <Dialog open={disposeOpen} onOpenChange={setDisposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Списание со склада
            </DialogTitle>
            <DialogDescription>
              {disposeTarget?.nomenclature?.name} — партия {disposeTarget?.batch_number || disposeTarget?.id?.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted">
              <span>Текущий остаток:</span>
              <span className="font-semibold">{disposeTarget?.quantity || 0} {disposeTarget?.unit || 'шт'}</span>
            </div>

            <div className="space-y-2">
              <Label>Количество к списанию *</Label>
              <Input
                type="number"
                min="1"
                max={disposeTarget?.quantity || 0}
                step="any"
                value={disposeQty}
                onChange={(e) => setDisposeQty(e.target.value)}
                placeholder="0"
                autoFocus
              />
              {disposeQty && Number(disposeQty) > (disposeTarget?.quantity || 0) && (
                <p className="text-sm text-red-600">Превышает остаток!</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Причина списания</Label>
              <Select value={disposeReason} onValueChange={setDisposeReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите причину" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USED">Использовано в работе</SelectItem>
                  <SelectItem value="EXPIRED">Истёк срок годности</SelectItem>
                  <SelectItem value="DAMAGED">Повреждено / брак</SelectItem>
                  <SelectItem value="OTHER">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Комментарий</Label>
              <Textarea
                value={disposeNotes}
                onChange={(e) => setDisposeNotes(e.target.value)}
                placeholder="Подробности списания..."
                rows={2}
              />
            </div>

            {disposeQty && Number(disposeQty) > 0 && Number(disposeQty) <= (disposeTarget?.quantity || 0) && (
              <div className="text-sm p-3 rounded-lg bg-red-50 text-red-700">
                Остаток после списания: <strong>{(disposeTarget?.quantity || 0) - Number(disposeQty)} {disposeTarget?.unit || 'шт'}</strong>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposeOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDispose}
              disabled={disposeSaving || !disposeQty || Number(disposeQty) <= 0 || Number(disposeQty) > (disposeTarget?.quantity || 0)}
            >
              {disposeSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Списать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== Helper functions ====================

function getCategoryTitle(tab: CategoryTab): string {
  const titles: Record<string, string> = {
    all: 'Все позиции',
    CONSUMABLE: 'Контейнеры',
    MEDIUM: 'Поступления',
    ready_media: 'Готовые среды',
    stock_solutions: 'Стоки',
  }
  return titles[tab] || 'Позиции'
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    CONSUMABLE: 'Контейнер',
    MEDIUM: 'Среда',
    SERUM: 'Сыворотка',
    BUFFER: 'Буфер',
    SUPPLEMENT: 'Добавка',
    ENZYME: 'Фермент',
    REAGENT: 'Реагент',
    EQUIP: 'Оборудование',
  }
  return labels[category] || category || '---'
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    CONSUMABLE: 'border-blue-300 text-blue-700',
    MEDIUM: 'border-purple-300 text-purple-700',
    SERUM: 'border-pink-300 text-pink-700',
    BUFFER: 'border-cyan-300 text-cyan-700',
    SUPPLEMENT: 'border-emerald-300 text-emerald-700',
    ENZYME: 'border-orange-300 text-orange-700',
    REAGENT: 'border-amber-300 text-amber-700',
    EQUIP: 'border-gray-300 text-gray-700',
  }
  return colors[category] || ''
}

function getReadyMediaStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PREPARED: 'bg-blue-100 text-blue-800',
    ACTIVE: 'bg-green-100 text-green-800',
    IN_USE: 'bg-yellow-100 text-yellow-800',
    EXPIRED: 'bg-red-100 text-red-800',
    DISPOSE: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getReadyMediaStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PREPARED: 'Приготовлена',
    ACTIVE: 'Готова',
    IN_USE: 'В использовании',
    EXPIRED: 'Просрочена',
    DISPOSE: 'Утилизирована',
  }
  return labels[status] || status
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-800',
    ACTIVE: 'bg-green-100 text-green-800',
    RESERVED: 'bg-blue-100 text-blue-800',
    EXPIRED: 'bg-red-100 text-red-800',
    USED: 'bg-gray-100 text-gray-800',
    QUARANTINE: 'bg-yellow-100 text-yellow-800',
    DISPOSE: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    AVAILABLE: 'В наличии',
    ACTIVE: 'Активна',
    RESERVED: 'Зарезервировано',
    EXPIRED: 'Просрочено',
    USED: 'Использовано',
    QUARANTINE: 'Карантин',
    DISPOSE: 'Списано',
  }
  return labels[status] || status
}

function getDisposeReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    USED: 'Использовано в работе',
    EXPIRED: 'Истёк срок годности',
    DAMAGED: 'Повреждено / брак',
    OTHER: 'Другое',
  }
  return labels[reason] || reason
}

function getMediaExpiresAt(media: any): Date | null {
  // Приоритет: expiration_date (ISO строка) > created_at + expiration_hours
  if (media.expiration_date) return new Date(media.expiration_date)
  if (media.created_at && media.expiration_hours) {
    const prepared = new Date(media.created_at)
    return new Date(prepared.getTime() + media.expiration_hours * 60 * 60 * 1000)
  }
  return null
}

function getMediaExpiration(media: any): { level: 'ok' | 'warning' | 'expired'; label: string } {
  const expires = getMediaExpiresAt(media)
  if (!expires) return { level: 'ok', label: '—' }
  const now = new Date()
  const hoursLeft = (expires.getTime() - now.getTime()) / (1000 * 60 * 60)
  const dateStr = formatDate(expires.toISOString())
  if (hoursLeft < 0) return { level: 'expired', label: `Просрочена (${dateStr})` }
  if (hoursLeft < 6) return { level: 'warning', label: `${hoursLeft.toFixed(1)} ч (до ${dateStr})` }
  if (hoursLeft < 24) return { level: 'ok', label: `${hoursLeft.toFixed(0)} ч (до ${dateStr})` }
  return { level: 'ok', label: `${(hoursLeft / 24).toFixed(0)} дн (до ${dateStr})` }
}
