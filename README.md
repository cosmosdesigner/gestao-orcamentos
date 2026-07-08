# Gestao de Orcamentos

Aplicacao full-stack para gerir pedidos de orcamento a varias empresas e especialidades, com timeline por pedido e caixa de perguntas sobre os dados.

## Stack

- Frontend: Vite, React, TypeScript, TanStack Router, TanStack Query, Tailwind CSS e componentes locais em estilo shadcn/ui.
- Backend: NestJS, TypeScript e SQLite via `better-sqlite3`.
- Persistencia: ficheiro SQLite em `apps/api/data/gestao-orcamentos.sqlite` por defeito.

## Estrutura

```txt
apps/
  api/   NestJS + SQLite
  web/   Vite + React + Tailwind
```

## Instalar

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3333`

O Vite faz proxy de `/api` para a API NestJS.

## Funcionalidades

- Criar especialidades como piscinas, telhados, limpezas ou outras.
- Criar empresas com contacto.
- Criar pedidos de orcamento com estado, empresas, valores, local e data limite.
- Filtrar por especialidade, estado e pesquisa livre.
- Adicionar notas e ficheiros pequenos na timeline de cada pedido.
- Fazer perguntas sobre pedidos, empresas, valores, notas e anexos.

## AI

O endpoint `POST /assistant/ask` ainda usa regras locais para responder sobre os dados em SQLite. A integracao com um LLM real deve ser feita no backend, por exemplo adicionando uma chave em `.env` e trocando a implementacao de `answerQuestion` em `apps/api/src/budget-requests.service.ts`.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
## Exportar e importar BD

Exportar a BD atual para `apps/api/backups/`:

```bash
npm run db:export
```

Exportar para um caminho especifico:

```bash
npm run db:export -- ./backup.sqlite
```

Importar uma BD noutro computador:

```bash
npm run db:import -- ./backup.sqlite
```

Antes de importar, para a API se estiver a correr. O import valida o ficheiro SQLite, substitui a BD ativa e guarda a BD anterior como `gestao-orcamentos.sqlite.before-import-*` quando existir.
