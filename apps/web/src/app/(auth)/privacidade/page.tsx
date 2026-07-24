'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacidadePage() {
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
          Política de Privacidade do LicitaAI
        </h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 24 }}>
          Última atualização: 24 de Julho de 2026
        </p>

        {/* Conteúdo da Privacidade */}
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
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: 8 }}>1. Informações que Coletamos</h3>
            <p>
              Coletamos informações cadastrais básicas necessárias para a prestação dos serviços: nome, endereço de e-mail corporativo, senha criptografada, nome da empresa e CNPJ. Além disso, dados de faturamento e cartão de crédito são processados diretamente e de forma segura pelo Stripe, não sendo armazenados em nossos servidores.
            </p>
          </section>

          <section>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: 8 }}>2. Finalidade do Tratamento de Dados (LGPD)</h3>
            <p>
              Os dados de cadastro coletados possuem a finalidade exclusiva de:
              <br />• Criação, autenticação e segurança de acesso à conta de usuário.
              <br />• Envio de notificações e alertas solicitados ativamente pelo usuário.
              <br />• Faturamento e controle de renovações de assinaturas comerciais.
              <br />• Suporte técnico e comunicações sobre transações e atualizações do sistema.
            </p>
          </section>

          <section>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: 8 }}>3. Compartilhamento de Dados</h3>
            <p>
              O LicitaAI não comercializa ou aluga dados pessoais de seus clientes a terceiros. Os dados apenas são compartilhados com parceiros tecnológicos estritamente essenciais para a operação do sistema: Stripe (processamento de pagamentos), Resend (disparo de e-mails de transação/verba) e Google Cloud/OpenAI (provedores de infraestrutura de inteligência artificial de forma não identificada).
            </p>
          </section>

          <section>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: 8 }}>4. Direitos dos Titulares (LGPD)</h3>
            <p>
              Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você possui o direito de:
              <br />• Confirmar a existência de tratamento e acessar seus dados cadastrados.
              <br />• Corrigir dados incompletos, inexatos ou desatualizados em seu painel de perfil.
              <br />• Solicitar a exclusão definitiva ou anonimização de sua conta e de todos os dados de uso a ela atrelados através de solicitação direta ao nosso canal de suporte.
            </p>
          </section>

          <section>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: 8 }}>5. Segurança dos Dados</h3>
            <p>
              Adotamos as melhores práticas técnicas e organizacionais de segurança da informação, como criptografia de tráfego TLS/SSL para todas as requisições de API, criptografia bcrypt para senhas de acesso de usuários, e isolamento de banco de dados na VPS para proteger seus dados contra acessos não autorizados ou divulgação indesejada.
            </p>
          </section>
        </div>

        <div style={{ marginTop: 32, borderTop: '1px solid var(--color-border)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/cadastro" className="btn btn-primary" style={{ padding: '10px 24px', textDecoration: 'none' }}>
            Entendi e Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}
