'use client';

import React from 'react';
import Link from 'next/link';

export default function TermosPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      {/* Card principal */}
      <div style={{
        width: '100%',
        maxWidth: 800,
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        padding: '40px',
        boxShadow: 'var(--shadow-glow)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-400))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 900, color: 'white',
            }}>L</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>LicitaAI</span>
          </div>
          <Link href="/cadastro" style={{ fontSize: 13, color: 'var(--color-brand-400)', textDecoration: 'none', fontWeight: 600 }}>
            ← Voltar ao cadastro
          </Link>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 12 }}>
          Termos de Uso do LicitaAI
        </h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 24 }}>
          Última atualização: 24 de Julho de 2026
        </p>

        {/* Conteúdo dos Termos */}
        <div style={{
          maxHeight: '50vh',
          overflowY: 'auto',
          paddingRight: 10,
          fontSize: 14,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          <section>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: 8 }}>1. Aceitação dos Termos</h3>
            <p>
              Ao se cadastrar e utilizar a plataforma LicitaAI, você concorda em cumprir e estar legalmente vinculado a estes Termos de Uso. Se você não concorda com qualquer parte deste documento, não deverá acessar ou utilizar nossos serviços.
            </p>
          </section>

          <section>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: 8 }}>2. Descrição dos Serviços</h3>
            <p>
              O LicitaAI é uma plataforma de inteligência artificial voltada ao monitoramento, análise e envio de alertas de oportunidades de compras governamentais, licitações públicas, contratos e resoluções fundo a fundo de verbas de saúde pública de fontes governamentais como o PNCP e Diários Oficiais.
            </p>
          </section>

          <section>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: 8 }}>3. Cadastro e Segurança de Conta</h3>
            <p>
              Para utilizar determinados recursos, você deve criar uma conta de e-mail corporativo válido e realizar a confirmação deste. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem sob sua conta. O LicitaAI reserva-se o direito de suspender contas sob suspeita de uso indevido ou fraudulento.
            </p>
          </section>

          <section>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: 8 }}>4. Planos, Cobrança e Cancelamento</h3>
            <p>
              Oferecemos planos de assinatura mensal e anual através do intermediador Stripe. Os preços e limites de cada plano (como número de alertas diários e buscas de monitoramento) são definidos no momento da contratação. O cancelamento pode ser feito a qualquer momento através do Portal do Cliente, garantindo acesso até o fim do período já pago. Em caso de falha de cobrança, a conta será rebaixada para o status PAST_DUE antes do bloqueio total de tela.
            </p>
          </section>

          <section>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: 8 }}>5. Direitos Autorais e Propriedade Intelectual</h3>
            <p>
              Todas as interfaces, algoritmos de classificação baseados em Inteligência Artificial, designs e marcas registradas contidas na plataforma são de propriedade exclusiva do LicitaAI. É proibida a reprodução, engenharia reversa ou distribuição sem autorização explícita por escrito.
            </p>
          </section>

          <section>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: 8 }}>6. Limitação de Responsabilidade</h3>
            <p>
              Os dados de licitações e verbas são extraídos de portais governamentais públicos e processados por IA. Embora apliquemos o máximo esforço e validação, o LicitaAI não se responsabiliza por eventuais atrasos de publicação dos órgãos públicos, instabilidades dos portais oficiais ou decisões comerciais baseadas em análises providas de forma automatizada.
            </p>
          </section>
        </div>

        <div style={{ marginTop: 32, borderTop: '1px solid var(--color-border)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/cadastro" className="btn btn-primary" style={{ padding: '10px 24px', textDecoration: 'none' }}>
            Aceitar e Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}
