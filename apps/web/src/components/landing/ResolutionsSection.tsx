'use client';

import { motion } from 'framer-motion';
import { FileText, ArrowRight, ShieldCheck, Database, Calendar, Landmark, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ResolutionsSection() {
  const steps = [
    {
      icon: Landmark,
      title: "1. Publicação",
      desc: "Secretaria Estadual ou Fundo de Saúde publica a Resolução destinando a verba.",
      color: "text-cyan-400"
    },
    {
      icon: Database,
      title: "2. Leitura por IA",
      desc: "Nossa IA faz a varredura, extrai planilhas Excel/PDFs e consolida os dados.",
      color: "text-purple-400"
    },
    {
      icon: Sparkles,
      title: "3. Oportunidade",
      desc: "Você recebe o alerta da verba liberada meses antes da licitação ir ao ar.",
      color: "text-emerald-400"
    }
  ];

  return (
    <section className="py-24 bg-[#0B1322] relative overflow-hidden border-b border-slate-800">
      {/* Background decoration */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-900/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={12} />
            <span>Recurso Exclusivo</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
            Detecte a compra antes da <br/>
            <span style={{ 
              background: 'linear-gradient(90deg, #00F0FF 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>licitação sequer existir</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Mais de 80% das verbas públicas para saúde e infraestrutura são autorizadas por meio de <strong>Resoluções, Portarias e Deliberações</strong> com anexos ocultos. Nossa IA mapeia esses repasses no diário oficial para colocar você no início do ciclo de compra.
          </p>
        </div>

        {/* Visual Workflow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2, duration: 0.5 }}
              className="bg-[#111A2D]/55 border border-slate-800 p-6 rounded-2xl relative group hover:border-slate-700/60 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                <step.icon className={step.color} size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              
              {idx < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 z-20 text-slate-700 pointer-events-none">
                  <ArrowRight size={20} className="animate-pulse" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Deep Dive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side: Detail list */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              O "Tesouro Oculto" dos Diários Oficiais aberto pela IA
            </h3>
            
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Quando um órgão público libera dinheiro para comprar equipamentos hospitalares, ambulâncias ou medicamentos, ele formaliza a decisão administrativa em Resoluções acompanhadas de planilhas.
            </p>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-cyan-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-white">Extração de Anexos Ocultos</h4>
                  <p className="text-slate-400 text-xs mt-1">Lemos planilhas Excel, PDFs técnicos e ofícios anexados para extrair quais cidades receberam o dinheiro e quanto.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-cyan-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-white">Fórmula de Antecipação de Vendas</h4>
                  <p className="text-slate-400 text-xs mt-1">Sabendo quem tem o dinheiro antes da licitação ser aberta, sua equipe de vendas pode fazer o contato comercial prévio de forma estratégica.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-cyan-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-white">Automatização do Processo de Varredura</h4>
                  <p className="text-slate-400 text-xs mt-1">Esqueça ter que abrir dezenas de sites de governos todos os dias. Nossa IA consolida tudo e gera resumos em tópicos simples e acionáveis.</p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Link href="/cadastro" className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 bg-cyan-400 hover:bg-cyan-300 px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)]">
                <span>Experimentar Módulo Grátis</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Right Side: Interactive AI Mockup */}
          <div className="lg:col-span-7 relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-25" />
            
            <div className="relative bg-[#111A2D] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              
              {/* Top Bar */}
              <div className="bg-[#0B1322] px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xs font-semibold text-slate-400 bg-slate-900 px-3 py-1 rounded-md border border-slate-800">
                  resolucoes_analisador_ia.py
                </div>
                <div className="w-6" />
              </div>

              {/* Mockup Grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Panel: Document Source */}
                <div className="bg-[#0B1322] border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 border-b border-slate-800 pb-2">
                    <FileText size={14} className="text-slate-500" />
                    <span>DIÁRIO OFICIAL DA SAÚDE</span>
                  </div>
                  
                  <div className="text-[11px] font-mono text-slate-400 space-y-2 leading-relaxed max-h-[220px] overflow-y-auto pr-1">
                    <p className="text-slate-300 font-bold">RESOLUÇÃO SES/MG Nº 245/2026</p>
                    <p>Fica autorizado o repasse de recursos financeiros estaduais para aquisição de veículos tipo ambulância aos municípios constantes no Anexo I.</p>
                    <p className="text-cyan-400 font-semibold mt-2">[...] Art 2º - O valor global autorizado é de R$ 120.000.000,00.</p>
                    <p className="text-slate-500">[...] Anexo I - Relação de Beneficiários:</p>
                    <div className="border border-slate-800/60 rounded bg-slate-950/40 p-2 space-y-1 text-[10px] text-slate-500">
                      <p>• Ipatinga - CNPJ: 20.912... - R$ 820.000,00</p>
                      <p>• Timóteo - CNPJ: 18.231... - R$ 410.000,00</p>
                      <p>• Col. Fabriciano - CNPJ: 22.451... - R$ 615.000,00</p>
                    </div>
                    <p className="text-purple-400">[...] Parágrafo único: Os municípios contemplados deverão abrir processo licitatório no prazo improrrogável de até 120 dias a contar da publicação.</p>
                  </div>
                </div>

                {/* Right Panel: AI Summary Output */}
                <div className="bg-[#0D1E2D]/40 border border-cyan-500/25 p-4 rounded-xl flex flex-col gap-3 shadow-[inset_0_0_15px_rgba(6,182,212,0.05)]">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                      <Sparkles size={14} />
                      <span>SUMÁRIO DA IA</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      100% Mapeado
                    </div>
                  </div>

                  <div className="text-xs space-y-3 leading-relaxed">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Objeto Identificado</span>
                      <span className="text-white font-semibold">Compra de Ambulâncias e Frotas</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Verba Total Autorizada</span>
                      <span className="text-cyan-300 font-bold text-sm">R$ 120.000.000,00</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Principais Destinações (Anexo I)</span>
                      <ul className="space-y-1 mt-1 text-[11px] text-slate-300">
                        <li className="flex justify-between border-b border-slate-800 pb-0.5">
                          <span>📍 Ipatinga</span>
                          <span className="text-white font-medium">R$ 820.000</span>
                        </li>
                        <li className="flex justify-between border-b border-slate-800 pb-0.5">
                          <span>📍 Coronel Fabriciano</span>
                          <span className="text-white font-medium">R$ 615.000</span>
                        </li>
                        <li className="flex justify-between">
                          <span>📍 Timóteo</span>
                          <span className="text-white font-medium">R$ 410.000</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-1 text-[10px] text-purple-300 font-bold uppercase tracking-wider mb-1">
                        <Calendar size={10} />
                        <span>Gatilho de Vendas</span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-normal">
                        <strong>Prazo de Abertura:</strong> Municípios obrigados a licitar em até 120 dias (Prazo: Out/2026).
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Status bar */}
              <div className="bg-[#0B1322] px-6 py-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Pronto comercialmente</span>
                </div>
                <span>SES/MG - PDF + XLSX processados</span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
