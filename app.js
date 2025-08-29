const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do banco SQLite
const db = new sqlite3.Database('./tiktok_app.db');

// Criar tabelas se não existirem
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        open_id TEXT UNIQUE,
        union_id TEXT,
        display_name TEXT,
        avatar_url TEXT,
        access_token TEXT,
        refresh_token TEXT,
        expires_in INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        user_open_id TEXT,
        title TEXT,
        description TEXT,
        cover_image_url TEXT,
        share_url TEXT,
        duration INTEGER,
        width INTEGER,
        height INTEGER,
        like_count INTEGER,
        comment_count INTEGER,
        share_count INTEGER,
        view_count INTEGER,
        create_time INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_open_id) REFERENCES users (open_id)
    )`);
});

// Configurações da API do TikTok
const TIKTOK_CONFIG = {
    CLIENT_KEY: 'sbaw2oubt38k6g1a7y',
    CLIENT_SECRET: 'f0hRBTxI8xLdr8UZ8vlZEZq8IsEASQkd',
    BASE_URL: 'https://cuddly-guide-vp6r979xrwrcwv75-3000.app.github.dev',
    REDIRECT_URI: 'https://cuddly-guide-vp6r979xrwrcwv75-3000.app.github.dev/auth/callback',
    // CORREÇÃO: Apenas scopes disponíveis no sandbox
    SCOPE: 'user.info.basic,video.list'
};

// URLs da API do TikTok
const TIKTOK_API = {
    AUTH_URL: 'https://www.tiktok.com/v2/auth/authorize/',
    TOKEN_URL: 'https://open.tiktokapis.com/v2/oauth/token/',
    USER_INFO: 'https://open.tiktokapis.com/v2/user/info/',
    VIDEO_LIST: 'https://open.tiktokapis.com/v2/video/list/'
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configuração de sessão
app.use(session({
    secret: 'tiktok-test-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Função para gerar state aleatório (CSRF protection)
function generateState() {
    return crypto.randomBytes(16).toString('hex');
}

// Função para gerar code_verifier e code_challenge (PKCE)
function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    return {
        codeVerifier,
        codeChallenge
    };
}

// Função para salvar usuário no banco
function saveUserToDB(userData, tokens) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO users 
            (open_id, union_id, display_name, avatar_url, access_token, refresh_token, expires_in, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        
        stmt.run([
            userData.open_id,
            userData.union_id || null,
            userData.display_name || null,
            userData.avatar_url || null,
            tokens.access_token,
            tokens.refresh_token || null,
            tokens.expires_in || null
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
        
        stmt.finalize();
    });
}

// Página inicial
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>TikTok API Test</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: white;
            }
            .container { 
                background: rgba(255,255,255,0.1); 
                padding: 30px; 
                border-radius: 15px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            }
            h1 { 
                text-align: center; 
                color: #fff;
                margin-bottom: 30px;
            }
            .btn { 
                display: inline-block; 
                background: #fe2c55; 
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 25px; 
                margin: 10px;
                font-weight: bold;
                transition: all 0.3s ease;
            }
            .btn:hover { 
                background: #e91e3c;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            .info { 
                background: rgba(255,255,255,0.2); 
                padding: 20px; 
                border-radius: 10px; 
                margin: 20px 0;
            }
            .status { 
                padding: 10px; 
                border-radius: 5px; 
                margin: 10px 0; 
            }
            .success { 
                background: rgba(76, 175, 80, 0.3); 
                border-left: 4px solid #4CAF50;
            }
            .warning { 
                background: rgba(255, 193, 7, 0.3); 
                border-left: 4px solid #ffc107;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎵 TikTok API Test Application</h1>
            
            <div class="info">
                <h3>📋 Status da Aplicação:</h3>
                <div class="status success">
                    ✅ Servidor rodando na porta ${PORT}
                </div>
                <div class="status success">
                    ✅ Client Key: ${TIKTOK_CONFIG.CLIENT_KEY}
                </div>
                <div class="status success">
                    ✅ SQLite Database conectado
                </div>
                <div class="status warning">
                    ⚠️ Scopes: ${TIKTOK_CONFIG.SCOPE}
                </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="/auth/login" class="btn">🚀 Iniciar Autenticação TikTok</a>
                <a href="/test/config" class="btn">⚙️ Testar Configuração</a>
                <a href="/dashboard" class="btn">📊 Dashboard</a>
                <a href="/db/users" class="btn">👥 Ver Usuários do DB</a>
            </div>

            <div class="info">
                <h3>📚 Endpoints Disponíveis:</h3>
                <ul>
                    <li><strong>GET /</strong> - Esta página inicial</li>
                    <li><strong>GET /auth/login</strong> - Inicia o processo de autenticação</li>
                    <li><strong>GET /auth/callback</strong> - Callback da autenticação</li>
                    <li><strong>GET /user/info</strong> - Informações do usuário autenticado</li>
                    <li><strong>GET /user/videos</strong> - Lista de vídeos do usuário</li>
                    <li><strong>GET /db/users</strong> - Usuários salvos no banco</li>
                    <li><strong>GET /dashboard</strong> - Painel de controle</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

// Iniciar processo de autenticação
app.get('/auth/login', (req, res) => {
    try {
        const state = generateState();
        const pkce = generatePKCE();
        
        // Salvar na sessão
        req.session.state = state;
        req.session.codeVerifier = pkce.codeVerifier;
        
        // Construir URL de autorização
        const authURL = new URL(TIKTOK_API.AUTH_URL);
        authURL.searchParams.append('client_key', TIKTOK_CONFIG.CLIENT_KEY);
        authURL.searchParams.append('scope', TIKTOK_CONFIG.SCOPE);
        authURL.searchParams.append('response_type', 'code');
        authURL.searchParams.append('redirect_uri', TIKTOK_CONFIG.REDIRECT_URI);
        authURL.searchParams.append('state', state);
        authURL.searchParams.append('code_challenge', pkce.codeChallenge);
        authURL.searchParams.append('code_challenge_method', 'S256');
        
        console.log('🔐 Redirecionando para autenticação TikTok:', authURL.toString());
        res.redirect(authURL.toString());
        
    } catch (error) {
        console.error('❌ Erro ao iniciar autenticação:', error);
        res.status(500).json({ 
            error: 'Erro ao iniciar autenticação', 
            details: error.message 
        });
    }
});

// Callback da autenticação
app.get('/auth/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;
        
        if (error) {
            console.error('❌ Erro na autenticação:', error);
            return res.status(400).json({ error: 'Erro na autenticação', details: error });
        }
        
        if (!code) {
            return res.status(400).json({ error: 'Código de autorização não encontrado' });
        }
        
        // Verificar state (CSRF protection)
        if (state !== req.session.state) {
            return res.status(400).json({ error: 'State inválido - possível ataque CSRF' });
        }
        
        // Trocar código por token
        const tokenResponse = await axios.post(TIKTOK_API.TOKEN_URL, {
            client_key: TIKTOK_CONFIG.CLIENT_KEY,
            client_secret: TIKTOK_CONFIG.CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: TIKTOK_CONFIG.REDIRECT_URI,
            code_verifier: req.session.codeVerifier
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (tokenResponse.data.error) {
            console.error('❌ Erro ao obter token:', tokenResponse.data);
            return res.status(400).json({ 
                error: 'Erro ao obter token', 
                details: tokenResponse.data 
            });
        }
        
        // Salvar token na sessão
        req.session.accessToken = tokenResponse.data.access_token;
        req.session.refreshToken = tokenResponse.data.refresh_token;
        req.session.expiresIn = tokenResponse.data.expires_in;
        req.session.tokenType = tokenResponse.data.token_type;
        
        console.log('✅ Token obtido com sucesso!');
        
        // Tentar obter informações básicas do usuário e salvar no banco
        try {
            const userInfoResponse = await axios.get(TIKTOK_API.USER_INFO + '?fields=open_id,union_id,avatar_url,display_name', {
                headers: {
                    'Authorization': `Bearer ${tokenResponse.data.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (userInfoResponse.data.data) {
                await saveUserToDB(userInfoResponse.data.data, tokenResponse.data);
                console.log('✅ Usuário salvo no banco de dados');
            }
        } catch (userError) {
            console.log('⚠️ Não foi possível salvar usuário no banco:', userError.message);
        }
        
        // Redirecionar para dashboard
        res.redirect('/dashboard?success=true');
        
    } catch (error) {
        console.error('❌ Erro no callback:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Erro no callback', 
            details: error.response?.data || error.message 
        });
    }
});

// Dashboard
app.get('/dashboard', (req, res) => {
    const isAuthenticated = !!req.session.accessToken;
    const success = req.query.success === 'true';
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>TikTok API Dashboard</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 1000px; 
                margin: 0 auto; 
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: white;
            }
            .container { 
                background: rgba(255,255,255,0.1); 
                padding: 30px; 
                border-radius: 15px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            }
            .btn { 
                display: inline-block; 
                background: #fe2c55; 
                color: white; 
                padding: 10px 20px; 
                text-decoration: none; 
                border-radius: 20px; 
                margin: 10px;
                border: none;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s ease;
            }
            .btn:hover { 
                background: #e91e3c;
                transform: translateY(-1px);
            }
            .btn.secondary { 
                background: #25d366; 
            }
            .btn.secondary:hover { 
                background: #1da851; 
            }
            .status { 
                padding: 15px; 
                border-radius: 10px; 
                margin: 15px 0; 
            }
            .success { 
                background: rgba(76, 175, 80, 0.3); 
                border-left: 4px solid #4CAF50;
            }
            .error { 
                background: rgba(244, 67, 54, 0.3); 
                border-left: 4px solid #f44336;
            }
            .grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                gap: 20px; 
                margin: 20px 0; 
            }
            .card { 
                background: rgba(255,255,255,0.1); 
                padding: 20px; 
                border-radius: 10px; 
            }
            #result { 
                background: rgba(0,0,0,0.3); 
                padding: 15px; 
                border-radius: 10px; 
                white-space: pre-wrap; 
                font-family: monospace; 
                max-height: 400px; 
                overflow-y: auto; 
            }
        </style>
        <script>
            async function makeRequest(endpoint) {
                const resultDiv = document.getElementById('result');
                resultDiv.textContent = 'Carregando...';
                
                try {
                    const response = await fetch(endpoint);
                    const data = await response.json();
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                } catch (error) {
                    resultDiv.textContent = 'Erro: ' + error.message;
                }
            }
        </script>
    </head>
    <body>
        <div class="container">
            <h1>📊 TikTok API Dashboard</h1>
            
            ${success ? '<div class="status success">✅ Autenticação realizada com sucesso!</div>' : ''}
            
            <div class="status ${isAuthenticated ? 'success' : 'error'}">
                ${isAuthenticated ? '✅ Usuário autenticado' : '❌ Usuário não autenticado'}
            </div>
            
            ${isAuthenticated ? `
                <div class="grid">
                    <div class="card">
                        <h3>👤 Informações do Usuário</h3>
                        <button class="btn" onclick="makeRequest('/user/info')">
                            Obter Informações
                        </button>
                    </div>
                    
                    <div class="card">
                        <h3>🎬 Vídeos do Usuário</h3>
                        <button class="btn" onclick="makeRequest('/user/videos')">
                            Listar Vídeos
                        </button>
                    </div>
                    
                    <div class="card">
                        <h3>💾 Banco de Dados</h3>
                        <button class="btn secondary" onclick="makeRequest('/db/users')">
                            Ver Usuários
                        </button>
                    </div>
                    
                    <div class="card">
                        <h3>🔑 Token Info</h3>
                        <button class="btn secondary" onclick="makeRequest('/auth/token-info')">
                            Ver Token
                        </button>
                    </div>
                    
                    <div class="card">
                        <h3>🚪 Sair</h3>
                        <a href="/auth/logout" class="btn" style="background: #f44336;">
                            Logout
                        </a>
                    </div>
                </div>
            ` : `
                <div style="text-align: center; margin: 30px 0;">
                    <a href="/auth/login" class="btn">🔐 Fazer Login no TikTok</a>
                </div>
            `}
            
            <div style="margin-top: 30px;">
                <h3>📋 Resultado:</h3>
                <div id="result">Selecione uma ação acima para ver os resultados aqui...</div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="/" class="btn secondary">🏠 Voltar ao Início</a>
            </div>
        </div>
    </body>
    </html>
    `;
    
    res.send(html);
});

// CORREÇÃO: Informações do usuário (apenas campos disponíveis no sandbox)
app.get('/user/info', async (req, res) => {
    try {
        if (!req.session.accessToken) {
            return res.status(401).json({ error: 'Token de acesso não encontrado' });
        }
        
        // Apenas campos básicos disponíveis no sandbox
        const fields = ['open_id', 'union_id', 'avatar_url', 'display_name'];
        
        const url = new URL(TIKTOK_API.USER_INFO);
        url.searchParams.append('fields', fields.join(','));
        
        console.log('🔍 Fazendo requisição para:', url.toString());
        console.log('🔑 Token sendo usado:', req.session.accessToken.substring(0, 20) + '...');
        
        const response = await axios.get(url.toString(), {
            headers: {
                'Authorization': `Bearer ${req.session.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Informações do usuário obtidas:', response.data);
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ Erro ao obter informações do usuário:', error.response?.data || error.message);
        
        // Log detalhado do erro para debug
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
            console.error('Data:', error.response.data);
        }
        
        res.status(500).json({ 
            error: 'Erro ao obter informações do usuário', 
            details: error.response?.data || error.message,
            status: error.response?.status,
            endpoint: TIKTOK_API.USER_INFO
        });
    }
});

// Não disponivel no modo sandbox
app.get('/user/videos', async (req, res) => {
    try {
        if (!req.session.accessToken) {
            return res.status(401).json({ error: 'Token de acesso não encontrado' });
        }
        
        const fields = ['id', 'create_time', 'cover_image_url', 'share_url', 'video_description', 'duration', 'height', 'width', 'title'];
        
        const url = new URL(TIKTOK_API.VIDEO_LIST);
        url.searchParams.append('fields', fields.join(','));
        url.searchParams.append('max_count', '20');
        
        console.log('🔍 Fazendo requisição para vídeos:', url.toString());
        console.log('🔑 Token sendo usado:', req.session.accessToken.substring(0, 20) + '...');
        
        const response = await axios.get(url.toString(), {
            headers: {
                'Authorization': `Bearer ${req.session.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Lista de vídeos obtida:', response.data);
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ Erro ao obter vídeos:', error.response?.data || error.message);
        
        // Log detalhado do erro para debug
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
            console.error('Data:', error.response.data);
        }
        
        res.status(500).json({ 
            error: 'Erro ao obter vídeos', 
            details: error.response?.data || error.message,
            status: error.response?.status,
            endpoint: TIKTOK_API.VIDEO_LIST
        });
    }
});

// Ver usuários do banco de dados
app.get('/db/users', (req, res) => {
    db.all("SELECT * FROM users ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao consultar banco:', err);
            res.status(500).json({ error: 'Erro ao consultar banco', details: err.message });
            return;
        }
        
        // Remover tokens sensíveis da resposta
        const safeRows = rows.map(row => ({
            id: row.id,
            open_id: row.open_id,
            union_id: row.union_id,
            display_name: row.display_name,
            avatar_url: row.avatar_url,
            created_at: row.created_at,
            updated_at: row.updated_at,
            has_access_token: !!row.access_token,
            has_refresh_token: !!row.refresh_token
        }));
        
        res.json({
            message: 'Usuários do banco de dados',
            count: safeRows.length,
            users: safeRows
        });
    });
});

// Informações do token
app.get('/auth/token-info', (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({ error: 'Token não encontrado' });
    }
    
    res.json({
        hasToken: true,
        tokenType: req.session.tokenType || 'Bearer',
        expiresIn: req.session.expiresIn,
        hasRefreshToken: !!req.session.refreshToken,
        tokenPreview: req.session.accessToken.substring(0, 10) + '...',
        scopes: TIKTOK_CONFIG.SCOPE
    });
});

// Logout
app.get('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Erro ao fazer logout:', err);
            return res.status(500).json({ error: 'Erro ao fazer logout' });
        }
        res.redirect('/?logout=success');
    });
});

// Testar configuração
app.get('/test/config', (req, res) => {
    const config = {
        clientKey: TIKTOK_CONFIG.CLIENT_KEY,
        hasClientSecret: !!TIKTOK_CONFIG.CLIENT_SECRET,
        redirectUri: TIKTOK_CONFIG.REDIRECT_URI,
        scope: TIKTOK_CONFIG.SCOPE,
        baseUrl: TIKTOK_CONFIG.BASE_URL,
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        timestamp: new Date().toISOString()
    };
    
    res.json({
        status: 'OK',
        message: 'Configuração carregada com sucesso',
        config: config
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: 'SQLite conectado'
    });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    console.error('❌ Erro não capturado:', error);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint não encontrado',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 =====================================');
    console.log('🎵 TikTok API Test Server Iniciado!');
    console.log('🚀 =====================================');
    console.log(`📡 Servidor rodando em: ${TIKTOK_CONFIG.BASE_URL}`);
    console.log(`🔧 Porta: ${PORT}`);
    console.log(`🔑 Client Key: ${TIKTOK_CONFIG.CLIENT_KEY}`);
    console.log(`🔄 Redirect URI: ${TIKTOK_CONFIG.REDIRECT_URI}`);
    console.log(`📋 Scopes SANDBOX: ${TIKTOK_CONFIG.SCOPE}`);
    console.log(`💾 Database: SQLite (tiktok_app.db)`);
    console.log('🚀 =====================================');
    console.log('📚 Endpoints disponíveis:');
    console.log('   GET  / - Página inicial');
    console.log('   GET  /auth/login - Iniciar autenticação');
    console.log('   GET  /auth/callback - Callback OAuth');
    console.log('   GET  /dashboard - Dashboard principal');
    console.log('   GET  /user/info - Informações do usuário (sandbox)');
    console.log('   GET  /user/videos - Lista de vídeos (sandbox)');
    console.log('   GET  /db/users - Usuários salvos no SQLite');
    console.log('   GET  /test/config - Testar configuração');
    console.log('   GET  /health - Health check');
    console.log('🚀 =====================================');
    console.log('⚠️  SANDBOX MODE - Scopes limitados');
    console.log('✅ Pronto para testar a API do TikTok!');
});

module.exports = app;