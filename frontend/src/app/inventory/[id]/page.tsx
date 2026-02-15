"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, AlertCircle, AlertTriangle, Package, Pencil, Save, X, History } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { getBatchById, updateBatch, getInventoryMovements } from "@/lib/api"
import { formatDate, daysUntilExpiration, getExpirationWarningLevel } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: string) {
  switch (status) {
    case "AVAILABLE":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          В наличии
        </Badge>
      )
    case "RESERVED":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          Зарезервировано
        </Badge>
      )
    case "EXPIRED":
      return <Badge variant="destructive">Просрочено</Badge>
    case "DEPLETED":
      return <Badge variant="secondary">Израсходовано</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function ExpirationWarning({ expirationDate }: { expirationDate: string | null }) {
  if (!expirationDate) return null

  const daysLeft = daysUntilExpiration(expirationDate)
  if (daysLeft === null) return null

  const level = getExpirationWarningLevel(daysLeft)

  if (level === "critical") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {daysLeft < 0
          ? `Срок годности истёк ${Math.abs(daysLeft)} дн. назад`
          : daysLeft === 0
            ? "Срок годности истекает сегодня"
            : `Срок годности истекает через ${daysLeft} дн.`}
      </div>
    )
  }

  if (level === "warning") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Срок годности истекает через {daysLeft} дн.
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [loading, setLoading] = useState(true)
  const [batch, setBatch] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    batch_number: '',
    quantity: '',
    volume_per_unit: '',
    unit: '',
    status: '',
    manufacturer: '',
    catalog_number: '',
    supplier: '',
    invoice_number: '',
    invoice_date: '',
    expiration_date: '',
    notes: '',
  })

  useEffect(() => {
    loadBatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadBatch() {
    setLoading(true)
    try {
      const [data, movData] = await Promise.all([
        getBatchById(id),
        getInventoryMovements({ batch_id: id }).catch(() => []),
      ])
      setBatch(data)
      setMovements(movData || [])
    } catch (err: any) {
      const msg = err?.message || "Ошибка загрузки данных партии"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function startEditing() {
    setEditData({
      batch_number: batch.batch_number || '',
      quantity: batch.quantity != null ? String(batch.quantity) : '',
      volume_per_unit: batch.volume_per_unit != null ? String(batch.volume_per_unit) : '',
      unit: batch.unit || '',
      status: batch.status || '',
      manufacturer: batch.manufacturer || '',
      catalog_number: batch.catalog_number || '',
      supplier: batch.supplier || '',
      invoice_number: batch.invoice_number || '',
      invoice_date: batch.invoice_date ? batch.invoice_date.split('T')[0] : '',
      expiration_date: batch.expiration_date ? batch.expiration_date.split('T')[0] : '',
      notes: batch.notes || '',
    })
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updates: Record<string, unknown> = {
        batch_number: editData.batch_number || undefined,
        quantity: editData.quantity ? parseFloat(editData.quantity) : undefined,
        volume_per_unit: editData.volume_per_unit ? parseFloat(editData.volume_per_unit) : null,
        unit: editData.unit || undefined,
        status: editData.status || undefined,
        manufacturer: editData.manufacturer || null,
        catalog_number: editData.catalog_number || null,
        supplier: editData.supplier || null,
        invoice_number: editData.invoice_number || null,
        invoice_date: editData.invoice_date || null,
        expiration_date: editData.expiration_date || undefined,
        notes: editData.notes || undefined,
      }
      await updateBatch(id, updates)
      toast.success('Партия обновлена')
      setEditing(false)
      await loadBatch()
    } catch (err: any) {
      toast.error(`Ошибка: ${err?.message || 'Неизвестная ошибка'}`)
    } finally {
      setSaving(false)
    }
  }

  // ---- Loading state -------------------------------------------------------
  if (loading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ---- Error state ---------------------------------------------------------
  if (error || !batch) {
    return (
      <div className="container py-10 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error || "Партия не найдена"}</span>
        </div>
        <Button variant="outline" asChild>
          <Link href="/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку инвентаря
          </Link>
        </Button>
      </div>
    )
  }

  // =========================================================================
  // RENDER
  // =========================================================================
  const nomenclatureName =
    batch.nomenclature?.name || "Номенклатура не указана"

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">
                {batch.batch_number || batch.id?.slice(0, 8)}
              </span>
              {statusBadge(batch.status)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {nomenclatureName}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                <X className="h-4 w-4 mr-1" />
                Отмена
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Сохранить
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="h-4 w-4 mr-1" />
              Редактировать
            </Button>
          )}
        </div>
      </div>

      {/* Expiration warning */}
      <ExpirationWarning expirationDate={batch.expiration_date} />

      {/* Batch details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Информация о партии
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            /* Edit form */
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="batch_number">Номер партии</Label>
                  <Input
                    id="batch_number"
                    value={editData.batch_number}
                    onChange={(e) => setEditData(prev => ({ ...prev, batch_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Статус</Label>
                  <Select value={editData.status} onValueChange={(val) => setEditData(prev => ({ ...prev, status: val }))}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">В наличии</SelectItem>
                      <SelectItem value="RESERVED">Зарезервировано</SelectItem>
                      <SelectItem value="EXPIRED">Просрочено</SelectItem>
                      <SelectItem value="DEPLETED">Израсходовано</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Количество</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={0}
                    step="any"
                    value={editData.quantity}
                    onChange={(e) => setEditData(prev => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volume_per_unit">Объём / масса на ед.</Label>
                  <Input
                    id="volume_per_unit"
                    type="number"
                    min={0}
                    step="any"
                    value={editData.volume_per_unit}
                    onChange={(e) => setEditData(prev => ({ ...prev, volume_per_unit: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Единица измерения</Label>
                  <Input
                    id="unit"
                    value={editData.unit}
                    onChange={(e) => setEditData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="шт., мл, г..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiration_date">Срок годности</Label>
                <Input
                  id="expiration_date"
                  type="date"
                  value={editData.expiration_date}
                  onChange={(e) => setEditData(prev => ({ ...prev, expiration_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Производитель</Label>
                  <Input
                    id="manufacturer"
                    value={editData.manufacturer}
                    onChange={(e) => setEditData(prev => ({ ...prev, manufacturer: e.target.value }))}
                    placeholder="Gibco, Sigma-Aldrich..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalog_number">Каталожный номер</Label>
                  <Input
                    id="catalog_number"
                    value={editData.catalog_number}
                    onChange={(e) => setEditData(prev => ({ ...prev, catalog_number: e.target.value }))}
                    placeholder="12571-063"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Поставщик</Label>
                <Input
                  id="supplier"
                  value={editData.supplier}
                  onChange={(e) => setEditData(prev => ({ ...prev, supplier: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">Номер накладной</Label>
                  <Input
                    id="invoice_number"
                    value={editData.invoice_number}
                    onChange={(e) => setEditData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_date">Дата накладной</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={editData.invoice_date}
                    onChange={(e) => setEditData(prev => ({ ...prev, invoice_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Примечания</Label>
                <Textarea
                  id="notes"
                  value={editData.notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Read-only fields */}
              {batch.nomenclature && (
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Номенклатура (только чтение)</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{nomenclatureName}</Badge>
                    {batch.nomenclature.category && (
                      <Badge variant="secondary">{batch.nomenclature.category}</Badge>
                    )}
                    {batch.nomenclature.container_type?.name && (
                      <Badge variant="secondary">{batch.nomenclature.container_type.name}</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Read-only table */
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground w-[200px]">
                    Номер партии
                  </TableCell>
                  <TableCell>{batch.batch_number || "---"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">
                    Номенклатура
                  </TableCell>
                  <TableCell>{nomenclatureName}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">
                    Количество
                  </TableCell>
                  <TableCell>
                    {batch.quantity != null ? batch.quantity : "---"}{" "}
                    {batch.volume_per_unit ? 'фл' : (batch.unit || "")}
                    {batch.volume_per_unit != null && (
                      <span className="text-muted-foreground"> × {batch.volume_per_unit} {batch.unit || batch.nomenclature?.unit || 'мл'} / ед.</span>
                    )}
                  </TableCell>
                </TableRow>
                {batch.volume_per_unit != null && (
                  <>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Остаток в текущем флаконе
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{batch.current_unit_volume ?? batch.volume_per_unit}</span>
                        <span className="text-muted-foreground"> / {batch.volume_per_unit} {batch.unit || batch.nomenclature?.unit || 'мл'}</span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Общий доступный объём
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {(
                            (batch.current_unit_volume ?? batch.volume_per_unit) +
                            (Math.max(0, (batch.quantity || 0) - 1)) * batch.volume_per_unit
                          ).toFixed(1)}
                        </span>
                        <span className="text-muted-foreground"> {batch.unit || batch.nomenclature?.unit || 'мл'}</span>
                      </TableCell>
                    </TableRow>
                  </>
                )}
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">
                    Статус
                  </TableCell>
                  <TableCell>{statusBadge(batch.status)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">
                    Срок годности
                  </TableCell>
                  <TableCell>
                    {batch.expiration_date ? (
                      <div className="flex items-center gap-2">
                        <span>{formatDate(batch.expiration_date)}</span>
                        {(() => {
                          const daysLeft = daysUntilExpiration(batch.expiration_date)
                          if (daysLeft !== null && daysLeft > 0) {
                            return (
                              <Badge variant="outline" className="text-xs">
                                {daysLeft} дн.
                              </Badge>
                            )
                          }
                          return null
                        })()}
                      </div>
                    ) : (
                      "---"
                    )}
                  </TableCell>
                </TableRow>
                {batch.manufacturer && (
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">
                      Производитель
                    </TableCell>
                    <TableCell>{batch.manufacturer}</TableCell>
                  </TableRow>
                )}
                {batch.catalog_number && (
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">
                      Каталожный номер
                    </TableCell>
                    <TableCell className="font-mono text-sm">{batch.catalog_number}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">
                    Поставщик
                  </TableCell>
                  <TableCell>{batch.supplier || "---"}</TableCell>
                </TableRow>
                {(batch.invoice_number || batch.invoice_date) && (
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">
                      Накладная
                    </TableCell>
                    <TableCell>
                      {batch.invoice_number || '—'}
                      {batch.invoice_date && <span className="text-muted-foreground"> от {formatDate(batch.invoice_date)}</span>}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">
                    Примечания
                  </TableCell>
                  <TableCell>{batch.notes || "---"}</TableCell>
                </TableRow>
                {batch.nomenclature?.category && (
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">
                      Категория
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{batch.nomenclature.category}</Badge>
                    </TableCell>
                  </TableRow>
                )}
                {batch.nomenclature?.container_type && (
                  <>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Тип контейнера
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {batch.nomenclature.container_type.name || "---"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {batch.nomenclature.container_type.surface_area_cm2 != null && (
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Площадь поверхности
                        </TableCell>
                        <TableCell>
                          {batch.nomenclature.container_type.surface_area_cm2} см²
                        </TableCell>
                      </TableRow>
                    )}
                    {batch.nomenclature.container_type.volume_ml != null && (
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Рабочий объём
                        </TableCell>
                        <TableCell>
                          {batch.nomenclature.container_type.volume_ml} мл
                        </TableCell>
                      </TableRow>
                    )}
                    {batch.nomenclature.container_type.optimal_confluent != null && (
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Оптимальная конфлюэнтность
                        </TableCell>
                        <TableCell>
                          {batch.nomenclature.container_type.optimal_confluent}%
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inventory Movements */}
      {movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              История расхода ({movements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Кол-во</TableHead>
                  <TableHead>Примечание</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((mv: any) => (
                  <TableRow key={mv.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {mv.moved_at ? formatDate(mv.moved_at) : '---'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={mv.movement_type === 'RECEIVE' ? 'default' : 'secondary'}
                        className={mv.movement_type === 'CONSUME' ? 'bg-orange-100 text-orange-800' : mv.movement_type === 'RECEIVE' ? 'bg-green-100 text-green-800' : ''}>
                        {mv.movement_type === 'CONSUME' ? 'Расход' : mv.movement_type === 'RECEIVE' ? 'Приход' : mv.movement_type === 'ADJUST' ? 'Корректировка' : mv.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {mv.movement_type === 'CONSUME' ? '-' : '+'}{mv.quantity_change != null ? mv.quantity_change : mv.quantity || '---'} {batch.unit || ''}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {mv.notes || mv.reason || '---'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Back button */}
      <div>
        <Button variant="outline" asChild>
          <Link href="/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к инвентарю
          </Link>
        </Button>
      </div>
    </div>
  )
}
