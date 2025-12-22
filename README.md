# FlashMind 🧠

FlashMind é uma aplicação web de Repetição Espaçada (Spaced Repetition) que utiliza o algoritmo SM-2 para otimizar o aprendizado e a memorização. Construído com **React** no frontend e **Node.js/Express + PostgreSQL** no backend.

## 🚀 Tecnologias

- **Frontend**: React, Vite, TailwindCSS, Lucide React.
- **Backend**: Node.js, Express.
- **Banco de Dados**: PostgreSQL.
- **Autenticação**: JWT (JSON Web Tokens).

## ⚙️ Pré-requisitos

- Node.js (v18+)
- PostgreSQL instalado e rodando.

## 🛠️ Instalação e Configuração

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd flashmind
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```
   Isso instalará as dependências tanto do frontend quanto do backend.

3. **Configure as Variáveis de Ambiente**
   Crie um arquivo `.env` na raiz do projeto (baseado no `.env.example`):
   ```env
   DATABASE_URL=postgres://usuario:senha@localhost:5432/flashmind
   JWT_SECRET=sua_chave_secreta_aqui
   PORT=3000
   ```
   *Certifique-se de criar o banco de dados `flashmind` no seu PostgreSQL antes de prosseguir (ou aponte para um banco existente).*

4. **Inicialize o Banco de Dados**
   Execute o script para criar o schema (`flashmind`) e as tabelas necessárias:
   ```bash
   npm run db:init
   ```

## ▶️ Como Rodar

A aplicação requer que o servidor (backend) e o cliente (frontend) rodem simultaneamente.

1. **Inicie o Backend** (Terminal 1)
   ```bash
   npm run server
   ```
   O servidor rodará em `http://localhost:3000`.

2. **Inicie o Frontend** (Terminal 2)
   ```bash
   npm run dev
   ```
   O app estará acessível em `http://localhost:5173`.

## ✨ Funcionalidades

### 📚 Gerenciamento de Decks e Cartões
- Crie baralhos e adicione cartões (Pergunta/Resposta).
- Suporte a mídia (Imagens/Vídeos via URL).
- **Importar/Exportar**: Faça backup ou adicione cartões em lote via texto.
  - Formato de Importação:
    ```text
    Deck: Nome do Baralho
    P: Pergunta
    R: Resposta
    ---
    ```

### 🧠 Sistema de Estudo (SM-2)
- O algoritmo agenda revisões baseadas no seu desempenho (Errei, Difícil, Bom, Fácil).
- Cartões "Novos" -> "Aprendendo" -> "Revisão".

### ⌨️ Atalhos de Teclado
- **Baralho**:
  - `E`: Iniciar Estudo ("Estudar Agora").
  - `ESC`: Fechar modal de "Novo Cartão".
- **Sessão de Estudo**:
  - `Enter`: Revelar resposta.
  - `E`, `D`, `B`, `F`: Avaliar (Errei, Difícil, Bom, Fácil).
  - `ESC` ou `V`: Voltar ao painel.
