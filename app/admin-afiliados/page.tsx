"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, DollarSign, Settings, CheckCircle, Clock, XCircle } from "lucide-react"
import { AuthClient } from "@/lib/auth-client"
import { toast } from "@/hooks/use-toast"

interface Affiliate {
  id: number
  user_id: number
  affiliate_code: string
  commission_rate: number
  total_referrals: number
  total_commission_earned: number
  total_commission_paid: number
  status: string
  created_at: string
  user_name: string
  user_email: string
}

interface WithdrawalRequest {
  id: number
  affiliate_id: number
  amount: number
  pix_key: string
  pix_type: string
  status: string
  created_at: string
  affiliate_name: string
  affiliate_email: string
  affiliate_code: string
}

const formatCurrency = (value: string | number): string => {
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue) ? "0,00" : numValue.toFixed(2)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const getStatusBadge = (status: string) => {
  const statusMap = {
    pending: { label: "Pendente", variant: "secondary" as const, icon: Clock },
    processing: { label: "Processando", variant: "default" as const, icon: Settings },
    completed: { label: "Concluído", variant: "default" as const, icon: CheckCircle },
    cancelled: { label: "Cancelado", variant: "destructive" as const, icon: XCircle },
    active: { label: "Ativo", variant: "default" as const, icon: CheckCircle },
  }

  const config = statusMap[status as keyof typeof statusMap] || {
    label: status,
    variant: "secondary" as const,
    icon: Clock,
  }

  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

export default function AdminAffiliatesPage() {
  const [loading, setLoading] = useState(true)
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null)
  const [newCommissionRate, setNewCommissionRate] = useState("")
  const [updateLoading, setUpdateLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAffiliatesData()
  }, [])

  const fetchAffiliatesData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Buscando dados dos afiliados...")

      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/affiliates")

      console.log("📡 Resposta da API:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("📊 Dados recebidos:", data)

        setAffiliates(data.affiliates || [])
        setWithdrawals(data.pending_withdrawals || [])

        console.log("✅ Dados carregados:", {
          affiliates: data.affiliates?.length || 0,
          withdrawals: data.pending_withdrawals?.length || 0,
        })
      } else {
        const errorData = await response.json()
        console.error("❌ Erro da API:", errorData)
        setError(errorData.error || "Erro ao carregar dados")
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao carregar dados dos afiliados",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao buscar afiliados:", error)
      setError("Erro de conexão")
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateCommissionRate = async () => {
    if (!selectedAffiliate || !newCommissionRate) return

    try {
      setUpdateLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/affiliates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          affiliate_id: selectedAffiliate.id,
          commission_rate: Number.parseFloat(newCommissionRate),
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Taxa de comissão atualizada com sucesso",
        })
        setSelectedAffiliate(null)
        setNewCommissionRate("")
        await fetchAffiliatesData()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao atualizar taxa",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao atualizar taxa:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setUpdateLoading(false)
    }
  }

  const processWithdrawal = async (withdrawalId: number, status: string, notes?: string) => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest(`/api/admin/affiliates/withdrawals/${withdrawalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, notes }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Status do saque atualizado com sucesso",
        })
        await fetchAffiliatesData()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao processar saque",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao processar saque:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-white">Carregando dados dos afiliados...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erro ao carregar dados</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <Button
            onClick={fetchAffiliatesData}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  const totalAffiliates = affiliates.length
  const totalCommissionEarned = affiliates.reduce((sum, aff) => sum + Number(aff.total_commission_earned || 0), 0)
  const totalCommissionPaid = affiliates.reduce((sum, aff) => sum + Number(aff.total_commission_paid || 0), 0)
  const pendingCommission = totalCommissionEarned - totalCommissionPaid

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Gerenciar Afiliados</h1>
          <p className="text-gray-300">Administre o programa de afiliados</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total de Afiliados</p>
                  <p className="text-2xl font-bold text-white">{totalAffiliates}</p>
                </div>
                <Users className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Comissão Total</p>
                  <p className="text-2xl font-bold text-white">R$ {formatCurrency(totalCommissionEarned)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Comissão Paga</p>
                  <p className="text-2xl font-bold text-green-400">R$ {formatCurrency(totalCommissionPaid)}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pendente</p>
                  <p className="text-2xl font-bold text-yellow-400">R$ {formatCurrency(pendingCommission)}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="affiliates" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="affiliates" className="data-[state=active]:bg-green-600">
              Afiliados ({totalAffiliates})
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="data-[state=active]:bg-green-600">
              Saques Pendentes ({withdrawals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="affiliates">
            <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
              <CardHeader>
                <CardTitle className="text-white">Lista de Afiliados</CardTitle>
              </CardHeader>
              <CardContent>
                {affiliates.length > 0 ? (
                  <div className="space-y-4">
                    {affiliates.map((affiliate) => (
                      <div key={affiliate.id} className="bg-slate-800/50 rounded-lg p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-white font-bold">{affiliate.user_name}</h3>
                              {getStatusBadge(affiliate.status)}
                            </div>
                            <p className="text-gray-400 text-sm mb-2">{affiliate.user_email}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-400">Código</p>
                                <p className="text-green-400 font-mono">{affiliate.affiliate_code}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Comissão</p>
                                <p className="text-white">{affiliate.commission_rate}%</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Indicações</p>
                                <p className="text-white">{affiliate.total_referrals}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Ganhou</p>
                                <p className="text-green-400">R$ {formatCurrency(affiliate.total_commission_earned)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setSelectedAffiliate(affiliate)
                                setNewCommissionRate(affiliate.commission_rate.toString())
                              }}
                              variant="outline"
                              size="sm"
                              className="border-green-400 text-green-400 hover:bg-green-400 hover:text-white"
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Editar Taxa
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhum afiliado cadastrado ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
              <CardHeader>
                <CardTitle className="text-white">Solicitações de Saque</CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawals.length > 0 ? (
                  <div className="space-y-4">
                    {withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="bg-slate-800/50 rounded-lg p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-white font-bold">{withdrawal.affiliate_name}</h3>
                              {getStatusBadge(withdrawal.status)}
                            </div>
                            <p className="text-gray-400 text-sm mb-2">{withdrawal.affiliate_email}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-400">Valor</p>
                                <p className="text-green-400 font-bold">R$ {formatCurrency(withdrawal.amount)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Chave PIX</p>
                                <p className="text-white font-mono">{withdrawal.pix_key}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Tipo</p>
                                <p className="text-white uppercase">{withdrawal.pix_type}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Solicitado em</p>
                                <p className="text-white">{formatDate(withdrawal.created_at)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => processWithdrawal(withdrawal.id, "processing")}
                              variant="outline"
                              size="sm"
                              className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Processar
                            </Button>
                            <Button
                              onClick={() => processWithdrawal(withdrawal.id, "completed")}
                              variant="outline"
                              size="sm"
                              className="border-green-400 text-green-400 hover:bg-green-400 hover:text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Concluir
                            </Button>
                            <Button
                              onClick={() =>
                                processWithdrawal(withdrawal.id, "cancelled", "Cancelado pelo administrador")
                              }
                              variant="outline"
                              size="sm"
                              className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhuma solicitação de saque pendente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal para editar taxa de comissão */}
        {selectedAffiliate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-slate-900 border-green-500/20 w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-white">Editar Taxa de Comissão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-gray-300 mb-2">
                    Afiliado: <strong>{selectedAffiliate.user_name}</strong>
                  </p>
                  <p className="text-gray-400 text-sm mb-4">Taxa atual: {selectedAffiliate.commission_rate}%</p>
                </div>

                <div>
                  <Label htmlFor="newRate" className="text-gray-300">
                    Nova Taxa (%)
                  </Label>
                  <Input
                    id="newRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Ex: 15.5"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={updateCommissionRate}
                    disabled={updateLoading || !newCommissionRate}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  >
                    {updateLoading ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedAffiliate(null)
                      setNewCommissionRate("")
                    }}
                    variant="outline"
                    className="flex-1 border-gray-400 text-gray-400 hover:bg-gray-400 hover:text-white"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
