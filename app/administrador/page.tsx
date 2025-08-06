"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Copy,
  CreditCard,
  DollarSign,
  RefreshCw,
  Wallet,
  QrCode,
  LogOut,
  TrendingUp,
  TrendingDown,
  Bug,
  Play,
  Info,
  Shield,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { AuthClient } from "@/lib/auth-client"

// Credenciais administrativas
const ADMIN_USERNAME = "sniperbuda"
const ADMIN_PASSWORD = "Seilaqual@"

interface UserProfile {
  user: {
    id: number
    email: string
    name: string
    client_key?: string
  }
  wallet: {
    balance: string | number
  }
  stats: {
    successful_deposits: number
    successful_withdraws: number
    total_deposited: string | number
    total_withdrawn: string | number
    total_transactions: number
  }
  recent_transactions: Transaction[]
}

interface Transaction {
  id: number
  type: "deposit" | "withdraw"
  amount: string | number
  status: string
  external_id?: number
  payer_name?: string
  pix_key?: string
  created_at: string
}

interface AuthResponse {
  access_token: string
}

interface PaymentOrder {
  copy_past: string
  external_id: number
  payer_name: string
  payment: string
  status: number
}

interface WithdrawResponse {
  message: string
  external_id: number
  end_to_end_id: string
  amount: number
  status: string
}

// Função utilitária para formatar valores monetários
const formatCurrency = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return "0.00"
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue) ? "0.00" : numValue.toFixed(2)
}

// Função utilitária para converter para número
const toNumber = (value: string | number | undefined | null): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  const parsed = Number.parseFloat(value.toString())
  return isNaN(parsed) ? 0 : parsed
}

export default function HorsePayDashboard() {
  // Estados de autenticação administrativa
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminUsername, setAdminUsername] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminLoginError, setAdminLoginError] = useState("")

  // Estados de autenticação do usuário
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showLogin, setShowLogin] = useState(true)

  // Estados de login/registro
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")

  // Estados da API HorsePay
  const [accessToken, setAccessToken] = useState<string>("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)

  // Estados dos formulários
  const [payerName, setPayerName] = useState("")
  const [amount, setAmount] = useState("")
  const [callbackUrl, setCallbackUrl] = useState("https://v0-raspadinhacomcontademo.vercel.app/api/webhook/horsepay")
  const [splitUser, setSplitUser] = useState("")
  const [splitPercent, setSplitPercent] = useState("")

  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [pixKey, setPixKey] = useState("")
  const [pixType, setPixType] = useState("")
  const [withdrawCallbackUrl, setWithdrawCallbackUrl] = useState(
    "https://v0-raspadinhacomcontademo.vercel.app/api/webhook/horsepay",
  )

  // Estados de resultados
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null)
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResponse | null>(null)
  const [webhookLogs, setWebhookLogs] = useState<any[]>([])
  const [authError, setAuthError] = useState<string>("")

  // Função de login administrativo
  const handleAdminLogin = async () => {
    setAdminLoginError("")

    if (adminUsername === ADMIN_USERNAME && adminPassword === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true)
      toast({
        title: "Acesso Administrativo Concedido",
        description: "Bem-vindo ao painel administrativo!",
      })
    } else {
      setAdminLoginError("Credenciais administrativas inválidas")
      toast({
        title: "Erro de Autenticação",
        description: "Usuário ou senha incorretos",
        variant: "destructive",
      })
    }
  }

  // Função de logout administrativo
  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false)
    setAdminUsername("")
    setAdminPassword("")
    setIsLoggedIn(false)
    setUserProfile(null)
    setIsAuthenticated(false)
    setAccessToken("")
    AuthClient.removeToken()
  }

  // Verificar se já está logado ao carregar a página
  useEffect(() => {
    const token = AuthClient.getToken()
    if (token && isAdminAuthenticated) {
      console.log("Token encontrado no localStorage, fazendo login automático") // Debug
      setIsLoggedIn(true)
      fetchUserProfile()
    }
  }, [isAdminAuthenticated])

  // Função de login
  const handleLogin = async () => {
    setLoading(true)
    setAuthError("")
    try {
      console.log("Iniciando login para:", email) // Debug

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: email }), // Simplificado para demo
        credentials: "include",
      })

      const data = await response.json()
      console.log("Resposta do login:", data) // Debug

      if (response.ok && data.success) {
        // Armazenar token no localStorage
        if (data.token) {
          AuthClient.setToken(data.token)
          console.log("Token armazenado no localStorage") // Debug
        }

        setIsLoggedIn(true)

        // Aguardar um pouco e buscar perfil
        setTimeout(async () => {
          await fetchUserProfile()
        }, 500)

        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao HorsePay Dashboard.",
        })
      } else {
        throw new Error(data.error || "Falha no login")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      setAuthError(errorMessage)
      console.error("Erro no login:", error) // Debug
      toast({
        title: "Erro no login",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Função de registro
  const handleRegister = async () => {
    setLoading(true)
    setAuthError("")
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Conta criada com sucesso!",
          description: "Agora você pode fazer login.",
        })
        setShowLogin(true)
        // Limpar campos
        setEmail("")
        setName("")
      } else {
        throw new Error(data.error || "Falha no registro")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      setAuthError(errorMessage)
      toast({
        title: "Erro no registro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Buscar perfil do usuário
  const fetchUserProfile = async () => {
    try {
      console.log("Buscando perfil do usuário...") // Debug

      const response = await AuthClient.makeAuthenticatedRequest("/api/user/profile")
      console.log("Status da resposta do perfil:", response.status) // Debug

      if (response.ok) {
        const profile = await response.json()
        console.log("Perfil carregado:", profile) // Debug
        setUserProfile(profile)
      } else {
        const errorData = await response.json()
        console.error("Erro ao buscar perfil:", errorData)

        if (response.status === 401) {
          // Token inválido ou expirado, fazer logout
          handleLogout()
          toast({
            title: "Sessão expirada",
            description: "Faça login novamente.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error)
      setAuthError("Erro ao carregar perfil do usuário")
    }
  }

  // Debug da carteira
  const debugWallet = async () => {
    try {
      console.log("🔍 Iniciando debug da carteira...")
      const response = await AuthClient.makeAuthenticatedRequest("/api/debug/wallet")

      if (response.ok) {
        const debugData = await response.json()
        console.log("🔍 Debug da carteira:", debugData)

        toast({
          title: "Debug da Carteira",
          description: `Saldo: R$ ${formatCurrency(debugData.wallet?.balance)} | Transações: ${debugData.debug_info?.total_transactions}`,
        })
      } else {
        throw new Error("Erro ao fazer debug da carteira")
      }
    } catch (error) {
      console.error("❌ Erro no debug:", error)
      toast({
        title: "Erro no Debug",
        description: "Não foi possível fazer debug da carteira",
        variant: "destructive",
      })
    }
  }

  // Processar transação manualmente
  const processTransaction = async (externalId: number) => {
    try {
      console.log(`🔄 Processando transação ${externalId} manualmente...`)
      const response = await AuthClient.makeAuthenticatedRequest(`/api/transactions/${externalId}/process`, {
        method: "POST",
      })

      const data = await response.json()
      console.log("🔄 Resultado do processamento:", data)

      if (data.success) {
        toast({
          title: "Transação Processada!",
          description: `Transação ${externalId} foi processada com sucesso`,
        })

        // Atualizar perfil após o processamento
        setTimeout(() => {
          fetchUserProfile()
          fetchWebhookLogs()
        }, 1000)
      } else {
        throw new Error(data.message || "Erro no processamento da transação")
      }
    } catch (error) {
      console.error("❌ Erro no processamento:", error)
      toast({
        title: "Erro no Processamento",
        description: error instanceof Error ? error.message : "Não foi possível processar a transação",
        variant: "destructive",
      })
    }
  }

  // Testar webhook
  const testWebhook = async () => {
    try {
      console.log("🧪 Testando webhook...")
      const response = await fetch("/api/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()
      console.log("🧪 Resultado do teste:", data)

      if (data.success) {
        toast({
          title: "🎉 Creditação Automática Testada!",
          description: `ID: ${data.test_payload.external_id} | Status: "${data.test_payload.status}" → Saldo creditado automaticamente!`,
        })

        // Atualizar perfil após o teste
        setTimeout(() => {
          fetchUserProfile()
          fetchWebhookLogs()
        }, 1000)
      } else {
        throw new Error(data.error || "Erro no teste do webhook")
      }
    } catch (error) {
      console.error("❌ Erro no teste do webhook:", error)
      toast({
        title: "Erro no Teste",
        description: "Não foi possível testar o webhook",
        variant: "destructive",
      })
    }
  }

  // Autenticar com a API HorsePay
  const authenticateHorsePay = async () => {
    console.log("🔄 Iniciando autenticação automática HorsePay...")

    setLoading(true)

    try {
      const response = await fetch("/api/horsepay/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success && data.access_token) {
        setAccessToken(data.access_token)
        setIsAuthenticated(true)
        console.log("🎉 Autenticação automática bem-sucedida!")
        toast({
          title: "Conectado à API HorsePay!",
          description: "Conexão automática realizada com sucesso.",
        })
      } else {
        throw new Error(data.error || "Erro na autenticação")
      }
    } catch (error) {
      console.error("❌ Erro na autenticação HorsePay:", error)
      toast({
        title: "Erro na autenticação HorsePay",
        description: "Erro na conexão automática. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Criar pedido de pagamento
  const createPaymentOrder = async () => {
    const amountNum = Number.parseFloat(amount)

    if (amountNum <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor deve ser maior que zero.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const body: any = {
        payer_name: payerName,
        amount: amountNum,
        callback_url: "https://v0-raspadinhacomcontademo.vercel.app/api/webhook/horsepay",
      }

      if (splitUser && splitPercent) {
        body.split = [{ user: splitUser, percent: Number.parseFloat(splitPercent) }]
      }

      console.log("📤 Criando pedido na API HorsePay:", body)

      // Criar na API HorsePay
      const horsePayResponse = await fetch("https://api.horsepay.io/transaction/neworder", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      console.log("📥 Resposta da API HorsePay:", horsePayResponse.status)

      if (horsePayResponse.ok) {
        const data: PaymentOrder = await horsePayResponse.json()
        console.log("📋 Pedido criado:", data)
        setPaymentOrder(data)

        // Salvar no banco local
        console.log("💾 Salvando transação no banco local...")
        const localResponse = await AuthClient.makeAuthenticatedRequest("/api/transactions", {
          method: "POST",
          body: JSON.stringify({
            type: "deposit",
            amount: amountNum,
            external_id: data.external_id,
            payer_name: payerName,
            callback_url: "https://v0-raspadinhacomcontademo.vercel.app/api/webhook/horsepay",
            qr_code: data.payment,
            copy_paste_code: data.copy_past,
          }),
        })

        console.log("💾 Resposta do banco local:", localResponse.status)

        toast({
          title: "Pedido criado com sucesso!",
          description: `ID do pedido: ${data.external_id}`,
        })

        await fetchUserProfile() // Atualizar perfil
      } else {
        const errorText = await horsePayResponse.text()
        console.error("❌ Erro na API HorsePay:", errorText)
        throw new Error(`Falha ao criar pedido: ${errorText}`)
      }
    } catch (error) {
      console.error("❌ Erro ao criar pedido:", error)
      toast({
        title: "Erro ao criar pedido",
        description: error instanceof Error ? error.message : "Verifique os dados e tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Solicitar saque
  const requestWithdraw = async () => {
    const withdrawAmountNum = Number.parseFloat(withdrawAmount)
    const currentBalance = toNumber(userProfile?.wallet.balance)

    if (!userProfile || currentBalance < withdrawAmountNum) {
      toast({
        title: "Saldo insuficiente",
        description: `Seu saldo atual é R$ ${formatCurrency(currentBalance)}`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Criar na API HorsePay
      const horsePayResponse = await fetch("https://api.horsepay.io/transaction/withdraw", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: withdrawAmountNum,
          pix_key: pixKey,
          pix_type: pixType,
          callback_url: "https://v0-raspadinhacomcontademo.vercel.app/api/webhook/horsepay",
        }),
      })

      if (horsePayResponse.ok) {
        const data: WithdrawResponse = await horsePayResponse.json()
        setWithdrawResult(data)

        // Salvar no banco local
        await AuthClient.makeAuthenticatedRequest("/api/transactions", {
          method: "POST",
          body: JSON.stringify({
            type: "withdraw",
            amount: withdrawAmountNum,
            external_id: data.external_id,
            pix_key: pixKey,
            pix_type: pixType,
            callback_url: "https://v0-raspadinhacomcontademo.vercel.app/api/webhook/horsepay",
          }),
        })

        toast({
          title: "Saque solicitado com sucesso!",
          description: `ID do saque: ${data.external_id}`,
        })

        await fetchUserProfile() // Atualizar perfil
      } else {
        throw new Error("Falha ao solicitar saque")
      }
    } catch (error) {
      toast({
        title: "Erro ao solicitar saque",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchWebhookLogs = async () => {
    try {
      const response = await fetch("/api/webhook/horsepay")
      if (response.ok) {
        const data = await response.json()
        setWebhookLogs(data.logs)
      }
    } catch (error) {
      console.error("Erro ao buscar logs:", error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência.",
    })
  }

  // Função de logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch (error) {
      console.error("Erro no logout:", error)
    }

    // Limpar dados locais
    AuthClient.removeToken()
    setIsLoggedIn(false)
    setUserProfile(null)
    setIsAuthenticated(false)
    setAccessToken("")
    setAuthError("")
  }

  useEffect(() => {
    if (isLoggedIn && isAdminAuthenticated) {
      fetchUserProfile()
      fetchWebhookLogs()

      // Conectar automaticamente à HorsePay após login
      setTimeout(() => {
        authenticateHorsePay()
      }, 1000)

      const interval = setInterval(() => {
        fetchUserProfile()
        fetchWebhookLogs()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [isLoggedIn, isAdminAuthenticated])

  // Tela de login administrativo
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-red-900">Acesso Administrativo</CardTitle>
            <CardDescription className="text-red-700">
              Esta área é restrita. Insira suas credenciais administrativas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminUsername">Usuário</Label>
              <Input
                id="adminUsername"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Nome de usuário"
                className="border-red-200 focus:border-red-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Senha</Label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Senha administrativa"
                className="border-red-200 focus:border-red-400"
                onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
              />
            </div>

            {adminLoginError && (
              <Alert variant="destructive">
                <AlertDescription>{adminLoginError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleAdminLogin}
              disabled={!adminUsername || !adminPassword}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Entrar
            </Button>

            <div className="text-center text-sm text-red-600 bg-red-50 p-3 rounded">
              <p>⚠️ Área restrita para administradores</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela de login/registro do usuário (após autenticação admin)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-between items-center mb-2">
              <div></div>
              <Button variant="ghost" size="sm" onClick={handleAdminLogout} className="text-red-600 hover:text-red-700">
                <LogOut className="h-4 w-4 mr-1" />
                Sair Admin
              </Button>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">HorsePay Dashboard</CardTitle>
            <CardDescription>
              {showLogin ? "Faça login para acessar sua conta" : "Crie sua conta no HorsePay"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>

            {authError && (
              <Alert variant="destructive">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            {!showLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
            )}

            <Button
              onClick={showLogin ? handleLogin : handleRegister}
              disabled={loading || !email || (!showLogin && !name)}
              className="w-full"
            >
              {loading ? "Processando..." : showLogin ? "Entrar" : "Criar Conta"}
            </Button>

            <Button variant="ghost" onClick={() => setShowLogin(!showLogin)} className="w-full">
              {showLogin ? "Não tem conta? Registre-se" : "Já tem conta? Faça login"}
            </Button>

            {showLogin && (
              <div className="text-center text-sm text-gray-500">
                <p>
                  Para testar, use: <strong>teste@horsepay.com</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header com perfil */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              HorsePay Dashboard
              <Badge variant="destructive" className="ml-2">
                ADMIN
              </Badge>
            </h1>
            <p className="text-gray-600">Gerencie seus pagamentos e saques via Pix</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Card de saldo */}
            <Card className="px-4 py-2">
              <div className="flex items-center space-x-2">
                <Wallet className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Saldo:</span>
                <span className="text-lg font-bold text-green-600">
                  R$ {formatCurrency(userProfile?.wallet.balance)}
                </span>
                <Button variant="ghost" size="sm" onClick={fetchUserProfile} disabled={loading}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* Perfil do usuário */}
            <Card className="px-4 py-2">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    {userProfile?.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{userProfile?.user.name}</span>
                  <span className="text-xs text-gray-500">{userProfile?.user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleAdminLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Informação sobre política de taxas */}
        <Alert className="border-green-200 bg-green-50">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>✅ Sem taxas para você!</strong> Absorvemos todas as taxas da HorsePay. Você sempre recebe o valor
            integral que depositar.
          </AlertDescription>
        </Alert>

        {/* Estatísticas do usuário */}
        {userProfile && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Depósitos</p>
                    <p className="text-lg font-bold">{userProfile.stats.successful_deposits}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Saques</p>
                    <p className="text-lg font-bold">{userProfile.stats.successful_withdraws}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Depositado</p>
                    <p className="text-lg font-bold">R$ {formatCurrency(userProfile.stats.total_deposited)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Transações</p>
                    <p className="text-lg font-bold">{userProfile.stats.total_transactions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ferramentas de Debug */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bug className="h-5 w-5" />
              <span>Ferramentas de Debug</span>
            </CardTitle>
            <CardDescription>
              🚀 PROCESSO 100% AUTOMÁTICO: Usuário sempre recebe o valor integral (absorvemos as taxas)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Button onClick={testWebhook} variant="outline">
              🧪 Testar Creditação Automática (ID: 1154206)
            </Button>
            <Button onClick={debugWallet} variant="outline">
              🔍 Debug Carteira
            </Button>
            <Button onClick={fetchUserProfile} variant="outline">
              🔄 Atualizar Perfil
            </Button>
          </CardContent>
        </Card>

        {isLoggedIn && (
          <Tabs defaultValue="payment" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="payment">Criar Pagamento</TabsTrigger>
              <TabsTrigger value="withdraw">Solicitar Saque</TabsTrigger>
              <TabsTrigger value="transactions">Transações</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="results">Resultados</TabsTrigger>
            </TabsList>

            {/* Aba de Pagamentos */}
            <TabsContent value="payment">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Criar Pedido de Pagamento</span>
                  </CardTitle>
                  <CardDescription>
                    Gere um código Pix para receber pagamentos. O usuário sempre recebe o valor integral!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payerName">Nome do Pagador</Label>
                      <Input
                        id="payerName"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Valor (R$)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                      />
                      <div className="text-xs text-green-600">
                        <strong>✅ O usuário receberá exatamente este valor!</strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="callbackUrl">URL de Callback</Label>
                    <Input
                      id="callbackUrl"
                      value={callbackUrl}
                      onChange={(e) => setCallbackUrl(e.target.value)}
                      placeholder="https://seu-webhook.com/callback"
                    />
                  </div>

                  <Button
                    onClick={createPaymentOrder}
                    disabled={loading || !payerName || !amount || Number.parseFloat(amount) <= 0}
                    className="w-full"
                  >
                    {loading ? "Criando..." : "Criar Pedido"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Saques */}
            <TabsContent value="withdraw">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Solicitar Saque</span>
                  </CardTitle>
                  <CardDescription>
                    Realize saques via Pix (Saldo disponível: R$ {formatCurrency(userProfile?.wallet.balance)})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="withdrawAmount">Valor (R$)</Label>
                      <Input
                        id="withdrawAmount"
                        type="number"
                        step="0.01"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        max={toNumber(userProfile?.wallet.balance)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pixType">Tipo de Chave Pix</Label>
                      <Select value={pixType} onValueChange={setPixType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CPF">CPF</SelectItem>
                          <SelectItem value="CNPJ">CNPJ</SelectItem>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="PHONE">Telefone</SelectItem>
                          <SelectItem value="RANDOM">Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pixKey">Chave Pix</Label>
                    <Input
                      id="pixKey"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Sua chave Pix"
                    />
                  </div>

                  <Button
                    onClick={requestWithdraw}
                    disabled={loading || !withdrawAmount || !pixKey || !pixType}
                    className="w-full"
                  >
                    {loading ? "Processando..." : "Solicitar Saque"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Transações */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Transações</CardTitle>
                  <CardDescription>Suas últimas transações</CardDescription>
                </CardHeader>
                <CardContent>
                  {!userProfile?.recent_transactions || userProfile.recent_transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Nenhuma transação encontrada</div>
                  ) : (
                    <div className="space-y-4">
                      {userProfile.recent_transactions.map((transaction) => (
                        <Card key={transaction.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`p-2 rounded-full ${
                                    transaction.type === "deposit" ? "bg-green-100" : "bg-red-100"
                                  }`}
                                >
                                  {transaction.type === "deposit" ? (
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-red-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{transaction.type === "deposit" ? "Depósito" : "Saque"}</p>
                                  <p className="text-sm text-gray-500">
                                    {transaction.payer_name || transaction.pix_key || "N/A"}
                                  </p>
                                  <p className="text-xs text-gray-400">ID: {transaction.external_id}</p>
                                </div>
                              </div>
                              <div className="text-right flex items-center space-x-2">
                                <div>
                                  <p
                                    className={`font-bold ${
                                      transaction.type === "deposit" ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {transaction.type === "deposit" ? "+" : "-"}R$ {formatCurrency(transaction.amount)}
                                  </p>
                                  <Badge
                                    variant={
                                      transaction.status === "success"
                                        ? "default"
                                        : transaction.status === "pending"
                                          ? "secondary"
                                          : "destructive"
                                    }
                                  >
                                    {transaction.status}
                                  </Badge>
                                </div>
                                {/* Botão para processar transação manualmente */}
                                {transaction.type === "deposit" &&
                                  transaction.status !== "success" &&
                                  transaction.external_id && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => processTransaction(transaction.external_id!)}
                                      title="Processar transação manualmente"
                                    >
                                      <Play className="h-3 w-3" />
                                    </Button>
                                  )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Webhooks */}
            <TabsContent value="webhooks">
              <Card>
                <CardHeader>
                  <CardTitle>Logs de Webhooks ({webhookLogs.length})</CardTitle>
                  <CardDescription>
                    Histórico dos webhooks recebidos - Absorvemos as taxas automaticamente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {webhookLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Nenhum webhook recebido ainda</div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {webhookLogs.map((log) => (
                        <Card key={log.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Badge variant={log.type === "deposit" ? "default" : "secondary"}>
                                  {log.type === "deposit" ? "Depósito" : "Saque"}
                                </Badge>
                                <Badge variant={log.processed ? "default" : "destructive"}>
                                  {log.processed ? "Processado" : "Erro"}
                                </Badge>
                              </div>
                              <span className="text-sm text-gray-500">
                                {new Date(log.created_at).toLocaleString("pt-BR")}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                              <div>
                                <strong>ID:</strong> {log.external_id}
                              </div>
                              <div>
                                <strong>Status:</strong>
                                <Badge variant="outline" className="ml-1">
                                  {log.payload.status}
                                </Badge>
                              </div>
                              <div>
                                <strong>Valor HorsePay:</strong> R$ {formatCurrency(log.payload.amount)}
                                <div className="text-xs text-green-600">
                                  <strong>Usuário recebe valor integral</strong>
                                </div>
                              </div>
                            </div>

                            {log.error_message && (
                              <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                <strong>Erro:</strong> {log.error_message}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Resultados */}
            <TabsContent value="results">
              <div className="space-y-6">
                {paymentOrder && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <QrCode className="h-5 w-5" />
                        <span>Pedido de Pagamento Criado</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>ID Externo</Label>
                          <div className="flex items-center space-x-2">
                            <Input value={paymentOrder.external_id} readOnly />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(paymentOrder.external_id.toString())}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <div>
                            <Badge variant={paymentOrder.status === 0 ? "secondary" : "default"}>
                              {paymentOrder.status === 0 ? "Pendente" : "Processado"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Código Pix (Copia e Cola)</Label>
                        <div className="flex items-center space-x-2">
                          <Textarea value={paymentOrder.copy_past} readOnly className="min-h-[100px]" />
                          <Button variant="outline" onClick={() => copyToClipboard(paymentOrder.copy_past)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {paymentOrder.payment && (
                        <div>
                          <Label>QR Code</Label>
                          <div className="mt-2">
                            <img
                              src={paymentOrder.payment || "/placeholder.svg"}
                              alt="QR Code Pix"
                              className="max-w-xs border rounded"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {withdrawResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Saque Solicitado</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <AlertDescription>{withdrawResult.message}</AlertDescription>
                      </Alert>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>ID Externo</Label>
                          <Input value={withdrawResult.external_id} readOnly />
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Badge variant={withdrawResult.status === "pending" ? "secondary" : "default"}>
                            {withdrawResult.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Valor</Label>
                          <Input value={`R$ ${withdrawResult.amount.toFixed(2)}`} readOnly />
                        </div>
                        <div>
                          <Label>End to End ID</Label>
                          <Input value={withdrawResult.end_to_end_id} readOnly />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
