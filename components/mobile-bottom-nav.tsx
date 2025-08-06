"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Home, Gamepad2, Trophy, User, Plus, Wallet, LogOut, Users, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AuthClient } from "@/lib/auth-client"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

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

const formatCurrency = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return "0.00"
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue) ? "0.00" : numValue.toFixed(2)
}

export function MobileBottomNav() {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/user/profile")
      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/auth/logout", {
        method: "POST",
      })

      if (response.ok) {
        AuthClient.removeToken()
        toast({
          title: "Logout realizado",
          description: "Você foi desconectado com sucesso.",
        })
        router.push("/auth")
      } else {
        throw new Error("Erro no logout")
      }
    } catch (error) {
      console.error("Erro no logout:", error)
      AuthClient.removeToken()
      router.push("/auth")
    }
    setShowProfileMenu(false)
  }

  const navItems = [
    {
      icon: Home,
      label: "Início",
      href: "/home",
      active: pathname === "/home",
    },
    {
      icon: Gamepad2,
      label: "Jogos",
      href: "/jogos",
      active: pathname === "/jogos" || pathname.startsWith("/jogo/"),
    },
    {
      icon: Plus,
      label: "Depósito",
      href: "/deposito",
      active: pathname === "/deposito",
      isDeposit: true,
    },
    {
      icon: Trophy,
      label: "Vencedores",
      href: "/vencedores",
      active: pathname === "/vencedores",
    },
    {
      icon: User,
      label: "Perfil",
      href: "#",
      active: showProfileMenu,
      onClick: () => setShowProfileMenu(!showProfileMenu),
    },
  ]

  return (
    <>
      {/* Profile Menu Overlay */}
      {showProfileMenu && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowProfileMenu(false)} />
      )}

      {/* Profile Menu */}
      {showProfileMenu && (
        <div className="fixed bottom-20 left-3 right-3 z-50 md:hidden">
          <Card className="bg-black/95 backdrop-blur-sm border-gray-800 rounded-xl shadow-2xl overflow-hidden">
            {/* Header do menu */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-white font-semibold">Menu do Usuário</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileMenu(false)}
                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                <p className="text-gray-400 text-sm">Carregando...</p>
              </div>
            ) : userProfile ? (
              <div className="p-4">
                {/* User Info & Balance */}
                <Link href="/deposito" onClick={() => setShowProfileMenu(false)} className="block mb-4">
                  <div className="flex items-center justify-between bg-gradient-to-r from-primary/20 to-gold-600/20 rounded-lg p-4 hover:from-primary/30 hover:to-gold-600/30 transition-all duration-200 border border-primary/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-gold-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {userProfile.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">{userProfile.user.name}</p>
                        <p className="text-primary font-bold">R$ {formatCurrency(userProfile.wallet.balance)}</p>
                      </div>
                    </div>
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                </Link>

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Link href="/saque" onClick={() => setShowProfileMenu(false)} className="block">
                    <div className="flex flex-col items-center justify-center p-4 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-all duration-200 border border-blue-600/30 min-h-[80px]">
                      <Wallet className="h-6 w-6 text-blue-400 mb-2" />
                      <span className="text-blue-400 font-semibold">Saque</span>
                    </div>
                  </Link>

                  <Link href="/afiliado" onClick={() => setShowProfileMenu(false)} className="block">
                    <div className="flex flex-col items-center justify-center p-4 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-all duration-200 border border-purple-600/30 min-h-[80px]">
                      <Users className="h-6 w-6 text-purple-400 mb-2" />
                      <span className="text-purple-400 font-semibold">Afiliado</span>
                    </div>
                  </Link>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center p-4 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-all duration-200 border border-red-600/30"
                >
                  <LogOut className="h-5 w-5 text-red-400 mr-2" />
                  <span className="text-red-400 font-semibold">Sair da Conta</span>
                </button>
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-400 mb-4">Erro ao carregar dados</p>
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10 z-30 md:hidden">
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon

            if (item.isDeposit) {
              return (
                <div key={item.label} className="flex justify-center">
                  <Link
                    href={item.href}
                    className="flex flex-col items-center justify-center w-14 h-14 bg-gradient-to-br from-primary to-gold-600 rounded-full shadow-lg shadow-primary/30 transform transition-all duration-200 hover:scale-105 active:scale-95 -mt-6"
                  >
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </Link>
                </div>
              )
            }

            return (
              <div key={item.label} className="flex justify-center flex-1">
                {item.onClick ? (
                  <button
                    onClick={item.onClick}
                    className={`flex flex-col items-center justify-center py-2 px-3 transition-colors min-w-0 ${
                      item.active ? "text-primary" : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center justify-center py-2 px-3 transition-colors min-w-0 ${
                      item.active ? "text-primary" : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Safe area padding for devices with home indicator */}
      <style jsx>{`
        .pb-safe {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </>
  )
}
