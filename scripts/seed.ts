/**
 * Seed: cria o primeiro Tenant + usuário Admin para desenvolvimento.
 *
 * Uso:
 *   DATABASE_URL=postgresql://... npx ts-node --skipProject scripts/seed.ts
 *   ou via npm script definido no root package.json
 */

import { PrismaClient, TenantRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

const TENANT = {
  name:   'LicitaAI Demo',
  slug:   'licitaai-demo',
  domain: 'demo.licitaai.com.br',
  status: 'ACTIVE',
};

const ADMIN = {
  email:    process.env.SEED_ADMIN_EMAIL    ?? 'admin@licitaai.com.br',
  password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@2024!',
  name:     'Administrador',
  role:     TenantRole.OWNER,
};

const ANALYST = {
  email:    'analista@licitaai.com.br',
  password: 'Analista@2024!',
  name:     'Analista PNCP',
  role:     TenantRole.ANALYST,
};

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️ [SEED] Bloqueado: A execução de seeds está desativada em ambiente de produção (NODE_ENV=production).');
    process.exit(0);
  }

  console.log('\n🌱 Iniciando seed do banco de dados...\n');

  // ── 1. Tenant ────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where:  { slug: TENANT.slug },
    update: {},
    create: TENANT,
  });
  console.log(`✅ Tenant criado: ${tenant.name} (id: ${tenant.id})`);

  // ── 2. Billing Account ───────────────────────────────────────────────────
  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  await prisma.billingAccount.upsert({
    where:  { tenantId: tenant.id },
    update: {},
    create: {
      tenantId:        tenant.id,
      planName:        'Enterprise Trial',
      status:          'TRIAL',
      currency:        'BRL',
      nextBillingDate,
    },
  });
  console.log('✅ Billing account criada (plano: Enterprise Trial)');

  // ── 3. Admin User ─────────────────────────────────────────────────────────
  const BCRYPT_ROUNDS = 12;
  const adminHash = await bcrypt.hash(ADMIN.password, BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where:  { email: ADMIN.email },
    update: { password: adminHash, name: ADMIN.name, role: ADMIN.role },
    create: {
      tenantId: tenant.id,
      email:    ADMIN.email,
      name:     ADMIN.name,
      password: adminHash,
      role:     ADMIN.role,
      isActive: true,
    },
  });
  console.log(`✅ Admin criado: ${admin.email} (role: ${admin.role})`);

  // ── 4. Analyst User ───────────────────────────────────────────────────────
  const analystHash = await bcrypt.hash(ANALYST.password, BCRYPT_ROUNDS);

  const analyst = await prisma.user.upsert({
    where:  { email: ANALYST.email },
    update: { password: analystHash },
    create: {
      tenantId: tenant.id,
      email:    ANALYST.email,
      name:     ANALYST.name,
      password: analystHash,
      role:     ANALYST.role,
      isActive: true,
    },
  });
  console.log(`✅ Analista criado: ${analyst.email} (role: ${analyst.role})`);

  // ── Resumo ────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  console.log('📋 Credenciais de acesso:');
  console.log(`   Admin   : ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`   Analista: ${ANALYST.email} / ${ANALYST.password}`);
  console.log('   ⚠️  Altere as senhas em produção!');
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
