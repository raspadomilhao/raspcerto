"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, DollarSign, UserPlus, Wallet, CheckCircle, Eye, EyeOff, Crown } from "lucide-react"
import { AuthClient } from "@/lib/auth-client"
import { toast } from "@/hooks/use-toast"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

interface AgentData {
  agent: {
    id: number
    agent_code: string
    commission_rate: number
    status: string
    created_at: string
  }
  stats: {
    total_affiliates: number
    converted_referrals: number
    referrals_last_30_days: number
    total_referred_deposits: number
    total_commission_earned: number
    total_commission_paid: number
    pending_commission: number
    available_balance: number
  }
  affiliates: Array<{
    id: number
    user_name: string
    user_email: string
    affiliate_code: string
    commission_rate: number
    total_referrals: number
    total_commission_earned: number
    status: string
    created_at: string
  }>
  commissions: Array<{
    id: number
    commission_amount: number
    commission_rate: number
    status: string
    created_at: string
  }>
  withdrawals: Array<{
    id: number
    amount: number
    pix_key: string
    pix_type: string
    status: string
    created_at: string
  }>
}

const formatCurrency = (value: string | number): string => {
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue) ? "0,00" : numValue.toFixed(2)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-BR")
}

const getStatusBadge = (status: string) => {
  const statusMap = {
    pending: { label: "Pendente", variant: "secondary" as const },
    active: { label: "Ativo", variant: "default" as const },
    completed: { label: "Concluído", variant: "default" as const },
    processing: { label: "Processando", variant: "secondary" as const },
    cancelled: { label: "Cancelado", variant: "destructive" as const },
    paid: { label: "Pago", variant: "default" as const },
  }

  const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export default function AgentePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAgent, setIsAgent] = useState(false)
  const [agentData, setAgentData] = useState<AgentData | null>(null)

  // Estados para criar afiliado
  const [affiliateEmail, setAffiliateEmail] = useState("")
  const [createLoading, setCreateLoading] = useState(false)

  // Estados para saque
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [pixKey, setPixKey] = useState("")
  const [pixType, setPixType] = useState("cpf")
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [showPixKey, setShowPixKey] = useState(false)

  useEffect(() => {
    checkAgentStatus()
  }, [])

  const checkAgentStatus = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/agent/dashboard")

      if (response.ok) {
        const data = await response.json()
        setAgentData(data)
        setIsAgent(true)
      } else if (response.status === 404) {
        setIsAgent(false)
      } else {
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do agente",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao verificar status de agente:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createAffiliate = async () => {
    if (!affiliateEmail) {
      toast({
        title: "Erro",
        description: "Email é obrigatório",
        variant: "destructive",
      })
      return
    }

    try {
      setCreateLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/agent/create-affiliate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: affiliateEmail,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Afiliado vinculado com sucesso",
        })
        setAffiliateEmail("")
        await checkAgentStatus()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao vincular afiliado",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao vincular afiliado:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || !pixKey) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(withdrawAmount)
    if (amount < 10) {
      // Alterado de 50 para 10
      toast({
        title: "Erro",
        description: "Valor mínimo para saque é R$ 10,00", // Alterado de 50,00 para 10,00
        variant: "destructive",
      })
      return
    }

    if (!agentData || amount > agentData.stats.available_balance) {
      toast({
        title: "Erro",
        description: "Saldo insuficiente",
        variant: "destructive",
      })
      return
    }

    try {
      setWithdrawLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/agent/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          pix_key: pixKey,
          pix_type: pixType,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Solicitação de saque enviada com sucesso",
        })
        setWithdrawAmount("")
        setPixKey("")
        await checkAgentStatus()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao solicitar saque",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao solicitar saque:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setWithdrawLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAgent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20 text-center">
            <CardContent className="p-8">
              <Crown className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-4">Acesso Restrito</h1>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Esta área é exclusiva para agentes autorizados. Apenas administradores podem criar contas de agente.
              </p>
              <Button
                onClick={() => router.push("/home")}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold px-8 py-3 text-lg"
              >
                Voltar ao Início
              </Button>
            </CardContent>
          </Card>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  if (!agentData) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Crown className="h-8 w-8 text-purple-400" />
            Painel do Agente
          </h1>
          <p className="text-gray-300">Gerencie sua rede de afiliados e comissões</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total de Afiliados</p>
                  <p className="text-2xl font-bold text-white">{agentData.stats.total_affiliates}</p>
                </div>
                <Users className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Convertidos</p>
                  <p className="text-2xl font-bold text-white">{agentData.stats.converted_referrals}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Comissão Total</p>
                  <p className="text-2xl font-bold text-white">
                    R$ {formatCurrency(agentData.stats.total_commission_earned)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Saldo Disponível</p>
                  <p className="text-2xl font-bold text-purple-400">
                    R$ {formatCurrency(agentData.stats.available_balance)}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Info */}
        <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Informações do Agente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>
                Código: <strong className="text-purple-400">{agentData.agent.agent_code}</strong>
              </span>
              <span>
                Comissão: <strong className="text-purple-400">{agentData.agent.commission_rate}%</strong>
              </span>
              <span>Status: {getStatusBadge(agentData.agent.status)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="data-[state=active]:bg-purple-600">
              Afiliados ({agentData.affiliates.length})
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-purple-600">
              Criar Afiliado
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="data-[state=active]:bg-purple-600">
              Sacar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Estatísticas do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Afiliados (30 dias)</span>
                      <span className="text-white font-bold">{agentData.stats.referrals_last_30_days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Depositado</span>
                      <span className="text-white font-bold">
                        R$ {formatCurrency(agentData.stats.total_referred_deposits)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Comissão Pendente</span>
                      <span className="text-yellow-400 font-bold">
                        R$ {formatCurrency(agentData.stats.pending_commission)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Comissão Paga</span>
                      <span className="text-purple-400 font-bold">
                        R$ {formatCurrency(agentData.stats.total_commission_paid)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Histórico de Saques</CardTitle>
                </CardHeader>
                <CardContent>
                  {agentData.withdrawals.length > 0 ? (
                    <div className="space-y-3">
                      {agentData.withdrawals.slice(0, 5).map((withdrawal) => (
                        <div key={withdrawal.id} className="flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">R$ {formatCurrency(withdrawal.amount)}</p>
                            <p className="text-gray-400 text-sm">{formatDate(withdrawal.created_at)}</p>
                          </div>
                          {getStatusBadge(withdrawal.status)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">Nenhum saque realizado ainda</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="affiliates">
            <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">Seus Afiliados</CardTitle>
              </CardHeader>
              <CardContent>
                {agentData.affiliates.length > 0 ? (
                  <div className="space-y-4">
                    {agentData.affiliates.map((affiliate) => (
                      <div key={affiliate.id} className="bg-slate-800/50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-white font-medium">{affiliate.user_name}</p>
                            <p className="text-gray-400 text-sm">{affiliate.user_email}</p>
                          </div>
                          {getStatusBadge(affiliate.status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Código</p>
                            <p className="text-purple-400 font-mono">{affiliate.affiliate_code}</p>
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
                            <p className="text-purple-400 font-bold">
                              R$ {formatCurrency(affiliate.total_commission_earned)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhum afiliado ainda</p>
                    <p className="text-gray-500 text-sm mt-2">Crie seu primeiro afiliado na aba "Criar Afiliado"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Vincular Usuário como Afiliado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-gray-300">
                        Email do Usuário
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={affiliateEmail}
                        onChange={(e) => setAffiliateEmail(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="Digite o email do usuário cadastrado"
                      />
                    </div>

                    <div className="bg-slate-800/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Taxa de Comissão:</span>
                        <span className="text-purple-400 font-bold text-lg">50%</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">Taxa padrão para todos os afiliados</p>
                    </div>

                    <Button
                      onClick={createAffiliate}
                      disabled={createLoading || !affiliateEmail}
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold"
                    >
                      {createLoading ? "Vinculando..." : "Vincular como Afiliado"}
                    </Button>
                  </div>

                  <div className="bg-slate-800/30 rounded-lg p-6">
                    <h4 className="text-purple-400 font-bold mb-4">Como Funciona</h4>
                    <ul className="text-gray-300 text-sm space-y-2">
                      <li>• O usuário deve estar cadastrado no sistema</li>
                      <li>• Todos os afiliados começam com 50% de comissão</li>
                      <li>• Você receberá {agentData?.agent.commission_rate || 10}% como agente</li>
                      <li>• O admin pode ajustar a taxa depois se necessário</li>
                      <li>• O afiliado poderá acessar seu painel em /afiliado</li>
                    </ul>

                    <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-400 text-sm font-medium">💡 Dica</p>
                      <p className="text-gray-300 text-sm mt-1">
                        Peça para a pessoa se cadastrar primeiro no site, depois use o email dela aqui.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Solicitar Saque</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="amount" className="text-gray-300">
                      Valor (mínimo R$ 10,00) {/* Alterado de 50,00 para 10,00 */}
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      min="10" // Alterado de 50 para 10
                      max={agentData.stats.available_balance}
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="0,00"
                    />
                    <p className="text-gray-400 text-sm mt-1">
                      Saldo disponível: R$ {formatCurrency(agentData.stats.available_balance)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="pixType" className="text-gray-300">
                      Tipo de Chave PIX
                    </Label>
                    <select
                      id="pixType"
                      value={pixType}
                      onChange={(e) => setPixType(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2"
                    >
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Chave Aleatória</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="pixKey" className="text-gray-300">
                      Chave PIX
                    </Label>
                    <div className="relative">
                      <Input
                        id="pixKey"
                        type={showPixKey ? "text" : "password"}
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white pr-10"
                        placeholder="Digite sua chave PIX"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                        onClick={() => setShowPixKey(!showPixKey)}
                      >
                        {showPixKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleWithdraw}
                    disabled={withdrawLoading || !withdrawAmount || !pixKey || Number.parseFloat(withdrawAmount) < 10} // Alterado de 50 para 10
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold"
                  >
                    {withdrawLoading ? "Processando..." : "Solicitar Saque"}
                  </Button>

                  <p className="text-gray-400 text-sm">Os saques são processados em até 24 horas úteis.</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Informações Importantes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-purple-400 font-bold mb-2">Como Funciona</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Você ganha {agentData.agent.commission_rate}% de comissão em todos os depósitos</li>
                      <li>• Comissões são creditadas automaticamente</li>
                      <li>• Valor mínimo para saque: R$ 50,00</li>
                      <li>• Saques processados em até 24h úteis</li>
                    </ul>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-yellow-400 font-bold mb-2">Dicas para Aumentar Ganhos</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Recrute afiliados qualificados</li>
                      <li>• Treine seus afiliados</li>
                      <li>• Monitore a performance da rede</li>
                      <li>• Incentive a conversão de indicados</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <MobileBottomNav />
    </div>
  )
}
