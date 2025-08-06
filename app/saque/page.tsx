"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Wallet, Clock, CheckCircle, XCircle, X } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { AuthClient } from "@/lib/auth-client"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

interface UserProfile {
  user: {
    id: number
    email: string
    name: string
  }
  wallet: {
    balance: string | number
  }
}

interface WithdrawHistory {
  id: number
  amount: number
  pix_key: string
  pix_type: string
  status: string
  created_at: string
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
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      )
    case "approved":
      return (
        <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aprovado
        </Badge>
      )
    case "rejected":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Rejeitado
        </Badge>
      )
    case "cancelled":
      return (
        <Badge variant="secondary" className="bg-gray-500/20 text-gray-300 border-gray-500/30">
          <X className="h-3 w-3 mr-1" />
          Cancelado
        </Badge>
      )
    default:
      return <Badge variant="secondary">Desconhecido</Badge>
  }
}

export default function SaquePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [systemSettings, setSystemSettings] = useState<{
    min_deposit: number
    max_deposit: number
    min_withdraw: number
    max_withdraw: number
  } | null>(null)

  // Form states
  const [amount, setAmount] = useState("")
  const [pixType, setPixType] = useState("")
  const [pixKey, setPixKey] = useState("")

  useEffect(() => {
    const token = AuthClient.getToken()
    if (!token) {
      window.location.href = "/auth"
      return
    }

    fetchUserProfile()
    fetchWithdrawHistory()
    fetchSystemSettings() // Adicione esta linha
  }, [])

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings")
      if (response.ok) {
        const data = await response.json()
        setSystemSettings(data.settings)
      } else {
        console.error("Failed to fetch system settings")
      }
    } catch (error) {
      console.error("Error fetching system settings:", error)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/user/profile")
      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
      } else if (response.status === 401) {
        window.location.href = "/auth"
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível carregar seu perfil.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar perfil.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchWithdrawHistory = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/saque/historico")
      if (response.ok) {
        const history = await response.json()
        setWithdrawHistory(history)
      }
    } catch (error) {
      console.error("Erro ao buscar histórico:", error)
    }
  }

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || !pixType || !pixKey) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      })
      return
    }

    const withdrawAmount = Number.parseFloat(amount.replace(",", "."))

    // Use o valor mínimo de saque das configurações
    const minWithdraw = systemSettings?.min_withdraw || 50 // Fallback para 50 se não carregado
    if (withdrawAmount < minWithdraw) {
      toast({
        title: "Erro",
        description: `Valor mínimo para saque é R$ ${formatCurrency(minWithdraw)}`,
        variant: "destructive",
      })
      return
    }

    const userBalance = Number.parseFloat(userProfile?.wallet.balance?.toString() || "0")
    if (withdrawAmount > userBalance) {
      toast({
        title: "Erro",
        description: "Saldo insuficiente",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/saque/solicitar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          pix_type: pixType,
          pix_key: pixKey,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Solicitação de saque enviada com sucesso!",
        })

        // Reset form
        setAmount("")
        setPixType("")
        setPixKey("")

        // Refresh data
        fetchUserProfile()
        fetchWithdrawHistory()
      } else {
        toast({
          title: "Erro",
          description: result.error || "Erro ao processar solicitação",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao solicitar saque:", error)
      toast({
        title: "Erro",
        description: "Erro interno do servidor",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelWithdraw = async (withdrawId: number) => {
    setCancelling(withdrawId)

    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/saque/cancelar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          withdraw_id: withdrawId,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Saque cancelado com sucesso! O valor foi devolvido à sua carteira.",
        })

        // Refresh data
        fetchUserProfile()
        fetchWithdrawHistory()
      } else {
        toast({
          title: "Erro",
          description: result.error || "Erro ao cancelar saque",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao cancelar saque:", error)
      toast({
        title: "Erro",
        description: "Erro interno do servidor",
        variant: "destructive",
      })
    } finally {
      setCancelling(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="bg-secondary/50 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center space-x-4">
          <Link href="/home">
            <Button variant="ghost" size="sm" className="hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Solicitar Saque</h1>
            <p className="text-gray-400 text-sm">Retire seus ganhos via PIX</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-24 md:pb-6">
        {/* Saldo Disponível */}
        <Card className="bg-secondary/50 backdrop-blur-sm border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Wallet className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-gray-400">Saldo Disponível</p>
                <p className="text-2xl font-bold text-primary">R$ {formatCurrency(userProfile?.wallet?.balance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de Saque */}
        <Card className="bg-secondary/50 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle>Nova Solicitação de Saque</CardTitle>
            <CardDescription>Preencha os dados para solicitar um saque via PIX</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWithdrawRequest} className="space-y-4">
              <div>
                <Label htmlFor="amount" className="text-white">
                  Valor (mínimo R$ {formatCurrency(systemSettings?.min_withdraw || 50)})
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={systemSettings?.min_withdraw || 50} // Use o valor mínimo dinâmico
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="bg-black/20 border-white/10 text-white focus:border-primary"
                  required
                />
              </div>

              <div>
                <Label htmlFor="pixType" className="text-white">
                  Tipo de Chave PIX
                </Label>
                <Select value={pixType} onValueChange={setPixType} required>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-primary">
                    <SelectValue placeholder="Selecione o tipo de chave" />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-white/10">
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pixKey" className="text-white">
                  Chave PIX
                </Label>
                <Input
                  id="pixKey"
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Digite sua chave PIX"
                  className="bg-black/20 border-white/10 text-white focus:border-primary"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary to-gold-600 text-primary-foreground font-bold"
              >
                {submitting ? "Processando..." : "Solicitar Saque"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Histórico de Saques */}
        <Card className="bg-secondary/50 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle>Histórico de Saques</CardTitle>
            <CardDescription>Suas solicitações de saque anteriores</CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhuma solicitação de saque encontrada</p>
            ) : (
              <div className="space-y-4">
                {withdrawHistory.map((withdraw) => (
                  <div key={withdraw.id} className="p-4 bg-black/20 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-lg">R$ {formatCurrency(withdraw.amount)}</p>
                        <p className="text-sm text-gray-400">{formatDate(withdraw.created_at)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(withdraw.status)}
                        {withdraw.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelWithdraw(withdraw.id)}
                            disabled={cancelling === withdraw.id}
                            className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                          >
                            {cancelling === withdraw.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Cancelando...
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3 mr-1" />
                                Cancelar
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      <p>
                        {withdraw.pix_type ? withdraw.pix_type.toUpperCase() : "N/A"}: {withdraw.pix_key || "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MobileBottomNav />
    </div>
  )
}
