"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Save, X, Pencil, ToggleLeft, ToggleRight, TestTubes, Package, FlaskConical, Microscope, Trash2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  getAllNomenclatures, createNomenclature, updateNomenclature,
  getContainerTypes, createContainerType, updateContainerType,
  getCultureTypes, createCultureType, updateCultureType,
  getTissueTypes, createTissueType, updateTissueType,
  getMorphologyTypes, createMorphologyType, updateMorphologyType,
  getDisposeReasons, createDisposeReason, updateDisposeReason,
  getReadyMedia,
} from '@/lib/api'
import { formatDate } from '@/lib/utils'

// ---- Tab configuration ----

type TabKey = 'nomenclatures' | 'container_types' | 'culture_types' | 'tissue_types' | 'morphology_types' | 'dispose_reasons' | 'media'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'nomenclatures', label: 'Номенклатура', icon: <Package className="h-4 w-4" /> },
  { key: 'container_types', label: 'Контейнеры', icon: <Layers className="h-4 w-4" /> },
  { key: 'culture_types', label: 'Типы культур', icon: <FlaskConical className="h-4 w-4" /> },
  { key: 'tissue_types', label: 'Типы тканей', icon: <Microscope className="h-4 w-4" /> },
  { key: 'morphology_types', label: 'Морфология', icon: <FlaskConical className="h-4 w-4" /> },
  { key: 'dispose_reasons', label: 'Утилизация', icon: <Trash2 className="h-4 w-4" /> },
  { key: 'media', label: 'Готовые среды', icon: <TestTubes className="h-4 w-4" /> },
]

const NOM_CATEGORIES = [
  { value: 'MEDIUM', label: 'Среда' },
  { value: 'CONSUMABLE', label: 'Пластик' },
  { value: 'REAGENT', label: 'Реагент' },
]

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
  const [activeTab, setActiveTab] = useState<TabKey>('nomenclatures')
  const [data, setData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [containerTypes, setContainerTypes] = useState<any[]>([])

  const loadTab = useCallback(async (tab: TabKey) => {
    setLoading(prev => ({ ...prev, [tab]: true }))
    try {
      let result: any[] = []
      switch (tab) {
        case 'nomenclatures': result = await getAllNomenclatures(); break
        case 'container_types': result = await getContainerTypes(); break
        case 'culture_types': result = await getCultureTypes(); break
        case 'tissue_types': result = await getTissueTypes(); break
        case 'morphology_types': result = await getMorphologyTypes(); break
        case 'dispose_reasons': result = await getDisposeReasons(); break
        case 'media': result = await getReadyMedia(); break
      }
      setData(prev => ({ ...prev, [tab]: result || [] }))
    } catch (err) {
      console.error(`Error loading ${tab}:`, err)
      setData(prev => ({ ...prev, [tab]: [] }))
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }))
    }
  }, [])

  useEffect(() => { loadTab(activeTab) }, [activeTab, loadTab])

  // Load container_types for nomenclature form
  useEffect(() => {
    getContainerTypes().then(ct => setContainerTypes(ct || [])).catch(() => {})
  }, [])

  // ---- Dialog helpers ----

  const openCreateDialog = () => {
    setEditItem(null)
    setForm(getDefaultForm(activeTab))
    setDialogOpen(true)
  }

  const openEditDialog = (item: any) => {
    setEditItem(item)
    setForm({ ...item })
    setDialogOpen(true)
  }

  const getDefaultForm = (tab: TabKey): Record<string, any> => {
    switch (tab) {
      case 'nomenclatures':
        return { code: '', name: '', category: 'CONSUMABLE', unit: 'шт', container_type_id: '', storage_requirements: '', is_active: true }
      case 'container_types':
        return { code: '', name: '', surface_area_cm2: '', volume_ml: '', is_cryo: false, optimal_confluent: '', is_active: true }
      case 'culture_types':
        return { code: '', name: '', description: '', growth_rate: '', optimal_confluent: '', passage_interval_days: '', is_active: true }
      case 'tissue_types':
        return { code: '', name: '', tissue_form: 'SOLID', is_active: true }
      case 'morphology_types':
        return { code: '', name: '', description: '' }
      case 'dispose_reasons':
        return { code: '', name: '', description: '' }
      default:
        return {}
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const cleanedForm = { ...form }
      // Convert empty strings to null for numeric fields
      for (const key of ['surface_area_cm2', 'volume_ml', 'optimal_confluent', 'growth_rate', 'passage_interval_days']) {
        if (cleanedForm[key] === '' || cleanedForm[key] === undefined) {
          cleanedForm[key] = null
        } else if (cleanedForm[key] !== null) {
          cleanedForm[key] = Number(cleanedForm[key])
        }
      }
      if (cleanedForm.container_type_id === '') cleanedForm.container_type_id = null

      if (editItem) {
        // Update
        const { id, created_at, container_type, ...updates } = cleanedForm
        switch (activeTab) {
          case 'nomenclatures': await updateNomenclature(editItem.id, updates); break
          case 'container_types': await updateContainerType(editItem.id, updates); break
          case 'culture_types': await updateCultureType(editItem.id, updates); break
          case 'tissue_types': await updateTissueType(editItem.id, updates); break
          case 'morphology_types': await updateMorphologyType(editItem.id, updates); break
          case 'dispose_reasons': await updateDisposeReason(editItem.id, updates); break
        }
        toast.success('Запись обновлена')
      } else {
        // Create
        const { id, created_at, container_type, ...createData } = cleanedForm
        switch (activeTab) {
          case 'nomenclatures': await createNomenclature(createData); break
          case 'container_types': await createContainerType(createData); break
          case 'culture_types': await createCultureType(createData); break
          case 'tissue_types': await createTissueType(createData); break
          case 'morphology_types': await createMorphologyType(createData); break
          case 'dispose_reasons': await createDisposeReason(createData); break
        }
        toast.success('Запись создана')
      }
      setDialogOpen(false)
      loadTab(activeTab)
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (item: any) => {
    try {
      const newActive = !(item.is_active ?? true)
      switch (activeTab) {
        case 'nomenclatures': await updateNomenclature(item.id, { is_active: newActive }); break
        case 'container_types': await updateContainerType(item.id, { is_active: newActive }); break
        case 'culture_types': await updateCultureType(item.id, { is_active: newActive }); break
        case 'tissue_types': await updateTissueType(item.id, { is_active: newActive }); break
        default: break
      }
      toast.success(newActive ? 'Запись активирована' : 'Запись деактивирована')
      loadTab(activeTab)
    } catch (err: any) {
      toast.error(err.message || 'Ошибка')
    }
  }

  const updateForm = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // ---- Current tab items ----

  const items = data[activeTab] || []
  const isLoading = loading[activeTab] ?? true
  const isReadOnly = activeTab === 'media'

  // ---- Dialog form fields ----

  const renderFormFields = () => {
    switch (activeTab) {
      case 'nomenclatures':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Код *</Label><Input value={form.code || ''} onChange={e => updateForm('code', e.target.value)} placeholder="MED-001" /></div>
              <div><Label>Название *</Label><Input value={form.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder="Среда DMEM" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Категория *</Label>
                <Select value={form.category || 'CONSUMABLE'} onValueChange={v => updateForm('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOM_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Единица измерения</Label><Input value={form.unit || ''} onChange={e => updateForm('unit', e.target.value)} placeholder="шт / мл / г" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Тип контейнера (если пластик)</Label>
                <Select value={form.container_type_id || '__none__'} onValueChange={v => updateForm('container_type_id', v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Не привязан" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Не привязан</SelectItem>
                    {containerTypes.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.code} — {ct.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Условия хранения</Label><Input value={form.storage_requirements || ''} onChange={e => updateForm('storage_requirements', e.target.value)} placeholder="+2..+8°C" /></div>
            </div>
          </div>
        )

      case 'container_types':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Код *</Label><Input value={form.code || ''} onChange={e => updateForm('code', e.target.value)} placeholder="FL75" /></div>
              <div><Label>Название *</Label><Input value={form.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder="Флакон 75 см²" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Площадь (см²)</Label><Input type="number" value={form.surface_area_cm2 ?? ''} onChange={e => updateForm('surface_area_cm2', e.target.value)} /></div>
              <div><Label>Объём (мл)</Label><Input type="number" value={form.volume_ml ?? ''} onChange={e => updateForm('volume_ml', e.target.value)} /></div>
              <div><Label>Конфлюэнтность (%)</Label><Input type="number" value={form.optimal_confluent ?? ''} onChange={e => updateForm('optimal_confluent', e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_cryo || false} onCheckedChange={v => updateForm('is_cryo', v)} id="is_cryo" />
              <Label htmlFor="is_cryo">Криоконтейнер</Label>
            </div>
          </div>
        )

      case 'culture_types':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Код *</Label><Input value={form.code || ''} onChange={e => updateForm('code', e.target.value)} placeholder="FIBRO" /></div>
              <div><Label>Название *</Label><Input value={form.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder="Фибробласты" /></div>
            </div>
            <div><Label>Описание</Label><Input value={form.description || ''} onChange={e => updateForm('description', e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Скорость роста</Label><Input type="number" step="0.1" value={form.growth_rate ?? ''} onChange={e => updateForm('growth_rate', e.target.value)} /></div>
              <div><Label>Конфлюэнтность (%)</Label><Input type="number" value={form.optimal_confluent ?? ''} onChange={e => updateForm('optimal_confluent', e.target.value)} /></div>
              <div><Label>Интервал пассажа (дней)</Label><Input type="number" value={form.passage_interval_days ?? ''} onChange={e => updateForm('passage_interval_days', e.target.value)} /></div>
            </div>
          </div>
        )

      case 'tissue_types':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Код *</Label><Input value={form.code || ''} onChange={e => updateForm('code', e.target.value)} placeholder="SKIN" /></div>
              <div><Label>Название *</Label><Input value={form.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder="Кожа" /></div>
            </div>
            <div>
              <Label>Форма ткани</Label>
              <Select value={form.tissue_form || 'SOLID'} onValueChange={v => updateForm('tissue_form', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOLID">Твёрдая</SelectItem>
                  <SelectItem value="LIQUID">Жидкая</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'morphology_types':
      case 'dispose_reasons':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Код *</Label><Input value={form.code || ''} onChange={e => updateForm('code', e.target.value)} /></div>
              <div><Label>Название *</Label><Input value={form.name || ''} onChange={e => updateForm('name', e.target.value)} /></div>
            </div>
            <div><Label>Описание</Label><Input value={form.description || ''} onChange={e => updateForm('description', e.target.value)} /></div>
          </div>
        )

      default:
        return null
    }
  }

  // ---- Table columns ----

  const renderTable = () => {
    if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

    if (activeTab === 'media') return renderMediaTable()

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Код</TableHead>
            <TableHead>Название</TableHead>
            {activeTab === 'nomenclatures' && <TableHead>Категория</TableHead>}
            {activeTab === 'nomenclatures' && <TableHead>Единица</TableHead>}
            {activeTab === 'container_types' && <TableHead>Площадь (см²)</TableHead>}
            {activeTab === 'container_types' && <TableHead>Объём (мл)</TableHead>}
            {activeTab === 'container_types' && <TableHead>Крио</TableHead>}
            {activeTab === 'culture_types' && <TableHead>Интервал пассажа</TableHead>}
            {activeTab === 'tissue_types' && <TableHead>Форма</TableHead>}
            {(activeTab === 'morphology_types' || activeTab === 'dispose_reasons') && <TableHead>Описание</TableHead>}
            {['nomenclatures', 'container_types', 'culture_types', 'tissue_types'].includes(activeTab) && <TableHead>Статус</TableHead>}
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Нет данных</TableCell></TableRow>
          ) : (
            items.map(item => (
              <TableRow key={item.id} className={item.is_active === false ? 'opacity-50' : ''}>
                <TableCell className="font-mono text-sm">{item.code || '-'}</TableCell>
                <TableCell className="font-medium">{item.name || '-'}</TableCell>

                {activeTab === 'nomenclatures' && (
                  <TableCell>
                    <Badge variant="outline">
                      {NOM_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                    </Badge>
                  </TableCell>
                )}
                {activeTab === 'nomenclatures' && <TableCell>{item.unit || '-'}</TableCell>}

                {activeTab === 'container_types' && <TableCell>{item.surface_area_cm2 ?? '-'}</TableCell>}
                {activeTab === 'container_types' && <TableCell>{item.volume_ml ?? '-'}</TableCell>}
                {activeTab === 'container_types' && <TableCell>{item.is_cryo ? '✓' : '-'}</TableCell>}

                {activeTab === 'culture_types' && <TableCell>{item.passage_interval_days ? `${item.passage_interval_days} дн.` : '-'}</TableCell>}

                {activeTab === 'tissue_types' && <TableCell>{item.tissue_form === 'LIQUID' ? 'Жидкая' : 'Твёрдая'}</TableCell>}

                {(activeTab === 'morphology_types' || activeTab === 'dispose_reasons') && <TableCell className="max-w-[200px] truncate">{item.description || '-'}</TableCell>}

                {['nomenclatures', 'container_types', 'culture_types', 'tissue_types'].includes(activeTab) && (
                  <TableCell>
                    <Badge className={item.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {item.is_active !== false ? 'Активен' : 'Деактивирован'}
                    </Badge>
                  </TableCell>
                )}

                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)} title="Редактировать">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {['nomenclatures', 'container_types', 'culture_types', 'tissue_types'].includes(activeTab) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeactivate(item)}
                        title={item.is_active !== false ? 'Деактивировать' : 'Активировать'}
                      >
                        {item.is_active !== false ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    )
  }

  const renderMediaTable = () => {
    const mediaItems = data['media'] || []
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Код</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Объём (мл)</TableHead>
            <TableHead>Текущий</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Срок годности</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mediaItems.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Среды не найдены</TableCell></TableRow>
          ) : (
            mediaItems.map((media: any) => (
              <TableRow key={media.id}>
                <TableCell><Link href={`/ready-media/${media.id}`} className="font-medium hover:underline">{media.code || '-'}</Link></TableCell>
                <TableCell>{media.name || media.media_type || '-'}</TableCell>
                <TableCell>{media.volume_ml ?? '-'}</TableCell>
                <TableCell>{media.current_volume_ml ?? '-'}</TableCell>
                <TableCell>
                  <Badge className={MEDIA_STATUS_COLORS[media.status] || 'bg-gray-100 text-gray-800'}>
                    {MEDIA_STATUS_LABELS[media.status] || media.status}
                  </Badge>
                </TableCell>
                <TableCell>{media.expiration_date ? formatDate(media.expiration_date) : '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    )
  }

  const tabLabel = TABS.find(t => t.key === activeTab)?.label || ''

  return (
    <div className="container py-6 space-y-6 max-w-7xl">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Справочники</h1>
        <p className="text-muted-foreground">Управление номенклатурой, типами и классификаторами</p>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className="gap-1.5"
          >
            {tab.icon}
            {tab.label}
            <Badge variant="secondary" className="ml-1 text-xs">{(data[tab.key] || []).length}</Badge>
          </Button>
        ))}
      </div>

      {/* Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{tabLabel}</CardTitle>
          {!isReadOnly && (
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить
            </Button>
          )}
          {activeTab === 'media' && (
            <Button size="sm" asChild>
              <Link href="/ready-media/new">
                <Plus className="mr-2 h-4 w-4" />
                Приготовить среду
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {renderTable()}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? `Редактировать: ${editItem.name || editItem.code}` : `Новая запись: ${tabLabel}`}</DialogTitle>
          </DialogHeader>

          {renderFormFields()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              <X className="mr-2 h-4 w-4" />Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.code || !form.name}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
