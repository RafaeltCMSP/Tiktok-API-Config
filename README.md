# 🎵 TikTok API Test Application

Aplicação de exemplo em **Node.js + Express** para integrar com a **TikTok Open API (OAuth 2.0 + PKCE)**.
O projeto implementa login com TikTok, recuperação de informações do usuário autenticado e listagem de vídeos, com interface web estilizada para testes.

---

## 🚀 Funcionalidades

* 🔐 **Autenticação OAuth 2.0 com PKCE** (segurança contra CSRF e interceptação de tokens)
* 👤 Obter informações do usuário autenticado (`/user/info`)
* 🎬 Listar vídeos do usuário (`/user/videos`)
* 📊 **Dashboard web interativo** para testar chamadas de API
* ⚙️ Endpoint para validar configuração (`/test/config`)
* 🏥 Health check (`/health`)
* 🚪 Logout com destruição de sessão

---

## 🛠️ Tecnologias utilizadas

* [Node.js](https://nodejs.org/)
* [Express](https://expressjs.com/)
* [Axios](https://axios-http.com/)
* [express-session](https://www.npmjs.com/package/express-session)
* [crypto](https://nodejs.org/api/crypto.html)

---

## 📦 Instalação

1. **Clone o repositório**

```bash
git clone https://github.com/seu-usuario/tiktok-api-test.git
cd tiktok-api-test
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure suas credenciais** no arquivo `app.js`:

```js
const TIKTOK_CONFIG = {
    CLIENT_KEY: 'SUA_CLIENT_KEY',
    CLIENT_SECRET: 'SUA_CLIENT_SECRET',
    BASE_URL: 'http://localhost:3000',
    REDIRECT_URI: 'http://localhost:3000/auth/callback',
    SCOPE: 'user.info.basic,video.list'
};
```

⚠️ Certifique-se de registrar o **Redirect URI** no [TikTok Developer Portal](https://developers.tiktokglobalplatform.com/).

4. **Inicie o servidor**

```bash
npm start
```

5. Acesse no navegador:
   👉 [http://localhost:3000](http://localhost:3000)

---

## 🔑 Fluxo de autenticação (OAuth 2.0 + PKCE)

1. Usuário clica em **“Iniciar Autenticação TikTok”**
2. É redirecionado para a página de login do TikTok
3. Após login, TikTok redireciona para `/auth/callback` com um `code`
4. O backend troca esse `code` por um **Access Token**
5. Tokens são salvos em sessão e podem ser usados para chamar a API

---

## 📚 Endpoints disponíveis

### 🌐 Rotas principais

| Método | Rota             | Descrição                      |
| ------ | ---------------- | ------------------------------ |
| GET    | `/`              | Página inicial                 |
| GET    | `/auth/login`    | Inicia autenticação com TikTok |
| GET    | `/auth/callback` | Callback da autenticação       |
| GET    | `/dashboard`     | Dashboard interativo           |

### 👤 Usuário

| Método | Rota           | Descrição                            |
| ------ | -------------- | ------------------------------------ |
| GET    | `/user/info`   | Retorna dados do usuário autenticado |
| GET    | `/user/videos` | Lista vídeos do usuário              |

### ⚙️ Utilitários

| Método | Rota               | Descrição                          |
| ------ | ------------------ | ---------------------------------- |
| GET    | `/auth/token-info` | Retorna informações do token atual |
| GET    | `/auth/logout`     | Faz logout e destrói a sessão      |
| GET    | `/test/config`     | Exibe configuração atual           |
| GET    | `/health`          | Health check                       |

---

## 📊 Dashboard

A aplicação inclui um **painel web** para testar endpoints:

* 👤 Obter informações do usuário
* 🎬 Listar vídeos
* 🔑 Ver token ativo
* 🚪 Logout

---

## 🧪 Exemplo de resposta: `/user/info`

```json
{
  "data": {
    "user": {
      "open_id": "1234567890",
      "display_name": "Usuário Teste",
      "avatar_url": "https://p16-sign.tiktokcdn-us.com/avatar.jpg",
      "is_verified": false,
      "follower_count": 120,
      "following_count": 80,
      "likes_count": 340,
      "video_count": 12
    }
  }
}
```

---

## 🐞 Troubleshooting

1. **Erro "Something went wrong" ao logar**

   * Verifique se o usuário está adicionado em **Sandbox > Target Users**
   * O convite precisa ser **aceito no app TikTok** (Inbox → Notificações → Convite de Developer)
   * Confirme se o **Redirect URI** está cadastrado corretamente no Developer Portal

2. **Erro 401 (Token inválido)**

   * Sessão expirada → faça logout (`/auth/logout`) e login novamente

3. **PKCE error**

   * Certifique-se que `code_verifier` está sendo enviado no `/auth/callback`

---

## 📄 Licença

Este projeto é open-source sob a licença **MIT**.

---

