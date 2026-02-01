"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  Loader2,
  Search,
  Filter,
  User,
  Calendar,
  Phone,
  MoreHorizontal,
  FilePlus
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

  const getDonorFullName = (donor: any) => {
    const parts = [donor.last_name, donor.first_name, donor.middle_name].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'ФИО не указано'
  }

  const filteredDonors = donors.filter((donor: any) => {
    const q = search.toLowerCase()
    const fullName = getDonorFullName(donor).toLowerCase()
    return fullName.includes(q) || donor.code?.toLowerCase().includes(q)
  })

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
            placeholder="Поиск по ФИО или коду..."
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
                    <CardTitle className="text-lg">
                      <Link href={`/donors/${donor.id}`} className="hover:underline">
                        {getDonorFullName(donor)}
                      </Link>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground font-mono">{donor.code}</p>
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
                        <Link href={`/donors/${donor.id}/donations/new`}>
                          Новая донация
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
                    {donor.sex === 'M' ? 'Мужской' : donor.sex === 'F' ? 'Женский' : 'Пол не указан'}
                  </span>
                </div>
                {donor.birth_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Дата рождения: {formatDate(donor.birth_date)}</span>
                  </div>
                )}
                {donor.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{donor.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  {donor.status && (
                    <Badge variant={donor.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {donor.status === 'ACTIVE' ? 'Активен' : donor.status}
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/donors/${donor.id}/donations/new`}>
                      <FilePlus className="h-3 w-3 mr-1" />
                      Донация
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
