"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, DollarSign, UserPlus, Wallet, Eye, EyeOff, Star, Crown } from "lucide-react"
import { AuthClient } from "@/lib/auth-client"
import { toast } from "@/hooks/use-toast"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

interface ManagerData {
  manager: {
    id: number
    manager_code: string
    commission_rate: number
    status: string
    created_at: string
  }
  stats: {
    total_agents: number
    total_affiliates: number
    converted_referrals: number
    referrals_last_30_days: number
    total_referred_deposits: number
    total_commission_earned: number
    total_commission_paid: number
    pending_commission: number
    available_balance: number
  }
  agents: Array<{
    id: number
    user_name: string
    user_email: string
    agent_code: string
    commission_rate: number
    total_affiliates: number
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

export default function GerentePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isManager, setIsManager] = useState(false)
  const [managerData, setManagerData] = useState<ManagerData | null>(null)

  // Estados para criar agente
  const [agentEmail, setAgentEmail] = useState("")
  const [createLoading, setCreateLoading] = useState(false)

  // Estados para saque
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [pixKey, setPixKey] = useState("")
  const [pixType, setPixType] = useState("cpf")
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [showPixKey, setShowPixKey] = useState(false)

  useEffect(() => {
    checkManagerStatus()
  }, [])

  const checkManagerStatus = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/manager/dashboard")

      if (response.ok) {
        const data = await response.json()
        setManagerData(data)
        setIsManager(true)
      } else if (response.status === 404) {
        setIsManager(false)
      } else {
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do gerente",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao verificar status de gerente:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createAgent = async () => {
    if (!agentEmail) {
      toast({
        title: "Erro",
        description: "Email é obrigatório",
        variant: "destructive",
      })
      return
    }

    try {
      setCreateLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/manager/create-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: agentEmail,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Agente vinculado com sucesso",
        })
        setAgentEmail("")
        await checkManagerStatus()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao vincular agente",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao vincular agente:", error)
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
    if (amount < 50) {
      toast({
        title: "Erro",
        description: "Valor mínimo para saque é R$ 50,00",
        variant: "destructive",
      })
      return
    }

    if (!managerData || amount > managerData.stats.available_balance) {
      toast({
        title: "Erro",
        description: "Saldo insuficiente",
        variant: "destructive",
      })
      return
    }

    try {
      setWithdrawLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/manager/withdraw", {
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
        await checkManagerStatus()
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

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20 text-center">
            <CardContent className="p-8">
              <Star className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-4">Acesso Restrito</h1>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Esta área é exclusiva para gerentes autorizados. Apenas administradores podem criar contas de gerente.
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

  if (!managerData) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Star className="h-8 w-8 text-purple-400" />
            Painel do Gerente
          </h1>
          <p className="text-gray-300">Gerencie sua rede de agentes e comissões</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total de Agentes</p>
                  <p className="text-2xl font-bold text-white">{managerData.stats.total_agents}</p>
                </div>
                <Crown className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total de Afiliados</p>
                  <p className="text-2xl font-bold text-white">{managerData.stats.total_affiliates}</p>
                </div>
                <Users className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Comissão Total</p>
                  <p className="text-2xl font-bold text-white">
                    R$ {formatCurrency(managerData.stats.total_commission_earned)}
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
                    R$ {formatCurrency(managerData.stats.available_balance)}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manager Info */}
        <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Informações do Gerente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>
                Código: <strong className="text-purple-400">{managerData.manager.manager_code}</strong>
              </span>
              <span>
                Comissão: <strong className="text-purple-400">{managerData.manager.commission_rate}%</strong>
              </span>
              <span>Status: {getStatusBadge(managerData.manager.status)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-purple-600">
              Agentes ({managerData.agents.length})
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-purple-600">
              Criar Agente
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="data-[state=active]:bg-purple-600">
              Sacar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Estatísticas da Rede</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Agentes Ativos</span>
                      <span className="text-white font-bold">{managerData.stats.total_agents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Afiliados na Rede</span>
                      <span className="text-white font-bold">{managerData.stats.total_affiliates}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Convertidos</span>
                      <span className="text-white font-bold">{managerData.stats.converted_referrals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Depositado</span>
                      <span className="text-white font-bold">
                        R$ {formatCurrency(managerData.stats.total_referred_deposits)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Comissão Pendente</span>
                      <span className="text-yellow-400 font-bold">
                        R$ {formatCurrency(managerData.stats.pending_commission)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Comissão Paga</span>
                      <span className="text-purple-400 font-bold">
                        R$ {formatCurrency(managerData.stats.total_commission_paid)}
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
                  {managerData.withdrawals.length > 0 ? (
                    <div className="space-y-3">
                      {managerData.withdrawals.slice(0, 5).map((withdrawal) => (
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

          <TabsContent value="agents">
            <Card className="bg-slate-900/50 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">Seus Agentes</CardTitle>
              </CardHeader>
              <CardContent>
                {managerData.agents.length > 0 ? (
                  <div className="space-y-4">
                    {managerData.agents.map((agent) => (
                      <div key={agent.id} className="bg-slate-800/50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-white font-medium">{agent.user_name}</p>
                            <p className="text-gray-400 text-sm">{agent.user_email}</p>
                          </div>
                          {getStatusBadge(agent.status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Código</p>
                            <p className="text-purple-400 font-mono">{agent.agent_code}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Comissão</p>
                            <p className="text-white">{agent.commission_rate}%</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Afiliados</p>
                            <p className="text-white">{agent.total_affiliates}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Ganhou</p>
                            <p className="text-purple-400 font-bold">
                              R$ {formatCurrency(agent.total_commission_earned)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Crown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhum agente ainda</p>
                    <p className="text-gray-500 text-sm mt-2">Crie seu primeiro agente na aba "Criar Agente"</p>
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
                  Vincular Usuário como Agente
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
                        value={agentEmail}
                        onChange={(e) => setAgentEmail(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="Digite o email do usuário cadastrado"
                      />
                    </div>

                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-400 font-medium">Taxa de Comissão Fixa</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Todos os agentes são criados com <strong className="text-blue-400">10% de comissão</strong>.
                        Apenas administradores podem alterar essa taxa posteriormente.
                      </p>
                    </div>

                    <Button
                      onClick={createAgent}
                      disabled={createLoading || !agentEmail}
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold"
                    >
                      {createLoading ? "Vinculando..." : "Vincular como Agente (10%)"}
                    </Button>
                  </div>

                  <div className="bg-slate-800/30 rounded-lg p-6">
                    <h4 className="text-purple-400 font-bold mb-4">Como Funciona</h4>
                    <ul className="text-gray-300 text-sm space-y-2">
                      <li>• O usuário deve estar cadastrado no sistema</li>
                      <li>• Agentes podem criar e gerenciar afiliados</li>
                      <li>• Agentes são criados com 10% de comissão fixo</li>
                      <li>• Apenas admins podem alterar a taxa depois</li>
                      <li>• Você receberá {managerData?.manager.commission_rate || 5}% como gerente</li>
                      <li>• O agente poderá acessar seu painel em /agente</li>
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
                      Valor (mínimo R$ 50,00)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      min="50"
                      max={managerData.stats.available_balance}
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="0,00"
                    />
                    <p className="text-gray-400 text-sm mt-1">
                      Saldo disponível: R$ {formatCurrency(managerData.stats.available_balance)}
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
                    disabled={withdrawLoading || !withdrawAmount || !pixKey || Number.parseFloat(withdrawAmount) < 50}
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
                      <li>• Você ganha {managerData.manager.commission_rate}% de comissão em todos os depósitos</li>
                      <li>• Comissões são creditadas automaticamente</li>
                      <li>• Valor mínimo para saque: R$ 50,00</li>
                      <li>• Saques processados em até 24h úteis</li>
                    </ul>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-yellow-400 font-bold mb-2">Dicas para Aumentar Ganhos</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Recrute agentes qualificados</li>
                      <li>• Treine seus agentes</li>
                      <li>• Monitore a performance da rede</li>
                      <li>• Incentive a criação de afiliados</li>
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
