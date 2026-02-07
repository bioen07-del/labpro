"use client"

import Link from "next/link"
import { ArrowLeft, ExternalLink, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function NewUserPage() {
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Создание пользователя
          </h1>
          <p className="text-muted-foreground">
            Управление аккаунтами через Supabase
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            Информация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed">
            Для создания пользователей используйте{" "}
            <strong>Supabase Dashboard</strong> &rarr;{" "}
            <strong>Authentication</strong> &rarr; <strong>Users</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            После создания аккаунта в Supabase, профиль пользователя
            автоматически появится в системе LabPro.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" asChild>
              <Link href="/users">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад к пользователям
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
