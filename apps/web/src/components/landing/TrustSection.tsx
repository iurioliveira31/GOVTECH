'use client';

import { motion } from 'framer-motion';
import { Lock, Server, ShieldCheck, ActivitySquare } from 'lucide-react';

export default function TrustSection() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Segurança de Dados e Antivírus",
      desc: "Todos os documentos e editais baixados passam por varredura automática de segurança antes de serem armazenados em nossos cofres isolados."
    },
    {
      icon: Server,
      title: "Armazenamento Criptografado",
      desc: "Garantia de que seus dados estratégicos e históricos de busca estejam protegidos com criptografia AES-256 (banco e trânsito)."
    },
    {
      icon: ActivitySquare,
      title: "Alta Disponibilidade (99.9%)",
      desc: "Arquitetura distribuída e redundância de servidores garantem que você nunca fique na mão na reta final de uma licitação."
    },
    {
      icon: Lock,
      title: "Conformidade LGPD",
      desc: "Processamento de dados anonimizado sempre que necessário, garantindo total conformidade legal e auditoria transparente."
    }
  ];

  return (
    <section className="py-24 bg-[#0B1322]">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Segurança de nível <span className="text-cyan-400">Enterprise</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-2xl mx-auto text-lg"
          >
            Sabemos que licitações envolvem dados corporativos sensíveis. Construímos uma fortaleza digital para que você foque apenas em vencer.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="bg-[#111A2D] border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-[#050811] flex items-center justify-center border border-slate-700 shadow-inner">
                <feat.icon className="text-slate-300" size={28} />
              </div>
              <h3 className="text-lg font-bold text-white">{feat.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
