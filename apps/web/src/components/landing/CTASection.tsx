'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="py-24 bg-[#0B1322] relative overflow-hidden">
      
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight"
        >
          Pronto para assumir a liderança em <span className="text-cyan-400">vendas governamentais?</span>
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto"
        >
          Pare de perder editais por descobrir tarde demais. Junte-se às empresas que já utilizam Inteligência Artificial para sair na frente.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Link 
            href="/cadastro" 
            className="inline-flex items-center justify-center gap-2 bg-cyan-400 text-slate-900 font-bold text-lg px-10 py-5 rounded-2xl transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_40px_rgba(0,240,255,0.6)] hover:-translate-y-1 group"
          >
            Comece a ganhar licitações hoje
            <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-4 text-sm text-slate-500">
            Crie sua conta em 30 segundos. Teste grátis por 7 dias.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
