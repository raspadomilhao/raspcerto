"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import {
  Wallet,
  Trophy,
  Star,
  LogOut,
  Home,
  Gamepad2,
  CreditCard,
  Users,
  Gift,
  LogIn,
  Dice1,
  Target,
  Coins,
  Menu,
  X,
} from "lucide-react"
import { AuthClient } from "@/lib/auth-client"
import { toast } from "@/hooks/use-toast"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import Link from "next/link"
import Image from "next/image"
import Autoplay from "embla-carousel-autoplay"

interface UserProfile {
  user: {
    id: number
    email: string
    name: string
    username: string
    user_type: string
  }
  wallet: {
    balance: number
  }
}

interface Winner {
  id: string | number
  user_name: string
  game_name: string
  prize_amount: number
  created_at: string
  is_bot?: boolean
  is_jackpot?: boolean
  city?: string
}

interface Stats {
  total_users: number
  total_games_played: number
  total_prizes_awarded: number
}

// Função utilitária para formatar valores monetários
const formatCurrency = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return "0,00"
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue) ? "0,00" : numValue.toFixed(2)
}

// Função para formatar tempo relativo
const formatTimeAgo = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return "agora mesmo"
  if (diffInMinutes < 60) return `${diffInMinutes}min atrás`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h atrás`

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d atrás`
}

export default function HomePage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [winners, setWinners] = useState<Winner[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [winnersLoading, setWinnersLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Verificar se já está logado ao carregar a página
  useEffect(() => {
    const token = AuthClient.getToken()
    console.log("🔍 Token encontrado:", !!token)

    if (token && AuthClient.isLoggedIn()) {
      console.log("✅ Usuário logado, carregando perfil...")
      setIsLoggedIn(true)
      fetchUserProfile()
    } else {
      console.log("ℹ️ Usuário não logado, mostrando página pública...")
      setIsLoggedIn(false)
      setLoading(false)
    }

    // Sempre carregar vencedores e estatísticas (dados públicos)
    fetchWinners()
    fetchStats()

    // Atualizar vencedores a cada 30 segundos
    const interval = setInterval(fetchWinners, 30000)
    return () => clearInterval(interval)
  }, [])

  // Buscar perfil do usuário (apenas se logado)
  const fetchUserProfile = async () => {
    try {
      console.log("🔍 Buscando perfil do usuário...")

      const response = await AuthClient.makeAuthenticatedRequest("/api/user/profile")

      console.log("📡 Resposta da API:", response.status)

      if (response.ok) {
        const profile = await response.json()
        console.log("✅ Perfil carregado:", profile)
        setUserProfile(profile)
      } else {
        console.log("❌ Erro ao carregar perfil, status:", response.status)

        if (response.status === 401) {
          console.log("🔐 Token inválido, removendo...")
          AuthClient.removeToken()
          setIsLoggedIn(false)
          setUserProfile(null)
        } else {
          toast({
            title: "Erro ao carregar dados",
            description: "Tente recarregar a página",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("❌ Erro ao buscar perfil:", error)
      toast({
        title: "Erro de conexão",
        description: "Verifique sua conexão com a internet",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Buscar vencedores recentes (dados públicos)
  const fetchWinners = async () => {
    try {
      setWinnersLoading(true)
      const response = await fetch("/api/vencedores")
      if (response.ok) {
        const data = await response.json()
        console.log("🏆 Vencedores carregados:", data.winners?.length || 0)
        setWinners(data.winners || [])
      } else {
        console.error("❌ Erro na resposta da API vencedores:", response.status)
      }
    } catch (error) {
      console.error("❌ Erro ao buscar vencedores:", error)
    } finally {
      setWinnersLoading(false)
    }
  }

  // Buscar estatísticas (dados públicos)
  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      if (response.ok) {
        const data = await response.json()
        console.log("📊 Estatísticas carregadas:", data)
        setStats(data)
      }
    } catch (error) {
      console.error("❌ Erro ao buscar estatísticas:", error)
    }
  }

  // Função de logout
  const handleLogout = async () => {
    try {
      console.log("🚪 Iniciando logout...")

      // Remover token do localStorage
      AuthClient.removeToken()

      // Chamar API de logout para limpar cookies
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      console.log("✅ Logout realizado com sucesso")

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      })

      setIsLoggedIn(false)
      setUserProfile(null)
    } catch (error) {
      console.error("❌ Erro no logout:", error)
      setIsLoggedIn(false)
      setUserProfile(null)
    }
  }

  if (loading && isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-foreground text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  const isBlogger = userProfile?.user.user_type === "blogger"

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Padrão de fundo animado - mais sutil no mobile */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-30 md:opacity-100"></div>

      {/* Elementos flutuantes - reduzidos no mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Dice1 className="absolute top-16 left-4 h-4 w-4 md:h-6 md:w-6 text-primary/20 animate-float" />
        <Target className="absolute top-24 right-4 h-5 w-5 md:h-8 md:w-8 text-primary/30 animate-float delay-1000" />
        <Star className="absolute bottom-32 left-4 h-3 w-3 md:h-5 md:w-5 text-primary/20 animate-float delay-2000" />
        <Coins className="absolute bottom-40 right-4 h-4 w-4 md:h-7 md:w-7 text-primary/25 animate-float delay-500" />
      </div>

      {/* Header Mobile-First */}
      <header className="relative z-10 bg-background/90 backdrop-blur-sm border-b border-white/10">
        <div className="px-3 py-2 md:px-4 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo - compacto no mobile */}
            <Link href="/home" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-gold-600 rounded-lg md:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary/25">
                <Dice1 className="h-4 w-4 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <span className="text-lg md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                RaspCerto
              </span>
            </Link>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              {isLoggedIn && userProfile ? (
                <div className="flex items-center space-x-2">
                  {/* Saldo compacto */}
                  <Link
                    href="/deposito"
                    className="bg-secondary/50 backdrop-blur-sm rounded-full px-2 py-1 border border-white/10 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center space-x-1">
                      <Wallet className="h-3 w-3 text-primary" />
                      <span className="text-primary font-bold text-xs">
                        R$ {formatCurrency(userProfile.wallet.balance)}
                      </span>
                    </div>
                  </Link>

                  {/* Menu Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="p-1 h-8 w-8"
                  >
                    {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <Link href="/auth">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-primary to-gold-600 text-primary-foreground font-bold text-xs px-3 py-1 h-7"
                  >
                    <LogIn className="h-3 w-3 mr-1" />
                    Entrar
                  </Button>
                </Link>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/home"
                className="flex items-center space-x-2 text-primary hover:text-gold-300 transition-colors font-medium"
              >
                <Home className="h-4 w-4" />
                <span>Início</span>
              </Link>
              {isLoggedIn ? (
                <>
                  <Link
                    href="/jogos"
                    className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors font-medium"
                  >
                    <Gamepad2 className="h-4 w-4" />
                    <span>Jogos</span>
                  </Link>
                  <Link
                    href="/vencedores"
                    className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors font-medium"
                  >
                    <Trophy className="h-4 w-4" />
                    <span>Vencedores</span>
                  </Link>
                  <Link
                    href="/saque"
                    className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors font-medium"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>Saque</span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/vencedores"
                  className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors font-medium"
                >
                  <Trophy className="h-4 w-4" />
                  <span>Vencedores</span>
                </Link>
              )}
            </nav>

            {/* Desktop User Area */}
            <div className="hidden md:flex items-center space-x-3">
              {isLoggedIn && userProfile ? (
                <>
                  {/* Carteira com saldo */}
                  <div className="bg-secondary/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                    <div className="flex items-center space-x-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <span className="text-white font-bold">R$ {formatCurrency(userProfile.wallet.balance)}</span>
                    </div>
                  </div>

                  {/* Perfil do usuário */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8 border-2 border-primary/50">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-gold-600 text-primary-foreground text-sm font-bold">
                        {userProfile.user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-white">{userProfile.user.name || "Usuário"}</p>
                      <p className="text-xs text-gray-400">{userProfile.user.email}</p>
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
                </>
              ) : (
                <Link href="/auth">
                  <Button className="bg-gradient-to-r from-primary to-gold-600 hover:shadow-lg hover:shadow-primary/40 text-primary-foreground font-bold shadow-md shadow-primary/25 transition-all duration-300">
                    <LogIn className="h-4 w-4 mr-2" />
                    Entrar
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && isLoggedIn && (
          <div className="md:hidden bg-secondary/95 backdrop-blur-sm border-t border-white/10 px-3 py-2">
            <div className="space-y-1">
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
              <Link
                href="/saque"
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:text-primary hover:bg-white/10 transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <Wallet className="h-4 w-4" />
                <span className="font-medium">Saque</span>
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

      {/* Carrossel Promocional */}
      <div className="relative z-10">
        <Carousel
          plugins={[
            Autoplay({
              delay: 4000,
            }),
          ]}
          className="w-full"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent>
            <CarouselItem>
              <div className="relative">
                <Link href={isLoggedIn ? "/jogo/raspe-da-esperanca" : "/auth"}>
                  <Image
                    src="/images/promo-banner-1.png"
                    alt="Aqui R$1 pode virar R$ 1.000,00 em uma raspadinha!"
                    width={1200}
                    height={300}
                    className="w-full h-32 md:h-48 lg:h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    priority
                  />
                </Link>
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="relative">
                <Link href={isLoggedIn ? "/deposito" : "/auth"}>
                  <Image
                    src="/images/promo-banner-2.png"
                    alt="Essa oferta é limitada! Deposite agora e receba bônus exclusivos"
                    width={1200}
                    height={300}
                    className="w-full h-32 md:h-48 lg:h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    priority
                  />
                </Link>
              </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex left-4" />
          <CarouselNext className="hidden md:flex right-4" />
        </Carousel>
      </div>

      {/* Ticker de Vencedores - mais compacto no mobile */}
      <div className="relative z-10 bg-gradient-to-r from-primary/10 via-gold-500/10 to-primary/10 border-b border-primary/20 py-1 md:py-2 overflow-hidden">
        <div className="flex items-center">
          <div className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 flex-shrink-0">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-400 text-xs font-bold">AO VIVO</span>
            <Trophy className="h-2 w-2 md:h-3 md:w-3 text-primary" />
          </div>

          {winnersLoading ? (
            <div className="text-xs text-gray-400 animate-pulse">Carregando...</div>
          ) : winners.length > 0 ? (
            <div className="flex animate-scroll">
              {/* Duplicar a lista para criar loop infinito */}
              {[...winners, ...winners].map((winner, index) => (
                <div
                  key={`${winner.id}-${index}`}
                  className="flex items-center space-x-3 md:space-x-6 whitespace-nowrap px-3 md:px-6"
                >
                  <span className="text-xs text-gray-300">
                    🏆 <span className="text-white font-medium">{winner.user_name}</span> ganhou{" "}
                    <span className={`font-bold ${winner.is_jackpot ? "text-yellow-300" : "text-gold-400"}`}>
                      R$ {formatCurrency(winner.prize_amount)}
                    </span>{" "}
                    {winner.is_jackpot && <span className="text-yellow-300 ml-1">💰</span>}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400">Aguardando vencedores...</div>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="relative z-10 pb-20 md:pb-8">
        <div className="px-3 md:px-4 py-3 md:py-4 max-w-7xl mx-auto">
          {/* Estatísticas - layout mobile-first */}
          {stats && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-6 mb-6 md:mb-8">
              <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 text-center shadow-lg shadow-black/20 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-4 md:p-6">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2 md:mb-3" />
                  <div className="text-xl md:text-2xl font-bold text-white">{stats.total_users.toLocaleString()}</div>
                  <p className="text-gray-400 text-sm">Jogadores ativos</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 text-center shadow-lg shadow-black/20 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-4 md:p-6">
                  <Gamepad2 className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2 md:mb-3" />
                  <div className="text-xl md:text-2xl font-bold text-white">
                    {stats.total_games_played.toLocaleString()}
                  </div>
                  <p className="text-gray-400 text-sm">Jogos realizados</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 text-center shadow-lg shadow-black/20 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-4 md:p-6">
                  <Gift className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2 md:mb-3" />
                  <div className="text-xl md:text-2xl font-bold text-white">
                    R$ {formatCurrency(stats.total_prizes_awarded)}
                  </div>
                  <p className="text-gray-400 text-sm">Em prêmios pagos</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ações rápidas - apenas para usuários logados, layout mobile-first */}
          {isLoggedIn && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6 mb-6 md:mb-8">
              <Link href="/deposito">
                <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center space-x-3 md:space-x-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-gold-600 rounded-full flex items-center justify-center shadow-lg shadow-primary/25">
                        <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-white">Fazer Depósito</h3>
                        <p className="text-gold-200 text-sm">Adicione saldo via PIX</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/jogos">
                <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center space-x-3 md:space-x-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-gold-600 rounded-full flex items-center justify-center shadow-lg shadow-primary/25">
                        <Gamepad2 className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-white">Jogar Agora</h3>
                        <p className="text-gold-200 text-sm">Escolha seu jogo favorito</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}

          {/* Jogos em destaque - layout mobile-first */}
          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-bold text-white text-center mb-4 md:mb-6">Jogos em Destaque</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              {isLoggedIn ? (
                <>
                  <Link href="/jogo/raspe-da-esperanca">
                    <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 hover:border-primary/50 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden">
                      <CardContent className="p-0">
                        <div className="relative">
                          <Image
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/raspe-da-esperanca-AsjYlk2ryTkhyvU1dKigccZuv6jgxW.png"
                            alt="Raspe da Esperança - Concorra a até R$ 1.000,00"
                            width={400}
                            height={160}
                            className="w-full h-32 md:h-48 object-cover"
                          />
                        </div>
                        <div className="p-4 md:p-6 text-center">
                          <h3 className="text-lg md:text-xl font-bold text-white mb-2">Raspe da Esperança</h3>
                          <p className="text-gray-400 mb-3 text-sm">R$ 1,00 por jogada</p>
                          <Badge className="bg-gradient-to-r from-primary to-gold-600 text-primary-foreground text-xs">
                            {isBlogger ? "Prêmio de até R$ 1.000" : "Prêmio até R$ 1.000"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/jogo/fortuna-dourada">
                    <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 hover:border-primary/50 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden">
                      <CardContent className="p-0">
                        <div className="relative">
                          <Image
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Fortunda-dourada-cedTAgb10iHmJMnJJf6sR3CHeOflew.png"
                            alt="Fortuna Dourada - Concorra a até R$ 5.000,00"
                            width={400}
                            height={160}
                            className="w-full h-32 md:h-48 object-cover"
                          />
                        </div>
                        <div className="p-4 md:p-6 text-center">
                          <h3 className="text-lg md:text-xl font-bold text-white mb-2">Fortuna Dourada</h3>
                          <p className="text-gray-400 mb-3 text-sm">R$ 3,00 por jogada</p>
                          <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs">
                            {isBlogger ? "Prêmio de até R$ 5.000" : "Prêmio até R$ 5.000"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/jogo/mega-sorte">
                    <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 hover:border-primary/50 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden">
                      <CardContent className="p-0">
                        <div className="relative">
                          <Image
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mega-sorte-n2Rg1Dq8l8XhZAHRtd3HJV1pBoeoq6.png"
                            alt="Mega Sorte - Concorra a até R$ 10.000,00"
                            width={400}
                            height={160}
                            className="w-full h-32 md:h-48 object-cover"
                          />
                        </div>
                        <div className="p-4 md:p-6 text-center">
                          <h3 className="text-lg md:text-xl font-bold text-white mb-2">Mega Sorte</h3>
                          <p className="text-gray-400 mb-3 text-sm">R$ 5,00 por jogada</p>
                          <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs">
                            {isBlogger ? "Prêmio de até R$ 10.000" : "Prêmio até R$ 10.000"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </>
              ) : (
                <>
                  <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 overflow-hidden opacity-75">
                    <CardContent className="p-0">
                      <div className="relative">
                        <Image
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/raspe-da-esperanca-AsjYlk2ryTkhyvU1dKigccZuv6jgxW.png"
                          alt="Raspe da Esperança - Concorra a até R$ 1.000,00"
                          width={400}
                          height={160}
                          className="w-full h-32 md:h-48 object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/70 rounded-lg p-3 md:p-4">
                            <LogIn className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
                            <p className="text-white text-xs md:text-sm font-bold">Faça login para jogar</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 md:p-6 text-center">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2">Raspe da Esperança</h3>
                        <p className="text-gray-400 mb-3 text-sm">R$ 1,00 por jogada</p>
                        <Badge className="bg-gradient-to-r from-primary to-gold-600 text-primary-foreground text-xs">
                          Prêmio até R$ 1.000
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 overflow-hidden opacity-75">
                    <CardContent className="p-0">
                      <div className="relative">
                        <Image
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Fortunda-dourada-cedTAgb10iHmJMnJJf6sR3CHeOflew.png"
                          alt="Fortuna Dourada - Concorra a até R$ 5.000,00"
                          width={400}
                          height={160}
                          className="w-full h-32 md:h-48 object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/70 rounded-lg p-3 md:p-4">
                            <LogIn className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
                            <p className="text-white text-xs md:text-sm font-bold">Faça login para jogar</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 md:p-6 text-center">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2">Fortuna Dourada</h3>
                        <p className="text-gray-400 mb-3 text-sm">R$ 3,00 por jogada</p>
                        <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs">
                          Prêmio até R$ 5.000
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 overflow-hidden opacity-75">
                    <CardContent className="p-0">
                      <div className="relative">
                        <Image
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mega-sorte-n2Rg1Dq8l8XhZAHRtd3HJV1pBoeoq6.png"
                          alt="Mega Sorte - Concorra a até R$ 10.000,00"
                          width={400}
                          height={160}
                          className="w-full h-32 md:h-48 object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/70 rounded-lg p-3 md:p-4">
                            <LogIn className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
                            <p className="text-white text-xs md:text-sm font-bold">Faça login para jogar</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 md:p-6 text-center">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2">Mega Sorte</h3>
                        <p className="text-gray-400 mb-3 text-sm">R$ 5,00 por jogada</p>
                        <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs">
                          Prêmio até R$ 10.000
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

          {/* Call to action - mobile-first */}
          <div className="text-center">
            <Card className="bg-secondary/50 backdrop-blur-sm border-primary/30 max-w-2xl mx-auto shadow-lg shadow-primary/20">
              <CardContent className="p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4 text-glow">Pronto para ganhar?</h3>
                {isLoggedIn ? (
                  <>
                    <p className="text-gray-300 mb-4 md:mb-6 text-sm md:text-base">
                      Faça seu primeiro depósito e comece a jogar agora mesmo!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                      <Link href="/deposito">
                        <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-gold-600 hover:shadow-lg hover:shadow-primary/40 text-primary-foreground font-bold px-6 md:px-8 py-2 md:py-3 shadow-md shadow-primary/25 transition-all duration-300">
                          Fazer Depósito
                        </Button>
                      </Link>
                      <Link href="/jogos">
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground px-6 md:px-8 py-2 md:py-3 bg-transparent font-bold"
                        >
                          Ver Jogos
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-300 mb-4 md:mb-6 text-sm md:text-base">
                      Crie sua conta e comece a jogar agora mesmo!
                    </p>
                    <Link href="/auth">
                      <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-gold-600 hover:shadow-lg hover:shadow-primary/40 text-primary-foreground font-bold px-6 md:px-8 py-2 md:py-3 shadow-md shadow-primary/25 transition-all duration-300">
                        <LogIn className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                        Criar Conta
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer - compacto no mobile */}
        <footer className="mt-12 md:mt-16 py-6 md:py-8 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-3 md:px-4 text-center">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 md:gap-4 text-sm text-gray-400">
              <Link href="/termos-de-uso" className="hover:text-primary transition-colors">
                Termos de Uso
              </Link>
              <span className="hidden sm:inline">•</span>
              <Link href="/politica-de-privacidade" className="hover:text-primary transition-colors">
                Política de Privacidade
              </Link>
            </div>
            <p className="mt-3 md:mt-4 text-xs text-gray-500">© 2024 RaspCerto. Todos os direitos reservados.</p>
          </div>
        </footer>
      </main>

      {/* Barra de navegação inferior móvel - apenas para usuários logados */}
      {isLoggedIn && <MobileBottomNav />}

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-scroll {
          animation: scroll 60s linear infinite;
        }
      `}</style>
    </div>
  )
}
