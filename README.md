<div align="center">

```
 █████╗ ███████╗██╗██╗     ██╗ █████╗ ██████╗  ██████╗ ███████╗ █████╗ ██████╗
██╔══██╗██╔════╝██║██║     ██║██╔══██╗██╔══██╗██╔═══██╗╚══███╔╝██╔══██╗██╔══██╗
███████║█████╗  ██║██║     ██║███████║██║  ██║██║   ██║  ███╔╝ ███████║██████╔╝
██╔══██║██╔══╝  ██║██║     ██║██╔══██║██║  ██║██║   ██║ ███╔╝  ██╔══██║██╔═══╝
██║  ██║██║     ██║███████╗██║██║  ██║██████╔╝╚██████╔╝███████╗██║  ██║██║
╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝
```

**Automação de ofertas de afiliados para grupos de WhatsApp**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![OpenAI](https://img.shields.io/badge/GPT--4o--mini-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)
[![Evolution API](https://img.shields.io/badge/Evolution_API-WhatsApp-25D366?style=flat-square&logo=whatsapp&logoColor=white)](https://evolution-api.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## O que é isso?

**AfiliadoZap** é um sistema de automação que envia ofertas de afiliados (Shopee, Amazon, Mercado Livre, Magalu e outros) em grupos de WhatsApp de forma inteligente — com geração automática de copy via IA e agendamento de disparos com proteção anti-ban.

> Você cadastra a oferta na planilha. O sistema faz o resto.

---

## Funcionalidades do MVP

| Feature | Status |
|---|---|
| Cadastro de ofertas via Google Sheets | ✅ MVP |
| Geração de copy com GPT-4o-mini | ✅ MVP |
| Agendamento de horários de envio | ✅ MVP |
| Disparo via Evolution API (WhatsApp) | ✅ MVP |
| Cadastro de grupos por JID | ✅ MVP |
| Proteção anti-ban (delays randomizados) | ✅ MVP |
| Faixas de horário configuráveis | ✅ MVP |
| API REST para controle | ✅ MVP |
| Painel web visual (React) | 🔜 Futuro |
| Scraping automático de ofertas | 🔜 Futuro |
| Métricas de cliques / conversão | 🔜 Futuro |
| Multi-instância WhatsApp | 🔜 Futuro |

---

## Arquitetura

```
┌─────────────────┐     ┌──────────────────────────────────────┐     ┌──────────────────┐
│  Google Sheets  │────▶│           Node.js + Express          │────▶│  Evolution API   │
│ (links/ofertas) │     │           (orquestrador)             │     │   (WhatsApp)     │
└─────────────────┘     └──────────────────┬───────────────────┘     └──────────────────┘
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                       ┌──────────┐ ┌──────────┐ ┌──────────┐
                       │ OpenAI   │ │  SQLite  │ │node-cron │
                       │ GPT copy │ │  (dados) │ │(schedule)│
                       └──────────┘ └──────────┘ └──────────┘
```

---

## Stack Técnica

- **Runtime:** Node.js 18+
- **Banco de dados:** SQLite via `better-sqlite3`
- **Planilha:** Google Sheets API v4 (cadastro de ofertas)
- **IA:** OpenAI GPT-4o-mini (geração de copy)
- **WhatsApp:** Evolution API
- **Scheduler:** node-cron
- **HTTP:** Express.js
- **Logs:** Winston

---

## Estrutura do Projeto

```
afiliadozap/
├── src/
│   ├── index.js              # Entry point + Express server
│   ├── config.js             # Variáveis de ambiente
│   ├── db/
│   │   ├── database.js       # Conexão SQLite
│   │   └── migrations.js     # Criação de tabelas
│   ├── services/
│   │   ├── sheets.js         # Google Sheets API
│   │   ├── openai.js         # Geração de copy
│   │   ├── evolution.js      # Envio WhatsApp
│   │   └── scheduler.js      # node-cron + lógica de disparo
│   ├── routes/
│   │   ├── ofertas.js
│   │   ├── grupos.js
│   │   ├── agendamentos.js
│   │   └── disparos.js
│   ├── mocks/
│   │   └── evolution-server.js  # Mock local da Evolution API
│   └── utils/
│       ├── delay.js          # Random delay anti-ban
│       └── logger.js         # Winston logger
├── data/
│   └── afiliados.db          # SQLite (gerado automaticamente)
├── .env.example
├── package.json
└── README.md
```

---

## Instalação

### Pré-requisitos

- Node.js 18+
- Conta Google Cloud com Sheets API habilitada
- Chave OpenAI
- Evolution API rodando (ou use o mock local para desenvolvimento)

### Setup

```bash
# Clone o repositório
git clone https://github.com/tallesnicacio/afiliadozap.git
cd afiliadozap

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Inicie em modo desenvolvimento (com mock da Evolution API)
npm run dev

# Ou em produção
npm start
```

---

## Variáveis de Ambiente

```env
# Servidor
PORT=3500
NODE_ENV=development

# Google Sheets
GOOGLE_SHEETS_ID=sua_planilha_id
GOOGLE_SERVICE_ACCOUNT_KEY=./credentials.json

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Evolution API
EVOLUTION_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_api_key
EVOLUTION_INSTANCE=sua_instancia

# Anti-ban
MIN_DELAY_MS=30000
MAX_DELAY_MS=60000
MAX_MSGS_PER_HOUR=20
```

---

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/ofertas` | Lista ofertas do cache |
| `POST` | `/api/ofertas/sync` | Sincroniza planilha → cache |
| `GET` | `/api/grupos` | Lista grupos cadastrados |
| `POST` | `/api/grupos` | Cadastra novo grupo (JID) |
| `POST` | `/api/copy/gerar` | Gera copy para uma oferta |
| `POST` | `/api/copy/preview` | Preview antes de enviar |
| `GET` | `/api/agendamentos` | Lista agendamentos |
| `POST` | `/api/agendamentos` | Cria agendamento |
| `DELETE` | `/api/agendamentos/:id` | Remove agendamento |
| `POST` | `/api/disparar` | Disparo manual imediato |
| `GET` | `/api/logs` | Histórico de envios |

---

## Proteção Anti-Ban

| Regra | Valor |
|-------|-------|
| Intervalo entre mensagens | 30–60s (randomizado) |
| Máximo de mensagens/hora | 20 por grupo |
| Delay entre grupos | 2–5 minutos |
| Faixas de horário | 08h–12h / 14h–18h / 19h–22h |
| Variação de copy | 2–3 versões por oferta |
| Domingos | Volume reduzido 50% |

---

## Modelo de Copy (GPT)

Exemplo de saída para uma oferta de eletrônico:

```
🔥 Achado do dia!

Fone Bluetooth TWS por apenas R$ 39,90!
Era R$ 89,90 — desconto de 56% 😱

🎟️ Cupom: SHOPEE10

Corre que acaba rápido 👇
https://s.shopee.com.br/xxxx
```

---

## Roadmap

- [x] MVP — core do sistema
- [ ] Painel web React para gerenciamento
- [ ] Scraping automático de ofertas
- [ ] Encurtador de links com tracking de cliques
- [ ] Multi-instância WhatsApp
- [ ] Rotação inteligente baseada em engajamento
- [ ] Webhook de notificação de vendas

---

## Licença

MIT © [tallesnicacio](https://github.com/tallesnicacio)
