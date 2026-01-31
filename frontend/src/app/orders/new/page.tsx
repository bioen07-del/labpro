"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createOrder, getCultureTypes, getBanks } from '@/lib/api'

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cultureTypes, setCultureTypes] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    order_type: 'OUTBOUND',
    culture_type_id: '',
    bank_id: '',
    requested_cells: '',
    priority: 'NORMAL',
    notes: '',
    recipient_name: '',
    recipient_contact: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [types, banksData] = await Promise.all([
        getCultureTypes(),
        getBanks({ status: 'APPROVED' })
      ])
      setCultureTypes(types || [])
      setBanks(banksData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createOrder({
        order_type: formData.order_type,
        culture_type_id: formData.culture_type_id,
        bank_id: formData.bank_id || null,
        requested_cells: parseInt(formData.requested_cells) || 0,
        priority: formData.priority,
        notes: formData.notes,
        recipient_name: formData.recipient_name,
        recipient_contact: formData.recipient_contact,
        status: 'PENDING',
      })
      
      router.push('/orders')
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Ошибка при создании заказа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Создание заказа</h1>
          <p className="text-muted-foreground">
            Оформление заявки на выдачу биоматериала
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Type */}
        <Card>
          <CardHeader>
            <CardTitle>Тип заказа</CardTitle>
            <CardDescription>
              Выберите тип операции
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.order_type === 'OUTBOUND' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setFormData({ ...formData, order_type: 'OUTBOUND' })}
              >
                <h3 className="font-medium">Выдача</h3>
                <p className="text-sm text-muted-foreground">
                  Забор биоматериала из банка
                </p>
              </div>
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.order_type === 'INBOUND' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setFormData({ ...formData, order_type: 'INBOUND' })}
              >
                <h3 className="font-medium">Приём</h3>
                <p className="text-sm text-muted-foreground">
                  Приём биоматериала в банк
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Culture Type */}
        <Card>
          <CardHeader>
            <CardTitle>Параметры заказа</CardTitle>
            <CardDescription>
              Укажите параметры запрашиваемого биоматериала
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="culture_type">Тип культуры *</Label>
                <Select
                  value={formData.culture_type_id}
                  onValueChange={(value) => setFormData({ ...formData, culture_type_id: value })}
                >
                  <SelectTrigger id="culture_type">
                    <SelectValue placeholder="Выберите тип культуры" />
                  </SelectTrigger>
                  <SelectContent>
                    {cultureTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank">Банк (если выбран)</Label>
                <Select
                  value={formData.bank_id}
                  onValueChange={(value) => setFormData({ ...formData, bank_id: value })}
                >
                  <SelectTrigger id="bank">
                    <SelectValue placeholder="Выберите банк" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Любой</SelectItem>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.culture?.name} - {bank.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cells">Количество клеток *</Label>
                <Input
                  id="cells"
                  type="number"
                  placeholder="Например: 1000000"
                  value={formData.requested_cells}
                  onChange={(e) => setFormData({ ...formData, requested_cells: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Приоритет</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Низкий</SelectItem>
                    <SelectItem value="NORMAL">Обычный</SelectItem>
                    <SelectItem value="HIGH">Высокий</SelectItem>
                    <SelectItem value="URGENT">Срочный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipient Info */}
        <Card>
          <CardHeader>
            <CardTitle>Информация о получателе</CardTitle>
            <CardDescription>
              Укажите данные получателя биоматериала
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recipient_name">ФИО получателя *</Label>
                <Input
                  id="recipient_name"
                  placeholder="Иванов Иван Иванович"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient_contact">Контактные данные *</Label>
                <Input
                  id="recipient_contact"
                  placeholder="Телефон или email"
                  value={formData.recipient_contact}
                  onChange={(e) => setFormData({ ...formData, recipient_contact: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Дополнительные примечания</Label>
              <Textarea
                id="notes"
                placeholder="Любая дополнительная информация..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Отмена
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Создать заказ
          </Button>
        </div>
      </form>
    </div>
  )
}
