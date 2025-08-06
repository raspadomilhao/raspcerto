"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PoliticaDePrivacidade() {
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
            <CardTitle className="text-2xl font-bold text-white text-center">Política de Privacidade</CardTitle>
            <p className="text-white/80 text-center">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
          </CardHeader>
          <CardContent className="text-white/90 space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">1. Introdução</h2>
              <p>
                A Raspadinha Premiada valoriza sua privacidade e está comprometida em proteger suas informações
                pessoais. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos seus
                dados.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">2. Informações que Coletamos</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-white">2.1 Informações Fornecidas por Você:</h3>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Nome completo</li>
                    <li>Endereço de e-mail</li>
                    <li>Número de telefone</li>
                    <li>Dados bancários para depósitos e saques</li>
                    <li>Documentos de identificação (quando necessário)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">2.2 Informações Coletadas Automaticamente:</h3>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Endereço IP</li>
                    <li>Tipo de dispositivo e navegador</li>
                    <li>Dados de localização</li>
                    <li>Histórico de jogos e transações</li>
                    <li>Cookies e tecnologias similares</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">3. Como Usamos suas Informações</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Fornecer e manter nossos serviços</li>
                <li>Processar depósitos e saques</li>
                <li>Verificar sua identidade e prevenir fraudes</li>
                <li>Enviar notificações importantes sobre sua conta</li>
                <li>Melhorar nossos serviços e experiência do usuário</li>
                <li>Cumprir obrigações legais e regulamentares</li>
                <li>Enviar comunicações promocionais (com seu consentimento)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">4. Compartilhamento de Informações</h2>
              <p className="mb-3">
                Não vendemos suas informações pessoais. Podemos compartilhar seus dados apenas nas seguintes situações:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Com provedores de serviços terceirizados (processamento de pagamentos)</li>
                <li>Para cumprir obrigações legais ou ordens judiciais</li>
                <li>Para proteger nossos direitos e segurança</li>
                <li>Em caso de fusão, aquisição ou venda de ativos</li>
                <li>Com seu consentimento explícito</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">5. Segurança dos Dados</h2>
              <p className="mb-3">
                Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Criptografia SSL/TLS para transmissão de dados</li>
                <li>Armazenamento seguro em servidores protegidos</li>
                <li>Controle de acesso restrito aos dados</li>
                <li>Monitoramento contínuo de segurança</li>
                <li>Auditorias regulares de segurança</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">6. Retenção de Dados</h2>
              <p>
                Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir os propósitos descritos
                nesta política, atender requisitos legais ou resolver disputas. Dados de transações podem ser mantidos
                por períodos mais longos conforme exigido por lei.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">7. Seus Direitos</h2>
              <p className="mb-3">De acordo com a LGPD, você tem os seguintes direitos:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Acesso aos seus dados pessoais</li>
                <li>Correção de dados incompletos ou incorretos</li>
                <li>Exclusão de dados desnecessários</li>
                <li>Portabilidade dos dados</li>
                <li>Revogação do consentimento</li>
                <li>Informações sobre compartilhamento de dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">8. Cookies</h2>
              <p className="mb-3">Utilizamos cookies para:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Manter você logado na plataforma</li>
                <li>Lembrar suas preferências</li>
                <li>Analisar o uso da plataforma</li>
                <li>Personalizar sua experiência</li>
              </ul>
              <p className="mt-3">Você pode gerenciar cookies através das configurações do seu navegador.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">9. Menores de Idade</h2>
              <p>
                Nossos serviços são destinados apenas a maiores de 18 anos. Não coletamos intencionalmente informações
                de menores de idade. Se descobrirmos que coletamos dados de um menor, excluiremos essas informações
                imediatamente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">10. Transferências Internacionais</h2>
              <p>
                Seus dados podem ser processados em servidores localizados fora do Brasil. Garantimos que essas
                transferências atendam aos padrões de proteção adequados conforme a LGPD.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">11. Alterações nesta Política</h2>
              <p>
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças
                significativas através da plataforma ou por e-mail. Recomendamos revisar esta política regularmente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">12. Encarregado de Dados</h2>
              <p>
                Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de dados pessoais, entre em contato
                com nosso Encarregado de Dados através dos canais de suporte disponíveis na plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">13. Contato</h2>
              <p>
                Para questões sobre esta Política de Privacidade ou sobre o tratamento de seus dados pessoais, entre em
                contato conosco através dos canais de suporte disponíveis na plataforma.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
