"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Beaker, Loader2, Pencil, Trash2, PackageMinus,
  Clock, Droplets, FlaskConical, AlertTriangle, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { QRLabel } from '@/components/qr-label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'

import {
  getReadyMediumById, updateReadyMedium, deleteReadyMedium, writeOffReadyMediumFull
} from '@/lib/api'
import { PHYSICAL_STATE_LABELS } from '@/types'
import type { PhysicalState } from '@/types'

// ---- helpers ----
function fmtDate(d?: string | null) {
  if (!d) return '—'
  try { return format(new Date(d), 'd MMM yyyy', { locale: ru }) } catch { return d }
}

function fmtDateTime(d?: string | null) {
  if (!d) return '—'
  try { return format(new Date(d), 'd MMM yyyy, HH:mm', { locale: ru }) } catch { return d }
}

function getExpiresAt(media: any): Date | null {
  if (media.expiration_date) return new Date(media.expiration_date)
  if (media.created_at && media.expiration_hours) {
    return new Date(new Date(media.created_at).getTime() + media.expiration_hours * 3600000)
  }
  return null
}

function getExpirationInfo(media: any): { level: 'ok' | 'warning' | 'expired'; label: string; date: string } {
  const expires = getExpiresAt(media)
  if (!expires) return { level: 'ok', label: '—', date: '—' }
  const now = new Date()
  const hoursLeft = (expires.getTime() - now.getTime()) / 3600000
  const dateStr = format(expires, 'd MMM yyyy, HH:mm', { locale: ru })
  if (hoursLeft < 0) return { level: 'expired', label: 'Просрочена', date: dateStr }
  if (hoursLeft < 6) return { level: 'warning', label: `${hoursLeft.toFixed(1)} ч`, date: dateStr }
  if (hoursLeft < 24) return { level: 'ok', label: `${hoursLeft.toFixed(0)} ч`, date: dateStr }
  return { level: 'ok', label: `${(hoursLeft / 24).toFixed(0)} дн`, date: dateStr }
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 border-green-300',
  PREPARED: 'bg-blue-100 text-blue-800 border-blue-300',
  USED: 'bg-gray-100 text-gray-600 border-gray-300',
  EXPIRED: 'bg-red-100 text-red-800 border-red-300',
  DISPOSE: 'bg-orange-100 text-orange-800 border-orange-300',
  QUARANTINE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Активна',
  PREPARED: 'Подготовлена',
  USED: 'Использована',
  EXPIRED: 'Просрочена',
  DISPOSE: 'Утилизирована',
  QUARANTINE: 'Карантин',
}

// ---- component ----
export default function ReadyMediumDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [medium, setMedium] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editExpDate, setEditExpDate] = useState('')
  const [saving, setSaving] = useState(false)

  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getReadyMediumById(id)
      setMedium(data)
    } catch (err) {
      console.error(err)
      toast.error('Не удалось загрузить данные среды')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) loadData()
  }, [id, loadData])

  // ---- handlers ----
  const handleOpenEdit = () => {
    setEditName(medium?.name || '')
    setEditNotes(medium?.notes || '')
    // Формат даты для input type="datetime-local"
    const exp = getExpiresAt(medium)
    setEditExpDate(exp ? format(exp, "yyyy-MM-dd'T'HH:mm") : '')
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const updates: Record<string, unknown> = {}
      if (editName !== (medium?.name || '')) updates.name = editName
      if (editNotes !== (medium?.notes || '')) updates.notes = editNotes
      if (editExpDate) updates.expiration_date = new Date(editExpDate).toISOString()
      if (Object.keys(updates).length > 0) {
        await updateReadyMedium(id, updates)
        toast.success('Среда обновлена')
        await loadData()
      }
      setEditOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Ошибка обновления')
    } finally {
      setSaving(false)
    }
  }

  const handleWriteOff = async () => {
    setActionLoading(true)
    try {
      await writeOffReadyMediumFull(id)
      toast.success('Среда полностью списана')
      await loadData()
      setWriteOffOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Ошибка списания')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      await deleteReadyMedium(id)
      toast.success('Среда удалена')
      router.push('/inventory')
    } catch (err) {
      console.error(err)
      toast.error('Ошибка удаления')
    } finally {
      setActionLoading(false)
      setDeleteOpen(false)
    }
  }

  // ---- loading ----
  if (loading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!medium) {
    return (
      <div className="container py-6 text-center">
        <p className="text-muted-foreground">Среда не найдена</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/inventory')}>
          Вернуться на склад
        </Button>
      </div>
    )
  }

  const composition = medium.composition || {}
  const expInfo = getExpirationInfo(medium)
  const volumePercent = medium.volume_ml > 0
    ? Math.round(((medium.current_volume_ml || 0) / medium.volume_ml) * 100)
    : 0
  const isUsable = medium.status === 'ACTIVE' || medium.status === 'PREPARED'

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/inventory"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{medium.code || 'RM'}</h1>
              <Badge variant="outline" className={STATUS_COLOR[medium.status] || ''}>
                {STATUS_LABEL[medium.status] || medium.status}
              </Badge>
              {medium.physical_state && (
                <Badge variant="outline" className={
                  medium.physical_state === 'STOCK_SOLUTION' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                  medium.physical_state === 'WORKING_SOLUTION' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  medium.physical_state === 'ALIQUOT' ? 'bg-cyan-100 text-cyan-800 border-cyan-300' :
                  'bg-gray-100 text-gray-700 border-gray-300'
                }>
                  {PHYSICAL_STATE_LABELS[medium.physical_state as PhysicalState] || medium.physical_state}
                </Badge>
              )}
              {medium.concentration && (
                <Badge variant="secondary">{medium.concentration}{medium.concentration_unit || '×'}</Badge>
              )}
              {expInfo.level === 'expired' && (
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                  Просрочена
                </Badge>
              )}
              {expInfo.level === 'warning' && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  <Clock className="h-3 w-3 mr-1" />{expInfo.label}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">{medium.name || 'Готовая среда'}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleOpenEdit}>
            <Pencil className="h-4 w-4 mr-1" /> Редактировать
          </Button>
          {isUsable && (
            <Button variant="outline" size="sm" className="text-orange-600" onClick={() => setWriteOffOpen(true)}>
              <PackageMinus className="h-4 w-4 mr-1" /> Списать
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-red-600" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Удалить
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Основная информация */}
          <Card>
            <CardHeader><CardTitle>Информация</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Код</p>
                  <p className="font-medium">{medium.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Название</p>
                  <p className="font-medium">{medium.name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Приготовлено</p>
                  <p className="font-medium">{fmtDateTime(medium.prepared_at || medium.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Годен до</p>
                  <p className={`font-medium ${
                    expInfo.level === 'expired' ? 'text-red-600' :
                    expInfo.level === 'warning' ? 'text-amber-600' : ''
                  }`}>{expInfo.date}</p>
                </div>
                {medium.physical_state && (
                  <div>
                    <p className="text-sm text-muted-foreground">Тип раствора</p>
                    <p className="font-medium">{PHYSICAL_STATE_LABELS[medium.physical_state as PhysicalState] || medium.physical_state}</p>
                  </div>
                )}
                {medium.concentration && (
                  <div>
                    <p className="text-sm text-muted-foreground">Концентрация</p>
                    <p className="font-medium">{medium.concentration}{medium.concentration_unit || '×'}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Объём (начальный)</p>
                  <p className="font-medium">{medium.volume_ml || 0} мл</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Объём (текущий)</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{medium.current_volume_ml ?? medium.volume_ml ?? 0} мл</p>
                    {medium.volume_ml > 0 && (
                      <Badge variant="outline" className={
                        volumePercent > 50 ? 'bg-green-50 text-green-700' :
                        volumePercent > 20 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }>
                        {volumePercent}%
                      </Badge>
                    )}
                  </div>
                </div>
                {medium.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Примечания</p>
                    <p className="font-medium">{medium.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Состав */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" /> Состав
              </CardTitle>
            </CardHeader>
            <CardContent>
              {composition.mode && (
                <Badge variant="outline" className="mb-3 text-xs">
                  {composition.mode === 'PERCENT' ? '% Процентный' : composition.mode === 'ABSOLUTE' ? 'mg Абсолютный' : composition.mode === 'DILUTION' ? 'C₁V₁ Разведение' : composition.mode}
                </Badge>
              )}
              {composition.mode === 'DILUTION' ? (
                /* DILUTION mode — source + diluent */
                <div className="space-y-3">
                  {composition.source && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FlaskConical className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="font-medium">{composition.source.name || 'Сток'}</p>
                          <p className="text-xs text-muted-foreground">
                            Стоковый раствор ({composition.source.concentration}{composition.source.concentration_unit || '×'})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{composition.source.volume_ml} мл</p>
                      </div>
                    </div>
                  )}
                  {composition.diluent && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="font-medium">{composition.diluent.nomenclature || 'Разбавитель'}</p>
                          <p className="text-xs text-muted-foreground">Разбавитель</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{composition.diluent.volume_ml} мл</p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t text-sm">
                    <span className="text-muted-foreground">Целевая концентрация</span>
                    <span className="font-semibold">{composition.target_concentration}{composition.target_concentration_unit || '×'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Общий объём</span>
                    <span className="font-semibold">{composition.total_volume_ml || medium.volume_ml || '—'} мл</span>
                  </div>
                </div>
              ) : (composition.base || composition.components) ? (
                <div className="space-y-3">
                  {/* Base */}
                  {composition.base && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Beaker className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">
                            {composition.base.nomenclature || composition.base.name || 'База'}
                          </p>
                          <p className="text-xs text-muted-foreground">Основная среда</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {composition.base.percent != null && <p className="font-semibold">{composition.base.percent}%</p>}
                        {composition.base.volume_ml != null && (
                          <p className="text-xs text-muted-foreground">{composition.base.volume_ml} мл</p>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Components */}
                  {(composition.components || []).map((comp: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Droplets className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="font-medium">
                            {comp.nomenclature || comp.name || `Компонент ${i + 1}`}
                          </p>
                          {comp.category && (
                            <p className="text-xs text-muted-foreground">{comp.category}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {comp.percent != null && <p className="font-semibold">{comp.percent}%</p>}
                        {comp.amount != null && <p className="font-semibold">{comp.amount} {comp.amount_unit || ''}</p>}
                        {comp.volume_ml != null && (
                          <p className="text-xs text-muted-foreground">{comp.volume_ml} мл</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="flex justify-between pt-2 border-t text-sm">
                    <span className="text-muted-foreground">Общий объём</span>
                    <span className="font-semibold">{composition.total_volume_ml || medium.volume_ml || '—'} мл</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Информация о составе не сохранена
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: QR + sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <QRLabel
                code={`RM:${medium.code}`}
                title={medium.name || medium.code}
                subtitle="Готовая среда"
                metadata={{
                  'Объём': `${medium.current_volume_ml ?? medium.volume_ml ?? 0} мл`,
                  'Статус': STATUS_LABEL[medium.status] || medium.status,
                }}
              />
            </CardContent>
          </Card>

          {/* Volume bar */}
          {medium.volume_ml > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Остаток объёма</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{medium.current_volume_ml ?? medium.volume_ml} мл</span>
                    <span className="text-muted-foreground">из {medium.volume_ml} мл</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        volumePercent > 50 ? 'bg-green-500' :
                        volumePercent > 20 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, volumePercent)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expiration status */}
          {expInfo.level !== 'ok' && (
            <Card className={expInfo.level === 'expired' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-5 w-5 ${expInfo.level === 'expired' ? 'text-red-500' : 'text-amber-500'}`} />
                  <div>
                    <p className="font-medium text-sm">
                      {expInfo.level === 'expired' ? 'Срок годности истёк' : 'Скоро истечёт'}
                    </p>
                    <p className="text-xs text-muted-foreground">{expInfo.date}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ---- Edit Dialog ---- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать среду</DialogTitle>
            <DialogDescription>Измените параметры готовой среды</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Название</Label>
              <Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-exp">Годен до</Label>
              <Input id="edit-exp" type="datetime-local" value={editExpDate} onChange={e => setEditExpDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-notes">Примечания</Label>
              <Textarea id="edit-notes" value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Write-off Dialog ---- */}
      <AlertDialog open={writeOffOpen} onOpenChange={setWriteOffOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Полное списание</AlertDialogTitle>
            <AlertDialogDescription>
              Среда {medium.code} будет полностью списана. Текущий остаток ({medium.current_volume_ml ?? medium.volume_ml} мл) обнулится, статус сменится на «Использована».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleWriteOff} disabled={actionLoading} className="bg-orange-600 hover:bg-orange-700">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Списать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- Delete Dialog ---- */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить среду</AlertDialogTitle>
            <AlertDialogDescription>
              Среда {medium.code} будет удалена. Если возможно, оставшийся объём ({medium.current_volume_ml ?? 0} мл) будет возвращён в исходную партию. Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
