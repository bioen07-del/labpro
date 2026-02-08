"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Wrench, Package, TestTubes, Pencil, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getEquipment, getBatches, getReadyMedia } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/utils'

// ---- Status helpers ----

const EQUIPMENT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800',
  BROKEN: 'bg-red-100 text-red-800',
  OFFLINE: 'bg-gray-100 text-gray-800',
}

const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Работает',
  MAINTENANCE: 'Обслуживание',
  BROKEN: 'Неисправен',
  OFFLINE: 'Офлайн',
}

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  INCUBATOR: 'Инкубатор',
  FREEZER: 'Морозильник',
  REFRIGERATOR: 'Холодильник',
  LN2_TANK: 'Сосуд Дьюара',
  BSC: 'Бокс биобезопасности',
  MICROSCOPE: 'Микроскоп',
  CENTRIFUGE: 'Центрифуга',
  AUTOCLAVE: 'Автоклав',
  OTHER: 'Другое',
}

const BATCH_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  RESERVED: 'bg-blue-100 text-blue-800',
  EXPIRED: 'bg-red-100 text-red-800',
  USED: 'bg-gray-100 text-gray-800',
  QUARANTINE: 'bg-yellow-100 text-yellow-800',
}

const BATCH_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'В наличии',
  RESERVED: 'Зарезервировано',
  EXPIRED: 'Просрочено',
  USED: 'Использовано',
  QUARANTINE: 'Карантин',
}

const MEDIA_STATUS_COLORS: Record<string, string> = {
  PREPARED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  IN_USE: 'bg-yellow-100 text-yellow-800',
  EXPIRED: 'bg-red-100 text-red-800',
  DISPOSE: 'bg-gray-100 text-gray-800',
}

const MEDIA_STATUS_LABELS: Record<string, string> = {
  PREPARED: 'Приготовлена',
  ACTIVE: 'Готова',
  IN_USE: 'В использовании',
  EXPIRED: 'Просрочена',
  DISPOSE: 'Утилизирована',
}

// ---- Component ----

export default function ReferencesPage() {
  const [activeTab, setActiveTab] = useState('equipment')

  const [equipment, setEquipment] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [readyMedia, setReadyMedia] = useState<any[]>([])

  const [loadingEquipment, setLoadingEquipment] = useState(true)
  const [loadingBatches, setLoadingBatches] = useState(true)
  const [loadingMedia, setLoadingMedia] = useState(true)

  useEffect(() => {
    loadEquipment()
    loadBatches()
    loadReadyMedia()
  }, [])

  const loadEquipment = async () => {
    setLoadingEquipment(true)
    try {
      const data = await getEquipment()
      setEquipment(data || [])
    } catch (err) {
      console.error('Error loading equipment:', err)
      setEquipment([])
    } finally {
      setLoadingEquipment(false)
    }
  }

  const loadBatches = async () => {
    setLoadingBatches(true)
    try {
      const data = await getBatches()
      setBatches(data || [])
    } catch (err) {
      console.error('Error loading batches:', err)
      setBatches([])
    } finally {
      setLoadingBatches(false)
    }
  }

  const loadReadyMedia = async () => {
    setLoadingMedia(true)
    try {
      const data = await getReadyMedia()
      setReadyMedia(data || [])
    } catch (err) {
      console.error('Error loading ready media:', err)
      setReadyMedia([])
    } finally {
      setLoadingMedia(false)
    }
  }

  // ---- Loader ----

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  // ---- Empty state ----

  const EmptyRow = ({ colSpan, text }: { colSpan: number; text: string }) => (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  )

  // ---- Render ----

  return (
    <div className="container py-6 space-y-6 max-w-7xl">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Справочники</h1>
        <p className="text-muted-foreground">
          Оборудование, складской учёт и готовые среды
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="equipment" className="gap-1.5">
            <Wrench className="h-4 w-4" />
            Оборудование
            <Badge variant="secondary" className="ml-1 text-xs">
              {equipment.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5">
            <Package className="h-4 w-4" />
            Склад
            <Badge variant="secondary" className="ml-1 text-xs">
              {batches.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-1.5">
            <TestTubes className="h-4 w-4" />
            Среды
            <Badge variant="secondary" className="ml-1 text-xs">
              {readyMedia.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ==================== Equipment tab ==================== */}
        <TabsContent value="equipment">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Оборудование</CardTitle>
              <Button asChild size="sm">
                <Link href="/equipment/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loadingEquipment ? (
                <LoadingSpinner />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Код</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Расположение</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipment.length === 0 ? (
                      <EmptyRow colSpan={6} text="Оборудование не найдено" />
                    ) : (
                      equipment.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Link
                              href={`/equipment/${item.id}`}
                              className="font-medium hover:underline"
                            >
                              {item.code || '-'}
                            </Link>
                          </TableCell>
                          <TableCell>{item.name || '-'}</TableCell>
                          <TableCell>
                            {EQUIPMENT_TYPE_LABELS[item.type] || item.type || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={EQUIPMENT_STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-800'}>
                              {EQUIPMENT_STATUS_LABELS[item.status] || item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.location || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                <Link href={`/equipment/${item.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                <Link href={`/equipment/${item.id}/edit`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Inventory tab ==================== */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Складской учёт</CardTitle>
              <Button asChild size="sm">
                <Link href="/inventory/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить партию
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loadingBatches ? (
                <LoadingSpinner />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Номенклатура</TableHead>
                      <TableHead>Партия</TableHead>
                      <TableHead>Количество</TableHead>
                      <TableHead>Единица</TableHead>
                      <TableHead>Срок годности</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Поставщик</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.length === 0 ? (
                      <EmptyRow colSpan={8} text="Позиции не найдены" />
                    ) : (
                      batches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell>
                            <Link
                              href={`/inventory/${batch.id}`}
                              className="font-medium hover:underline"
                            >
                              {batch.nomenclature?.name || '-'}
                            </Link>
                          </TableCell>
                          <TableCell>{batch.batch_number || '-'}</TableCell>
                          <TableCell className="font-medium">
                            {formatNumber(batch.quantity)}
                          </TableCell>
                          <TableCell>{batch.unit || 'шт'}</TableCell>
                          <TableCell>
                            {batch.expiration_date ? formatDate(batch.expiration_date) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={BATCH_STATUS_COLORS[batch.status] || 'bg-gray-100 text-gray-800'}>
                              {BATCH_STATUS_LABELS[batch.status] || batch.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{batch.supplier || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                              <Link href={`/inventory/${batch.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Ready Media tab ==================== */}
        <TabsContent value="media">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Готовые среды</CardTitle>
              <Button asChild size="sm">
                <Link href="/ready-media/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Приготовить среду
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loadingMedia ? (
                <LoadingSpinner />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Код</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Объём (мл)</TableHead>
                      <TableHead>Текущий объём (мл)</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Срок годности</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readyMedia.length === 0 ? (
                      <EmptyRow colSpan={7} text="Среды не найдены" />
                    ) : (
                      readyMedia.map((media) => (
                        <TableRow key={media.id}>
                          <TableCell>
                            <Link
                              href={`/ready-media/${media.id}`}
                              className="font-medium hover:underline"
                            >
                              {media.code || '-'}
                            </Link>
                          </TableCell>
                          <TableCell>{media.name || media.media_type || '-'}</TableCell>
                          <TableCell>{media.volume_ml ?? '-'}</TableCell>
                          <TableCell>{media.current_volume_ml ?? '-'}</TableCell>
                          <TableCell>
                            <Badge className={MEDIA_STATUS_COLORS[media.status] || 'bg-gray-100 text-gray-800'}>
                              {MEDIA_STATUS_LABELS[media.status] || media.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {media.expiration_date ? formatDate(media.expiration_date) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                              <Link href={`/ready-media/${media.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
