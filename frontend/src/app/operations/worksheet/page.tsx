"use client"

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Download, 
  Printer,
  Calendar,
  User,
  FlaskConical,
  CheckSquare,
  RefreshCw,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getLots, getContainers, getOperations } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function WorksheetPage() {
  const [lots, setLots] = useState<any[]>([])
  const [selectedLot, setSelectedLot] = useState<string>('')
  const [containers, setContainers] = useState<any[]>([])
  const [operations, setOperations] = useState<any[]>([])
  const [worksheet, setWorksheet] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    loadLots()
  }, [])
  
  const loadLots = async () => {
    try {
      const data = await getLots({ status: 'ACTIVE' })
      setLots(data || [])
    } catch (error) {
      console.error('Error loading lots:', error)
    }
  }
  
  const loadLotData = async (lotId: string) => {
    setLoading(true)
    try {
      const [containersData, operationsData] = await Promise.all([
        getContainers({ lot_id: lotId }),
        getOperations({ lot_id: lotId, status: 'COMPLETED' })
      ])
      setContainers(containersData || [])
      setOperations(operationsData || [])
      
      // Generate worksheet
      const lot = lots.find(l => l.id === lotId)
      generateWorksheet(lot, containersData || [], operationsData || [])
    } catch (error) {
      console.error('Error loading lot data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const generateWorksheet = (lot: any, containersData: any[], operationsData: any[]) => {
    const ws = {
      id: `WS-${Date.now()}`,
      generated_at: new Date().toISOString(),
      lot: {
        id: lot?.id,
        code: lot?.code,
        culture_name: lot?.culture?.name,
        culture_type: lot?.culture?.culture_type?.name,
        passage_number: lot?.passage_number,
        created_at: lot?.created_at,
      },
      containers: containersData.map((c: any) => ({
        id: c.id,
        code: c.code,
        type: c.container_type?.name,
        confluent_percent: c.confluent_percent,
        morphology: c.morphology,
        position: c.position?.path,
      })),
      recent_operations: operationsData.slice(0, 5).map((op: any) => ({
        type: op.operation_type,
        date: op.completed_at,
        notes: op.notes,
      })),
      schedule: {
        next_feed: calculateNextFeed(operationsData),
        next_passage: calculateNextPassage(containersData),
        estimated_harvest: calculateHarvest(containersData),
      },
    }
    setWorksheet(ws)
  }
  
  const calculateNextFeed = (operations: any[]) => {
    const lastFeed = operations.find(op => op.operation_type === 'FEED')
    if (lastFeed) {
      const next = new Date(lastFeed.completed_at)
      next.setHours(next.getHours() + 48)
      return next.toISOString()
    }
    return null
  }
  
  const calculateNextPassage = (containers: any[]) => {
    const containersForPassage = containers.filter(c => 
      (c.confluent_percent || 0) >= 70 && c.status === 'ACTIVE'
    )
    if (containersForPassage.length > 0) {
      return `${containersForPassage.length} контейнеров готовы к пассажированию`
    }
    return 'Нет готовых контейнеров'
  }
  
  const calculateHarvest = (containers: any[]) => {
    const harvestable = containers.filter(c => 
      (c.confluent_percent || 0) >= 90 && c.status === 'ACTIVE'
    )
    if (harvestable.length > 0) {
      return `${harvestable.length} контейнеров готовы к сбору`
    }
    return 'Нет готовых к сбору'
  }
  
  const handlePrint = () => {
    window.print()
  }
  
  const handleDownload = () => {
    if (!worksheet) return
    
    const content = `
=== РАБОЧИЙ ЛИСТ LABPRO ===
Generated: ${formatDate(worksheet.generated_at)}

=== ЛОТ ===
Код: ${worksheet.lot.code}
Культура: ${worksheet.lot.culture_name}
Тип: ${worksheet.lot.culture_type}
Пассаж: ${worksheet.lot.passage_number}
Дата создания: ${formatDate(worksheet.lot.created_at)}

=== КОНТЕЙНЕРЫ ===
${worksheet.containers.map((c: any) => 
  `- ${c.code} | ${c.type} | Конфлюэнтность: ${c.confluent_percent}% | ${c.position}`
).join('\n')}

=== ПЛАН ОПЕРАЦИЙ ===
Следующее кормление: ${worksheet.schedule.next_feed ? formatDate(worksheet.schedule.next_feed) : 'Не запланировано'}
Следующее пассажирование: ${worksheet.schedule.next_passage}
Планируемый сбор: ${worksheet.schedule.estimated_harvest}

=== ПОСЛЕДНИЕ ОПЕРАЦИИ ===
${worksheet.recent_operations.map(op => 
  `- ${op.type} | ${formatDate(op.date)}`
).join('\n')}

================================
LabPro v1.0
    `.trim()
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worksheet-${worksheet.lot.code}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Рабочий лист</h1>
          <p className="text-muted-foreground">
            Генератор плана работ для лота культуры
          </p>
        </div>
        <div className="flex gap-2">
          {worksheet && (
            <>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Скачать
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Печать
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Выберите лот</CardTitle>
          <CardDescription>
            Рабочий лист будет сгенерирован для выбранного лота
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Лот культуры</Label>
              <Select 
                value={selectedLot} 
                onValueChange={(v) => {
                  setSelectedLot(v)
                  loadLotData(v)
                }}
              >
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
          </div>
        </CardContent>
      </Card>
      
      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Генерация рабочего листа...</p>
        </div>
      )}
      
      {/* Worksheet Preview */}
      {worksheet && !loading && (
        <div className="print-container">
          <Card className="print:border-0 print:shadow-none">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold">РАБОЧИЙ ЛИСТ</h2>
                  <p className="text-sm text-muted-foreground">
                    Сгенерировано: {formatDate(worksheet.generated_at)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {worksheet.lot.code}
                  </Badge>
                </div>
              </div>
              
              {/* Lot Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground">Культура</p>
                  <p className="font-medium">{worksheet.lot.culture_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Тип</p>
                  <p className="font-medium">{worksheet.lot.culture_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Пассаж</p>
                  <p className="font-medium">#{worksheet.lot.passage_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Дата создания</p>
                  <p className="font-medium">{formatDate(worksheet.lot.created_at)}</p>
                </div>
              </div>
              
              {/* Schedule */}
              <div className="bg-muted rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  План операций
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Следующее кормление</p>
                      <p className="font-medium">
                        {worksheet.schedule.next_feed ? formatDate(worksheet.schedule.next_feed) : 'Не запланировано'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Пассажирование</p>
                      <p className="font-medium">{worksheet.schedule.next_passage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Планируемый сбор</p>
                      <p className="font-medium">{worksheet.schedule.estimated_harvest}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Containers */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Контейнеры ({worksheet.containers.length})
                </h3>
                <div className="grid gap-2">
                  {worksheet.containers.map((container: any) => (
                    <div 
                      key={container.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{container.code}</Badge>
                        <span className="text-sm text-muted-foreground">{container.type}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">
                          Конфлюэнтность: <strong>{container.confluent_percent}%</strong>
                        </span>
                        <span className="text-sm text-muted-foreground">{container.position}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Recent Operations */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Последние операции
                </h3>
                <div className="grid gap-2">
                  {worksheet.recent_operations.map((op: any, i: number) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-2 border-b last:border-0"
                    >
                      <Badge variant="secondary">{op.type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(op.date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Footer */}
              <div className="border-t pt-4 mt-6 text-center text-sm text-muted-foreground">
                <p>LabPro v1.0 | Сгенерировано {formatDate(worksheet.generated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {!worksheet && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Выберите лот для генерации рабочего листа</p>
        </div>
      )}
      
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
