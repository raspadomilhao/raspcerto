"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TermosDeUso() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white text-center">Termos de Uso</CardTitle>
            <p className="text-white/80 text-center">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
          </CardHeader>
          <CardContent className="text-white/90 space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar e utilizar a plataforma Raspadinha Premiada, você concorda em cumprir e estar vinculado a
                estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve utilizar nossos
                serviços.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">2. Descrição do Serviço</h2>
              <p>
                A Raspadinha Premiada é uma plataforma de entretenimento online que oferece jogos de raspadinha
                digitais. Os usuários podem fazer depósitos, jogar e solicitar saques de acordo com as regras
                estabelecidas.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">3. Elegibilidade</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Você deve ter pelo menos 18 anos de idade</li>
                <li>Deve fornecer informações verdadeiras e precisas durante o cadastro</li>
                <li>É responsável por manter a confidencialidade de sua conta</li>
                <li>Não pode criar múltiplas contas</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">4. Depósitos e Saques</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>O valor mínimo para depósito é de R$ 1,00</li>
                <li>Os depósitos são processados via PIX</li>
                <li>Saques estão sujeitos a verificação e podem levar até 24 horas para processamento</li>
                <li>Reservamo-nos o direito de solicitar documentação para verificação de identidade</li>
                <li>Taxas podem ser aplicadas conforme especificado na plataforma</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">5. Regras dos Jogos</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Cada jogo tem suas próprias regras e probabilidades</li>
                <li>Os resultados são determinados por algoritmos certificados</li>
                <li>Não é permitido o uso de bots ou software automatizado</li>
                <li>Tentativas de fraude resultarão no banimento da conta</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">6. Jogo Responsável</h2>
              <p>
                Promovemos o jogo responsável. Se você sente que tem problemas com jogos, procure ajuda profissional.
                Oferecemos ferramentas de autoexclusão e limites de depósito mediante solicitação.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">7. Proibições</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Uso da plataforma para atividades ilegais</li>
                <li>Tentativas de hackear ou comprometer a segurança</li>
                <li>Compartilhamento de credenciais de acesso</li>
                <li>Comportamento abusivo ou inadequado</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">8. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo da plataforma, incluindo design, logos, textos e software, é propriedade da Raspadinha
                Premiada e está protegido por leis de direitos autorais.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">9. Limitação de Responsabilidade</h2>
              <p>
                A Raspadinha Premiada não se responsabiliza por perdas indiretas, lucros cessantes ou danos
                consequenciais. Nossa responsabilidade está limitada ao valor depositado em sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">10. Suspensão e Encerramento</h2>
              <p>
                Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos, sem aviso prévio. Em
                caso de encerramento, saldos válidos serão devolvidos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">11. Modificações</h2>
              <p>
                Estes termos podem ser atualizados periodicamente. Usuários serão notificados sobre mudanças
                significativas. O uso continuado da plataforma constitui aceitação dos novos termos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">12. Lei Aplicável</h2>
              <p>
                Estes termos são regidos pelas leis brasileiras. Disputas serão resolvidas nos tribunais competentes do
                Brasil.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">13. Contato</h2>
              <p>
                Para dúvidas sobre estes termos, entre em contato através dos canais de suporte disponíveis na
                plataforma.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
