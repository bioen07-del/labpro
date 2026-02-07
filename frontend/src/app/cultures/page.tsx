"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Loader2,
  FlaskConical,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCultures } from '@/lib/api'
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Culture, CultureType } from '@/types'

type CultureWithType = Culture & { culture_type: CultureType }

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  { value: 'ACTIVE', label: 'Активные' },
  { value: 'ARCHIVED', label: 'В архиве' },
] as const

export default function CulturesPage() {
  const router = useRouter()
  const [cultures, setCultures] = useState<CultureWithType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const loadCultures = useCallback(async () => {
    setLoading(true)
    try {
      const filters: { status?: string } = {}
      if (statusFilter !== 'all') {
        filters.status = statusFilter
      }
      const data = await getCultures(filters)
      setCultures(data || [])
    } catch (error) {
      console.error('Error loading cultures:', error)
      toast.error('Не удалось загрузить список культур')
      setCultures([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadCultures()
  }, [loadCultures])

  const filteredCultures = cultures.filter((culture) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      culture.name?.toLowerCase().includes(q) ||
      culture.culture_type?.name?.toLowerCase().includes(q) ||
      culture.culture_type?.code?.toLowerCase().includes(q)
    )
  })

  const getDonorLabel = (culture: CultureWithType): string => {
    const donor = culture.donor
    if (!donor) return '-'
    const parts = [donor.last_name, donor.first_name].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : donor.code || '-'
  }

  const getMaxPassage = (culture: CultureWithType): string => {
    const lots = culture.lots
    if (!lots || lots.length === 0) return 'P0'
    const max = Math.max(...lots.map((l) => l.passage_number ?? 0))
    return `P${max}`
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Культуры</h1>
        <Button asChild>
          <Link href="/cultures/new">
            <Plus className="mr-2 h-4 w-4" />
            Создать культуру
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или коду..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {loading
              ? 'Загрузка...'
              : `Найдено: ${filteredCultures.length}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCultures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FlaskConical className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">Культуры не найдены</p>
              <p className="text-sm mt-1">
                Попробуйте изменить параметры поиска или фильтры
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Код</TableHead>
                    <TableHead>Тип клеток</TableHead>
                    <TableHead>Донор</TableHead>
                    <TableHead>Пассаж</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата создания</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCultures.map((culture) => (
                    <TableRow
                      key={culture.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/cultures/${culture.id}`)}
                    >
                      <TableCell className="font-medium">
                        {culture.name || culture.id?.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          {culture.culture_type?.name || '-'}
                        </div>
                        {culture.culture_type?.code && (
                          <span className="text-xs text-muted-foreground">
                            {culture.culture_type.code}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getDonorLabel(culture)}</TableCell>
                      <TableCell>{getMaxPassage(culture)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(culture.status)}>
                          {getStatusLabel(culture.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(culture.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
