(() => {
  const MONTHS_PT = [
    'JANEIRO',
    'FEVEREIRO',
    'MARÇO',
    'ABRIL',
    'MAIO',
    'JUNHO',
    'JULHO',
    'AGOSTO',
    'SETEMBRO',
    'OUTUBRO',
    'NOVEMBRO',
    'DEZEMBRO',
  ];

  const MONTHS_CAP = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const WEEKDAYS_CAP = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  const LIT_LABELS = {
    branco: 'Branco',
    verde: 'Verde',
    vermelho: 'Vermelho',
    roxo: 'Roxo',
    rosa: 'Rosa',
    dourado: 'Dourado',
    preto: 'Preto',
  };

  const ROLE_LABELS = {
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Visualizador',
  };

  const THEME_LABELS = {
    finados: 'Finados',
    culto: 'Culto',
    biblia: 'Bíblia',
    cruz: 'Páscoa / Cruz',
    anonovo: 'Ano Novo',
    natal: 'Natal',
    consciencia: 'Consciência Negra',
    brasil: 'Brasil',
    formacao: 'Formação',
    reuniao: 'Reunião',
    aniversario: 'Aniversário',
    citacao: 'Reflexão',
    eucaristia: 'Santa Ceia',
    trabalho: 'Trabalho',
    coracao: 'Ação Social',
    musica: 'Música / Coral',
    carnaval: 'Carnaval',
  };

  const state = {
    user: null,
    publicMode:
      window.location.pathname === '/comunidade' ||
      new URLSearchParams(window.location.search).get('modo') === 'comunidade',
    viewMode: 'grid',
    notepadTab: 'tomorrow',
    today: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
    },
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth() + 1,
    monthData: { verse: '', versePinned: false, cells: {} },
    editingCellKey: null,
    editingCellInfo: null,
    cellModalDirty: false,
    selectedLitColor: '',
    selectedCellColor: '',
    selectedThemeImage: '',
    customImageData: '',
    flashCellKey: null,
    dragSourceKey: null,
    lastUndo: null,
  };

  function normalizeTextForMatch(text) {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function detectThemeKey(text) {
    const t = normalizeTextForMatch(text);
    if (!t.trim()) return '';
    if (/(finado|memoria|falecid|saudade|luto)/.test(t)) return 'finados';
    if (/(ano novo|confraterniza|reveillon)/.test(t)) return 'anonovo';
    if (/(natal|advento|presepio)/.test(t)) return 'natal';
    if (/(pascoa|sexta-feira santa|sexta feira santa|paixao|crucific|ressurreic|cruz)/.test(t)) return 'cruz';
    if (/(corpus christi|santa ceia|eucarist|\bceia\b)/.test(t)) return 'eucaristia';
    if (/(consciencia negra|zumbi)/.test(t)) return 'consciencia';
    if (/(independencia|republica|tiradentes|patria|brasil)/.test(t)) return 'brasil';
    if (/(carnaval)/.test(t)) return 'carnaval';
    if (/(trabalho|trabalhador)/.test(t)) return 'trabalho';
    if (/(teologic|formacao|estudo|curso|palestra|seminario|escola|ensino)/.test(t)) return 'formacao';
    if (/(biblia|evangelho|palavra|salmo|escritura)/.test(t)) return 'biblia';
    if (/(reuniao|assembleia|diretoria|conselho|presbiterio|encontro)/.test(t)) return 'reuniao';
    if (/(aniversario|parabens|comemoracao)/.test(t)) return 'aniversario';
    if (/(coral|musica|louvor|cantico|ensaio|cantata)/.test(t)) return 'musica';
    if (/(crianca|aparecida|social|caridade|doacao|diaconia|maes|pais)/.test(t)) return 'coracao';
    if (/(citacao|reflexao|lutero|lema|meditacao)/.test(t)) return 'citacao';
    if (/(culto|missa|epifania|igreja|oracao|vigilia|adoracao|batismo|confirmacao)/.test(t)) return 'culto';
    return '';
  }

  function resolveThemeImage(cellData, fallbackText) {
    if (cellData && cellData.customImage) {
      return { src: cellData.customImage, alt: cellData.title || fallbackText || 'Imagem do tema' };
    }
    if (cellData && cellData.themeImage === 'none') {
      return null;
    }
    if (cellData && cellData.themeImage && THEME_LABELS[cellData.themeImage]) {
      return {
        src: `/images/themes/${cellData.themeImage}.svg`,
        alt: THEME_LABELS[cellData.themeImage],
      };
    }
    const combined = `${cellData?.title || ''} ${cellData?.tag || ''} ${fallbackText || ''}`;
    const detected = detectThemeKey(combined);
    if (detected && THEME_LABELS[detected]) {
      return {
        src: `/images/themes/${detected}.svg`,
        alt: THEME_LABELS[detected],
      };
    }
    return null;
  }

  const $ = (id) => document.getElementById(id);

  // =========================
  // UTILITÁRIOS DE DATA & FERIADOS BR
  // =========================
  function getEasterDate(year) {
    // Algoritmo de Meeus/Jones/Butcher
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function addDays(date, days) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function getBrazilianHolidays(year) {
    const map = {
      '1-1': 'Ano Novo (Confraternização Universal)',
      '4-21': 'Tiradentes',
      '5-1': 'Dia do Trabalho',
      '9-7': 'Independência do Brasil',
      '10-12': 'Nossa Senhora Aparecida / Dia das Crianças',
      '11-2': 'Finados',
      '11-15': 'Proclamação da República',
      '11-20': 'Dia da Consciência Negra',
      '12-25': 'Natal',
    };
    const easter = getEasterDate(year);
    const addMovable = (offset, label) => {
      const dt = addDays(easter, offset);
      map[`${dt.getMonth() + 1}-${dt.getDate()}`] = label;
    };
    addMovable(-47, 'Carnaval');
    addMovable(-2, 'Sexta-Feira Santa');
    addMovable(0, 'Páscoa');
    addMovable(60, 'Corpus Christi');
    return map;
  }

  function normalizeTagClass(tag) {
    const clean = (tag || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (clean.includes('feriado')) return 'tag-feriado';
    if (clean.includes('culto')) return 'tag-culto';
    if (clean.includes('reuniao')) return 'tag-reuniao';
    if (clean.includes('evento')) return 'tag-evento';
    if (clean.includes('formacao')) return 'tag-formacao';
    if (clean.includes('citacao')) return 'tag-citacao';
    if (clean.includes('aniversario')) return 'tag-aniversario';
    return '';
  }

  function formatDateTimePt(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch {
      return iso;
    }
  }

  let toastTimer = null;
  let activeUndoHandler = null;
  function showToast(message, type = 'info', undoHandler = null) {
    const el = $('toast');
    const txt = $('toastText');
    const act = $('toastActionBtn');
    if (txt) txt.textContent = message;
    else el.textContent = message;

    activeUndoHandler = typeof undoHandler === 'function' ? undoHandler : null;
    if (activeUndoHandler) {
      state.lastUndo = activeUndoHandler;
      updateUndoButtonUi();
    }
    if (act) {
      act.classList.toggle('hidden', !activeUndoHandler);
    }

    el.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.add('hidden');
    }, activeUndoHandler ? 8000 : 3400);
  }

  function updateUndoButtonUi() {
    const btn = $('undoToolbarBtn');
    if (btn) {
      btn.classList.toggle('hidden', !canEdit() || !state.lastUndo);
    }
  }

  async function runLastUndo() {
    const fn = state.lastUndo;
    if (!fn || !canEdit()) return;
    state.lastUndo = null;
    activeUndoHandler = null;
    updateUndoButtonUi();
    $('toast').classList.add('hidden');
    await fn();
  }

  const TOKEN_STORAGE_KEY = 'calendario_auth_token';
  const CRED_PROOF_STORAGE_KEY = 'calendario_cred_proof';
  const CACHE_STORAGE_KEY = 'calendario_months_cache';

  function getStoredToken() {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  }

  function setStoredToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
  }

  function getStoredCredProof() {
    try {
      return localStorage.getItem(CRED_PROOF_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  }

  function setStoredCredProof(proof) {
    try {
      if (proof) localStorage.setItem(CRED_PROOF_STORAGE_KEY, proof);
      else localStorage.removeItem(CRED_PROOF_STORAGE_KEY);
    } catch {}
  }

  function readCachedMonths() {
    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.months === 'object') return parsed;
    } catch {}
    return null;
  }

  function writeCachedMonths(months, updatedAt) {
    try {
      localStorage.setItem(
        CACHE_STORAGE_KEY,
        JSON.stringify({ months, updatedAt: Number(updatedAt) || Date.now() })
      );
    } catch {}
  }

  async function syncWithServer() {
    try {
      const cached = readCachedMonths();
      const body = cached && canEdit() ? cached : {};
      const res = await apiFetch('/api/calendar/sync', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res && res.months) {
        writeCachedMonths(res.months, res.updatedAt || Date.now());
      }
    } catch {}
  }

  function updateLocalMonthCache(year, month, monthObj, updatedAt) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const cached = readCachedMonths() || { months: {}, updatedAt: 0 };
    cached.months[key] = monthObj;
    writeCachedMonths(cached.months, updatedAt || Date.now());
  }

  async function apiFetch(url, options = {}) {
    const token = getStoredToken();
    const credProof = getStoredCredProof();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(credProof ? { 'X-Admin-Cred-Proof': credProof } : {}),
      ...(options.headers || {}),
    };
    const opts = {
      credentials: 'same-origin',
      ...options,
      headers,
    };
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && url !== '/api/login' && url !== '/api/auth/setup' && url !== '/api/auth/status') {
      state.user = null;
      setStoredToken('');
      showLogin();
      throw new Error(data.error || 'Sessão expirada.');
    }
    if (!res.ok) {
      throw new Error(data.error || `Erro HTTP ${res.status}`);
    }
    return data;
  }

  function canEdit() {
    return !state.publicMode && Boolean(state.user && state.user.role === 'admin');
  }

  function evaluatePasswordRules(pw) {
    const val = pw || '';
    const rules = {
      len: val.length >= 8,
      upper: /[A-Z]/.test(val),
      lower: /[a-z]/.test(val),
      num: /[0-9]/.test(val),
      sym: /[^A-Za-z0-9\s]/.test(val),
    };
    const metCount = Object.values(rules).filter(Boolean).length;
    const allMet = metCount === 5;
    let level = 0;
    let label = 'Digite a senha';
    if (val.length > 0) {
      if (metCount <= 2) {
        level = 1;
        label = 'Fraca';
      } else if (metCount === 3) {
        level = 2;
        label = 'Regular';
      } else if (metCount === 4) {
        level = 3;
        label = 'Boa';
      } else {
        level = 4;
        label = val.length >= 12 ? 'Muito forte' : 'Forte';
      }
    }
    return { rules, allMet, level, label };
  }

  function updateStrengthUi(pw, fillId, labelId, checklistId) {
    const info = evaluatePasswordRules(pw);
    const fill = $(fillId);
    const lbl = $(labelId);
    const list = $(checklistId);
    if (fill) {
      fill.className = `pw-strength-fill${info.level ? ` level-${info.level}` : ''}`;
    }
    if (lbl) {
      lbl.textContent = info.label;
    }
    if (list) {
      list.querySelectorAll('li[data-rule]').forEach((li) => {
        li.classList.toggle('ok', Boolean(info.rules[li.dataset.rule]));
      });
    }
    return info;
  }

  // =========================
  // AUTENTICAÇÃO (EXCLUSIVO ADMIN)
  // =========================
  function showSetup() {
    stopVerseRotation();
    $('appView').classList.add('hidden');
    $('loginView').classList.add('hidden');
    $('setupView').classList.remove('hidden');
    $('setupError').classList.add('hidden');
    updateStrengthUi('', 'setupStrengthFill', 'setupStrengthLabel', 'setupPwChecklist');
    setTimeout(() => $('setupPassword').focus(), 50);
  }

  function showLogin() {
    stopVerseRotation();
    $('appView').classList.add('hidden');
    $('setupView').classList.add('hidden');
    $('loginView').classList.remove('hidden');
    $('loginError').classList.add('hidden');
    const setupBtn = $('goToSetupBtn');
    if (setupBtn) {
      setupBtn.classList.toggle('hidden', !state.setupRequired);
    }
    setTimeout(() => $('loginUsername').focus(), 50);
  }

  function showApp() {
    $('setupView').classList.add('hidden');
    $('loginView').classList.add('hidden');
    $('appView').classList.remove('hidden');

    const isPublic = state.publicMode;
    document.querySelectorAll('.admin-only').forEach((el) => {
      el.classList.toggle('hidden', isPublic);
    });
    document.querySelectorAll('.public-only').forEach((el) => {
      el.classList.toggle('hidden', !isPublic);
    });

    if (!isPublic && state.user) {
      $('userBadge').textContent = `${state.user.displayName} (@${state.user.username})`;
      $('editModeTip').textContent = 'Clique para editar ou arraste um dia para mover';
      $('verseEditBadge').classList.remove('hidden');
      $('calVerseBox').classList.remove('readonly');
    } else {
      $('editModeTip').textContent = 'Programação da Comunidade (somente visualização)';
      $('verseEditBadge').classList.add('hidden');
      $('calVerseBox').classList.add('readonly');
    }

    $('todayBanner').textContent = `Hoje: ${state.today.day} de ${MONTHS_CAP[state.today.month - 1]} de ${state.today.year}`;
    updateUndoButtonUi();

    // No celular (<= 768px), abre automaticamente no modo Lista / Agenda para leitura mais confortável
    if (!state.userPickedView && window.innerWidth <= 768) {
      setViewMode('list');
    } else {
      setViewMode(state.viewMode);
    }

    loadMonth(state.viewYear, state.viewMonth).then(() => {
      checkTomorrowReminder({ autoPopup: true });
    });
  }

  // =========================
  // FOLHA DE BLOCO DE NOTAS: ALERTA PARA AMANHÃ & PRÓXIMOS 7 DIAS
  // =========================
  function getCalendarApiPrefix() {
    return state.publicMode ? '/api/public/calendar' : '/api/calendar';
  }

  function getDayInfoOffset(offsetDays) {
    const dt = new Date(state.today.year, state.today.month - 1, state.today.day + offsetDays);
    const year = dt.getFullYear();
    const month = dt.getMonth() + 1;
    const day = dt.getDate();
    const dow = dt.getDay();
    const holidays = getBrazilianHolidays(year);
    const holidayName = holidays[`${month}-${day}`] || null;
    return {
      year,
      month,
      day,
      dow,
      cellKey: `day-${day}`,
      holidayName,
      dateLabel: `${WEEKDAYS_CAP[dow]}, ${day} de ${MONTHS_CAP[month - 1]} de ${year}`,
      shortLabel: `${WEEKDAYS_CAP[dow].split('-')[0]}, ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
    };
  }

  function getTomorrowInfo() {
    return getDayInfoOffset(1);
  }

  async function fetchMonthCellsCached(year, month, cacheObj) {
    const key = `${year}-${month}`;
    if (cacheObj[key]) return cacheObj[key];
    if (state.viewYear === year && state.viewMonth === month) {
      cacheObj[key] = state.monthData.cells || {};
      return cacheObj[key];
    }
    try {
      const res = await apiFetch(`${getCalendarApiPrefix()}/${year}/${month}`);
      cacheObj[key] = res.cells || {};
      return cacheObj[key];
    } catch {
      cacheObj[key] = {};
      return cacheObj[key];
    }
  }

  function cellHasRealAppointment(cellData, holidayName) {
    const hasCustom = Boolean(
      cellData &&
        (cellData.title ||
          cellData.notes ||
          cellData.tag ||
          (Array.isArray(cellData.schedule) && cellData.schedule.length > 0))
    );
    return Boolean(hasCustom || holidayName);
  }

  async function checkTomorrowReminder({ autoPopup = false } = {}) {
    const info = getTomorrowInfo();
    const monthCache = {};
    const cells = await fetchMonthCellsCached(info.year, info.month, monthCache);
    const cellData = cells[info.cellKey] || null;
    const hasAppointment = cellHasRealAppointment(cellData, info.holidayName);

    state.tomorrowReminder = { info, cellData, hasAppointment };

    const btn = $('tomorrowBtn');
    const dot = $('tomorrowDot');
    if (btn) btn.classList.toggle('has-alert', hasAppointment);
    if (dot) dot.classList.toggle('hidden', !hasAppointment);

    // Atualiza também o contador do painel rápido dos próximos 7 dias
    loadUpcomingWeekItems()
      .then((weekItems) => {
        const badge = $('weekCountBadge');
        if (badge) {
          badge.textContent = String(weekItems.length);
          badge.classList.toggle('hidden', weekItems.length === 0);
        }
      })
      .catch(() => {});

    if (autoPopup && hasAppointment && !state.tomorrowAlertShown) {
      state.tomorrowAlertShown = true;
      showTomorrowNotepad('tomorrow');
    }
  }

  async function loadUpcomingWeekItems() {
    const monthCache = {};
    const items = [];
    for (let offset = 1; offset <= 7; offset++) {
      const info = getDayInfoOffset(offset);
      const cells = await fetchMonthCellsCached(info.year, info.month, monthCache);
      const cellData = cells[info.cellKey] || null;
      if (cellHasRealAppointment(cellData, info.holidayName)) {
        items.push({ info, cellData, offset });
      }
    }
    return items;
  }

  async function showTomorrowNotepad(tab = 'tomorrow') {
    state.notepadTab = tab;
    $('notepadTabTomorrow').classList.toggle('active', tab === 'tomorrow');
    $('notepadTabWeek').classList.toggle('active', tab === 'week');
    $('notepadGoDayBtn').classList.toggle('hidden', tab !== 'tomorrow');

    const content = $('notepadContent');
    content.innerHTML = '';

    if (tab === 'week') {
      $('notepadAlertTitle').textContent = 'Próximos 7 Dias';
      const d1 = getDayInfoOffset(1);
      const d7 = getDayInfoOffset(7);
      $('notepadDateLabel').textContent = `${d1.shortLabel} até ${d7.shortLabel}`;
      content.innerHTML = '<div class="notepad-empty">Carregando compromissos da semana...</div>';
      openModal('tomorrowAlertModal');

      const items = await loadUpcomingWeekItems();
      content.innerHTML = '';
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'notepad-empty';
        empty.textContent = 'Nenhum compromisso agendado para os próximos 7 dias.';
        content.appendChild(empty);
        return;
      }

      const list = document.createElement('div');
      list.className = 'notepad-week-list';
      for (const item of items) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'notepad-week-item';

        const head = document.createElement('div');
        head.className = 'notepad-week-head';

        const dt = document.createElement('div');
        dt.className = 'notepad-week-date';
        dt.textContent = item.offset === 1 ? `Amanhã • ${item.info.shortLabel}` : item.info.shortLabel;
        head.appendChild(dt);

        if (item.cellData && item.cellData.liturgicalColor && LIT_LABELS[item.cellData.liturgicalColor]) {
          const lit = document.createElement('span');
          lit.className = `lit-badge lit-${item.cellData.liturgicalColor}`;
          lit.textContent = LIT_LABELS[item.cellData.liturgicalColor];
          head.appendChild(lit);
        }

        const titleRow = document.createElement('div');
        titleRow.className = 'notepad-title-row';

        const title = document.createElement('div');
        title.className = 'notepad-week-title';
        title.textContent =
          item.cellData?.title || item.info.holidayName || item.cellData?.tag || 'Compromisso agendado';
        titleRow.appendChild(title);

        const themeImg = resolveThemeImage(item.cellData, item.cellData?.title ? '' : item.info.holidayName);
        if (themeImg) {
          const img = document.createElement('img');
          img.className = 'theme-thumb theme-thumb-sm';
          img.src = themeImg.src;
          img.alt = themeImg.alt;
          titleRow.appendChild(img);
        }

        btn.append(head, titleRow);

        if (item.cellData && Array.isArray(item.cellData.schedule) && item.cellData.schedule.length > 0) {
          const sub = document.createElement('div');
          sub.className = 'notepad-week-sub';
          sub.textContent = item.cellData.schedule
            .map((s) => `${s.time ? `${s.time} ` : ''}${s.text}`)
            .join(' • ');
          btn.appendChild(sub);
        } else if (item.cellData && item.cellData.notes) {
          const sub = document.createElement('div');
          sub.className = 'notepad-week-sub';
          sub.textContent = item.cellData.notes.slice(0, 90);
          btn.appendChild(sub);
        }

        btn.addEventListener('click', async () => {
          closeModal('tomorrowAlertModal', true);
          state.flashCellKey = item.info.cellKey;
          await loadMonth(item.info.year, item.info.month);
        });
        list.appendChild(btn);
      }
      content.appendChild(list);
      return;
    }

    $('notepadAlertTitle').textContent = 'Lembrete para Amanhã';
    const reminder = state.tomorrowReminder;
    if (!reminder) return;
    const { info, cellData, hasAppointment } = reminder;

    $('notepadDateLabel').textContent = info.dateLabel;

    if (!hasAppointment) {
      const empty = document.createElement('div');
      empty.className = 'notepad-empty';
      empty.textContent = 'Nenhum compromisso agendado para amanhã. Clique em "Ir para o dia" se desejar adicionar um lembrete.';
      content.appendChild(empty);
      openModal('tomorrowAlertModal');
      return;
    }

    const hasTitle = Boolean(cellData && cellData.title);
    const themeImg = resolveThemeImage(cellData, hasTitle ? '' : info.holidayName);

    if (cellData && (cellData.tag || (cellData.liturgicalColor && LIT_LABELS[cellData.liturgicalColor]))) {
      const badges = document.createElement('div');
      badges.className = 'notepad-badges';
      if (cellData.tag) {
        const tagEl = document.createElement('span');
        tagEl.className = `cell-tag ${normalizeTagClass(cellData.tag)}`;
        tagEl.textContent = cellData.tag;
        badges.appendChild(tagEl);
      }
      if (cellData.liturgicalColor && LIT_LABELS[cellData.liturgicalColor]) {
        const litEl = document.createElement('span');
        litEl.className = `lit-badge lit-${cellData.liturgicalColor}`;
        litEl.textContent = LIT_LABELS[cellData.liturgicalColor];
        badges.appendChild(litEl);
      }
      content.appendChild(badges);
    }

    if (hasTitle) {
      const titleRow = document.createElement('div');
      titleRow.className = 'notepad-title-row';

      const titleEl = document.createElement('div');
      titleEl.className = 'notepad-event-title';
      titleEl.textContent = cellData.title;
      titleRow.appendChild(titleEl);

      if (themeImg) {
        const imgEl = document.createElement('img');
        imgEl.className = 'theme-thumb';
        imgEl.src = themeImg.src;
        imgEl.alt = themeImg.alt;
        titleRow.appendChild(imgEl);
      }

      content.appendChild(titleRow);
    }

    if (cellData && Array.isArray(cellData.schedule) && cellData.schedule.length > 0) {
      const schedWrap = document.createElement('div');
      schedWrap.className = 'cell-schedule';
      for (const s of cellData.schedule) {
        const row = document.createElement('div');
        row.className = 'cell-sched-row';
        if (s.time) {
          const t = document.createElement('span');
          t.className = 'cell-sched-time';
          t.textContent = s.time;
          row.appendChild(t);
        }
        const tx = document.createElement('span');
        tx.className = 'cell-sched-text';
        tx.textContent = s.text;
        row.appendChild(tx);
        schedWrap.appendChild(row);
      }
      content.appendChild(schedWrap);
    }

    if (cellData && cellData.notes) {
      const notesEl = document.createElement('p');
      notesEl.className = 'notepad-event-notes';
      notesEl.textContent = cellData.notes;
      content.appendChild(notesEl);
    }

    if (info.holidayName && !hasTitle) {
      const holEl = document.createElement('div');
      holEl.className = 'notepad-holiday-line';

      const holText = document.createElement('span');
      holText.textContent = `Feriado: ${info.holidayName}`;
      holEl.appendChild(holText);

      if (themeImg) {
        const imgEl = document.createElement('img');
        imgEl.className = 'theme-thumb theme-thumb-sm';
        imgEl.src = themeImg.src;
        imgEl.alt = themeImg.alt;
        holEl.appendChild(imgEl);
      }
      content.appendChild(holEl);
    }

    openModal('tomorrowAlertModal');
  }

  async function initSession() {
    if (state.publicMode) {
      try {
        const meta = await apiFetch('/api/public/meta');
        if (meta.serverToday) {
          state.today = meta.serverToday;
          state.viewYear = meta.serverToday.year;
          state.viewMonth = meta.serverToday.month;
        }
      } catch {}
      showApp();
      return;
    }

    state.setupRequired = false;
    try {
      const status = await apiFetch('/api/auth/status');
      state.setupRequired = Boolean(status.setupRequired);
    } catch {}

    if (!state.setupRequired) {
      try {
        const data = await apiFetch('/api/me');
        state.user = data.user;
        state.passwordUpdatedAt = data.passwordUpdatedAt || null;
        if (data.serverToday) {
          state.today = data.serverToday;
          state.viewYear = data.serverToday.year;
          state.viewMonth = data.serverToday.month;
        }
        await syncWithServer();
        showApp();
        return;
      } catch {}
    }

    showLogin();
  }

  const BIBLICAL_VERSES = [
    'Põe-se vinho novo em odres novos (Marcos 2. 22)',
    'Tudo o que fizerdes, fazei-o de todo o coração (Colossenses 3. 23)',
    'O Senhor é o meu pastor; nada me faltará (Salmos 23. 1)',
    'Lâmpada para os meus pés é a tua palavra e luz para o meu caminho (Salmos 119. 105)',
    'Tudo posso naquele que me fortalece (Filipenses 4. 13)',
    'Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará (Salmos 37. 5)',
    'Sê forte e corajoso; não temas, nem te espantes, porque o Senhor teu Deus é contigo (Josué 1. 9)',
    'Deixo-vos a paz, a minha paz vos dou (João 14. 27)',
    'O Senhor te abençoe e te guarde (Números 6. 24)',
    'Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração (Romanos 12. 12)',
    'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento (Provérbios 3. 5)',
    'Mas os que esperam no Senhor renovam as suas forças (Isaías 40. 31)',
    'Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus (Romanos 8. 28)',
    'Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei (Mateus 11. 28)',
    'Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia (Salmos 46. 1)',
    'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito (João 3. 16)',
    'Eu sou o caminho, a verdade e a vida (João 14. 6)',
    'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará (Salmos 91. 1)',
    'Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus (1 Tessalonicenses 5. 18)',
    'O choro pode durar uma noite, mas a alegria vem pela manhã (Salmos 30. 5)',
    'Buscai primeiro o Reino de Deus e a sua justiça, e todas estas coisas vos serão acrescentadas (Mateus 6. 33)',
    'A minha graça te basta, porque o meu poder se aperfeiçoa na fraqueza (2 Coríntios 12. 9)',
    'Porque onde estiverem dois ou três reunidos em meu nome, ali estou no meio deles (Mateus 18. 20)',
    'O amor é paciente, o amor é bondoso (1 Coríntios 13. 4)',
    'Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós (1 Pedro 5. 7)',
    'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus (Isaías 41. 10)',
    'Ensina-nos a contar os nossos dias, para que alcancemos coração sábio (Salmos 90. 12)',
    'Este é o dia que fez o Senhor; regozijemo-nos e alegremo-nos nele (Salmos 118. 24)',
    'Bendize, ó minha alma, ao Senhor, e não te esqueças de nenhum de seus benefícios (Salmos 103. 2)',
    'Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz (Jeremias 29. 11)',
    'Se Deus é por nós, quem será contra nós? (Romanos 8. 31)',
    'A fé é o firme fundamento das coisas que se esperam (Hebreus 11. 1)',
    'Sede misericordiosos, como também vosso Pai é misericordioso (Lucas 6. 36)',
    'O Senhor é a minha luz e a minha salvação; de quem terei medo? (Salmos 27. 1)',
    'Bem-aventurados os pacificadores, porque serão chamados filhos de Deus (Mateus 5. 9)',
    'Clama a mim, e responder-te-ei, e anunciar-te-ei coisas grandes e firmes (Jeremias 33. 3)',
    'Sede firmes e constantes, sempre abundantes na obra do Senhor (1 Coríntios 15. 58)',
    'O coração alegre aformoseia o rosto (Provérbios 15. 13)',
    'Permanecei em mim, e eu permanecerei em vós (João 15. 4)',
    'A paz de Deus, que excede todo o entendimento, guardará os vossos corações (Filipenses 4. 7)',
  ];

  let verseRotateTimer = null;
  let verseFadeTimer = null;
  let lastVerseText = '';

  function getVersePool() {
    const custom = (state.monthData?.verse || '').trim();
    if (custom && !BIBLICAL_VERSES.includes(custom)) {
      return [custom, ...BIBLICAL_VERSES];
    }
    return BIBLICAL_VERSES;
  }

  function pickRandomVerse(excludeText) {
    const pool = getVersePool();
    if (pool.length <= 1) return pool[0] || '';
    let candidate = pool[Math.floor(Math.random() * pool.length)];
    let tries = 0;
    while (candidate === excludeText && tries < 8) {
      candidate = pool[Math.floor(Math.random() * pool.length)];
      tries += 1;
    }
    return candidate;
  }

  function stopVerseRotation() {
    if (verseRotateTimer) {
      clearInterval(verseRotateTimer);
      verseRotateTimer = null;
    }
    if (verseFadeTimer) {
      clearTimeout(verseFadeTimer);
      verseFadeTimer = null;
    }
    const verseEl = $('calVerseText');
    if (verseEl) verseEl.classList.remove('fading');
  }

  function startVerseRotation() {
    stopVerseRotation();
    const verseEl = $('calVerseText');
    if (!verseEl) return;

    if (state.monthData.versePinned && state.monthData.verse) {
      verseEl.textContent = state.monthData.verse;
      verseEl.classList.remove('placeholder', 'fading');
      lastVerseText = state.monthData.verse;
      return;
    }

    const initialVerse = state.monthData.verse || pickRandomVerse(lastVerseText);
    verseEl.textContent = initialVerse;
    verseEl.classList.remove('placeholder', 'fading');
    lastVerseText = initialVerse;

    verseRotateTimer = setInterval(() => {
      if (document.hidden) return;
      const nextVerse = pickRandomVerse(lastVerseText);
      verseEl.classList.add('fading');
      verseFadeTimer = setTimeout(() => {
        verseEl.textContent = nextVerse;
        verseEl.classList.remove('fading');
        lastVerseText = nextVerse;
      }, 280);
    }, 5000);
  }

  // =========================
  // CARREGAMENTO & RENDERIZAÇÃO DO CALENDÁRIO
  // =========================
  async function loadMonth(year, month) {
    const safeYear = Math.max(1900, Math.min(2200, Number(year) || state.today.year));
    const safeMonth = Math.max(1, Math.min(12, Number(month) || state.today.month));
    state.viewYear = safeYear;
    state.viewMonth = safeMonth;

    $('monthSelect').value = String(safeMonth);
    $('yearInput').value = String(safeYear);
    $('calMonthLabel').textContent = MONTHS_PT[safeMonth - 1];
    $('calYearLabel').textContent = String(safeYear);

    try {
      const data = await apiFetch(`${getCalendarApiPrefix()}/${safeYear}/${safeMonth}`);
      state.monthData = {
        verse: data.verse || '',
        versePinned: Boolean(data.versePinned),
        cells: data.cells || {},
      };
      renderCalendar();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function setViewMode(mode) {
    state.viewMode = mode === 'list' ? 'list' : 'grid';
    $('viewGridBtn').classList.toggle('active', state.viewMode === 'grid');
    $('viewListBtn').classList.toggle('active', state.viewMode === 'list');
    $('calWeekdays').classList.toggle('hidden', state.viewMode === 'list');
    $('calGrid').classList.toggle('hidden', state.viewMode === 'list');
    $('agendaListView').classList.toggle('hidden', state.viewMode !== 'list');
    const frame = document.querySelector('.calendar-frame');
    if (frame) frame.classList.toggle('agenda-mode', state.viewMode === 'list');
    if (state.viewMode === 'grid') {
      requestAnimationFrame(() => fitAllCellTexts());
    }
  }

  function renderAgendaListView(year, month, daysInMonth, firstDayDow, holidays) {
    const container = $('agendaListView');
    container.innerHTML = '';
    const editable = canEdit();
    let count = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dow = (firstDayDow + day - 1) % 7;
      const cellKey = `day-${day}`;
      const cellData = state.monthData.cells[cellKey] || null;
      const holidayName = holidays[`${month}-${day}`] || null;
      const hasAny = Boolean(
        cellHasRealAppointment(cellData, holidayName) ||
          (cellData && cellData.liturgicalColor)
      );
      if (!hasAny) continue;
      count += 1;

      const card = document.createElement('div');
      card.className = 'agenda-card';
      if (!editable) card.classList.add('readonly');
      const isToday =
        year === state.today.year && month === state.today.month && day === state.today.day;
      if (isToday) card.classList.add('is-today');

      const dateCol = document.createElement('div');
      dateCol.className = 'agenda-date-col';
      const dNum = document.createElement('div');
      dNum.className = 'agenda-day-num';
      dNum.textContent = String(day).padStart(2, '0');
      const dWd = document.createElement('div');
      dWd.className = 'agenda-weekday';
      dWd.textContent = WEEKDAYS_CAP[dow].slice(0, 3);
      dateCol.append(dNum, dWd);

      const mainCol = document.createElement('div');
      mainCol.className = 'agenda-main-col';

      const badges = document.createElement('div');
      badges.className = 'notepad-badges';
      if (isToday) {
        const tp = document.createElement('span');
        tp.className = 'today-pill';
        tp.textContent = 'HOJE';
        badges.appendChild(tp);
      }
      if (cellData && cellData.tag) {
        const tg = document.createElement('span');
        tg.className = `cell-tag ${normalizeTagClass(cellData.tag)}`;
        tg.textContent = cellData.tag;
        badges.appendChild(tg);
      }
      if (cellData && cellData.liturgicalColor && LIT_LABELS[cellData.liturgicalColor]) {
        const lt = document.createElement('span');
        lt.className = `lit-badge lit-${cellData.liturgicalColor}`;
        lt.textContent = LIT_LABELS[cellData.liturgicalColor];
        badges.appendChild(lt);
      }
      if (badges.childElementCount) mainCol.appendChild(badges);

      const hasCustomTitle = Boolean(cellData && cellData.title);
      const themeImg = resolveThemeImage(cellData, hasCustomTitle ? '' : holidayName);

      if (hasCustomTitle) {
        const titleRow = document.createElement('div');
        titleRow.className = 'cell-title-row';
        const titleEl = document.createElement('div');
        titleEl.className = 'cell-title';
        titleEl.textContent = cellData.title;
        titleRow.appendChild(titleEl);
        if (themeImg) {
          const img = document.createElement('img');
          img.className = 'theme-thumb';
          img.src = themeImg.src;
          img.alt = themeImg.alt;
          titleRow.appendChild(img);
        }
        mainCol.appendChild(titleRow);
      }

      if (cellData && Array.isArray(cellData.schedule) && cellData.schedule.length > 0) {
        const sched = document.createElement('div');
        sched.className = 'cell-schedule';
        for (const s of cellData.schedule) {
          const r = document.createElement('div');
          r.className = 'cell-sched-row';
          if (s.time) {
            const tm = document.createElement('span');
            tm.className = 'cell-sched-time';
            tm.textContent = s.time;
            r.appendChild(tm);
          }
          const tx = document.createElement('span');
          tx.className = 'cell-sched-text';
          tx.textContent = s.text;
          r.appendChild(tx);
          sched.appendChild(r);
        }
        mainCol.appendChild(sched);
      }

      if (cellData && cellData.notes) {
        const notesEl = document.createElement('div');
        notesEl.className = 'cell-notes';
        notesEl.textContent = cellData.notes;
        mainCol.appendChild(notesEl);
      }

      if (holidayName && !hasCustomTitle) {
        const holEl = document.createElement('div');
        holEl.className = 'cell-holiday-auto';
        const holText = document.createElement('span');
        holText.className = 'cell-holiday-name';
        holText.textContent = holidayName;
        holEl.appendChild(holText);
        if (themeImg) {
          const img = document.createElement('img');
          img.className = 'theme-thumb theme-thumb-sm';
          img.src = themeImg.src;
          img.alt = themeImg.alt;
          holEl.appendChild(img);
        }
        mainCol.appendChild(holEl);
      }

      card.append(dateCol, mainCol);
      if (editable) {
        card.addEventListener('click', () => openCellModal(cellKey, dow, day, false, holidayName));
      }
      container.appendChild(card);
    }

    if (count === 0) {
      const empty = document.createElement('div');
      empty.className = 'agenda-empty';
      empty.textContent = `Nenhum compromisso cadastrado em ${MONTHS_CAP[month - 1]} de ${year}.`;
      container.appendChild(empty);
    }
  }

  function renderCalendar() {
    const year = state.viewYear;
    const month = state.viewMonth;

    // Versículo / Lema mensal com rotação aleatória a cada 5 segundos (ou fixo se marcado)
    startVerseRotation();

    const firstDayDow = new Date(year, month - 1, 1).getDay(); // 0=Dom .. 6=Sab
    const daysInMonth = new Date(year, month, 0).getDate();
    const totalUsed = firstDayDow + daysInMonth;
    const trailingPads = (7 - (totalUsed % 7)) % 7;
    const holidays = getBrazilianHolidays(year);

    const grid = $('calGrid');
    grid.innerHTML = '';

    // 1. Quadrados iniciais antes do dia 1 (editáveis para citações/notas)
    for (let i = 0; i < firstDayDow; i++) {
      const cellKey = `pad-start-${i}`;
      grid.appendChild(
        buildCellElement({
          cellKey,
          dow: i,
          dayNum: null,
          isPad: true,
          holidayName: null,
          cellData: state.monthData.cells[cellKey] || null,
        })
      );
    }

    // 2. Quadrados dos dias reais do mês (1 até daysInMonth)
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = (firstDayDow + day - 1) % 7;
      const cellKey = `day-${day}`;
      const holidayName = holidays[`${month}-${day}`] || null;
      grid.appendChild(
        buildCellElement({
          cellKey,
          dow,
          dayNum: day,
          isPad: false,
          holidayName,
          cellData: state.monthData.cells[cellKey] || null,
        })
      );
    }

    // 3. Quadrados finais após o último dia do mês (editáveis para notas)
    for (let j = 0; j < trailingPads; j++) {
      const dow = (firstDayDow + daysInMonth + j) % 7;
      const cellKey = `pad-end-${j}`;
      grid.appendChild(
        buildCellElement({
          cellKey,
          dow,
          dayNum: null,
          isPad: true,
          holidayName: null,
          cellData: state.monthData.cells[cellKey] || null,
        })
      );
    }

    if (state.flashCellKey) {
      const target = grid.querySelector(`[data-cell-key="${state.flashCellKey}"]`);
      if (target) {
        target.classList.add('search-flash');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      state.flashCellKey = null;
    }

    renderAgendaListView(year, month, daysInMonth, firstDayDow, holidays);
    requestAnimationFrame(() => fitAllCellTexts());
  }

  function fitCellText(bodyEl) {
    if (!bodyEl || !bodyEl.childElementCount) return;
    bodyEl.style.setProperty('--fit-scale', '1');
    if (bodyEl.scrollHeight <= bodyEl.clientHeight + 1 && bodyEl.scrollWidth <= bodyEl.clientWidth + 1) {
      return;
    }
    let low = 0.42;
    let high = 1.0;
    let best = low;
    for (let i = 0; i < 9; i++) {
      const mid = (low + high) / 2;
      bodyEl.style.setProperty('--fit-scale', mid.toFixed(3));
      if (bodyEl.scrollHeight <= bodyEl.clientHeight + 1 && bodyEl.scrollWidth <= bodyEl.clientWidth + 1) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }
    bodyEl.style.setProperty('--fit-scale', best.toFixed(3));
  }

  function fitAllCellTexts() {
    const grid = $('calGrid');
    if (!grid) return;
    grid.querySelectorAll('.cell-body').forEach((bodyEl) => fitCellText(bodyEl));
  }

  function buildCellElement({ cellKey, dow, dayNum, isPad, holidayName, cellData }) {
    const editable = canEdit();
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.dataset.cellKey = cellKey;
    cell.setAttribute('role', 'gridcell');

    if (dow === 0) cell.classList.add('col-sun');
    if (dow === 6) cell.classList.add('col-sat');
    if (isPad) cell.classList.add('is-pad');
    if (!editable) cell.classList.add('readonly');

    const isToday =
      dayNum !== null &&
      state.viewYear === state.today.year &&
      state.viewMonth === state.today.month &&
      dayNum === state.today.day;

    if (isToday) cell.classList.add('is-today');

    if (cellData && cellData.cellColor) {
      cell.classList.add(`theme-${cellData.cellColor}`);
    }
    if (cellData && cellData.isQuote) {
      cell.classList.add('is-quote');
    }

    // Linha superior: Número do dia + HOJE + Cor Litúrgica
    const topRow = document.createElement('div');
    topRow.className = 'cell-top-row';

    const dayWrap = document.createElement('div');
    dayWrap.className = 'cell-day-wrap';

    if (dayNum !== null) {
      const numSpan = document.createElement('span');
      numSpan.className = 'cell-day-num';
      numSpan.textContent = `${dayNum}.`;
      dayWrap.appendChild(numSpan);
    }

    if (isToday) {
      const todayBadge = document.createElement('span');
      todayBadge.className = 'today-pill';
      todayBadge.textContent = 'HOJE';
      dayWrap.appendChild(todayBadge);
    }

    topRow.appendChild(dayWrap);

    if (cellData && cellData.liturgicalColor && LIT_LABELS[cellData.liturgicalColor]) {
      const litBadge = document.createElement('span');
      litBadge.className = `lit-badge lit-${cellData.liturgicalColor}`;
      litBadge.textContent = LIT_LABELS[cellData.liturgicalColor];
      topRow.appendChild(litBadge);
    }

    if (dayNum !== null || (cellData && cellData.liturgicalColor)) {
      cell.appendChild(topRow);
    }

    // Corpo do quadrado
    const body = document.createElement('div');
    body.className = 'cell-body';

    const hasCustomTitle = Boolean(cellData && cellData.title);
    const themeImg = resolveThemeImage(cellData, hasCustomTitle ? '' : holidayName);

    if (cellData) {
      if (cellData.tag) {
        const tagEl = document.createElement('span');
        tagEl.className = `cell-tag ${normalizeTagClass(cellData.tag)}`;
        tagEl.textContent = cellData.tag;
        body.appendChild(tagEl);
      }
      if (cellData.title) {
        const titleRow = document.createElement('div');
        titleRow.className = 'cell-title-row';

        const titleEl = document.createElement('div');
        titleEl.className = 'cell-title';
        titleEl.textContent = cellData.title;
        titleRow.appendChild(titleEl);

        if (themeImg) {
          const imgEl = document.createElement('img');
          imgEl.className = 'theme-thumb';
          imgEl.src = themeImg.src;
          imgEl.alt = themeImg.alt;
          imgEl.title = themeImg.alt;
          imgEl.loading = 'lazy';
          titleRow.appendChild(imgEl);
        }

        body.appendChild(titleRow);
      }
      if (Array.isArray(cellData.schedule) && cellData.schedule.length > 0) {
        const schedWrap = document.createElement('div');
        schedWrap.className = 'cell-schedule';
        for (const item of cellData.schedule) {
          const row = document.createElement('div');
          row.className = 'cell-sched-row';
          if (item.time) {
            const tm = document.createElement('span');
            tm.className = 'cell-sched-time';
            tm.textContent = item.time;
            row.appendChild(tm);
          }
          const tx = document.createElement('span');
          tx.className = 'cell-sched-text';
          tx.textContent = item.text;
          row.appendChild(tx);
          schedWrap.appendChild(row);
        }
        body.appendChild(schedWrap);
      }
      if (cellData.notes) {
        const notesEl = document.createElement('div');
        notesEl.className = cellData.isQuote ? 'quote-text' : 'cell-notes';
        notesEl.textContent = cellData.notes;
        body.appendChild(notesEl);
      }
    }

    // Se houver feriado nacional e o usuário ainda não preencheu um título
    if (holidayName && !hasCustomTitle) {
      const holEl = document.createElement('div');
      holEl.className = 'cell-holiday-auto';

      const holText = document.createElement('span');
      holText.className = 'cell-holiday-name';
      holText.textContent = holidayName;
      holEl.appendChild(holText);

      if (themeImg) {
        const imgEl = document.createElement('img');
        imgEl.className = 'theme-thumb theme-thumb-sm';
        imgEl.src = themeImg.src;
        imgEl.alt = themeImg.alt;
        imgEl.title = themeImg.alt;
        imgEl.loading = 'lazy';
        holEl.appendChild(imgEl);
      }

      body.appendChild(holEl);
    }

    cell.appendChild(body);

    if (editable) {
      const hint = document.createElement('span');
      hint.className = 'cell-hover-hint no-print';
      hint.textContent = isPad ? '+ Nota / Citação' : 'Editar';
      cell.appendChild(hint);

      cell.tabIndex = 0;
      cell.addEventListener('click', () => openCellModal(cellKey, dow, dayNum, isPad, holidayName));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCellModal(cellKey, dow, dayNum, isPad, holidayName);
        }
      });

      // Arrastar e soltar entre dias reais do mês (segurar Ctrl/Alt para copiar)
      if (!isPad) {
        if (cellData) {
          cell.draggable = true;
          cell.addEventListener('dragstart', (e) => {
            state.dragSourceKey = cellKey;
            cell.classList.add('is-dragging');
            e.dataTransfer.effectAllowed = 'copyMove';
            e.dataTransfer.setData('text/plain', cellKey);
          });
          cell.addEventListener('dragend', () => {
            state.dragSourceKey = null;
            cell.classList.remove('is-dragging');
            document.querySelectorAll('.cal-cell.drop-target').forEach((el) => el.classList.remove('drop-target'));
          });
        }
        cell.addEventListener('dragover', (e) => {
          if (!state.dragSourceKey || state.dragSourceKey === cellKey) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = e.ctrlKey || e.altKey ? 'copy' : 'move';
          cell.classList.add('drop-target');
        });
        cell.addEventListener('dragleave', () => {
          cell.classList.remove('drop-target');
        });
        cell.addEventListener('drop', (e) => {
          e.preventDefault();
          cell.classList.remove('drop-target');
          const srcKey = state.dragSourceKey || e.dataTransfer.getData('text/plain');
          if (!srcKey || srcKey === cellKey) return;
          const isCopy = Boolean(e.ctrlKey || e.altKey);
          transferCellKey(srcKey, cellKey, isCopy ? 'copy' : 'move');
        });
      }
    }

    return cell;
  }

  // =========================
  // MODAL: EDITAR QUADRADO + HORÁRIOS + REPETIÇÃO + MOVER/COPIAR + CORES LITÚRGICAS AUTO + WHATSAPP PNG
  // =========================
  function openModal(id) {
    $(id).classList.remove('hidden');
  }

  function closeModal(id, force = false) {
    if (!force && id === 'cellModal' && state.cellModalDirty) {
      if (!window.confirm('Você tem alterações não salvas neste quadrado. Deseja sair sem salvar?')) {
        return false;
      }
    }
    if (!force && id === 'verseModal' && state.verseModalDirty) {
      if (!window.confirm('Você tem alterações não salvas no versículo/lema. Deseja sair sem salvar?')) {
        return false;
      }
    }
    if (id === 'cellModal') state.cellModalDirty = false;
    if (id === 'verseModal') state.verseModalDirty = false;
    $(id).classList.add('hidden');
    return true;
  }

  function markCellDirty() {
    state.cellModalDirty = true;
  }

  function cloneCell(c) {
    return c ? JSON.parse(JSON.stringify(c)) : null;
  }

  async function applyBatchUpdates(year, month, updates, successMsg, previousSnapshot = null) {
    try {
      const res = await apiFetch(`/api/calendar/${year}/${month}/batch-cells`, {
        method: 'POST',
        body: JSON.stringify({ updates }),
      });
      if (state.viewYear === year && state.viewMonth === month) {
        state.monthData.cells = res.cells || {};
        updateLocalMonthCache(year, month, state.monthData, res.updatedAt);
        renderCalendar();
      }
      const tInfo = getTomorrowInfo();
      if (year === tInfo.year && month === tInfo.month && Object.prototype.hasOwnProperty.call(updates, tInfo.cellKey)) {
        checkTomorrowReminder({ autoPopup: false });
      }
      const undoFn = previousSnapshot
        ? async () => {
            await applyBatchUpdates(year, month, previousSnapshot, 'Alteração desfeita!', null);
          }
        : null;
      if (successMsg) showToast(successMsg, 'success', undoFn);
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  }

  // Cálculo automático das Cores Litúrgicas (IECLB / Calendário Eclesiástico Luterano)
  function dateDiffDays(a, b) {
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((utcA - utcB) / 86400000);
  }

  function getFirstAdventSunday(year) {
    // 4º domingo antes de 25 de dezembro (entre 27/nov e 03/dez)
    const dec25 = new Date(year, 11, 25);
    const dow = dec25.getDay(); // 0=Dom..6=Sab
    const daysBackTo4thAdvent = dow === 0 ? 7 : dow;
    const fourthAdvent = addDays(dec25, -daysBackTo4thAdvent);
    return addDays(fourthAdvent, -21);
  }

  function getLiturgicalColorForSunday(year, month, day) {
    const dt = new Date(year, month - 1, day);
    const easter = getEasterDate(year);
    const diffEaster = dateDiffDays(dt, easter);
    const firstAdvent = getFirstAdventSunday(year);
    const diffAdvent = dateDiffDays(dt, firstAdvent);

    // Advento (4 domingos antes do Natal)
    if (diffAdvent >= 0 && dt < new Date(year, 11, 25)) return 'roxo';
    // Último domingo do Ano Eclesiástico / Cristo Rei (1 semana antes do 1º Advento)
    if (diffAdvent === -7) return 'branco';
    // Tempo do Natal e Epifania (25/dez até 1º domingo após 6/jan)
    if ((month === 12 && day >= 25) || (month === 1 && day <= 13)) return 'branco';
    // Transfiguração (domingo antes da Quarta-Feira de Cinzas = Páscoa - 49 dias)
    if (diffEaster === -49) return 'branco';
    // Quaresma e Domingo de Ramos (Páscoa - 42 até Páscoa - 7)
    if (diffEaster >= -42 && diffEaster <= -7) return 'roxo';
    // Tempo da Páscoa (Páscoa até 6 domingos depois)
    if (diffEaster >= 0 && diffEaster <= 42) return 'branco';
    // Pentecostes (Páscoa + 49)
    if (diffEaster === 49) return 'vermelho';
    // Santíssima Trindade (Páscoa + 56)
    if (diffEaster === 56) return 'branco';
    // Dia da Reforma (último domingo de outubro)
    if (month === 10 && day >= 25) return 'vermelho';
    // Demais domingos do Tempo Comum / após Epifania / após Pentecostes
    return 'verde';
  }

  async function applyAutoLiturgicalColors() {
    if (!canEdit()) return;
    const year = state.viewYear;
    const month = state.viewMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    const updates = {};
    const prevSnapshot = {};
    let count = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow !== 0) continue;
      const key = `day-${d}`;
      const existing = state.monthData.cells[key] || null;
      prevSnapshot[key] = cloneCell(existing);
      const color = getLiturgicalColorForSunday(year, month, d);
      updates[key] = {
        ...(existing || {}),
        liturgicalColor: color,
      };
      count += 1;
    }

    if (!count) return;
    await applyBatchUpdates(
      year,
      month,
      updates,
      `Cores litúrgicas aplicadas nos ${count} domingos de ${MONTHS_CAP[month - 1]}!`,
      prevSnapshot
    );
  }

  async function transferCellKey(srcKey, destKey, mode = 'move') {
    if (!canEdit() || !srcKey || !destKey || srcKey === destKey) return;
    const srcCell = state.monthData.cells[srcKey];
    if (!srcCell) {
      showToast('Este quadrado não possui conteúdo para copiar ou mover.', 'error');
      return;
    }
    const destPrev = state.monthData.cells[destKey] || null;
    if (destPrev) {
      const dLabel = destKey.replace('day-', 'dia ');
      if (!window.confirm(`O ${dLabel} já possui informações. Deseja substituir?`)) return;
    }

    const prevSnapshot = {
      [srcKey]: cloneCell(srcCell),
      [destKey]: cloneCell(destPrev),
    };
    const updates = {
      [destKey]: cloneCell(srcCell),
    };
    if (mode === 'move') {
      updates[srcKey] = null;
    }

    const destNum = destKey.replace('day-', '');
    const msg =
      mode === 'copy'
        ? `Compromisso copiado para o dia ${destNum}!`
        : `Compromisso movido para o dia ${destNum}!`;

    const ok = await applyBatchUpdates(state.viewYear, state.viewMonth, updates, msg, prevSnapshot);
    if (ok) {
      state.cellModalDirty = false;
      closeModal('cellModal', true);
    }
  }

  function addScheduleRow(time = '', text = '') {
    const list = $('scheduleEditorList');
    const row = document.createElement('div');
    row.className = 'schedule-editor-row';

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.value = time || '';
    timeInput.addEventListener('input', markCellDirty);

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.maxLength = 140;
    textInput.placeholder = 'Ex.: Culto Dominical, Ensaio do Coral...';
    textInput.value = text || '';
    textInput.addEventListener('input', markCellDirty);

    const rmBtn = document.createElement('button');
    rmBtn.type = 'button';
    rmBtn.className = 'schedule-remove-btn';
    rmBtn.title = 'Remover horário';
    rmBtn.textContent = '✕';
    rmBtn.addEventListener('click', () => {
      row.remove();
      markCellDirty();
    });

    row.append(timeInput, textInput, rmBtn);
    list.appendChild(row);
    return textInput;
  }

  function renderScheduleEditor(items) {
    const list = $('scheduleEditorList');
    list.innerHTML = '';
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        addScheduleRow(item.time || '', item.text || '');
      }
    }
  }

  function collectScheduleEditor() {
    const rows = $('scheduleEditorList').querySelectorAll('.schedule-editor-row');
    const list = [];
    rows.forEach((row) => {
      const time = row.querySelector('input[type="time"]')?.value?.trim() || '';
      const text = row.querySelector('input[type="text"]')?.value?.trim() || '';
      if (time || text) {
        list.push({ time, text });
      }
    });
    list.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
    return list;
  }

  function setSelectedLit(val) {
    state.selectedLitColor = val || '';
    document.querySelectorAll('#litColorPicker .lit-opt').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.lit === state.selectedLitColor);
    });
  }

  function setSelectedCellColor(val) {
    state.selectedCellColor = val || '';
    document.querySelectorAll('#cellColorPicker .swatch-opt').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.color === state.selectedCellColor);
    });
  }

  function setSelectedThemeImage(val) {
    state.selectedThemeImage = val || '';
    document.querySelectorAll('#themeImagePicker .theme-opt').forEach((btn) => {
      btn.classList.toggle('selected', !state.customImageData && btn.dataset.theme === state.selectedThemeImage);
    });
  }

  function setCustomImagePreview(dataUrl) {
    state.customImageData = dataUrl || '';
    const wrap = $('customImagePreviewWrap');
    const img = $('customImagePreview');
    if (state.customImageData) {
      img.src = state.customImageData;
      wrap.classList.remove('hidden');
      document.querySelectorAll('#themeImagePicker .theme-opt').forEach((b) => b.classList.remove('selected'));
    } else {
      img.src = '';
      wrap.classList.add('hidden');
      setSelectedThemeImage(state.selectedThemeImage);
    }
  }

  function resizeImageToDataUrl(file, size = 96) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Erro ao carregar o arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  function openCellModal(cellKey, dow, dayNum, isPad, holidayName) {
    if (!canEdit()) return;
    state.editingCellKey = cellKey;
    state.editingCellInfo = { cellKey, dow, dayNum, isPad, holidayName };
    const existing = state.monthData.cells[cellKey] || {};

    if (dayNum !== null) {
      $('cellModalTitle').textContent = `${WEEKDAYS_CAP[dow]}, ${dayNum} de ${MONTHS_CAP[state.viewMonth - 1]} de ${state.viewYear}`;
      $('cellModalSub').textContent = holidayName
        ? `Feriado nacional nesta data: ${holidayName}`
        : 'Personalize horários, informações, cor litúrgica, destaque e miniatura deste quadrado.';
    } else {
      $('cellModalTitle').textContent = `Quadrado Extra (${WEEKDAYS_CAP[dow]})`;
      $('cellModalSub').textContent = `Espaço complementar de ${MONTHS_CAP[state.viewMonth - 1]}/${state.viewYear} — ideal para citações, reflexões ou avisos gerais.`;
    }

    $('cellTitle').value = existing.title || '';
    $('cellTag').value = existing.tag || '';
    $('cellNotes').value = existing.notes || '';
    $('cellIsQuote').checked = Boolean(existing.isQuote);
    $('cellCustomImageInput').value = '';
    renderScheduleEditor(existing.schedule || []);

    setSelectedLit(existing.liturgicalColor || '');
    setSelectedCellColor(existing.cellColor || '');
    state.selectedThemeImage = existing.themeImage || '';
    setCustomImagePreview(existing.customImage || '');

    // Produtividade (repetição e copiar/mover disponíveis para dias reais)
    const prodBox = $('dayProductivityBox');
    if (dayNum !== null && !isPad) {
      prodBox.classList.remove('hidden');
      $('cellRepeatSelect').value = 'none';
      const pluralWd =
        dow === 0
          ? 'todos os Domingos'
          : dow === 6
          ? 'todos os Sábados'
          : `todas as ${WEEKDAYS_CAP[dow].replace('-feira', 's-feiras')}`;
      $('repeatWeekdayOption').textContent = `Repetir em ${pluralWd} deste mês`;

      const sel = $('transferDaySelect');
      sel.innerHTML = '';
      const daysInMonth = new Date(state.viewYear, state.viewMonth, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        if (d === dayNum) continue;
        const opt = document.createElement('option');
        opt.value = `day-${d}`;
        opt.textContent = `Dia ${String(d).padStart(2, '0')}`;
        sel.appendChild(opt);
      }
      const hasExisting = Boolean(state.monthData.cells[cellKey]);
      $('copyToDayBtn').disabled = !hasExisting;
      $('moveToDayBtn').disabled = !hasExisting;
    } else {
      prodBox.classList.add('hidden');
    }

    if (existing.updatedBy && existing.updatedAt) {
      $('cellMetaInfo').textContent = `Última edição por ${existing.updatedBy} em ${formatDateTimePt(existing.updatedAt)}`;
    } else {
      $('cellMetaInfo').textContent = '';
    }

    state.cellModalDirty = false;
    openModal('cellModal');
    setTimeout(() => $('cellTitle').focus(), 40);
  }

  async function saveCurrentCell(clearAll = false) {
    const key = state.editingCellKey;
    if (!key) return;
    const info = state.editingCellInfo;
    const repeatMode =
      !clearAll && info && !info.isPad && info.dayNum !== null
        ? $('cellRepeatSelect').value
        : 'none';

    const payload = clearAll
      ? {
          title: '',
          notes: '',
          schedule: [],
          liturgicalColor: '',
          cellColor: '',
          tag: '',
          themeImage: '',
          customImage: '',
          isQuote: false,
        }
      : {
          title: $('cellTitle').value,
          notes: $('cellNotes').value,
          schedule: collectScheduleEditor(),
          liturgicalColor: state.selectedLitColor,
          cellColor: state.selectedCellColor,
          tag: $('cellTag').value,
          themeImage: state.selectedThemeImage,
          customImage: state.customImageData,
          isQuote: $('cellIsQuote').checked,
        };

    // Repetição semanal em todos os dias iguais do mês
    if (repeatMode === 'weekday' && info && info.dow !== undefined) {
      const year = state.viewYear;
      const month = state.viewMonth;
      const daysInMonth = new Date(year, month, 0).getDate();
      const updates = {};
      const prevSnapshot = {};
      let count = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month - 1, d).getDay() !== info.dow) continue;
        const dKey = `day-${d}`;
        prevSnapshot[dKey] = cloneCell(state.monthData.cells[dKey] || null);
        updates[dKey] = { ...payload };
        count += 1;
      }

      const ok = await applyBatchUpdates(
        year,
        month,
        updates,
        `Compromisso aplicado em ${count} dias deste mês!`,
        prevSnapshot
      );
      if (ok) {
        state.cellModalDirty = false;
        closeModal('cellModal', true);
      }
      return;
    }

    const prevCell = cloneCell(state.monthData.cells[key] || null);
    try {
      const res = await apiFetch(`/api/calendar/${state.viewYear}/${state.viewMonth}/cell/${key}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res.cell) {
        state.monthData.cells[key] = res.cell;
      } else {
        delete state.monthData.cells[key];
      }
      updateLocalMonthCache(state.viewYear, state.viewMonth, state.monthData, res.updatedAt);
      renderCalendar();
      state.cellModalDirty = false;
      closeModal('cellModal', true);

      const undoYear = state.viewYear;
      const undoMonth = state.viewMonth;
      const undoFn = clearAll
        ? async () => {
            await applyBatchUpdates(undoYear, undoMonth, { [key]: prevCell }, 'Quadrado restaurado!', null);
          }
        : null;
      showToast(clearAll ? 'Quadrado limpo com sucesso!' : 'Alterações salvas!', 'success', undoFn);

      const tInfo = getTomorrowInfo();
      if (state.viewYear === tInfo.year && state.viewMonth === tInfo.month && key === tInfo.cellKey) {
        checkTomorrowReminder({ autoPopup: false });
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // =========================
  // EXPORTAR IMAGEM PRONTA PARA WHATSAPP (PNG HD COM LOGO DA PARÓQUIA)
  // =========================
  function loadImageAsset(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function wrapCanvasLines(ctx, text, maxWidth, maxLines = 10) {
    const result = [];
    const paragraphs = String(text || '').split(/\r?\n/);
    for (const para of paragraphs) {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) continue;
      let line = words[0];
      for (let i = 1; i < words.length; i++) {
        const test = `${line} ${words[i]}`;
        if (ctx.measureText(test).width <= maxWidth) {
          line = test;
        } else {
          result.push(line);
          line = words[i];
          if (result.length >= maxLines) break;
        }
      }
      if (result.length < maxLines) result.push(line);
      if (result.length >= maxLines) break;
    }
    return result;
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function exportCalendarWhatsAppPng() {
    showToast('Gerando imagem em alta definição para WhatsApp...', 'info');
    const year = state.viewYear;
    const month = state.viewMonth;
    const firstDayDow = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const totalSlots = firstDayDow + daysInMonth;
    const rows = Math.ceil(totalSlots / 7);
    const holidays = getBrazilianHolidays(year);

    const W = 1920;
    const pad = 28;
    const parishBarH = 74;
    const topHeaderH = 70;
    const wdHeaderH = 44;
    const rowH = rows <= 5 ? 202 : 172;
    const H = pad * 2 + parishBarH + topHeaderH + wdHeaderH + rows * rowH + 34;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Fundo limpo
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, W, H);

    const frameX = pad;
    const frameY = pad;
    const frameW = W - pad * 2;
    const frameH = H - pad * 2 - 24;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 12);
    ctx.fill();
    ctx.stroke();

    // Cabeçalho oficial com Logo da Paróquia
    const logoImg = await loadImageAsset('/images/logo-paroquia.png');
    if (logoImg) {
      ctx.drawImage(logoImg, frameX + 20, frameY + 11, 52, 52);
    }
    ctx.fillStyle = '#1e3a5f';
    ctx.font = '500 24px Inter, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Paróquia Evangélica de Confissão Luterana — Martim Lutero', frameX + 86, frameY + 28);
    ctx.fillStyle = '#64748b';
    ctx.font = '400 16px Inter, Segoe UI, sans-serif';
    ctx.fillText('IECLB • Cacoal – RO • Programação Mensal', frameX + 86, frameY + 53);

    const colW = frameW / 7;
    let y = frameY + parishBarH;

    // Faixa tripla: Mês | Versículo | Ano
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(frameX, y, colW, topHeaderH);
    ctx.fillRect(frameX + colW * 6, y, colW, topHeaderH);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(frameX + colW, y, colW * 5, topHeaderH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(frameX, y, frameW, topHeaderH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '500 28px Inter, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(MONTHS_PT[month - 1], frameX + colW / 2, y + topHeaderH / 2);
    ctx.fillText(String(year), frameX + colW * 6.5, y + topHeaderH / 2);

    const activeVerse =
      $('calVerseText')?.textContent?.trim() ||
      state.monthData.verse ||
      BIBLICAL_VERSES[0];
    ctx.fillStyle = '#0f172a';
    ctx.font = '400 21px Inter, Segoe UI, sans-serif';
    const verseLines = wrapCanvasLines(ctx, activeVerse, colW * 5 - 48, 2);
    if (verseLines.length === 1) {
      ctx.fillText(verseLines[0], frameX + frameW / 2, y + topHeaderH / 2);
    } else {
      ctx.fillText(verseLines[0], frameX + frameW / 2, y + topHeaderH / 2 - 13);
      ctx.fillText(verseLines[1], frameX + frameW / 2, y + topHeaderH / 2 + 13);
    }

    y += topHeaderH;

    // 7 dias da semana em azul profissional
    const wdNames = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
    for (let c = 0; c < 7; c++) {
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(frameX + c * colW, y, colW, wdHeaderH);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.strokeRect(frameX + c * colW, y, colW, wdHeaderH);
      ctx.fillStyle = '#ffffff';
      ctx.font = '500 16px Inter, Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(wdNames[c], frameX + c * colW + colW / 2, y + wdHeaderH / 2);
    }

    y += wdHeaderH;

    const LIT_STYLES = {
      branco: { bg: '#ffffff', fg: '#78350f', bd: '#d97706' },
      verde: { bg: '#ecfdf5', fg: '#065f46', bd: '#34d399' },
      vermelho: { bg: '#fef2f2', fg: '#991b1b', bd: '#f87171' },
      roxo: { bg: '#f5f3ff', fg: '#5b21b6', bd: '#a78bfa' },
      rosa: { bg: '#fdf2f8', fg: '#9d174d', bd: '#f472b6' },
      dourado: { bg: '#fffbeb', fg: '#92400e', bd: '#fbbf24' },
      preto: { bg: '#f1f5f9', fg: '#0f172a', bd: '#475569' },
    };

    const THEME_BG = {
      azul: { bg: '#eff6ff', bar: '#2563eb' },
      verde: { bg: '#ecfdf5', bar: '#059669' },
      amarelo: { bg: '#fffbeb', bar: '#d97706' },
      laranja: { bg: '#fff7ed', bar: '#ea580c' },
      vermelho: { bg: '#fef2f2', bar: '#dc2626' },
      roxo: { bg: '#f5f3ff', bar: '#7c3aed' },
      rosa: { bg: '#fdf2f8', bar: '#db2777' },
      teal: { bg: '#f0fdfa', bar: '#0d9488' },
      indigo: { bg: '#eef2ff', bar: '#1e3a8a' },
    };

    const totalCells = rows * 7;
    for (let idx = 0; idx < totalCells; idx++) {
      const r = Math.floor(idx / 7);
      const c = idx % 7;
      const cx = frameX + c * colW;
      const cy = y + r * rowH;

      let cellKey;
      let dayNum = null;
      if (idx < firstDayDow) {
        cellKey = `pad-start-${idx}`;
      } else if (idx < firstDayDow + daysInMonth) {
        dayNum = idx - firstDayDow + 1;
        cellKey = `day-${dayNum}`;
      } else {
        cellKey = `pad-end-${idx - (firstDayDow + daysInMonth)}`;
      }

      const cellData = state.monthData.cells[cellKey] || null;
      const holidayName = dayNum ? holidays[`${month}-${dayNum}`] || null : null;

      // Fundo da célula
      let bg = c === 0 ? '#eff6ff' : c === 6 || !dayNum ? '#f8fafc' : '#ffffff';
      let accentBar = c === 0 ? '#2563eb' : null;
      if (cellData && cellData.cellColor && THEME_BG[cellData.cellColor]) {
        bg = THEME_BG[cellData.cellColor].bg;
        accentBar = THEME_BG[cellData.cellColor].bar;
      }

      ctx.fillStyle = bg;
      ctx.fillRect(cx, cy, colW, rowH);
      if (accentBar) {
        ctx.fillStyle = accentBar;
        ctx.fillRect(cx, cy, 4, rowH);
      }
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, colW, rowH);

      // Linha superior: número do dia + cor litúrgica
      let curY = cy + 14;
      if (dayNum !== null) {
        ctx.fillStyle = c === 0 ? '#1e40af' : '#0f172a';
        ctx.font = '500 20px Inter, Segoe UI, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${dayNum}.`, cx + 12, curY);
      }

      if (cellData && cellData.liturgicalColor && LIT_STYLES[cellData.liturgicalColor]) {
        const st = LIT_STYLES[cellData.liturgicalColor];
        const lbl = LIT_LABELS[cellData.liturgicalColor];
        ctx.font = '500 13px Inter, Segoe UI, sans-serif';
        const tw = ctx.measureText(lbl).width;
        const pw = tw + 16;
        const px = cx + colW - pw - 10;
        ctx.fillStyle = st.bg;
        ctx.strokeStyle = st.bd;
        drawRoundedRect(ctx, px, curY + 1, pw, 22, 11);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = st.fg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lbl, px + pw / 2, curY + 12);
      }

      if (dayNum !== null) {
        curY += 30;
        ctx.strokeStyle = 'rgba(203,213,225,0.6)';
        ctx.beginPath();
        ctx.moveTo(cx + 10, curY);
        ctx.lineTo(cx + colW - 10, curY);
        ctx.stroke();
        curY += 8;
      }

      const maxTextW = colW - 22;
      const bottomLimit = cy + rowH - 10;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Título
      if (cellData && cellData.title) {
        ctx.fillStyle = '#0f172a';
        ctx.font = '500 15px Inter, Segoe UI, sans-serif';
        const tLines = wrapCanvasLines(ctx, cellData.title, maxTextW, 2);
        for (const ln of tLines) {
          if (curY + 18 > bottomLimit) break;
          ctx.fillText(ln, cx + 12, curY);
          curY += 19;
        }
        curY += 2;
      }

      // Horários estruturados
      if (cellData && Array.isArray(cellData.schedule) && cellData.schedule.length > 0) {
        ctx.font = '400 13px Inter, Segoe UI, sans-serif';
        for (const s of cellData.schedule) {
          const txt = s.time ? `${s.time}  ${s.text}` : s.text;
          const sLines = wrapCanvasLines(ctx, txt, maxTextW, 2);
          ctx.fillStyle = '#1e3a8a';
          for (const ln of sLines) {
            if (curY + 16 > bottomLimit) break;
            ctx.fillText(ln, cx + 12, curY);
            curY += 17;
          }
        }
        curY += 2;
      }

      // Notas
      if (cellData && cellData.notes) {
        ctx.fillStyle = '#334155';
        ctx.font = cellData.isQuote ? 'italic 400 13px Inter, Segoe UI, sans-serif' : '400 13px Inter, Segoe UI, sans-serif';
        const remainLines = Math.max(1, Math.floor((bottomLimit - curY) / 17));
        const nLines = wrapCanvasLines(ctx, cellData.notes, maxTextW, remainLines);
        for (const ln of nLines) {
          if (curY + 16 > bottomLimit) break;
          ctx.fillText(ln, cx + 12, curY);
          curY += 17;
        }
      }

      // Feriado automático
      if (holidayName && (!cellData || !cellData.title)) {
        ctx.font = '400 12px Inter, Segoe UI, sans-serif';
        const hLines = wrapCanvasLines(ctx, holidayName, maxTextW - 12, 2);
        const boxH = hLines.length * 15 + 8;
        const hy = cy + rowH - boxH - 8;
        ctx.fillStyle = '#fef2f2';
        ctx.strokeStyle = '#fecaca';
        drawRoundedRect(ctx, cx + 10, hy, colW - 20, boxH, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#991b1b';
        hLines.forEach((ln, i) => ctx.fillText(ln, cx + 16, hy + 5 + i * 15));
      }
    }

    // Rodapé discreto
    ctx.fillStyle = '#64748b';
    ctx.font = '400 13px Inter, Segoe UI, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Calendário Mensal • ${MONTHS_CAP[month - 1]} ${year}`, W - pad, H - 14);

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    const slugMonth = MONTHS_CAP[month - 1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    a.href = dataUrl;
    a.download = `calendario-${slugMonth}-${year}-whatsapp.png`;
    a.click();
    showToast('Imagem pronta para WhatsApp baixada!', 'success');
  }

  // =========================
  // MODAL: VERSÍCULO / LEMA DO MÊS
  // =========================
  function openVerseModal() {
    if (!canEdit()) return;
    $('verseModalSub').textContent = `${MONTHS_CAP[state.viewMonth - 1]} de ${state.viewYear} • Rotação automática a cada 5s`;
    $('verseInput').value = state.monthData.verse || '';
    $('versePinCheckbox').checked = Boolean(state.monthData.versePinned);
    state.verseModalDirty = false;
    openModal('verseModal');
    setTimeout(() => $('verseInput').focus(), 40);
  }

  async function saveVerse(verseText, versePinned = false) {
    try {
      const res = await apiFetch(`/api/calendar/${state.viewYear}/${state.viewMonth}/verse`, {
        method: 'PUT',
        body: JSON.stringify({ verse: verseText, versePinned: Boolean(versePinned) }),
      });
      state.monthData.verse = res.verse;
      state.monthData.versePinned = Boolean(res.versePinned);
      updateLocalMonthCache(state.viewYear, state.viewMonth, state.monthData, res.updatedAt);
      renderCalendar();
      state.verseModalDirty = false;
      closeModal('verseModal', true);
      showToast(
        state.monthData.versePinned
          ? 'Versículo fixado neste mês!'
          : 'Rotação automática de versículos (5s) ativada!',
        'success'
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // =========================
  // BUSCA GLOBAL
  // =========================
  async function performSearch() {
    const q = $('searchInput').value.trim();
    const container = $('searchResults');
    if (!q) {
      container.innerHTML = '<div class="empty-state">Digite um termo para pesquisar.</div>';
      return;
    }
    container.innerHTML = '<div class="empty-state">Pesquisando...</div>';
    try {
      const data = await apiFetch(`/api/calendar/search?q=${encodeURIComponent(q)}`);
      if (!data.results.length) {
        container.innerHTML = '<div class="empty-state">Nenhum resultado encontrado.</div>';
        return;
      }
      container.innerHTML = '';
      for (const item of data.results) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'search-item';
        const dayText = item.cellKey.startsWith('day-')
          ? `Dia ${item.cellKey.replace('day-', '')}`
          : item.cellKey === 'verse'
          ? 'Lema do Mês'
          : 'Quadrado Extra';

        const head = document.createElement('div');
        head.className = 'search-item-head';
        head.textContent = `${MONTHS_PT[item.month - 1]} ${item.year} • ${dayText}`;

        const title = document.createElement('div');
        title.className = 'search-item-title';
        title.textContent = item.title;

        const snippet = document.createElement('div');
        snippet.className = 'search-item-snippet';
        snippet.textContent = item.snippet;

        btn.append(head, title);
        if (item.snippet) btn.append(snippet);

        btn.addEventListener('click', () => {
          closeModal('searchModal');
          if (item.cellKey !== 'verse') {
            state.flashCellKey = item.cellKey;
          }
          loadMonth(item.year, item.month);
        });
        container.appendChild(btn);
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state">${err.message}</div>`;
    }
  }

  // =========================
  // SEGURANÇA DO ADMIN & BACKUP
  // =========================
  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach((p) => {
      p.classList.toggle('active', p.id === tabId);
    });
  }

  function showEnvHashHint(hashVal) {
    if (!hashVal) return;
    $('envHashInput').value = hashVal;
    $('envHashBox').classList.remove('hidden');
  }

  function openSecurityModal() {
    $('secUsername').value = state.user?.username || 'admin';
    $('secDisplayName').value = state.user?.displayName || 'Administrador';
    $('curPass').value = '';
    $('newPass').value = '';
    $('confirmPass').value = '';
    $('changePassError').classList.add('hidden');
    updateStrengthUi('', 'changeStrengthFill', 'changeStrengthLabel', 'changePwChecklist');
    $('passwordUpdatedMeta').textContent = state.passwordUpdatedAt
      ? `Última alteração de senha em ${formatDateTimePt(state.passwordUpdatedAt)}`
      : '';
    switchTab('tabPassword');
    openModal('securityModal');
  }

  // =========================
  // LISTENERS DE EVENTOS
  // =========================
  function bindEvents() {
    // Alternar visibilidade de qualquer campo de senha
    document.querySelectorAll('.toggle-pw-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const inp = $(btn.dataset.target);
        if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
      });
    });

    // Medidores de força de senha ao vivo
    $('setupPassword').addEventListener('input', (e) => {
      updateStrengthUi(e.target.value, 'setupStrengthFill', 'setupStrengthLabel', 'setupPwChecklist');
    });
    $('newPass').addEventListener('input', (e) => {
      updateStrengthUi(e.target.value, 'changeStrengthFill', 'changeStrengthLabel', 'changePwChecklist');
    });

    // Configuração inicial — Criar Senha do Administrador
    $('setupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = $('setupError');
      errBox.classList.add('hidden');

      const username = $('setupUsername').value.trim();
      const displayName = $('setupDisplayName').value.trim();
      const password = $('setupPassword').value;
      const confirm = $('setupPasswordConfirm').value;

      const check = evaluatePasswordRules(password);
      if (!check.allMet) {
        errBox.textContent = 'A senha precisa atender a todos os 5 requisitos de segurança listados acima.';
        errBox.classList.remove('hidden');
        return;
      }
      if (password !== confirm) {
        errBox.textContent = 'A confirmação da senha não confere.';
        errBox.classList.remove('hidden');
        return;
      }

      $('setupSubmitBtn').disabled = true;
      try {
        const res = await apiFetch('/api/auth/setup', {
          method: 'POST',
          body: JSON.stringify({ username, displayName, password }),
        });
        if (res.token) setStoredToken(res.token);
        if (res.credProof) setStoredCredProof(res.credProof);
        if (res.envHashHint) showEnvHashHint(res.envHashHint);
        state.setupRequired = false;
        $('setupPassword').value = '';
        $('setupPasswordConfirm').value = '';
        await initSession();
        showToast('Senha do administrador criada com segurança!', 'success');
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      } finally {
        $('setupSubmitBtn').disabled = false;
      }
    });

    // Alternar entre Login e Configuração Inicial
    $('goToSetupBtn').addEventListener('click', () => {
      showSetup();
    });

    $('backToLoginBtn').addEventListener('click', () => {
      showLogin();
    });

    // Login exclusivo do Administrador
    $('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = $('loginError');
      errBox.classList.add('hidden');
      const username = $('loginUsername').value.trim();
      const password = $('loginPassword').value;
      const remember = $('loginRemember').checked;

      $('loginSubmitBtn').disabled = true;
      try {
        const res = await apiFetch('/api/login', {
          method: 'POST',
          body: JSON.stringify({
            username,
            password,
            remember,
            credProof: getStoredCredProof(),
          }),
        });
        if (res.token) setStoredToken(res.token);
        if (res.credProof) setStoredCredProof(res.credProof);
        state.setupRequired = false;
        $('loginPassword').value = '';
        await initSession();
        showToast('Acesso administrativo autorizado.', 'success');
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      } finally {
        $('loginSubmitBtn').disabled = false;
      }
    });

    // Logout
    $('logoutBtn').addEventListener('click', async () => {
      await apiFetch('/api/logout', { method: 'POST' }).catch(() => {});
      setStoredToken('');
      state.user = null;
      state.tomorrowAlertShown = false;
      closeModal('tomorrowAlertModal');
      showLogin();
    });

    // Lembretes (Amanhã e Próximos 7 dias)
    $('tomorrowBtn').addEventListener('click', async () => {
      await checkTomorrowReminder({ autoPopup: false });
      showTomorrowNotepad('tomorrow');
    });

    $('weekPanelBtn').addEventListener('click', async () => {
      await checkTomorrowReminder({ autoPopup: false });
      showTomorrowNotepad('week');
    });

    $('notepadTabTomorrow').addEventListener('click', () => showTomorrowNotepad('tomorrow'));
    $('notepadTabWeek').addEventListener('click', () => showTomorrowNotepad('week'));

    $('notepadGoDayBtn').addEventListener('click', async () => {
      const info = state.tomorrowReminder?.info || getTomorrowInfo();
      closeModal('tomorrowAlertModal', true);
      state.flashCellKey = info.cellKey;
      await loadMonth(info.year, info.month);
    });

    // Compartilhamento WhatsApp PNG + Link Comunidade + Área do Admin
    $('exportPngBtn').addEventListener('click', () => exportCalendarWhatsAppPng());

    $('shareLinkBtn').addEventListener('click', async () => {
      const publicUrl = `${window.location.origin}/comunidade`;
      try {
        await navigator.clipboard.writeText(publicUrl);
        showToast('Link público da comunidade copiado! Compartilhe no WhatsApp.', 'success');
      } catch {
        window.prompt('Copie o link público somente leitura para a comunidade:', publicUrl);
      }
    });

    $('enterAdminBtn').addEventListener('click', () => {
      window.location.href = '/';
    });

    // Cores Litúrgicas Automáticas do Mês (IECLB) + Desfazer na barra
    $('autoLiturgicalBtn').addEventListener('click', () => applyAutoLiturgicalColors());
    $('undoToolbarBtn').addEventListener('click', () => runLastUndo());

    // Alternância Grade / Lista
    $('viewGridBtn').addEventListener('click', () => {
      state.userPickedView = true;
      setViewMode('grid');
    });
    $('viewListBtn').addEventListener('click', () => {
      state.userPickedView = true;
      setViewMode('list');
    });

    // Botão Desfazer dentro do Toast
    $('toastActionBtn').addEventListener('click', () => runLastUndo());

    // Navegação de Mês e Ano
    $('prevMonthBtn').addEventListener('click', () => {
      let m = state.viewMonth - 1;
      let y = state.viewYear;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      loadMonth(y, m);
    });

    $('nextMonthBtn').addEventListener('click', () => {
      let m = state.viewMonth + 1;
      let y = state.viewYear;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      loadMonth(y, m);
    });

    $('monthSelect').addEventListener('change', (e) => {
      loadMonth(state.viewYear, Number(e.target.value));
    });

    $('yearInput').addEventListener('change', (e) => {
      loadMonth(Number(e.target.value), state.viewMonth);
    });

    $('todayBtn').addEventListener('click', () => {
      loadMonth(state.today.year, state.today.month);
    });

    $('sample2027Btn').addEventListener('click', () => {
      loadMonth(2027, 1);
    });

    // Versículo
    $('calVerseBox').addEventListener('click', openVerseModal);
    $('calVerseBox').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openVerseModal();
      }
    });

    $('verseInput').addEventListener('input', () => {
      state.verseModalDirty = true;
    });
    $('versePinCheckbox').addEventListener('change', () => {
      state.verseModalDirty = true;
    });

    $('verseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveVerse($('verseInput').value, $('versePinCheckbox').checked);
    });

    $('clearVerseBtn').addEventListener('click', () => {
      saveVerse('', false);
    });

    // Modal de Célula + Horários + Copiar/Mover + Aviso de alteração não salva
    $('cellForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveCurrentCell(false);
    });

    $('clearCellBtn').addEventListener('click', () => {
      saveCurrentCell(true);
    });

    ['cellTitle', 'cellTag', 'cellNotes'].forEach((id) => {
      $(id).addEventListener('input', markCellDirty);
    });
    $('cellIsQuote').addEventListener('change', markCellDirty);
    $('cellRepeatSelect').addEventListener('change', markCellDirty);

    $('addScheduleBtn').addEventListener('click', () => {
      const input = addScheduleRow('', '');
      markCellDirty();
      input.focus();
    });

    $('copyToDayBtn').addEventListener('click', () => {
      const destKey = $('transferDaySelect').value;
      if (state.editingCellKey && destKey) {
        transferCellKey(state.editingCellKey, destKey, 'copy');
      }
    });

    $('moveToDayBtn').addEventListener('click', () => {
      const destKey = $('transferDaySelect').value;
      if (state.editingCellKey && destKey) {
        transferCellKey(state.editingCellKey, destKey, 'move');
      }
    });

    document.querySelectorAll('#litColorPicker .lit-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        setSelectedLit(btn.dataset.lit);
        markCellDirty();
      });
    });

    document.querySelectorAll('#cellColorPicker .swatch-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        setSelectedCellColor(btn.dataset.color);
        markCellDirty();
      });
    });

    document.querySelectorAll('#themeImagePicker .theme-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.customImageData = '';
        $('cellCustomImageInput').value = '';
        $('customImagePreviewWrap').classList.add('hidden');
        setSelectedThemeImage(btn.dataset.theme);
        markCellDirty();
      });
    });

    $('cellCustomImageInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await resizeImageToDataUrl(file, 96);
        setCustomImagePreview(dataUrl);
        markCellDirty();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    $('removeCustomImageBtn').addEventListener('click', () => {
      $('cellCustomImageInput').value = '';
      setCustomImagePreview('');
      markCellDirty();
    });

    document.querySelectorAll('.qtag').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('cellTag').value = btn.dataset.tag;
        markCellDirty();
      });
    });

    // Imprimir
    $('printBtn').addEventListener('click', () => window.print());

    // Busca
    $('openSearchBtn').addEventListener('click', () => {
      openModal('searchModal');
      setTimeout(() => $('searchInput').focus(), 40);
    });
    $('doSearchBtn').addEventListener('click', performSearch);
    $('searchInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performSearch();
    });

    // Segurança do Administrador & Backup
    $('openSecurityBtn').addEventListener('click', openSecurityModal);

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    $('changePasswordForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = $('changePassError');
      errBox.classList.add('hidden');

      const username = $('secUsername').value.trim();
      const displayName = $('secDisplayName').value.trim();
      const currentPassword = $('curPass').value;
      const newPassword = $('newPass').value;
      const confirmPass = $('confirmPass').value;

      const check = evaluatePasswordRules(newPassword);
      if (!check.allMet) {
        errBox.textContent = 'A nova senha precisa atender a todos os 5 requisitos de segurança.';
        errBox.classList.remove('hidden');
        return;
      }
      if (newPassword !== confirmPass) {
        errBox.textContent = 'A confirmação da nova senha não confere.';
        errBox.classList.remove('hidden');
        return;
      }

      try {
        const res = await apiFetch('/api/me/password', {
          method: 'PUT',
          body: JSON.stringify({ username, displayName, currentPassword, newPassword }),
        });
        if (res.token) setStoredToken(res.token);
        if (res.credProof) setStoredCredProof(res.credProof);
        if (res.user) {
          state.user = res.user;
          $('userBadge').textContent = `${state.user.displayName} (@${state.user.username})`;
        }
        if (res.passwordUpdatedAt) {
          state.passwordUpdatedAt = res.passwordUpdatedAt;
          $('passwordUpdatedMeta').textContent = `Última alteração de senha em ${formatDateTimePt(state.passwordUpdatedAt)}`;
        }
        if (res.envHashHint) showEnvHashHint(res.envHashHint);
        $('curPass').value = '';
        $('newPass').value = '';
        $('confirmPass').value = '';
        updateStrengthUi('', 'changeStrengthFill', 'changeStrengthLabel', 'changePwChecklist');
        showToast(res.message || 'Senha atualizada com segurança!', 'success');
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      }
    });

    $('revokeAllBtn').addEventListener('click', async () => {
      if (!window.confirm('Encerrar todas as sessões ativas em todos os navegadores? Você precisará fazer login novamente.')) {
        return;
      }
      try {
        const res = await apiFetch('/api/auth/revoke-all', { method: 'POST' });
        if (res.credProof) setStoredCredProof(res.credProof);
        setStoredToken('');
        state.user = null;
        closeModal('securityModal');
        showLogin();
        showToast('Todas as sessões foram encerradas.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    $('copyEnvHashBtn').addEventListener('click', async () => {
      const val = $('envHashInput').value;
      if (!val) return;
      try {
        await navigator.clipboard.writeText(val);
        showToast('Hash copiado para a área de transferência!', 'success');
      } catch {
        $('envHashInput').select();
        document.execCommand('copy');
        showToast('Hash copiado!', 'success');
      }
    });

    $('exportBackupBtn').addEventListener('click', async () => {
      try {
        const data = await apiFetch('/api/backup');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-calendario-${state.today.year}-${String(state.today.month).padStart(2, '0')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup baixado com sucesso!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    $('restoreBackupBtn').addEventListener('click', async () => {
      const file = $('restoreFileInput').files[0];
      if (!file) {
        showToast('Selecione um arquivo .json primeiro.', 'error');
        return;
      }
      if (!window.confirm('Restaurar este backup substituirá os dados atuais dos meses. Deseja continuar?')) {
        return;
      }
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const res = await apiFetch('/api/restore', {
          method: 'POST',
          body: JSON.stringify(json),
        });
        if (json.months) writeCachedMonths(json.months, res.updatedAt || Date.now());
        showToast('Backup restaurado com sucesso!', 'success');
        loadMonth(state.viewYear, state.viewMonth);
      } catch (err) {
        showToast(err.message || 'Erro ao ler o arquivo de backup.', 'error');
      }
    });

    // Fechar modais (com proteção de alterações não salvas no editor de quadrado)
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal(backdrop.id);
      });
    });

    document.addEventListener('keydown', (e) => {
      const openModals = Array.from(document.querySelectorAll('.modal-backdrop:not(.hidden)'));
      if (e.key === 'Escape' && openModals.length > 0) {
        closeModal(openModals[openModals.length - 1].id);
        return;
      }

      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (inInput || openModals.length > 0 || $('appView').classList.contains('hidden')) return;

      // Ctrl+Z: Desfazer última ação
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && state.lastUndo && canEdit()) {
        e.preventDefault();
        runLastUndo();
        return;
      }

      // Setas esquerda/direita: trocar mês rapidamente
      if (e.key === 'ArrowLeft') {
        $('prevMonthBtn').click();
      } else if (e.key === 'ArrowRight') {
        $('nextMonthBtn').click();
      }
    });

    window.addEventListener('beforeunload', (e) => {
      if (state.cellModalDirty || state.verseModalDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => fitAllCellTexts(), 100);
    });
    window.addEventListener('beforeprint', () => {
      stopVerseRotation();
      fitAllCellTexts();
    });
    window.addEventListener('afterprint', () => {
      startVerseRotation();
      fitAllCellTexts();
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => fitAllCellTexts());
    }
  }

  bindEvents();
  initSession();
})();
