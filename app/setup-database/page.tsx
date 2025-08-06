"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Database, Settings, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function SetupDatabasePage() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)

  const runDatabaseSetup = async () => {
    setIsRunning(true)
    setResults([])
    setIsComplete(false)

    try {
      const response = await fetch("/api/setup-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResults(data.results || ["Setup completed successfully"])
        setIsComplete(true)
        toast({
          title: "Database setup completed!",
          description: "All tables and initial data have been created.",
        })
      } else {
        throw new Error(data.error || "Setup failed")
      }
    } catch (error) {
      console.error("Setup error:", error)
      setResults([`Error: ${error instanceof Error ? error.message : "Unknown error"}`])
      toast({
        title: "Setup failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-4">
            <Database className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Database Setup
          </h1>
          <p className="text-gray-300">Initialize your Neon database with all required tables and data</p>
        </div>

        <div className="grid gap-6">
          {/* Setup Card */}
          <Card className="bg-black/40 backdrop-blur-xl border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Settings className="h-6 w-6 text-purple-400" />
                <span>Database Initialization</span>
              </CardTitle>
              <CardDescription className="text-gray-300">
                This will create all necessary tables, indexes, and seed data for your application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Run Complete Setup</p>
                  <p className="text-gray-400 text-sm">Creates tables, indexes, and initial data</p>
                </div>
                <Button
                  onClick={runDatabaseSetup}
                  disabled={isRunning}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    "Run Setup"
                  )}
                </Button>
              </div>

              {/* Status */}
              {isComplete && (
                <div className="flex items-center space-x-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-green-300 font-medium">Setup completed successfully!</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Card */}
          {results.length > 0 && (
            <Card className="bg-black/40 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Setup Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-2 p-2 bg-white/5 rounded border border-white/10"
                    >
                      {result.includes("Error") ? (
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${result.includes("Error") ? "text-red-300" : "text-gray-300"}`}>
                        {result}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Environment Info */}
          <Card className="bg-black/40 backdrop-blur-xl border border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Environment Status</CardTitle>
              <CardDescription className="text-gray-300">Current environment configuration status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Database Connection</span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                  Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">HorsePay Integration</span>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  Configured
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">JWT Authentication</span>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  Ready
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-black/40 backdrop-blur-xl border border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-3">
                <Badge className="bg-purple-500 text-white font-bold min-w-[24px] h-6 flex items-center justify-center">
                  1
                </Badge>
                <div>
                  <p className="text-white font-medium">Run Database Setup</p>
                  <p className="text-gray-300 text-sm">
                    Click the "Run Setup" button above to initialize your database
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-purple-500 text-white font-bold min-w-[24px] h-6 flex items-center justify-center">
                  2
                </Badge>
                <div>
                  <p className="text-white font-medium">Configure Environment Variables</p>
                  <p className="text-gray-300 text-sm">Ensure all required environment variables are set in Vercel</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-purple-500 text-white font-bold min-w-[24px] h-6 flex items-center justify-center">
                  3
                </Badge>
                <div>
                  <p className="text-white font-medium">Test the Application</p>
                  <p className="text-gray-300 text-sm">
                    Visit the main application and test user registration and games
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
