'use client';

import { motion } from 'framer-motion';
import { SearchX, Clock, Target } from 'lucide-react';

export default function ProblemSection() {
  const problems = [
    {
      icon: SearchX,
      title: "Dados descentralizados",
      desc: "Informações espalhadas em dezenas de portais (PNCP, Diários Oficiais, portais próprios), exigindo horas de trabalho manual todos os dias."
    },
    {
      icon: Clock,
      title: "Perda de prazos vitais",
      desc: "Descobrir uma licitação tarde demais significa não ter tempo para organizar documentação e montar uma proposta competitiva."
    },
    {
      icon: Target,
      title: "Decisões no escuro",
      desc: "Entrar em disputas sem saber o histórico de preços do órgão ou quem são os concorrentes que costumam ganhar as licitações."
    }
  ];

  return (
    <section className="py-24 bg-[#050811] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            A forma tradicional de buscar editais <span className="text-red-400">já não funciona</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-2xl mx-auto text-lg"
          >
            Empresas que dependem de pesquisas manuais estão perdendo milhões em contratos simplesmente porque a informação chega tarde demais.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((prob, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2, duration: 0.6 }}
              className="bg-[#0B1322]/80 backdrop-blur-md border border-slate-800 p-8 rounded-2xl flex flex-col items-start gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-slate-800/50 flex items-center justify-center border border-slate-700">
                <prob.icon className="text-slate-300" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">{prob.title}</h3>
              <p className="text-slate-400 leading-relaxed">{prob.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
