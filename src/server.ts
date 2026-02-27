import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import prisma from './prisma';
import { ScanResolverService } from './services/ScanResolverService';
import { startDropExpiryScheduler } from './services/dropExpiryService';
import { derivePublicDropTokenForTag } from './services/dropSecurity';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());
app.use('/public', express.static('public'));

// Request Logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
        if (req.url.includes('/public/')) {
            console.log(`🔍 SCAN ATTEMPT: ${req.url.split('/public/')[1]}`);
        }
    });
    next();
});

// Database Connection Check
prisma.$connect()
    .then(() => console.log('✅ Connected to PostgreSQL via Prisma'))
    .catch((err: any) => console.error('❌ Prisma connection error:', err));

// Routes
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import messageRoutes from './routes/messageRoutes';
import scanRoutes from './routes/scanRoutes';
import shopRoutes from './routes/shopRoutes';
import tagRoutes from './routes/tagRoutes';

app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        console.log(`📡 [API Request] ${req.method} ${req.url}`);
    }
    next();
});

app.use('/', messageRoutes);
app.use('/api', messageRoutes);
app.use('/api', scanRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/admin', adminRoutes);

const getTheme = (domain: string) => {
    switch (domain) {
        case 'CAR': return {
            bg: '#000000',
            card: '#0A0A0A',
            border: '#222222',
            iconBg: '#111111',
            iconBorder: '#FACC1533',
            text: '#FFFFFF',
            textMuted: '#A1A1AA',
            textDim: '#52525B',
            activeBg: '#18181B',
            activeBorder: '#FACC1544',
            activeColor: '#FACC15',
            btnPrimary: '#FACC15',
            btnPrimaryText: '#000000',
            btnSecondary: '#18181B',
            btnSecondaryBorder: '#27272A',
            icon: 'car-sport'
        };
        case 'KID': return {
            bg: '#F0F9FF',
            card: '#FFFFFF',
            border: '#DBEAFE',
            iconBg: '#DBEAFE',
            iconBorder: '#BFDBFE',
            text: '#1E3A8A',
            textMuted: '#475569',
            textDim: '#64748B',
            activeBg: '#DBEAFE',
            activeBorder: '#93C5FD',
            activeColor: '#2563EB',
            btnPrimary: '#3B82F6',
            btnPrimaryText: '#FFFFFF',
            btnSecondary: '#F8FAFC',
            btnSecondaryBorder: '#E2E8F0',
            icon: 'happy-outline'
        };
        case 'PET': return {
            bg: '#FFF7ED',
            card: '#FFFFFF',
            border: '#FFEDD5',
            iconBg: '#FFEDD5',
            iconBorder: '#FED7AA',
            text: '#7C2D12',
            textMuted: '#475569',
            textDim: '#64748B',
            activeBg: '#FFEDD5',
            activeBorder: '#FDBA74',
            activeColor: '#EA580C',
            btnPrimary: '#F97316',
            btnPrimaryText: '#FFFFFF',
            btnSecondary: '#FAFAF9',
            btnSecondaryBorder: '#E7E5E4',
            icon: 'paw-outline'
        };
        default: return {
            bg: '#050505',
            card: '#0a0a0a',
            border: '#1e1e1e',
            iconBg: '#111',
            iconBorder: '#222',
            text: '#fff',
            textMuted: '#888',
            textDim: '#555',
            activeBg: '#0f1a0f',
            activeBorder: '#1a3a1a',
            activeColor: '#4ade80',
            btnPrimary: '#fff',
            btnPrimaryText: '#000',
            btnSecondary: '#111',
            btnSecondaryBorder: '#222',
            icon: 'scan'
        };
    }
};

// Scan redirect route for external QR scanners
app.get('/scan/:tagId', async (req, res) => {
    const { tagId } = req.params;
    try {
        const resolution = await ScanResolverService.resolveTagWithOwner(tagId);
        const { result, owner } = resolution;
        const { metadata, payload } = result;

        const resolvedDomain = (metadata.domainType || 'CAR') as string;
        const theme = getTheme(resolvedDomain);
        const displayName = payload?.displayName || payload?.petName || payload?.nickname || 'Connect360 Tag';
        const subtitle = payload?.registrationMasked || payload?.medicalAlerts || payload?.breedInfo || 'Verified Profile';
        const ownerPhone = owner?.phoneNumber || '';
        const callLabel = resolvedDomain === 'KID' ? 'Call Guardian' : 'Call Owner';
        const publicDropToken = derivePublicDropTokenForTag(tagId);

        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${displayName} - Connect360</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        @keyframes pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 0 0 ${theme.activeColor}66; }
            50% { opacity: 0.7; box-shadow: 0 0 0 4px ${theme.activeColor}00; }
        }
        body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: ${theme.bg};
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { max-width: 420px; width: 100%; }
        .card {
            background: ${theme.card};
            border: 1px solid ${theme.border};
            border-radius: 24px;
            padding: 32px;
            text-align: center;
        }
        .icon-wrap {
            width: 72px;
            height: 72px;
            background: ${theme.iconBg};
            border: 1px solid ${theme.iconBorder};
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: ${theme.activeBg};
            border: 1px solid ${theme.activeBorder};
            border-radius: 8px;
            padding: 6px 12px;
            margin-bottom: 16px;
        }
        .badge-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${theme.activeColor};
            animation: pulse 2s infinite;
        }
        .badge-text {
            color: ${theme.activeColor};
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }
        h1 {
            color: ${theme.text};
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
            margin-bottom: 8px;
        }
        .plate {
            color: ${theme.textMuted};
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.1em;
            margin-bottom: 4px;
        }
        .vehicle {
            color: ${theme.textDim};
            font-size: 14px;
            margin-bottom: 24px;
        }
        .divider {
            height: 1px;
            background: ${theme.border};
            margin: 24px 0;
        }
        .actions { display: flex; flex-direction: column; gap: 12px; }
        .btn-primary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 16px 24px;
            border-radius: 16px;
            background: ${theme.btnPrimary};
            color: ${theme.btnPrimaryText};
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(255,255,255,0.12); }
        .btn-primary:active { transform: translateY(0); }
        .btn-secondary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 16px 24px;
            border-radius: 16px;
            background: ${theme.btnSecondary};
            color: ${theme.text};
            border: 1px solid ${theme.btnSecondaryBorder};
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-secondary:hover { background: ${theme.iconBg}; border-color: #333; }
        .btn-secondary:active { transform: scale(0.98); }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #333;
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 0.05em;
        }
        .footer span { color: ${theme.textDim}; font-weight: 700; }
    </style>
    <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="icon-wrap">
                <ion-icon name="${theme.icon}" style="font-size: 32px; color: ${theme.text};"></ion-icon>
            </div>
            
            <div class="badge">
                <div class="badge-dot"></div>
                <span class="badge-text">Active Tag</span>
            </div>
            
            <h1>${displayName}</h1>
            <p class="plate">${subtitle}</p>
            <p class="vehicle">${resolvedDomain}</p>
            
            <div class="divider"></div>
            
            <div class="actions">
                ${ownerPhone
                ? '<a href="tel:' + ownerPhone + '" class="btn-primary">' +
                '<ion-icon name="call" style="font-size: 20px;"></ion-icon>' +
                callLabel +
                '</a>'
                : ''}

                <a href="/drop/${encodeURIComponent(publicDropToken)}" class="btn-secondary">
                    <ion-icon name="mail-outline" style="font-size: 20px;"></ion-icon>
                    Anonymous Message
                </a>
            </div>
        </div>
        
        <p class="footer">Powered by <span>Connect360</span></p>
    </div>
</body>
</html>
    `);
    } catch (error: any) {
        const message = error.message;

        if (message.includes('PROFILE_MISSING')) {
            return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Registration Required - Connect360</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet">
    <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DM Sans', sans-serif;
            background: #020617;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            padding: 24px;
        }
        .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 40px 24px;
            border-radius: 24px;
            text-align: center;
            max-width: 400px;
            width: 100%;
        }
        .icon-wrap {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            width: 80px;
            height: 80px;
            border-radius: 40px;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 24px;
        }
        .icon-wrap ion-icon { font-size: 38px; color: #10B981; }
        h1 { color: #fff; margin: 0 0 12px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        p { color: #8899aa; margin: 0 0 32px 0; line-height: 1.6; font-size: 15px; }
        .btn-primary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 16px 24px;
            border-radius: 16px;
            background: #fff;
            color: #000;
            text-decoration: none;
            font-weight: 700;
            font-size: 15px;
            transition: all 0.2s;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(255, 255, 255, 0.1); }
        .footer { margin-top: 24px; color: #334455; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-wrap">
            <ion-icon name="qr-code-outline"></ion-icon>
        </div>
        <h1>Almost Ready!</h1>
        <p>Tag <b>${tagId}</b> exists but hasn't been set up yet. If you are the owner, please register it using the Connect360 app.</p>
        <a href="https://carcard.app/scan/${tagId}" class="btn-primary">
            Open in App
            <ion-icon name="arrow-forward"></ion-icon>
        </a>
        <div class="footer">Connect360 Secure Tag</div>
    </div>
</body>
</html>
            `);
        }

        res.status(404).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tag Not Found</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0F172A, #1E293B, #334155);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            padding: 24px;
        }
        .card {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.07);
            padding: 48px 32px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            text-align: center;
            max-width: 360px;
            width: 100%;
        }
        .icon-wrap {
            background: rgba(239, 68, 68, 0.10);
            border: 1px solid rgba(239, 68, 68, 0.28);
            width: 90px;
            height: 90px;
            border-radius: 45px;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 24px;
        }
        .icon-wrap ion-icon { font-size: 44px; color: #EF4444; }
        h1 { color: #F0F4FA; margin: 0 0 12px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.4px; }
        p { color: #8499B0; margin: 0; line-height: 1.6; font-size: 15px; opacity: 0.8; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-wrap">
            <ion-icon name="alert-circle-outline"></ion-icon>
        </div>
        <h1>Tag Not Found</h1>
        <p>This tag may be inactive or does not exist in our system. Contact support for assistance.</p>
    </div>
</body>
</html>
        `);
    }
});

app.get('/message', (_req, res) => {
    res.status(410).json({
        ok: false,
        message: 'Deprecated endpoint. Use /drop/:token for anonymous ephemeral messaging.',
    });
});

app.post('/api/register-token', async (req, res) => {
    try {
        const { ownerId, pushToken } = req.body;
        if (!ownerId || !pushToken) {
            return res.status(400).json({ error: 'Missing ownerId or pushToken' });
        }
        // Store token in database or just acknowledge
        // For now, just acknowledge receipt
        res.json({ success: true, message: 'Token registered' });
    } catch (error) {
        console.error('Error in /register-token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Basic Route
app.get('/', (req, res) => {
    res.send('Connect360 Backend is Running! 🚀');
});

startDropExpiryScheduler();

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} `);
});
