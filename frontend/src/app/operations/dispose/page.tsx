"use client"

import { useState, useEffect } from 'react'
import { Trash2, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { getLots, getContainers, createOperation, updateContainer, getDisposeReasons } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function DisposePage() {
  const router = useRouter()
  const [lots, setLots] = useState<any[]>([])
  const [selectedLotId, setSelectedLotId] = useState<string>('')
  const [containers, setContainers] = useState<any[]>([])
  const [selectedContainers, setSelectedContainers] = useState<string[]>([])
  const [reason, setReason] = useState<string>('')
  const [disposeReasons, setDisposeReasons] = useState<any[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      const [lotsData, reasonsData] = await Promise.all([
        getLots({ status: 'ACTIVE' }),
        getDisposeReasons()
      ])
      setLots(lotsData || [])
      setDisposeReasons(reasonsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }
  
  const loadContainers = async (lotId: string) => {
    try {
      const data = await getContainers({ lot_id: lotId })
      setContainers(data || [])
      setSelectedContainers([])
    } catch (error) {
      console.error('Error loading containers:', error)
    }
  }
  
  const handleLotChange = (lotId: string) => {
    setSelectedLotId(lotId)
    loadContainers(lotId)
  }
  
  const toggleContainer = (containerId: string) => {
    setSelectedContainers(prev => 
      prev.includes(containerId) 
        ? prev.filter(id => id !== containerId)
        : [...prev, containerId]
    )
  }
  
  const handleSubmit = async () => {
    if (!selectedLotId || selectedContainers.length === 0 || !reason || !confirmed) {
      return
    }
    
    setLoading(true)
    try {
      // Утилизируем каждый выбранный контейнер
      for (const containerId of selectedContainers) {
        await updateContainer(containerId, {
          status: 'DISPOSE'
        })
        
        await createOperation({
          type: 'DISPOSE',
          lot_id: selectedLotId,
          notes: `Причина: ${reason}. ${notes}`,
          status: 'COMPLETED'
        })
      }
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/operations')
      }, 2000)
    } catch (error) {
      console.error('Error creating operation:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (success) {
    return (
      <div className="container py-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Check className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <h2 className="text-xl font-bold mb-2">Утилизация выполнена!</h2>
            <p className="text-muted-foreground">
              Утилизировано {selectedContainers.length} контейнеров
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Утилизация</h1>
        <p className="text-muted-foreground">
          Утилизация культур и контейнеров
        </p>
      </div>
      
      {/* Warning */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
        <div>
          <p className="font-medium text-red-800">Внимание!</p>
          <p className="text-sm text-red-700">
            Утилизация необратима. После подтверждения операции контейнеры будут помечены как утилизированные
            и не смогут быть восстановлены.
          </p>
        </div>
      </div>
      
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Утилизация контейнеров
          </CardTitle>
          <CardDescription>
            Выберите контейнеры для утилизации
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lot Selection */}
          <div className="space-y-2">
            <Label>Лот культуры</Label>
            <Select value={selectedLotId} onValueChange={handleLotChange}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите лот..." />
              </SelectTrigger>
              <SelectContent>
                {lots.map(lot => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.code} - {lot.culture?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Reason */}
          <div className="space-y-2">
            <Label>Причина утилизации</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите причину..." />
              </SelectTrigger>
              <SelectContent>
                {disposeReasons.map(r => (
                  <SelectItem key={r.id} value={r.code}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Containers */}
          {selectedLotId && (
            <div className="space-y-4">
              <Label>Контейнеры ({containers.length})</Label>
              
              {containers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <Trash2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p>Нет контейнеров в выбранном лоте</p>
                </div>
              ) : (
                <div className="grid gap-2 max-h-64 overflow-y-auto">
              {containers
                    .filter(c => c.container_status === 'IN_CULTURE')
                    .map(container => (
                    <div 
                      key={container.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedContainers.includes(container.id) 
                          ? 'border-red-500 bg-red-50' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleContainer(container.id)}
                    >
                      <Checkbox 
                        checked={selectedContainers.includes(container.id)}
                        onCheckedChange={() => toggleContainer(container.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{container.code}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {container.container_type?.name}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-right">
                        <span className="text-muted-foreground">Конфлюэнтность: </span>
                        <span>{container.confluent_percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Confirmation */}
          <div className="flex items-center space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Checkbox 
              id="confirm"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v as boolean)}
            />
            <Label htmlFor="confirm" className="cursor-pointer">
              Я подтверждаю утилизацию выбранных контейнеров
            </Label>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label>Примечания</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>
          
          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              Отмена
            </Button>
            <Button 
              variant="destructive"
              onClick={handleSubmit}
              disabled={!selectedLotId || selectedContainers.length === 0 || !reason || !confirmed || loading}
            >
              {loading ? 'Сохранение...' : 'Утилизировать'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
