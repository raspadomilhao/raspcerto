"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Database, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface ConnectionStatus {
  success: boolean
  connection?: {
    status: string
    timestamp?: string
    version?: string
  }
  tables?: {
    found: string[]
    missing: string[]
    counts: Record<string, string | number>
  }
  ready?: boolean
  error?: string
}

export default function NeonSetupPage() {
  const [connectionString, setConnectionString] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [setupComplete, setSetupComplete] = useState(false)

  const testConnection = async () => {
    if (!connectionString.trim()) {
      alert("Por favor, insira a string de conexão do Neon")
      return
    }

    setIsConnecting(true)
    setStatus(null)

    try {
      // Primeiro, vamos salvar a string de conexão (em um app real, isso seria feito de forma segura)
      const response = await fetch("/api/setup-database", {
        method: "GET",
      })

      const result = await response.json()
      setStatus(result)
    } catch (error) {
      setStatus({
        success: false,
        error: error instanceof Error ? error.message : "Erro ao testar conexão",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const setupDatabase = async () => {
    setIsSettingUp(true)

    try {
      const response = await fetch("/api/setup-database", {
        method: "POST",
      })

      const result = await response.json()

      if (result.success) {
        setSetupComplete(true)
        // Testar novamente para atualizar o status
        await testConnection()
      } else {
        alert(`Erro no setup: ${result.error}`)
      }
    } catch (error) {
      alert(`Erro ao configurar banco: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    } finally {
      setIsSettingUp(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">Configuração do Banco Neon</h1>
          <p className="text-purple-200">Configure a conexão com seu banco de dados Neon</p>
        </div>

        {/* Configuração da Conexão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Conexão com Neon
            </CardTitle>
            <CardDescription>Insira sua string de conexão do Neon para configurar o banco de dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connection-string">String de Conexão do Neon</Label>
              <Input
                id="connection-string"
                type="password"
                placeholder="postgresql://username:password@host:port/database"
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Você pode encontrar sua string de conexão no dashboard do Neon
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={testConnection} disabled={isConnecting || !connectionString.trim()}>
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar Conexão
              </Button>

              {status?.success && !status?.ready && (
                <Button onClick={setupDatabase} disabled={isSettingUp} variant="outline">
                  {isSettingUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Configurar Banco
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status da Conexão */}
        {status && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Status da Conexão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status.success ? (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>Conexão estabelecida com sucesso!</AlertDescription>
                  </Alert>

                  {status.connection && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Status</Label>
                        <p className="text-sm font-mono">{status.connection.status}</p>
                      </div>
                      {status.connection.timestamp && (
                        <div>
                          <Label>Timestamp</Label>
                          <p className="text-sm font-mono">{status.connection.timestamp}</p>
                        </div>
                      )}
                      {status.connection.version && (
                        <div className="col-span-full">
                          <Label>Versão PostgreSQL</Label>
                          <p className="text-sm font-mono">{status.connection.version}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {status.tables && (
                    <div className="space-y-4">
                      <div>
                        <Label>Tabelas Encontradas</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {status.tables.found.map((table) => (
                            <Badge key={table} variant="secondary">
                              {table}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {status.tables.missing.length > 0 && (
                        <div>
                          <Label>Tabelas Faltando</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {status.tables.missing.map((table) => (
                              <Badge key={table} variant="destructive">
                                {table}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label>Contagem de Registros</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {Object.entries(status.tables.counts).map(([table, count]) => (
                            <div key={table} className="text-sm">
                              <span className="font-mono">{table}:</span> <span className="font-bold">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {status.ready ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>Banco de dados configurado e pronto para uso!</AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Banco conectado, mas algumas tabelas precisam ser criadas. Clique em "Configurar Banco" para
                        criar as tabelas necessárias.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>Erro na conexão: {status.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Setup Completo */}
        {setupComplete && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Setup Concluído!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Banco de dados configurado com sucesso! Todas as tabelas foram criadas e os dados iniciais foram
                  inseridos. Você pode agora usar a aplicação normalmente.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Como obter sua string de conexão do Neon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Acesse{" "}
                <a
                  href="https://neon.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  neon.tech
                </a>{" "}
                e faça login
              </li>
              <li>Crie um novo projeto ou selecione um existente</li>
              <li>Vá para a seção "Connection Details" ou "Dashboard"</li>
              <li>Copie a string de conexão que começa com "postgresql://"</li>
              <li>Cole a string no campo acima e teste a conexão</li>
            </ol>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Em produção, configure a variável de ambiente DATABASE_URL com sua string
                de conexão do Neon. Esta página é apenas para desenvolvimento e testes.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
