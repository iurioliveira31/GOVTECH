'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Background blur and transparency based on scroll
  const background = useTransform(
    scrollY,
    [0, 50],
    ['rgba(10, 15, 30, 0)', 'rgba(10, 15, 30, 0.85)']
  );

  const borderBottom = useTransform(
    scrollY,
    [0, 50],
    ['1px solid rgba(255, 255, 255, 0)', '1px solid rgba(255, 255, 255, 0.1)']
  );

  useEffect(() => {
    const updateScrolled = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', updateScrolled);
    return () => window.removeEventListener('scroll', updateScrolled);
  }, []);

  return (
    <motion.header
      style={{ background, borderBottom }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gavelGradientHeader" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="100%" stopColor="#8A2BE2" />
              </linearGradient>
            </defs>
            <path d="M14 13.9997L10 17.9997L4.5 12.4997L8.5 8.49974L14 13.9997Z" stroke="url(#gavelGradientHeader)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.5 8.49976L11 5.99976L16.5 11.4998L14 13.9998" stroke="url(#gavelGradientHeader)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 15L20 20" stroke="url(#gavelGradientHeader)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="19" cy="5" r="1.5" fill="#00F0FF" />
            <circle cx="21" cy="9" r="1" fill="#8A2BE2" />
            <path d="M17 7L18.5 5.5" stroke="#00F0FF" strokeWidth="1" strokeLinecap="round"/>
            <path d="M18.5 10.5L20 9.5" stroke="#8A2BE2" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          <span className="font-extrabold text-xl tracking-tight" style={{ 
            background: 'linear-gradient(90deg, #FFFFFF 0%, #d8b4fe 100%)', 
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            LICITA AI
          </span>
        </Link>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2 border border-slate-700 hover:border-slate-500 rounded-lg">
            Entrar
          </Link>
          <Link href="/cadastro" className="text-sm font-bold text-slate-900 bg-cyan-400 hover:bg-cyan-300 px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)]">
            Começar Agora
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-slate-300 hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden absolute top-20 left-0 right-0 bg-[#0B1322] border-b border-slate-800 p-6 flex flex-col gap-4 shadow-xl"
        >
          <Link href="/login" className="text-center text-base font-medium text-white border border-slate-700 py-3 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Entrar</Link>
          <Link href="/cadastro" className="text-center text-base font-bold text-slate-900 bg-cyan-400 py-3 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Começar Agora</Link>
        </motion.div>
      )}
    </motion.header>
  );
}
