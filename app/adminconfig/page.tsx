"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, DollarSign, TrendingUp, TrendingDown, Gamepad2, RefreshCw, LogOut, Activity, Target, Wallet, Trophy, AlertTriangle, BarChart3, Clock, Info, CheckCircle, XCircle, Loader, Settings, UserCheck, Sparkles, Crown, Zap, Trash2, Star, KeyRound, Menu, X } from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import { AuthClient } from "@/lib/auth-client"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

// Senha de acesso
const ADMIN_PASSWORD = "4SS[9zd$r#yJ"
const RESET_PASSWORD = "Psicodelia12@"

interface AdminStats {
  users: {
    total: number
    active_today: number
    new_this_week: number
    blogger_count: number
  }
  transactions: {
    total: number
    successful: number
    pending: number
    failed: number
    total_volume: number
    deposits_volume: number
    withdraws_volume: number
    detailed_list: Array<{
      id: number
      type: string
      amount: number
      status: string
      external_id?: number
      end_to_end_id?: string
      payer_name?: string
      pix_key?: string
      pix_type?: string
      created_at: string
      updated_at: string
      user: {
        id: number
        name: string
        username?: string
        email: string
        user_type: string
        balance: number
      }
    }>
    by_type: {
      [key: string]: {
        [status: string]: {
          count: number
          total_amount: number
          avg_amount: number
          first_transaction: string
          last_transaction: string
        }
      }
    }
  }
  games: {
    total_plays: number
    total_spent: number
    total_won: number
    profit_margin: number
    games_breakdown: {
      [key: string]: {
        plays: number
        spent: number
        won: number
        profit: number
      }
    }
  }
  financial: {
    platform_balance: number
    pending_withdraws: number
    available_balance: number
    horsepay_balance: number
    horsepay_error?: string | null
    daily_revenue: number
    weekly_revenue: number
    monthly_revenue: number
  }
  recent_activities: Array<{
    id: number
    type: string
    description: string
    amount?: number
    user_email?: string
    created_at: string
  }>
}

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

interface Agent {
  id: number
  user_id: number
  agent_code: string
  commission_rate: number
  total_affiliates: number
  total_commission_earned: number
  status: string
  created_at: string
  user_name: string
  user_email: string
}

interface Manager {
  id: number
  user_id: number
  manager_code: string
  commission_rate: number
  total_agents: number
  total_commission_earned: number
  status: string
  created_at: string
  user_name: string
  user_email: string
}

// Função utilitária para formatar valores monetários
const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return "R$ 0,00"
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue)
    ? "R$ 0,00"
    : `R$ ${numValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Função para formatar porcentagem
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`
}

// Função para formatar data
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString("pt-BR")
}

// Função para obter badge de status
const getStatusBadge = (status: string) => {
  switch (status) {
    case "success":
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Sucesso
        </Badge>
      )
    case "pending":
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30 text-xs">
          <Loader className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      )
    case "failed":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 text-xs">
          <XCircle className="h-3 w-3 mr-1" />
          Falhou
        </Badge>
      )
    case "active":
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ativo
        </Badge>
      )
    case "processing":
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30 text-xs">
          <Settings className="h-3 w-3 mr-1" />
          Processando
        </Badge>
      )
    case "completed":
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Concluído
        </Badge>
      )
    case "cancelled":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 text-xs">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelado
        </Badge>
      )
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>
  }
}

// Função para obter badge de tipo
const getTypeBadge = (type: string) => {
  switch (type) {
    case "deposit":
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30 text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          Depósito
        </Badge>
      )
    case "withdraw":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 text-xs">
          <TrendingDown className="h-3 w-3 mr-1" />
          Saque
        </Badge>
      )
    default:
      return <Badge variant="secondary" className="text-xs">{type}</Badge>
  }
}

export default function AdminConfigPage() {
  // Estados para configurações
  const [settings, setSettings] = useState<{
    min_deposit: number
    max_deposit: number
    min_withdraw: number
    max_withdraw: number
  } | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [newMinDeposit, setNewMinDeposit] = useState("")
  const [newMaxDeposit, setNewMaxDeposit] = useState("")
  const [newMinWithdraw, setNewMinWithdraw] = useState("")
  const [newMaxWithdraw, setNewMaxWithdraw] = useState("")
  const [updateSettingsLoading, setUpdateSettingsLoading] = useState(false)

  const [agents, setAgents] = useState<Agent[]>([])
  const [agentWithdrawals, setAgentWithdrawals] = useState<WithdrawalRequest[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [newAgentCommissionRate, setNewAgentCommissionRate] = useState("")
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [newAgentEmail, setNewAgentEmail] = useState("")
  const [createAgentLoading, setCreateAgentLoading] = useState(false)

  // Estados para gerentes
  const [managers, setManagers] = useState<Manager[]>([])
  const [managerWithdrawals, setManagerWithdrawals] = useState<WithdrawalRequest[]>([])
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null)
  const [newManagerCommissionRate, setNewManagerCommissionRate] = useState("")
  const [managersLoading, setManagersLoading] = useState(false)
  const [newManagerEmail, setNewManagerEmail] = useState("")
  const [createManagerLoading, setCreateManagerLoading] = useState(false)
  const [managerSearchTerm, setManagerSearchTerm] = useState("")

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [resetPassword, setResetPassword] = useState("")
  const [resetError, setResetError] = useState("")
  const [isResetting, setIsResetting] = useState(false)

  // Estados para afiliados
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null)
  const [newCommissionRate, setNewCommissionRate] = useState("")
  const [updateLoading, setUpdateLoading] = useState(false)
  const [affiliatesLoading, setAffiliatesLoading] = useState(false)

  // Novos estados para alteração de senha de afiliado
  const [selectedAffiliateForPasswordChange, setSelectedAffiliateForPasswordChange] = useState<Affiliate | null>(null)
  const [newAffiliatePassword, setNewAffiliatePassword] = useState("")
  const [isUpdatingAffiliatePassword, setIsUpdatingAffiliatePassword] = useState(false)
  const [passwordChangeError, setPasswordChangeError] = useState("")

  // Estados para busca
  const [agentSearchTerm, setAgentSearchTerm] = useState("")
  const [affiliateSearchTerm, setAffiliateSearchTerm] = useState("")

  // Adicionar após os estados existentes
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "agent" | "affiliate" | "manager"
    id: number
    name: string
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Estado para controle do menu mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Estado para controle da seção ativa do sidebar
  const [activeSection, setActiveSection] = useState("overview")

  // Função de login
  const handleLogin = async () => {
    setLoginError("")

    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)

      // Ativar sessão admin
      AuthClient.setAdminSession()

      toast({
        title: "Acesso Autorizado",
        description: "Bem-vindo ao painel de configuração administrativa!",
      })
      fetchStats()
    } else {
      setLoginError("Senha incorreta")
      toast({
        title: "Acesso Negado",
        description: "Senha incorreta",
        variant: "destructive",
      })
    }
  }

  // Função de logout
  const handleLogout = () => {
    setIsAuthenticated(false)
    setPassword("")
    setStats(null)
    setLastUpdate(null)
    setAffiliates([])
    setWithdrawals([])
    AuthClient.removeToken()
  }

  // Buscar estatísticas
  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/config/stats")

      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setLastUpdate(new Date())
      } else {
        throw new Error("Erro ao carregar estatísticas")
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Buscar configurações
  const fetchSettings = async () => {
    setSettingsLoading(true)
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/settings")

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        setNewMinDeposit(data.settings.min_deposit.toString())
        setNewMaxDeposit(data.settings.max_deposit.toString())
        setNewMinWithdraw(data.settings.min_withdraw.toString())
        setNewMaxWithdraw(data.settings.max_withdraw.toString())
      } else {
        throw new Error("Erro ao carregar configurações")
      }
    } catch (error) {
      console.error("Erro ao buscar configurações:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações",
        variant: "destructive",
      })
    } finally {
      setSettingsLoading(false)
    }
  }

  // Atualizar configurações
  const updateSettings = async () => {
    if (!newMinDeposit || !newMaxDeposit || !newMinWithdraw || !newMaxWithdraw) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive",
      })
      return
    }

    try {
      setUpdateSettingsLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          min_deposit: Number.parseFloat(newMinDeposit),
          max_deposit: Number.parseFloat(newMaxDeposit),
          min_withdraw: Number.parseFloat(newMinWithdraw),
          max_withdraw: Number.parseFloat(newMaxWithdraw),
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Configurações atualizadas com sucesso",
        })
        await fetchSettings()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao atualizar configurações",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao atualizar configurações:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setUpdateSettingsLoading(false)
    }
  }

  // Buscar dados dos afiliados
  const fetchAffiliatesData = async () => {
    setAffiliatesLoading(true)
    try {
      console.log("🔄 Buscando dados dos afiliados...")

      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/affiliates")

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
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao carregar dados dos afiliados",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao buscar afiliados:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setAffiliatesLoading(false)
    }
  }

  // Atualizar taxa de comissão
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

  // Processar saque
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
    } finally {
      setUpdateLoading(false)
    }
  }

  // Função para alterar a senha do afiliado
  const updateAffiliatePassword = async () => {
    if (!selectedAffiliateForPasswordChange || !newAffiliatePassword) {
      setPasswordChangeError("A nova senha é obrigatória.")
      return
    }
    if (newAffiliatePassword.length < 6) {
      setPasswordChangeError("A nova senha deve ter pelo menos 6 caracteres.")
      return
    }

    setIsUpdatingAffiliatePassword(true)
    setPasswordChangeError("")

    try {
      const response = await AuthClient.makeAuthenticatedRequest(
        `/api/admin/affiliates/${selectedAffiliateForPasswordChange.user_id}/password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newPassword: newAffiliatePassword }),
        },
      )

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: `Senha do afiliado ${selectedAffiliateForPasswordChange.user_name} atualizada com sucesso.`,
        })
        setSelectedAffiliateForPasswordChange(null)
        setNewAffiliatePassword("")
      } else {
        const errorData = await response.json()
        setPasswordChangeError(errorData.error || "Erro ao atualizar a senha.")
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao atualizar a senha.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao atualizar senha do afiliado:", error)
      setPasswordChangeError("Erro de conexão ao tentar atualizar a senha.")
      toast({
        title: "Erro",
        description: "Erro de conexão ao tentar atualizar a senha.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingAffiliatePassword(false)
    }
  }

  // Função de reset
  const handleReset = async () => {
    setResetError("")

    if (resetPassword !== RESET_PASSWORD) {
      setResetError("Senha de reset incorreta")
      toast({
        title: "Erro",
        description: "Senha de reset incorreta",
        variant: "destructive",
      })
      return
    }

    setIsResetting(true)
    try {
      const response = await fetch("/api/admin/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: resetPassword }),
      })

      if (response.ok) {
        toast({
          title: "Reset Realizado",
          description: "Todos os dados foram resetados com sucesso (usuários mantidos)",
        })
        fetchStats() // Atualizar estatísticas após reset
        setResetPassword("")
      } else {
        throw new Error("Erro ao realizar reset")
      }
    } catch (error) {
      console.error("Erro ao realizar reset:", error)
      toast({
        title: "Erro",
        description: "Não foi possível realizar o reset",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
    }
  }

  // Adicionar funções para gerenciar agentes após as funções existentes
  const fetchAgentsData = async () => {
    setAgentsLoading(true)
    try {
      console.log("🔄 Buscando dados dos agentes...")

      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/agents")

      if (response.ok) {
        const data = await response.json()
        console.log("📊 Dados recebidos:", data)

        setAgents(data.agents || [])
        setAgentWithdrawals(data.pending_withdrawals || [])

        console.log("✅ Dados carregados:", {
          agents: data.agents?.length || 0,
          withdrawals: data.pending_withdrawals?.length || 0,
        })
      } else {
        const errorData = await response.json()
        console.error("❌ Erro da API:", errorData)
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao carregar dados dos agentes",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao buscar agentes:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setAgentsLoading(false)
    }
  }

  const createAgent = async () => {
    if (!newAgentEmail) {
      toast({
        title: "Erro",
        description: "Email é obrigatório",
        variant: "destructive",
      })
      return
    }

    try {
      setCreateAgentLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_email: newAgentEmail,
          commission_rate: Number.parseFloat(newAgentCommissionRate) || 10.0,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Agente criado com sucesso",
        })
        setNewAgentEmail("")
        setNewAgentCommissionRate("10")
        await fetchAgentsData()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao criar agente",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao criar agente:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setCreateAgentLoading(false)
    }
  }

  const updateAgentCommissionRate = async () => {
    if (!selectedAgent || !newAgentCommissionRate) return

    try {
      setUpdateLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/agents", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
          commission_rate: Number.parseFloat(newAgentCommissionRate),
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Taxa de comissão atualizada com sucesso",
        })
        setSelectedAgent(null)
        setNewAgentCommissionRate("")
        await fetchAgentsData()
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

  const processAgentWithdrawal = async (withdrawalId: number, status: string, notes?: string) => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest(`/api/admin/agents/withdrawals/${withdrawalId}`, {
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
        await fetchAgentsData()
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
    } finally {
      setUpdateLoading(false)
    }
  }

  // Adicionar funções para gerenciar gerentes após as funções existentes de agentes:

  const fetchManagersData = async () => {
    setManagersLoading(true)
    try {
      console.log("🔄 Buscando dados dos gerentes...")

      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/managers")

      if (response.ok) {
        const data = await response.json()
        console.log("📊 Dados recebidos:", data)

        setManagers(data.managers || [])
        setManagerWithdrawals(data.pending_withdrawals || [])

        console.log("✅ Dados carregados:", {
          managers: data.managers?.length || 0,
          withdrawals: data.pending_withdrawals?.length || 0,
        })
      } else {
        const errorData = await response.json()
        console.error("❌ Erro da API:", errorData)
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao carregar dados dos gerentes",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao buscar gerentes:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setManagersLoading(false)
    }
  }

  const createManager = async () => {
    if (!newManagerEmail) {
      toast({
        title: "Erro",
        description: "Email é obrigatório",
        variant: "destructive",
      })
      return
    }

    try {
      setCreateManagerLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/managers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_email: newManagerEmail,
          commission_rate: Number.parseFloat(newManagerCommissionRate) || 5.0,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Gerente criado com sucesso",
        })
        setNewManagerEmail("")
        setNewManagerCommissionRate("5")
        await fetchManagersData()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao criar gerente",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao criar gerente:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setCreateManagerLoading(false)
    }
  }

  const updateManagerCommissionRate = async () => {
    if (!selectedManager || !newManagerCommissionRate) return

    try {
      setUpdateLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/managers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manager_id: selectedManager.id,
          commission_rate: Number.parseFloat(newManagerCommissionRate),
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Taxa de comissão atualizada com sucesso",
        })
        setSelectedManager(null)
        setNewManagerCommissionRate("")
        await fetchManagersData()
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

  const processManagerWithdrawal = async (withdrawalId: number, status: string, notes?: string) => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest(`/api/admin/managers/withdrawals/${withdrawalId}`, {
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
        await fetchManagersData()
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
    } finally {
      setUpdateLoading(false)
    }
  }

  const toggleManagerStatus = async (managerId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active"

    try {
      setActionLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/managers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manager_id: managerId,
          status: newStatus,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: `Gerente ${newStatus === "active" ? "ativado" : "desativado"} com sucesso`,
        })
        await fetchManagersData()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao alterar status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const deleteManager = async (managerId: number) => {
    try {
      setActionLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest(`/api/admin/managers/${managerId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Gerente excluído com sucesso",
        })
        await fetchManagersData()
        setDeleteConfirm(null)
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao excluir gerente",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao excluir gerente:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Adicionar após as funções existentes de agentes
  const toggleAgentStatus = async (agentId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active"

    try {
      setActionLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/agents", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          status: newStatus,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: `Agente ${newStatus === "active" ? "ativado" : "desativado"} com sucesso`,
        })
        await fetchAgentsData()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao alterar status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const deleteAgent = async (agentId: number) => {
    try {
      setActionLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest(`/api/admin/agents/${agentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Agente excluído com sucesso",
        })
        await fetchAgentsData()
        setDeleteConfirm(null)
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao excluir agente",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao excluir agente:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Adicionar após as funções existentes de afiliados
  const toggleAffiliateStatus = async (affiliateId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active"

    try {
      setActionLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/affiliates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          affiliate_id: affiliateId,
          status: newStatus,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: `Afiliado ${newStatus === "active" ? "ativado" : "desativado"} com sucesso`,
        })
        await fetchAffiliatesData()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao alterar status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const deleteAffiliate = async (affiliateId: number) => {
    try {
      setActionLoading(true)
      const response = await AuthClient.makeAuthenticatedRequest(`/api/admin/affiliates/${affiliateId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Afiliado excluído com sucesso",
        })
        await fetchAffiliatesData()
        setDeleteConfirm(null)
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao excluir afiliado",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao excluir afiliado:", error)
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Adicionar função de filtro para gerentes:

  const filteredManagers = managers.filter(
    (manager) =>
      manager.user_name.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
      manager.user_email.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
      manager.manager_code.toLowerCase().includes(managerSearchTerm.toLowerCase()),
  )

  // Funções de filtro
  const filteredAgents = agents.filter(
    (agent) =>
      agent.user_name.toLowerCase().includes(agentSearchTerm.toLowerCase()) ||
      agent.user_email.toLowerCase().includes(agentSearchTerm.toLowerCase()) ||
      agent.agent_code.toLowerCase().includes(agentSearchTerm.toLowerCase()),
  )

  const filteredAffiliates = affiliates.filter(
    (affiliate) =>
      affiliate.user_name.toLowerCase().includes(affiliateSearchTerm.toLowerCase()) ||
      affiliate.user_email.toLowerCase().includes(affiliateSearchTerm.toLowerCase()) ||
      affiliate.affiliate_code.toLowerCase().includes(affiliateSearchTerm.toLowerCase()),
  )

  // Auto-refresh das estatísticas a cada 30 segundos
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(fetchStats, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  // Carregar dados automaticamente quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      fetchAffiliatesData()
      fetchAgentsData()
      fetchManagersData()
      fetchSettings()
    }
  }, [isAuthenticated])

  // Tela de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-900 to-slate-950"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <Card className="w-full max-w-md border-slate-800/50 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative z-10">
          <CardHeader className="text-center space-y-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg animate-glow">
                <Shield className="h-10 w-10 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                Painel Administrativo
              </CardTitle>
              <CardDescription className="text-slate-400 text-base md:text-lg">
                Área restrita - Acesso apenas para administradores autorizados
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="password" className="text-slate-300 font-medium">
                Senha de Acesso
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha administrativa"
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20 h-12"
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            {loginError && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">{loginError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleLogin}
              disabled={!password}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              <Crown className="h-5 w-5 mr-2" />
              Acessar Painel
            </Button>

            <div className="text-center text-sm text-slate-500 bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-amber-400 font-medium">Área de Alta Segurança</span>
              </div>
              <p>Acesso monitorado e registrado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalAffiliates = affiliates.length
  const totalCommissionEarned = affiliates.reduce((sum, aff) => sum + Number(aff.total_commission_earned || 0), 0)
  const totalCommissionPaid = affiliates.reduce((sum, aff) => sum + Number(aff.total_commission_paid || 0), 0)
  const pendingCommission = totalCommissionEarned - totalCommissionPaid

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex w-full relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/10 via-slate-900 to-slate-950"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>

        <Sidebar className="border-slate-800/50">
          <SidebarHeader className="border-b border-slate-800/50 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">Admin Panel</h2>
                <p className="text-xs text-slate-400">Sistema de Gestão</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-slate-400 text-xs font-medium px-2 py-2">
                DASHBOARD
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveSection("overview")}
                      isActive={activeSection === "overview"}
                      className="w-full justify-start"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Visão Geral</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveSection("users")}
                      isActive={activeSection === "users"}
                      className="w-full justify-start"
                    >
                      <Users className="h-4 w-4" />
                      <span>Usuários</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveSection("games")}
                      isActive={activeSection === "games"}
                      className="w-full justify-start"
                    >
                      <Gamepad2 className="h-4 w-4" />
                      <span>Jogos</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveSection("financial")}
                      isActive={activeSection === "financial"}
                      className="w-full justify-start"
                    >
                      <DollarSign className="h-4 w-4" />
                      <span>Financeiro</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-slate-400 text-xs font-medium px-2 py-2">
                REDE DE PARCEIROS
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveSection("managers")}
                      isActive={activeSection === "managers"}
                      className="w-full justify-start"
                    >
                      <Star className="h-4 w-4" />
                      <span>Gerentes ({filteredManagers.length})</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveSection("agents")}
                      isActive={activeSection === "agents"}
                      className="w-full justify-start"
                    >
                      <Crown className="h-4 w-4" />
                      <span>Agentes ({filteredAgents.length})</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveSection("affiliates")}
                      isActive={activeSection === "affiliates"}
                      className="w-full justify-start"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Afiliados ({filteredAffiliates.length})</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-slate-400 text-xs font-medium px-2 py-2">
                SISTEMA
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveSection("settings")}
                      isActive={activeSection === "settings"}
                      className="w-full justify-start"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Configurações</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveSection("reset")}
                      isActive={activeSection === "reset"}
                      className="w-full justify-start text-red-400 hover:text-red-300"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>Reset</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-800/50 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4 flex-1">
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-bold flex items-center space-x-2">
                  <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                    Painel Administrativo
                  </span>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-2 py-1 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    CONFIDENCIAL
                  </Badge>
                </h1>
                {lastUpdate && (
                  <p className="text-xs text-slate-500 flex items-center space-x-2">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span>Última atualização: {lastUpdate.toLocaleString("pt-BR")}</span>
                  </p>
                )}
              </div>
              <div className="ml-auto flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={fetchStats}
                  disabled={loading}
                  size="sm"
                  className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-300"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden md:inline">Atualizar</span>
                </Button>
                <Button
                  onClick={handleLogout}
                  size="sm"
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Sair</span>
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 space-y-8 relative z-10">
            {loading && !stats ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <RefreshCw className="h-12 w-12 animate-spin mx-auto text-amber-500" />
                    <div className="absolute inset-0 h-12 w-12 mx-auto rounded-full bg-amber-500/20 animate-ping"></div>
                  </div>
                  <p className="text-slate-400 text-lg">Carregando estatísticas...</p>
                </div>
              </div>
            ) : stats ? (
              <>
                {/* Visão Geral */}
                {activeSection === "overview" && (
                  <div className="space-y-8">
                    {/* Alerta de erro HorsePay se houver */}
                    {stats.financial.horsepay_error && (
                      <Alert className="border-red-500/50 bg-red-500/10">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-400 text-sm">
                          <strong>Erro ao consultar saldo HorsePay:</strong> {stats.financial.horsepay_error}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Usuários Totais */}
                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 group">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                              <Users className="h-8 w-8 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Usuários Totais</p>
                              <p className="text-3xl font-bold text-white">{stats.users.total.toLocaleString()}</p>
                              <p className="text-xs text-emerald-400">+{stats.users.new_this_week} esta semana</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Volume Total */}
                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 group">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
                              <DollarSign className="h-8 w-8 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Volume Total</p>
                              <p className="text-3xl font-bold text-white">
                                {formatCurrency(stats.transactions.total_volume)}
                              </p>
                              <p className="text-xs text-blue-400">{stats.transactions.total} transações</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Receita Mensal */}
                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 group">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-violet-500/20 rounded-xl group-hover:bg-violet-500/30 transition-colors">
                              <TrendingUp className="h-8 w-8 text-violet-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Receita Mensal</p>
                              <p className="text-3xl font-bold text-white">
                                {formatCurrency(stats.financial.monthly_revenue)}
                              </p>
                              <p className="text-xs text-emerald-400">Margem: {formatPercent(stats.games.profit_margin)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Saldo HorsePay */}
                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 group">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-amber-500/20 rounded-xl group-hover:bg-amber-500/30 transition-colors">
                              <Wallet className="h-8 w-8 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Saldo HorsePay</p>
                              <p className="text-3xl font-bold text-white">
                                {formatCurrency(stats.financial.horsepay_balance)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {stats.financial.horsepay_error ? "Erro na consulta" : "Saldo real na carteira"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Atividades Recentes */}
                    <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-3 text-white text-xl">
                          <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Activity className="h-5 w-5 text-amber-400" />
                          </div>
                          <span>Atividades Recentes</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {stats.recent_activities.map((activity) => (
                            <div
                              key={activity.id}
                              className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:bg-slate-800/50 transition-colors"
                            >
                              <div className="flex items-center space-x-4">
                                <div
                                  className={`p-3 rounded-xl ${
                                    activity.type === "deposit"
                                      ? "bg-emerald-500/20"
                                      : activity.type === "withdraw"
                                        ? "bg-red-500/20"
                                        : activity.type === "game"
                                          ? "bg-blue-500/20"
                                          : "bg-slate-500/20"
                                  }`}
                                >
                                  {activity.type === "deposit" && <TrendingUp className="h-5 w-5 text-emerald-400" />}
                                  {activity.type === "withdraw" && <TrendingDown className="h-5 w-5 text-red-400" />}
                                  {activity.type === "game" && <Gamepad2 className="h-5 w-5 text-blue-400" />}
                                  {activity.type === "user" && <Users className="h-5 w-5 text-slate-400" />}
                                </div>
                                <div>
                                  <p className="font-medium text-white">{activity.description}</p>
                                  {activity.user_email && <p className="text-sm text-slate-400">{activity.user_email}</p>}
                                </div>
                              </div>
                              <div className="text-right">
                                {activity.amount && (
                                  <p className="font-bold text-emerald-400">{formatCurrency(activity.amount)}</p>
                                )}
                                <p className="text-xs text-slate-500">
                                  {new Date(activity.created_at).toLocaleString("pt-BR")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Usuários */}
                {activeSection === "users" && (
                  <div className="space-y-8">
                    <div className="mb-6">
                      <Alert className="border-blue-500/50 bg-blue-500/10">
                        <Info className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-400 text-sm">
                          📊 <strong>Dados Limpos:</strong> As estatísticas excluem contas blogger para mostrar apenas dados
                          reais do negócio.
                          {stats.users.blogger_count > 0 && (
                            <span className="ml-2 text-slate-400">
                              ({stats.users.blogger_count} conta{stats.users.blogger_count > 1 ? "s" : ""} blogger excluída
                              {stats.users.blogger_count > 1 ? "s" : ""})
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-3 text-white text-lg">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                              <Users className="h-5 w-5 text-blue-400" />
                            </div>
                            <span>Usuários Regulares</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-4xl font-bold mb-4 text-white">{stats.users.total.toLocaleString()}</div>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ativos hoje:</span>
                              <span className="font-medium text-white">{stats.users.active_today}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Novos esta semana:</span>
                              <span className="font-medium text-emerald-400">+{stats.users.new_this_week}</span>
                            </div>
                            {stats.users.blogger_count > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Contas blogger:</span>
                                <span className="font-medium text-slate-500">{stats.users.blogger_count} (excluídas)</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-white text-lg">Taxa de Crescimento</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-emerald-400 mb-2">
                            {stats.users.total > 0
                              ? ((stats.users.new_this_week / stats.users.total) * 100).toFixed(1)
                              : "0.0"}
                            %
                          </div>
                          <p className="text-sm text-slate-400">Crescimento semanal</p>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-white text-lg">Engajamento</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-blue-400 mb-2">
                            {stats.users.total > 0
                              ? ((stats.users.active_today / stats.users.total) * 100).toFixed(1)
                              : "0.0"}
                            %
                          </div>
                          <p className="text-sm text-slate-400">Usuários ativos hoje</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Jogos */}
                {activeSection === "games" && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-violet-500/20 rounded-xl">
                              <Gamepad2 className="h-6 w-6 text-violet-400" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-400">Total de Jogadas</p>
                              <p className="text-2xl font-bold text-white">{stats.games.total_plays.toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                              <DollarSign className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-400">Total Apostado</p>
                              <p className="text-2xl font-bold text-white">{formatCurrency(stats.games.total_spent)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-amber-500/20 rounded-xl">
                              <Trophy className="h-6 w-6 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-400">Total Ganho</p>
                              <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.games.total_won)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl">
                              <Target className="h-6 w-6 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-400">Margem de Lucro</p>
                              <p className="text-2xl font-bold text-emerald-400">
                                {formatPercent(stats.games.profit_margin)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Breakdown por jogo */}
                    <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-3 text-white text-xl">
                          <div className="p-2 bg-amber-500/20 rounded-lg">
                            <BarChart3 className="h-5 w-5 text-amber-400" />
                          </div>
                          <span>Performance por Jogo</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {Object.entries(stats.games.games_breakdown).map(([gameName, gameStats]) => (
                            <div key={gameName} className="p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-xl text-white">{gameName}</h3>
                                <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 px-3 py-1">
                                  {gameStats.plays} jogadas
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                <div>
                                  <p className="text-slate-400 font-medium mb-1">Apostado</p>
                                  <p className="font-bold text-blue-400 text-lg">{formatCurrency(gameStats.spent)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 font-medium mb-1">Ganho</p>
                                  <p className="font-bold text-amber-400 text-lg">{formatCurrency(gameStats.won)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 font-medium mb-1">Lucro</p>
                                  <p className="font-bold text-emerald-400 text-lg">{formatCurrency(gameStats.profit)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 font-medium mb-1">Margem</p>
                                  <p className="font-bold text-white text-lg">
                                    {formatPercent((gameStats.profit / gameStats.spent) * 100)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Financeiro */}
                {activeSection === "financial" && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-emerald-400 text-lg">Saldo da Plataforma</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-4xl font-bold text-emerald-400 mb-2">
                            {formatCurrency(stats.financial.platform_balance)}
                          </div>
                          <p className="text-sm text-slate-400">Saldo total da plataforma</p>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-blue-400 text-lg">Saldo Disponível</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-4xl font-bold text-blue-400 mb-2">
                            {formatCurrency(stats.financial.available_balance)}
                          </div>
                          <p className="text-sm text-slate-400">Disponível para operações</p>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-amber-400 text-lg">Saldo HorsePay</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-4xl font-bold text-amber-400 mb-2">
                            {formatCurrency(stats.financial.horsepay_balance)}
                          </div>
                          <p className="text-sm text-slate-400">
                            {stats.financial.horsepay_error ? "Erro na consulta" : "Saldo real na carteira"}
                          </p>
                          {stats.financial.horsepay_error && (
                            <p className="text-xs text-red-400 mt-1">{stats.financial.horsepay_error}</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-red-400 text-lg">Saques Pendentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-4xl font-bold text-red-400 mb-2">
                            {formatCurrency(stats.financial.pending_withdraws)}
                          </div>
                          <p className="text-sm text-slate-400">Aguardando processamento</p>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-violet-400 text-lg">Receita Diária</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-violet-400 mb-2">
                            {formatCurrency(stats.financial.daily_revenue)}
                          </div>
                          <p className="text-sm text-slate-400">Receita de hoje</p>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-indigo-400 text-lg">Receita Semanal</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-indigo-400 mb-2">
                            {formatCurrency(stats.financial.weekly_revenue)}
                          </div>
                          <p className="text-sm text-slate-400">Receita desta semana</p>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-emerald-400 text-lg">Receita Mensal</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-emerald-400 mb-2">
                            {formatCurrency(stats.financial.monthly_revenue)}
                          </div>
                          <p className="text-sm text-slate-400">Receita deste mês</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Gerentes */}
                {activeSection === "managers" && (
                  <div className="space-y-8">
                    {/* Header da seção de gerentes */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
                          <div className="p-2 bg-yellow-500/20 rounded-xl">
                            <Star className="h-6 w-6 text-yellow-400" />
                          </div>
                          <span>Gerenciar Gerentes</span>
                        </h2>
                        <p className="text-slate-400 text-lg">Administre a rede de gerentes</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={fetchManagersData}
                        disabled={managersLoading}
                        size="sm"
                        className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-300"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${managersLoading ? "animate-spin" : ""}`} />
                        Atualizar Gerentes
                      </Button>
                    </div>

                    {/* Campo de busca para gerentes */}
                    <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <Input
                              placeholder="Buscar gerente por nome, email ou código..."
                              value={managerSearchTerm}
                              onChange={(e) => setManagerSearchTerm(e.target.value)}
                              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-yellow-500 focus:ring-yellow-500/20"
                            />
                          </div>
                          {managerSearchTerm && (
                            <Button
                              onClick={() => setManagerSearchTerm("")}
                              variant="outline"
                              size="sm"
                              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Stats Cards dos Gerentes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-yellow-500/20 rounded-xl">
                              <Star className="h-8 w-8 text-yellow-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Total de Gerentes</p>
                              <p className="text-3xl font-bold text-white">{managers.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                              <Crown className="h-8 w-8 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Total Agentes</p>
                              <p className="text-3xl font-bold text-white">
                                {managers.reduce((sum, manager) => sum + Number(manager.total_agents || 0), 0)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl">
                              <DollarSign className="h-8 w-8 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Comissão Total</p>
                              <p className="text-3xl font-bold text-white">
                                {formatCurrency(
                                  managers.reduce((sum, manager) => sum + Number(manager.total_commission_earned || 0), 0),
                                )}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-amber-500/20 rounded-xl">
                              <Clock className="h-8 w-8 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Saques Pendentes</p>
                              <p className="text-3xl font-bold text-amber-400">{managerWithdrawals.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Tabs dos Gerentes */}
                    <Tabs defaultValue="managers-list" className="space-y-6">
                      <TabsList className="bg-slate-800/50 border-slate-700 grid grid-cols-3 w-full">
                        <TabsTrigger
                          value="managers-list"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-400"
                        >
                          Gerentes ({filteredManagers.length})
                        </TabsTrigger>
                        <TabsTrigger
                          value="create-manager"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-400"
                        >
                          Criar Gerente
                        </TabsTrigger>
                        <TabsTrigger
                          value="manager-withdrawals"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-400"
                        >
                          Saques Pendentes ({managerWithdrawals.length})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="managers-list">
                        <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="text-white text-lg">Lista de Gerentes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {managersLoading ? (
                              <div className="flex items-center justify-center py-12">
                                <div className="text-center space-y-4">
                                  <RefreshCw className="h-12 w-12 animate-spin text-amber-500 mx-auto" />
                                  <span className="text-slate-400 text-lg">Carregando gerentes...</span>
                                </div>
                              </div>
                            ) : filteredManagers.length > 0 ? (
                              <div className="space-y-6">
                                {filteredManagers.map((manager) => (
                                  <div
                                    key={manager.id}
                                    className="p-6 bg-slate-800/30 rounded-xl border border-slate-700/50"
                                  >
                                    <div className="flex flex-col gap-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-4 mb-3">
                                            <h3 className="font-bold text-white text-lg">{manager.user_name}</h3>
                                            {getStatusBadge(manager.status)}
                                          </div>
                                          <p className="text-slate-400 mb-4">{manager.user_email}</p>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            onClick={() => {
                                              setSelectedManager(manager)
                                              setNewManagerCommissionRate(manager.commission_rate.toString())
                                            }}
                                            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                                            size="sm"
                                          >
                                            <Settings className="h-4 w-4 mr-1" />
                                            Editar
                                          </Button>
                                          <Button
                                            onClick={() => toggleManagerStatus(manager.id, manager.status)}
                                            disabled={actionLoading}
                                            variant="outline"
                                            size="sm"
                                            className={`border-slate-700 ${
                                              manager.status === "active"
                                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                                : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                            }`}
                                          >
                                            {manager.status === "active" ? (
                                              <>
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Desativar
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Ativar
                                              </>
                                            )}
                                          </Button>
                                          <Button
                                            onClick={() =>
                                              setDeleteConfirm({ type: "manager", id: manager.id, name: manager.user_name })
                                            }
                                            variant="outline"
                                            size="sm"
                                            className="border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                          >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Excluir
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                                        <div>
                                          <p className="text-slate-400 mb-1">Código</p>
                                          <p className="text-yellow-400 font-mono font-medium">{manager.manager_code}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Comissão</p>
                                          <p className="font-medium text-white">{manager.commission_rate}%</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Agentes</p>
                                          <p className="font-medium text-white">{manager.total_agents}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Ganhou</p>
                                          <p className="text-emerald-400 font-medium">
                                            {formatCurrency(manager.total_commission_earned)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Saldo Disponível</p>
                                          <p className="text-blue-400 font-medium">
                                            {formatCurrency(
                                              Number(manager.total_commission_earned || 0) -
                                                Number(manager.total_commission_paid || 0),
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <Star className="h-20 w-20 text-slate-600 mx-auto mb-6" />
                                <p className="text-slate-400 text-lg mb-4">Nenhum gerente cadastrado ainda</p>
                                <Button
                                  onClick={fetchManagersData}
                                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                                >
                                  Carregar Gerentes
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="create-manager">
                        <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="text-white text-lg">Criar Novo Gerente</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="managerEmail" className="text-slate-300">
                                    Email do Usuário
                                  </Label>
                                  <Input
                                    id="managerEmail"
                                    type="email"
                                    value={newManagerEmail}
                                    onChange={(e) => setNewManagerEmail(e.target.value)}
                                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                                    placeholder="Digite o email do usuário"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="managerCommission" className="text-slate-300">
                                    Taxa de Comissão (%)
                                  </Label>
                                  <Input
                                    id="managerCommission"
                                    type="number"
                                    min="1"
                                    max="20"
                                    step="0.1"
                                    value={newManagerCommissionRate}
                                    onChange={(e) => setNewManagerCommissionRate(e.target.value)}
                                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                                    placeholder="5.0"
                                  />
                                </div>

                                <Button
                                  onClick={createManager}
                                  disabled={createManagerLoading || !newManagerEmail}
                                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold h-12"
                                >
                                  {createManagerLoading ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Criando...
                                    </>
                                  ) : (
                                    <>
                                      <Star className="h-4 w-4 mr-2" />
                                      Criar Gerente
                                    </>
                                  )}
                                </Button>
                              </div>

                              <div className="bg-slate-800/30 rounded-lg p-6">
                                <h4 className="text-yellow-400 font-bold mb-4">Informações Importantes</h4>
                                <ul className="text-gray-300 text-sm space-y-2">
                                  <li>• O usuário deve estar cadastrado no sistema</li>
                                  <li>• Gerentes podem criar e gerenciar agentes</li>
                                  <li>• Taxa padrão de comissão é 5%</li>
                                  <li>• Gerentes acessam o painel em /gerente</li>
                                  <li>• Apenas admins podem criar gerentes</li>
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="manager-withdrawals">
                        <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="text-white text-lg">Solicitações de Saque de Gerentes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {managerWithdrawals.length > 0 ? (
                              <div className="space-y-6">
                                {managerWithdrawals.map((withdrawal) => (
                                  <div
                                    key={withdrawal.id}
                                    className="p-6 bg-slate-800/30 rounded-xl border border-slate-700/50"
                                  >
                                    <div className="flex flex-col gap-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-4 mb-3">
                                            <h3 className="font-bold text-white text-lg">{withdrawal.manager_name}</h3>
                                            {getStatusBadge(withdrawal.status)}
                                          </div>
                                          <p className="text-slate-400 mb-4">{withdrawal.manager_email}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          <Button
                                            onClick={() => processManagerWithdrawal(withdrawal.id, "processing")}
                                            variant="outline"
                                            size="sm"
                                            className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                                          >
                                            <Settings className="h-4 w-4 mr-2" />
                                            Processar
                                          </Button>
                                          <Button
                                            onClick={() => processManagerWithdrawal(withdrawal.id, "completed")}
                                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                                            size="sm"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Concluir
                                          </Button>
                                          <Button
                                            onClick={() =>
                                              processManagerWithdrawal(
                                                withdrawal.id,
                                                "cancelled",
                                                "Cancelado pelo administrador",
                                              )
                                            }
                                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                                            size="sm"
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Cancelar
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                        <div>
                                          <p className="text-slate-400 mb-1">Valor</p>
                                          <p className="text-emerald-400 font-bold text-lg">
                                            {formatCurrency(withdrawal.amount)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Chave PIX</p>
                                          <p className="font-mono text-white text-sm break-all">{withdrawal.pix_key}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Tipo</p>
                                          <p className="uppercase text-white">{withdrawal.pix_type}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Solicitado em</p>
                                          <p className="text-white text-sm">{formatDate(withdrawal.created_at)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <Clock className="h-20 w-20 text-slate-600 mx-auto mb-6" />
                                <p className="text-slate-400 text-lg">Nenhuma solicitação de saque pendente</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* Agentes */}
                {activeSection === "agents" && (
                  <div className="space-y-8">
                    {/* Header da seção de agentes */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
                          <div className="p-2 bg-purple-500/20 rounded-xl">
                            <Crown className="h-6 w-6 text-purple-400" />
                          </div>
                          <span>Gerenciar Agentes</span>
                        </h2>
                        <p className="text-slate-400 text-lg">Administre a rede de agentes</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={fetchAgentsData}
                        disabled={agentsLoading}
                        size="sm"
                        className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-300"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${agentsLoading ? "animate-spin" : ""}`} />
                        Atualizar Agentes
                      </Button>
                    </div>

                    {/* Campo de busca para agentes */}
                    <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <Input
                              placeholder="Buscar agente por nome, email ou código..."
                              value={agentSearchTerm}
                              onChange={(e) => setAgentSearchTerm(e.target.value)}
                              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                            />
                          </div>
                          {agentSearchTerm && (
                            <Button
                              onClick={() => setAgentSearchTerm("")}
                              variant="outline"
                              size="sm"
                              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Stats Cards dos Agentes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                              <Crown className="h-8 w-8 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Total de Agentes</p>
                              <p className="text-3xl font-bold text-white">{agents.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                              <Users className="h-8 w-8 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Total Afiliados</p>
                              <p className="text-3xl font-bold text-white">
                                {agents.reduce((sum, agent) => sum + Number(agent.total_affiliates || 0), 0)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl">
                              <DollarSign className="h-8 w-8 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Comissão Total</p>
                              <p className="text-3xl font-bold text-white">
                                {formatCurrency(
                                  agents.reduce((sum, agent) => sum + Number(agent.total_commission_earned || 0), 0),
                                )}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-amber-500/20 rounded-xl">
                              <Clock className="h-8 w-8 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Saques Pendentes</p>
                              <p className="text-3xl font-bold text-amber-400">{agentWithdrawals.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Tabs dos Agentes */}
                    <Tabs defaultValue="agents-list" className="space-y-6">
                      <TabsList className="bg-slate-800/50 border-slate-700 grid grid-cols-3 w-full">
                        <TabsTrigger
                          value="agents-list"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-400"
                        >
                          Agentes ({filteredAgents.length})
                        </TabsTrigger>
                        <TabsTrigger
                          value="create-agent"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-400"
                        >
                          Criar Agente
                        </TabsTrigger>
                        <TabsTrigger
                          value="agent-withdrawals"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-400"
                        >
                          Saques Pendentes ({agentWithdrawals.length})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="agents-list">
                        <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="text-white text-lg">Lista de Agentes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {agentsLoading ? (
                              <div className="flex items-center justify-center py-12">
                                <div className="text-center space-y-4">
                                  <RefreshCw className="h-12 w-12 animate-spin text-amber-500 mx-auto" />
                                  <span className="text-slate-400 text-lg">Carregando agentes...</span>
                                </div>
                              </div>
                            ) : filteredAgents.length > 0 ? (
                              <div className="space-y-6">
                                {filteredAgents.map((agent) => (
                                  <div
                                    key={agent.id}
                                    className="p-6 bg-slate-800/30 rounded-xl border border-slate-700/50"
                                  >
                                    <div className="flex flex-col gap-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-4 mb-3">
                                            <h3 className="font-bold text-white text-lg">{agent.user_name}</h3>
                                            {getStatusBadge(agent.status)}
                                          </div>
                                          <p className="text-slate-400 mb-4">{agent.user_email}</p>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            onClick={() => {
                                              setSelectedAgent(agent)
                                              setNewAgentCommissionRate(agent.commission_rate.toString())
                                            }}
                                            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                                            size="sm"
                                          >
                                            <Settings className="h-4 w-4 mr-1" />
                                            Editar
                                          </Button>
                                          <Button
                                            onClick={() => toggleAgentStatus(agent.id, agent.status)}
                                            disabled={actionLoading}
                                            variant="outline"
                                            size="sm"
                                            className={`border-slate-700 ${
                                              agent.status === "active"
                                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                                : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                            }`}
                                          >
                                            {agent.status === "active" ? (
                                              <>
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Desativar
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Ativar
                                              </>
                                            )}
                                          </Button>
                                          <Button
                                            onClick={() =>
                                              setDeleteConfirm({ type: "agent", id: agent.id, name: agent.user_name })
                                            }
                                            variant="outline"
                                            size="sm"
                                            className="border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                          >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Excluir
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                                        <div>
                                          <p className="text-slate-400 mb-1">Código</p>
                                          <p className="text-purple-400 font-mono font-medium">{agent.agent_code}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Comissão</p>
                                          <p className="font-medium text-white">{agent.commission_rate}%</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Afiliados</p>
                                          <p className="font-medium text-white">{agent.total_affiliates}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Ganhou</p>
                                          <p className="text-emerald-400 font-medium">
                                            {formatCurrency(agent.total_commission_earned)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Saldo Disponível</p>
                                          <p className="text-blue-400 font-medium">
                                            {formatCurrency(
                                              Number(agent.total_commission_earned || 0) -
                                                Number(agent.total_commission_paid || 0),
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <Crown className="h-20 w-20 text-slate-600 mx-auto mb-6" />
                                <p className="text-slate-400 text-lg mb-4">Nenhum agente cadastrado ainda</p>
                                <Button
                                  onClick={fetchAgentsData}
                                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                                >
                                  Carregar Agentes
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="create-agent">
                        <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="text-white text-lg">Criar Novo Agente</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="agentEmail" className="text-slate-300">
                                    Email do Usuário
                                  </Label>
                                  <Input
                                    id="agentEmail"
                                    type="email"
                                    value={newAgentEmail}
                                    onChange={(e) => setNewAgentEmail(e.target.value)}
                                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                                    placeholder="Digite o email do usuário"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="agentCommission" className="text-slate-300">
                                    Taxa de Comissão (%)
                                  </Label>
                                  <Input
                                    id="agentCommission"
                                    type="number"
                                    min="1"
                                    max="50"
                                    step="0.1"
                                    value={newAgentCommissionRate}
                                    onChange={(e) => setNewAgentCommissionRate(e.target.value)}
                                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                                    placeholder="10.0"
                                  />
                                </div>

                                <Button
                                  onClick={createAgent}
                                  disabled={createAgentLoading || !newAgentEmail}
                                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold h-12"
                                >
                                  {createAgentLoading ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Criando...
                                    </>
                                  ) : (
                                    <>
                                      <Crown className="h-4 w-4 mr-2" />
                                      Criar Agente
                                    </>
                                  )}
                                </Button>
                              </div>

                              <div className="bg-slate-800/30 rounded-lg p-6">
                                <h4 className="text-purple-400 font-bold mb-4">Informações Importantes</h4>
                                <ul className="text-gray-300 text-sm space-y-2">
                                  <li>• O usuário deve estar cadastrado no sistema</li>
                                  <li>• Agentes podem criar e gerenciar afiliados</li>
                                  <li>• Taxa padrão de comissão é 10%</li>
                                  <li>• Agentes acessam o painel em /agente</li>
                                  <li>• Apenas admins podem criar agentes</li>
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="agent-withdrawals">
                        <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="text-white text-lg">Solicitações de Saque de Agentes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {agentWithdrawals.length > 0 ? (
                              <div className="space-y-6">
                                {agentWithdrawals.map((withdrawal) => (
                                  <div
                                    key={withdrawal.id}
                                    className="p-6 bg-slate-800/30 rounded-xl border border-slate-700/50"
                                  >
                                    <div className="flex flex-col gap-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-4 mb-3">
                                            <h3 className="font-bold text-white text-lg">{withdrawal.agent_name}</h3>
                                            {getStatusBadge(withdrawal.status)}
                                          </div>
                                          <p className="text-slate-400 mb-4">{withdrawal.agent_email}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          <Button
                                            onClick={() => processAgentWithdrawal(withdrawal.id, "processing")}
                                            variant="outline"
                                            size="sm"
                                            className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                                          >
                                            <Settings className="h-4 w-4 mr-2" />
                                            Processar
                                          </Button>
                                          <Button
                                            onClick={() => processAgentWithdrawal(withdrawal.id, "completed")}
                                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                                            size="sm"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Concluir
                                          </Button>
                                          <Button
                                            onClick={() =>
                                              processAgentWithdrawal(
                                                withdrawal.id,
                                                "cancelled",
                                                "Cancelado pelo administrador",
                                              )
                                            }
                                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                                            size="sm"
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Cancelar
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                        <div>
                                          <p className="text-slate-400 mb-1">Valor</p>
                                          <p className="text-emerald-400 font-bold text-lg">
                                            {formatCurrency(withdrawal.amount)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Chave PIX</p>
                                          <p className="font-mono text-white text-sm break-all">{withdrawal.pix_key}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Tipo</p>
                                          <p className="uppercase text-white">{withdrawal.pix_type}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Solicitado em</p>
                                          <p className="text-white text-sm">{formatDate(withdrawal.created_at)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <Clock className="h-20 w-20 text-slate-600 mx-auto mb-6" />
                                <p className="text-slate-400 text-lg">Nenhuma solicitação de saque pendente</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* Afiliados */}
                {activeSection === "affiliates" && (
                  <div className="space-y-8">
                    {/* Header da seção de afiliados */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
                          <div className="p-2 bg-emerald-500/20 rounded-xl">
                            <UserCheck className="h-6 w-6 text-emerald-400" />
                          </div>
                          <span>Gerenciar Afiliados</span>
                        </h2>
                        <p className="text-slate-400 text-lg">Administre o programa de afiliados</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={fetchAffiliatesData}
                        disabled={affiliatesLoading}
                        size="sm"
                        className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-300"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${affiliatesLoading ? "animate-spin" : ""}`} />
                        Atualizar Afiliados
                      </Button>
                    </div>

                    {/* Campo de busca para afiliados */}
                    <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <Input
                              placeholder="Buscar afiliado por nome, email ou código..."
                              value={affiliateSearchTerm}
                              onChange={(e) => setAffiliateSearchTerm(e.target.value)}
                              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                            />
                          </div>
                          {affiliateSearchTerm && (
                            <Button
                              onClick={() => setAffiliateSearchTerm("")}
                              variant="outline"
                              size="sm"
                              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Stats Cards dos Afiliados */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                              <Users className="h-8 w-8 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Total de Afiliados</p>
                              <p className="text-3xl font-bold text-white">{totalAffiliates}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl">
                              <DollarSign className="h-8 w-8 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Comissão Total</p>
                              <p className="text-3xl font-bold text-white">{formatCurrency(totalCommissionEarned)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl">
                              <CheckCircle className="h-8 w-8 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Comissão Paga</p>
                              <p className="text-3xl font-bold text-emerald-400">{formatCurrency(totalCommissionPaid)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-amber-500/20 rounded-xl">
                              <Clock className="h-8 w-8 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Pendente</p>
                              <p className="text-3xl font-bold text-amber-400">{formatCurrency(pendingCommission)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Tabs dos Afiliados */}
                    <Tabs defaultValue="affiliates-list" className="space-y-6">
                      <TabsList className="bg-slate-800/50 border-slate-700 grid grid-cols-2 w-full">
                        <TabsTrigger
                          value="affiliates-list"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-400"
                        >
                          Afiliados ({filteredAffiliates.length})
                        </TabsTrigger>
                        <TabsTrigger
                          value="withdrawals-list"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-400"
                        >
                          Saques Pendentes ({withdrawals.length})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="affiliates-list">
                        <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="text-white text-lg">Lista de Afiliados</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {affiliatesLoading ? (
                              <div className="flex items-center justify-center py-12">
                                <div className="text-center space-y-4">
                                  <RefreshCw className="h-12 w-12 animate-spin text-amber-500 mx-auto" />
                                  <span className="text-slate-400 text-lg">Carregando afiliados...</span>
                                </div>
                              </div>
                            ) : filteredAffiliates.length > 0 ? (
                              <div className="space-y-6">
                                {filteredAffiliates.map((affiliate) => (
                                  <div
                                    key={affiliate.id}
                                    className="p-6 bg-slate-800/30 rounded-xl border border-slate-700/50"
                                  >
                                    <div className="flex flex-col gap-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-4 mb-3">
                                            <h3 className="font-bold text-white text-lg">{affiliate.user_name}</h3>
                                            {getStatusBadge(affiliate.status)}
                                          </div>
                                          <p className="text-slate-400 mb-4">{affiliate.user_email}</p>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            onClick={() => {
                                              setSelectedAffiliate(affiliate)
                                              setNewCommissionRate(affiliate.commission_rate.toString())
                                            }}
                                            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                                            size="sm"
                                          >
                                            <Settings className="h-4 w-4 mr-1" />
                                            Editar Taxa
                                          </Button>
                                          <Button
                                            onClick={() => setSelectedAffiliateForPasswordChange(affiliate)}
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                                            size="sm"
                                          >
                                            <KeyRound className="h-4 w-4 mr-1" />
                                            Alterar Senha
                                          </Button>
                                          <Button
                                            onClick={() => toggleAffiliateStatus(affiliate.id, affiliate.status)}
                                            disabled={actionLoading}
                                            variant="outline"
                                            size="sm"
                                            className={`border-slate-700 ${
                                              affiliate.status === "active"
                                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                                : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                            }`}
                                          >
                                            {affiliate.status === "active" ? (
                                              <>
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Desativar
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Ativar
                                              </>
                                            )}
                                          </Button>
                                          <Button
                                            onClick={() =>
                                              setDeleteConfirm({
                                                type: "affiliate",
                                                id: affiliate.id,
                                                name: affiliate.user_name,
                                              })
                                            }
                                            variant="outline"
                                            size="sm"
                                            className="border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                          >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Excluir
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                                        <div>
                                          <p className="text-slate-400 mb-1">Código</p>
                                          <p className="text-emerald-400 font-mono font-medium">
                                            {affiliate.affiliate_code}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Comissão</p>
                                          <p className="font-medium text-white">{affiliate.commission_rate}%</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Indicações</p>
                                          <p className="font-medium text-white">{affiliate.total_referrals}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Ganhou</p>
                                          <p className="text-emerald-400 font-medium">
                                            {formatCurrency(affiliate.total_commission_earned)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-400 mb-1">Saldo Disponível</p>
                                          <p className="text-blue-400 font-medium">
                                            {formatCurrency(
                                              Number(affiliate.total_commission_earned || 0) -
                                                Number(affiliate.total_commission_paid || 0),
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Users className="h-20 w-20 text-slate-600 mx-auto mb-6" />
                            <p className="text-slate-400 text-lg mb-4">Nenhum afiliado cadastrado ainda</p>
                            <Button
                              onClick={fetchAffiliatesData}
                              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                            >
                              Carregar Afiliados
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="withdrawals-list">
                    <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">Solicitações de Saque</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {withdrawals.length > 0 ? (
                          <div className="space-y-6">
                            {withdrawals.map((withdrawal) => (
                              <div
                                key={withdrawal.id}
                                className="p-6 bg-slate-800/30 rounded-xl border border-slate-700/50"
                              >
                                <div className="flex flex-col gap-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-4 mb-3">
                                        <h3 className="font-bold text-white text-lg">{withdrawal.affiliate_name}</h3>
                                        {getStatusBadge(withdrawal.status)}
                                      </div>
                                      <p className="text-slate-400 mb-4">{withdrawal.affiliate_email}</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <Button
                                        onClick={() => processWithdrawal(withdrawal.id, "processing")}
                                        variant="outline"
                                        size="sm"
                                        className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                                      >
                                        <Settings className="h-4 w-4 mr-2" />
                                        Processar
                                      </Button>
                                      <Button
                                        onClick={() => processWithdrawal(withdrawal.id, "completed")}
                                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                                        size="sm"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Concluir
                                      </Button>
                                      <Button
                                        onClick={() =>
                                          processWithdrawal(
                                            withdrawal.id,
                                            "cancelled",
                                            "Cancelado pelo administrador",
                                          )
                                        }
                                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                                        size="sm"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                    <div>
                                      <p className="text-slate-400 mb-1">Valor</p>
                                      <p className="text-emerald-400 font-bold text-lg">
                                        {formatCurrency(withdrawal.amount)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-slate-400 mb-1">Chave PIX</p>
                                      <p className="font-mono text-white text-sm break-all">{withdrawal.pix_key}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-400 mb-1">Tipo</p>
                                      <p className="uppercase text-white">{withdrawal.pix_type}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-400 mb-1">Solicitado em</p>
                                      <p className="text-white text-sm">{formatDate(withdrawal.created_at)}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Clock className="h-20 w-20 text-slate-600 mx-auto mb-6" />
                            <p className="text-slate-400 text-lg">Nenhuma solicitação de saque pendente</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Configurações */}
            {activeSection === "settings" && (
              <div className="space-y-8">
                {/* Header da seção de configurações */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/20 rounded-xl">
                        <Settings className="h-6 w-6 text-blue-400" />
                      </div>
                      <span>Configurações do Sistema</span>
                    </h2>
                    <p className="text-slate-400 text-lg">Configure limites de depósitos e saques</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={fetchSettings}
                    disabled={settingsLoading}
                    size="sm"
                    className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-300"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${settingsLoading ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                </div>

                {settingsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-4">
                      <RefreshCw className="h-12 w-12 animate-spin text-amber-500 mx-auto" />
                      <span className="text-slate-400 text-lg">Carregando configurações...</span>
                    </div>
                  </div>
                ) : settings ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Configurações de Depósito */}
                    <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-3 text-lg">
                          <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                          </div>
                          <span>Limites de Depósito</span>
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-sm">
                          Configure os valores mínimo e máximo para depósitos
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="minDeposit" className="text-slate-300">
                              Valor Mínimo (R$)
                            </Label>
                            <Input
                              id="minDeposit"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={newMinDeposit}
                              onChange={(e) => setNewMinDeposit(e.target.value)}
                              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                              placeholder="1.00"
                            />
                            <p className="text-xs text-slate-400 mt-1">Atual: {formatCurrency(settings.min_deposit)}</p>
                          </div>

                          <div>
                            <Label htmlFor="maxDeposit" className="text-slate-300">
                              Valor Máximo (R$)
                            </Label>
                            <Input
                              id="maxDeposit"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={newMaxDeposit}
                              onChange={(e) => setNewMaxDeposit(e.target.value)}
                              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                              placeholder="10000.00"
                            />
                            <p className="text-xs text-slate-400 mt-1">Atual: {formatCurrency(settings.max_deposit)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Configurações de Saque */}
                    <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-3 text-lg">
                          <div className="p-2 bg-red-500/20 rounded-lg">
                            <TrendingDown className="h-5 w-5 text-red-400" />
                          </div>
                          <span>Limites de Saque</span>
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-sm">
                          Configure os valores mínimo e máximo para saques
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="minWithdraw" className="text-slate-300">
                              Valor Mínimo (R$)
                            </Label>
                            <Input
                              id="minWithdraw"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={newMinWithdraw}
                              onChange={(e) => setNewMinWithdraw(e.target.value)}
                              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-red-500/20"
                              placeholder="10.00"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                              Atual: {formatCurrency(settings.min_withdraw)}
                            </p>
                          </div>

                          <div>
                            <Label htmlFor="maxWithdraw" className="text-slate-300">
                              Valor Máximo (R$)
                            </Label>
                            <Input
                              id="maxWithdraw"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={newMaxWithdraw}
                              onChange={(e) => setNewMaxWithdraw(e.target.value)}
                              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-red-500/20"
                              placeholder="5000.00"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                              Atual: {formatCurrency(settings.max_withdraw)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Botão de Salvar */}
                    <div className="lg:col-span-2">
                      <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-white font-semibold text-lg mb-2">Salvar Configurações</h3>
                              <p className="text-slate-400 text-sm">
                                As alterações serão aplicadas imediatamente em todo o sistema
                              </p>
                            </div>
                            <Button
                              onClick={updateSettings}
                              disabled={
                                updateSettingsLoading ||
                                !newMinDeposit ||
                                !newMaxDeposit ||
                                !newMinWithdraw ||
                                !newMaxWithdraw
                              }
                              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-8 py-3"
                            >
                              {updateSettingsLoading ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Salvar Configurações
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Informações Importantes */}
                    <div className="lg:col-span-2">
                      <Alert className="border-blue-500/50 bg-blue-500/10">
                        <Info className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-400 text-sm">
                          <strong>Importante:</strong> As configurações afetam diretamente as validações de depósito e
                          saque. Certifique-se de que os valores estão corretos antes de salvar.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <Settings className="h-16 w-16 text-slate-600 mx-auto mb-6" />
                    <p className="text-slate-400 text-xl mb-6">Erro ao carregar configurações</p>
                    <Button
                      onClick={fetchSettings}
                      className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Reset */}
            {activeSection === "reset" && (
              <div className="space-y-8">
                <Card className="border-red-500/50 bg-red-500/5 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-red-400 flex items-center space-x-3 text-lg">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <span>Reset do Sistema</span>
                    </CardTitle>
                    <CardDescription className="text-red-300 text-sm">
                      ⚠️ ATENÇÃO: Esta ação irá resetar todos os dados do sistema, exceto usuários cadastrados. Serão
                      removidos: transações, jogadas, prêmios, logs de webhook e saldos das carteiras.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <Alert className="border-red-500/50 bg-red-500/10">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-400 text-sm">
                        Esta ação é irreversível! Todos os dados financeiros e de jogos serão perdidos permanentemente. Os
                        usuários serão mantidos, mas com saldo zerado.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="resetPassword" className="text-red-300 font-semibold text-lg">
                          Senha de Reset (obrigatória)
                        </Label>
                        <Input
                          id="resetPassword"
                          type="password"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          placeholder="Digite a senha de reset"
                          className="bg-slate-800/50 border-red-500/50 text-white placeholder:text-slate-500 focus:border-red-400 focus:ring-red-400/20 h-12"
                        />
                      </div>

                      {resetError && (
                        <Alert className="border-red-500/50 bg-red-500/10">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          <AlertDescription className="text-red-400">{resetError}</AlertDescription>
                        </Alert>
                      )}

                      <div className="bg-red-500/10 p-6 rounded-xl border border-red-500/30">
                        <h4 className="font-semibold text-red-300 mb-4 text-lg">O que será resetado:</h4>
                        <ul className="text-sm text-red-400 space-y-2 mb-6">
                          <li>• Todas as transações (depósitos, saques, jogadas)</li>
                          <li>• Histórico de jogos e prêmios</li>
                          <li>• Logs de webhooks</li>
                          <li>• Saldos das carteiras (zerados)</li>
                          <li>• Estatísticas financeiras</li>
                        </ul>

                        <h4 className="font-semibold text-red-300 mb-4 text-lg">O que será mantido:</h4>
                        <ul className="text-sm text-red-400 space-y-2">
                          <li>• Contas de usuários</li>
                          <li>• Senhas e dados de login</li>
                          <li>• Configurações do sistema</li>
                        </ul>
                      </div>

                      <Button
                        onClick={handleReset}
                        disabled={!resetPassword || isResetting}
                        className="w-full h-14 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                      >
                        {isResetting ? (
                          <>
                            <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                            Resetando Sistema...
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-5 w-5 mr-3" />
                            RESETAR SISTEMA
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-6" />
            <p className="text-slate-400 text-xl mb-6">Erro ao carregar estatísticas</p>
            <Button
              onClick={fetchStats}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              Tentar Novamente
            </Button>
          </div>
        )}
      </div>
    </SidebarInset>
  </div>

  {/* Todos os modais permanecem iguais */}
  {/* Modal para editar gerente */}
  {selectedManager && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-slate-800/50 bg-slate-900/90 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white text-xl">Editar Gerente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-white">
              Gerente: <strong className="text-yellow-400">{selectedManager.user_name}</strong>
            </p>
            <p className="text-sm text-slate-400">
              Taxa atual: <span className="text-white font-medium">{selectedManager.commission_rate}%</span>
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="newManagerRate" className="text-slate-300">
              Nova Taxa (%)
            </Label>
            <Input
              id="newManagerRate"
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={newManagerCommissionRate}
              onChange={(e) => setNewManagerCommissionRate(e.target.value)}
              placeholder="Ex: 7.5"
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-yellow-500 focus:ring-yellow-500/20 h-12"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={updateManagerCommissionRate}
              disabled={updateLoading || !newManagerCommissionRate}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white h-12"
            >
              {updateLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
            <Button
              onClick={() => {
                setSelectedManager(null)
                setNewManagerCommissionRate("")
              }}
              variant="outline"
              className="flex-1 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white h-12"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )}

  {/* Modal para editar agente */}
  {selectedAgent && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-slate-800/50 bg-slate-900/90 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white text-xl">Editar Agente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-white">
              Agente: <strong className="text-purple-400">{selectedAgent.user_name}</strong>
            </p>
            <p className="text-sm text-slate-400">
              Taxa atual: <span className="text-white font-medium">{selectedAgent.commission_rate}%</span>
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="newAgentRate" className="text-slate-300">
              Nova Taxa (%)
            </Label>
            <Input
              id="newAgentRate"
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={newAgentCommissionRate}
              onChange={(e) => setNewAgentCommissionRate(e.target.value)}
              placeholder="Ex: 15.0"
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 h-12"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={updateAgentCommissionRate}
              disabled={updateLoading || !newAgentCommissionRate}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white h-12"
            >
              {updateLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
            <Button
              onClick={() => {
                setSelectedAgent(null)
                setNewAgentCommissionRate("")
              }}
              variant="outline"
              className="flex-1 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white h-12"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )}

  {/* Modal para editar afiliado */}
  {selectedAffiliate && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-slate-800/50 bg-slate-900/90 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white text-xl">Editar Taxa de Comissão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-white">
              Afiliado: <strong className="text-emerald-400">{selectedAffiliate.user_name}</strong>
            </p>
            <p className="text-sm text-slate-400">
              Taxa atual: <span className="text-white font-medium">{selectedAffiliate.commission_rate}%</span>
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="newRate" className="text-slate-300">
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
              placeholder="Ex: 5.0"
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-12"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={updateCommissionRate}
              disabled={updateLoading || !newCommissionRate}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white h-12"
            >
              {updateLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
            <Button
              onClick={() => {
                setSelectedAffiliate(null)
                setNewCommissionRate("")
              }}
              variant="outline"
              className="flex-1 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white h-12"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )}

  {/* Modal para alterar senha do afiliado */}
  {selectedAffiliateForPasswordChange && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-slate-800/50 bg-slate-900/90 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white text-xl">Alterar Senha do Afiliado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-white">
              Afiliado: <strong className="text-blue-400">{selectedAffiliateForPasswordChange.user_name}</strong>
            </p>
            <p className="text-sm text-slate-400">{selectedAffiliateForPasswordChange.user_email}</p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="newPassword" className="text-slate-300">
              Nova Senha
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={newAffiliatePassword}
              onChange={(e) => setNewAffiliatePassword(e.target.value)}
              placeholder="Digite a nova senha"
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 h-12"
            />
            <p className="text-xs text-slate-400">A senha deve ter pelo menos 6 caracteres</p>
          </div>

          {passwordChangeError && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400 text-sm">{passwordChangeError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 pt-4">
            <Button
              onClick={updateAffiliatePassword}
              disabled={isUpdatingAffiliatePassword || !newAffiliatePassword}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12"
            >
              {isUpdatingAffiliatePassword ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Alterar Senha
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setSelectedAffiliateForPasswordChange(null)
                setNewAffiliatePassword("")
                setPasswordChangeError("")
              }}
              variant="outline"
              className="flex-1 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white h-12"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )}

  {/* Modal de confirmação de exclusão */}
  {deleteConfirm && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-red-500/50 bg-slate-900/90 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-red-400 text-xl flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5" />
            <span>Confirmar Exclusão</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-white">
              Tem certeza que deseja excluir{" "}
              {deleteConfirm.type === "manager"
                ? "o gerente"
                : deleteConfirm.type === "agent"
                  ? "o agente"
                  : "o afiliado"}{" "}
              <strong className="text-red-400">{deleteConfirm.name}</strong>?
            </p>
            <p className="text-sm text-slate-400">
              Esta ação não pode ser desfeita. Todos os dados relacionados serão removidos permanentemente.
            </p>
          </div>

          <div className="flex gap
