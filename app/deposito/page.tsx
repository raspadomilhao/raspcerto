"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Wallet,
  DollarSign,
  Zap,
  Shield,
  Info,
  LogOut,
  Home,
  Gamepad2,
  Trophy,
  Crown,
  CreditCard,
  ArrowRight,
  CheckCircle,
  Clock,
  Menu,
  X,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { AuthClient } from "@/lib/auth-client"
import { QRCodeModal } from "@/components/qr-code-modal"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import Link from "next/link"

// Configuração da base URL
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.startsWith("http")
      ? process.env.NEXT_PUBLIC_BASE_URL
      : `https://${process.env.NEXT_PUBLIC_BASE_URL}`
  }
  return "https://raspmax.vercel.app"
}

const BASE_URL = getBaseUrl()

interface UserProfile {
  user: {
    id: number
    email: string
    name: string
    user_type?: string
  }
  wallet: {
    balance: string | number
  }
}

interface PaymentOrder {
  copy_past: string
  external_id: number
  payer_name: string
  payment: string
  status: number
}

interface SystemSettings {
  min_deposit: number
  max_deposit: number
  min_withdraw: number
  max_withdraw: number
}

// Função utilitária para formatar valores monetários
const formatCurrency = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return "0.00"
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue) ? "0.00" : numValue.toFixed(2)
}

// Função para converter valor para número
const toNumber = (value: string | number | undefined | null): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  const parsed = Number.parseFloat(value.toString())
  return isNaN(parsed) ? 0 : parsed
}

// Valores sugeridos - mais compactos para mobile
const suggestedAmounts = [
  {
    value: 20,
    label: "🎯",
    popular: false,
  },
  {
    value: 50,
    label: "⭐",
    popular: true,
  },
  {
    value: 100,
    label: "💚",
    popular: false,
  },
  {
    value: 200,
    label: "⚡",
    popular: false,
  },
]

export default function DepositoPage() {
  // Estados de autenticação
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showLogin, setShowLogin] = useState(true)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Estados de login/registro
  const [login, setLogin] = useState("") // Para email ou username
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [phone, setPhone] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [name, setName] = useState("")

  // Estados da API HorsePay
  const [accessToken, setAccessToken] = useState<string>("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)

  // Estados do formulário de depósito
  const [amount, setAmount] = useState("")
  const [payerName, setPayerName] = useState("")

  // Estados do modal
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)

  const [authError, setAuthError] = useState<string>("")

  const [isBlogger, setIsBlogger] = useState(false)

  // Estados do verificador de status
  const [isCheckingPayment, setIsCheckingPayment] = useState(false)
  const [paymentCheckInterval, setPaymentCheckInterval] = useState<NodeJS.Timeout | null>(null)

  // Estado para as configurações do sistema
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null)

  // Função para buscar as configurações do sistema
  const fetchSystemSettings = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/admin/settings")
      if (response.ok) {
        const data = await response.json()
        setSystemSettings(data.settings)
      } else {
        console.error("Failed to fetch system settings:", await response.json())
      }
    } catch (error) {
      console.error("Error fetching system settings:", error)
    }
  }

  // Verificar status do pagamento
  const checkPaymentStatus = async (externalId: number) => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest(`/api/transactions/${externalId}/status`)

      if (response.ok) {
        const data = await response.json()

        if (data.status === "completed" || data.status === "paid") {
          // Pagamento confirmado
          setIsCheckingPayment(false)
          if (paymentCheckInterval) {
            clearInterval(paymentCheckInterval)
            setPaymentCheckInterval(null)
          }

          // Atualizar perfil e fechar modal
          await fetchUserProfile()
          setShowQRModal(false)
          setAmount("")
          setPaymentOrder(null)

          toast({
            title: "Pagamento confirmado!",
            description: `Depósito de R$ ${formatCurrency(data.amount)} creditado na sua conta.`,
          })

          return true
        }
      }
    } catch (error) {
      console.error("Erro ao verificar status do pagamento:", error)
    }

    return false
  }

  // Iniciar verificação de status
  const startPaymentStatusCheck = (externalId: number) => {
    setIsCheckingPayment(true)

    // Verificar imediatamente
    checkPaymentStatus(externalId)

    // Verificar a cada 10 segundos
    const interval = setInterval(async () => {
      const isCompleted = await checkPaymentStatus(externalId)
      if (isCompleted) {
        clearInterval(interval)
        setPaymentCheckInterval(null)
      }
    }, 10000) // 10 segundos

    setPaymentCheckInterval(interval)

    // Parar verificação após 15 minutos
    setTimeout(
      () => {
        if (interval) {
          clearInterval(interval)
          setPaymentCheckInterval(null)
          setIsCheckingPayment(false)
        }
      },
      15 * 60 * 1000,
    ) // 15 minutos
  }

  // Parar verificação de status
  const stopPaymentStatusCheck = () => {
    if (paymentCheckInterval) {
      clearInterval(paymentCheckInterval)
      setPaymentCheckInterval(null)
    }
    setIsCheckingPayment(false)
  }

  // Verificar se já está logado ao carregar a página
  useEffect(() => {
    const token = AuthClient.getToken()
    if (token) {
      setIsLoggedIn(true)
      fetchUserProfile()
      fetchSystemSettings() // Fetch settings on login
    }
  }, [])

  // Função de login
  const handleLogin = async () => {
    setLoading(true)
    setAuthError("")
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.token) {
          AuthClient.setToken(data.token)
        }
        setIsLoggedIn(true)
        fetchSystemSettings() // Fetch settings after successful login

        window.location.href = "/home"

        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para a página inicial...",
        })
      } else {
        throw new Error(data.error || "Falha no login")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      setAuthError(errorMessage)
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

    if (password !== confirmPassword) {
      setAuthError("As senhas não coincidem")
      setLoading(false)
      return
    }

    if (!acceptTerms) {
      setAuthError("Você deve aceitar os termos de uso")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          phone,
          email: login,
          password,
          confirmPassword,
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Se o token foi retornado, fazer login automático
        if (data.token) {
          AuthClient.setToken(data.token)
          setIsLoggedIn(true)
          fetchSystemSettings() // Fetch settings after successful registration

          toast({
            title: "Bem-vindo ao RaspMax!",
            description: "Redirecionando para a página inicial...",
          })

          // Redirecionar após 1 segundo
          setTimeout(() => {
            window.location.href = "/home"
          }, 1000)
        } else {
          // Comportamento anterior se não houver token
          toast({
            title: "Conta criada com sucesso!",
            description: "Agora você pode fazer login.",
          })
          setShowLogin(true)
          setLogin("")
          setName("")
          setUsername("")
          setPhone("")
          setPassword("")
          setConfirmPassword("")
          setAcceptTerms(false)
        }
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
      const response = await AuthClient.makeAuthenticatedRequest("/api/user/profile")

      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)

        if (profile.user.name && !payerName) {
          setPayerName(profile.user.name)
        }

        if (profile.user.user_type === "blogger") {
          setIsBlogger(true)
        }
      } else if (response.status === 401) {
        handleLogout()
        toast({
          title: "Sessão expirada",
          description: "Faça login novamente.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error)
      setAuthError("Erro ao carregar perfil do usuário")
    }
  }

  // Autenticar com a API HorsePay
  const authenticateHorsePay = async () => {
    try {
      console.log("Iniciando autenticação HorsePay...")
      const response = await fetch("/api/horsepay/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      console.log("Resposta da autenticação HorsePay:", data)

      if (data.success && data.access_token) {
        setAccessToken(data.access_token)
        setIsAuthenticated(true)
        console.log("Autenticação HorsePay bem-sucedida")
      } else {
        console.error("Falha na autenticação HorsePay:", data.error)
        toast({
          title: "Erro na autenticação",
          description: "Falha ao autenticar com o provedor de pagamento",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro na autenticação HorsePay:", error)
      toast({
        title: "Erro na autenticação",
        description: "Erro ao conectar com o provedor de pagamento",
        variant: "destructive",
      })
    }
  }

  // Gerar PIX
  const generatePix = async () => {
    const amountNum = Number.parseFloat(amount)

    if (!systemSettings) {
      toast({
        title: "Erro",
        description: "Configurações do sistema não carregadas. Tente novamente.",
        variant: "destructive",
      })
      return
    }

    if (amountNum < systemSettings.min_deposit) {
      toast({
        title: "Valor inválido",
        description: `O valor mínimo para depósito é R$ ${formatCurrency(systemSettings.min_deposit)}.`,
        variant: "destructive",
      })
      return
    }

    if (amountNum > systemSettings.max_deposit) {
      toast({
        title: "Valor inválido",
        description: `O valor máximo para depósito é R$ ${formatCurrency(systemSettings.max_deposit)}.`,
        variant: "destructive",
      })
      return
    }

    if (!payerName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Sempre tentar autenticar antes de gerar PIX
      console.log("Verificando autenticação HorsePay...")
      if (!isAuthenticated || !accessToken) {
        console.log("Não autenticado, tentando autenticar...")
        await authenticateHorsePay()

        // Aguardar um pouco para a autenticação ser processada
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Verificar novamente se temos o token
      if (!accessToken) {
        throw new Error("Falha na autenticação com o provedor de pagamento")
      }

      const body = {
        payer_name: payerName,
        amount: amountNum,
        callback_url: `${BASE_URL}/api/webhook/horsepay`,
        split: [
          {
            user: "emerst12",
            percent: 20,
          },
        ],
      }

      console.log("Gerando PIX com dados:", body)
      console.log("Token de acesso:", accessToken ? "Presente" : "Ausente")

      const horsePayResponse = await fetch("https://api.horsepay.io/transaction/neworder", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const responseText = await horsePayResponse.text()
      console.log("Resposta HorsePay:", responseText)

      if (horsePayResponse.ok) {
        const data: PaymentOrder = JSON.parse(responseText)
        setPaymentOrder(data)

        await AuthClient.makeAuthenticatedRequest("/api/transactions", {
          method: "POST",
          body: JSON.stringify({
            type: "deposit",
            amount: amountNum,
            external_id: data.external_id,
            payer_name: payerName,
            callback_url: `${BASE_URL}/api/webhook/horsepay`,
            qr_code: data.payment,
            copy_paste_code: data.copy_past,
          }),
        })

        setShowQRModal(true)

        // Iniciar verificação de status do pagamento
        startPaymentStatusCheck(data.external_id)

        // Se for blogger, simular pagamento após 7 segundos
        if (isBlogger) {
          setTimeout(async () => {
            try {
              const simulateResponse = await AuthClient.makeAuthenticatedRequest("/api/simulate-deposit", {
                method: "POST",
                body: JSON.stringify({
                  external_id: data.external_id,
                }),
              })

              if (simulateResponse.ok) {
                const simulateData = await simulateResponse.json()
                console.log("🎭 Depósito simulado:", simulateData)

                // Parar verificação de status
                stopPaymentStatusCheck()

                // Atualizar perfil e fechar modal
                await fetchUserProfile()
                setShowQRModal(false)
                setAmount("")
                setPaymentOrder(null)

                toast({
                  title: "Depósito realizado com sucesso!",
                  description: `R$ ${formatCurrency(simulateData.amount)} creditado na sua conta.`,
                })
              }
            } catch (error) {
              console.error("Erro na simulação:", error)
            }
          }, 7000) // 7 segundos
        }

        toast({
          title: "PIX gerado com sucesso!",
          description: `ID do pedido: ${data.external_id}`,
        })
      } else {
        let errorMessage = `HTTP ${horsePayResponse.status}: ${responseText}`
        try {
          const errorData = JSON.parse(responseText)
          if (errorData.error || errorData.message) {
            errorMessage = errorData.error || errorData.message
          }
        } catch (e) {
          // Manter a mensagem original se não conseguir fazer parse
        }
        throw new Error(`Falha ao gerar PIX: ${errorMessage}`)
      }
    } catch (error) {
      console.error("Erro ao gerar PIX:", error)
      toast({
        title: "Erro ao gerar PIX",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentDetected = () => {
    stopPaymentStatusCheck()
    fetchUserProfile()
    setAmount("")
    setPaymentOrder(null)

    // Para usuários normais (não bloggers), recarregar a página
    if (!isBlogger) {
      setTimeout(() => {
        window.location.reload()
      }, 2000) // Aguarda 2 segundos para mostrar a confirmação antes de recarregar
    }
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

    AuthClient.removeToken()
    setIsLoggedIn(false)
    setUserProfile(null)
    setIsAuthenticated(false)
    setAccessToken("")
    setAuthError("")
  }

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserProfile()
      fetchSystemSettings() // Fetch settings when user is logged in
      // Tentar autenticar com HorsePay quando o usuário fizer login
      setTimeout(() => {
        authenticateHorsePay()
      }, 1000)
    }
  }, [isLoggedIn])

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopPaymentStatusCheck()
    }
  }, [])

  // Tela de login/registro - Mobile-First
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Mobile-First */}
        <header className="bg-background/90 backdrop-blur-sm border-b border-white/10">
          <div className="px-3 py-2 md:px-4 md:py-4">
            <div className="flex items-center justify-between">
              <Link href="/home" className="flex items-center space-x-2 md:space-x-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-gold-600 rounded-xl flex items-center justify-center">
                  <Crown className="h-5 w-5 md:h-7 md:w-7 text-primary-foreground" />
                </div>
                <span className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                  RaspMax
                </span>
              </Link>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-1 h-8 w-8"
                >
                  {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                <Link
                  href="/home"
                  className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span>Início</span>
                </Link>
                <Link
                  href="/jogos"
                  className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors"
                >
                  <Gamepad2 className="h-4 w-4" />
                  <span>Jogos</span>
                </Link>
                <Link
                  href="/deposito"
                  className="flex items-center space-x-2 text-white hover:text-primary transition-colors"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Depósitos</span>
                </Link>
              </nav>

              <div className="hidden md:block">
                <Link href="/home">
                  <Button
                    variant="ghost"
                    className="text-white hover:text-primary hover:bg-white/10 border border-white/10"
                  >
                    Voltar ao Início
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div className="md:hidden bg-secondary/95 backdrop-blur-sm border-t border-white/10 px-3 py-2">
              <div className="space-y-1">
                <Link
                  href="/home"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:text-primary hover:bg-white/10 transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Início</span>
                </Link>
                <Link
                  href="/jogos"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:text-primary hover:bg-white/10 transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Gamepad2 className="h-4 w-4" />
                  <span className="font-medium">Jogos</span>
                </Link>
                <Link
                  href="/vencedores"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:text-primary hover:bg-white/10 transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Trophy className="h-4 w-4" />
                  <span className="font-medium">Vencedores</span>
                </Link>
              </div>
            </div>
          )}
        </header>

        {/* Conteúdo Principal - Mobile-First */}
        <div className="flex items-center justify-center min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-80px)] p-3 md:p-4 pb-20 md:pb-4">
          <div className="w-full max-w-sm md:max-w-md">
            <div className="text-center mb-6 md:mb-8">
              <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-primary to-gold-600 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <Wallet className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500 mb-2 md:mb-3 text-glow">
                Depósitos PIX
              </h1>
              <p className="text-gray-300 text-sm md:text-base">Deposite de forma rápida e segura.</p>
            </div>

            <Card className="bg-secondary/50 backdrop-blur-sm border border-white/10">
              <CardHeader className="text-center pb-3 md:pb-4">
                <CardTitle className="text-lg md:text-xl text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                  {showLogin ? "Fazer Login" : "Criar Conta"}
                </CardTitle>
                <CardDescription className="text-gray-300 text-sm">
                  {showLogin ? "Acesse sua conta para depositar" : "Crie sua conta gratuita"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                {showLogin ? (
                  <>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="login" className="text-gray-200 text-sm">
                        Email ou Usuário
                      </Label>
                      <Input
                        id="login"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        placeholder="seu@email.com ou usuario"
                        className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 focus:border-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="password" className="text-gray-200 text-sm">
                        Senha
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Sua senha"
                          className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 pr-10 focus:border-primary text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? "🙈" : "👁️"}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="name" className="text-gray-200 text-sm">
                        Nome completo *
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 focus:border-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="username" className="text-gray-200 text-sm">
                        Usuário *
                      </Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Escolha um nome de usuário"
                        className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 focus:border-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="phone" className="text-gray-200 text-sm">
                        Telefone *
                      </Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 focus:border-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="email" className="text-gray-200 text-sm">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        placeholder="seu@email.com"
                        className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 focus:border-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="password" className="text-gray-200 text-sm">
                        Senha *
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 pr-10 focus:border-primary text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? "🙈" : "👁️"}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-200 text-sm">
                        Confirmar senha *
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirme sua senha"
                          className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 pr-10 focus:border-primary text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? "🙈" : "👁️"}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="w-4 h-4 rounded border-white/10 bg-black/20 text-primary focus:ring-primary mt-0.5"
                      />
                      <Label htmlFor="acceptTerms" className="text-xs md:text-sm text-gray-300 leading-tight">
                        Aceito os <span className="text-primary hover:underline cursor-pointer">termos de uso</span> e{" "}
                        <span className="text-primary hover:underline cursor-pointer">política de privacidade</span>
                      </Label>
                    </div>
                  </>
                )}

                <Button
                  onClick={showLogin ? handleLogin : handleRegister}
                  disabled={
                    loading ||
                    !login ||
                    !password ||
                    (!showLogin && (!username || !phone || !confirmPassword || !acceptTerms))
                  }
                  className="w-full h-9 md:h-10 bg-gradient-to-r from-primary to-gold-600 hover:shadow-lg hover:shadow-primary/40 text-primary-foreground font-bold shadow-md shadow-primary/25 transition-all duration-300 text-sm"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processando...</span>
                    </div>
                  ) : showLogin ? (
                    "Entrar"
                  ) : (
                    "Criar conta"
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setShowLogin(!showLogin)}
                  className="w-full text-gray-300 hover:text-white hover:bg-white/10 text-sm"
                >
                  {showLogin ? "Não tem conta? Registre-se" : "Já tem conta? Faça login"}
                </Button>

                {showLogin && (
                  <div className="text-center text-xs text-gray-400 bg-black/20 p-2 md:p-3 rounded-lg border border-white/10">
                    <p>
                      <strong className="text-primary">Faça login:</strong> para depositar
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Barra de navegação inferior móvel */}
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Mobile-First */}
      <header className="bg-background/90 backdrop-blur-sm border-b border-white/10">
        <div className="px-3 py-2 md:px-4 md:py-4">
          <div className="flex items-center justify-between">
            <Link href="/home" className="flex items-center space-x-2 md:space-x-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-gold-600 rounded-xl flex items-center justify-center">
                <Crown className="h-5 w-5 md:h-7 md:w-7 text-primary-foreground" />
              </div>
              <span className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                RaspMax
              </span>
            </Link>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <div className="flex items-center space-x-2">
                {/* Saldo compacto */}
                <div className="bg-secondary/50 backdrop-blur-sm border border-white/10 rounded-full px-2 py-1">
                  <div className="flex items-center space-x-1">
                    <Wallet className="h-3 w-3 text-primary" />
                    <span className="text-white font-medium text-xs">
                      R$ {formatCurrency(userProfile?.wallet.balance)}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-1 h-8 w-8"
                >
                  {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/home"
                className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Início</span>
              </Link>
              <Link
                href="/jogos"
                className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors"
              >
                <Gamepad2 className="h-4 w-4" />
                <span>Jogos</span>
              </Link>
              <Link
                href="/vencedores"
                className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors"
              >
                <Trophy className="h-4 w-4" />
                <span>Vencedores</span>
              </Link>
              <Link
                href="/deposito"
                className="flex items-center space-x-2 text-white hover:text-primary transition-colors"
              >
                <Wallet className="h-4 w-4" />
                <span>Depósitos</span>
              </Link>
            </nav>

            {/* Desktop User Area */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Carteira com saldo */}
              <div className="bg-secondary/50 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-white font-medium">R$ {formatCurrency(userProfile?.wallet.balance)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 border-2 border-primary/50">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-gold-600 text-primary-foreground text-sm font-medium">
                    {userProfile?.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white">{userProfile?.user.name}</p>
                  <p className="text-xs text-gray-400">{userProfile?.user.email}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-300 hover:text-primary hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="md:hidden bg-secondary/95 backdrop-blur-sm border-t border-white/10 px-3 py-2">
            <div className="space-y-1">
              <Link
                href="/home"
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:text-primary hover:bg-white/10 transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <Home className="h-4 w-4" />
                <span className="font-medium">Início</span>
              </Link>
              <Link
                href="/jogos"
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:text-primary hover:bg-white/10 transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <Gamepad2 className="h-4 w-4" />
                <span className="font-medium">Jogos</span>
              </Link>
              <Link
                href="/vencedores"
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:text-primary hover:bg-white/10 transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <Trophy className="h-4 w-4" />
                <span className="font-medium">Vencedores</span>
              </Link>
              <button
                onClick={() => {
                  handleLogout()
                  setShowMobileMenu(false)
                }}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Conteúdo Principal - Mobile-First */}
      <div className="px-3 md:px-6 py-4 md:py-6 pb-20 md:pb-6 max-w-4xl mx-auto">
        <div className="space-y-6 md:space-y-8">
          {/* Hero Section - compacto no mobile */}
          <div className="text-center py-4 md:py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary to-gold-600 rounded-full mb-4 md:mb-6 animate-glow">
              <Wallet className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500 mb-3 md:mb-4 text-glow">
              DEPÓSITOS PIX
            </h1>
            <p className="text-base md:text-xl text-gray-300 mb-4 md:mb-6 px-2">
              APÓS REALIZAR O DEPÓSITO CASO O VALOR NÃO CAIA AUTOMATICAMENTE, ATUALIZE A PÁGINA
            </p>

            {/* Saldo atual - compacto no mobile */}
            <div className="bg-secondary/50 backdrop-blur-sm border border-primary/30 rounded-xl p-4 md:p-6 max-w-sm md:max-w-md mx-auto">
              <p className="text-gray-300 mb-2 text-sm md:text-base">Seu saldo atual:</p>
              <p className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                R$ {formatCurrency(userProfile?.wallet.balance)}
              </p>
            </div>
          </div>

          {/* Valores Sugeridos - mais compacto para mobile */}
          <div className="space-y-2 md:space-y-3">
            <h3 className="text-sm font-medium text-gray-300 text-center">Valores rápidos</h3>
            <div className="flex gap-2 justify-center flex-wrap">
              {suggestedAmounts.map((suggestion) => (
                <button
                  key={suggestion.value}
                  onClick={() => setAmount(suggestion.value.toString())}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                    amount === suggestion.value.toString()
                      ? "bg-gradient-to-r from-primary to-gold-600 text-white shadow-md"
                      : "bg-secondary/30 text-gray-300 hover:bg-secondary/50"
                  } ${suggestion.popular ? "ring-1 ring-primary/50" : ""}`}
                >
                  {suggestion.popular && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></div>
                  )}
                  <div className="flex items-center space-x-1">
                    <span className="text-xs">{suggestion.label}</span>
                    <span className="font-bold">R${suggestion.value}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Formulário de Depósito - layout mobile-first */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Formulário */}
            <Card className="bg-secondary/50 backdrop-blur-sm border border-white/10">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center space-x-2 text-white text-lg md:text-xl">
                  <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  <span>Fazer Depósito</span>
                </CardTitle>
                <CardDescription className="text-gray-300 text-sm">
                  Preencha os dados abaixo para gerar seu PIX
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-gray-200 text-sm">
                    Valor do depósito
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="amount"
                      type="number"
                      min={systemSettings?.min_deposit || 1}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={systemSettings ? formatCurrency(systemSettings.min_deposit) : "1.00"}
                      className="pl-10 h-10 md:h-12 bg-black/20 border-white/10 text-white placeholder:text-gray-400 focus:border-primary text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Valor mínimo: R$ {systemSettings ? formatCurrency(systemSettings.min_deposit) : "1,00"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payerName" className="text-gray-200 text-sm">
                    Nome do pagador
                  </Label>
                  <Input
                    id="payerName"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="h-10 md:h-12 bg-black/20 border-white/10 text-white placeholder:text-gray-400 focus:border-primary text-sm"
                  />
                  <p className="text-xs text-gray-400">Nome que aparecerá na transação PIX</p>
                </div>

                <Button
                  onClick={generatePix}
                  disabled={
                    loading ||
                    !amount ||
                    !systemSettings ||
                    Number.parseFloat(amount) < systemSettings.min_deposit ||
                    Number.parseFloat(amount) > systemSettings.max_deposit ||
                    !payerName.trim()
                  }
                  className="w-full h-10 md:h-12 bg-gradient-to-r from-primary to-gold-600 hover:shadow-lg hover:shadow-primary/40 text-primary-foreground font-bold shadow-md shadow-primary/25 transition-all duration-300 text-sm"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white"></div>
                      <span>Gerando PIX...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 md:h-5 md:w-5" />
                      <span>Gerar PIX</span>
                      <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Informações - layout mobile-first */}
            <div className="space-y-4 md:space-y-6">
              <Card className="bg-gradient-to-br from-primary/20 to-gold-600/20 backdrop-blur-sm border border-primary/30">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center space-x-2 text-white text-lg md:text-xl">
                    <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    <span>Segurança Garantida</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm md:text-base">Transações Seguras</p>
                      <p className="text-gray-300 text-xs md:text-sm">Todas as transações são criptografadas</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Clock className="h-4 w-4 md:h-5 md:w-5 text-gold-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm md:text-base">Processamento Rápido</p>
                      <p className="text-gray-300 text-xs md:text-sm">Depósitos creditados em até 5 minutos</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm md:text-base">PIX Instantâneo</p>
                      <p className="text-gray-300 text-xs md:text-sm">Pagamento via QR Code ou Copia e Cola</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-secondary/50 backdrop-blur-sm border border-white/10">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center space-x-2 text-white text-lg md:text-xl">
                    <Info className="h-5 w-5 md:h-6 md:w-6 text-gold-400" />
                    <span>Como funciona?</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
                  <div className="flex items-start space-x-3">
                    <Badge className="bg-primary text-primary-foreground font-bold min-w-[20px] h-5 md:min-w-[24px] md:h-6 flex items-center justify-center text-xs">
                      1
                    </Badge>
                    <div>
                      <p className="text-white font-medium text-sm md:text-base">Escolha o valor</p>
                      <p className="text-gray-300 text-xs md:text-sm">Selecione um valor sugerido ou digite o seu</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Badge className="bg-primary text-primary-foreground font-bold min-w-[20px] h-5 md:min-w-[24px] md:h-6 flex items-center justify-center text-xs">
                      2
                    </Badge>
                    <div>
                      <p className="text-white font-medium text-sm md:text-base">Escaneie o QR Code</p>
                      <p className="text-gray-300 text-xs md:text-sm">Use o app do seu banco para pagar</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Badge className="bg-primary text-primary-foreground font-bold min-w-[20px] h-5 md:min-w-[24px] md:h-6 flex items-center justify-center text-xs">
                      3
                    </Badge>
                    <div>
                      <p className="text-white font-medium text-sm md:text-base">Receba o crédito</p>
                      <p className="text-gray-300 text-xs md:text-sm">Saldo disponível em até 5 minutos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Modal do QR Code */}
      {paymentOrder && (
        <QRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          paymentOrder={paymentOrder}
          onPaymentDetected={handlePaymentDetected}
          isBlogger={isBlogger}
          isCheckingPayment={isCheckingPayment}
        />
      )}

      {/* Barra de navegação inferior móvel */}
      <MobileBottomNav />
    </div>
  )
}
