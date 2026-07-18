'use client';

import { motion } from 'framer-motion';
import { 
  Radar, 
  Trophy, 
  Users, 
  ShieldAlert, 
  BrainCircuit, 
  RefreshCw,
  BellRing,
  FileText
} from 'lucide-react';

export default function ModulesGrid() {
  const modules = [
    {
      icon: Radar,
      title: "Radar de Oportunidades",
      desc: "Varredura contínua em fontes oficiais. Encontre o edital perfeito antes que ele se torne público.",
      color: "text-cyan-400",
      bg: "bg-cyan-400/10",
      border: "group-hover:border-cyan-500/50"
    },
    {
      icon: FileText,
      title: "Módulo Resoluções (Novo)",
      desc: "Monitore repasses financeiros em diários oficiais e preveja compras públicas meses antes do edital ir ao ar.",
      color: "text-cyan-400",
      bg: "bg-cyan-400/10",
      border: "group-hover:border-cyan-500/50"
    },
    {
      icon: Trophy,
      title: "WinningScore",
      desc: "IA preditiva que calcula sua chance real de vitória em cada edital com base em histórico e dados do órgão.",
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "group-hover:border-purple-500/50"
    },
    {
      icon: Users,
      title: "Rastreamento de Concorrentes",
      desc: "Monitore quem está ganhando o quê. Saiba o preço praticado pelos seus maiores adversários.",
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "group-hover:border-blue-500/50"
    },
    {
      icon: ShieldAlert,
      title: "RiskScore",
      desc: "Análise automática de cláusulas restritivas e riscos ocultos no edital, em segundos.",
      color: "text-rose-400",
      bg: "bg-rose-400/10",
      border: "group-hover:border-rose-500/50"
    },
    {
      icon: BrainCircuit,
      title: "Hub de Inteligência",
      desc: "Painel central consolidado com visão estratégica de mercado e relatórios detalhados.",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "group-hover:border-emerald-500/50"
    },
    {
      icon: RefreshCw,
      title: "Renovação de Contratos",
      desc: "Seja alertado 90 dias antes do vencimento de grandes contratos e prepare-se para as novas disputas.",
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "group-hover:border-amber-500/50"
    },
    {
      icon: BellRing,
      title: "Alertas Multi-canal",
      desc: "Receba notificações instantâneas via WhatsApp, Telegram, Email ou direto no aplicativo.",
      color: "text-indigo-400",
      bg: "bg-indigo-400/10",
      border: "group-hover:border-indigo-500/50"
    }
  ];

  return (
    <section id="solucao" className="py-24 bg-[#0B1322] relative">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            A inteligência por trás dos <span style={{ 
              background: 'linear-gradient(90deg, #00F0FF 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>resultados</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-2xl text-lg"
          >
            Módulos integrados de Inteligência Artificial para dar previsibilidade e agilidade à sua estratégia de vendas governamentais.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {modules.map((mod, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className={`group bg-[#111A2D]/80 backdrop-blur-md border border-slate-800 p-6 rounded-2xl flex flex-col gap-4 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${mod.border}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${mod.bg}`}>
                <mod.icon className={`${mod.color} group-hover:scale-110 transition-transform duration-300`} size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{mod.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{mod.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
