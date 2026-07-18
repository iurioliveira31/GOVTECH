'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Activity } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden min-h-[90vh] flex items-center">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#050811]" />
        
        {/* Tech Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{ 
            backgroundImage: 'linear-gradient(#8A2BE2 1px, transparent 1px), linear-gradient(90deg, #8A2BE2 1px, transparent 1px)',
            backgroundSize: '40px 40px' 
          }}
        />

        {/* Glow Effects */}
        <motion.div 
          animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-64 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 -right-64 w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[150px]" 
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-start gap-6"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md"
          >
            <Activity size={14} className="text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Monitoramento em tempo real</span>
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-white">
            Antecipe licitações antes da{' '}
            <span style={{ 
              background: 'linear-gradient(90deg, #00F0FF 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              concorrência
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-xl leading-relaxed">
            Cobertura nacional unificada impulsionada por Inteligência Artificial preditiva. 
            Não seja apenas notificado. Saiba suas chances reais de vitória antes mesmo de entrar na disputa.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 w-full sm:w-auto">
            <Link 
              href="/cadastro" 
              className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-cyan-400 text-slate-900 font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_35px_rgba(0,240,255,0.5)] hover:-translate-y-1"
            >
              Começar com IA Agora
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link 
              href="#planos" 
              className="w-full sm:w-auto text-center px-8 py-4 rounded-xl font-semibold text-white border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Ver Planos
            </Link>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>7 dias grátis &middot; Sem cartão de crédito</span>
          </div>
        </motion.div>

        {/* Right Dashboard Mockup */}
        <motion.div 
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative lg:h-[600px] flex items-center justify-center"
        >
          {/* Abstract Data Viz / Dashboard Glass UI */}
          <div className="relative w-full aspect-square md:aspect-video lg:aspect-square max-w-[500px] mx-auto">
            {/* Main Glass Card */}
            <div className="absolute inset-0 bg-[#0B1322]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl overflow-hidden flex flex-col">
              
              {/* Fake UI Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                <div className="flex flex-col gap-1">
                  <div className="w-24 h-2 bg-slate-700 rounded-full" />
                  <div className="w-16 h-2 bg-slate-800 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                </div>
              </div>

              {/* Fake Chart Area */}
              <div className="flex-1 flex items-end gap-2 px-4 pb-4">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: "0%" }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 1.5, delay: 0.5 + (i * 0.1), type: 'spring' }}
                    className="flex-1 rounded-t-sm"
                    style={{ 
                      background: i === 5 ? 'linear-gradient(to top, #005661, #00F0FF)' : '#1c263d'
                    }}
                  />
                ))}
              </div>

              {/* Fake Floating Alerts */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-8 top-20 bg-slate-900 border border-purple-500/30 p-3 rounded-lg shadow-lg flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-white">Edital Encontrado</span>
                  <span className="text-[10px] text-slate-400">WinningScore: 89%</span>
                </div>
              </motion.div>
              
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
