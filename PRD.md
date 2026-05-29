# PRD — Akro · Sistema de Gestão de Bandas Musicais
**Versão:** 1.0 | **Data:** Maio 2026 | **Status:** Em desenvolvimento ativo

---

## 1. Visão Geral do Produto

**Akro** é uma plataforma web SaaS para gestão completa de bandas musicais profissionais. Centraliza agenda, finanças, membros, logística, repertório, contratos e inteligência analítica em uma única interface — eliminando planilhas, grupos de WhatsApp e ferramentas dispersas.

### Proposta de Valor
- Gestão financeira completa: cachês, despesas variáveis, recibos, holerites e balanços em PDF
- Visão 360° da banda: do contrato ao pagamento, do ensaio ao show
- Documentos profissionais gerados automaticamente (orçamentos, contratos, relatórios)
- Acesso colaborativo com permissões granulares para assessores e produtores

---

## 2. Usuários-Alvo

| Perfil | Descrição |
|---|---|
| **Líder / Empresário** | Gerencia a banda, acessa tudo, aprova pagamentos |
| **Músico** | Visualiza agenda e seus próprios cachês |
| **Produtor / Assessor** | Acesso parcial via link de colaborador |
| **Financeiro** | Foco em pagamentos, despesas, relatórios |

---

## 3. Planos e Limites

| Recurso | Solo | Profissional | Multi-Bandas |
|---|---|---|---|
| Membros | Até 8 | Até 25 | Ilimitado |
| Bandas | 1 | 1 | Até 5 |
| Checklist | ✗ | ✓ | ✓ |
| Orçamentos | ✗ | ✓ | ✓ |
| Equipamentos | ✗ | ✓ | ✓ |
| Ensaios | ✗ | ✓ | ✓ |
| Relatórios avançados | ✗ | ✓ | ✓ |
| Colaboradores | ✗ | Ilimitado | Ilimitado |

---

## 4. Arquitetura de Navegação

```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR  [☰ Menu] [Título da página]  [Banda ▾] [🔔] [→] │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   SIDEBAR    │           ÁREA DE CONTEÚDO               │
│              │                                          │
│  ● Dashboard │                                          │
│  ● Agenda    │                                          │
│  ─────────── │                                          │
│  ● Contratos │                                          │
│  ● Membros   │                                          │
│  ● Financeiro│                                          │
│  ● Logística │                                          │
│  ● Contrat.  │                                          │
│  ● Repertório│                                          │
│  ● Ensaios   │                                          │
│  ● Equipam.  │                                          │
│  ● Orçamentos│                                          │
│  ● Checklist │                                          │
│  ─────────── │                                          │
│  ● Relatórios│                                          │
│  ● Config.   │                                          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Roteamento:** baseado em estado (sem react-router). Cada página é uma string em `useState`.  
**Layout responsivo:** sidebar fixa no desktop, drawer deslizante no mobile via botão hamburger.

---

## 5. Módulos — Especificação Detalhada

---

### 5.1 Dashboard

**Objetivo:** visão geral da saúde financeira e operacional da banda.

```
┌─────────────────────────────────────────────────────────┐
│  Bom dia, [Nome da Banda] 🌅                            │
│  Hoje é terça, 27 de maio                               │
├────────────┬────────────┬────────────┬──────────────────┤
│ Receita Mês│ Shows Mês  │ Cachês     │ Lucro Estimado   │
│ R$ 12.400  │    3       │ R$ 4.200   │ R$ 7.800         │
│ ↑ 15% m/m  │            │ Pagos: 2   │ Margem: 63%      │
├────────────┴────────────┴────────────┴──────────────────┤
│  PRÓXIMOS EVENTOS                    DISTRIBUIÇÃO       │
│  ─────────────────────              ──────────────      │
│  [🎵] Show no Espaço X   3 jun  ▶   Show solo   65%    │
│  [🎵] Festival da Cidade 10 jun ▶   Festival    20%    │
│  [🎵] Casamento Silva    15 jun ▶   Casamento   15%    │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- KPIs do mês atual: receita, nº de shows, total de cachês, lucro estimado
- Variação percentual mês a mês nos KPIs
- Lista de próximos eventos (os 5 mais próximos) com data e tipo
- Gráfico de distribuição por tipo de show (pizza)
- Saudação com o nome da banda ativa (`activeBand.name`)
- Detecção de período do dia para saudação contextual

---

### 5.2 Agenda (Shows)

**Objetivo:** visualização da agenda da banda. Somente leitura (CRUD em Contratos).

```
┌─────────────────────────────────────┬───────────────────┐
│  CALENDÁRIO MENSAL          < Maio >│  LISTA DE SHOWS   │
│  ─────────────────────────────────  │  ───────────────  │
│  Dom Seg Ter Qua Qui Sex Sáb        │  27/05            │
│                  1   2   3          │  ┌───────────────┐│
│   4   5   6   7   8 ●9  10          │  │ Festival SP   ││
│  11  12  13  14  15  16  17         │  │ 20:00 – 23:00 ││
│  18  19  20  21  22  23  24         │  │ Parque Ibirap.││
│  25  26  27 ●28  29  30  31         │  └───────────────┘│
│                                     │                   │
│  ● = tem eventos                    │  28/05 (hoje)     │
│                                     │  ┌───────────────┐│
│  Eventos em 09/05:                  │  │ Show Paulista ││
│  ┌─────────────────────────────┐    │  │ 22:00 – 01:00 ││
│  │ 🎵 Festival Sul  20:00–01:00│    │  │ Espaço das Ar.││
│  │ 📍 Arena Gaúcha             │    │  └───────────────┘│
│  └─────────────────────────────┘    │                   │
└─────────────────────────────────────┴───────────────────┘
```

**Funcionalidades:**
- Mini-calendário interativo com dots laranja nos dias com eventos
- Clique no dia exibe os eventos daquele dia (painel inferior do calendário)
- Lista cronológica completa de todos os eventos à direita
- Badges de tipo (Show, Festival, Casamento, Aniversário, Corporativo, Outro)
- Exibição de visibilidade: ícone 🏛️ Público ou 🔒 Privado

---

### 5.3 Contratos

**Objetivo:** CRUD completo de eventos/shows com filtros avançados.

```
┌─────────────────────────────────────────────────────────┐
│  Contratos e Shows          [+ Novo Contrato]           │
│                                                         │
│  Filtros:                                               │
│  [Ordenar: Data ↓▾] [Tipo: Todos▾] [UF: Todas▾]       │
│  [Valor: Todos▾]                    [Limpar filtros]    │
│                                                         │
│  3 shows encontrados                                    │
│  ────────────────────────────────────────────────────   │
│  [🟠] Festival SP       10 jun 2026    R$ 8.500         │
│        Arena Ibirapuera · SP           Festival  Públic │
│        5 membros escalados             [✏️] [🗑️]        │
│  ────────────────────────────────────────────────────   │
│  [🟢] Casamento Meireles  15 jun 2026  R$ 4.200         │
│        Chácara Arvoredo · Campinas/SP  Casament  Privad │
│        3 membros escalados             [✏️] [🗑️]        │
└─────────────────────────────────────────────────────────┘
```

**Modal de Evento (criação/edição):**

```
┌────────────────────────────────────────────────────────┐
│  Novo Show / Evento                                [✕] │
│  ─────────────────────────────────────────────────     │
│  Nome do Evento  [________________________]            │
│  Local           [________________________]            │
│  Tipo  [Show solo▾]   Iniciativa [Público▾]            │
│  Organizador     [________________________]            │
│                                                        │
│  Data    [📅 DD/MM/AAAA]   Horário [HH:MM] → [HH:MM] │
│  Cidade/Estado  [📍 Buscar cidade...]                  │
│  Valor do Contrato  [R$ 0,00]                         │
│                                                        │
│  Membros Escalados                                     │
│  ☑ João (Guitarra)  ☑ Maria (Voz)  ☐ Pedro (Baixo)   │
│                                                        │
│  Contratantes Vinculados                               │
│  ☐ Carlos (Prod. Eletrosom)  ☑ Ana (Casa de Shows)    │
│                                                        │
│  Observações  [________________________________]       │
│                                                        │
│              [Cancelar]  [Salvar evento]               │
└────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Ordenação: data asc/desc, valor asc/desc
- Filtro por tipo, UF, faixa de valor
- Busca de cidade com autocomplete IBGE + geolocalização automática (Nominatim)
- Vinculação de membros e contratantes ao evento
- Status do contrato (Pendente / Parcial / Recebido) com valores parciais

---

### 5.4 Membros

**Objetivo:** gestão do elenco com acompanhamento financeiro mensal por accordion.

```
┌─────────────────────────────────────────────────────────┐
│  Membros                        [+ Novo Membro]         │
│                                                         │
│  [< Abril 2026]                              [Maio >]   │
│                                                         │
│  ──────────────────────────────────────────────────     │
│  ▶ [JS] João Silva · Guitarra           R$ 2.400 ▼     │
│  ──────────────────────────────────────────────────     │
│    Total mês: R$2.400  Recebido: R$2.400  Pendente: R$0 │
│    ████████████████████████████ 100%                    │
│                                                         │
│    Data      Show              Valor    Status          │
│    10/05     Festival SP       R$1.200  [Pago     ✓]   │
│    22/05     Show Paulista     R$1.200  [Pago     ✓]   │
│  ──────────────────────────────────────────────────     │
│  ▶ [MP] Maria Pereira · Voz             R$ 1.800 ▼     │
│  ──────────────────────────────────────────────────     │
│    Total mês: R$1.800  Recebido: R$900   Pendente: R$900│
│    ██████████████░░░░░░░░░░░░░░  50%                    │
│                                                         │
│    10/05     Festival SP       R$900   [Pago     ✓]   │
│    22/05     Show Paulista     R$900   [Pendente  ○]   │
└─────────────────────────────────────────────────────────┘
```

**Modal de Membro:**

```
┌───────────────────────────────────────────────────┐
│  Novo Membro                                  [✕] │
│  ─────────────────────────────────────────────    │
│  Nome completo  [_________________________]       │
│  Instrumento/Cargo  [___________________]         │
│  Cachê base  [R$ 0,00]                           │
│  CPF  [000.000.000-00]  (opcional)               │
│                                                   │
│                [Cancelar]  [Salvar]               │
└───────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Navegação mensal (mês anterior / próximo)
- Accordion por membro com avatar colorido
- Header do accordion: nome, role, total do mês
- Barra de progresso: % recebido vs pendente
- Tabela de shows do mês com segmented pill de status (Pendente/Parcial/Pago)
- Edição de valor individual por show (customValue sobrescreve cachê base)
- Opção "Dobrar cachê" para shows especiais
- CPF visível apenas na geração de documentos PDF

---

### 5.5 Financeiro

**Objetivo:** visão financeira completa por evento com gestão de cachês e despesas.

```
┌─────────────────────────────────────────────────────────┐
│  Financeiro                                             │
│                                                         │
│  [< Jun 2026]  Resumo Mensal                  [Jul >]  │
│  ─────────────────────────────────────────────────      │
│  Receita       Cachês        Despesas    Lucro          │
│  R$ 12.400     R$ 4.800      R$ 1.200    R$ 6.400       │
│  ████████████ Barra de progresso de margem (52%)        │
│                                                         │
│  SHOWS DO MÊS ─────────────────────────────────────────│
│  ▼  Festival SP                    Faturamento: R$8.500 │
│     ────────────────────────────────────────────────── │
│     Equipe e Cachês                                     │
│     [JS] João    R$1.200  [Pend.●][Parc.●][Pago ●]    │
│                           [R$ 1.200 ✏️]  [🖨️]          │
│     [MP] Maria   R$900    [Pend.●][Parc.●][Pago ●]    │
│                                                         │
│     Custos Variáveis                                    │
│     [🍽️ Alimentação R$250] [🏨 Hospedagem R$400]       │
│     [⛽ Combustível R$150] [+ Adicionar]               │
│                                                         │
│     ─────────────────────────────────────────          │
│     Lucro do show: R$ 5.500    Margem: 65%             │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Resumo mensal com 4 KPIs: receita, cachês, despesas variáveis, lucro
- Barra de margem líquida visual com cor condicional (verde ≥50%, amarelo ≥30%, vermelho <30%)
- Accordion por show com divisão Equipe / Custos Variáveis
- Segmented pill de 3 estados por membro: Pendente / Parcial / Pago
- Edição inline de valor de cachê com CurrencyInput
- Botão de impressora (🖨️) gera **Recibo Individual em PDF** quando status = Pago
- CRUD de despesas variáveis por show: Alimentação, Hospedagem, Combustível, Comissão, Outro
- Comissão vinculável a contratantes específicos
- Status de recebimento do **contrato** (valor da contratante): Pendente / Parcial / Recebido
  - Suporte a pagamentos parciais com histórico e soma acumulada

---

### 5.6 Logística

**Objetivo:** planejamento geográfico de turnês, rotas e custos de deslocamento.

```
┌─────────────────────────────────────────────────────────┐
│  Logística                                              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         MAPA DO BRASIL                          │   │
│  │   •São Paulo  •Curitiba  •Porto Alegre           │   │
│  │   (pontos laranja = shows marcados no período)  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ROTA E DESLOCAMENTO  ──────────────────────────────── │
│  Origem  [📍 São Paulo/SP]                              │
│  Parada  [📍 Curitiba/PR]      245 km  [✏️] [⭐] [🗑️]  │
│  Destino  [📍 Porto Alegre/RS]  476 km  [+ Parada]     │
│                                                         │
│  Total: 721 km                                          │
│                                                         │
│  Equipe e Cachês ───────────────────────────── [< Jun] │
│  ▼ Festival SP · 10/jun                                 │
│  (mesma view que em Financeiro)                         │
│                                                         │
│  Custos Variáveis ──────────────────────────────────── │
│  ▼ Festival SP · 10/jun                                 │
│  (mesma view que em Financeiro)                         │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Mapa do Brasil interativo (react-simple-maps) com pins nos shows do período selecionado
- Planejador de rota com origem → paradas → destino
- Cálculo de distância por haversine entre coordenadas (km aéreo)
- Paradas favoritas marcáveis com ⭐ (reutilizáveis em outras rotas)
- Paradas vinculáveis a um evento específico ("Parada após Show X")
- As seções de Equipe/Cachês e Custos Variáveis espelham o módulo Financeiro com navegação mensal

---

### 5.7 Contratantes

**Objetivo:** CRM de pessoas (não locais) que contratam a banda.

```
┌──────────────────────────────────┬──────────────────────┐
│  Contratantes    [+ Novo]        │  DRAWER DE DETALHES  │
│  ─────────────────────────────   │  ──────────────────  │
│  Buscar [_________________]      │  [CA] Carlos Almeida │
│                                  │  Produtor · Eletrosom│
│  Carlos Almeida ✦ VIP  [→]      │                      │
│  Ana Ribeiro    🔄 Freq. [→]    │  📞 (11) 99999-0000  │
│  Marcos Lima    ⭐ Fiel  [→]    │  ✉ carlos@eletrosom  │
│  Joana Costa    🆕 Novo  [→]    │  📍 São Paulo/SP     │
│  ─────────────────────────────   │                      │
│  RANKING POR SHOWS               │  HISTÓRICO (5 shows) │
│  ─────────────────────────────   │  R$ 42.500 LTV       │
│  Carlos  ████████████  5 shows   │  Margem média: 61%   │
│  Ana     ████████      4 shows   │  Último: 22/05/26    │
│  Marcos  ██████        3 shows   │                      │
│  Joana   ████          2 shows   │  [Editar] [Excluir]  │
│  ─────────────────────────────   │                      │
│  MAPA DE CALOR                   │                      │
│  (BrazilMap com pins contrat.)   │                      │
└──────────────────────────────────┴──────────────────────┘
```

**Status automáticos de contratante:**

| Status | Critério |
|---|---|
| ✦ VIP | LTV ≥ R$ 15.000 |
| 🔄 Frequente | 5+ shows |
| 🔄 Recorrente | 3+ shows |
| ⭐ Fiel | 2+ anos com a banda |
| 🚫 Inativo | Último show há > 365 dias |
| 🆕 Novo | 1 show |
| 🌱 Promissor | LTV crescente |

**Funcionalidades:**
- Tabela com busca por nome/empresa
- Drawer lateral de detalhes com histórico de shows, LTV e margem
- Status calculado automaticamente com base em eventos vinculados
- Ranking CSS animado por número de shows
- Mapa de calor (BrazilMap) com localização dos contratantes
- Vinculação no EventModal via checkboxes
- Campos: nome (pessoa), empresa que representa, cargo, telefone, email, cidade, notas

---

### 5.8 Repertório

**Objetivo:** catálogo de músicas com estatísticas de execução e setlists por show.

```
┌─────────────────────────────────────────────────────────┐
│  Repertório         [🔍 Buscar]        [+ Nova música]  │
│                                                         │
│  Filtros: [Tag: Todas▾] [Tom: Todos▾]                  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Bohemian Rhapsody      ♩ C   ♩ 72 bpm  4:55     │  │
│  │  Queen · Rock           🏷 Clássico, Encore       │  │
│  │  ▶ 12 execuções  🎸 8 ensaios                    │  │
│  │                              [✏️] [Setlist] [🗑️]  │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Sweet Child O' Mine    ♩ Db  ♩ 125 bpm  5:03    │  │
│  │  Guns N' Roses · Rock   🏷 Cover, Abertura        │  │
│  │  ▶ 8 execuções   🎸 5 ensaios                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  SETLISTS ──────────────────────────────────────────── │
│  Festival SP (10/jun)         [+ Nova setlist] [✏️]    │
│  1. Abertura Original                                   │
│  2. Sweet Child O' Mine                                 │
│  3. Bohemian Rhapsody                                   │
│  [✅ Confirmar setlist]                                 │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Catálogo de músicas com: título, artista, tom, BPM, duração, tags, notas
- Contagem de execuções em shows (`playCount`) e ensaios (`rehearsalCount`)
- Filtro por tag e tom
- Criação de setlists vinculadas a eventos específicos
- Confirmação de setlist (status: rascunho → confirmada)
- Tags personalizáveis por música (ex: "Cover", "Original", "Encore")

---

### 5.9 Ensaios

**Objetivo:** agendamento de ensaios com lista de presença e repertório.

```
┌─────────────────────────────────────────────────────────┐
│  Ensaios                           [+ Novo Ensaio]      │
│                                                         │
│  ▼ Ensaio · 20/05/2026  19:00  Studio Rock             │
│  ────────────────────────────────────────────────────── │
│    Status: [Agendado▾]                                  │
│                                                         │
│    PRESENÇA                                             │
│    ☑ [JS] João Silva       ☑ [MP] Maria Pereira         │
│    ☐ [PO] Pedro Oliveira   ☑ [LA] Lucas Andrade         │
│                                                         │
│    MÚSICAS ENSAIADAS                                    │
│    ☑ Bohemian Rhapsody   ☑ Sweet Child O' Mine          │
│    ☐ Stairway to Heaven  [+ Adicionar música]           │
│                                                         │
│    Observações: Focar nas harmonias do segundo bloco    │
│                                                         │
│    [✏️ Editar]  [🗑️ Excluir]                           │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Agendamento de ensaios: data, hora, local, status (Agendado/Realizado/Cancelado)
- Lista de presença por membro (checkboxes → `attendedMembers[]`)
- Músicas ensaiadas (atualiza `rehearsalCount` das músicas)
- Notas livres por ensaio
- Frequência individual visível no módulo de Membros e Relatórios

---

### 5.10 Equipamentos

**Objetivo:** inventário de equipamentos da banda com status e vínculo a shows.

```
┌─────────────────────────────────────────────────────────┐
│  Equipamentos                     [+ Novo Equipamento]  │
│                                                         │
│  Filtros: [Categoria: Todos▾] [Status: Todos▾]         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  🎛️ Mesa Behringer X32                           │  │
│  │  Categoria: Som · Behringer X32           R$8.500│  │
│  │  Serial: BEH-X32-001234                          │  │
│  │  ● Disponível              [✏️] [🗑️]             │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  🎸 Guitarra Gibson SG                           │  │
│  │  Categoria: Instrumento · Gibson          R$4.200│  │
│  │  ● Em Manutenção            [✏️] [🗑️]            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  CHECKLIST POR SHOW ─────────────────────────────────  │
│  Festival SP (10/jun)                                   │
│  ☑ Mesa Behringer X32   ☑ Guitarra Gibson SG           │
│  ☐ Monitor JBL 15"      [✅ Confirmar checklist]        │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Inventário com: nome, categoria, marca, modelo, nº serial, valor, status, notas
- Status: Disponível / Em uso / Em manutenção / Emprestado
- Checklist de equipamentos por show (`showEquipment`)
- Confirmação de equipamentos levados para o show

---

### 5.11 Orçamentos

**Objetivo:** geração e envio de propostas comerciais profissionais.

```
┌─────────────────────────────────────────────────────────┐
│  Orçamentos                         [+ Novo Orçamento]  │
│                                                         │
│  Filtros: [Rascunho] [Enviado] [Aprovado]              │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Proposta · Casamento Meireles      🔵 Enviado   │  │
│  │  Cachoeiro de Itapemirim/ES  ·  15/06/2026        │  │
│  │  Show solo · Privado · R$ 4.200                   │  │
│  │  Válido até 14/06/2026 (2 dias)                   │  │
│  │                    [📄 PDF] [✏️ Editar] [🗑️]     │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Proposta · Festa Corporativa       ✏️ Rascunho  │  │
│  │  São Paulo/SP  ·  20/07/2026                      │  │
│  │  Show solo · Privado · R$ 6.500                   │  │
│  │                    [📄 PDF] [✏️ Editar] [🗑️]     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Modal de Orçamento (rich form com preview):**

```
┌────────────────────────────────────────────────────────┐
│  Novo Orçamento                                    [✕] │
│                                                        │
│  Nome do Evento  [Casamento Meireles            ]     │
│  Tipo  [Casamento▾]    Iniciativa  [Privado▾]         │
│  Organizador  [________________________]               │
│  Data  [📅]   Horário Início [HH:MM]  Fim [HH:MM]    │
│  Cidade/Estado  [📍 Cachoeiro de Itapemirim/ES]        │
│  Local  [Chácara Arvoredo                       ]     │
│  Valor  [R$ 4.200,00]                                 │
│  Validade  [30 dias]                                   │
│                                                        │
│  Itens do Orçamento                                    │
│  Item 1: [Apresentação musical - 2 horas    ] [R$4.200]│
│  [+ Adicionar item]                                    │
│                                                        │
│  Observações  [______________________________]         │
│                                                        │
│  Status  [Rascunho▾] → [Enviado] → [Aprovado]        │
│                                                        │
│  [Cancelar] [Salvar rascunho] [Gerar PDF]             │
└────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- CRUD de orçamentos com status: Rascunho → Enviado → Aprovado
- Múltiplos itens com descrição e valor
- Validade configurável (padrão do perfil da empresa)
- Alerta visual quando proposta está vencendo (≤ 3 dias)
- Geração de **PDF profissional** com logo, dados da empresa, tabela de itens, assinatura
- Conversão de orçamento aprovado em contrato/evento
- Campo de organizador/cliente com nome e empresa

---

### 5.12 Checklist

**Objetivo:** listas de tarefas técnicas por show (input list, rider, translado, etc.).

```
┌─────────────────────────────────────────────────────────┐
│  Checklist                                              │
│                                                         │
│  [< Junho 2026]                              [Julho >]  │
│                                                         │
│  Festival SP · 10/06  ────────────────────────────────  │
│  ▶ Template: Checklist Padrão                   7/8 ✓  │
│     ☑ Input List        ☑ Room List                    │
│     ☑ Camarim           ☑ Lista Integrantes             │
│     ☑ Hospedagem        ☑ Translado show               │
│     ☑ Rider             ☐ Contrato assinado            │
│     [+ Item personalizado]                              │
│                                                         │
│  Casamento Meireles · 15/06  ─────────────────────────  │
│  ▶ Template: Checklist Padrão                   3/8 ✓  │
│     ☑ Input List        ☐ Room List                    │
│     ☑ Camarim           ☑ Lista Integrantes             │
│     ☐ Hospedagem ...                                   │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Checklists automáticos por show baseados em templates configuráveis
- Template padrão: Input List, Room List, Camarim, Lista Integrantes, Hospedagem, Translado, Rider, Contrato
- Itens personalizados por show
- Progresso visual (X/Y itens concluídos)
- Navegação mensal entre shows
- Data/hora de conclusão registrada (`doneAt`) por item

---

### 5.13 Inteligência e Relatórios

**Objetivo:** dashboard analítico com gráficos, insights automáticos e exportação de PDF.

#### Seletor de Módulo

```
┌─────────────────────────────────────────────────────────┐
│  🧠 Inteligência e Relatórios                           │
│  Análise estratégica para tomada de decisões            │
│                                                         │
│  Selecione o módulo para análise:                       │
│  [Financeiro                                         ▾] │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Período: [30d] [3m] [6m] [1a] [Personalizado]    │  │
│  │ Tipo: [Todos▾] Iniciativa: [Todas▾]              │  │
│  │ Evento específico: [Todos os eventos         ▾]  │  │ ← NOVO filtro financeiro
│  │                                        [↓ PDF]   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Módulo Financeiro — Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│  No período analisado, a banda faturou R$42.400 com     │
│  8 shows, registrando ticket médio de R$5.300. O custo  │
│  operacional total foi de R$18.200 (margem de 57%).     │
│                                                         │
│  ┌ Faturamento, Despesas e Lucro por Mês ─────────────┐ │
│  │     10k ┤      ╭────╮                              │ │
│  │      8k ┤    ╭─╯    ╰──╮                          │ │
│  │      6k ┤  ╭─╯         ╰─╮ ← Receita              │ │
│  │      4k ┤╭─╯             ╰── Lucro                 │ │
│  │      2k ┼╯                  Despesas               │ │
│  │         Jan Fev Mar Abr Mai Jun                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  A evolução financeira revela tendência de melhora:...  │ ← Texto analítico
│                                                         │
│  ┌ Lucro por Show (cronológico) ┐  Ticket Médio        │ │
│  │ ...gráfico de linha...       │  R$ 5.300             │
│  │                              │  Maior Show: R$8.500  │ │
│  └──────────────────────────────┘  Menor Show: R$2.200  │ │
│                                                         │
│  💡 Faturamento total: R$42.400. Ticket médio: R$5.300  │
│                                                         │
│  Com margem de 57%, o período apresenta resultado...    │ ← Conclusão analítica
└─────────────────────────────────────────────────────────┘
```

#### Módulo Financeiro — Evento Específico (filtro novo)

```
┌─────────────────────────────────────────────────────────┐
│  🟠  Festival SP                                        │
│      10/06/2026 · Arena Ibirapuera · São Paulo/SP       │
│                                                         │
│  ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Contrato   │ │ Cachês    │ │ Despesas │ │  Lucro  │ │
│  │ R$ 8.500   │ │ R$ 3.200  │ │ R$ 850   │ │ R$4.450 │ │
│  └────────────┘ └───────────┘ └──────────┘ └─────────┘ │
│                                             52% margem  │
│  Cachês dos Membros                                     │
│  [JS] João Silva    Guitarra     R$1.200   Pago ●       │
│  [MP] Maria Pereira Voz          R$900     Parcial ◑    │
│  [PO] Pedro         Baixo        R$600     Pendente ○   │
│  [LA] Lucas         Bateria      R$500     Pago ●       │
│                                                         │
│  Despesas Variáveis                                     │
│  Alimentação   Jantar pós-show        R$ 350            │
│  Combustível   Combustível van        R$ 500            │
└─────────────────────────────────────────────────────────┘
```

#### Módulo Membros — Membro Específico (filtro existente ativado)

```
┌─────────────────────────────────────────────────────────┐
│  Filtros: [Todos▾] [João Silva             ▾]           │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [JS]  João Silva                                │  │
│  │        Guitarra               Cachê base: R$1.200│  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────┐  │
│  │ Total Ganho  │ │ Shows no Per.  │ │ Freq. Ensaios│  │
│  │ R$ 4.800     │ │       4        │ │     85%      │  │
│  └──────────────┘ └────────────────┘ └──────────────┘  │
│                                                         │
│  Shows no período (4)                                   │
│  10/05  Festival SP          R$1.200   Pago ●           │
│  22/05  Show Paulista        R$1.200   Pago ●           │
│  10/06  Festival SP Jun      R$1.200   Parcial ◑        │
│  22/06  Show Interior        R$1.200   Pendente ○       │
│                                                         │
│  Frequência em Ensaios                                  │
│  João Silva  ████████████████████░░░  17/20  85%        │
│                                                         │
│  💡 João Silva: 4 shows no período, R$4.800 em cachê,  │
│     85% de freq. em ensaios.                           │
│                                                         │
│  [↓ Exportar relatório específico]  [Comprovante PDF]  │
└─────────────────────────────────────────────────────────┘
```

**Módulos de análise disponíveis:**

| Módulo | Filtros específicos | Gráficos |
|---|---|---|
| Contratos e Shows | Tipo, Iniciativa | Shows por mês, Por tipo, Por iniciativa |
| Financeiro | Tipo, Iniciativa, **Evento específico** | Evolução financeira, Lucro por show |
| Despesas | Categoria | Por categoria (pizza), Por mês, Ranking de eventos |
| Membros | Cargo, **Membro específico** | Cachê por membro, Frequência ensaios |
| Repertório | Tag | Músicas mais tocadas, Por tag |
| Ensaios | Membro | Frequência por membro, Por mês |
| Contratantes | Estado | Top contratantes, Mapa LTV |
| Equipamentos | Categoria, Status | Por categoria, Status |
| Orçamentos | Status | Taxa de conversão, Valor por status |

**Exportação PDF:**
- Captura gráficos como imagem (html2canvas) em DOM order
- Textos analíticos (intro, contexto de gráfico, conclusão, insights) incluídos no PDF
- PDF com cabeçalho laranja, dados da empresa, rodapé com data

**Relatórios específicos:**
- **Holerite mensal** (por membro · por mês): todos os shows, cachês, status de pagamento
- **Recibo individual** (por membro · por show): gerado quando status = Pago
- **Comprovante de pagamento** (módulo Membros)
- **Balanço financeiro mensal**: receitas, cachês, despesas, lucro
- **Relatório de show** (módulo Contratos): checklist, equipe, setlist, equipamentos
- **Relatório de turnê**: range de datas, seleção de shows, custos totais
- **PDF de orçamento**: proposta comercial profissional com itens e assinatura

---

### 5.14 Configurações

**Objetivo:** perfil da empresa/banda para preenchimento automático de PDFs.

```
┌─────────────────────────────────────────────────────────┐
│  Configurações                                          │
│                                                         │
│  PERFIL DA EMPRESA ────────────────────────────────── │
│  Nome da empresa  [Akro Produções Musicais        ]   │
│  CNPJ             [00.000.000/0001-00             ]   │
│  Endereço         [Rua das Guitarras, 100         ]   │
│  Cidade/Estado    [São Paulo / SP                 ]   │
│  Telefone         [(11) 99999-9999                ]   │
│  E-mail           [contato@akro.com               ]   │
│  Validade da proposta  [30 dias]                       │
│                                                        │
│  [📤 Upload de Logo]                                   │
│  Cor primária: [🟠 #f97316] Cor de destaque: [__]     │
│                                                        │
│  PRÉ-VISUALIZAÇÃO DO CABEÇALHO PDF                    │
│  ┌────────────────────────────────────────────────┐   │
│  │ [LOGO] Akro Produções Musicais                 │   │
│  │        CNPJ: 00.000.000/0001-00                │   │
│  │        Rua das Guitarras, 100 · São Paulo/SP   │   │
│  │        (11) 99999-9999 · contato@akro.com      │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  COLABORADORES ──────────────────────────────────────  │
│  [👤] Ana Assessora  Assessora   ana@...  [✏️] [🗑️]   │
│  [👤] Carlos Prod.   Produtor    car@...  [✏️] [🗑️]   │
│                              [+ Novo Colaborador]     │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Campos: Nome da empresa, CNPJ (máscara XX.XXX.XXX/XXXX-XX), Endereço, Cidade/Estado, Telefone (máscara), Email
- Upload de logo em base64 (exibida nos PDFs)
- Cores da marca: primária e destaque (usadas nos PDFs gerados)
- Preview em tempo real do cabeçalho que aparecerá nos PDFs
- Validade padrão de propostas (usado nos orçamentos)
- Gerenciamento de **Colaboradores** com acesso externo:
  - Nome, cargo/função, email, senha bcrypt (sem PIN)
  - Permissões granulares: Financeiro, Contratos, Membros, Logística, etc.

---

### 5.15 Colaboradores e Acesso Externo

**Objetivo:** acesso controlado de produtores, assessores e parceiros externos.

```
┌──────────────────────────────────────────────────────┐
│  LOGIN DE COLABORADOR                                │
│                                                      │
│  [LOGO da Banda]                                     │
│  Acesse sua conta                                    │
│                                                      │
│  E-mail    [ana@assessoria.com              ]        │
│  Senha     [••••••••••••                    ]        │
│                                                      │
│                 [Entrar]                             │
│                                                      │
│  ← Voltar para login principal                       │
└──────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Login separado do dono da banda (email + senha bcrypt)
- Sessão anônima Supabase com `band_id` no JWT (para RLS)
- Badge de identificação na topbar: "👤 Ana Assessora"
- Sidebar adaptada às permissões concedidas
- Módulos visíveis somente se a permissão correspondente estiver ativa
- Sem acesso a: gerenciamento de colaboradores, configurações sensíveis, troca de banda

---

### 5.16 Seletor de Bandas (Multi-Bandas)

**Objetivo:** alternar entre múltiplas bandas sem fazer novo login.

```
┌──────────────────────────────┐
│  [AB] Akro Band ▾            │   ← topbar (plano multi_bandas)
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Suas bandas                 │
│  ──────────────────────────  │
│  [AB] Akro Band        ✓    │  ← ativa
│  [RB] Rock Brothers         │
│  [JB] Jazz Boutique         │
│  ──────────────────────────  │
│  [+] Adicionar banda         │  ← oculto quando maxBands atingido
└──────────────────────────────┘
```

**Funcionalidades:**
- Seletor somente para plano `multi_bandas`
- Cada banda tem seus próprios dados (eventos, membros, finanças)
- Troca instantânea sem reload
- `bm_active_band_id` em localStorage persiste a banda selecionada
- Limite de 5 bandas no plano multi_bandas
- Exclusão de banda com confirmação (irreversível)

---

## 6. Fluxos Principais

### 6.1 Fluxo de Show Completo

```
1. CONTRATOS        → Criar evento (dados do show, valor, membros)
2. AGENDA           → Visualizar no calendário
3. ORÇAMENTOS       → Enviar proposta ao cliente (se necessário)
4. CHECKLIST        → Marcar itens técnicos conforme se aproxima
5. LOGÍSTICA        → Planejar rota e paradas
6. FINANCEIRO       → Registrar pagamentos e despesas variáveis
7. REPERTÓRIO       → Confirmar setlist vinculada ao show
8. EQUIPAMENTOS     → Confirmar checklist de equipamentos
9. MEMBROS          → Marcar cachês como Pagos
10. RELATÓRIOS      → Gerar PDF do show / holerites / balanço
```

### 6.2 Fluxo de Cashout Mensal

```
FINANCEIRO → navegar ao mês
  ↳ Para cada show: marcar cachês como Pago
  ↳ Para cada membro pago: gerar Recibo (botão 🖨️)
RELATÓRIOS → Módulo Membros → selecionar membro
  ↳ Gerar Holerite mensal (PDF com todos os shows do mês)
RELATÓRIOS → Módulo Financeiro → Balanço Financeiro
  ↳ Gerar PDF do balanço mensal
```

### 6.3 Fluxo de Orçamento → Contrato

```
ORÇAMENTOS → Novo Orçamento → preencher dados → Salvar Rascunho
           → Gerar PDF → enviar ao cliente
           → Cliente aprova → mudar status para "Aprovado"
           → Converter para Evento em CONTRATOS (dados preenchidos automaticamente)
```

---

## 7. Documentos PDF Gerados

| Documento | Acionador | Dados |
|---|---|---|
| Recibo individual | Botão 🖨️ em Financeiro (status=Pago) | Membro, show, valor, CPF |
| Holerite mensal | Relatórios → Membros → membro selecionado | Todos shows do mês, cachês, status |
| Comprovante de pagamento | Relatórios → Membros → show+membro | Entrada de pagamento |
| Balanço financeiro | Relatórios → Financeiro → Exportar | Receitas, cachês, despesas, lucro |
| Relatório de show | Relatórios → Contratos → específico | Checklist, equipe, setlist, equipamentos |
| Relatório de turnê | Relatórios → Contratos → turnê | Range de datas, shows selecionados |
| Orçamento/Proposta | Orçamentos → Gerar PDF | Itens, valor, validade, assinatura |
| Relatório de inteligência | Relatórios → Exportar relatório completo | Gráficos + textos analíticos |

**Layout padrão dos PDFs:**
- Cabeçalho laranja com logo da banda, nome, CNPJ, endereço, contato
- Paleta de cores da marca (brandColorBase, brandColorAccent)
- Área de assinatura fixada no rodapé: favorecido (nome+CPF) | responsável (empresa+CNPJ)
- Rodapé: "Documento gerado por Akro · [data]"

---

## 8. Arquitetura Técnica

### Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite 5 |
| Estilos | Tailwind CSS 3.4 |
| Componentes | Shadcn/UI (Radix UI primitives) |
| Animações | Framer Motion |
| Gráficos | Recharts |
| Mapa | react-simple-maps |
| PDF | jsPDF 4.x + jspdf-autotable 5.x |
| Captura de tela | html2canvas |
| Toasts | Sonner |
| Ícones | Lucide React |
| Backend/Auth/DB | Supabase (PostgreSQL + Auth + RLS) |
| Geocodificação | IBGE API + Nominatim (OpenStreetMap) |

### Estrutura de Banco (Supabase)

```
bands               — bandas cadastradas, com plano
users               — donos de banda (Supabase Auth)
members             — membros por banda
events              — shows/eventos por banda
expenses            — despesas variáveis por evento
transport_entries   — paradas de rota (favoritas e regulares)
contractors         — contratantes (pessoas) por banda
songs               — repertório por banda
setlists            — setlists vinculadas a eventos
equipment           — inventário de equipamentos
show_equipment      — checklist de equipamentos por show
budgets             — orçamentos por banda
rehearsals          — ensaios por banda
collaborators       — colaboradores externos com bcrypt hash
checklist_items     — itens de checklist por show/template
company_profile     — perfil da empresa por banda
```

**Row Level Security (RLS):** todos os dados filtrados por `band_id` no JWT da sessão.

### Autenticação

- **Dono da banda:** Supabase Auth (email + senha)
- **Colaborador:** `supabase.auth.signInAnonymously()` com `{ data: { collab_band_id } }` → JWT inclui `band_id` para RLS
- **Autenticação do colaborador:** `authenticate_collaborator(email, password)` via `SECURITY DEFINER` SQL function com `extensions.crypt()` (pgcrypto)

---

## 9. Requisitos Não-Funcionais

| Categoria | Requisito |
|---|---|
| **Responsividade** | Funcional em mobile (375px+) com sidebar em drawer |
| **Performance** | BrazilMap e html2canvas carregados lazy; chunking por módulo |
| **Offline/Cache** | Dados em React Context; carregamento único via `loadAll()` |
| **Segurança** | RLS no Supabase; senhas bcrypt; sem armazenamento de PIN |
| **Acessibilidade** | Componentes Radix com aria-labels; navegação por teclado |
| **UX** | Skeleton screens em todas as páginas; toasts de feedback; animações de entrada |
| **PDF** | Documentos gerados 100% client-side (sem upload de dados sensíveis) |

---

## 10. Roadmap Prioritário (Backlog Identificado)

| Prioridade | Funcionalidade | Módulo |
|---|---|---|
| P1 | Busca global funcional (eventos, membros) | Topbar |
| P1 | Notificações em tempo real (bell) | Topbar / Supabase Realtime |
| P2 | Exportar relatório de inteligência com filtros aplicados no nome do PDF | Relatórios |
| P2 | Modo escuro | Global |
| P2 | App mobile nativo (React Native / Expo) | — |
| P3 | Integração com Google Calendar | Agenda |
| P3 | Link público de contrato/orçamento para o cliente assinar digitalmente | Orçamentos |
| P3 | Módulo de Marketing (datas patrocinadas, mídia social) | — |
| P3 | API pública para integrações com riders digitais | — |

---

*Documento gerado em maio de 2026. Mantido em `c:\Users\Valter\Documents\Sistema Banda\PRD.md`.*
