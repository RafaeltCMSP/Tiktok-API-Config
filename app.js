const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações da API do TikTok
const TIKTOK_CONFIG = {
    CLIENT_KEY: 'sbaw2oubt38k6g1a7y',
    CLIENT_SECRET: 'f0hRBTxI8xLdr8UZ8vlZEZq8IsEASQkd',
    BASE_URL: 'https://cuddly-guide-vp6r979xrwrcwv75-3000.app.github.dev',
    REDIRECT_URI: 'https://cuddly-guide-vp6r979xrwrcwv75-3000.app.github.dev/auth/callback',
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
    cookie: { secure: false } // Para desenvolvimento local
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
            .error { 
                background: rgba(244, 67, 54, 0.3); 
                border-left: 4px solid #f44336;
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
                    ✅ Client Key configurado: ${TIKTOK_CONFIG.CLIENT_KEY}
                </div>
                <div class="status success">
                    ✅ Redirect URI: ${TIKTOK_CONFIG.REDIRECT_URI}
                </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="/auth/login" class="btn">🚀 Iniciar Autenticação TikTok</a>
                <a href="/test/config" class="btn">⚙️ Testar Configuração</a>
                <a href="/dashboard" class="btn">📊 Dashboard</a>
            </div>

            <div class="info">
                <h3>📚 Endpoints Disponíveis:</h3>
                <ul>
                    <li><strong>GET /</strong> - Esta página inicial</li>
                    <li><strong>GET /auth/login</strong> - Inicia o processo de autenticação</li>
                    <li><strong>GET /auth/callback</strong> - Callback da autenticação</li>
                    <li><strong>GET /user/info</strong> - Informações do usuário autenticado</li>
                    <li><strong>GET /user/videos</strong> - Lista de vídeos do usuário</li>
                    <li><strong>GET /test/config</strong> - Testa a configuração</li>
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
            .info { 
                background: rgba(33, 150, 243, 0.3); 
                border-left: 4px solid #2196F3;
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
                        <h3>🔑 Token Info</h3>
                        <button class="btn secondary" onclick="makeRequest('/auth/token-info')">
                            Ver Token
                        </button>
                    </div>
                    
                    <div class="card">
                        <h3>🚪 Sair</h3>
                        <a href="/auth/logout" class="btn" style="background: #f44336;">
                            Fazer Logout
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

// Informações do usuário
app.get('/user/info', async (req, res) => {
    try {
        if (!req.session.accessToken) {
            return res.status(401).json({ error: 'Token de acesso não encontrado' });
        }
        
        const response = await axios.post(TIKTOK_API.USER_INFO, {
            fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'bio_description', 'profile_deep_link', 'is_verified', 'follower_count', 'following_count', 'likes_count', 'video_count']
        }, {
            headers: {
                'Authorization': `Bearer ${req.session.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Informações do usuário obtidas:', response.data);
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ Erro ao obter informações do usuário:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Erro ao obter informações do usuário', 
            details: error.response?.data || error.message 
        });
    }
});

// Vídeos do usuário
app.get('/user/videos', async (req, res) => {
    try {
        if (!req.session.accessToken) {
            return res.status(401).json({ error: 'Token de acesso não encontrado' });
        }
        
        const response = await axios.post(TIKTOK_API.VIDEO_LIST, {
            max_count: 20,
            fields: ['id', 'create_time', 'cover_image_url', 'share_url', 'video_description', 'duration', 'height', 'width', 'title', 'embed_html', 'embed_link', 'like_count', 'comment_count', 'share_count', 'view_count']
        }, {
            headers: {
                'Authorization': `Bearer ${req.session.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Lista de vídeos obtida:', response.data);
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ Erro ao obter vídeos:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Erro ao obter vídeos', 
            details: error.response?.data || error.message 
        });
    }
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
        tokenPreview: req.session.accessToken.substring(0, 10) + '...'
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
        environment: process.env.NODE_ENV || 'development'
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
    console.log(`📋 Scope: ${TIKTOK_CONFIG.SCOPE}`);
    console.log('🚀 =====================================');
    console.log('📚 Endpoints disponíveis:');
    console.log('   GET  / - Página inicial');
    console.log('   GET  /auth/login - Iniciar autenticação');
    console.log('   GET  /auth/callback - Callback OAuth');
    console.log('   GET  /dashboard - Dashboard principal');
    console.log('   GET  /user/info - Informações do usuário');
    console.log('   GET  /user/videos - Lista de vídeos');
    console.log('   GET  /test/config - Testar configuração');
    console.log('   GET  /health - Health check');
    console.log('🚀 =====================================');
    console.log('✅ Pronto para testar a API do TikTok!');
});

module.exports = app;