# Sistema Akro — Base de Conhecimento para Claude

## Visão Geral

Sistema de gestão de bandas musicais chamado **Akro** (exibido como "BandManager" na UI atual).
- **Repositório local:** `c:\Users\Valter\Documents\Sistema Banda\`
- **App:** `app/` — React + Vite
- **Dev:** `cd app && npm run dev`
- **Build:** `cd app && npm run build`
- **Plataforma:** Windows 11, shell bash (use caminhos com `/` e sintaxe Unix)

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite 5 |
| Estilo | Tailwind CSS 3.4 |
| Componentes | Shadcn/UI (Radix UI primitives) |
| Animações | Framer Motion |
| Mapa | react-simple-maps |
| PDF | jsPDF 4.x + jspdf-autotable 5.x |
| Notificações | Sonner (toast) |
| Ícones | Lucide React |
| Estado global | React Context + localStorage |

**Alias de importação:** `@/` → `src/`

---

## Estrutura de Arquivos

```
app/src/
├── App.jsx                        # Roteamento (state-based, sem react-router)
├── main.jsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx            # Navegação lateral + mobile drawer
│   │   └── Topbar.jsx             # Barra superior com menu hamburger
│   ├── pages/
│   │   ├── Dashboard.jsx          # Visão geral e KPIs
│   │   ├── Shows.jsx              # Agenda (somente leitura — sem CRUD aqui)
│   │   ├── Members.jsx            # Membros com accordion por mês
│   │   ├── Finance.jsx            # Financeiro
│   │   ├── Contracts.jsx          # Contratos com filtros
│   │   ├── Logistics.jsx          # Despesas: mapa + rota + equipe + custos variáveis
│   │   ├── Contractors.jsx        # Contratantes (pessoas) com drawer + ranking
│   │   ├── Reports.jsx            # Relatórios financeiros + geração de holerite PDF
│   │   └── Settings.jsx           # Perfil da empresa (dados para PDFs)
│   ├── modals/
│   │   ├── EventModal.jsx         # CRUD de eventos (usado em Contracts)
│   │   └── MemberModal.jsx        # CRUD de membros com CPF
│   ├── shared/
│   │   ├── Avatar.jsx             # Avatar circular com iniciais coloridas
│   │   ├── BrazilMap.jsx          # Mapa do Brasil (react-simple-maps, lazy loaded)
│   │   ├── CitySelect.jsx         # Autocomplete de cidade/estado via IBGE + Nominatim
│   │   ├── CurrencyInput.jsx      # Input com máscara R$ X.XXX,XX (money-mask)
│   │   ├── MiniCalendar.jsx       # Calendário mensal com dots de eventos
│   │   ├── PhoneInput.jsx         # Input com máscara (DDD) XXXXX-XXXX
│   │   └── TimePicker.jsx         # Seletor de horário HH:MM
│   └── ui/                        # Componentes Shadcn/UI customizados
│       ├── badge.jsx              # Variantes: default/blue/success/warning/secondary/outline
│       ├── button.jsx             # Sizes: default/sm/lg/icon/icon-sm
│       ├── card.jsx
│       ├── checkbox.jsx
│       ├── dialog.jsx
│       ├── input.jsx
│       ├── label.jsx
│       ├── progress.jsx
│       ├── select.jsx
│       ├── separator.jsx
│       ├── skeleton.jsx
│       └── switch.jsx
├── data/
│   └── defaults.js                # Dados de exemplo iniciais (eventos, membros, etc.)
├── hooks/
│   └── useStore.jsx               # Contexto global + persistência localStorage
└── lib/
    ├── format.js                  # fmtCurrency, fmtDate, fmtCurrencyShort, parseBRL, getInitials, MONTHS
    ├── geo.js                     # haversine(), fmtKm()
    ├── pdf.js                     # generateReceipt(), generatePayslip()
    └── utils.js                   # cn() (clsx + tailwind-merge)
```

---

## Roteamento

O app usa **roteamento baseado em estado** — sem react-router. Cada página é uma string em `useState`.

```jsx
// App.jsx
const pages = {
  dashboard:   <Dashboard />,
  shows:       <Shows />,
  members:     <Members />,
  finance:     <Finance />,
  contracts:   <Contracts />,
  logistics:   <Logistics />,
  contractors: <Contractors />,
  reports:     <Reports />,
  settings:    <Settings />,
}
```

Para **adicionar uma nova página:**
1. Criar `src/components/pages/NovaPagina.jsx`
2. Importar em `App.jsx` e adicionar ao objeto `pages`
3. Adicionar item em `Sidebar.jsx` no array `navItems` com `{ id, label, icon, group }`

**Grupos da sidebar:** `Principal` | `Gestão` | `Sistema`

---

## Estado Global — `useStore`

Todos os dados vivem em `src/hooks/useStore.jsx` (React Context + localStorage).

### Entidades e chaves localStorage

| Estado | Chave localStorage | Tipo |
|---|---|---|
| `events` | `bm_events` | Array |
| `members` | `bm_members` | Array |
| `payments` | `bm_payments` | Objeto indexado `{evId: {memId: PayEntry}}` |
| `expenses` | `bm_expenses` | Array |
| `stops` | `bm_stops` | Array (paradas de rota) |
| `favoriteStops` | `bm_fav_stops` | Array |
| `contractors` | `bm_contractors` | Array |
| `companyProfile` | `bm_company` | Objeto |

### API do contexto

```js
const {
  // dados
  events, members, payments, expenses, stops, favoriteStops, contractors, companyProfile,
  // events CRUD
  addEvent(ev), updateEvent(id, updates), deleteEvent(id),
  // members CRUD
  addMember(m), updateMember(id, updates), deleteMember(id),
  // payments (indexados por evento e membro)
  getPayEntry(evId, memId), setPayEntry(evId, memId, updates),
  // expenses CRUD
  addExpense(exp), updateExpense(id, updates), deleteExpense(id),
  // route stops CRUD
  addStop(s), updateStop(id, updates), deleteStop(id),
  // favorite stops
  addFavoriteStop(f), deleteFavoriteStop(id),
  // contractors CRUD
  addContractor(c), updateContractor(id, updates), deleteContractor(id),
  // company profile
  updateCompanyProfile(updates),
} = useStore()
```

### Modelos de dados

```js
// Event
{
  id: Number,           // Date.now()
  name: String,
  local: String,        // nome do local
  date: String,         // 'YYYY-MM-DD'
  time: String,         // 'HH:MM'
  end: String,          // 'HH:MM'
  value: Number,        // valor do contrato em R$
  type: String,         // 'Show'|'Festival'|'Casamento'|'Aniversário'|'Corporativo'|'Outro'
  members: Number[],    // ids dos membros escalados
  contractorIds: Number[], // ids dos contratantes
  city: String,
  state: String,        // sigla 'SP'
  lat: Number|null,
  lng: Number|null,
  notes: String,
  expenses: { alimentacao: Number, hospedagem: Number, logistica: Number }
}

// Member
{
  id: Number,
  name: String,
  role: String,         // instrumento/cargo
  cache: Number,        // cachê base em R$
  cpf: String,          // '000.000.000-00' (opcional)
  init: String,         // iniciais geradas automaticamente
  color: String,        // hex, cicla em COLORS[]
}

// PayEntry (payments[evId][memId])
{
  paid: Boolean,
  partial: Boolean,
  doubled: Boolean,
  customValue: Number|null  // sobrescreve cache base se definido
}

// Expense
{
  id: Number,
  eventId: Number,
  type: String,         // 'Alimentação'|'Hospedagem'|'Combustível'
  amount: Number,
  date: String,         // 'YYYY-MM-DD'
  description: String,
}

// Contractor (pessoa, não o local)
{
  id: Number,
  name: String,         // nome da PESSOA
  company: String,      // empresa/local que representa
  role: String,         // cargo: 'Gerente', 'Produtor', etc.
  phone: String,        // '(DDD) XXXXX-XXXX'
  email: String,
  city: String,
  state: String,
  lat: Number|null,
  lng: Number|null,
  notes: String,
}

// CompanyProfile (dados da banda/empresa emitente)
{
  companyName: String,
  cnpj: String,         // 'XX.XXX.XXX/XXXX-XX'
  address: String,
  city: String,
  state: String,
  phone: String,
  email: String,
}
```

---

## Padrões de UI

### Cores e tema

- **Primária:** `orange-500` (#f97316) — botões, ícones ativos, destaques
- **Fundo:** `slate-50` / `white`
- **Texto principal:** `slate-900`
- **Texto secundário:** `slate-500` / `slate-400`
- **Bordas:** `slate-200` / `slate-100`
- **Sucesso:** `emerald-500`
- **Aviso:** `amber-500`
- **Erro:** `red-500`

### Componentes reutilizáveis

```jsx
// Button — variantes disponíveis
<Button variant="default|destructive|outline|secondary|ghost|link" size="default|sm|lg|icon|icon-sm" />

// Badge — variantes disponíveis
<Badge variant="default|blue|success|warning|secondary|outline" />

// Avatar
<Avatar init="CS" color="#6366F1" size="sm|md|lg" />

// CurrencyInput — máscara R$ X.XXX,XX automática
<CurrencyInput value={number} onChange={(v) => set('cache', v)} />

// PhoneInput — máscara (DDD) XXXXX-XXXX automática
<PhoneInput value={string} onChange={(v) => set('phone', v)} />

// CitySelect — autocomplete IBGE + coordenadas Nominatim
<CitySelect city={form.city} state={form.state}
  onChange={({ city, state, lat, lng }) => setForm(p => ({ ...p, city, state, lat, lng }))} />
```

### Padrão de accordion com Framer Motion

```jsx
<AnimatePresence initial={false}>
  {open && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{ overflow: 'hidden' }}
    >
      {/* conteúdo */}
    </motion.div>
  )}
</AnimatePresence>
```

### Dropdown dentro de Dialog (Radix)

Problema conhecido: dropdowns dentro de `<Dialog>` são cortados pelo `overflow-y-auto`.
**Solução:** adicionar `className="overflow-y-visible"` no `<DialogContent>`.

### BrazilMap — carregamento lazy

```jsx
const BrazilMap = lazy(() => import('@/components/shared/BrazilMap'))
// uso:
<Suspense fallback={<Skeleton className="w-full h-full rounded-2xl" />}>
  <BrazilMap events={arrayComLatLngStateCityFields} />
</Suspense>
```

Aceita qualquer array cujos objetos tenham `{ lat, lng, state, city }`. Funciona com eventos e com contratantes.

---

## PDF — `src/lib/pdf.js`

Dois documentos gerados via **jsPDF 4.x + jspdf-autotable 5.x**:

```js
import { generateReceipt, generatePayslip } from '@/lib/pdf'

// Recibo individual (botão impressora em Despesas, quando status = Pago)
generateReceipt({ event, member, paidValue, companyProfile })

// Holerite mensal (página Relatórios)
generatePayslip({ member, events, payments, companyProfile, month, year })
// month: 0-11 (índice JS)
```

**Layout dos PDFs:**
- Cabeçalho laranja com nome "BandManager" + título do documento
- Bloco com dados da empresa (companyName, CNPJ, endereço, telefone formatado, email)
- Telefone formatado com `fmtPhone()` interno: `(DDD) XXXXX-XXXX`
- Área de assinatura **fixada no rodapé** da página (`pageHeight - 54mm`)
  - Esquerda: favorecido (nome + CPF)
  - Direita: responsável (nome da empresa + CNPJ)
- Rodapé com "Documento gerado por BandManager" + data

---

## Máscaras de Input

| Campo | Componente / Função |
|---|---|
| Moeda | `<CurrencyInput>` — money-mask em tempo real, exibe `R$ X.XXX,XX` |
| Telefone | `<PhoneInput>` — máscara progressiva `(DDD) XXXXX-XXXX` |
| CPF | Máscara inline em `MemberModal` — `000.000.000-00` |
| CNPJ | Função `formatCnpj()` inline em `Settings.jsx` — `XX.XXX.XXX/XXXX-XX` |

---

## Módulos — Resumo Funcional

### Dashboard
KPIs gerais: receita do mês, shows, cachês pagos, lucro estimado. Cards de próximos eventos e distribuição por tipo.

### Agenda (Shows)
Somente leitura. Mini-calendário com dots de eventos. Lista cronológica. **Não tem CRUD** — eventos são criados em Contratos.

### Contratos
CRUD completo de eventos via `EventModal`. Filtros: ordenação (data/valor asc/desc), tipo, UF, faixa de valor. Botão "Limpar filtros".

### Membros
Accordion por membro com navegação mensal. Tabela de shows do mês com valores e status de pagamento. Cabeçalho com total/recebido/pendente e barra de progresso.

### Despesas (Logistics)
Duas seções abaixo do mapa:
- **Equipe e Cachês:** accordion por evento → lista de membros com segmented pill (Pend./Parc./Pago) + edição de valor inline + botão impressora (quando Pago) → gera `generateReceipt()`
- **Custos Variáveis:** accordion por evento → chips por categoria (Alimentação/Hospedagem/Combustível) + CRUD de despesas

### Contratantes
Contratante = **pessoa** (não o local). Campos: nome, empresa que representa, cargo, telefone, email, cidade, notas.
- Tabela com drawer lateral de detalhes
- Ranking por número de shows (barras CSS animadas)
- Mapa de calor (BrazilMap com contratantes)
- Status automáticos: VIP (LTV ≥ R$15k), Frequente (5+ shows), Recorrente (3+), Fiel (2+ anos), Inativo (>365 dias), Novo, Promissor
- Vinculação no EventModal via checkboxes

### Relatórios
Filtros: mês/ano + membro. Visão geral de todos os membros quando nenhum selecionado. Detalhamento individual com cards de resumo. Botão "Gerar Holerite PDF" → `generatePayslip()`.

### Configurações
Perfil da empresa: Nome, CNPJ, Endereço, Cidade/Estado, Telefone, E-mail. Pré-visualização do cabeçalho do PDF em tempo real. Persiste em `bm_company`.

---

## Regras de Negócio Importantes

### Cálculo de valor do cachê
```js
// Em qualquer lugar que precise calcular o valor efetivo:
const entry = getPayEntry(evId, memberId)
const base  = member.cache ?? 0
const valor = entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
```
`customValue` sobrescreve tudo. `doubled` dobra o cachê base. Ambos são por evento/membro.

### Status de pagamento (3 estados)
`{ paid: false, partial: false }` → Pendente  
`{ paid: false, partial: true  }` → Parcial  
`{ paid: true,  partial: false }` → Pago  

### Margem do contratante
```js
const ltv    = linkedEvents.reduce((s, e) => s + (e.value || 0), 0)
const caches = /* soma dos cachês de todos os membros dos eventos vinculados */
const varExp = /* soma das expenses cujo eventId está nos eventos vinculados */
const margin = ltv > 0 ? Math.round(((ltv - caches - varExp) / ltv) * 100) : 0
```

### IDs
Todos os IDs são `Date.now()` (timestamp em ms). IDs dos dados de exemplo em `defaults.js` usam inteiros baixos (1–6 para membros/eventos, 1001+ para expenses, 101–106 para contratantes).

---

## Convenções de Código

- **Sem comentários** exceto quando o "porquê" é não-óbvio
- **Sem TypeScript** — projeto usa JSX puro
- Componentes de página recebem `{ isLoading, onNav }` via `pageProps`
- Skeleton obrigatório em toda página: `if (isLoading) return <NomeSkeleton />`
- Toasts: `toast.success()` / `toast.error()` da lib `sonner`
- Datas sempre manipuladas com `new Date(str + 'T12:00:00')` para evitar bugs de timezone
- `cn()` de `@/lib/utils` para classes condicionais (clsx + tailwind-merge)
- Animação de entrada das páginas: `animate-slide-up` (CSS global) no wrapper raiz de cada página

---

## Armadilhas Conhecidas

| Problema | Causa | Solução |
|---|---|---|
| Dropdown cortado dentro de Dialog | `overflow-y-auto` do Radix DialogContent | `<DialogContent className="overflow-y-visible">` |
| `createPortal` + Radix focus trap | Portal renderiza fora da árvore DOM do Dialog; focus trap intercepta eventos | Manter dropdowns dentro do Dialog sem portal |
| BrazilMap fundo preto parcial | SVG sem fill de fundo | `style={{ background: '#0f172a' }}` no `<ComposableMap>` |
| `calcStats(null)` crash | ContractorDrawer chamava calcStats mesmo com contractor=null | Guardar: `const stats = contractor ? calcStats(...) : null` |
| CurrencyInput e parseBRL | Componente antigo usava parseBRL em blur | Novo componente usa money-mask (centavos) em tempo real |
