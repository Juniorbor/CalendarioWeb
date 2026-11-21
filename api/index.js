const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_PATH = IS_SERVERLESS
  ? path.join('/tmp', 'calendario_web_db.json')
  : path.join(__dirname, '..', 'data', 'db.json');

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'calendario-web-secret-hmac-2026-juniorbor';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function hashPassword(password, saltHex) {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function createSignedToken(user) {
  const payload = JSON.stringify({
    u: user.username,
    r: user.role,
    d: user.displayName,
    exp: Date.now() + SESSION_TTL_MS,
  });
  const base64Payload = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(base64Payload).digest('base64url');
  return `${base64Payload}.${sig}`;
}

function verifySignedToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [base64Payload, sig] = token.split('.');
  if (!base64Payload || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(base64Payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const data = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    if (!data || Date.now() > data.exp || !data.u) return null;
    return { username: data.u, role: data.r, displayName: data.d };
  } catch {
    return null;
  }
}

function createInitialDb() {
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

  return {
    updatedAt: 0,
    users: [
      {
        username: 'admin',
        displayName: 'Administrador',
        role: 'admin',
        passwordHash: hashPassword('admin123'),
        createdAt: new Date().toISOString(),
      },
      {
        username: 'editor',
        displayName: 'Editor do Calendário',
        role: 'editor',
        passwordHash: hashPassword('editor123'),
        createdAt: new Date().toISOString(),
      },
      {
        username: 'visitante',
        displayName: 'Visualizador',
        role: 'viewer',
        passwordHash: hashPassword('visitante123'),
        createdAt: new Date().toISOString(),
      },
    ],
    months,
  };
}

let memoryDb = null;

function loadDb() {
  if (memoryDb) return memoryDb;
  try {
    if (fs.existsSync(DB_PATH)) {
      memoryDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      if (typeof memoryDb.updatedAt !== 'number') memoryDb.updatedAt = 0;
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

function getAuthenticatedUser(req, db) {
  const authHeader = req.headers.authorization || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    const cookies = parseCookies(req);
    token = cookies.cal_session || null;
  }
  const verified = verifySignedToken(token);
  if (!verified) return null;
  const userRecord = db.users.find((u) => u.username === verified.username);
  if (userRecord) {
    return {
      username: userRecord.username,
      displayName: userRecord.displayName,
      role: userRecord.role,
    };
  }
  // Em serverless caso um usuário criado em outra instância esteja logado via token válido
  return verified;
}

function sendJson(res, status, payload, extraHeaders = {}) {
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
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${secure}`;
}

module.exports = async function handler(req, res) {
  try {
    const db = loadDb();
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const method = req.method;

    if (method === 'OPTIONS') {
      res.statusCode = 200;
      return res.end();
    }

    // POST /api/login
    if (pathname === '/api/login' && method === 'POST') {
      const body = await readJsonBody(req);
      const username = sanitizeText(body.username, 60).toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      const user = db.users.find((u) => u.username.toLowerCase() === username);

      if (!user || !verifyPassword(password, user.passwordHash)) {
        return sendJson(res, 401, { error: 'Usuário ou senha inválidos.' });
      }

      const token = createSignedToken(user);
      return sendJson(
        res,
        200,
        {
          token,
          user: {
            username: user.username,
            displayName: user.displayName,
            role: user.role,
          },
        },
        {
          'Set-Cookie': `cal_session=${encodeURIComponent(token)}; ${cookieFlags(Math.floor(SESSION_TTL_MS / 1000))}`,
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

    // Demais rotas exigem autenticação
    const authUser = getAuthenticatedUser(req, db);
    if (!authUser) {
      return sendJson(res, 401, { error: 'Não autenticado. Faça login para continuar.' });
    }

    const canEdit = authUser.role === 'admin' || authUser.role === 'editor';
    const isAdmin = authUser.role === 'admin';

    // GET /api/me
    if (pathname === '/api/me' && method === 'GET') {
      const now = new Date();
      return sendJson(res, 200, {
        user: {
          username: authUser.username,
          displayName: authUser.displayName,
          role: authUser.role,
        },
        updatedAt: db.updatedAt || 0,
        serverToday: {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
        },
      });
    }

    // POST /api/calendar/sync (sincronização híbrida para ambiente serverless)
    if (pathname === '/api/calendar/sync' && method === 'POST') {
      const body = await readJsonBody(req);
      const clientUpdatedAt = Number(body.updatedAt) || 0;
      if (
        canEdit &&
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

    // PUT /api/me/password
    if (pathname === '/api/me/password' && method === 'PUT') {
      const body = await readJsonBody(req);
      const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
      if (newPassword.length < 4) {
        return sendJson(res, 400, { error: 'A nova senha deve ter pelo menos 4 caracteres.' });
      }
      const userRecord = db.users.find((u) => u.username === authUser.username);
      if (!userRecord || !verifyPassword(currentPassword, userRecord.passwordHash)) {
        return sendJson(res, 400, { error: 'Senha atual incorreta.' });
      }
      userRecord.passwordHash = hashPassword(newPassword);
      saveDb(db);
      return sendJson(res, 200, { ok: true, message: 'Senha alterada com sucesso.' });
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
      const monthData = db.months[monthKey] || { verse: '', cells: {} };
      return sendJson(res, 200, {
        monthKey,
        verse: monthData.verse || '',
        cells: monthData.cells || {},
        updatedAt: db.updatedAt || 0,
      });
    }

    // PUT /api/calendar/:year/:month/verse
    const verseMatch = pathname.match(/^\/api\/calendar\/(\d{4})\/(\d{1,2})\/verse$/);
    if (verseMatch && method === 'PUT') {
      if (!canEdit) return sendJson(res, 403, { error: 'Seu perfil permite apenas visualização.' });
      const monthKey = isValidMonthKey(verseMatch[1], verseMatch[2]);
      if (!monthKey) return sendJson(res, 400, { error: 'Ano ou mês inválido.' });
      const body = await readJsonBody(req);
      const verse = sanitizeText(body.verse, 300);
      if (!db.months[monthKey]) {
        db.months[monthKey] = { verse: '', cells: {} };
      }
      db.months[monthKey].verse = verse;
      db.months[monthKey].updatedBy = authUser.username;
      db.months[monthKey].updatedAt = new Date().toISOString();
      db.updatedAt = Date.now();
      saveDb(db);
      return sendJson(res, 200, { ok: true, verse, updatedAt: db.updatedAt });
    }

    // PUT /api/calendar/:year/:month/cell/:cellKey
    const cellMatch = pathname.match(/^\/api\/calendar\/(\d{4})\/(\d{1,2})\/cell\/([a-z0-9-]+)$/);
    if (cellMatch && method === 'PUT') {
      if (!canEdit) return sendJson(res, 403, { error: 'Seu perfil permite apenas visualização.' });
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
        updatedBy: authUser.username,
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
      if (!canEdit) return sendJson(res, 403, { error: 'Sem permissão para exportar.' });
      return sendJson(res, 200, {
        exportedAt: new Date().toISOString(),
        exportedBy: authUser.username,
        months: db.months,
      });
    }

    // POST /api/restore
    if (pathname === '/api/restore' && method === 'POST') {
      if (!isAdmin) return sendJson(res, 403, { error: 'Apenas administradores podem restaurar backups.' });
      const body = await readJsonBody(req);
      if (!body || typeof body.months !== 'object' || Array.isArray(body.months)) {
        return sendJson(res, 400, { error: 'Arquivo de backup inválido.' });
      }
      db.months = body.months;
      db.updatedAt = Date.now();
      saveDb(db);
      return sendJson(res, 200, { ok: true, count: Object.keys(db.months).length, updatedAt: db.updatedAt });
    }

    // GET /api/users
    if (pathname === '/api/users' && method === 'GET') {
      if (!isAdmin) return sendJson(res, 403, { error: 'Apenas administradores podem gerenciar usuários.' });
      return sendJson(res, 200, {
        users: db.users.map((u) => ({
          username: u.username,
          displayName: u.displayName,
          role: u.role,
          createdAt: u.createdAt,
        })),
      });
    }

    // POST /api/users
    if (pathname === '/api/users' && method === 'POST') {
      if (!isAdmin) return sendJson(res, 403, { error: 'Apenas administradores podem criar usuários.' });
      const body = await readJsonBody(req);
      const username = sanitizeText(body.username, 40).toLowerCase().replace(/[^a-z0-9._-]/g, '');
      const displayName = sanitizeText(body.displayName, 80) || username;
      const role = ['admin', 'editor', 'viewer'].includes(body.role) ? body.role : 'editor';
      const password = typeof body.password === 'string' ? body.password : '';

      if (username.length < 3) {
        return sendJson(res, 400, { error: 'Nome de usuário deve ter pelo menos 3 caracteres (letras, números, . _ -).' });
      }
      if (password.length < 4) {
        return sendJson(res, 400, { error: 'A senha deve ter pelo menos 4 caracteres.' });
      }
      if (db.users.some((u) => u.username === username)) {
        return sendJson(res, 409, { error: 'Já existe um usuário com este login.' });
      }

      db.users.push({
        username,
        displayName,
        role,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      });
      saveDb(db);
      return sendJson(res, 201, { ok: true, user: { username, displayName, role } });
    }

    // PUT /api/users/:username
    const userPutMatch = pathname.match(/^\/api\/users\/([a-z0-9._-]+)$/);
    if (userPutMatch && method === 'PUT') {
      if (!isAdmin) return sendJson(res, 403, { error: 'Apenas administradores podem alterar usuários.' });
      const targetName = userPutMatch[1];
      const target = db.users.find((u) => u.username === targetName);
      if (!target) return sendJson(res, 404, { error: 'Usuário não encontrado.' });

      const body = await readJsonBody(req);
      if (body.displayName !== undefined) {
        target.displayName = sanitizeText(body.displayName, 80) || target.username;
      }
      if (body.role && ['admin', 'editor', 'viewer'].includes(body.role)) {
        if (target.role === 'admin' && body.role !== 'admin') {
          const adminCount = db.users.filter((u) => u.role === 'admin').length;
          if (adminCount <= 1) {
            return sendJson(res, 400, { error: 'Não é possível remover o perfil do último administrador.' });
          }
        }
        target.role = body.role;
      }
      if (typeof body.password === 'string' && body.password.length > 0) {
        if (body.password.length < 4) {
          return sendJson(res, 400, { error: 'A senha deve ter pelo menos 4 caracteres.' });
        }
        target.passwordHash = hashPassword(body.password);
      }
      saveDb(db);
      return sendJson(res, 200, {
        ok: true,
        user: { username: target.username, displayName: target.displayName, role: target.role },
      });
    }

    // DELETE /api/users/:username
    const userDelMatch = pathname.match(/^\/api\/users\/([a-z0-9._-]+)$/);
    if (userDelMatch && method === 'DELETE') {
      if (!isAdmin) return sendJson(res, 403, { error: 'Apenas administradores podem excluir usuários.' });
      const targetName = userDelMatch[1];
      if (targetName === authUser.username) {
        return sendJson(res, 400, { error: 'Você não pode excluir o próprio usuário logado.' });
      }
      const idx = db.users.findIndex((u) => u.username === targetName);
      if (idx === -1) return sendJson(res, 404, { error: 'Usuário não encontrado.' });

      if (db.users[idx].role === 'admin') {
        const adminCount = db.users.filter((u) => u.role === 'admin').length;
        if (adminCount <= 1) {
          return sendJson(res, 400, { error: 'Não é possível excluir o último administrador.' });
        }
      }

      db.users.splice(idx, 1);
      saveDb(db);
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { error: 'Rota da API não encontrada.' });
  } catch (err) {
    console.error('[Erro na API]', err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: err.message || 'Erro interno do servidor.' });
    }
  }
};
