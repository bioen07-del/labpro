"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Beaker, 
  Plus, 
  Search,
  Filter,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Trash2,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  getReadyMedia, 
  createReadyMedium, 
  activateReadyMedium,
  disposeReadyMedium,
  getBatches,
  getPositions
} from '@/lib/api'
import { formatDate, getStatusLabel } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
  PREPARED: { color: 'bg-blue-100 text-blue-800', label: 'Приготовлена', icon: Beaker },
  ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Готова к использованию', icon: CheckCircle2 },
  IN_USE: { color: 'bg-yellow-100 text-yellow-800', label: 'В использовании', icon: RefreshCw },
  EXPIRED: { color: 'bg-red-100 text-red-800', label: 'Просрочена', icon: AlertTriangle },
  DISPOSE: { color: 'bg-gray-100 text-gray-800', label: 'Утилизирована', icon: Trash2 },
}

export default function ReadyMediaPage() {
  const [readyMedia, setReadyMedia] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  
  // Форма создания
  const [newMedium, setNewMedium] = useState({
    batch_id: '',
    name: '',
    volume_ml: 0,
    preparation_date: new Date().toISOString().split('T')[0],
    expiration_hours: 72,
    storage_position_id: '',
    notes: '',
  })
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    setLoading(true)
    try {
      const [mediaData, batchesData, positionsData] = await Promise.all([
        getReadyMedia(),
        getBatches({ status: 'ACTIVE' }),
        getPositions({ is_active: true })
      ])
      setReadyMedia(mediaData || [])
      setBatches(batchesData || [])
      setPositions(positionsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const getExpirationStatus = (preparedAt: string, expirationHours: number) => {
    const prepared = new Date(preparedAt)
    const expires = new Date(prepared.getTime() + expirationHours * 60 * 60 * 1000)
    const now = new Date()
    const hoursLeft = (expires.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursLeft < 0) return { status: 'expired', hoursLeft: 0, label: 'Просрочена' }
    if (hoursLeft < 6) return { status: 'warning', hoursLeft, label: `Осталось ${hoursLeft.toFixed(1)} ч.` }
    return { status: 'ok', hoursLeft, label: `Осталось ${hoursLeft.toFixed(1)} ч.` }
  }
  
  const handleCreate = async () => {
    try {
      const batch = batches.find(b => b.id === newMedium.batch_id)
      await createReadyMedium({
        ...newMedium,
        nomenclature_id: batch?.nomenclature_id,
        status: 'ACTIVE',
      })
      setShowCreateDialog(false)
      loadData()
    } catch (error) {
      console.error('Error creating ready medium:', error)
    }
  }
  
  const handleActivate = async (id: string) => {
    try {
      await activateReadyMedium(id)
      loadData()
    } catch (error) {
      console.error('Error activating:', error)
    }
  }
  
  const handleDispose = async (id: string) => {
    try {
      await disposeReadyMedium(id)
      loadData()
    } catch (error) {
      console.error('Error disposing:', error)
    }
  }
  
  const filteredMedia = readyMedia.filter(media => {
    const matchesSearch = searchQuery === '' || 
      media.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      media.name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || media.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })
  
  const stats = {
    total: readyMedia.length,
    active: readyMedia.filter(m => m.status === 'ACTIVE').length,
    expiring: readyMedia.filter(m => {
      const exp = getExpirationStatus(m.created_at, m.expiration_hours)
      return exp.status === 'warning'
    }).length,
    expired: readyMedia.filter(m => m.status === 'EXPIRED').length,
  }
  
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Готовые среды</h1>
          <p className="text-muted-foreground">
            Учёт приготовленных клеточных сред (FEFO)
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Приготовить среду
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Приготовление среды</DialogTitle>
              <DialogDescription>
                Зарегистрируйте новую партию готовой среды
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Базовая среда</Label>
                <Select 
                  value={newMedium.batch_id}
                  onValueChange={(v) => setNewMedium({...newMedium, batch_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите партию..." />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map(batch => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.nomenclature?.name} • Партия: {batch.batch_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Название/добавки</Label>
                <Input 
                  value={newMedium.name}
                  onChange={(e) => setNewMedium({...newMedium, name: e.target.value})}
                  placeholder="Например: DMEM + 10% FBS + 1% P/S"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Объём (мл)</Label>
                  <Input 
                    type="number"
                    value={newMedium.volume_ml}
                    onChange={(e) => setNewMedium({...newMedium, volume_ml: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Срок годности (ч)</Label>
                  <Input 
                    type="number"
                    value={newMedium.expiration_hours}
                    onChange={(e) => setNewMedium({...newMedium, expiration_hours: parseInt(e.target.value) || 72})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Позиция хранения</Label>
                <Select 
                  value={newMedium.storage_position_id}
                  onValueChange={(v) => setNewMedium({...newMedium, storage_position_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите позицию..." />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.filter(p => p.equipment?.type === 'REFRIGERATOR').map(pos => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Примечания</Label>
                <Textarea 
                  value={newMedium.notes}
                  onChange={(e) => setNewMedium({...newMedium, notes: e.target.value})}
                  placeholder="Дополнительная информация..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Отмена
              </Button>
              <Button onClick={handleCreate} disabled={!newMedium.batch_id}>
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего партий
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Готовы к использованию
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Срок истекает (меньше 6ч)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiring}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Просрочено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по коду, названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="ACTIVE">Активные</TabsTrigger>
            <TabsTrigger value="IN_USE">В использовании</TabsTrigger>
            <TabsTrigger value="EXPIRED">Просроченные</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список готовых сред</CardTitle>
          <CardDescription>
            FEFO — First Expired, First Out
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Состав</TableHead>
                <TableHead>Объём</TableHead>
                <TableHead>Приготовлено</TableHead>
                <TableHead>Годность</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Позиция</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedia.map((media) => {
                const expStatus = getExpirationStatus(media.created_at, media.expiration_hours)
                const statusConfig = STATUS_CONFIG[media.status] || STATUS_CONFIG.PREPARED
                const StatusIcon = statusConfig.icon
                
                return (
                  <TableRow key={media.id}>
                    <TableCell>
                      <Link href={`/ready-media/${media.id}`} className="font-medium hover:underline">
                        {media.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {media.name || media.batch?.nomenclature?.name || '-'}
                      {media.notes && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {media.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{media.volume_ml} мл</TableCell>
                    <TableCell>
                      {formatDate(media.created_at)}
                      <p className="text-xs text-muted-foreground">
                        {media.created_by_user?.full_name}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${
                        expStatus.status === 'expired' ? 'text-red-600' :
                        expStatus.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        <Clock className="h-3 w-3" />
                        <span className="text-sm">{expStatus.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {media.storage_position?.path || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {media.status === 'ACTIVE' && (
                          <>
                            <Button variant="ghost" size="icon" title="Взять в работу">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Утилизировать" onClick={() => handleDispose(media.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {media.status === 'PREPARED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleActivate(media.id)}>
                            Активировать
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredMedia.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Среды не найдены
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* FEFO Info */}
      <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          <strong>FEFO</strong> — среды с истекающим сроком годности отображаются первыми в списке. 
          Всегда используйте сначала среду с ближайшей датой истечения срока.
        </p>
      </div>
    </div>
  )
}
