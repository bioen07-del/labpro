'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEquipment } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const equipmentTypes = [
  { value: 'INCUBATOR', label: 'Инкубатор' },
  { value: 'FRIDGE', label: 'Холодильник' },
  { value: 'FREEZER', label: 'Морозильник' },
  { value: 'CABINET', label: 'Бокс' },
  { value: 'RACK', label: 'Стеллаж' },
]

const equipmentStatuses = [
  { value: 'ACTIVE', label: 'Активен' },
  { value: 'MAINTENANCE', label: 'На обслуживании' },
  { value: 'BROKEN', label: 'Неисправен' },
]

export default function NewEquipmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'INCUBATOR',
    location: '',
    temperature: '',
    status: 'ACTIVE',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createEquipment({
        code: formData.code,
        name: formData.name,
        type: formData.type,
        location: formData.location || null,
        temperature: formData.temperature ? parseInt(formData.temperature) : null,
        status: formData.status,
        notes: formData.notes || null,
      })

      toast.success('Оборудование создано')
      router.push('/equipment')
    } catch (error) {
      console.error('Error creating equipment:', error)
      toast.error('Ошибка при создании оборудования')
    } finally {
      setLoading(false)
    }
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
                <Label htmlFor="location">Расположение</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Например: Комната 101"
                />
              </div>
              <div>
                <Label htmlFor="temperature">Температура (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  placeholder="Например: 37"
                />
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
