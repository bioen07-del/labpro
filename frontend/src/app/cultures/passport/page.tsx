"use client"

import { useState, useEffect } from 'react'
import { 
  FileCheck, 
  Download, 
  Printer,
  Calendar,
  User,
  FlaskConical,
  Dna,
  MapPin,
  History,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  getCultures, 
  getCultureById, 
  getLots, 
  getContainers, 
  getOperations,
  getBankById 
} from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/utils'

export default function CulturePassportPage() {
  const [cultures, setCultures] = useState<any[]>([])
  const [selectedCultureId, setSelectedCultureId] = useState<string>('')
  const [culture, setCulture] = useState<any>(null)
  const [lots, setLots] = useState<any[]>([])
  const [passport, setPassport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    loadCultures()
  }, [])
  
  const loadCultures = async () => {
    try {
      const data = await getCultures()
      setCultures(data || [])
    } catch (error) {
      console.error('Error loading cultures:', error)
    }
  }
  
  const loadCultureData = async (cultureId: string) => {
    setLoading(true)
    try {
      const [cultureData, lotsData] = await Promise.all([
        getCultureById(cultureId),
        getLots({ culture_id: cultureId })
      ])
      setCulture(cultureData)
      setLots(lotsData || [])
      
      // Generate passport
      await generatePassport(cultureData, lotsData || [])
    } catch (error) {
      console.error('Error loading culture data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const generatePassport = async (cultureData: any, lotsData: any[]) => {
    // Собираем статистику по всем лотам
    const allContainers: any[] = []
    const allOperations: any[] = []
    const allBanks: any[] = []
    
    for (const lot of lotsData) {
      try {
        const containers = await getContainers({ lot_id: lot.id })
        const operations = await getOperations({ lot_id: lot.id })
        allContainers.push(...(containers || []))
        allOperations.push(...(operations || []))
        
        // Получаем связанные банки
        if (lot.bank_id) {
          try {
            const bank = await getBankById(lot.bank_id)
            if (bank) allBanks.push(bank)
          } catch (e) {}
        }
      } catch (e) {}
    }
    
    const pp = {
      id: `CP-${Date.now()}`,
      generated_at: new Date().toISOString(),
      culture: {
        id: cultureData.id,
        name: cultureData.name,
        type: cultureData.culture_type?.name,
        description: cultureData.description,
        donor_code: cultureData.donor?.code,
        tissue_type: cultureData.tissue_type,
        species: cultureData.species,
        sex: cultureData.sex,
        age: cultureData.age,
        passage_max: cultureData.passage_max,
        created_at: cultureData.created_at,
      },
      statistics: {
        totalLots: lotsData.length,
        totalContainers: allContainers.length,
        totalOperations: allOperations.length,
        activeContainers: allContainers.filter(c => c.status === 'ACTIVE').length,
        frozenContainers: allContainers.filter(c => c.status === 'FROZEN').length,
        disposedContainers: allContainers.filter(c => c.status === 'DISPOSE').length,
        totalBanks: allBanks.length,
        totalVials: allBanks.reduce((sum, b) => sum + (b.vial_count || 0), 0),
      },
      lots: lotsData.map(lot => ({
        id: lot.id,
        code: lot.code,
        status: lot.status,
        passage_number: lot.passage_number,
        created_at: lot.created_at,
        container_count: allContainers.filter(c => c.lot_id === lot.id).length,
      })),
      banks: allBanks.map(bank => ({
        id: bank.id,
        code: bank.code,
        status: bank.status,
        vial_count: bank.vial_count,
        bank_type: bank.bank_type,
        created_at: bank.created_at,
      })),
      timeline: allOperations
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20)
        .map(op => ({
          type: op.operation_type,
          date: op.created_at,
          lot_code: op.lot?.code,
          notes: op.notes,
        })),
    }
    
    setPassport(pp)
  }
  
  const handlePrint = () => {
    window.print()
  }
  
  const handleDownload = () => {
    if (!passport) return
    
    const content = `
=== ПАСПОРТ КУЛЬТУРЫ LABPRO ===
Сгенерировано: ${formatDateTime(passport.generated_at)}

=== ИНФОРМАЦИЯ О КУЛЬТУРЕ ===
Название: ${passport.culture.name}
Тип: ${passport.culture.type}
Описание: ${passport.culture.description || 'Нет описания'}
Донор: ${passport.culture.donor_code || 'Не указан'}
Тип ткани: ${passport.culture.tissue_type || 'Не указан'}
Вид: ${passport.culture.species || 'Не указан'}
Пол: ${passport.culture.sex || 'Не указан'}
Возраст: ${passport.culture.age || 'Не указан'}
Макс. пассаж: ${passport.culture.passage_max || 'Не ограничен'}
Дата создания: ${formatDate(passport.culture.created_at)}

=== СТАТИСТИКА ===
Всего лотов: ${passport.statistics.totalLots}
Всего контейнеров: ${passport.statistics.totalContainers}
  - Активных: ${passport.statistics.activeContainers}
  - Замороженных: ${passport.statistics.frozenContainers}
  - Утилизированных: ${passport.statistics.disposedContainers}
Всего операций: ${passport.statistics.totalOperations}
Всего банков: ${passport.statistics.totalBanks}
Всего ампул: ${passport.statistics.totalVials}

=== ЛОТЫ ===
${passport.lots.map((l: any) => 
  `- ${l.code} | Пассаж ${l.passage_number} | ${l.container_count} контейнеров | Статус: ${l.status}`
).join('\n')}

=== БАНКИ ===
${passport.banks.map((b: any) => 
  `- ${b.code} | ${b.vial_count} ампул | Тип: ${b.bank_type} | Статус: ${b.status}`
).join('\n')}

=== ИСТОРИЯ ОПЕРАЦИЙ ===
${passport.timeline.map((t: any) => 
  `- ${t.type} | ${formatDate(t.date)} | Лот: ${t.lot_code}`
).join('\n')}

================================
LabPro v1.0 | Паспорт культуры
    `.trim()
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `passport-${passport.culture.name.replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Паспорт культуры</h1>
          <p className="text-muted-foreground">
            Генератор паспорта культуры для документации
          </p>
        </div>
        <div className="flex gap-2">
          {passport && (
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
          <CardTitle>Выберите культуру</CardTitle>
          <CardDescription>
            Паспорт будет сгенерирован для выбранной культуры
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Культура</Label>
              <Select 
                value={selectedCultureId} 
                onValueChange={(v) => {
                  setSelectedCultureId(v)
                  loadCultureData(v)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите культуру..." />
                </SelectTrigger>
                <SelectContent>
                  {cultures.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.culture_type?.name})
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
          <FlaskConical className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Генерация паспорта...</p>
        </div>
      )}
      
      {/* Passport Preview */}
      {passport && !loading && (
        <div className="print-container">
          <Card className="print:border-0 print:shadow-none">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FileCheck className="h-6 w-6" />
                    ПАСПОРТ КУЛЬТУРЫ
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Сгенерировано: {formatDateTime(passport.generated_at)}
                  </p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {passport.culture.name}
                </Badge>
              </div>
              
              {/* Culture Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Название культуры</p>
                  <p className="font-medium text-lg">{passport.culture.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Тип</p>
                  <p className="font-medium">{passport.culture.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Донор</p>
                  <p className="font-medium">{passport.culture.donor_code || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Вид</p>
                  <p className="font-medium">{passport.culture.species || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Тип ткани</p>
                  <p className="font-medium">{passport.culture.tissue_type || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Пол</p>
                  <p className="font-medium">{passport.culture.sex || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Возраст</p>
                  <p className="font-medium">{passport.culture.age || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Макс. пассаж</p>
                  <p className="font-medium">{passport.culture.passage_max || 'Не ограничен'}</p>
                </div>
              </div>
              
              {/* Description */}
              {passport.culture.description && (
                <div className="bg-muted rounded-lg p-4 mb-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>Описание:</strong> {passport.culture.description}
                  </p>
                </div>
              )}
              
              {/* Statistics */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Dna className="h-4 w-4" />
                  Статистика
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{passport.statistics.totalLots}</p>
                    <p className="text-xs text-muted-foreground">Лотов</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{passport.statistics.totalContainers}</p>
                    <p className="text-xs text-muted-foreground">Контейнеров</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{passport.statistics.activeContainers}</p>
                    <p className="text-xs text-muted-foreground">Активных</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{passport.statistics.frozenContainers}</p>
                    <p className="text-xs text-muted-foreground">Заморожено</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{passport.statistics.totalVials}</p>
                    <p className="text-xs text-muted-foreground">Ампул в банках</p>
                  </div>
                </div>
              </div>
              
              {/* Lots */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Лоты ({passport.lots.length})
                </h3>
                <div className="grid gap-2">
                  {passport.lots.map((lot: any) => (
                    <div 
                      key={lot.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{lot.code}</Badge>
                        <span className="text-sm">Пассаж #{lot.passage_number}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {lot.container_count} контейнеров
                        </span>
                        <Badge variant={
                          lot.status === 'ACTIVE' ? 'default' :
                          lot.status === 'FROZEN' ? 'secondary' :
                          lot.status === 'DISPOSE' ? 'destructive' : 'outline'
                        }>
                          {lot.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Banks */}
              {passport.banks.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Криобанки ({passport.banks.length})
                  </h3>
                  <div className="grid gap-2">
                    {passport.banks.map((bank: any) => (
                      <div 
                        key={bank.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{bank.code}</Badge>
                          <span className="text-sm text-muted-foreground">{bank.bank_type}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm">
                            <strong>{bank.vial_count}</strong> ампул
                          </span>
                          <Badge variant={
                            bank.status === 'IN_STOCK' ? 'default' :
                            bank.status === 'SHIPPED' ? 'secondary' : 'outline'
                          }>
                            {bank.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Timeline */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  История операций
                </h3>
                <div className="border rounded-lg divide-y">
                  {passport.timeline.map((op: any, i: number) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{op.type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Лот: {op.lot_code}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(op.date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Footer */}
              <div className="border-t pt-4 mt-6 text-center text-sm text-muted-foreground">
                <p>LabPro v1.0 | Паспорт культуры | Сгенерировано {formatDateTime(passport.generated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {!passport && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Выберите культуру для генерации паспорта</p>
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
