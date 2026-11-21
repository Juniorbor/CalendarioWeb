const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_PATH = IS_SERVERLESS
  ? path.join('/tmp', 'calendario_web_admin_db.json')
  : path.join(__dirname, '..', 'data', 'db.json');

const SESSION_SHORT_MS = 1000 * 60 * 60 * 12; // 12 horas
const SESSION_LONG_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias (se "Manter conectado")
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'calendario-web-admin-hmac-secret-2026-v2';

// Proteção contra força bruta (5 tentativas falhas -> bloqueio de 15 min)
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function hashPassword(password, saltHex) {
  const salt = saltHex || crypto.randomBytes(32).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  let salt;
  let keyHex;
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    salt = parts[1];
    keyHex = parts[2];
  } else if (storedHash.includes(':')) {
    [salt, keyHex] = storedHash.split(':');
  } else {
    return false;
  }
  try {
    const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

function validateStrongPassword(password) {
  if (typeof password !== 'string') {
    return 'Informe uma senha válida.';
  }
  if (password.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }
  if (password.length > 128) {
    return 'A senha deve ter no máximo 128 caracteres.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra maiúscula (A–Z).';
  }
  if (!/[a-z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra minúscula (a–z).';
  }
  if (!/[0-9]/.test(password)) {
    return 'A senha deve conter pelo menos um número (0–9).';
  }
  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return 'A senha deve conter pelo menos um caractere especial (ex.: ! @ # $ % & *).';
  }
  return null;
}

function createSignedToken(admin, ttlMs = SESSION_SHORT_MS) {
  const payload = JSON.stringify({
    u: admin.username,
    d: admin.displayName,
    r: 'admin',
    n: admin.sessionNonce,
    exp: Date.now() + ttlMs,
  });
  const base64Payload = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(base64Payload).digest('base64url');
  return `${base64Payload}.${sig}`;
}

function verifySignedToken(token, expectedNonce) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [base64Payload, sig] = token.split('.');
  if (!base64Payload || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(base64Payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const data = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    if (!data || Date.now() > data.exp || data.r !== 'admin' || !data.u) return null;
    if (expectedNonce && data.n !== expectedNonce) return null;
    return { username: data.u, displayName: data.d || 'Administrador', role: 'admin' };
  } catch {
    return null;
  }
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return { blocked: false, remainingMs: 0 };
  if (entry.lockUntil && entry.lockUntil > now) {
    return { blocked: true, remainingMs: entry.lockUntil - now };
  }
  if (now - entry.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { blocked: false, remainingMs: 0 };
  }
  return { blocked: false, remainingMs: 0 };
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttemptAt: now, lockUntil: 0 });
    return MAX_LOGIN_ATTEMPTS - 1;
  }
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockUntil = now + LOCKOUT_WINDOW_MS;
  }
  loginAttempts.set(ip, entry);
  return Math.max(0, MAX_LOGIN_ATTEMPTS - entry.count);
}

function clearFailedLogins(ip) {
  loginAttempts.delete(ip);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSeedMonths() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const months = {
    '2027-01': {
      verse: 'Põe-se vinho novo em odres novos (Marcos 2. 22)',
      cells: {
        'pad-start-0': {
          title: 'Reflexão do Mês',
          notes: '“As únicas armas que o Senhor nos dá são ‘espírito e verdade’”\n(Palavras de Martim Lutero)',
          liturgicalColor: '',
          cellColor: 'indigo',
          tag: 'Citação',
          themeImage: 'citacao',
          customImage: '',
          isQuote: true,
        },
        'pad-start-2': {
          title: 'Preparação Teológica',
          notes: '',
          liturgicalColor: '',
          cellColor: 'teal',
          tag: 'Formação',
          themeImage: 'formacao',
          customImage: '',
        },
        'day-1': {
          title: 'ANO NOVO',
          notes: 'Feriado Nacional — Confraternização Universal',
          liturgicalColor: 'branco',
          cellColor: 'amarelo',
          tag: 'Feriado',
          themeImage: 'anonovo',
          customImage: '',
        },
        'day-3': {
          title: '1º Domingo após Epifania',
          notes: '',
          liturgicalColor: 'branco',
          cellColor: '',
          tag: 'Culto',
          themeImage: 'culto',
          customImage: '',
        },
        'day-10': {
          title: 'Culto Dominical',
          notes: '',
          liturgicalColor: 'verde',
          cellColor: '',
          tag: 'Culto',
          themeImage: 'culto',
          customImage: '',
        },
        'day-17': {
          title: 'Culto Dominical',
          notes: '',
          liturgicalColor: 'verde',
          cellColor: '',
          tag: 'Culto',
          themeImage: 'culto',
          customImage: '',
        },
        'day-24': {
          title: 'Culto Dominical',
          notes: '',
          liturgicalColor: 'verde',
          cellColor: '',
          tag: 'Culto',
          themeImage: 'culto',
          customImage: '',
        },
        'day-31': {
          title: 'Culto Dominical',
          notes: '',
          liturgicalColor: 'verde',
          cellColor: '',
          tag: 'Culto',
          themeImage: 'culto',
          customImage: '',
        },
      },
    },
  };

  if (!months[currentKey]) {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const cells = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(currentYear, currentMonth - 1, d).getDay();
      if (dow === 0) {
        cells[`day-${d}`] = {
          title: 'Culto Dominical',
          notes: 'Clique neste quadrado para editar horários e avisos.',
          liturgicalColor: 'verde',
          cellColor: '',
          tag: 'Culto',
          themeImage: '',
          customImage: '',
        };
      }
    }
    const firstDow = new Date(currentYear, currentMonth - 1, 1).getDay();
    if (firstDow > 0) {
      cells['pad-start-0'] = {
        title: 'Reflexão do Mês',
        notes: '“Lâmpada para os meus pés é a tua palavra e luz para o meu caminho.”\n(Salmos 119.105)',
        liturgicalColor: '',
        cellColor: 'indigo',
        tag: 'Citação',
        themeImage: 'citacao',
        customImage: '',
        isQuote: true,
      };
    }
    months[currentKey] = {
      verse: 'Tudo o que fizerdes, fazei-o de todo o coração (Colossenses 3. 23)',
      cells,
    };
  }

  return months;
}

function createInitialDb() {
  const envUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const envHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
  const hasEnvPassword = Boolean(envHash && (envHash.startsWith('scrypt$') || envHash.includes(':')));

  return {
    updatedAt: 0,
    admin: {
      username: envUser || 'admin',
      displayName: 'Administrador',
      passwordHash: hasEnvPassword ? envHash : '',
      setupCompleted: hasEnvPassword,
      sessionNonce: crypto.randomBytes(16).toString('hex'),
      passwordUpdatedAt: hasEnvPassword ? new Date().toISOString() : null,
    },
    months: createSeedMonths(),
  };
}

let memoryDb = null;

function loadDb() {
  if (memoryDb) return memoryDb;
  try {
    if (fs.existsSync(DB_PATH)) {
      const loaded = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      // Migra banco antigo multi-usuário para formato exclusivo Admin (exigindo criação de senha segura)
      if (!loaded.admin) {
        const fresh = createInitialDb();
        fresh.months = loaded.months || fresh.months;
        fresh.updatedAt = typeof loaded.updatedAt === 'number' ? loaded.updatedAt : 0;
        memoryDb = fresh;
        saveDb(memoryDb);
        return memoryDb;
      }
      if (!loaded.admin.sessionNonce) {
        loaded.admin.sessionNonce = crypto.randomBytes(16).toString('hex');
      }
      memoryDb = loaded;
      return memoryDb;
    }
  } catch {}
  memoryDb = createInitialDb();
  saveDb(memoryDb);
  return memoryDb;
}

function saveDb(dbObj) {
  memoryDb = dbObj;
  try {
    ensureDir(path.dirname(DB_PATH));
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(dbObj, null, 2), 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
  } catch {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(dbObj, null, 2), 'utf8');
    } catch {}
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      cookies[k] = decodeURIComponent(v);
    }
  }
  return cookies;
}

function getAuthenticatedAdmin(req, db) {
  if (!db.admin || !db.admin.setupCompleted || !db.admin.passwordHash) return null;
  const authHeader = req.headers.authorization || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    const cookies = parseCookies(req);
    token = cookies.cal_session || null;
  }
  const verified = verifySignedToken(token, db.admin.sessionNonce);
  if (!verified) return null;
  if (verified.username.toLowerCase() !== db.admin.username.toLowerCase()) return null;
  return {
    username: db.admin.username,
    displayName: db.admin.displayName,
    role: 'admin',
  };
}

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function sendJson(res, status, payload, extraHeaders = {}) {
  applySecurityHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  for (const [k, v] of Object.entries(extraHeaders)) {
    res.setHeader(k, v);
  }
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') {
      try {
        return resolve(req.body ? JSON.parse(req.body) : {});
      } catch {
        return reject(new Error('JSON inválido'));
      }
    }
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Payload muito grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function sanitizeText(val, maxLen = 2000) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function isValidMonthKey(yearStr, monthStr) {
  const y = Number(yearStr);
  const m = Number(monthStr);
  if (!Number.isInteger(y) || y < 1900 || y > 2200) return null;
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function isValidCellKey(key) {
  return /^(day-([1-9]|[12][0-9]|3[01])|pad-start-[0-5]|pad-end-[0-5])$/.test(key);
}

function cookieFlags(maxAgeSec) {
  const secure = IS_SERVERLESS ? '; Secure' : '';
  return `HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}${secure}`;
}

module.exports = async function handler(req, res) {
  try {
    const db = loadDb();
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const method = req.method;

    if (method === 'OPTIONS') {
      applySecurityHeaders(res);
      res.statusCode = 200;
      return res.end();
    }

    // GET /api/auth/status (informa se já existe senha criada ou se exige configuração inicial)
    if (pathname === '/api/auth/status' && method === 'GET') {
      const setupRequired = !db.admin || !db.admin.setupCompleted || !db.admin.passwordHash;
      return sendJson(res, 200, {
        setupRequired,
        adminOnly: true,
        isServerless: IS_SERVERLESS,
      });
    }

    // POST /api/auth/setup (criação segura da senha do Administrador no primeiro acesso)
    if (pathname === '/api/auth/setup' && method === 'POST') {
      if (db.admin && db.admin.setupCompleted && db.admin.passwordHash) {
        return sendJson(res, 403, { error: 'A senha do administrador já foi configurada. Faça login.' });
      }
      const body = await readJsonBody(req);
      const username = sanitizeText(body.username || 'admin', 40)
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '');
      const displayName = sanitizeText(body.displayName || 'Administrador', 80) || 'Administrador';
      const password = typeof body.password === 'string' ? body.password : '';

      if (username.length < 3) {
        return sendJson(res, 400, { error: 'O usuário deve ter pelo menos 3 caracteres (letras, números, . _ -).' });
      }
      const pwError = validateStrongPassword(password);
      if (pwError) {
        return sendJson(res, 400, { error: pwError });
      }

      const passwordHash = hashPassword(password);
      db.admin = {
        username,
        displayName,
        passwordHash,
        setupCompleted: true,
        sessionNonce: crypto.randomBytes(16).toString('hex'),
        passwordUpdatedAt: new Date().toISOString(),
      };
      saveDb(db);

      const token = createSignedToken(db.admin, SESSION_SHORT_MS);
      return sendJson(
        res,
        201,
        {
          ok: true,
          token,
          user: {
            username: db.admin.username,
            displayName: db.admin.displayName,
            role: 'admin',
          },
          envHashHint: passwordHash,
        },
        {
          'Set-Cookie': `cal_session=${encodeURIComponent(token)}; ${cookieFlags(Math.floor(SESSION_SHORT_MS / 1000))}`,
        }
      );
    }

    // POST /api/login (somente Administrador, com proteção contra força bruta)
    if (pathname === '/api/login' && method === 'POST') {
      if (!db.admin || !db.admin.setupCompleted || !db.admin.passwordHash) {
        return sendJson(res, 409, {
          error: 'Crie primeiro a senha do administrador antes de fazer login.',
          setupRequired: true,
        });
      }

      const ip = getClientIp(req);
      const rate = checkRateLimit(ip);
      if (rate.blocked) {
        const mins = Math.ceil(rate.remainingMs / 60000);
        return sendJson(res, 429, {
          error: `Muitas tentativas incorretas. Acesso temporariamente bloqueado por ${mins} minuto(s).`,
        });
      }

      const body = await readJsonBody(req);
      const username = sanitizeText(body.username, 60).toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      const remember = Boolean(body.remember);

      const userMatches = username === db.admin.username.toLowerCase();
      const passMatches = verifyPassword(password, db.admin.passwordHash);

      if (!userMatches || !passMatches) {
        await sleep(350);
        const remaining = recordFailedLogin(ip);
        const suffix =
          remaining > 0
            ? ` Restam ${remaining} tentativa(s) antes do bloqueio temporário.`
            : ' Acesso bloqueado por 15 minutos por segurança.';
        return sendJson(res, 401, { error: `Usuário ou senha inválidos.${suffix}` });
      }

      clearFailedLogins(ip);
      const ttl = remember ? SESSION_LONG_MS : SESSION_SHORT_MS;
      const token = createSignedToken(db.admin, ttl);

      return sendJson(
        res,
        200,
        {
          token,
          user: {
            username: db.admin.username,
            displayName: db.admin.displayName,
            role: 'admin',
          },
        },
        {
          'Set-Cookie': `cal_session=${encodeURIComponent(token)}; ${cookieFlags(Math.floor(ttl / 1000))}`,
        }
      );
    }

    // POST /api/logout
    if (pathname === '/api/logout' && method === 'POST') {
      return sendJson(
        res,
        200,
        { ok: true },
        {
          'Set-Cookie': `cal_session=; ${cookieFlags(0)}`,
        }
      );
    }

    // Todas as rotas abaixo exigem sessão válida do Administrador
    const adminUser = getAuthenticatedAdmin(req, db);
    if (!adminUser) {
      return sendJson(res, 401, { error: 'Sessão inválida ou expirada. Faça login como administrador.' });
    }

    // GET /api/me
    if (pathname === '/api/me' && method === 'GET') {
      const now = new Date();
      return sendJson(res, 200, {
        user: adminUser,
        passwordUpdatedAt: db.admin.passwordUpdatedAt,
        isServerless: IS_SERVERLESS,
        updatedAt: db.updatedAt || 0,
        serverToday: {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
        },
      });
    }

    // PUT /api/me/password (alteração segura de senha + invalidação imediata de sessões antigas)
    if (pathname === '/api/me/password' && method === 'PUT') {
      const body = await readJsonBody(req);
      const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
      const newUsernameRaw = body.username !== undefined ? sanitizeText(body.username, 40).toLowerCase().replace(/[^a-z0-9._-]/g, '') : '';
      const newDisplayName = body.displayName !== undefined ? sanitizeText(body.displayName, 80) : '';

      if (!verifyPassword(currentPassword, db.admin.passwordHash)) {
        await sleep(300);
        return sendJson(res, 400, { error: 'A senha atual informada está incorreta.' });
      }
      if (newPassword === currentPassword) {
        return sendJson(res, 400, { error: 'A nova senha deve ser diferente da senha atual.' });
      }
      const pwError = validateStrongPassword(newPassword);
      if (pwError) {
        return sendJson(res, 400, { error: pwError });
      }
      if (newUsernameRaw && newUsernameRaw.length < 3) {
        return sendJson(res, 400, { error: 'O usuário deve ter pelo menos 3 caracteres.' });
      }

      const newHash = hashPassword(newPassword);
      if (newUsernameRaw) db.admin.username = newUsernameRaw;
      if (newDisplayName) db.admin.displayName = newDisplayName;
      db.admin.passwordHash = newHash;
      db.admin.passwordUpdatedAt = new Date().toISOString();
      // Rotaciona o nonce: invalida instantaneamente qualquer sessão antiga em outros navegadores
      db.admin.sessionNonce = crypto.randomBytes(16).toString('hex');
      saveDb(db);

      const freshToken = createSignedToken(db.admin, SESSION_SHORT_MS);
      return sendJson(
        res,
        200,
        {
          ok: true,
          token: freshToken,
          user: {
            username: db.admin.username,
            displayName: db.admin.displayName,
            role: 'admin',
          },
          passwordUpdatedAt: db.admin.passwordUpdatedAt,
          envHashHint: newHash,
          message: 'Senha atualizada com segurança. Todas as sessões anteriores foram encerradas.',
        },
        {
          'Set-Cookie': `cal_session=${encodeURIComponent(freshToken)}; ${cookieFlags(Math.floor(SESSION_SHORT_MS / 1000))}`,
        }
      );
    }

    // POST /api/auth/revoke-all (encerra todas as sessões em todos os dispositivos)
    if (pathname === '/api/auth/revoke-all' && method === 'POST') {
      db.admin.sessionNonce = crypto.randomBytes(16).toString('hex');
      saveDb(db);
      return sendJson(
        res,
        200,
        { ok: true, message: 'Todas as sessões foram encerradas.' },
        {
          'Set-Cookie': `cal_session=; ${cookieFlags(0)}`,
        }
      );
    }

    // POST /api/calendar/sync
    if (pathname === '/api/calendar/sync' && method === 'POST') {
      const body = await readJsonBody(req);
      const clientUpdatedAt = Number(body.updatedAt) || 0;
      if (
        body.months &&
        typeof body.months === 'object' &&
        !Array.isArray(body.months) &&
        clientUpdatedAt > (db.updatedAt || 0)
      ) {
        db.months = body.months;
        db.updatedAt = clientUpdatedAt;
        saveDb(db);
      }
      return sendJson(res, 200, {
        ok: true,
        updatedAt: db.updatedAt || 0,
        months: db.months,
      });
    }

    // GET /api/calendar/search
    if (pathname === '/api/calendar/search' && method === 'GET') {
      const q = sanitizeText(urlObj.searchParams.get('q') || '', 120).toLowerCase();
      if (!q) return sendJson(res, 200, { results: [] });

      const results = [];
      for (const [monthKey, mData] of Object.entries(db.months)) {
        const [yStr, mStr] = monthKey.split('-');
        const year = Number(yStr);
        const month = Number(mStr);
        if (mData.verse && mData.verse.toLowerCase().includes(q)) {
          results.push({
            year,
            month,
            cellKey: 'verse',
            title: 'Versículo / Lema do Mês',
            snippet: mData.verse,
          });
        }
        if (mData.cells) {
          for (const [cellKey, cell] of Object.entries(mData.cells)) {
            const hay = `${cell.title || ''} ${cell.notes || ''} ${cell.liturgicalColor || ''} ${cell.tag || ''}`.toLowerCase();
            if (hay.includes(q)) {
              results.push({
                year,
                month,
                cellKey,
                title: cell.title || cell.tag || cellKey,
                snippet: cell.notes || cell.liturgicalColor || '',
              });
            }
          }
        }
      }
      results.sort((a, b) => a.year - b.year || a.month - b.month);
      return sendJson(res, 200, { results: results.slice(0, 50) });
    }

    // GET /api/calendar/:year/:month
    const calMatch = pathname.match(/^\/api\/calendar\/(\d{4})\/(\d{1,2})$/);
    if (calMatch && method === 'GET') {
      const monthKey = isValidMonthKey(calMatch[1], calMatch[2]);
      if (!monthKey) return sendJson(res, 400, { error: 'Ano ou mês inválido.' });
      const monthData = db.months[monthKey] || { verse: '', versePinned: false, cells: {} };
      return sendJson(res, 200, {
        monthKey,
        verse: monthData.verse || '',
        versePinned: Boolean(monthData.versePinned),
        cells: monthData.cells || {},
        updatedAt: db.updatedAt || 0,
      });
    }

    // PUT /api/calendar/:year/:month/verse
    const verseMatch = pathname.match(/^\/api\/calendar\/(\d{4})\/(\d{1,2})\/verse$/);
    if (verseMatch && method === 'PUT') {
      const monthKey = isValidMonthKey(verseMatch[1], verseMatch[2]);
      if (!monthKey) return sendJson(res, 400, { error: 'Ano ou mês inválido.' });
      const body = await readJsonBody(req);
      const verse = sanitizeText(body.verse, 300);
      const versePinned = Boolean(body.versePinned) && Boolean(verse);
      if (!db.months[monthKey]) {
        db.months[monthKey] = { verse: '', versePinned: false, cells: {} };
      }
      db.months[monthKey].verse = verse;
      db.months[monthKey].versePinned = versePinned;
      db.months[monthKey].updatedBy = adminUser.username;
      db.months[monthKey].updatedAt = new Date().toISOString();
      db.updatedAt = Date.now();
      saveDb(db);
      return sendJson(res, 200, { ok: true, verse, versePinned, updatedAt: db.updatedAt });
    }

    // PUT /api/calendar/:year/:month/cell/:cellKey
    const cellMatch = pathname.match(/^\/api\/calendar\/(\d{4})\/(\d{1,2})\/cell\/([a-z0-9-]+)$/);
    if (cellMatch && method === 'PUT') {
      const monthKey = isValidMonthKey(cellMatch[1], cellMatch[2]);
      const cellKey = cellMatch[3];
      if (!monthKey || !isValidCellKey(cellKey)) {
        return sendJson(res, 400, { error: 'Referência de célula inválida.' });
      }
      const body = await readJsonBody(req);
      if (!db.months[monthKey]) {
        db.months[monthKey] = { verse: '', cells: {} };
      }

      let customImage = '';
      if (
        typeof body.customImage === 'string' &&
        /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(body.customImage) &&
        body.customImage.length <= 220000
      ) {
        customImage = body.customImage;
      }

      const cleaned = {
        title: sanitizeText(body.title, 140),
        notes: sanitizeText(body.notes, 1500),
        liturgicalColor: sanitizeText(body.liturgicalColor, 30).toLowerCase(),
        cellColor: sanitizeText(body.cellColor, 30).toLowerCase(),
        tag: sanitizeText(body.tag, 40),
        themeImage: sanitizeText(body.themeImage, 40).toLowerCase().replace(/[^a-z0-9_-]/g, ''),
        customImage,
        isQuote: Boolean(body.isQuote),
        updatedBy: adminUser.username,
        updatedAt: new Date().toISOString(),
      };

      const isEmpty =
        !cleaned.title &&
        !cleaned.notes &&
        !cleaned.liturgicalColor &&
        !cleaned.cellColor &&
        !cleaned.tag &&
        !cleaned.themeImage &&
        !cleaned.customImage;

      if (isEmpty) {
        delete db.months[monthKey].cells[cellKey];
      } else {
        db.months[monthKey].cells[cellKey] = cleaned;
      }

      db.updatedAt = Date.now();
      saveDb(db);
      return sendJson(res, 200, {
        ok: true,
        cellKey,
        cell: db.months[monthKey].cells[cellKey] || null,
        updatedAt: db.updatedAt,
      });
    }

    // GET /api/backup
    if (pathname === '/api/backup' && method === 'GET') {
      return sendJson(res, 200, {
        exportedAt: new Date().toISOString(),
        exportedBy: adminUser.username,
        months: db.months,
      });
    }

    // POST /api/restore
    if (pathname === '/api/restore' && method === 'POST') {
      const body = await readJsonBody(req);
      if (!body || typeof body.months !== 'object' || Array.isArray(body.months)) {
        return sendJson(res, 400, { error: 'Arquivo de backup inválido.' });
      }
      db.months = body.months;
      db.updatedAt = Date.now();
      saveDb(db);
      return sendJson(res, 200, { ok: true, count: Object.keys(db.months).length, updatedAt: db.updatedAt });
    }

    return sendJson(res, 404, { error: 'Rota da API não encontrada.' });
  } catch (err) {
    console.error('[Erro na API]', err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: err.message || 'Erro interno do servidor.' });
    }
  }
};
