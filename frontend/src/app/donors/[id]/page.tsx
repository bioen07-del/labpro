"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  User,
  Calendar,
  Phone,
  Mail,
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Beaker
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getDonorById, getDonations } from '@/lib/api'
import { formatDate } from '@/lib/utils'

const infectionStatusIcon = (status: string) => {
  switch (status) {
    case 'NEGATIVE':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'POSITIVE':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />
  }
}

const donationStatusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return <Badge className="bg-green-100 text-green-700">Одобрена</Badge>
    case 'REJECTED':
      return <Badge variant="destructive">Отклонена</Badge>
    default:
      return <Badge variant="secondary">Карантин</Badge>
  }
}

export default function DonorDetailPage() {
  const params = useParams()
  const donorId = params.id as string

  const [loading, setLoading] = useState(true)
  const [donor, setDonor] = useState<any>(null)
  const [donations, setDonations] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (donorId) loadData()
  }, [donorId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [donorData, donationsData] = await Promise.all([
        getDonorById(donorId),
        getDonations({ donor_id: donorId }),
      ])
      setDonor(donorData)
      setDonations(donationsData || [])
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных донора')
    } finally {
      setLoading(false)
    }
  }

  const getDonorFullName = () => {
    if (!donor) return ''
    const parts = [donor.last_name, donor.first_name, donor.middle_name].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'ФИО не указано'
  }

  if (loading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !donor) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error || 'Донор не найден'}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/donors"><ArrowLeft className="mr-2 h-4 w-4" />К списку доноров</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/donors"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{getDonorFullName()}</h1>
            <p className="text-muted-foreground font-mono">{donor.code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/donors/${donorId}/donations/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Новая донация
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Donor Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Данные донора
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Пол: {donor.sex === 'M' ? 'Мужской' : donor.sex === 'F' ? 'Женский' : 'Не указан'}</span>
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
                {donor.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{donor.email}</span>
                  </div>
                )}
                {donor.blood_type && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>Группа крови: {donor.blood_type}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t">
                <Badge variant={donor.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {donor.status === 'ACTIVE' ? 'Активен' : donor.status}
                </Badge>
              </div>

              {donor.notes && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">Примечания:</p>
                  <p className="text-sm mt-1">{donor.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Всего донаций</span>
                <span className="font-medium">{donations.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Одобрено</span>
                <span className="font-medium text-green-600">
                  {donations.filter(d => d.status === 'APPROVED').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">На карантине</span>
                <span className="font-medium text-yellow-600">
                  {donations.filter(d => d.status === 'QUARANTINE').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Отклонено</span>
                <span className="font-medium text-red-600">
                  {donations.filter(d => d.status === 'REJECTED').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Donations List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Beaker className="h-5 w-5" />
                    Донации
                  </CardTitle>
                  <CardDescription>История забора биоматериала</CardDescription>
                </div>
                <Button size="sm" asChild>
                  <Link href={`/donors/${donorId}/donations/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {donations.length === 0 ? (
                <div className="text-center py-8">
                  <Beaker className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">Нет донаций</h3>
                  <p className="text-muted-foreground mb-4">
                    Зарегистрируйте первую донацию для этого донора
                  </p>
                  <Button asChild>
                    <Link href={`/donors/${donorId}/donations/new`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Новая донация
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {donations.map((donation: any) => (
                    <div
                      key={donation.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium font-mono">{donation.code}</p>
                          <p className="text-sm text-muted-foreground">
                            {donation.collected_at ? formatDate(donation.collected_at) : 'Дата не указана'}
                            {donation.tissue_type?.name && ` — ${donation.tissue_type.name}`}
                          </p>
                        </div>
                        {donationStatusBadge(donation.status)}
                      </div>

                      {/* Infection test results */}
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        <div className="flex items-center gap-1 text-xs">
                          {infectionStatusIcon(donation.inf_hiv)}
                          <span>ВИЧ</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {infectionStatusIcon(donation.inf_hbv)}
                          <span>HBV</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {infectionStatusIcon(donation.inf_hcv)}
                          <span>HCV</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {infectionStatusIcon(donation.inf_syphilis)}
                          <span>Сифилис</span>
                        </div>
                      </div>

                      {/* Volume / Weight */}
                      {(donation.tissue_volume_ml || donation.tissue_weight_g) && (
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          {donation.tissue_volume_ml && (
                            <span>Объём: {donation.tissue_volume_ml} мл</span>
                          )}
                          {donation.tissue_weight_g && (
                            <span>Масса: {donation.tissue_weight_g} г</span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {donation.status === 'APPROVED' && (
                        <div className="mt-3 pt-3 border-t">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/cultures/new?donor_id=${donorId}&donation_id=${donation.id}`}>
                              <Beaker className="mr-2 h-3 w-3" />
                              Создать культуру
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
