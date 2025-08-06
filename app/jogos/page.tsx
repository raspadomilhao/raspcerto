"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Coins,
  Trophy,
  Star,
  Zap,
  Gem,
  Home,
  Gamepad2,
  Wallet,
  LogOut,
  Sparkles,
  Dice1,
  Menu,
  X,
  LogIn,
} from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { AuthClient } from "@/lib/auth-client"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"

interface GameCard {
  id: string
  name: string
  price: number
  maxPrize: number
  color: string
  gradient: string
  icon: React.ReactNode
  popular?: boolean
  description: string
  image: string
}

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

// Função utilitária para formatar valores monetários
const formatCurrency = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return "0,00"
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue) ? "0,00" : numValue.toFixed(2)
}

export default function JogosPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Verificar se já está logado ao carregar a página
  useEffect(() => {
    const token = AuthClient.getToken()
    if (token) {
      setIsLoggedIn(true)
      fetchUserProfile()
    } else {
      setLoading(false)
    }
  }, [])

  // Buscar perfil do usuário
  const fetchUserProfile = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/user/profile")

      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
      } else if (response.status === 401) {
        // Token inválido, fazer logout
        handleLogout()
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error)
    } finally {
      setLoading(false)
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
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    })
  }

  // Dados dos jogos
  const games: GameCard[] = [
    {
      id: "raspe-da-esperanca",
      name: "Raspe da Esperança",
      price: 1,
      maxPrize: 1000,
      color: "gold",
      gradient: "from-amber-500 to-yellow-500",
      icon: <Star className="h-5 w-5 md:h-6 md:w-6" />,
      popular: true,
      description: "O jogo mais popular! Concorra a até R$ 1.000,00 por apenas R$ 1,00",
      image:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/raspe-da-esperanca-AsjYlk2ryTkhyvU1dKigccZuv6jgxW.png",
    },
    {
      id: "fortuna-dourada",
      name: "Fortuna Dourada",
      price: 3,
      maxPrize: 5000,
      color: "violet",
      gradient: "from-violet-500 to-purple-500",
      icon: <Gem className="h-5 w-5 md:h-6 md:w-6" />,
      description: "Prêmios maiores te esperam! Concorra a até R$ 5.000,00",
      image:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Fortunda-dourada-cedTAgb10iHmJMnJJf6sR3CHeOflew.png",
    },
    {
      id: "mega-sorte",
      name: "Mega Sorte",
      price: 5,
      maxPrize: 10000,
      color: "teal",
      gradient: "from-teal-500 to-cyan-500",
      icon: <Trophy className="h-5 w-5 md:h-6 md:w-6" />,
      description: "O maior prêmio da plataforma! Concorra a até R$ 10.000,00",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mega-sorte-n2Rg1Dq8l8XhZAHRtd3HJV1pBoeoq6.png",
    },
  ]

  // Função para jogar
  const handlePlayGame = (gameId: string, gamePrice: number) => {
    if (!isLoggedIn) {
      toast({
        title: "Login necessário",
        description: "Você precisa fazer login para jogar.",
        variant: "destructive",
      })
      router.push("/auth")
      return
    }

    if (!userProfile) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar seu perfil.",
        variant: "destructive",
      })
      return
    }

    const balance = Number.parseFloat(userProfile.wallet.balance.toString())
    if (balance < gamePrice) {
      toast({
        title: "Saldo insuficiente",
        description: `Você precisa de R$ ${gamePrice.toFixed(2)} para jogar. Faça um depósito!`,
        variant: "destructive",
      })
      router.push("/deposito")
      return
    }

    // Redirecionar para o jogo
    router.push(`/jogo/${gameId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-foreground text-sm">Carregando jogos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Grid pattern background - mais sutil no mobile */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-30 md:opacity-100"></div>

      {/* Floating elements - reduzidos no mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Gem className="absolute top-16 left-4 h-4 w-4 md:h-6 md:w-6 text-primary/20 animate-float" />
        <Zap className="absolute top-24 right-4 h-5 w-5 md:h-8 md:w-8 text-primary/30 animate-float delay-1000" />
        <Star className="absolute bottom-32 left-4 h-3 w-3 md:h-5 md:w-5 text-primary/20 animate-float delay-2000" />
        <Coins className="absolute bottom-40 right-4 h-4 w-4 md:h-7 md:w-7 text-primary/25 animate-float delay-500" />
        <Sparkles className="absolute top-48 left-1/3 h-3 w-3 md:h-4 md:w-4 text-primary/20 animate-float delay-1500" />
      </div>

      {/* Header Mobile-First */}
      <header className="relative z-10 bg-background/90 backdrop-blur-sm border-b border-white/10">
        <div className="px-3 py-2 md:px-4 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo compacto */}
            <Link href="/home" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-gold-600 rounded-lg md:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary/25">
                <Dice1 className="h-4 w-4 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <span className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
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
                className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors font-medium"
              >
                <Home className="h-4 w-4" />
                <span>Início</span>
              </Link>
              <Link
                href="/jogos"
                className="flex items-center space-x-2 text-primary hover:text-gold-300 transition-colors font-medium"
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
              {isLoggedIn && (
                <Link
                  href="/saque"
                  className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors font-medium"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Saque</span>
                </Link>
              )}
            </nav>

            {/* Desktop User Area */}
            <div className="hidden md:flex items-center space-x-3">
              {isLoggedIn && userProfile ? (
                <>
                  {/* Carteira com saldo */}
                  <Link href="/deposito">
                    <Button variant="ghost" className="text-gray-300 hover:text-primary hover:bg-secondary font-medium">
                      <Wallet className="h-4 w-4 mr-2" />
                      R$ {formatCurrency(userProfile.wallet.balance)}
                    </Button>
                  </Link>

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
                      <p className="text-sm font-medium text-white">{userProfile.user.name}</p>
                      <p className="text-xs text-gray-400">{userProfile.user.email}</p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-gray-300 hover:text-primary hover:bg-secondary"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth">
                    <Button variant="ghost" className="text-white hover:text-primary hover:bg-secondary font-medium">
                      Entrar
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button className="bg-gradient-to-r from-primary to-gold-600 hover:shadow-lg hover:shadow-primary/40 text-primary-foreground font-bold shadow-md shadow-primary/25 transition-all duration-300">
                      Cadastrar
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && isLoggedIn && (
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

      {/* Conteúdo Principal - Mobile-First */}
      <main className="relative z-10 pb-20 md:pb-8">
        {/* Hero Section - compacto no mobile */}
        <div className="px-3 md:px-4 py-6 md:py-8 text-center max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-amber-300 mb-3 md:mb-4 text-glow">
              JOGOS RASPMAX
            </h1>
            <div className="flex items-center justify-center space-x-2 mb-3 md:mb-4">
              <div className="h-0.5 md:h-1 w-8 md:w-12 bg-gradient-to-r from-primary to-gold-500"></div>
              <Gamepad2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              <div className="h-0.5 md:h-1 w-8 md:w-12 bg-gradient-to-r from-gold-500 to-primary"></div>
            </div>
            <p className="text-lg md:text-xl text-gray-300 font-medium">
              Escolha seu jogo e concorra a prêmios incríveis no PIX!
            </p>
          </div>

          {/* Status do usuário - compacto no mobile */}
          {!isLoggedIn && (
            <div className="mb-6 md:mb-8">
              <div className="bg-secondary/50 backdrop-blur-sm border border-primary/30 rounded-lg p-3 md:p-4">
                <p className="text-white font-semibold mb-2 text-sm md:text-base">
                  ⚡ Faça login para começar a jogar!
                </p>
                <Link href="/auth">
                  <Button className="bg-gradient-to-r from-primary to-gold-600 hover:shadow-lg hover:shadow-primary/40 text-primary-foreground font-bold shadow-md shadow-primary/25 transition-all duration-300 text-sm">
                    Entrar / Cadastrar
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {isLoggedIn && userProfile && (
            <div className="mb-6 md:mb-8">
              <div className="bg-secondary/50 backdrop-blur-sm border border-white/10 rounded-lg p-3 md:p-4">
                <p className="text-gray-300 mb-2 text-sm">Seu saldo atual:</p>
                <p className="text-xl md:text-2xl font-bold text-primary">
                  R$ {formatCurrency(userProfile.wallet.balance)}
                </p>
                {Number.parseFloat(userProfile.wallet.balance.toString()) < 1 && (
                  <Link href="/deposito">
                    <Button className="mt-2 bg-gradient-to-r from-primary to-gold-600 hover:shadow-lg hover:shadow-primary/40 text-primary-foreground font-bold shadow-md shadow-primary/25 transition-all duration-300 text-sm">
                      Fazer Depósito
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lista de Jogos - layout mobile-first */}
        <div className="px-3 md:px-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {games.map((game) => (
              <Card
                key={game.id}
                className="bg-secondary/50 backdrop-blur-sm border-white/10 shadow-xl hover:shadow-2xl hover:shadow-black/50 transform hover:-translate-y-2 transition-all duration-300 overflow-hidden cursor-pointer group"
                onClick={() => handlePlayGame(game.id, game.price)}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${game.gradient}/10 opacity-0 group-hover:opacity-100 transition-all duration-300`}
                ></div>
                <div className="relative">
                  {/* Badge de popular */}
                  {game.popular && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold animate-pulse text-xs">
                        🔥 POPULAR
                      </Badge>
                    </div>
                  )}

                  {/* Imagem do jogo - altura reduzida no mobile */}
                  <div className="relative h-32 md:h-48 overflow-hidden">
                    <Image
                      src={game.image || "/placeholder.svg"}
                      alt={game.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary to-transparent"></div>
                  </div>

                  <div className="p-4 md:p-6">
                    {/* Ícone do jogo - menor no mobile */}
                    <div
                      className={`w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r ${game.gradient} rounded-full flex items-center justify-center mb-3 md:mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 -mt-8 md:-mt-12 relative z-10 border-4 border-secondary`}
                    >
                      <div className="text-white">{game.icon}</div>
                    </div>

                    {/* Nome do jogo */}
                    <h3 className="text-lg md:text-xl font-bold text-white text-center mb-2">{game.name}</h3>

                    {/* Descrição - texto menor no mobile */}
                    <p className="text-gray-300 text-center text-xs md:text-sm mb-3 md:mb-4">{game.description}</p>

                    {/* Informações do jogo - layout compacto no mobile */}
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Preço:</span>
                        <span className="text-white font-bold text-sm">R$ {game.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Prêmio máximo:</span>
                        <span
                          className={`font-bold text-transparent bg-clip-text bg-gradient-to-r ${game.gradient} text-sm`}
                        >
                          R$ {game.maxPrize.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Botão de jogar - altura reduzida no mobile */}
                    <Button
                      className={`w-full mt-3 md:mt-4 bg-gradient-to-r ${game.gradient} text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 h-9 md:h-10 text-sm`}
                      disabled={
                        isLoggedIn &&
                        userProfile &&
                        Number.parseFloat(userProfile.wallet.balance.toString()) < game.price
                      }
                    >
                      {!isLoggedIn ? (
                        "Fazer Login para Jogar"
                      ) : isLoggedIn &&
                        userProfile &&
                        Number.parseFloat(userProfile.wallet.balance.toString()) < game.price ? (
                        "Saldo Insuficiente"
                      ) : (
                        <>
                          <Zap className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                          JOGAR AGORA
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Seção de informações - layout mobile-first */}
        <div className="px-3 md:px-4 py-12 md:py-16 max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8 text-glow">
              ⚡ Por que escolher RaspMax? ⚡
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-secondary/50 backdrop-blur-sm border border-white/10 rounded-lg p-4 md:p-6">
                <Zap className="h-10 w-10 md:h-12 md:w-12 text-primary mx-auto mb-3 md:mb-4" />
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">Pagamentos Instantâneos</h3>
                <p className="text-gray-300 text-sm md:text-base">Receba seus prêmios na hora via PIX</p>
              </div>
              <div className="bg-secondary/50 backdrop-blur-sm border border-white/10 rounded-lg p-4 md:p-6">
                <Star className="h-10 w-10 md:h-12 md:w-12 text-primary mx-auto mb-3 md:mb-4" />
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">Jogos Exclusivos</h3>
                <p className="text-gray-300 text-sm md:text-base">Experiência única e divertida</p>
              </div>
              <div className="bg-secondary/50 backdrop-blur-sm border border-white/10 rounded-lg p-4 md:p-6">
                <Trophy className="h-10 w-10 md:h-12 md:w-12 text-primary mx-auto mb-3 md:mb-4" />
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">Prêmios Incríveis</h3>
                <p className="text-gray-300 text-sm md:text-base">Até R$ 10.000 em prêmios</p>
              </div>
            </div>
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
            <p className="mt-3 md:mt-4 text-xs text-gray-500">© 2024 RaspMax. Todos os direitos reservados.</p>
          </div>
        </footer>
      </main>

      {/* Barra de navegação inferior móvel */}
      <MobileBottomNav />
    </div>
  )
}
