// Utilitários para gerenciar autenticação no cliente
export class AuthClient {
  private static TOKEN_KEY = "horsepay-auth-token"
  private static ADMIN_SESSION_KEY = "admin-session-active"

  static setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.TOKEN_KEY, token)
      console.log("✅ Token salvo no localStorage")
    }
  }

  static getToken(): string | null {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(this.TOKEN_KEY)
      return token
    }
    return null
  }

  static removeToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.TOKEN_KEY)
      localStorage.removeItem(this.ADMIN_SESSION_KEY)
      console.log("✅ Token removido do localStorage")
    }
  }

  // Marcar sessão admin como ativa
  static setAdminSession() {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.ADMIN_SESSION_KEY, "true")
      console.log("✅ Sessão admin ativada")
    }
  }

  // Verificar se sessão admin está ativa
  static isAdminSession(): boolean {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.ADMIN_SESSION_KEY) === "true"
    }
    return false
  }

  static getAuthHeaders(): HeadersInit {
    const token = this.getToken()
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    // Se é sessão admin, adicionar header especial
    if (this.isAdminSession()) {
      headers["x-admin-auth"] = "admin-session-active" // This is the key!
    } else if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    return headers
  }

  static async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: "include", // Incluir cookies
    })
  }

  // Verificar se o usuário está logado
  static isLoggedIn(): boolean {
    // Se é sessão admin, considerar logado
    if (this.isAdminSession()) {
      return true
    }

    const token = this.getToken()
    if (!token) return false

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      const now = Date.now() / 1000
      return payload.exp > now
    } catch {
      return false
    }
  }

  // Obter dados do usuário do token
  static getUserFromToken(): { userId: number; email: string; userType: string } | null {
    // Se é sessão admin, retornar dados admin
    if (this.isAdminSession()) {
      return {
        userId: 1,
        email: "admin@system.com",
        userType: "admin",
      }
    }

    const token = this.getToken()
    if (!token) return null

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      return {
        userId: payload.userId,
        email: payload.email,
        userType: payload.userType || "regular",
      }
    } catch {
      return null
    }
  }
}
