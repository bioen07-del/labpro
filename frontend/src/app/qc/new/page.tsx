'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQCTest, getBanks } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const testTypes = [
  { value: 'MYCOPLASMA', label: 'Микоплазма' },
  { value: 'STERILITY', label: 'Стерильность' },
  { value: 'LAL', label: 'LAL тест' },
  { value: 'VIA', label: 'VIA тест' },
]

const targetTypes = [
  { value: 'BANK', label: 'Банк клеток' },
  { value: 'CULTURE', label: 'Культура' },
  { value: 'LOT', label: 'Лот' },
]

export default function NewQCTestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [banks, setBanks] = useState<any[]>([])
  const [formData, setFormData] = useState({
    test_type: 'MYCOPLASMA',
    target_type: 'BANK',
    target_id: '',
    notes: '',
  })

  // Загружаем банки когда выбран target_type = BANK
  const loadBanks = async () => {
    try {
      const data = await getBanks({ status: 'APPROVED' })
      setBanks(data || [])
    } catch (error) {
      console.error('Error loading banks:', error)
    }
  }

  const handleTargetTypeChange = async (value: string) => {
    setFormData({ ...formData, target_type: value, target_id: '' })
    if (value === 'BANK') {
      await loadBanks()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createQCTest({
        test_type: formData.test_type,
        target_type: formData.target_type,
        target_id: formData.target_id,
        status: 'PENDING',
        notes: formData.notes || null,
      })

      toast.success('QC тест создан')
      router.push('/qc')
    } catch (error) {
      console.error('Error creating QC test:', error)
      toast.error('Ошибка при создании QC теста')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Создание QC теста</CardTitle>
          <CardDescription>
            Зарегистрируйте новый тест контроля качества
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="test_type">Тип теста *</Label>
              <Select
                value={formData.test_type}
                onValueChange={(value) => setFormData({ ...formData, test_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип теста" />
                </SelectTrigger>
                <SelectContent>
                  {testTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="target_type">Тип объекта *</Label>
              <Select
                value={formData.target_type}
                onValueChange={handleTargetTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип объекта" />
                </SelectTrigger>
                <SelectContent>
                  {targetTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.target_type === 'BANK' && (
              <div>
                <Label htmlFor="target_id">Банк клеток *</Label>
                <Select
                  value={formData.target_id}
                  onValueChange={(value) => setFormData({ ...formData, target_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите банк" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.code} - {bank.culture?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.target_type === 'CULTURE' && (
              <div>
                <Label htmlFor="target_id">ID культуры *</Label>
                <Input
                  id="target_id"
                  value={formData.target_id}
                  onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                  placeholder="Введите ID культуры"
                />
              </div>
            )}

            {formData.target_type === 'LOT' && (
              <div>
                <Label htmlFor="target_id">ID лота *</Label>
                <Input
                  id="target_id"
                  value={formData.target_id}
                  onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                  placeholder="Введите ID лота"
                />
              </div>
            )}

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
                {loading ? 'Создание...' : 'Создать тест'}
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
