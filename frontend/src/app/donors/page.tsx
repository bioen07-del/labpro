"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Loader2, 
  Search, 
  Filter,
  User,
  Heart,
  Calendar,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getDonors } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function DonorsPage() {
  const [loading, setLoading] = useState(true)
  const [donors, setDonors] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadDonors()
  }, [])

  const loadDonors = async () => {
    setLoading(true)
    try {
      const data = await getDonors()
      setDonors(data || [])
    } catch (err) {
      console.error('Error loading donors:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredDonors = donors.filter((donor: any) => 
    donor.code?.toLowerCase().includes(search.toLowerCase()) ||
    donor.tissue_type?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Доноры</h1>
          <p className="text-muted-foreground">Управление донорами биоматериала</p>
        </div>
        <Button asChild>
          <Link href="/donors/new">
            <Plus className="mr-2 h-4 w-4" />
            Новый донор
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по коду или типу ткани..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Фильтры
        </Button>
      </div>

      {/* Donors List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDonors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Доноры не найдены</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Попробуйте изменить параметры поиска' : 'Начните с регистрации первого донора'}
            </p>
            <Button asChild>
              <Link href="/donors/new">
                <Plus className="mr-2 h-4 w-4" />
                Добавить донора
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDonors.map((donor: any) => (
            <Card key={donor.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{donor.code}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {donor.tissue_type || 'Тип ткани не указан'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/donors/${donor.id}`}>Просмотр</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/cultures/new?donor_id=${donor.id}`}>
                          Создать культуру
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {donor.gender === 'M' ? 'Мужской' : donor.gender === 'F' ? 'Женский' : 'Не указан'}
                    {donor.age && `, ${donor.age} лет`}
                  </span>
                </div>
                {donor.collection_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Забор: {formatDate(donor.collection_date)}</span>
                  </div>
                )}
                {donor.tissues && donor.tissues.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>Тканей: {donor.tissues.length}</span>
                  </div>
                )}
                {donor.status && (
                  <Badge variant={donor.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {donor.status === 'ACTIVE' ? 'Активен' : donor.status}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
