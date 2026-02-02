"use client"

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { getLots, getContainers, createOperationFeed, getMediumTypes } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function FeedPage() {
  const router = useRouter()
  const [lots, setLots] = useState<any[]>([])
  const [selectedLotId, setSelectedLotId] = useState<string>('')
  const [containers, setContainers] = useState<any[]>([])
  const [selectedContainers, setSelectedContainers] = useState<string[]>([])
  const [mediaType, setMediaType] = useState<string>('')
  const [mediumTypes, setMediumTypes] = useState<any[]>([])
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      const [lotsData, mediumData] = await Promise.all([
        getLots({ status: 'ACTIVE' }),
        getMediumTypes()
      ])
      setLots(lotsData || [])
      setMediumTypes(mediumData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }
  
  const loadContainers = async (lotId: string) => {
    try {
      const data = await getContainers({ lot_id: lotId, status: 'IN_CULTURE' })
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
  
  const toggleAll = () => {
    if (selectedContainers.length === containers.length) {
      setSelectedContainers([])
    } else {
      setSelectedContainers(containers.map((c: any) => c.id))
    }
  }
  
  const handleSubmit = async () => {
    if (!selectedLotId || selectedContainers.length === 0 || !mediaType) {
      return
    }
    
    setLoading(true)
    try {
      // Формируем данные для операции кормления
      const containersData = selectedContainers.map(containerId => ({
        container_id: containerId,
        medium_id: mediaType, // mediaType теперь используется как medium_id
        volume_ml: 5 // Значение по умолчанию
      }))
      
      await createOperationFeed({
        lot_id: selectedLotId,
        containers: containersData,
        notes: `Замена среды: ${mediaType}. ${notes}`
      })
      
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
            <h2 className="text-xl font-bold mb-2">Операция выполнена!</h2>
            <p className="text-muted-foreground">
              Кормление выполнено для {selectedContainers.length} контейнеров
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
        <h1 className="text-3xl font-bold tracking-tight">Кормление культур</h1>
        <p className="text-muted-foreground">
          Регистрация операции замены питательной среды
        </p>
      </div>
      
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Новая операция кормления
          </CardTitle>
          <CardDescription>
            Выберите лот и контейнеры для замены питательной среды
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
          
          {/* Media Type */}
          <div className="space-y-2">
            <Label>Тип питательной среды</Label>
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип среды..." />
              </SelectTrigger>
              <SelectContent>
                {mediumTypes.map(type => (
                  <SelectItem key={type.id} value={type.code}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Containers */}
          {selectedLotId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Контейнеры ({containers.length})</Label>
                {containers.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleAll}
                  >
                    {selectedContainers.length === containers.length 
                      ? 'Снять все' 
                      : 'Выбрать все'}
                  </Button>
                )}
              </div>
              
              {containers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p>Нет активных контейнеров в выбранном лоте</p>
                </div>
              ) : (
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {containers.map(container => (
                    <div 
                      key={container.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedContainers.includes(container.id) 
                          ? 'border-primary bg-primary/5' 
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
                        <span className={
                          (container.confluent_percent || 0) >= 90 ? 'text-green-600' :
                          (container.confluent_percent || 0) >= 70 ? 'text-orange-600' : ''
                        }>
                          {container.confluent_percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
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
              onClick={handleSubmit}
              disabled={!selectedLotId || selectedContainers.length === 0 || !mediaType || loading}
            >
              {loading ? 'Сохранение...' : 'Выполнить кормление'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
