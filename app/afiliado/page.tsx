"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, DollarSign, TrendingUp, Copy, Share2, Wallet, CheckCircle, Eye, EyeOff } from "lucide-react"
import { AuthClient } from "@/lib/auth-client"
import { toast } from "@/hooks/use-toast"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

interface AffiliateData {
  affiliate: {
    id: number
    affiliate_code: string
    commission_rate: number
    status: string
    created_at: string
  }
  stats: {
    total_referrals: number
    converted_referrals: number
    referrals_last_30_days: number
    total_referred_deposits: number
    total_commission_earned: number
    total_commission_paid: number
    pending_commission: number
    available_balance: number
  }
  referrals: Array<{
    id: number
    user_name: string
    user_email: string
    status: string
    first_deposit_amount: number
    total_deposits: number
    commission_earned: number
    created_at: string
    conversion_date?: string
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
    converted: { label: "Convertido", variant: "default" as const },
    active: { label: "Ativo", variant: "default" as const },
    completed: { label: "Concluído", variant: "default" as const },
    processing: { label: "Processando", variant: "secondary" as const },
    cancelled: { label: "Cancelado", variant: "destructive" as const },
    paid: { label: "Pago", variant: "default" as const },
  }

  const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export default function AffiliatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAffiliate, setIsAffiliate] = useState(false)
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [pixKey, setPixKey] = useState("")
  const [pixType, setPixType] = useState("cpf")
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [showPixKey, setShowPixKey] = useState(false)

  useEffect(() => {
    checkAffiliateStatus()
  }, [])

  const checkAffiliateStatus = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/affiliate/dashboard")

      if (response.ok) {
        const data = await response.json()
        setAffiliateData(data)
        setIsAffiliate(true)
      } else if (response.status === 404) {
        setIsAffiliate(false)
      } else {
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do afiliado",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao verificar status de afiliado:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const becomeAffiliate = async () => {
    try {
      setLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/affiliate/become", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Você agora é um afiliado! Comece a divulgar seu link.",
        })
        await checkAffiliateStatus()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao se tornar afiliado",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao se tornar afiliado:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyAffiliateLink = () => {
    if (!affiliateData) return

    const link = `${window.location.origin}/auth?ref=${affiliateData.affiliate.affiliate_code}`
    navigator.clipboard.writeText(link)
    toast({
      title: "Link copiado!",
      description: "Link de afiliado copiado para a área de transferência",
    })
  }

  const shareAffiliateLink = async () => {
    if (!affiliateData) return

    const link = `${window.location.origin}/auth?ref=${affiliateData.affiliate.affiliate_code}`
    const text = `Venha jogar no RaspCerto e ganhar prêmios incríveis! Use meu link: ${link}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "RaspCerto - Jogos de Raspadinha",
          text: text,
          url: link,
        })
      } catch (error) {
        // Fallback para copiar
        navigator.clipboard.writeText(text)
        toast({
          title: "Link copiado!",
          description: "Link de afiliado copiado para a área de transferência",
        })
      }
    } else {
      navigator.clipboard.writeText(text)
      toast({
        title: "Link copiado!",
        description: "Link de afiliado copiado para a área de transferência",
      })
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
      toast({
        title: "Erro",
        description: "Valor mínimo para saque é R$ 10,00",
        variant: "destructive",
      })
      return
    }

    if (!affiliateData || amount > affiliateData.stats.available_balance) {
      toast({
        title: "Erro",
        description: "Saldo insuficiente",
        variant: "destructive",
      })
      return
    }

    try {
      setWithdrawLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/affiliate/withdraw", {
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
        await checkAffiliateStatus()
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAffiliate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20 text-center">
            <CardContent className="p-8">
              <Users className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-4">Torne-se um Afiliado</h1>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Ganhe comissões indicando novos jogadores para o RaspCerto! Receba uma porcentagem de todos os depósitos
                dos usuários que você indicar.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <DollarSign className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <h3 className="text-white font-bold mb-1">Comissões Altas</h3>
                  <p className="text-gray-400 text-sm">Ganhe até 50% de comissão em todos os depósitos</p>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <h3 className="text-white font-bold mb-1">Renda Passiva</h3>
                  <p className="text-gray-400 text-sm">Ganhe comissões recorrentes de seus indicados</p>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <Share2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <h3 className="text-white font-bold mb-1">Fácil Divulgação</h3>
                  <p className="text-gray-400 text-sm">Link personalizado e ferramentas de marketing</p>
                </div>
              </div>

              <Button
                onClick={becomeAffiliate}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold px-8 py-3 text-lg"
                disabled={loading}
              >
                {loading ? "Processando..." : "Tornar-se Afiliado"}
              </Button>
            </CardContent>
          </Card>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  if (!affiliateData) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Painel do Afiliado</h1>
          <p className="text-gray-300">Gerencie suas indicações e comissões</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total de Indicações</p>
                  <p className="text-2xl font-bold text-white">{affiliateData.stats.total_referrals}</p>
                </div>
                <Users className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Convertidos</p>
                  <p className="text-2xl font-bold text-white">{affiliateData.stats.converted_referrals}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Comissão Total</p>
                  <p className="text-2xl font-bold text-white">
                    R$ {formatCurrency(affiliateData.stats.total_commission_earned)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Saldo Disponível</p>
                  <p className="text-2xl font-bold text-green-400">
                    R$ {formatCurrency(affiliateData.stats.available_balance)}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Affiliate Link */}
        <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Seu Link de Afiliado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/auth?ref=${affiliateData.affiliate.affiliate_code}`}
                  readOnly
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={copyAffiliateLink}
                  variant="outline"
                  className="border-green-400 text-green-400 hover:bg-green-400 hover:text-white bg-transparent"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button
                  onClick={shareAffiliateLink}
                  variant="outline"
                  className="border-green-400 text-green-400 hover:bg-green-400 hover:text-white bg-transparent"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
              <span>
                Código: <strong className="text-green-400">{affiliateData.affiliate.affiliate_code}</strong>
              </span>
              <span>
                Comissão: <strong className="text-green-400">{affiliateData.affiliate.commission_rate}%</strong>
              </span>
              <span>Status: {getStatusBadge(affiliateData.affiliate.status)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-green-600">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:bg-green-600">
              Indicações
            </TabsTrigger>
            <TabsTrigger value="commissions" className="data-[state=active]:bg-green-600">
              Comissões
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="data-[state=active]:bg-green-600">
              Sacar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Estatísticas do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Indicações (30 dias)</span>
                      <span className="text-white font-bold">{affiliateData.stats.referrals_last_30_days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Depositado</span>
                      <span className="text-white font-bold">
                        R$ {formatCurrency(affiliateData.stats.total_referred_deposits)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Comissão Pendente</span>
                      <span className="text-yellow-400 font-bold">
                        R$ {formatCurrency(affiliateData.stats.pending_commission)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Comissão Paga</span>
                      <span className="text-green-400 font-bold">
                        R$ {formatCurrency(affiliateData.stats.total_commission_paid)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Histórico de Saques</CardTitle>
                </CardHeader>
                <CardContent>
                  {affiliateData.withdrawals.length > 0 ? (
                    <div className="space-y-3">
                      {affiliateData.withdrawals.slice(0, 5).map((withdrawal) => (
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

          <TabsContent value="referrals">
            <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
              <CardHeader>
                <CardTitle className="text-white">Suas Indicações</CardTitle>
              </CardHeader>
              <CardContent>
                {affiliateData.referrals.length > 0 ? (
                  <div className="space-y-4">
                    {affiliateData.referrals.map((referral) => (
                      <div key={referral.id} className="bg-slate-800/50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-white font-medium">{referral.user_name}</p>
                            <p className="text-gray-400 text-sm">{referral.user_email}</p>
                          </div>
                          {getStatusBadge(referral.status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Cadastro</p>
                            <p className="text-white">{formatDate(referral.created_at)}</p>
                          </div>
                          {referral.conversion_date && (
                            <div>
                              <p className="text-gray-400">Conversão</p>
                              <p className="text-white">{formatDate(referral.conversion_date)}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-400">Total Depositado</p>
                            <p className="text-white">R$ {formatCurrency(referral.total_deposits)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Sua Comissão</p>
                            <p className="text-green-400 font-bold">R$ {formatCurrency(referral.commission_earned)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhuma indicação ainda</p>
                    <p className="text-gray-500 text-sm mt-2">Compartilhe seu link para começar a ganhar comissões</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions">
            <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
              <CardHeader>
                <CardTitle className="text-white">Histórico de Comissões</CardTitle>
              </CardHeader>
              <CardContent>
                {affiliateData.commissions.length > 0 ? (
                  <div className="space-y-4">
                    {affiliateData.commissions.map((commission) => (
                      <div key={commission.id} className="bg-slate-800/50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-green-400 font-bold">
                              R$ {formatCurrency(commission.commission_amount)}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {commission.commission_rate}% de comissão • {formatDate(commission.created_at)}
                            </p>
                          </div>
                          {getStatusBadge(commission.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhuma comissão ainda</p>
                    <p className="text-gray-500 text-sm mt-2">
                      As comissões aparecerão quando seus indicados fizerem depósitos
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Solicitar Saque</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="amount" className="text-gray-300">
                      Valor (mínimo R$ 10,00)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      min="10"
                      max={affiliateData.stats.available_balance}
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="0,00"
                    />
                    <p className="text-gray-400 text-sm mt-1">
                      Saldo disponível: R$ {formatCurrency(affiliateData.stats.available_balance)}
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
                    disabled={withdrawLoading || !withdrawAmount || !pixKey || Number.parseFloat(withdrawAmount) < 10}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold"
                  >
                    {withdrawLoading ? "Processando..." : "Solicitar Saque"}
                  </Button>

                  <p className="text-gray-400 text-sm">Os saques são processados em até 24 horas úteis.</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 backdrop-blur-sm border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Informações Importantes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-green-400 font-bold mb-2">Como Funciona</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Você ganha {affiliateData.affiliate.commission_rate}% de comissão em todos os depósitos</li>
                      <li>• Comissões são creditadas automaticamente</li>
                      <li>• Valor mínimo para saque: R$ 50,00</li>
                      <li>• Saques processados em até 24h úteis</li>
                    </ul>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-yellow-400 font-bold mb-2">Dicas para Aumentar Ganhos</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Compartilhe em redes sociais</li>
                      <li>• Crie conteúdo sobre os jogos</li>
                      <li>• Indique para amigos e familiares</li>
                      <li>• Use grupos e comunidades</li>
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
