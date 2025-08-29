# TikTok API Test Server

🚀 **Servidor de teste para integração com a API do TikTok (Sandbox)**
Este projeto é uma aplicação Node.js/Express que permite testar autenticação OAuth2 com TikTok, listar usuários e vídeos, e salvar informações básicas em um banco de dados SQLite.

---

## ⚙️ Tecnologias Utilizadas

* [Node.js](https://nodejs.org/)
* [Express](https://expressjs.com/)
* [Axios](https://axios-http.com/) — Para requisições HTTP
* [SQLite3](https://www.npmjs.com/package/sqlite3) — Banco de dados leve
* [express-session](https://www.npmjs.com/package/express-session) — Gestão de sessões
* [Crypto](https://nodejs.org/api/crypto.html) — Geração de PKCE e state para segurança

---

## 📝 Funcionalidades

1. **Autenticação OAuth2 com TikTok**

   * Login com PKCE
   * Armazenamento de tokens na sessão e no banco SQLite
   * Proteção contra CSRF usando `state`
2. **Gerenciamento de usuários**

   * Salva informações básicas do usuário (`open_id`, `union_id`, `display_name`, `avatar_url`) no SQLite
   * Exibe lista de usuários sem expor tokens sensíveis
3. **Dashboard interativo**

   * Teste de endpoints
   * Visualização de dados do usuário
   * Ver informações de token
   * Logout seguro
4. **Endpoints de teste**

   * `GET /test/config` — Verifica a configuração da aplicação
   * `GET /health` — Health check do servidor e banco
5. **Sandbox Mode**

   * Scopes limitados (`user.info.basic,video.list`)
   * Apenas campos básicos e vídeos de teste disponíveis

---

## 🗄️ Estrutura do Banco de Dados (SQLite)

* **users**
  | Campo | Tipo | Descrição |
  |-------|------|-----------|
  | id | INTEGER | Primary key |
  | open\_id | TEXT | Identificador único do usuário TikTok |
  | union\_id | TEXT | ID universal (opcional) |
  | display\_name | TEXT | Nome exibido |
  | avatar\_url | TEXT | URL da imagem de perfil |
  | access\_token | TEXT | Token de acesso |
  | refresh\_token | TEXT | Token de refresh |
  | expires\_in | INTEGER | Tempo de expiração do token |
  | created\_at | DATETIME | Data de criação |
  | updated\_at | DATETIME | Data de atualização |

* **videos**
  | Campo | Tipo | Descrição |
  |-------|------|-----------|
  | id | TEXT | Identificador do vídeo |
  | user\_open\_id | TEXT | Relacionado ao usuário |
  | title | TEXT | Título do vídeo |
  | description | TEXT | Descrição do vídeo |
  | cover\_image\_url | TEXT | URL da capa |
  | share\_url | TEXT | Link de compartilhamento |
  | duration | INTEGER | Duração em segundos |
  | width | INTEGER | Largura do vídeo |
  | height | INTEGER | Altura do vídeo |
  | like\_count | INTEGER | Curtidas |
  | comment\_count | INTEGER | Comentários |
  | share\_count | INTEGER | Compartilhamentos |
  | view\_count | INTEGER | Visualizações |
  | create\_time | INTEGER | Timestamp de criação |
  | created\_at | DATETIME | Data de registro no banco |

---

## 🔧 Configuração

1. Clone o projeto:

```bash
git clone https://github.com/seu-usuario/tiktok-api-test.git
cd tiktok-api-test
```

2. Instale dependências:

```bash
npm install
```

3. Configuração de variáveis (opcional):

* `PORT` — Porta do servidor (padrão `3000`)
* `NODE_ENV` — Ambiente (`development` ou `production`)

4. Inicie o servidor:

```bash
node index.js
```

---

## 🌐 Endpoints Disponíveis

| Método | Endpoint           | Descrição                                      |
| ------ | ------------------ | ---------------------------------------------- |
| GET    | `/`                | Página inicial com botões de acesso rápido     |
| GET    | `/auth/login`      | Inicia o processo de autenticação TikTok       |
| GET    | `/auth/callback`   | Callback OAuth2 após login                     |
| GET    | `/dashboard`       | Dashboard interativo para testar endpoints     |
| GET    | `/user/info`       | Obter informações básicas do usuário (sandbox) |
| GET    | `/user/videos`     | Listar vídeos do usuário (sandbox)             |
| GET    | `/db/users`        | Listar usuários cadastrados no SQLite          |
| GET    | `/auth/token-info` | Ver detalhes do token da sessão                |
| GET    | `/auth/logout`     | Encerrar sessão e logout                       |
| GET    | `/test/config`     | Retorna configuração do servidor               |
| GET    | `/health`          | Health check do servidor e banco               |

> 🔒 Nota: Em **sandbox**, apenas campos básicos e vídeos de teste estão disponíveis.

---

## 🔐 Segurança e Fluxo OAuth2

1. Geração de `state` aleatório para proteção CSRF.
2. Geração de `code_verifier` e `code_challenge` para PKCE.
3. Troca do `authorization code` por `access_token`.
4. Armazenamento seguro de tokens na sessão.
5. Tokens sensíveis **não são expostos** ao consultar o banco.

---

## 💻 Testando Endpoints

No dashboard, é possível testar todos os endpoints disponíveis, incluindo:

* Obter informações do usuário
* Listar vídeos
* Ver usuários no banco
* Ver token atual

---

## 🛠️ Debug e Logs

* Logs detalhados são exibidos no console, incluindo:

  * URLs de requisição
  * Tokens parciais
  * Respostas da API
  * Erros detalhados

---

## ⚠️ Observações

* Este projeto utiliza **TikTok Sandbox**, portanto algumas funcionalidades podem estar limitadas.
* Banco SQLite (`tiktok_app.db`) é criado automaticamente.
* A aplicação **não deve ser usada em produção sem ajustes de segurança** (HTTPS obrigatório, secret mais seguro, proteção de sessão etc.).

---

## 📝 Licença

MIT License – livre para uso e modificação.

---

