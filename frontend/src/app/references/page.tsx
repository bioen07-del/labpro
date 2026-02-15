"use client"

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Plus, Save, X, Pencil, ToggleLeft, ToggleRight, TestTubes, Package, FlaskConical, Microscope, Trash2, Layers, AlertTriangle, Link2, EyeOff, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  getAllNomenclatures, createNomenclature, updateNomenclature, deleteNomenclature,
  getContainerTypes, createContainerType, updateContainerType, deleteContainerType,
  getCultureTypes, createCultureType, updateCultureType, deleteCultureType,
  getTissueTypes, createTissueType, updateTissueType, deleteTissueType,
  getMorphologyTypes, createMorphologyType, updateMorphologyType, deleteMorphologyType,
  getDisposeReasons, createDisposeReason, updateDisposeReason, deleteDisposeReason,
  getAllCultureTypeTissueLinks, linkCultureTypeToTissueType, unlinkCultureTypeFromTissueType, updateCultureTypeTissueLink,
  getQCTestConfigs, createQCTestConfig, updateQCTestConfig, deleteQCTestConfig,
  getCultureTypeQCRequirements, setCultureTypeQCRequirements,
} from '@/lib/api'
import type { UsageTag, QCTestConfig, UnitType, NomenclatureCategory } from '@/types'
import { USAGE_TAG_LABELS, UNIT_TYPE_LABELS } from '@/types'
import { getUnitsForType, getDefaultUnit, inferUnitType } from '@/lib/units'

// ---- Tab configuration ----

type TabKey = 'culture_types' | 'media_reagents' | 'consumables' | 'morphology_types' | 'dispose_reasons' | 'qc_tests'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'culture_types', label: 'Типы культур', icon: <FlaskConical className="h-4 w-4" /> },
  { key: 'media_reagents', label: 'Среды и реагенты', icon: <TestTubes className="h-4 w-4" /> },
  { key: 'consumables', label: 'Контейнеры', icon: <Package className="h-4 w-4" /> },
  { key: 'morphology_types', label: 'Морфология', icon: <Microscope className="h-4 w-4" /> },
  { key: 'dispose_reasons', label: 'Утилизация', icon: <Trash2 className="h-4 w-4" /> },
  { key: 'qc_tests', label: 'QC-тесты', icon: <TestTubes className="h-4 w-4" /> },
]

const RESULT_TYPE_LABELS: Record<string, string> = {
  BINARY: 'Да/Нет',
  NUMERIC: 'Числовой',
  TEXT: 'Текст',
}

const NOM_MEDIA_CATEGORIES = [
  { value: 'MEDIUM', label: 'Среда' },
  { value: 'SERUM', label: 'Сыворотка' },
  { value: 'BUFFER', label: 'Буфер' },
  { value: 'SUPPLEMENT', label: 'Добавка' },
  { value: 'ENZYME', label: 'Фермент' },
  { value: 'REAGENT', label: 'Реагент' },
]

const MEDIA_CATEGORY_SET = new Set(['MEDIUM', 'SERUM', 'BUFFER', 'SUPPLEMENT', 'ENZYME', 'REAGENT'])

const CATEGORY_LABELS: Record<string, string> = {
  MEDIUM: 'Среда', SERUM: 'Сыворотка', BUFFER: 'Буфер',
  SUPPLEMENT: 'Добавка', ENZYME: 'Фермент', REAGENT: 'Реагент',
}

const NUMERIC_FIELDS = new Set(['surface_area_cm2', 'volume_ml', 'optimal_confluent', 'observe_interval_days', 'feed_interval_days', 'min_stock_threshold', 'molecular_weight', 'content_per_package'])

// ---- Component ----

export default function ReferencesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('culture_types')

  // Generic data per tab
  const [data, setData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  // Main CRUD dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteItem, setDeleteItem] = useState<any | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Culture types tab: tissue sub-section
  const [tissueTypes, setTissueTypes] = useState<any[]>([])
  const [tissueLinks, setTissueLinks] = useState<any[]>([])
  const [tissueDialogOpen, setTissueDialogOpen] = useState(false)
  const [editTissue, setEditTissue] = useState<any | null>(null)
  const [tissueForm, setTissueForm] = useState<Record<string, any>>({})
  const [savingTissue, setSavingTissue] = useState(false)
  const [deleteTissueItem, setDeleteTissueItem] = useState<any | null>(null)
  const [deleteTissueConfirmOpen, setDeleteTissueConfirmOpen] = useState(false)
  const [deletingTissue, setDeletingTissue] = useState(false)

  // Link dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkCultureType, setLinkCultureType] = useState<any | null>(null)

  // Show inactive toggle
  const [showInactive, setShowInactive] = useState(false)

  // QC test configs
  const [qcTestConfigs, setQcTestConfigs] = useState<QCTestConfig[]>([])
  const [qcDialogOpen, setQcDialogOpen] = useState(false)
  const [editQcConfig, setEditQcConfig] = useState<QCTestConfig | null>(null)
  const [qcForm, setQcForm] = useState<Record<string, any>>({})
  const [savingQc, setSavingQc] = useState(false)

  // Container types
  const [containerTypes, setContainerTypes] = useState<any[]>([])

  // Which entity type is the current dialog for (for consumables tab)
  const [dialogTarget, setDialogTarget] = useState<'main' | 'tissue' | 'container_type'>('main')

  // ---- Load data ----

  const loadTab = useCallback(async (tab: TabKey, withInactive = true) => {
    setLoading(prev => ({ ...prev, [tab]: true }))
    try {
      let result: any[] = []
      switch (tab) {
        case 'culture_types': {
          const [ct, tt, links] = await Promise.all([
            getCultureTypes(withInactive),
            getTissueTypes(withInactive),
            getAllCultureTypeTissueLinks(),
          ])
          result = ct || []
          setTissueTypes(tt || [])
          setTissueLinks(links || [])
          break
        }
        case 'media_reagents': {
          const all = await getAllNomenclatures()
          result = (all || []).filter((n: any) => MEDIA_CATEGORY_SET.has(n.category))
          break
        }
        case 'consumables': {
          const cts = await getContainerTypes(withInactive)
          setContainerTypes(cts || [])
          result = [] // tab shows only container_types, not nomenclatures
          break
        }
        case 'morphology_types': result = await getMorphologyTypes(); break
        case 'dispose_reasons': result = await getDisposeReasons(); break
        case 'qc_tests': {
          const configs = await getQCTestConfigs(false) // include inactive
          setQcTestConfigs(configs || [])
          result = configs || []
          break
        }
      }
      setData(prev => ({ ...prev, [tab]: result || [] }))
    } catch (err) {
      console.error(`Error loading ${tab}:`, err)
      setData(prev => ({ ...prev, [tab]: [] }))
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }))
    }
  }, [])

  // Load ALL tabs on mount so counts are visible immediately
  useEffect(() => {
    const allTabs: TabKey[] = ['culture_types', 'media_reagents', 'consumables', 'morphology_types', 'dispose_reasons', 'qc_tests']
    allTabs.forEach(tab => loadTab(tab))
  }, [loadTab])

  // Reload current tab when switching (in case data changed)
  useEffect(() => { loadTab(activeTab) }, [activeTab, loadTab])

  // ---- Helpers: tissue links for a culture type ----

  const linksForCulture = (cultureTypeId: string) =>
    tissueLinks.filter((l: any) => l.culture_type_id === cultureTypeId)

  // ---- Main CRUD dialog ----

  const openCreateDialog = (target: 'main' | 'tissue' | 'container_type' = 'main') => {
    setDialogTarget(target)
    setEditItem(null)
    if (target === 'tissue') {
      setEditTissue(null)
      setTissueForm({ code: '', name: '', tissue_form: 'SOLID', is_active: true })
      setTissueDialogOpen(true)
      return
    }
    if (target === 'container_type') {
      setForm({ code: '', name: '', surface_area_cm2: '', volume_ml: '', is_cryo: false, optimal_confluent: '', is_active: true })
    } else {
      setForm(getDefaultForm(activeTab))
    }
    setDialogOpen(true)
  }

  const openEditDialog = (item: any, target: 'main' | 'tissue' | 'container_type' = 'main') => {
    setDialogTarget(target)
    if (target === 'tissue') {
      setEditTissue(item)
      setTissueForm({ ...item })
      setTissueDialogOpen(true)
      return
    }
    setEditItem(item)
    // Автоподстановка unit_type для существующих записей без unit_type (миграция)
    const formData = { ...item }
    if (!formData.unit_type) {
      if (formData.unit) {
        formData.unit_type = inferUnitType(formData.unit) || (formData.category === 'CONSUMABLE' ? 'COUNT' : 'VOLUME')
      } else {
        formData.unit_type = formData.category === 'CONSUMABLE' ? 'COUNT' : 'VOLUME'
        formData.unit = formData.category === 'CONSUMABLE' ? 'шт' : 'мл'
      }
    }
    setForm(formData)
    setDialogOpen(true)
  }

  const getDefaultForm = (tab: TabKey): Record<string, any> => {
    switch (tab) {
      case 'culture_types':
        return { code: '', name: '', description: '', optimal_confluent: '', observe_interval_days: '', feed_interval_days: '', is_active: true }
      case 'media_reagents':
        return { code: '', name: '', category: 'MEDIUM', unit_type: 'VOLUME', unit: 'мл', container_type_id: '', storage_requirements: '', usage_tags: [], min_stock_threshold: '', min_stock_threshold_type: 'QTY', molecular_weight: '', is_active: true }
      case 'consumables':
        return { code: '', name: '', category: 'CONSUMABLE', unit_type: 'COUNT', unit: 'шт', surface_area_cm2: '', volume_ml: '', is_cryo: false, optimal_confluent: '', min_stock_threshold: '', min_stock_threshold_type: 'QTY', content_per_package: '', is_active: true }
      case 'morphology_types':
        return { code: '', name: '', description: '' }
      case 'dispose_reasons':
        return { code: '', name: '', description: '' }
      default:
        return {}
    }
  }

  const TABLE_FIELDS: Record<string, string[]> = {
    culture_types: ['code', 'name', 'description', 'optimal_confluent', 'observe_interval_days', 'feed_interval_days', 'is_active'],
    tissue_types: ['code', 'name', 'tissue_form', 'is_active'],
    media_reagents: ['code', 'name', 'category', 'unit_type', 'unit', 'container_type_id', 'storage_requirements', 'usage_tags', 'min_stock_threshold', 'min_stock_threshold_type', 'molecular_weight', 'is_active'],
    consumables: ['code', 'name', 'category', 'unit_type', 'unit', 'surface_area_cm2', 'volume_ml', 'is_cryo', 'optimal_confluent', 'min_stock_threshold', 'min_stock_threshold_type', 'content_per_package', 'is_active'],
    container_types: ['code', 'name', 'surface_area_cm2', 'volume_ml', 'is_cryo', 'optimal_confluent', 'is_active'],
    morphology_types: ['code', 'name', 'description'],
    dispose_reasons: ['code', 'name', 'description'],
  }

  const cleanForm = (fieldsKey: string) => {
    const allowedFields = TABLE_FIELDS[fieldsKey] || []
    const cleaned: Record<string, any> = {}
    for (const key of allowedFields) {
      let val = form[key]
      if (NUMERIC_FIELDS.has(key)) {
        val = (val === '' || val === undefined) ? null : Number(val)
      }
      if (key === 'container_type_id' && val === '') val = null
      cleaned[key] = val
    }
    return cleaned
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const target = dialogTarget
      if (target === 'container_type') {
        const cleaned = cleanForm('container_types')
        if (editItem) {
          await updateContainerType(editItem.id, cleaned)
          toast.success('Тип контейнера обновлён')
        } else {
          await createContainerType(cleaned)
          toast.success('Тип контейнера создан')
        }
      } else {
        const fieldsKey = activeTab === 'consumables' ? 'consumables' : activeTab
        const cleaned = cleanForm(fieldsKey)
        if (editItem) {
          switch (activeTab) {
            case 'culture_types': await updateCultureType(editItem.id, cleaned); break
            case 'media_reagents': await updateNomenclature(editItem.id, cleaned); break
            case 'consumables': await updateNomenclature(editItem.id, cleaned); break
            case 'morphology_types': await updateMorphologyType(editItem.id, cleaned); break
            case 'dispose_reasons': await updateDisposeReason(editItem.id, cleaned); break
          }
          toast.success('Запись обновлена')
        } else {
          switch (activeTab) {
            case 'culture_types': await createCultureType(cleaned); break
            case 'media_reagents': await createNomenclature(cleaned); break
            case 'consumables': await createNomenclature(cleaned); break
            case 'morphology_types': await createMorphologyType(cleaned); break
            case 'dispose_reasons': await createDisposeReason(cleaned); break
          }
          toast.success('Запись создана')
        }
      }
      setDialogOpen(false)
      loadTab(activeTab)
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  // ---- Tissue CRUD ----

  const handleSaveTissue = async () => {
    setSavingTissue(true)
    try {
      const allowedFields = TABLE_FIELDS['tissue_types']
      const cleaned: Record<string, any> = {}
      for (const key of allowedFields) {
        cleaned[key] = tissueForm[key]
      }
      if (editTissue) {
        await updateTissueType(editTissue.id, cleaned)
        toast.success('Тип ткани обновлён')
      } else {
        await createTissueType(cleaned)
        toast.success('Тип ткани создан')
      }
      setTissueDialogOpen(false)
      loadTab('culture_types')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения')
    } finally {
      setSavingTissue(false)
    }
  }

  // ---- Delete handlers ----

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      const target = dialogTarget
      if (target === 'container_type') {
        await deleteContainerType(deleteItem.id)
      } else {
        switch (activeTab) {
          case 'culture_types': await deleteCultureType(deleteItem.id); break
          case 'media_reagents': await deleteNomenclature(deleteItem.id); break
          case 'consumables': await deleteNomenclature(deleteItem.id); break
          case 'morphology_types': await deleteMorphologyType(deleteItem.id); break
          case 'dispose_reasons': await deleteDisposeReason(deleteItem.id); break
        }
      }
      toast.success('Запись удалена')
      setDeleteConfirmOpen(false)
      setDeleteItem(null)
      loadTab(activeTab)
    } catch (err: any) {
      const msg = err.message || 'Ошибка удаления'
      if (msg.includes('violates foreign key') || msg.includes('referenced')) {
        toast.error('Невозможно удалить: запись используется. Деактивируйте вместо удаления.')
      } else {
        toast.error(msg)
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteTissue = async () => {
    if (!deleteTissueItem) return
    setDeletingTissue(true)
    try {
      await deleteTissueType(deleteTissueItem.id)
      toast.success('Тип ткани удалён')
      setDeleteTissueConfirmOpen(false)
      setDeleteTissueItem(null)
      loadTab('culture_types')
    } catch (err: any) {
      const msg = err.message || 'Ошибка удаления'
      if (msg.includes('violates foreign key') || msg.includes('referenced')) {
        toast.error('Невозможно удалить: тип ткани используется.')
      } else {
        toast.error(msg)
      }
    } finally {
      setDeletingTissue(false)
    }
  }

  const openDeleteConfirm = (item: any, target: 'main' | 'container_type' = 'main') => {
    setDialogTarget(target)
    setDeleteItem(item)
    setDeleteConfirmOpen(true)
  }

  // ---- Deactivate ----

  const handleDeactivate = async (item: any, entityType: 'culture_type' | 'tissue_type' | 'nomenclature' | 'container_type') => {
    try {
      const newActive = !(item.is_active ?? true)
      switch (entityType) {
        case 'culture_type': await updateCultureType(item.id, { is_active: newActive }); break
        case 'tissue_type': {
          await updateTissueType(item.id, { is_active: newActive })
          // При деактивации ткани — удаляем все привязки к культурам
          if (!newActive) {
            const linksToRemove = tissueLinks.filter((l: any) => l.tissue_type_id === item.id)
            for (const link of linksToRemove) {
              await unlinkCultureTypeFromTissueType(link.culture_type_id, item.id)
            }
            if (linksToRemove.length > 0) {
              toast.info(`Удалено ${linksToRemove.length} привязок к культурам`)
            }
          }
          break
        }
        case 'nomenclature': await updateNomenclature(item.id, { is_active: newActive }); break
        case 'container_type': await updateContainerType(item.id, { is_active: newActive }); break
      }
      toast.success(newActive ? 'Активировано' : 'Деактивировано')
      loadTab(activeTab)
    } catch (err: any) {
      toast.error(err.message || 'Ошибка')
    }
  }

  const updateForm = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))
  const updateTissueForm = (key: string, value: any) => setTissueForm(prev => ({ ...prev, [key]: value }))

  // ---- Link dialog: toggle tissue for a culture type ----

  const handleToggleLink = async (tissueTypeId: string, isLinked: boolean) => {
    if (!linkCultureType) return
    try {
      if (isLinked) {
        await unlinkCultureTypeFromTissueType(linkCultureType.id, tissueTypeId)
      } else {
        await linkCultureTypeToTissueType(linkCultureType.id, tissueTypeId, false)
      }
      // Reload links
      const links = await getAllCultureTypeTissueLinks()
      setTissueLinks(links || [])
    } catch (err: any) {
      toast.error(err.message || 'Ошибка связывания')
    }
  }

  const handleTogglePrimary = async (tissueTypeId: string, isPrimary: boolean) => {
    if (!linkCultureType) return
    try {
      await updateCultureTypeTissueLink(linkCultureType.id, tissueTypeId, !isPrimary)
      const links = await getAllCultureTypeTissueLinks()
      setTissueLinks(links || [])
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления')
    }
  }

  // ---- Current tab items ----

  const allItems = data[activeTab] || []
  const items = showInactive ? allItems : allItems.filter((i: any) => i.is_active !== false)
  const visibleTissueTypes = showInactive ? tissueTypes : tissueTypes.filter((t: any) => t.is_active !== false)
  const visibleContainerTypes = showInactive ? containerTypes : containerTypes.filter((ct: any) => ct.is_active !== false)
  const inactiveCount = allItems.filter((i: any) => i.is_active === false).length
  const isLoading = loading[activeTab] ?? true

  // ==================== RENDER: Status badge ====================

  const renderStatusBadge = (item: any) => (
    <Badge className={item.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
      {item.is_active !== false ? 'Активен' : 'Выключен'}
    </Badge>
  )

  const renderActionButtons = (item: any, entityType: 'culture_type' | 'tissue_type' | 'nomenclature' | 'container_type', editTarget: 'main' | 'tissue' | 'container_type' = 'main') => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item, editTarget)} title="Редактировать">
        <Pencil className="h-4 w-4" />
      </Button>
      {['culture_type', 'tissue_type', 'nomenclature', 'container_type'].includes(entityType) && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeactivate(item, entityType)} title={item.is_active !== false ? 'Деактивировать' : 'Активировать'}>
          {item.is_active !== false ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
        if (editTarget === 'tissue') {
          setDeleteTissueItem(item)
          setDeleteTissueConfirmOpen(true)
        } else {
          openDeleteConfirm(item, editTarget === 'container_type' ? 'container_type' : 'main')
        }
      }} title="Удалить">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

  // ==================== TAB: Типы культур ====================

  const renderCultureTypesTab = () => {
    if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

    return (
      <div className="space-y-8">
        {/* Section: Culture Types */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Типы культур</h3>
            <Button size="sm" onClick={() => openCreateDialog('main')}>
              <Plus className="mr-2 h-4 w-4" />Добавить тип культуры
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Осмотр</TableHead>
                <TableHead>Подкормка</TableHead>
                <TableHead>Связанные ткани</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Нет данных</TableCell></TableRow>
              ) : items.map(item => {
                const links = linksForCulture(item.id)
                return (
                  <TableRow key={item.id} className={item.is_active === false ? 'opacity-50' : ''}>
                    <TableCell className="font-mono text-sm">{item.code || '-'}</TableCell>
                    <TableCell className="font-medium">{item.name || '-'}</TableCell>
                    <TableCell>{item.observe_interval_days ? `${item.observe_interval_days} дн.` : '-'}</TableCell>
                    <TableCell>{item.feed_interval_days ? `${item.feed_interval_days} дн.` : '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {links.length === 0 ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : links.map((link: any) => (
                          <Badge key={link.id} variant={link.is_primary ? 'default' : 'outline'} className="text-xs">
                            {link.tissue_type?.name || '?'}
                            {link.is_primary && ' (осн.)'}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{renderStatusBadge(item)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setLinkCultureType(item); setLinkDialogOpen(true) }} title="Привязать ткани">
                          <Link2 className="h-4 w-4" />
                        </Button>
                        {renderActionButtons(item, 'culture_type', 'main')}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <Separator />

        {/* Section: Tissue Types */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Типы тканей</h3>
            <Button size="sm" onClick={() => openCreateDialog('tissue')}>
              <Plus className="mr-2 h-4 w-4" />Добавить тип ткани
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Форма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTissueTypes.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Нет данных</TableCell></TableRow>
              ) : visibleTissueTypes.map(item => (
                <TableRow key={item.id} className={item.is_active === false ? 'opacity-50' : ''}>
                  <TableCell className="font-mono text-sm">{item.code || '-'}</TableCell>
                  <TableCell className="font-medium">{item.name || '-'}</TableCell>
                  <TableCell>{item.tissue_form === 'LIQUID' ? 'Жидкая' : 'Твёрдая'}</TableCell>
                  <TableCell>{renderStatusBadge(item)}</TableCell>
                  <TableCell className="text-right">
                    {renderActionButtons(item, 'tissue_type', 'tissue')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // ==================== TAB: Среды и реагенты ====================

  const renderNomTable = (nomItems: any[], entityType: 'nomenclature', editTarget: 'main' = 'main') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Код</TableHead>
          <TableHead>Название</TableHead>
          <TableHead>Категория</TableHead>
          <TableHead>Назначение</TableHead>
          <TableHead>Единица</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {nomItems.length === 0 ? (
          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Нет данных</TableCell></TableRow>
        ) : nomItems.map(item => (
          <TableRow key={item.id} className={item.is_active === false ? 'opacity-50' : ''}>
            <TableCell className="font-mono text-sm">{item.code || '-'}</TableCell>
            <TableCell className="font-medium">{item.name || '-'}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {CATEGORY_LABELS[item.category] || item.category}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {(item.usage_tags || []).map((tag: UsageTag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {USAGE_TAG_LABELS[tag] || tag}
                  </Badge>
                ))}
                {(!item.usage_tags || item.usage_tags.length === 0) && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </TableCell>
            <TableCell>{item.unit || '-'}</TableCell>
            <TableCell>{renderStatusBadge(item)}</TableCell>
            <TableCell className="text-right">
              {renderActionButtons(item, entityType, editTarget)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  // ==================== TAB: Расходные материалы ====================

  const renderContainerTypesTable = (ctItems: any[] = visibleContainerTypes) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Код</TableHead>
          <TableHead>Название</TableHead>
          <TableHead>Площадь (см²)</TableHead>
          <TableHead>Объём (мл)</TableHead>
          <TableHead>Крио</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ctItems.length === 0 ? (
          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Нет данных</TableCell></TableRow>
        ) : ctItems.map(item => (
          <TableRow key={item.id} className={item.is_active === false ? 'opacity-50' : ''}>
            <TableCell className="font-mono text-sm">{item.code || '-'}</TableCell>
            <TableCell className="font-medium">{item.name || '-'}</TableCell>
            <TableCell>{item.surface_area_cm2 ?? '-'}</TableCell>
            <TableCell>{item.volume_ml ?? '-'}</TableCell>
            <TableCell>{item.is_cryo ? '✓' : '-'}</TableCell>
            <TableCell>{renderStatusBadge(item)}</TableCell>
            <TableCell className="text-right">
              {renderActionButtons(item, 'container_type', 'container_type')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  const renderConsumablesTab = () => {
    if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Типы контейнеров</span>
            <Badge variant="secondary" className="text-xs">{visibleContainerTypes.length}</Badge>
          </div>
          <Button size="sm" onClick={() => openCreateDialog('container_type')}>
            <Plus className="mr-2 h-4 w-4" />Добавить
          </Button>
        </div>
        {renderContainerTypesTable(visibleContainerTypes)}
      </div>
    )
  }

  // ==================== TAB: Simple (Morphology / Dispose) ====================

  const renderSimpleTab = () => {
    if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Код</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Нет данных</TableCell></TableRow>
          ) : items.map(item => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm">{item.code || '-'}</TableCell>
              <TableCell className="font-medium">{item.name || '-'}</TableCell>
              <TableCell className="max-w-[200px] truncate">{item.description || '-'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)} title="Редактировать">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => openDeleteConfirm(item)} title="Удалить">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // ==================== TAB: QC Tests ====================

  const openQcDialog = (item?: QCTestConfig) => {
    setEditQcConfig(item || null)
    setQcForm(item ? { ...item } : { code: '', name: '', description: '', methodology: '', unit: '', ref_min: '', ref_max: '', result_type: 'BINARY', is_active: true, sort_order: 0 })
    setQcDialogOpen(true)
  }

  const handleSaveQc = async () => {
    setSavingQc(true)
    try {
      const cleaned: Record<string, unknown> = {
        code: qcForm.code,
        name: qcForm.name,
        description: qcForm.description || null,
        methodology: qcForm.methodology || null,
        unit: qcForm.unit || null,
        ref_min: qcForm.ref_min === '' || qcForm.ref_min == null ? null : Number(qcForm.ref_min),
        ref_max: qcForm.ref_max === '' || qcForm.ref_max == null ? null : Number(qcForm.ref_max),
        result_type: qcForm.result_type || 'BINARY',
        is_active: qcForm.is_active ?? true,
        sort_order: Number(qcForm.sort_order) || 0,
      }
      if (editQcConfig) {
        await updateQCTestConfig(editQcConfig.id, cleaned)
        toast.success('QC-тест обновлён')
      } else {
        await createQCTestConfig(cleaned)
        toast.success('QC-тест создан')
      }
      setQcDialogOpen(false)
      loadTab('qc_tests')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения')
    } finally {
      setSavingQc(false)
    }
  }

  const handleDeleteQc = async (item: QCTestConfig) => {
    try {
      await deleteQCTestConfig(item.id)
      toast.success('QC-тест деактивирован')
      loadTab('qc_tests')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка')
    }
  }

  const handleToggleQcActive = async (item: QCTestConfig) => {
    try {
      await updateQCTestConfig(item.id, { is_active: !item.is_active })
      toast.success(item.is_active ? 'Деактивирован' : 'Активирован')
      loadTab('qc_tests')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка')
    }
  }

  const renderQCTestsTab = () => {
    if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

    const visibleQc = showInactive ? qcTestConfigs : qcTestConfigs.filter(c => c.is_active)

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Настройте типы QC-тестов, единицы измерения и референсные значения.
            Привяжите тесты к типам культур для автоматического создания при заморозке.
          </p>
          <Button size="sm" onClick={() => openQcDialog()}>
            <Plus className="mr-2 h-4 w-4" />Добавить QC-тест
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Код</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Тип результата</TableHead>
              <TableHead>Ед. изм.</TableHead>
              <TableHead>Реф. мин</TableHead>
              <TableHead>Реф. макс</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleQc.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Нет QC-тестов</TableCell></TableRow>
            ) : visibleQc.map(item => (
              <TableRow key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                <TableCell className="font-mono text-sm">{item.code}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{RESULT_TYPE_LABELS[item.result_type] || item.result_type}</Badge>
                </TableCell>
                <TableCell>{item.unit || '-'}</TableCell>
                <TableCell>{item.ref_min != null ? item.ref_min : '-'}</TableCell>
                <TableCell>{item.ref_max != null ? item.ref_max : '-'}</TableCell>
                <TableCell>{renderStatusBadge(item)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openQcDialog(item)} title="Редактировать">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleQcActive(item)} title={item.is_active ? 'Деактивировать' : 'Активировать'}>
                      {item.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // ==================== Form fields per dialog =====================

  const renderFormFields = () => {
    if (dialogTarget === 'container_type') {
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
    }

    switch (activeTab) {
      case 'culture_types':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Код *</Label><Input value={form.code || ''} onChange={e => updateForm('code', e.target.value)} placeholder="FIBRO" /></div>
              <div><Label>Название *</Label><Input value={form.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder="Фибробласты" /></div>
            </div>
            <div><Label>Описание</Label><Input value={form.description || ''} onChange={e => updateForm('description', e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Конфлюэнтность (%)</Label><Input type="number" value={form.optimal_confluent ?? ''} onChange={e => updateForm('optimal_confluent', e.target.value)} placeholder="80" /></div>
              <div><Label>Частота осмотра (дней)</Label><Input type="number" value={form.observe_interval_days ?? ''} onChange={e => updateForm('observe_interval_days', e.target.value)} placeholder="1" /></div>
              <div><Label>Частота подкормки (дней)</Label><Input type="number" value={form.feed_interval_days ?? ''} onChange={e => updateForm('feed_interval_days', e.target.value)} placeholder="3" /></div>
            </div>
          </div>
        )

      case 'media_reagents':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Код *</Label><Input value={form.code || ''} onChange={e => updateForm('code', e.target.value)} placeholder="MED-001" /></div>
              <div><Label>Название *</Label><Input value={form.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder="Среда DMEM" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Категория *</Label>
                <Select value={form.category || 'MEDIUM'} onValueChange={v => {
                  updateForm('category', v)
                  // Автоподбор unit_type по категории
                  const defaults = getDefaultUnit(v as NomenclatureCategory)
                  updateForm('unit_type', defaults.unitType)
                  updateForm('unit', defaults.unit)
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOM_MEDIA_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Тип единицы</Label>
                <Select value={form.unit_type || 'VOLUME'} onValueChange={v => {
                  updateForm('unit_type', v)
                  const units = getUnitsForType(v as UnitType)
                  if (units.length > 0) updateForm('unit', units[0])
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(UNIT_TYPE_LABELS) as [string, string][]).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Единица измерения</Label>
                <Select value={form.unit || 'мл'} onValueChange={v => updateForm('unit', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getUnitsForType((form.unit_type || 'VOLUME') as UnitType).map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Фасовка (на 1 ед.)</Label>
                <Input type="number" min={0} step="any" value={form.content_per_package ?? ''} onChange={e => updateForm('content_per_package', e.target.value)} placeholder="5" />
                <p className="text-xs text-muted-foreground mt-1">Объём/масса в 1 флаконе/банке ({form.unit || 'мл'})</p>
              </div>
              <div>
                <Label>Молекулярная масса (г/моль)</Label>
                <Input type="number" min={0} step="any" value={form.molecular_weight ?? ''} onChange={e => updateForm('molecular_weight', e.target.value)} placeholder="238.3" />
                <p className="text-xs text-muted-foreground mt-1">Для пересчёта масса↔моль в калькуляторе</p>
              </div>
              <div>
                <Label>Условия хранения</Label>
                <Input value={form.storage_requirements || ''} onChange={e => updateForm('storage_requirements', e.target.value)} placeholder="+2..+8°C, −20°C" />
              </div>
            </div>
            {/* Min stock threshold */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Порог «Мало» — единица</Label>
                <Select value={form.min_stock_threshold_type || 'QTY'} onValueChange={v => updateForm('min_stock_threshold_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QTY">≤ N шт (упаковок/флаконов)</SelectItem>
                    <SelectItem value="VOLUME">≤ N мл (суммарный объём)</SelectItem>
                    <SelectItem value="PERCENT">≤ N % от начального кол-ва</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Порог «Мало» — значение</Label>
                <Input type="number" min={0} step="any" value={form.min_stock_threshold ?? ''} onChange={e => updateForm('min_stock_threshold', e.target.value)} placeholder="0" />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.min_stock_threshold_type === 'PERCENT'
                    ? '% остатка от начального кол-ва в партии. 0 = без порога'
                    : form.min_stock_threshold_type === 'VOLUME'
                    ? 'Суммарный остаток в мл (все флаконы). 0 = без порога'
                    : 'Кол-во штук/упаковок/флаконов. 0 = без порога (fallback: ≤5 шт)'}
                </p>
              </div>
            </div>
            {/* Usage tags */}
            <div className="space-y-2">
              <Label>Назначение (этапы операций)</Label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(USAGE_TAG_LABELS) as [UsageTag, string][]).map(([tag, label]) => {
                  const tags: UsageTag[] = form.usage_tags || []
                  const checked = tags.includes(tag)
                  return (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = v
                            ? [...tags, tag]
                            : tags.filter((t: UsageTag) => t !== tag)
                          updateForm('usage_tags', next)
                        }}
                      />
                      <Label htmlFor={`tag-${tag}`} className="cursor-pointer text-sm font-normal">{label}</Label>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )

      case 'consumables':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Код *</Label><Input value={form.code || ''} onChange={e => updateForm('code', e.target.value)} placeholder="PL-001" /></div>
              <div><Label>Название *</Label><Input value={form.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder="Флакон Т75" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Тип контейнера (если есть)</Label>
                <Select value={form.container_type_id || '__none__'} onValueChange={v => updateForm('container_type_id', v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Не привязан" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Не привязан</SelectItem>
                    {containerTypes.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.code} — {ct.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Тип единицы</Label>
                <Select value={form.unit_type || 'COUNT'} onValueChange={v => {
                  updateForm('unit_type', v)
                  const units = getUnitsForType(v as UnitType)
                  if (units.length > 0) updateForm('unit', units[0])
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(UNIT_TYPE_LABELS) as [string, string][]).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Единица измерения</Label>
                <Select value={form.unit || 'шт'} onValueChange={v => updateForm('unit', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getUnitsForType((form.unit_type || 'COUNT') as UnitType).map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Условия хранения</Label><Input value={form.storage_requirements || ''} onChange={e => updateForm('storage_requirements', e.target.value)} placeholder="Комнатная температура" /></div>
              <div>
                <Label>Штук в упаковке</Label>
                <Input type="number" min={1} step="1" value={form.content_per_package ?? ''} onChange={e => updateForm('content_per_package', e.target.value)} placeholder="напр. 20" />
                <p className="text-xs text-muted-foreground mt-1">Сколько штук обычно в 1 упаковке (подсказка при приёмке)</p>
              </div>
            </div>
            {/* Min stock threshold for consumables */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Порог «Мало» — единица</Label>
                <Select value={form.min_stock_threshold_type || 'QTY'} onValueChange={v => updateForm('min_stock_threshold_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QTY">≤ N шт (упаковок)</SelectItem>
                    <SelectItem value="PERCENT">≤ N % от начального кол-ва</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Порог «Мало» — значение</Label>
                <Input type="number" min={0} step="any" value={form.min_stock_threshold ?? ''} onChange={e => updateForm('min_stock_threshold', e.target.value)} placeholder="0" />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.min_stock_threshold_type === 'PERCENT'
                    ? '% остатка от начального кол-ва. 0 = без порога'
                    : 'Кол-во штук. 0 = без порога (fallback: ≤5 шт)'}
                </p>
              </div>
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

  // ---- Tab label ----

  const tabLabel = TABS.find(t => t.key === activeTab)?.label || ''

  // ==================== MAIN RENDER ====================

  return (
    <div className="container py-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Справочники</h1>
        <p className="text-muted-foreground">Типы культур и тканей, среды, контейнеры, классификаторы</p>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <Button key={tab.key} variant={activeTab === tab.key ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab(tab.key)} className="gap-1.5">
            {tab.icon}
            {tab.label}
            <Badge variant="secondary" className="ml-1 text-xs">
              {tab.key === 'culture_types' ? `${(data[tab.key] || []).length}+${tissueTypes.length}` : tab.key === 'consumables' ? containerTypes.length : (data[tab.key] || []).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>{tabLabel}</CardTitle>
            <Button variant={showInactive ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowInactive(!showInactive)} className="gap-1.5 text-xs h-7">
              {showInactive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {showInactive ? 'Все записи' : 'Скрыты неактивные'}
              {!showInactive && inactiveCount > 0 && <Badge variant="outline" className="ml-1 text-xs h-4 px-1">{inactiveCount}</Badge>}
            </Button>
          </div>
          {(activeTab === 'morphology_types' || activeTab === 'dispose_reasons') && (
            <Button size="sm" onClick={() => openCreateDialog('main')}>
              <Plus className="mr-2 h-4 w-4" />Добавить
            </Button>
          )}
          {activeTab === 'media_reagents' && (
            <Button size="sm" onClick={() => openCreateDialog('main')}>
              <Plus className="mr-2 h-4 w-4" />Добавить
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activeTab === 'culture_types' && renderCultureTypesTab()}
          {activeTab === 'media_reagents' && (isLoading
            ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            : renderNomTable(items, 'nomenclature'))}
          {activeTab === 'consumables' && renderConsumablesTab()}
          {(activeTab === 'morphology_types' || activeTab === 'dispose_reasons') && renderSimpleTab()}
          {activeTab === 'qc_tests' && renderQCTestsTab()}
        </CardContent>
      </Card>

      {/* ==================== DIALOGS ==================== */}

      {/* Main Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editItem
                ? `Редактировать: ${editItem.name || editItem.code}`
                : dialogTarget === 'container_type'
                  ? 'Новый тип контейнера'
                  : `Новая запись: ${tabLabel}`}
            </DialogTitle>
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

      {/* Tissue Create/Edit Dialog */}
      <Dialog open={tissueDialogOpen} onOpenChange={setTissueDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTissue ? `Редактировать: ${editTissue.name}` : 'Новый тип ткани'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Код *</Label><Input value={tissueForm.code || ''} onChange={e => updateTissueForm('code', e.target.value)} placeholder="SKIN" /></div>
              <div><Label>Название *</Label><Input value={tissueForm.name || ''} onChange={e => updateTissueForm('name', e.target.value)} placeholder="Кожа" /></div>
            </div>
            <div>
              <Label>Форма ткани</Label>
              <Select value={tissueForm.tissue_form || 'SOLID'} onValueChange={v => updateTissueForm('tissue_form', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOLID">Твёрдая</SelectItem>
                  <SelectItem value="LIQUID">Жидкая</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTissueDialogOpen(false)} disabled={savingTissue}>
              <X className="mr-2 h-4 w-4" />Отмена
            </Button>
            <Button onClick={handleSaveTissue} disabled={savingTissue || !tissueForm.code || !tissueForm.name}>
              {savingTissue ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link tissue types to culture type dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Привязка тканей: {linkCultureType?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {tissueTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Типы тканей не найдены. Добавьте их сначала.</p>
            ) : tissueTypes.map(tt => {
              const link = tissueLinks.find((l: any) => l.culture_type_id === linkCultureType?.id && l.tissue_type_id === tt.id)
              const isLinked = !!link
              const isPrimary = link?.is_primary ?? false
              return (
                <div key={tt.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isLinked} onCheckedChange={() => handleToggleLink(tt.id, isLinked)} />
                    <span className="text-sm font-medium">{tt.name}</span>
                    <Badge variant="outline" className="text-xs">{tt.tissue_form === 'LIQUID' ? 'Жидкая' : 'Твёрдая'}</Badge>
                  </div>
                  {isLinked && (
                    <Button variant={isPrimary ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => handleTogglePrimary(tt.id, isPrimary)}>
                      {isPrimary ? 'Основная' : 'Доп.'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setLinkDialogOpen(false)}>Готово</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QC Test Config Dialog */}
      <Dialog open={qcDialogOpen} onOpenChange={setQcDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editQcConfig ? 'Редактировать QC-тест' : 'Новый QC-тест'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Код *</Label><Input value={qcForm.code || ''} onChange={e => setQcForm(p => ({ ...p, code: e.target.value }))} placeholder="MYCOPLASMA" /></div>
              <div><Label>Название *</Label><Input value={qcForm.name || ''} onChange={e => setQcForm(p => ({ ...p, name: e.target.value }))} placeholder="Микоплазма" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Тип результата</Label>
                <Select value={qcForm.result_type || 'BINARY'} onValueChange={v => setQcForm(p => ({ ...p, result_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BINARY">Да/Нет (PASSED/FAILED)</SelectItem>
                    <SelectItem value="NUMERIC">Числовой</SelectItem>
                    <SelectItem value="TEXT">Текстовый</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Единица измерения</Label><Input value={qcForm.unit || ''} onChange={e => setQcForm(p => ({ ...p, unit: e.target.value }))} placeholder="КОЕ/мл, EU/мл, %" /></div>
            </div>
            {qcForm.result_type === 'NUMERIC' && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Мин. значение (реф.)</Label><Input type="number" step="any" value={qcForm.ref_min ?? ''} onChange={e => setQcForm(p => ({ ...p, ref_min: e.target.value }))} /></div>
                <div><Label>Макс. значение (реф.)</Label><Input type="number" step="any" value={qcForm.ref_max ?? ''} onChange={e => setQcForm(p => ({ ...p, ref_max: e.target.value }))} /></div>
              </div>
            )}
            <div><Label>Описание</Label><Input value={qcForm.description || ''} onChange={e => setQcForm(p => ({ ...p, description: e.target.value }))} placeholder="Описание теста..." /></div>
            <div><Label>Методика</Label><Input value={qcForm.methodology || ''} onChange={e => setQcForm(p => ({ ...p, methodology: e.target.value }))} placeholder="ПЦР, культуральный метод и т.д." /></div>
            <div><Label>Порядок сортировки</Label><Input type="number" value={qcForm.sort_order ?? 0} onChange={e => setQcForm(p => ({ ...p, sort_order: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQcDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveQc} disabled={savingQc || !qcForm.code || !qcForm.name}>
              {savingQc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Удаление записи
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Вы уверены, что хотите удалить <strong>{deleteItem?.name || deleteItem?.code}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Если запись используется, удаление невозможно. Деактивируйте вместо удаления.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>Отмена</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tissue Confirmation Dialog */}
      <Dialog open={deleteTissueConfirmOpen} onOpenChange={setDeleteTissueConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Удаление типа ткани
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Удалить <strong>{deleteTissueItem?.name}</strong>?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTissueConfirmOpen(false)} disabled={deletingTissue}>Отмена</Button>
            <Button variant="destructive" onClick={handleDeleteTissue} disabled={deletingTissue}>
              {deletingTissue ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
