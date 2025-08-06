"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, EyeOff, CheckCircle, XCircle, Clock, Users, DollarSign, TrendingUp } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface WithdrawRequest {
  id: number
  user_id: number
  user_name: string
  user_email: string
  amount: number
  pix_key: string
  pix_type: string
  status: string
  created_at: string
}

interface AdminStats {
  total_requests: number
  pending_requests: number
  total_amount: number
  pending_amount: number
}

const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return "0,00"
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue) ? "0,00" : numValue.toFixed(2).replace(".", ",")
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString("pt-BR")
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      )
    case "approved":
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aprovado
        </Badge>
      )
    case "rejected":
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Rejeitado
        </Badge>
      )
    default:
      return <Badge variant="secondary">Desconhecido</Badge>
  }
}

export default function SaqueAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([])
  const [stats, setStats] = useState<AdminStats>({
    total_requests: 0,
    pending_requests: 0,
    total_amount: 0,
    pending_amount: 0,
  })
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<number | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      fetchWithdrawRequests()
    }
  }, [isAuthenticated])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/saqueadmin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      })

      const result = await response.json()

      if (response.ok) {
        setIsAuthenticated(true)
        toast({
          title: "Sucesso",
          description: "Login realizado com sucesso!",
        })
      } else {
        toast({
          title: "Erro",
          description: result.error || "Senha inválida",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro no login:", error)
      toast({
        title: "Erro",
        description: "Erro interno do servidor",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchWithdrawRequests = async () => {
    try {
      setLoading(true)
      console.log("🔄 Buscando solicitações de saque...")

      const response = await fetch("/api/saqueadmin/listar")

      if (response.ok) {
        const data = await response.json()
        console.log("📊 Dados recebidos:", data)

        setWithdrawRequests(data.requests || [])
        setStats(
          data.stats || {
            total_requests: 0,
            pending_requests: 0,
            total_amount: 0,
            pending_amount: 0,
          },
        )
      } else {
        const errorData = await response.json()
        console.error("❌ Erro na resposta:", errorData)
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao carregar solicitações",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao buscar solicitações:", error)
      toast({
        title: "Erro",
        description: "Erro interno do servidor",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleProcessRequest = async (requestId: number, action: "approve" | "reject") => {
    console.log("🔄 Processando solicitação:", { requestId, action })
    setProcessing(requestId)

    try {
      const response = await fetch("/api/saqueadmin/processar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: requestId,
          action,
        }),
      })

      const result = await response.json()
      console.log("📊 Resposta da API:", result)

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: `Solicitação ${action === "approve" ? "aprovada" : "rejeitada"} com sucesso!`,
        })
        // Recarregar a lista após processar
        await fetchWithdrawRequests()
      } else {
        console.error("❌ Erro na resposta:", result)
        toast({
          title: "Erro",
          description: result.error || "Erro ao processar solicitação",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao processar solicitação:", error)
      toast({
        title: "Erro",
        description: "Erro interno do servidor",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Administração de Saques</CardTitle>
            <CardDescription className="text-gray-400">Faça login para acessar o painel administrativo</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-white">
                  Senha de Acesso
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha de acesso"
                    className="bg-gray-800 border-gray-700 text-white pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Administração de Saques</h1>
            <p className="text-gray-400 text-sm">Gerencie as solicitações de saque dos usuários</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsAuthenticated(false)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Sair
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Users className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-400">Total de Solicitações</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.total_requests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Clock className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-sm text-gray-400">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending_requests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <DollarSign className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Valor Total</p>
                  <p className="text-2xl font-bold text-green-400">R$ {formatCurrency(stats.total_amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <TrendingUp className="h-8 w-8 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Valor Pendente</p>
                  <p className="text-2xl font-bold text-orange-400">R$ {formatCurrency(stats.pending_amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Solicitações */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Solicitações de Saque</CardTitle>
              <CardDescription>Gerencie as solicitações de saque dos usuários</CardDescription>
            </div>
            <Button onClick={fetchWithdrawRequests} disabled={loading} variant="outline">
              {loading ? "Carregando..." : "Atualizar"}
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-400 text-center py-8">Carregando solicitações...</p>
            ) : withdrawRequests.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhuma solicitação de saque encontrada</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-300">ID</TableHead>
                      <TableHead className="text-gray-300">Usuário</TableHead>
                      <TableHead className="text-gray-300">Valor</TableHead>
                      <TableHead className="text-gray-300">Chave PIX</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Data</TableHead>
                      <TableHead className="text-gray-300">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawRequests.map((request) => (
                      <TableRow key={request.id} className="border-gray-800">
                        <TableCell className="text-white">#{request.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-white font-medium">{request.user_name}</p>
                            <p className="text-gray-400 text-sm">{request.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-medium">R$ {formatCurrency(request.amount)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-white">{request.pix_key}</p>
                            <p className="text-gray-400 text-sm">{request.pix_type?.toUpperCase()}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-gray-400">{formatDate(request.created_at)}</TableCell>
                        <TableCell>
                          {request.status === "pending" ? (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleProcessRequest(request.id, "approve")}
                                disabled={processing === request.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {processing === request.id ? "..." : "Aprovar"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleProcessRequest(request.id, "reject")}
                                disabled={processing === request.id}
                              >
                                {processing === request.id ? "..." : "Rejeitar"}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Processado</span>
                          )}
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
    </div>
  )
}
