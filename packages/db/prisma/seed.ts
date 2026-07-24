import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding EquipamentoCategoria...');

  const equipamentos = [
    // IMAGEM
    {
      codigo: 'TOMOGRAFO',
      nome: 'Tomógrafo Computadorizado',
      segmento: 'IMAGEM',
      sinonimos: [
        'tomógrafo', 'tomografia', 'tc', 'tomógrafo computadorizado',
        'tomografo', 'tomografia computadorizada', 'scanner ct',
        'equipamento de tomografia', 'aparelho de tomografia',
      ],
    },
    {
      codigo: 'ULTRASSOM',
      nome: 'Ultrassonógrafo',
      segmento: 'IMAGEM',
      sinonimos: [
        'ultrassom', 'ultrassonógrafo', 'ultrassonografia', 'ecógrafo',
        'eco', 'aparelho de ultrassom', 'equipamento de ultrassonografia',
        'ultrassonógrafo doppler', 'doppler',
      ],
    },
    {
      codigo: 'RAIO_X',
      nome: 'Equipamento de Raio-X',
      segmento: 'IMAGEM',
      sinonimos: [
        'raio-x', 'raio x', 'radiografia', 'rx digital',
        'equipamento radiológico', 'aparelho de raio-x', 'radiologia',
        'rx', 'radiografia digital', 'módulo de radiografia',
      ],
    },
    {
      codigo: 'MAMOGRAFO',
      nome: 'Mamógrafo',
      segmento: 'IMAGEM',
      sinonimos: [
        'mamógrafo', 'mamografia', 'mamógrafo digital',
        'equipamento de mamografia', 'aparelho de mamografia',
      ],
    },
    {
      codigo: 'RESSONANCIA',
      nome: 'Ressonância Magnética',
      segmento: 'IMAGEM',
      sinonimos: [
        'ressonância', 'ressonância magnética', 'rm',
        'ressonância nuclear magnética', 'equipamento de ressonância',
      ],
    },
    {
      codigo: 'DENSITOMETRO',
      nome: 'Densitômetro Ósseo',
      segmento: 'IMAGEM',
      sinonimos: [
        'densitômetro', 'densitometria óssea', 'dxa',
        'densitometria', 'equipamento de densitometria',
      ],
    },
    {
      codigo: 'ENDOSCOPIA',
      nome: 'Sistema de Endoscopia',
      segmento: 'IMAGEM',
      sinonimos: [
        'endoscópio', 'endoscopia', 'videoscópio', 'colonoscópio',
        'gastroscópio', 'torre de endoscopia', 'sistema endoscópico',
      ],
    },
    // CIRURGIA
    {
      codigo: 'ARCO_CIRURGICO',
      nome: 'Arco Cirúrgico / Fluoroscópio',
      segmento: 'CIRURGIA',
      sinonimos: [
        'arco cirúrgico', 'arco cirúrgico fluoroscópio', 'fluoroscópio',
        'arco c', 'intensificador de imagem', 'rx arco',
        'equipamento de fluoroscopia', 'fluoroscopia',
      ],
    },
    {
      codigo: 'MESA_CIRURGICA',
      nome: 'Mesa Cirúrgica',
      segmento: 'CIRURGIA',
      sinonimos: [
        'mesa cirúrgica', 'mesa de operação', 'mesa ortopédica',
        'mesa cirúrgica elétrica', 'mesa cirúrgica articulada',
      ],
    },
    {
      codigo: 'BISTURI_ELETRICO',
      nome: 'Bisturi Elétrico / Eletrocirurgia',
      segmento: 'CIRURGIA',
      sinonimos: [
        'bisturi elétrico', 'eletrocirurgia', 'gerador de eletrocirurgia',
        'unidade eletrocirúrgica', 'bisturi eletrônico',
      ],
    },
    {
      codigo: 'FOCO_CIRURGICO',
      nome: 'Foco Cirúrgico',
      segmento: 'CIRURGIA',
      sinonimos: [
        'foco cirúrgico', 'foco de centro cirúrgico', 'luminária cirúrgica',
        'foco auxiliar', 'iluminação cirúrgica',
      ],
    },
    // MONITORAÇÃO
    {
      codigo: 'MONITOR_MULTIPARAMETRICO',
      nome: 'Monitor Multiparamétrico',
      segmento: 'MONITORACAO',
      sinonimos: [
        'monitor multiparamétrico', 'monitor de sinais vitais', 'monitor paciente',
        'monitor multiparâmetro', 'monitor de beira de leito',
        'monitor cardíaco', 'monitor de uti',
      ],
    },
    {
      codigo: 'VENTILADOR_MECANICO',
      nome: 'Ventilador Mecânico',
      segmento: 'MONITORACAO',
      sinonimos: [
        'ventilador mecânico', 'respirador', 'ventilador pulmonar',
        'ventilador uti', 'ventilação mecânica', 'respirador mecânico',
      ],
    },
    {
      codigo: 'DESFIBRILADOR',
      nome: 'Desfibrilador',
      segmento: 'MONITORACAO',
      sinonimos: [
        'desfibrilador', 'cardioversor', 'dea',
        'desfibrilador externo automático', 'desfibrilador bifásico',
        'monitor desfibrilador',
      ],
    },
    {
      codigo: 'OXIMETRO',
      nome: 'Oxímetro de Pulso',
      segmento: 'MONITORACAO',
      sinonimos: [
        'oxímetro', 'oximetria', 'oxímetro de pulso',
        'saturímetro', 'sensor de oximetria',
      ],
    },
    {
      codigo: 'ELETROCARDIOGRAFO',
      nome: 'Eletrocardiógrafo',
      segmento: 'MONITORACAO',
      sinonimos: [
        'eletrocardiógrafo', 'ecg', 'eletrocardiograma',
        'eletrocardiógrafo digital', 'aparelho de ecg',
      ],
    },
    // LABORATÓRIO
    {
      codigo: 'ANALISADOR_BIOQUIMICO',
      nome: 'Analisador Bioquímico',
      segmento: 'LABORATORIO',
      sinonimos: [
        'analisador bioquímico', 'bioquímica automatizada',
        'analisador de bioquímica', 'equipamento de laboratório',
        'analisador clínico', 'autoanaliter',
      ],
    },
    {
      codigo: 'HEMATOLOGIA',
      nome: 'Analisador Hematológico',
      segmento: 'LABORATORIO',
      sinonimos: [
        'analisador hematológico', 'contador de células', 'hemograma automatizado',
        'hematologia automatizada', 'counter hematológico',
      ],
    },
    {
      codigo: 'AUTOCLAVE',
      nome: 'Autoclave',
      segmento: 'LABORATORIO',
      sinonimos: [
        'autoclave', 'esterilizador', 'esterilizador a vapor',
        'equipamento de esterilização', 'autoclave hospitalar',
      ],
    },
    // REABILITAÇÃO
    {
      codigo: 'FISIOTERAPIA',
      nome: 'Equipamentos de Fisioterapia',
      segmento: 'REABILITACAO',
      sinonimos: [
        'fisioterapia', 'equipamento de reabilitação', 'aparelho de fisioterapia',
        'ultrassom fisioterapia', 'tens', 'eletroestimulador',
        'equipamento de fisioterapia e reabilitação',
      ],
    },
    // AMBULÂNCIA
    {
      codigo: 'AMBULANCIA',
      nome: 'Ambulância',
      segmento: 'TRANSPORTE',
      sinonimos: [
        'ambulância', 'veículo de suporte avançado', 'usa',
        'unidade de suporte avançado', 'veículo de transporte sanitário',
        'ambulância uti', 'unidade móvel de saúde',
      ],
    },
    // ODONTOLOGIA
    {
      codigo: 'EQUIPAMENTO_ODONTO',
      nome: 'Equipamento Odontológico',
      segmento: 'ODONTOLOGIA',
      sinonimos: [
        'equipamento odontológico', 'cadeira odontológica', 'compressor odontológico',
        'raio-x odontológico', 'rx odonto', 'autoclave odontológica',
        'centro cirúrgico odontológico',
      ],
    },
  ];

  for (const eq of equipamentos) {
    await prisma.equipamentoCategoria.upsert({
      where: { codigo: eq.codigo },
      create: eq,
      update: eq,
    });
    console.log(`  ✅ ${eq.codigo} — ${eq.nome}`);
  }

  console.log(`\n🌍 Seed de Municípios de MG (amostra de prioritários)...`);

  // Seed inicial com municípios de MG prioritários
  // (853 municípios virão de CSV/IBGE separado)
  const municipiosMG = [
    { ibge: '3106200', nome: 'Belo Horizonte', uf: 'MG', mesoregiao: 'Metropolitana de Belo Horizonte', microrregiao: 'Belo Horizonte', populacao: 2521564, prioritario: true },
    { ibge: '3170206', nome: 'Uberlândia', uf: 'MG', mesoregiao: 'Triângulo Mineiro e Alto Paranaíba', microrregiao: 'Uberlândia', populacao: 706597, prioritario: true },
    { ibge: '3143302', nome: 'Montes Claros', uf: 'MG', mesoregiao: 'Norte de Minas', microrregiao: 'Montes Claros', populacao: 413490, prioritario: true },
    { ibge: '3138203', nome: 'Juiz de Fora', uf: 'MG', mesoregiao: 'Zona da Mata', microrregiao: 'Juiz de Fora', populacao: 563769, populacao2: null, prioritario: true },
    { ibge: '3149309', nome: 'Ribeirão das Neves', uf: 'MG', mesoregiao: 'Metropolitana de Belo Horizonte', microrregiao: 'Belo Horizonte', populacao: 340876, prioritario: false },
    { ibge: '3118601', nome: 'Contagem', uf: 'MG', mesoregiao: 'Metropolitana de Belo Horizonte', microrregiao: 'Belo Horizonte', populacao: 668390, prioritario: true },
    { ibge: '3167202', nome: 'Teófilo Otoni', uf: 'MG', mesoregiao: 'Vale do Mucuri', microrregiao: 'Teófilo Otoni', populacao: 139636, prioritario: true },
    { ibge: '3162500', nome: 'Sete Lagoas', uf: 'MG', mesoregiao: 'Metropolitana de Belo Horizonte', microrregiao: 'Sete Lagoas', populacao: 239076, prioritario: true },
    { ibge: '3136702', nome: 'Ipatinga', uf: 'MG', mesoregiao: 'Vale do Rio Doce', microrregiao: 'Ipatinga', populacao: 261419, prioritario: true },
    { ibge: '3106705', nome: 'Betim', uf: 'MG', mesoregiao: 'Metropolitana de Belo Horizonte', microrregiao: 'Belo Horizonte', populacao: 444604, prioritario: true },
    { ibge: '3104304', nome: 'Barbacena', uf: 'MG', mesoregiao: 'Campo das Vertentes', microrregiao: 'Barbacena', populacao: 136327, prioritario: true },
    { ibge: '3170107', nome: 'Uberaba', uf: 'MG', mesoregiao: 'Triângulo Mineiro e Alto Paranaíba', microrregiao: 'Uberaba', populacao: 340885, prioritario: true },
    { ibge: '3168705', nome: 'Varginha', uf: 'MG', mesoregiao: 'Sul/Sudoeste de Minas', microrregiao: 'Varginha', populacao: 136,174, prioritario: true },
    { ibge: '3111200', nome: 'Caratinga', uf: 'MG', mesoregiao: 'Vale do Rio Doce', microrregiao: 'Caratinga', populacao: 94.192, prioritario: false },
    { ibge: '3107307', nome: 'Bocaiúva', uf: 'MG', mesoregiao: 'Norte de Minas', microrregiao: 'Bocaiuva', populacao: 50000, prioritario: false },
    { ibge: '3125309', nome: 'Governador Valadares', uf: 'MG', mesoregiao: 'Vale do Rio Doce', microrregiao: 'Governador Valadares', populacao: 280.429, prioritario: true },
    { ibge: '3141702', nome: 'Muriaé', uf: 'MG', mesoregiao: 'Zona da Mata', microrregiao: 'Muriaé', populacao: 109.764, prioritario: false },
    { ibge: '3157807', nome: 'Sabará', uf: 'MG', mesoregiao: 'Metropolitana de Belo Horizonte', microrregiao: 'Belo Horizonte', populacao: 133155, prioritario: false },
    { ibge: '3148707', nome: 'Patos de Minas', uf: 'MG', mesoregiao: 'Triângulo Mineiro e Alto Paranaíba', microrregiao: 'Patos de Minas', populacao: 155.055, prioritario: true },
    { ibge: '3132403', nome: 'Ituiutaba', uf: 'MG', mesoregiao: 'Triângulo Mineiro e Alto Paranaíba', microrregiao: 'Ituiutaba', populacao: 105000, prioritario: false },
  ];

  for (const m of municipiosMG) {
    const { populacao2, ...data } = m as any;
    await prisma.municipio.upsert({
      where: { ibge: data.ibge },
      create: { ...data, populacao: typeof data.populacao === 'number' ? Math.round(data.populacao) : null },
      update: { ...data, populacao: typeof data.populacao === 'number' ? Math.round(data.populacao) : null },
    });
    console.log(`  📍 ${data.ibge} — ${data.nome}`);
  }

  console.log('\n✅ Seed concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
