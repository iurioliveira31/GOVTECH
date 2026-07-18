'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "Starter",
      desc: "Para pequenas empresas começando em vendas governamentais.",
      monthly: 197,
      annual: 157,
      features: [
        "Monitoramento em tempo real (1 estado)",
        "Alertas por Email",
        "Radar de Oportunidades básico",
        "Suporte em horário comercial"
      ],
      highlight: false
    },
    {
      name: "Pro",
      desc: "Para empresas que querem escalar suas vitórias com IA.",
      monthly: 497,
      annual: 397,
      features: [
        "Monitoramento Nacional (Todos os estados)",
        "WinningScore & RiskScore (Análise IA)",
        "Alertas via WhatsApp e Telegram",
        "Rastreamento de até 10 concorrentes",
        "Suporte prioritário"
      ],
      highlight: true
    },
    {
      name: "Enterprise",
      desc: "Para corporações com alto volume de licitações.",
      monthly: 1297,
      annual: 997,
      features: [
        "Tudo do plano Pro",
        "Assistente Jurídico com IA (RAG TCU)",
        "Concorrentes Ilimitados",
        "API para integração ERP/CRM",
        "Gerente de Sucesso dedicado"
      ],
      highlight: false
    }
  ];

  return (
    <section id="planos" className="py-24 bg-[#050811] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-6"
          >
            Escolha o plano ideal para <span className="text-cyan-400">crescer</span>
          </motion.h2>

          {/* Toggle Billing */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-slate-400'}`}>Mensal</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center p-1 transition-colors"
            >
              <motion.div 
                animate={{ x: isAnnual ? 28 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-5 h-5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.5)]"
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-white' : 'text-slate-400'} flex items-center gap-2`}>
              Anual <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">20% OFF</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
          {plans.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className={`relative bg-[#0B1322] border rounded-2xl flex flex-col p-8 transition-all ${
                plan.highlight 
                  ? 'border-cyan-500 shadow-[0_0_30px_rgba(0,240,255,0.15)] md:-mt-8 md:mb-8' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-400 text-slate-900 font-bold text-xs uppercase tracking-wider py-1 px-4 rounded-full">
                  Mais Popular
                </div>
              )}
              
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-sm text-slate-400 mb-6 min-h-[40px]">{plan.desc}</p>
              
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">
                  R$ {isAnnual ? plan.annual : plan.monthly}
                </span>
                <span className="text-slate-400">/mês</span>
              </div>

              <div className="flex flex-col gap-4 flex-1 mb-8">
                {plan.features.map((feat, fidx) => (
                  <div key={fidx} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className={plan.highlight ? 'text-cyan-400' : 'text-slate-500'} />
                    <span className="text-sm text-slate-300 leading-tight">{feat}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/cadastro"
                className={`text-center py-3 rounded-xl font-bold transition-all ${
                  plan.highlight
                    ? 'bg-cyan-400 text-slate-900 shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)]'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
              >
                {plan.highlight ? 'Começar Grátis' : 'Selecionar Plano'}
              </Link>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
