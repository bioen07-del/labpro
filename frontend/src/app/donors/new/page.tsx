"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  User,
  FileText,
  Calendar,
  Heart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createDonor, createTissue } from '@/lib/api'

function DonorForm() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [createdDonor, setCreatedDonor] = useState<any>(null)
  
  // Donor form state
  const [age, setAge] = useState<number | undefined>()
  const [gender, setGender] = useState<string>('')
  const [tissueType, setTissueType] = useState('')
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  
  // Tissue form state
  const [tissueWeight, setTissueWeight] = useState<number | undefined>()
  const [tissueTypeText, setTissueTypeText] = useState('')
  const [passageYield, setPassageYield] = useState<number | undefined>()
  const [tissueNotes, setTissueNotes] = useState('')

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    
    try {
      // Create donor
      const donor = {
        age: age || null,
        gender: gender || null,
        tissue_type: tissueType,
        collection_date: collectionDate,
        notes: notes || null,
      }
      
      const createdDonorData = await createDonor(donor)
      setCreatedDonor(createdDonorData)
      
      // Create tissue if weight provided
      if (tissueWeight && tissueWeight > 0) {
        const tissue = {
          donor_id: createdDonorData.id,
          type: tissueTypeText || tissueType,
          weight_kg: tissueWeight,
          passage_yield: passageYield || null,
          notes: tissueNotes || null,
        }
        await createTissue(tissue)
      }
      
      setSuccess(true)
      setTimeout(() => router.push(`/donors/${createdDonorData.id}`), 2000)
    } catch (err: any) {
      setError(err.message || 'Ошибка создания донора')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="container py-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Донор создан</h2>
              <p className="text-muted-foreground">
                Донор {createdDonor?.code} успешно зарегистрирован
              </p>
              {tissueWeight && (
                <p className="text-sm text-muted-foreground mt-2">
                  Ткань также добавлена: {tissueWeight} кг
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/donors"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Новый донор</h1>
          <p className="text-muted-foreground">Регистрация донора биоматериала</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Donor Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Информация о донороре
              </CardTitle>
              <CardDescription>Основные данные донора</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="age">Возраст</Label>
                  <Input
                    id="age"
                    type="number"
                    min={0}
                    max={120}
                    placeholder="35"
                    value={age || ''}
                    onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gender">Пол</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Не указан" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Мужской</SelectItem>
                      <SelectItem value="F">Женский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="collectionDate">Дата забора</Label>
                  <Input
                    id="collectionDate"
                    type="date"
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tissueType">Тип ткани</Label>
                  <Select value={tissueType} onValueChange={setTissueType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Жировая ткань">Жировая ткань</SelectItem>
                      <SelectItem value="Хрящевая ткань">Хрящевая ткань</SelectItem>
                      <SelectItem value="Костная ткань">Костная ткань</SelectItem>
                      <SelectItem value="Мышечная ткань">Мышечная ткань</SelectItem>
                      <SelectItem value="Кровь">Кровь</SelectItem>
                      <SelectItem value="Другое">Другое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Примечания</Label>
                  <Input
                    id="notes"
                    placeholder="Дополнительная информация..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tissue Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Образец ткани
              </CardTitle>
              <CardDescription>Параметры полученного биоматериала (опционально)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tissueWeight">Вес ткани (кг)</Label>
                  <Input
                    id="tissueWeight"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.5"
                    value={tissueWeight || ''}
                    onChange={(e) => setTissueWeight(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tissueTypeText">Тип ткани (детализация)</Label>
                  <Input
                    id="tissueTypeText"
                    placeholder="Например: подкожная жировая"
                    value={tissueTypeText}
                    onChange={(e) => setTissueTypeText(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="passageYield">Выход при пассаже (%)</Label>
                  <Input
                    id="passageYield"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="85"
                    value={passageYield || ''}
                    onChange={(e) => setPassageYield(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tissueNotes">Примечания к ткани</Label>
                <Textarea
                  id="tissueNotes"
                  placeholder="Особенности образца, условия хранения..."
                  value={tissueNotes}
                  onChange={(e) => setTissueNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Сводка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Возраст</span>
                  <span className="font-medium">{age || 'Не указан'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Пол</span>
                  <Badge variant="outline">
                    {gender === 'M' ? 'Мужской' : gender === 'F' ? 'Женский' : 'Не указан'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Тип ткани</span>
                  <span className="font-medium">{tissueType || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Вес</span>
                  <span className="font-medium">{tissueWeight ? `${tissueWeight} кг` : 'Нет данных'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Дата забора</span>
                  <span className="font-medium">{collectionDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleSubmit} 
                disabled={!tissueType || submitting}
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Создание...</>
                ) : (
                  <><User className="mr-2 h-4 w-4" />Зарегистрировать донора</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Информация</AlertTitle>
            <AlertDescription>
              После регистрации донора можно будет создавать культуры и связывать их с донором.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="container py-6 flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function NewDonorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DonorForm />
    </Suspense>
  )
}
