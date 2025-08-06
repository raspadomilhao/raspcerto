"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Crown, LogIn, UserPlus, Eye, EyeOff, Home, Gamepad2, Trophy, Wallet, Dice1, ArrowLeft } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { AuthClient } from "@/lib/auth-client"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import Link from "next/link"

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [hasReferralFromUrl, setHasReferralFromUrl] = useState(false)

  // Estados do formulário
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [phone, setPhone] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)

  // Verificar se já está logado
  useEffect(() => {
    const token = AuthClient.getToken()
    if (token && AuthClient.isLoggedIn()) {
      router.push("/home")
    }

    // Capturar código de referência da URL
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const refCode = urlParams.get("ref")
      if (refCode) {
        setReferralCode(refCode.toUpperCase())
        setHasReferralFromUrl(true)
        setIsLogin(false)
      }
    }
  }, [router])

  // Função de login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: email, password }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.token) {
          AuthClient.setToken(data.token)
        }

        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para a página inicial...",
        })

        router.push("/home")
      } else {
        throw new Error(data.error || "Falha no login")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
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
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (password !== confirmPassword) {
      toast({
        title: "Erro no registro",
        description: "As senhas não coincidem",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    if (!acceptTerms) {
      toast({
        title: "Erro no registro",
        description: "Você deve aceitar os termos de uso",
        variant: "destructive",
      })
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
          email,
          password,
          referral_code: referralCode,
          confirmPassword,
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.token) {
          AuthClient.setToken(data.token)

          toast({
            title: "Conta criada com sucesso!",
            description: "Bem-vindo ao RaspMax! Redirecionando...",
          })

          setTimeout(() => {
            router.push("/home")
          }, 1000)
        } else {
          toast({
            title: "Conta criada com sucesso!",
            description: "Agora você pode fazer login.",
          })
          setIsLogin(true)
          setEmail("")
          setName("")
          setUsername("")
          setPhone("")
          setPassword("")
          setConfirmPassword("")
          setReferralCode("")
          setAcceptTerms(false)
        }
      } else {
        throw new Error(data.error || "Falha no registro")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      toast({
        title: "Erro no registro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Animated background - mais sutil no mobile */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-30 md:opacity-100"></div>
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
                RaspMax
              </span>
            </Link>

            {/* Navegação mobile */}
            <div className="md:hidden">
              <Link href="/home">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-primary hover:bg-white/10 border border-white/10 text-xs px-2 py-1 h-7"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Voltar
                </Button>
              </Link>
            </div>

            {/* Navegação desktop */}
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
                className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors font-medium"
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

            {/* Botão voltar desktop */}
            <div className="hidden md:block">
              <Link href="/home">
                <Button
                  variant="ghost"
                  className="text-gray-300 hover:text-primary hover:bg-white/10 border border-white/10"
                >
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal - Mobile-First */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-80px)] p-3 md:p-4 pb-20 md:pb-4">
        <div className="w-full max-w-sm md:max-w-md">
          {/* Logo e título - compacto no mobile */}
          <div className="text-center mb-6 md:mb-8">
            <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-primary to-gold-600 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-primary/25 animate-glow">
              <Crown className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500 mb-2 md:mb-3 text-glow">
              {isLogin ? "Bem-vindo de volta!" : "Crie sua conta"}
            </h1>
            <p className="text-gray-300 text-sm md:text-base">
              {isLogin ? "Faça login para continuar jogando" : "Junte-se a milhares de jogadores"}
            </p>
          </div>

          {/* Card de autenticação - otimizado para mobile */}
          <Card className="bg-secondary/50 backdrop-blur-sm border-white/10 shadow-lg shadow-black/20">
            <CardHeader className="text-center pb-3 md:pb-4">
              <CardTitle className="text-lg md:text-xl text-white flex items-center justify-center space-x-2">
                {isLogin ? (
                  <LogIn className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                ) : (
                  <UserPlus className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                )}
                <span>{isLogin ? "Fazer Login" : "Criar Conta"}</span>
              </CardTitle>
              <CardDescription className="text-gray-400 text-sm">
                {isLogin ? "Acesse sua conta para jogar" : "Preencha os dados abaixo"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
              <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-3 md:space-y-4">
                {!isLogin && (
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
                        required
                        className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 focus:border-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="username" className="text-gray-200 text-sm">
                        Nome de usuário *
                      </Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Escolha um nome de usuário"
                        required
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
                        required
                        className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 focus:border-primary text-sm"
                      />
                    </div>

                    {/* Campo de código de referência - só mostrar se NÃO veio da URL */}
                    {!hasReferralFromUrl && (
                      <div className="space-y-1 md:space-y-2">
                        <Label htmlFor="referralCode" className="text-gray-200 text-sm">
                          Código de Indicação (opcional)
                        </Label>
                        <Input
                          id="referralCode"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                          placeholder="Digite o código se foi indicado"
                          className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 focus:border-primary text-sm"
                        />
                        {referralCode && (
                          <p className="text-primary text-xs mt-1">✓ Código de indicação aplicado: {referralCode}</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="email" className="text-gray-200 text-sm">
                    {isLogin ? "Email ou usuário" : "Email *"}
                  </Label>
                  <Input
                    id="email"
                    type={isLogin ? "text" : "email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isLogin ? "seu@email.com ou usuario" : "seu@email.com"}
                    required
                    className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 focus:border-primary text-sm"
                  />
                </div>

                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="password" className="text-gray-200 text-sm">
                    Senha {!isLogin && "*"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isLogin ? "Sua senha" : "Mínimo 6 caracteres"}
                      required
                      className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 pr-10 focus:border-primary text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {!isLogin && (
                  <>
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
                          required
                          className="h-9 md:h-10 bg-black/20 border-white/10 text-white placeholder:text-gray-400 pr-10 focus:border-primary text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                        Aceito os{" "}
                        <Link href="/termos-de-uso" className="text-primary hover:underline">
                          termos de uso
                        </Link>{" "}
                        e{" "}
                        <Link href="/politica-de-privacidade" className="text-primary hover:underline">
                          política de privacidade
                        </Link>
                      </Label>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 md:h-10 bg-gradient-to-r from-primary to-gold-600 hover:shadow-lg hover:shadow-primary/40 text-primary-foreground font-bold shadow-md shadow-primary/25 transition-all duration-300 text-sm"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processando...</span>
                    </div>
                  ) : isLogin ? (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrar
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Criar conta
                    </>
                  )}
                </Button>
              </form>

              <Separator className="bg-white/10" />

              <Button
                variant="ghost"
                onClick={() => setIsLogin(!isLogin)}
                className="w-full text-gray-300 hover:text-white hover:bg-white/10 text-sm"
              >
                {isLogin ? "Não tem conta? Registre-se" : "Já tem conta? Faça login"}
              </Button>

              {/* Informações adicionais - compactas no mobile */}
              <div className="text-center text-xs text-gray-400 bg-black/20 p-2 md:p-3 rounded-lg border border-white/10">
                <p>
                  <strong className="text-primary">100% Seguro:</strong> Seus dados estão protegidos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Barra de navegação inferior móvel */}
      <MobileBottomNav />
    </div>
  )
}
