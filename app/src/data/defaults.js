export const COLORS = ['#6366F1','#10B981','#F59E0B','#3B82F6','#EF4444','#EC4899','#8B5CF6','#06B6D4','#84CC16','#F97316']

export const DEFAULT_EXPENSES = [
  { id: 1001, eventId: 1, type: 'Alimentação', amount: 200,  date: '2026-04-05', description: 'Jantar da equipe' },
  { id: 1002, eventId: 1, type: 'Combustível', amount: 150,  date: '2026-04-05', description: 'Transporte SP' },
  { id: 1003, eventId: 2, type: 'Alimentação', amount: 450,  date: '2026-04-12', description: 'Almoço e jantar' },
  { id: 1004, eventId: 2, type: 'Hospedagem',  amount: 600,  date: '2026-04-12', description: 'Hotel 2 quartos' },
  { id: 1005, eventId: 2, type: 'Combustível', amount: 300,  date: '2026-04-12', description: 'Frete de equipamentos' },
  { id: 1006, eventId: 3, type: 'Alimentação', amount: 300,  date: '2026-04-19', description: 'Jantar pré-show' },
  { id: 1007, eventId: 3, type: 'Hospedagem',  amount: 800,  date: '2026-04-19', description: 'Pousada 2 quartos' },
  { id: 1008, eventId: 3, type: 'Combustível', amount: 500,  date: '2026-04-19', description: 'Passagens e transporte' },
  { id: 1009, eventId: 4, type: 'Alimentação', amount: 150,  date: '2026-04-26', description: 'Lanche da equipe' },
  { id: 1010, eventId: 4, type: 'Hospedagem',  amount: 900,  date: '2026-04-26', description: 'Hotel 3 quartos' },
  { id: 1011, eventId: 4, type: 'Combustível', amount: 700,  date: '2026-04-26', description: 'Passagem aérea' },
  { id: 1012, eventId: 5, type: 'Alimentação', amount: 250,  date: '2026-05-03', description: 'Refeições' },
  { id: 1013, eventId: 5, type: 'Hospedagem',  amount: 700,  date: '2026-05-03', description: 'Hotel 2 quartos' },
  { id: 1014, eventId: 5, type: 'Combustível', amount: 400,  date: '2026-05-03', description: 'Combustível e pedágio' },
  { id: 1015, eventId: 6, type: 'Alimentação', amount: 800,  date: '2026-05-10', description: 'Refeições da equipe' },
  { id: 1016, eventId: 6, type: 'Hospedagem',  amount: 2400, date: '2026-05-10', description: 'Hotel 3 quartos 2 noites' },
  { id: 1017, eventId: 6, type: 'Combustível', amount: 1200, date: '2026-05-10', description: 'Voos e transporte' },
]

export const DEFAULT_MEMBERS = [
  { id: 1, name: 'Carlos Silva',   role: 'Vocalista',   cache: 800,  init: 'CS', color: '#6366F1' },
  { id: 2, name: 'Ana Oliveira',   role: 'Guitarrista', cache: 700,  init: 'AO', color: '#10B981' },
  { id: 3, name: 'Bruno Santos',   role: 'Baterista',   cache: 700,  init: 'BS', color: '#F59E0B' },
  { id: 4, name: 'Fernanda Lima',  role: 'Tecladista',  cache: 650,  init: 'FL', color: '#3B82F6' },
  { id: 5, name: 'Diego Costa',    role: 'Baixista',    cache: 650,  init: 'DC', color: '#EF4444' },
  { id: 6, name: 'Mariana Reis',   role: 'Violinista',  cache: 700,  init: 'MR', color: '#EC4899' },
]

export const DEFAULT_EVENTS = [
  { id: 1, name: 'Show no Clube Noturno',       local: 'Clube Noturno Central',  date: '2026-04-05', time: '21:00', end: '23:30', value: 3500,  type: 'Show',        members: [1,2,3,4],     contractorIds: [101],       notes: '',                      city: 'São Paulo',      state: 'SP', lat: -23.5505, lng: -46.6333, expenses: { alimentacao: 200,  hospedagem: 0,    logistica: 150  } },
  { id: 2, name: 'Festival de Verão',           local: 'Parque Municipal',       date: '2026-04-12', time: '16:00', end: '20:00', value: 8000,  type: 'Festival',    members: [1,2,3,4,5,6], contractorIds: [102],       notes: 'Levar equipamento extra', city: 'Campinas',       state: 'SP', lat: -22.9056, lng: -47.0608, expenses: { alimentacao: 450,  hospedagem: 600,  logistica: 300  } },
  { id: 3, name: 'Casamento Silva & Santos',    local: 'Buffet Elegance',        date: '2026-04-19', time: '19:00', end: '00:00', value: 5200,  type: 'Casamento',   members: [1,2,4,6],     contractorIds: [103],       notes: 'Dress code: social',    city: 'Curitiba',       state: 'PR', lat: -25.4290, lng: -49.2671, expenses: { alimentacao: 300,  hospedagem: 800,  logistica: 500  } },
  { id: 4, name: 'Aniversário 15 anos Laura',   local: 'Salão Girassol',         date: '2026-04-26', time: '18:00', end: '22:00', value: 2800,  type: 'Aniversário', members: [1,2,3],       contractorIds: [104],       notes: '',                      city: 'Porto Alegre',   state: 'RS', lat: -30.0346, lng: -51.2177, expenses: { alimentacao: 150,  hospedagem: 900,  logistica: 700  } },
  { id: 5, name: 'Show Bar Central',            local: 'Bar Central — Zona Sul', date: '2026-05-03', time: '22:00', end: '02:00', value: 4100,  type: 'Show',        members: [1,2,3,5],     contractorIds: [101, 105],  notes: '',                      city: 'Florianópolis',  state: 'SC', lat: -27.5954, lng: -48.5480, expenses: { alimentacao: 250,  hospedagem: 700,  logistica: 400  } },
  { id: 6, name: 'Evento Corporativo TechCorp', local: 'Hotel Grand Plaza',      date: '2026-05-10', time: '20:00', end: '23:00', value: 12000, type: 'Corporativo', members: [1,2,3,4,5,6], contractorIds: [106],       notes: 'Dress code formal',     city: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lng: -43.1729, expenses: { alimentacao: 800,  hospedagem: 2400, logistica: 1200 } },
]

export const DEFAULT_EQUIPMENT = [
  { id: 2001, name: 'Guitarra',        category: 'Instrumento', condition: 'Ótimo',    description: '',  serialNumber: '', notes: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2002, name: 'Contrabaixo',     category: 'Instrumento', condition: 'Ótimo',    description: '',  serialNumber: '', notes: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2003, name: 'Violão',          category: 'Instrumento', condition: 'Ótimo',    description: '',  serialNumber: '', notes: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2004, name: 'Teclado',         category: 'Instrumento', condition: 'Ótimo',    description: '',  serialNumber: '', notes: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2005, name: 'Bateria completa',category: 'Instrumento', condition: 'Ótimo',    description: '',  serialNumber: '', notes: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2006, name: 'Percussão',       category: 'Instrumento', condition: 'Ótimo',    description: '',  serialNumber: '', notes: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2007, name: 'Sanfona',         category: 'Instrumento', condition: 'Ótimo',    description: '',  serialNumber: '', notes: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2008, name: 'Moving head',     category: 'Iluminação',  condition: 'Ótimo',    description: '',  serialNumber: '', notes: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2009, name: 'Par LED',         category: 'Iluminação',  condition: 'Ótimo',    description: '',  serialNumber: '', notes: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2010, name: 'Strobo',          category: 'Iluminação',  condition: 'Ótimo',    description: '',  serialNumber: '', notes: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2011, name: 'Painel de LED',   category: 'Iluminação',  condition: 'Ótimo',    description: '',  serialNumber: '', notes: '', createdAt: '2026-01-01T00:00:00.000Z' },
]

export const DEFAULT_CONTRACTORS = [
  { id: 101, name: 'Carlos Mendes',      company: 'Bar Noturno SP',         role: 'Gerente',              phone: '(11) 99999-1111', email: 'carlos@barnoturno.com.br',    city: 'São Paulo',      state: 'SP', lat: -23.5505, lng: -46.6333, notes: 'Preferência por rock e MPB. Pagamento sempre em dia.' },
  { id: 102, name: 'Ana Paula Rezende',  company: 'Prefeitura de Campinas', role: 'Secretária de Cultura', phone: '(19) 3232-8000',  email: 'ana.paula@campinas.sp.gov.br', city: 'Campinas',       state: 'SP', lat: -22.9056, lng: -47.0608, notes: 'Festival de verão anual. Processo licitatório — enviar proposta até março.' },
  { id: 103, name: 'Roberto Silva',      company: 'Família Silva Santos',   role: 'Contratante Particular', phone: '(41) 99777-3333', email: 'roberto.silva@gmail.com',     city: 'Curitiba',       state: 'PR', lat: -25.4290, lng: -49.2671, notes: 'Casamento da filha. Gostaram muito — alta chance de indicação.' },
  { id: 104, name: 'Patrícia Drummond',  company: 'Salão Girassol Eventos', role: 'Proprietária',          phone: '(51) 3333-6666',  email: 'patricia@girassol.com.br',    city: 'Porto Alegre',   state: 'RS', lat: -30.0346, lng: -51.2177, notes: 'Espaço de festas — contrato anual em negociação.' },
  { id: 105, name: 'Fábio Lopes',        company: 'Bar Central',            role: 'Produtor Musical',      phone: '(48) 99555-5555', email: 'fabio@barcentral.com.br',     city: 'Florianópolis',  state: 'SC', lat: -27.5954, lng: -48.5480, notes: 'Show todo primeiro sábado do mês. Excelente relacionamento.' },
  { id: 106, name: 'Juliana Teixeira',   company: 'TechCorp Entretenimento', role: 'Gerente de Eventos',   phone: '(21) 3030-9999',  email: 'juliana@techcorp.com.br',     city: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lng: -43.1729, notes: 'Evento anual de confraternização. Alto padrão e pontualidade.' },
]
