/* ============================================================
   Mi Refri Inteligente — store
   Estado + persistencia local (localStorage) + lógica de dominio.
   ============================================================ */

(function () {
  const STORAGE_KEY = 'mi-refri-inteligente.v1';
  const STATE_VERSION = 1;

  const { CATALOG, CATALOG_BY_ID, UNIT_STEP, CATEGORIES } = window.REFRI;

  /* ---------- utilidades de fecha ---------- */

  const pad = (n) => String(n).padStart(2, '0');

  function toISO(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function todayISO() {
    return toISO(new Date());
  }

  function addDaysISO(days) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return toISO(d);
  }

  function daysUntil(iso) {
    if (!iso) return 999;
    const [y, m, d] = iso.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((target - now) / 86400000);
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  const round = (n, decimals = 2) => Math.round(n * 10 ** decimals) / 10 ** decimals;

  function fmtQty(qty, unit) {
    const value = round(Number(qty) || 0, 2);
    const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return `${text} ${unit || ''}`.trim();
  }

  function fmtMoney(value) {
    return '$' + (round(Number(value) || 0, 2)).toFixed(2);
  }

  function fmtDateLong(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
  }

  /* ---------- semilla de demostración ---------- */

  function seedItem(catalogId, qty, expiresIn, addedDaysAgo, priceOverride) {
    const c = CATALOG_BY_ID[catalogId];
    return {
      id: uid(),
      catalogId,
      name: c.name,
      emoji: c.emoji,
      category: c.category,
      unit: c.unit,
      qty,
      price: priceOverride != null ? priceOverride : round(c.price * (qty / catalogDefaultQty(c)), 2),
      expiresAt: addDaysISO(expiresIn),
      addedAt: addDaysISO(-addedDaysAgo),
    };
  }

  function catalogDefaultQty(c) {
    switch (c.unit) {
      case 'g': return 250;
      case 'kg': return 1;
      case 'L': return 1;
      case 'ml': return 250;
      default: return 4;
    }
  }

  function seedHistoryEntry(catalogId, type, value, daysAgo, source) {
    const c = CATALOG_BY_ID[catalogId];
    return {
      id: uid(),
      catalogId,
      name: c.name,
      emoji: c.emoji,
      type,
      value: round(value, 2),
      date: addDaysISO(-daysAgo),
      source: source || 'consumo',
    };
  }

  function buildSeed() {
    const items = [
      seedItem('leche', 1, 2, 2),
      seedItem('huevos', 8, 12, 4),
      seedItem('queso', 250, 6, 3),
      seedItem('yogur', 3, 4, 5),
      seedItem('mantequilla', 200, 25, 10),
      seedItem('tomate', 4, 1, 3),
      seedItem('lechuga', 1, 3, 2),
      seedItem('zanahoria', 5, 14, 6),
      seedItem('cebolla', 3, 20, 9),
      seedItem('pimiento', 2, 7, 4),
      seedItem('espinaca', 1, 0, 3),
      seedItem('ajo', 1, 45, 14),
      seedItem('aguacate', 1, 2, 2),
      seedItem('manzana', 4, 8, 5),
      seedItem('platano', 5, 3, 4),
      seedItem('limon', 6, 10, 5),
      seedItem('pollo', 500, 1, 1),
      seedItem('atun', 2, 300, 25),
      seedItem('arroz', 1, 200, 30),
      seedItem('pasta', 500, 200, 20),
      seedItem('pan', 8, 2, 2),
      seedItem('frijoles', 500, 200, 40),
      seedItem('jugo-naranja', 1, 5, 2),
      seedItem('aceite', 1, 300, 60),
      seedItem('avena', 250, 150, 45),
    ];

    const history = [
      seedHistoryEntry('huevos', 'consumed', 1.2, 1, 'Arroz con huevo'),
      seedHistoryEntry('platano', 'consumed', 0.8, 1, 'Batido de plátano'),
      seedHistoryEntry('leche', 'consumed', 0.9, 1, 'Café con leche'),
      seedHistoryEntry('queso', 'consumed', 1.6, 2, 'Sándwich de queso y tomate'),
      seedHistoryEntry('pasta', 'consumed', 1.6, 2, 'Pasta al tomate y albahaca'),
      seedHistoryEntry('pan', 'consumed', 0.5, 2, 'Tostadas francesas'),
      seedHistoryEntry('manzana', 'consumed', 1.0, 3, 'Yogur con fruta y avena'),
      seedHistoryEntry('yogur', 'consumed', 0.8, 3, 'Yogur con fruta y avena'),
      seedHistoryEntry('tomate', 'consumed', 1.05, 4, 'Ensalada fresca de la nevera'),
      seedHistoryEntry('pollo', 'consumed', 2.75, 4, 'Pollo salteado con verduras'),
      seedHistoryEntry('lechuga', 'wasted', 1.2, 5, 'Se marchitó'),
      seedHistoryEntry('frijoles', 'consumed', 1.9, 5, 'Guiso de frijoles'),
      seedHistoryEntry('huevos', 'consumed', 1.1, 6, 'Tortilla de espinaca y queso'),
      seedHistoryEntry('espinaca', 'consumed', 1.4, 6, 'Tortilla de espinaca y queso'),
      seedHistoryEntry('jugo-naranja', 'consumed', 1.7, 8, 'Desayuno'),
      seedHistoryEntry('papa', 'consumed', 1.5, 9, 'Puré de papa'),
      seedHistoryEntry('mantequilla', 'consumed', 0.7, 11, 'Tostadas'),
      seedHistoryEntry('zanahoria', 'consumed', 1.1, 13, 'Sopa cremosa de zanahoria'),
      seedHistoryEntry('avena', 'consumed', 0.8, 15, 'Yogur con fruta y avena'),
      seedHistoryEntry('atun', 'consumed', 1.8, 17, 'Wrap de atún'),
      seedHistoryEntry('salsa', 'consumed', 1.8, 19, 'Pasta rápida'),
      seedHistoryEntry('naranja', 'consumed', 1.6, 22, 'Jugo natural'),
      seedHistoryEntry('pizza', 'consumed', 5.0, 24, 'Noche de película'),
      seedHistoryEntry('limon', 'consumed', 0.6, 26, 'Limonada'),
      seedHistoryEntry('carne-molida', 'wasted', 6.0, 27, 'Se pasó de fecha'),
      seedHistoryEntry('yogur', 'consumed', 1.6, 29, 'Desayuno'),
    ];

    const shopping = [
      { id: uid(), catalogId: 'papa', name: 'Papa', emoji: '🥔', category: 'Verduras', qty: 1, unit: 'kg', done: false, auto: true },
      { id: uid(), catalogId: 'crema', name: 'Crema de leche', emoji: '🍶', category: 'Lácteos', qty: 1, unit: 'uds', done: false, auto: false },
      { id: uid(), catalogId: 'limon', name: 'Limón', emoji: '🍋', category: 'Frutas', qty: 6, unit: 'uds', done: true, auto: false },
    ];

    return {
      items,
      history,
      shopping,
      settings: {
        theme: 'light',
        currency: '$',
        createdAt: new Date().toISOString(),
      },
    };
  }

  /* ---------- carga y guardado ---------- */

  let state;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === STATE_VERSION && parsed.state) {
          return migrate(parsed.state);
        }
      }
    } catch (err) {
      console.warn('No se pudo leer el estado guardado:', err);
    }
    return buildSeed();
  }

  function migrate(saved) {
    const base = buildSeed;
    return {
      items: Array.isArray(saved.items) ? saved.items : [],
      history: Array.isArray(saved.history) ? saved.history : [],
      shopping: Array.isArray(saved.shopping) ? saved.shopping : [],
      settings: Object.assign({ theme: 'light', currency: '$' }, saved.settings || {}),
    };
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STATE_VERSION, state }));
    } catch (err) {
      console.warn('No se pudo guardar el estado:', err);
    }
  }

  state = load();

  function save() {
    persist();
    window.dispatchEvent(new CustomEvent('refri:change'));
  }

  /* ---------- consultas ---------- */

  function getItems() {
    return state.items;
  }

  function getItem(id) {
    return state.items.find((it) => it.id === id);
  }

  function getHistory() {
    return state.history;
  }

  function getShopping() {
    return state.shopping;
  }

  function getSettings() {
    return state.settings;
  }

  function setTheme(theme) {
    state.settings.theme = theme;
    save();
  }

  function pantryQty(catalogId) {
    return state.items
      .filter((it) => it.catalogId === catalogId)
      .reduce((sum, it) => sum + Number(it.qty || 0), 0);
  }

  function hasCatalog(catalogId) {
    return pantryQty(catalogId) > 0;
  }

  function urgentItems() {
    return state.items
      .filter((it) => daysUntil(it.expiresAt) <= 3)
      .sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt));
  }

  function healthScore() {
    let score = 100;
    for (const it of state.items) {
      const days = daysUntil(it.expiresAt);
      if (days < 0) score -= 16;
      else if (days <= 2) score -= 7;
      else if (days <= 4) score -= 3;
    }
    if (state.items.length === 0) score = 0;
    if (state.items.length > 12) score += 4; // despensa variada
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function healthLabel(score) {
    if (!state.items.length) return { label: 'Vacío', detail: 'Agrega tu primer producto' };
    if (score >= 85) return { label: 'Excelente', detail: 'Todo bajo control' };
    if (score >= 70) return { label: 'Bien', detail: 'Hay algo que revisar' };
    if (score >= 50) return { label: 'Atento', detail: 'Varios por vencer' };
    return { label: 'Al rescate', detail: 'Usa lo urgente hoy' };
  }

  function totalValue() {
    return state.items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  }

  /* ---------- mutaciones: inventario ---------- */

  function addItem(payload) {
    const item = {
      id: uid(),
      catalogId: payload.catalogId || null,
      name: payload.name.trim(),
      emoji: payload.emoji || '🍽️',
      category: payload.category || 'Otros',
      unit: payload.unit || 'uds',
      qty: Math.max(0, Number(payload.qty) || 1),
      price: Math.max(0, Number(payload.price) || 0),
      expiresAt: payload.expiresAt || addDaysISO(7),
      addedAt: todayISO(),
    };
    state.items.unshift(item);
    save();
    return item;
  }

  function updateItem(id, payload) {
    const item = getItem(id);
    if (!item) return null;
    Object.assign(item, {
      name: payload.name != null ? payload.name.trim() : item.name,
      emoji: payload.emoji || item.emoji,
      category: payload.category || item.category,
      unit: payload.unit || item.unit,
      qty: payload.qty != null ? Math.max(0, Number(payload.qty)) : item.qty,
      price: payload.price != null ? Math.max(0, Number(payload.price)) : item.price,
      expiresAt: payload.expiresAt || item.expiresAt,
      catalogId: payload.catalogId !== undefined ? payload.catalogId : item.catalogId,
    });
    if (item.qty <= 0) {
      removeItem(id, { silent: true });
    }
    save();
    return item;
  }

  function logHistory({ catalogId, name, emoji, type, value, source }) {
    state.history.unshift({
      id: uid(),
      catalogId: catalogId || null,
      name,
      emoji: emoji || '🍽️',
      type: type === 'wasted' ? 'wasted' : 'consumed',
      value: round(Number(value) || 0, 2),
      date: todayISO(),
      source: source || 'Manual',
    });
    // conserva el historial acotado a 12 meses
    if (state.history.length > 800) state.history.length = 800;
  }

  function removeItem(id, opts = {}) {
    const index = state.items.findIndex((it) => it.id === id);
    if (index === -1) return null;
    const item = state.items[index];
    state.items.splice(index, 1);
    if (!opts.silent) {
      const expired = daysUntil(item.expiresAt) < 0;
      logHistory({
        catalogId: item.catalogId,
        name: item.name,
        emoji: item.emoji,
        type: expired ? 'wasted' : 'consumed',
        value: item.price,
        source: expired ? 'Se venció' : 'Descartado',
      });
    }
    save();
    return item;
  }

  function adjustQty(id, direction) {
    const item = getItem(id);
    if (!item) return;
    const step = UNIT_STEP[item.unit] || 1;
    const nextQty = round(Number(item.qty) + direction * step, 2);
    if (nextQty <= 0) {
      removeItem(id, { silent: false });
      return;
    }
    item.qty = nextQty;
    // Los productos que se consumen del todo ya no cuentan como "por vencer".
    save();
  }

  /* ---------- mutaciones: compras ---------- */

  function addShopping(payload) {
    const existing = state.shopping.find(
      (s) => s.name.toLowerCase() === payload.name.trim().toLowerCase() && !s.done
    );
    if (existing) {
      existing.qty = round(Number(existing.qty) + (Number(payload.qty) || 1), 2);
      save();
      return existing;
    }
    const entry = {
      id: uid(),
      catalogId: payload.catalogId || null,
      name: payload.name.trim(),
      emoji: payload.emoji || '🛒',
      category: payload.category || 'Otros',
      qty: Math.max(0.25, Number(payload.qty) || 1),
      unit: payload.unit || 'uds',
      done: false,
      auto: !!payload.auto,
    };
    state.shopping.push(entry);
    save();
    return entry;
  }

  function toggleShopping(id) {
    const entry = state.shopping.find((s) => s.id === id);
    if (!entry) return;
    entry.done = !entry.done;
    save();
  }

  function removeShopping(id) {
    state.shopping = state.shopping.filter((s) => s.id !== id);
    save();
  }

  function clearCompletedShopping() {
    state.shopping = state.shopping.filter((s) => !s.done);
    save();
  }

  function moveCompletedToPantry() {
    const done = state.shopping.filter((s) => s.done);
    if (!done.length) return 0;
    for (const entry of done) {
      const catalog = entry.catalogId ? CATALOG_BY_ID[entry.catalogId] : null;
      const shelf = catalog ? catalog.shelf : 7;
      state.items.unshift({
        id: uid(),
        catalogId: entry.catalogId || null,
        name: entry.name,
        emoji: entry.emoji || '🍽️',
        category: entry.category || 'Otros',
        unit: entry.unit || 'uds',
        qty: entry.qty,
        price: catalog ? round(catalog.price * (entry.qty / catalogDefaultQty(catalog)), 2) : 0,
        expiresAt: addDaysISO(shelf),
        addedAt: todayISO(),
      });
    }
    state.shopping = state.shopping.filter((s) => !s.done);
    save();
    return done.length;
  }

  function suggestions() {
    if (!CATALOG) return [];
    const shoppingNames = new Set(
      state.shopping.filter((s) => !s.done).map((s) => s.name.toLowerCase())
    );
    const consumed = new Map();
    for (const h of state.history) {
      if (h.type !== 'consumed' || !h.catalogId) continue;
      consumed.set(h.catalogId, (consumed.get(h.catalogId) || 0) + 1);
    }

    const out = [];
    const seen = new Set();

    for (const catalog of CATALOG) {
      if (out.length >= 6) break;
      if (shoppingNames.has(catalog.name.toLowerCase()) || seen.has(catalog.id)) continue;
      const qty = pantryQty(catalog.id);
      if (qty === 0 && catalog.essential) {
        out.push({ catalog, reason: 'Se acabó', priority: 0 });
        seen.add(catalog.id);
      } else if (qty > 0 && catalog.essential && qty <= lowThreshold(catalog)) {
        out.push({ catalog, reason: 'Queda poco', priority: 1 });
        seen.add(catalog.id);
      }
    }

    // hábitos: productos que consumes seguido y no están en la nevera
    const habitIds = [...consumed.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .filter((id) => !seen.has(id) && pantryQty(id) === 0 && CATALOG_BY_ID[id]);

    for (const id of habitIds) {
      if (out.length >= 6) break;
      const catalog = CATALOG_BY_ID[id];
      if (shoppingNames.has(catalog.name.toLowerCase())) continue;
      out.push({ catalog, reason: 'Lo consumes seguido', priority: 2 });
      seen.add(id);
    }

    return out.slice(0, 6);
  }

  function lowThreshold(catalog) {
    switch (catalog.unit) {
      case 'g':
      case 'ml':
        return 150;
      case 'kg':
      case 'L':
        return 0.5;
      default:
        return 1;
    }
  }

  /* ---------- recetas ---------- */

  function recipeMatch(recipe) {
    const have = [];
    const missing = [];
    const short = [];
    for (const ing of recipe.ingredients) {
      const catalog = CATALOG_BY_ID[ing.id];
      const qty = pantryQty(ing.id);
      const enough = qty + 1e-9 >= Number(ing.use || 0);
      const entry = {
        id: ing.id,
        use: ing.use,
        amount: `${ing.use} ${catalog ? catalog.unit : ''}`.trim(),
        name: catalog ? catalog.name : ing.id,
        emoji: catalog ? catalog.emoji : '🍽️',
        have: qty > 0,
        enough,
        qty,
      };
      if (qty <= 0) missing.push(entry);
      else {
        have.push(entry);
        if (!enough) short.push(entry);
      }
    }
    const total = recipe.ingredients.length;
    const covered = recipe.ingredients.filter((ing) => pantryQty(ing.id) + 1e-9 >= Number(ing.use || 0)).length;
    return {
      have,
      missing,
      short,
      total,
      haveCount: have.length,
      coveredCount: covered,
      missingCount: missing.length,
      enoughCount: have.length - short.length,
      percent: Math.round((have.length / total) * 100),
      ready: missing.length === 0 && short.length === 0,
    };
  }

  function cookRecipe(recipe) {
    const match = recipeMatch(recipe);
    let used = 0;
    let savedValue = 0;

    for (const ing of match.have) {
      const requested = Number(ing.use) || 1;
      let remaining = requested;
      // puede haber varios lotes del mismo producto: se descuenta del más próximo a vencer
      const batches = state.items
        .filter((it) => it.catalogId === ing.id && Number(it.qty) > 0)
        .sort((a, b) => (a.expiresAt || '').localeCompare(b.expiresAt || ''));

      for (const item of batches) {
        if (remaining <= 0) break;
        const before = Number(item.qty);
        const consume = Math.min(before, remaining);
        const fraction = before > 0 ? consume / before : 0;
        const value = round((Number(item.price) || 0) * fraction, 2);

        item.qty = round(before - consume, 2);
        remaining = round(remaining - consume, 2);
        savedValue += value;

        logHistory({
          catalogId: item.catalogId,
          name: item.name,
          emoji: item.emoji,
          type: 'consumed',
          value,
          source: recipe.name,
        });

        if (item.qty <= 0) {
          state.items = state.items.filter((it) => it.id !== item.id);
        }
      }

      if (remaining < requested - 1e-9) used += 1;
    }

    save();
    return { used, savedValue: round(savedValue, 2), missing: match.missingCount };
  }

  /* ---------- estadísticas ---------- */

  function stats(days = 30) {
    const from = addDaysISO(-days);
    const entries = state.history.filter((h) => h.date >= from);
    const consumed = entries.filter((h) => h.type === 'consumed');
    const wasted = entries.filter((h) => h.type === 'wasted');
    const savedValue = consumed.reduce((sum, h) => sum + (Number(h.value) || 0), 0);
    const wastedValue = wasted.reduce((sum, h) => sum + (Number(h.value) || 0), 0);
    const totalValue = savedValue + wastedValue;
    const efficiency = totalValue > 0 ? Math.round((savedValue / totalValue) * 100) : 100;
    const co2 = round((savedValue / 4) * 2.5, 1);

    // últimos 7 días para la gráfica
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const date = addDaysISO(-i);
      const dayEntries = state.history.filter((h) => h.date === date);
      week.push({
        date,
        iso: date,
        label: new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(
          new Date(date + 'T12:00:00')
        ).replace('.', ''),
        consumed: dayEntries.filter((h) => h.type === 'consumed').length,
        wasted: dayEntries.filter((h) => h.type === 'wasted').length,
      });
    }

    // top productos salvados
    const byName = new Map();
    for (const h of consumed) {
      const current = byName.get(h.name) || { name: h.name, emoji: h.emoji, count: 0, value: 0 };
      current.count += 1;
      current.value += Number(h.value) || 0;
      byName.set(h.name, current);
    }
    const topSaved = [...byName.values()].sort((a, b) => b.count - a.count).slice(0, 4);

    return {
      consumedCount: consumed.length,
      wastedCount: wasted.length,
      savedValue: round(savedValue, 2),
      wastedValue: round(wastedValue, 2),
      efficiency,
      co2,
      week,
      topSaved,
      maxWeek: Math.max(1, ...week.map((d) => d.consumed + d.wasted)),
    };
  }

  function categoryBreakdown() {
    const map = new Map();
    for (const category of CATEGORIES) map.set(category, 0);
    for (const item of state.items) {
      map.set(item.category, (map.get(item.category) || 0) + 1);
    }
    return [...map.entries()]
      .filter(([, count]) => count > 0)
      .map(([category, count]) => ({ category, count }));
  }

  /* ---------- import / export / reset ---------- */

  function exportJSON() {
    return JSON.stringify(
      {
        app: 'mi-refri-inteligente',
        version: STATE_VERSION,
        exportedAt: new Date().toISOString(),
        state,
      },
      null,
      2
    );
  }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !parsed.state || !Array.isArray(parsed.state.items)) {
      throw new Error('El archivo no tiene el formato esperado.');
    }
    state = migrate(parsed.state);
    save();
  }

  function resetDemo() {
    state = buildSeed();
    save();
  }

  function clearAll() {
    state = {
      items: [],
      history: [],
      shopping: [],
      settings: { theme: state.settings.theme, currency: '$', createdAt: new Date().toISOString() },
    };
    save();
  }

  window.Store = {
    // consultas
    getItems,
    getItem,
    getHistory,
    getShopping,
    getSettings,
    getSuggestions: suggestions,
    getStats: stats,
    getCategoryBreakdown: categoryBreakdown,
    pantryQty,
    hasCatalog,
    urgentItems,
    healthScore,
    healthLabel,
    totalValue,
    recipeMatch,
    daysUntil,
    suggestions,
    // mutaciones
    addItem,
    updateItem,
    removeItem,
    adjustQty,
    addShopping,
    toggleShopping,
    removeShopping,
    clearCompletedShopping,
    moveCompletedToPantry,
    cookRecipe,
    setTheme,
    exportJSON,
    importJSON,
    resetDemo,
    clearAll,
    // utilidades
    todayISO,
    addDaysISO,
    fmtQty,
    fmtMoney,
    fmtDateLong,
    round,
    // internos expuestos para la UI
    _catalogDefaultQty: catalogDefaultQty,
  };
})();
