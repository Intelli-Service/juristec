import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-slate-900 shadow-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl font-bold text-white">Jurídico<span className="text-emerald-400">IA</span></div>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#como-funciona" className="text-slate-300 hover:text-white transition-colors duration-200">Como Funciona</a>
              <a href="#beneficios" className="text-slate-300 hover:text-white transition-colors duration-200">Benefícios</a>
              <a href="#contato" className="text-slate-300 hover:text-white transition-colors duration-200">Contato</a>
            </nav>
            <Link
              href="/chat"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Começar Agora
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 py-24 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 animate-fade-in-up">
            Assessoria Jurídica
            <span className="block text-emerald-600 animate-pulse">Inteligente e Acessível</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-4xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            Conectamos você a advogados especializados através de uma conversa natural com IA.
            Resolva seus problemas jurídicos de forma rápida, eficiente e sem burocracia.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up animation-delay-400">
            <Link
              href="/chat"
              className="group bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 px-10 rounded-xl text-xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 transform hover:-translate-y-2 hover:scale-105"
            >
              <span className="flex items-center gap-2">
                Iniciar Consulta Gratuita
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <p className="text-base text-slate-500 max-w-md animate-bounce">
              Sem formulários complexos. Apenas uma conversa natural com nossa IA jurídica.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="animate-fade-in-up">
              <div className="text-4xl font-bold text-emerald-400 mb-2">10K+</div>
              <div className="text-slate-300">Consultas Realizadas</div>
            </div>
            <div className="animate-fade-in-up animation-delay-200">
              <div className="text-4xl font-bold text-emerald-400 mb-2">98%</div>
              <div className="text-slate-300">Satisfação</div>
            </div>
            <div className="animate-fade-in-up animation-delay-400">
              <div className="text-4xl font-bold text-emerald-400 mb-2">24/7</div>
              <div className="text-slate-300">Disponibilidade</div>
            </div>
            <div className="animate-fade-in-up animation-delay-600">
              <div className="text-4xl font-bold text-emerald-400 mb-2">100%</div>
              <div className="text-slate-300">Seguro</div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Como Funciona</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Processo simples e intuitivo para obter assessoria jurídica qualificada em minutos.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group animate-fade-in-up animation-delay-200">
              <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-200 transition-all duration-300 transform group-hover:scale-110 group-hover:rotate-6">
                <svg className="w-10 h-10 text-emerald-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">1. Inicie a Conversa</h3>
              <p className="text-slate-600 leading-relaxed">Descreva seu problema jurídico de forma natural, como se estivesse falando com um amigo. Nossa IA entende contexto e linguagem cotidiana.</p>
            </div>
            <div className="text-center group animate-fade-in-up animation-delay-400">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-all duration-300 transform group-hover:scale-110 group-hover:-rotate-6">
                <svg className="w-10 h-10 text-blue-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">2. IA Analisa Profundamente</h3>
              <p className="text-slate-600 leading-relaxed">Nossa inteligência artificial avançada analisa seu caso, considerando legislação atual e jurisprudência relevante para uma avaliação precisa.</p>
            </div>
            <div className="text-center group animate-fade-in-up animation-delay-600">
              <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-amber-200 transition-all duration-300 transform group-hover:scale-110 group-hover:rotate-6">
                <svg className="w-10 h-10 text-amber-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">3. Conecte-se ao Especialista</h3>
              <p className="text-slate-600 leading-relaxed">Se necessário, seja direcionado automaticamente a um advogado especialista em sua área, garantindo assessoria personalizada e qualificada.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Por Que Escolher Nossa Plataforma</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Tecnologia de ponta aliada à expertise jurídica tradicional para uma experiência excepcional.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in-up animation-delay-200">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-200 transition-colors duration-300">
                <svg className="w-7 h-7 text-green-600 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Rápido e Eficiente</h3>
              <p className="text-slate-600 leading-relaxed">Respostas instantâneas e processos otimizados economizam seu tempo precioso, permitindo foco no que realmente importa.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in-up animation-delay-400">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors duration-300">
                <svg className="w-7 h-7 text-blue-600 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Seguro e Confidencial</h3>
              <p className="text-slate-600 leading-relaxed">Seus dados estão protegidos com criptografia de ponta a ponta e compliance total com LGPD e normas de privacidade.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in-up animation-delay-600">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-amber-200 transition-colors duration-300">
                <svg className="w-7 h-7 text-amber-600 group-hover:animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Acessível e Transparente</h3>
              <p className="text-slate-600 leading-relaxed">Consultas iniciais gratuitas e preços transparentes, sem taxas ocultas ou surpresas desagradáveis.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">O Que Nossos Usuários Dizem</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 animate-fade-in-up animation-delay-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-emerald-600 font-bold">MC</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Maria Clara</div>
                  <div className="text-slate-500 text-sm">Empresária</div>
                </div>
              </div>
              <p className="text-slate-600 italic">"A plataforma me ajudou a entender meus direitos trabalhistas em minutos. Evitou um processo longo e custoso."</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 animate-fade-in-up animation-delay-400">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold">JR</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">João Roberto</div>
                  <div className="text-slate-500 text-sm">Advogado</div>
                </div>
              </div>
              <p className="text-slate-600 italic">"Como advogado, recomendo esta ferramenta. A IA é surpreendentemente precisa e ajuda meus clientes a se prepararem melhor."</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 animate-fade-in-up animation-delay-600">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-amber-600 font-bold">AS</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Ana Silva</div>
                  <div className="text-slate-500 text-sm">Estudante de Direito</div>
                </div>
              </div>
              <p className="text-slate-600 italic">"Ferramenta incrível para estudos. Me ajuda a praticar casos reais e entender aplicações práticas da legislação."</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fade-in-up">
            Pronto para Resolver Seu Problema Jurídico?
          </h2>
          <p className="text-xl text-slate-300 mb-10 animate-fade-in-up animation-delay-200">
            Comece sua consulta gratuita agora mesmo. Sem compromisso, sem burocracia.
          </p>
          <Link
            href="/chat"
            className="group inline-flex items-center bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-5 px-12 rounded-2xl text-xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/50 transform hover:-translate-y-2 hover:scale-105"
          >
            Iniciar Conversa Gratuita
            <svg className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="text-3xl font-bold mb-6">Jurídico<span className="text-emerald-400">IA</span></div>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Revolucionando o acesso à justiça através da tecnologia e inteligência artificial.
                Tornando o direito acessível, eficiente e transparente para todos.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/></svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-white">Links Rápidos</h3>
              <ul className="space-y-3 text-slate-400">
                <li><a href="#como-funciona" className="hover:text-emerald-400 transition-colors">Como Funciona</a></li>
                <li><a href="#beneficios" className="hover:text-emerald-400 transition-colors">Benefícios</a></li>
                <li><a href="/chat" className="hover:text-emerald-400 transition-colors">Iniciar Chat</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Política de Privacidade</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-white">Suporte</h3>
              <p className="text-slate-400 mb-4">
                Suporte disponível 24/7<br />
                Email: suporte@juridicoia.com<br />
                Telefone: (11) 9999-9999
              </p>
              <div className="text-sm text-slate-500">
                Tempo médio de resposta: 2 horas
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <p>&copy; 2025 JurídicoIA. Todos os direitos reservados. | Desenvolvido com ❤️ para democratizar o acesso à justiça.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
