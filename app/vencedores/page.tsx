"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Trophy,
  Crown,
  Medal,
  Star,
  Gem,
  Sparkles,
  Home,
  Gamepad2,
  Wallet,
  LogOut,
  Calendar,
  DollarSign,
  MapPin,
} from "lucide-react"
import { AuthClient } from "@/lib/auth-client"
import Link from "next/link"

interface Winner {
  id: string | number
  user_name: string | null
  game_name: string | null
  prize_amount: number
  created_at: string
  is_bot?: boolean
  is_jackpot?: boolean
  city?: string | null
}

interface UserProfile {
  user: {
    id: number
    email: string
    name: string | null
  }
  wallet: {
    balance: string | number
  }
}

// Função segura para obter iniciais
const getInitials = (name: string | undefined | null): string => {
  if (!name || typeof name !== "string") return "?"

  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) // Limita a 2 caracteres
}

// Função utilitária para formatar valores monetários
const formatCurrency = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return "0,00"
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue) ? "0,00" : numValue.toFixed(2)
}

// Função para formatar tempo relativo
const getTimeAgo = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return "Agora mesmo"
  if (diffInMinutes < 60) return `${diffInMinutes}min atrás`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h atrás`

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d atrás`
}

export default function VencedoresPage() {
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Verificar se está logado
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
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error)
    }
  }

  // Buscar vencedores
  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const response = await fetch("/api/vencedores")
        if (response.ok) {
          const data = await response.json()
          console.log("Vencedores recebidos:", data)
          setWinners(data.winners || [])
        }
      } catch (error) {
        console.error("Erro ao buscar vencedores:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWinners()

    // Atualizar vencedores a cada 30 segundos
    const interval = setInterval(fetchWinners, 30000)
    return () => clearInterval(interval)
  }, [])

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
  }

  // Função para obter ícone do prêmio baseado no valor
  const getPrizeIcon = (prize: number) => {
    if (prize >= 10000) return <Crown className="h-6 w-6 text-yellow-300" />
    if (prize >= 5000) return <Trophy className="h-6 w-6 text-yellow-400" />
    if (prize >= 1000) return <Medal className="h-6 w-6 text-amber-400" />
    if (prize >= 100) return <Star className="h-6 w-6 text-amber-500" />
    return <Gem className="h-6 w-6 text-gold-400" />
  }

  // Função para obter cor do prêmio
  const getPrizeColor = (prize: number) => {
    if (prize >= 10000) return "from-yellow-400 to-amber-500"
    if (prize >= 5000) return "from-yellow-500 to-orange-500"
    if (prize >= 1000) return "from-orange-400 to-red-500"
    if (prize >= 100) return "from-amber-500 to-red-600"
    return "from-gold-400 to-amber-500"
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/50 via-background/10 to-transparent"></div>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,hsl(var(--primary)/.05)_50%,transparent_75%,transparent_100%)] bg-[length:60px_60px] animate-pulse"></div>
      </div>

      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Trophy className="absolute top-20 left-10 h-8 w-8 text-primary/30 animate-bounce" />
        <Crown className="absolute top-32 right-20 h-10 w-10 text-primary/40 animate-pulse delay-1000" />
        <Medal className="absolute bottom-40 left-20 h-6 w-6 text-amber-400/30 animate-spin delay-2000" />
        <Star className="absolute top-1/2 right-10 h-7 w-7 text-primary/30 animate-bounce delay-500" />
        <Gem className="absolute bottom-20 right-32 h-6 w-6 text-primary/30 animate-pulse delay-1500" />
        <Sparkles className="absolute top-60 left-1/3 h-5 w-5 text-amber-400/20 animate-pulse delay-3000" />
      </div>

      {/* Header Desktop */}
      <header className="relative z-10 bg-background/80 backdrop-blur-xl border-b border-white/10 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/home" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-gold-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Crown className="h-7 w-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                RaspCerto
              </span>
            </Link>

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
                className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors font-medium"
              >
                <Gamepad2 className="h-4 w-4" />
                <span>Jogos</span>
              </Link>
              <Link
                href="/vencedores"
                className="flex items-center space-x-2 text-primary hover:text-gold-300 transition-colors font-medium"
              >
                <Trophy className="h-4 w-4" />
                <span>Vencedores</span>
              </Link>
              <Link
                href="/deposito"
                className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors font-medium"
              >
                <Wallet className="h-4 w-4" />
                <span>Depósitos</span>
              </Link>
            </nav>

            {isLoggedIn && userProfile && (
              <div className="flex items-center space-x-4">
                {/* Carteira com saldo */}
                <div className="bg-secondary/50 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-white font-bold">R$ {formatCurrency(userProfile.wallet.balance)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/50">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-gold-600 text-primary-foreground text-sm font-bold">
                      {getInitials(userProfile.user.name)}
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
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Header Mobile */}
      <header className="relative z-10 bg-background/80 backdrop-blur-xl border-b border-white/10 md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/home" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-gold-600 rounded-xl flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                RaspCerto
              </span>
            </Link>

            {isLoggedIn && userProfile && (
              <div className="flex items-center space-x-2 bg-secondary/50 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-white font-bold text-sm">R$ {formatCurrency(userProfile.wallet.balance)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="relative z-10 max-w-6xl mx-auto p-6 pb-24 md:pb-6">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary to-gold-600 rounded-full mb-8 animate-glow">
              <Trophy className="h-12 w-12 text-primary-foreground" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-amber-300 mb-6 text-glow">
              HALL DA FAMA
            </h1>
            <p className="text-2xl text-gray-300 mb-8">Conheça nossos grandes vencedores!</p>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-secondary/50 backdrop-blur-sm border border-primary/30 rounded-xl p-6">
                <Crown className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-3xl font-black text-primary">
                  R$ {formatCurrency(winners.reduce((sum, w) => sum + w.prize_amount, 0))}
                </div>
                <p className="text-gray-300 text-sm">Total em Prêmios</p>
              </div>
              <div className="bg-secondary/50 backdrop-blur-sm border border-primary/30 rounded-xl p-6">
                <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-3xl font-black text-primary">{winners.length}</div>
                <p className="text-gray-300 text-sm">Vencedores</p>
              </div>
              <div className="bg-secondary/50 backdrop-blur-sm border border-primary/30 rounded-xl p-6">
                <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-3xl font-black text-primary">
                  R$ {formatCurrency(Math.max(...winners.map((w) => w.prize_amount), 0))}
                </div>
                <p className="text-gray-300 text-sm">Maior Prêmio</p>
              </div>
            </div>
          </div>

          {/* Lista de Vencedores */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-300">Carregando vencedores...</p>
            </div>
          ) : winners.length === 0 ? (
            <Card className="bg-secondary/50 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardContent className="p-12 text-center">
                <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-300 mb-2">Nenhum vencedor ainda</h3>
                <p className="text-gray-400 mb-6">Seja o primeiro a ganhar um grande prêmio!</p>
                <Link href="/jogos">
                  <Button className="bg-gradient-to-r from-primary to-gold-600 hover:shadow-lg hover:shadow-primary/40 text-primary-foreground font-bold shadow-md shadow-primary/25 transition-all duration-300">
                    <Gamepad2 className="h-5 w-5 mr-2" />
                    Jogar Agora
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {winners.map((winner, index) => (
                <Card
                  key={winner.id}
                  className={`group bg-secondary/50 backdrop-blur-xl border shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden ${
                    winner.is_jackpot ? "border-primary/50 ring-2 ring-primary/30 animate-pulse" : "border-white/10"
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${getPrizeColor(winner.prize_amount)}/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  ></div>

                  <CardHeader className="relative text-center pb-4">
                    {/* Posição */}
                    {index < 3 && (
                      <div className="absolute -top-2 -right-2">
                        <Badge
                          className={`${
                            index === 0
                              ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black"
                              : index === 1
                                ? "bg-gradient-to-r from-gray-300 to-gray-400 text-black"
                                : "bg-gradient-to-r from-orange-400 to-amber-600 text-white"
                          } font-bold text-xs px-2 py-1`}
                        >
                          #{index + 1}
                        </Badge>
                      </div>
                    )}

                    {/* Avatar */}
                    <div className="relative mx-auto mb-4">
                      <Avatar className="h-16 w-16 border-4 border-white/10 group-hover:border-primary/50 transition-colors duration-300">
                        <AvatarFallback
                          className={`bg-gradient-to-br ${getPrizeColor(winner.prize_amount)} text-white text-lg font-bold`}
                        >
                          {getInitials(winner.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1">{getPrizeIcon(winner.prize_amount)}</div>
                    </div>

                    <CardTitle className="text-lg text-white group-hover:text-primary transition-colors duration-300">
                      {winner.user_name || "Jogador"}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="relative text-center space-y-4">
                    {/* Prêmio */}
                    <div
                      className={`text-3xl font-black bg-gradient-to-r ${getPrizeColor(winner.prize_amount)} bg-clip-text text-transparent`}
                    >
                      R$ {formatCurrency(winner.prize_amount)}
                    </div>

                    {/* Jogo */}
                    <div className="flex items-center justify-center space-x-2">
                      <Gamepad2 className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-300 text-sm">{winner.game_name || "Jogo"}</span>
                    </div>

                    {/* Data */}
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-400 text-xs">{getTimeAgo(winner.created_at)}</span>
                    </div>

                    {/* Cidade (se disponível) */}
                    {winner.city && (
                      <div className="flex items-center justify-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-400 text-xs">{winner.city}</span>
                      </div>
                    )}

                    {/* Badge de destaque para grandes prêmios */}
                    {winner.is_jackpot && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-xs animate-pulse">
                        🏆 JACKPOT!
                      </Badge>
                    )}
                    {winner.prize_amount >= 1000 && !winner.is_jackpot && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-xs">
                        🏆 GRANDE PRÊMIO!
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-primary via-gold-600 to-amber-600 border-none shadow-2xl overflow-hidden">
        <CardContent className="p-12 text-center relative">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.1)_50%,transparent_75%,transparent_100%)] bg-[length:60px_60px] animate-pulse"></div>
          <div className="relative">
            <Sparkles className="h-16 w-16 text-white mx-auto mb-6 animate-bounce" />
            <h2 className="text-4xl font-black text-white mb-4">VOCÊ PODE SER O PRÓXIMO!</h2>
            <p className="text-xl text-white/90 mb-8">Jogue agora e concorra a prêmios incríveis de até R$ 10.000!</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/jogos">
                <Button className="bg-white text-amber-700 hover:bg-gray-100 font-bold text-lg px-8 py-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  <Gamepad2 className="h-6 w-6 mr-2" />
                  JOGAR AGORA
                </Button>
              </Link>
              <Link href="/deposito">
                <Button
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-amber-700 font-bold text-lg px-8 py-4 bg-transparent"
                >
                  <DollarSign className="h-6 w-6 mr-2" />
                  FAZER DEPÓSITO
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
