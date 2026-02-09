'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEquipment, saveMonitoringParams } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const equipmentTypes = [
  { value: 'INCUBATOR', label: 'Инкубатор' },
  { value: 'FRIDGE', label: 'Холодильник' },
  { value: 'FREEZER', label: 'Морозильник' },
  { value: 'CABINET', label: 'Бокс' },
  { value: 'RACK', label: 'Стеллаж' },
  { value: 'LAMINAR', label: 'Ламинарный шкаф' },
  { value: 'CENTRIFUGE', label: 'Центрифуга' },
  { value: 'MICROSCOPE', label: 'Микроскоп' },
  { value: 'NITROGEN_TANK', label: 'Сосуд Дьюара (азотный)' },
  { value: 'WATER_BATH', label: 'Водяная баня' },
  { value: 'OTHER', label: 'Другое' },
]

const equipmentStatuses = [
  { value: 'ACTIVE', label: 'Активен' },
  { value: 'MAINTENANCE', label: 'На обслуживании' },
  { value: 'BROKEN', label: 'Неисправен' },
]

const MONITORING_PARAMS = [
  { key: 'temperature', label: 'Температура', unit: '°C' },
  { key: 'humidity', label: 'Влажность', unit: '%' },
  { key: 'co2_level', label: 'CO₂', unit: '%' },
  { key: 'o2_level', label: 'O₂', unit: '%' },
]

interface MonitoringConfig {
  enabled: boolean
  min_value: string
  max_value: string
}

export default function NewEquipmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [monitoringEnabled, setMonitoringEnabled] = useState(false)
  const [monitoringConfig, setMonitoringConfig] = useState<Record<string, MonitoringConfig>>(() => {
    const cfg: Record<string, MonitoringConfig> = {}
    MONITORING_PARAMS.forEach(p => { cfg[p.key] = { enabled: false, min_value: '', max_value: '' } })
    return cfg
  })
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'INCUBATOR',
    model: '',
    serial_number: '',
    inventory_number: '',
    location: '',
    status: 'ACTIVE',
    notes: '',
    validation_date: '',
    next_validation: '',
    last_maintenance: '',
    next_maintenance: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const equipment = await createEquipment({
        code: formData.code,
        name: formData.name,
        type: formData.type,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        inventory_number: formData.inventory_number || null,
        location: formData.location || null,
        status: formData.status,
        notes: formData.notes || null,
        validation_date: formData.validation_date || null,
        next_validation: formData.next_validation || null,
        last_maintenance: formData.last_maintenance || null,
        next_maintenance: formData.next_maintenance || null,
      })

      // Save monitoring params if enabled
      if (monitoringEnabled && equipment?.id) {
        const params = MONITORING_PARAMS
          .filter(p => monitoringConfig[p.key].enabled)
          .map((p, idx) => ({
            param_key: p.key,
            param_label: p.label,
            unit: p.unit,
            min_value: monitoringConfig[p.key].min_value ? Number(monitoringConfig[p.key].min_value) : undefined,
            max_value: monitoringConfig[p.key].max_value ? Number(monitoringConfig[p.key].max_value) : undefined,
            is_required: true,
            sort_order: idx,
          }))
        if (params.length > 0) {
          await saveMonitoringParams(equipment.id, formData.type, params)
        }
      }

      toast.success('Оборудование создано')
      router.push('/equipment')
    } catch (error) {
      console.error('Error creating equipment:', error)
      toast.error('Ошибка при создании оборудования')
    } finally {
      setLoading(false)
    }
  }

  const updateMonitoringParam = (key: string, field: keyof MonitoringConfig, value: any) => {
    setMonitoringConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }))
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Добавление оборудования</CardTitle>
          <CardDescription>
            Заполните форму для регистрации нового оборудования
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Код оборудования *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Например: INC-001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название оборудования"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Тип *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Статус</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="model">Модель</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Thermo Heracell 150i"
                />
              </div>
              <div>
                <Label htmlFor="serial_number">Серийный номер</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="SN12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inventory_number">Инвентарный номер</Label>
                <Input
                  id="inventory_number"
                  value={formData.inventory_number}
                  onChange={(e) => setFormData({ ...formData, inventory_number: e.target.value })}
                  placeholder="ИНВ-00123"
                />
              </div>
              <div>
                <Label htmlFor="location">Расположение</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Комната 101"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validation_date">Дата валидации</Label>
                <Input id="validation_date" type="date" value={formData.validation_date} onChange={(e) => setFormData({ ...formData, validation_date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="next_validation">Следующая валидация</Label>
                <Input id="next_validation" type="date" value={formData.next_validation} onChange={(e) => setFormData({ ...formData, next_validation: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="last_maintenance">Последнее ТО</Label>
                <Input id="last_maintenance" type="date" value={formData.last_maintenance} onChange={(e) => setFormData({ ...formData, last_maintenance: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="next_maintenance">Следующее ТО</Label>
                <Input id="next_maintenance" type="date" value={formData.next_maintenance} onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })} />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Примечания</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full min-h-[80px] p-3 border rounded-md"
                placeholder="Дополнительная информация"
              />
            </div>

            {/* Monitoring section */}
            <Card className="border-2 border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="monitoring"
                    checked={monitoringEnabled}
                    onCheckedChange={(v) => setMonitoringEnabled(!!v)}
                  />
                  <Label htmlFor="monitoring" className="text-base font-semibold cursor-pointer">
                    Мониторинг показателей
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-7">
                  Включите для регулярного внесения показателей (1-2 раза в день)
                </p>
              </CardHeader>
              {monitoringEnabled && (
                <CardContent className="space-y-3">
                  {MONITORING_PARAMS.map(param => (
                    <div key={param.key} className="flex items-center gap-4 p-3 border rounded-md">
                      <Checkbox
                        id={`mon_${param.key}`}
                        checked={monitoringConfig[param.key].enabled}
                        onCheckedChange={(v) => updateMonitoringParam(param.key, 'enabled', !!v)}
                      />
                      <Label htmlFor={`mon_${param.key}`} className="min-w-[120px] cursor-pointer">
                        {param.label} ({param.unit})
                      </Label>
                      {monitoringConfig[param.key].enabled && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">min:</span>
                            <Input
                              type="number"
                              step="0.1"
                              className="w-20 h-8"
                              value={monitoringConfig[param.key].min_value}
                              onChange={(e) => updateMonitoringParam(param.key, 'min_value', e.target.value)}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">max:</span>
                            <Input
                              type="number"
                              step="0.1"
                              className="w-20 h-8"
                              value={monitoringConfig[param.key].max_value}
                              onChange={(e) => updateMonitoringParam(param.key, 'max_value', e.target.value)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Создание...' : 'Создать'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Отмена
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
