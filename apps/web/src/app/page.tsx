import { Metadata } from 'next';
import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import ImpactStats from '@/components/landing/ImpactStats';
import ProblemSection from '@/components/landing/ProblemSection';
import ModulesGrid from '@/components/landing/ModulesGrid';
import AISection from '@/components/landing/AISection';
import ResolutionsSection from '@/components/landing/ResolutionsSection';
import TrustSection from '@/components/landing/TrustSection';
import PricingSection from '@/components/landing/PricingSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'LicitaAI | Inteligência em Licitações',
  description: 'Antecipe licitações antes da concorrência. Cobertura nacional unificada impulsionada por Inteligência Artificial preditiva.',
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#050811] text-slate-200">
      <Header />
      <main className="flex-1">
        <Hero />
        <ImpactStats />
        <ProblemSection />
        <ModulesGrid />
        <AISection />
        <ResolutionsSection />
        <TrustSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
