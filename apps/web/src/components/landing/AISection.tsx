'use client';

import { motion } from 'framer-motion';
import { Bot, CheckCircle2, Shield, Zap } from 'lucide-react';

export default function AISection() {
  return (
    <section className="py-24 bg-[#050811] relative overflow-hidden border-y border-slate-800">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-6"
        >
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm uppercase tracking-wider mb-2">
            <Bot size={18} />
            <span>Assistente Jurídico com IA</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            IA especializada em <br/>
            <span className="text-purple-400">Jurisprudência do TCU</span>
          </h2>
          
          <p className="text-slate-400 text-lg leading-relaxed">
            Não perca horas lendo páginas e páginas de editais. Nosso assistente utiliza tecnologia RAG alimentada com milhares de súmulas e decisões do TCU para extrair requisitos, avaliar riscos legais e responder às suas dúvidas instantaneamente.
          </p>

          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={20} />
              <p className="text-slate-300 text-sm">Resumos automáticos de qualificações técnicas exigidas.</p>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="text-emerald-400 shrink-0 mt-0.5" size={20} />
              <p className="text-slate-300 text-sm">Identificação de cláusulas potencialmente restritivas (direcionamento de licitação).</p>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="text-emerald-400 shrink-0 mt-0.5" size={20} />
              <p className="text-slate-300 text-sm">Redundância automática de provedores de IA (OpenAI, Anthropic e Google) para garantir 99.9% de uptime.</p>
            </div>
          </div>
        </motion.div>

        {/* Right Mockup */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="bg-[#0B1322] border border-slate-700/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Header chat */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">LicitaAI LegalBot</div>
                <div className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Online e analisando edital
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex flex-col gap-4">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-slate-800 text-slate-200 text-sm p-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                  Existem cláusulas restritivas de qualificação técnica neste edital?
                </div>
              </div>
              
              {/* Bot typing */}
              <div className="flex items-center gap-2 ml-2 mb-1">
                <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>

              {/* Bot response */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="flex justify-start"
              >
                <div className="bg-purple-900/20 border border-purple-500/20 text-slate-200 text-sm p-4 rounded-2xl rounded-tl-sm max-w-[95%] shadow-sm leading-relaxed">
                  <strong className="text-purple-300 block mb-2">Sim, encontrei um ponto de atenção (RiskScore: Alto).</strong>
                  O item 8.2.1 exige que a certificação técnica seja exclusiva de um fabricante específico. Conforme a <strong className="text-cyan-400 cursor-pointer hover:underline">Súmula 255 do TCU</strong>, é vedada a exigência de comprovação de atividade executada em localidade, órgão ou entidade específica, bem como vinculação a fabricante X sem justificativa técnica. <br/><br/>
                  Deseja que eu gere uma minuta de impugnação do edital baseada nesta jurisprudência?
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
