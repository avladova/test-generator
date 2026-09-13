const INDEX_PATH = 'data/soloviev_test_index_v5.json';
const state = { index: null, questions: [], current: 0, answers: [] };
const $ = id => document.getElementById(id);

function clean(s) {
  return String(s ?? '').replace(/\u00ad/g, '').replace(/\s+/g, ' ').trim();
}
function words(s) {
  return clean(s).toLowerCase().match(/[а-яёa-z0-9]{3,}/g) || [];
}
const STOP = new Set('и в во на за по из к ко от до для с со у о об при не ни что это как так же если то чем где когда который которая которые которое быть был была были является можно нужно их его ее они мы вы нас вам мне меня уже еще только очень более менее также потому поэтому однако таким образом между через после перед над под при этом поскольку чтобы либо ли бы вот здесь там тогда далее теперь данный данная данные данной этого этой такой такая такие свое свои свою которых'.split(' '));
function stem(w) {
  let x = w.toLowerCase();
  if (x.length <= 5) return x;
  return x.replace(/(иями|ами|ями|ого|ему|ому|ими|ыми|ее|ие|ые|ой|ий|ый|ая|яя|ое|ем|им|ым|ом|ах|ях|ов|ев|ей|ам|ям|ум|ию|ью|ия|ья|ие|ье|у|ю|а|я|ы|и|е|о)$/,'').slice(0, 12);
}
function keyset(s) { return new Set(words(s).filter(w => !STOP.has(w)).map(stem)); }
function overlap(a, b) {
  const A = keyset(a), B = keyset(b);
  if (!A.size || !B.size) return 0;
  let n = 0; A.forEach(x => { if (B.has(x)) n++; });
  return n / Math.max(1, A.size);
}
function sectionTheory(sec) {
  return Array.isArray(sec.theory) ? sec.theory.map(clean).filter(x => x.length >= 35) : [];
}
function relevantText(sec) {
  const parts = [];
  (sec.concepts || []).forEach(x => parts.push(`${x.name}. ${x.definition}`));
  (sec.formulas || []).forEach(x => parts.push(`${x.name}. ${x.formula}. ${x.explanation || ''}`));
  (sec.methods || []).forEach(x => parts.push(`${x.name}. ${x.description}`));
  sectionTheory(sec).slice(0, 12).forEach(x => parts.push(x));
  return clean(parts.join(' ')).slice(0, 14000);
}
function validConcept(c) {
  return c && clean(c.name).length >= 3 && clean(c.definition).length >= 45 && !/пример|задач|решени|excel|ячейк/i.test(c.definition);
}
function validFormula(f) {
  const formula = clean(f?.formula);
  if (!f || !formula || formula.length < 5) return false;
  if (/пример|задач|решени|excel|ячейк|табл\.|рис\./i.test(formula)) return false;
  return /=|≤|≥|∑|√|P\s*\(|M\s*\(|D\s*\(|E\s*\(/.test(formula);
}
function makeQuestions(sec) {
  const out = [];
  const concepts = (sec.concepts || []).filter(validConcept);
  const formulas = (sec.formulas || []).filter(validFormula);
  const methods = (sec.methods || []).filter(x => x && clean(x.description).length >= 60 && !/пример|задач|решени|excel|ячейк/i.test(x.description));
  const theory = sectionTheory(sec).filter(x => !/^(пример|решение|задач|ответ|самостоятельн|контрольн)/i.test(x));

  concepts.forEach(c => out.push({
    type: 'definition',
    question: `Что такое «${clean(c.name)}»? Дайте определение и объясните его содержание.`,
    expected: `${c.name}. ${c.definition}`,
    reference: c.definition,
    keys: words(c.name).filter(w => !STOP.has(w)).map(stem).slice(0, 5),
    section: sec
  }));
  formulas.forEach(f => out.push({
    type: 'formula',
    question: `Запишите ${clean(f.name || 'основную формулу темы')} и расшифруйте основные обозначения.`,
    expected: `${f.name}. ${f.formula}. ${f.explanation || ''}`,
    reference: `${f.formula}${f.explanation ? ' ' + f.explanation : ''}`,
    keys: words(`${f.name} ${f.explanation || ''}`).filter(w => !STOP.has(w)).map(stem).slice(0, 7),
    section: sec
  }));
  methods.forEach(m => out.push({
    type: 'method',
    question: `В чем назначение метода/процедуры «${clean(m.name || sec.title)}»? Опишите основные действия и условия применения.`,
    expected: `${m.name}. ${m.description}`,
    reference: m.description,
    keys: words(m.description).filter(w => !STOP.has(w)).map(stem).slice(0, 8),
    section: sec
  }));
  if (theory.length) {
    const chunks = [];
    for (let i = 0; i < Math.min(theory.length, 6); i++) chunks.push(theory.slice(i, i + 3).join(' '));
    chunks.forEach((t, i) => out.push({
      type: 'theory',
      question: i % 2 === 0 ? `Какие основные теоретические положения нужно знать по теме «${clean(sec.title)}»? Объясните их своими словами.` : `Объясните назначение и основные особенности рассматриваемого в теме «${clean(sec.title)}» подхода.`,
      expected: t,
      reference: t,
      keys: words(t).filter(w => !STOP.has(w)).map(stem).slice(0, 8),
      section: sec
    }));
  }
  const unique = [];
  const seen = new Set();
  out.forEach(q => { const k = q.question.toLowerCase(); if (!seen.has(k)) { seen.add(k); unique.push(q); } });
  return unique;
}
function shuffle(a) {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}
function generate(sec, n) {
  const pool = makeQuestions(sec);
  return shuffle(pool).slice(0, Math.min(n, pool.length));
}
function evaluate(answer, q) {
  const a = clean(answer);
  if (!a) return { score: 0, label: 'Ответ не введён', cls: 'partial', matched: 0, total: 0 };
  const context = q.expected || q.reference || '';
  const A = keyset(a), C = keyset(context);
  let matched = 0; C.forEach(x => { if (A.has(x)) matched++; });
  const coverage = C.size ? matched / C.size : 0;
  const named = (q.keys || []).filter(x => A.has(x)).length;
  const namedCoverage = q.keys?.length ? named / q.keys.length : 0;
  const contextSim = overlap(a, context);
  const questionSim = overlap(a, q.question);
  const shortPenalty = words(a).length < 3 ? 0.45 : 0;
  let score = Math.max(coverage * 1.25, namedCoverage * 1.05, contextSim * 0.9);
  score -= Math.min(0.55, questionSim * 0.8);
  score -= shortPenalty;
  score = Math.max(0, Math.min(1, score));
  let label = 'Не зачтено', cls = 'bad';
  if (score >= 0.55) { label = 'Зачтено'; cls = 'good'; }
  else if (score >= 0.30) { label = 'Частично'; cls = 'partial'; }
  return { score, label, cls, matched, total: C.size, context };
}
function renderQuestion() {
  const q = state.questions[state.current];
  if (!q) return;
  $('qmeta').textContent = `Вопрос ${state.current + 1} из ${state.questions.length} · ${q.section.id} ${q.section.title}`;
  $('question').textContent = q.question;
  $('answer').value = '';
  $('feedback').innerHTML = '';
  $('reference').classList.add('hidden');
  $('next').disabled = false;
  $('check').disabled = false;
}
async function loadIndex() {
  try {
    const r = await fetch(INDEX_PATH, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    state.index = await r.json();
    const sections = Array.isArray(state.index.sections) ? state.index.sections : [];
    if (!sections.length) throw new Error('В индексе нет разделов');
    const select = $('topic'); select.innerHTML = '';
    sections.forEach((s, i) => {
      const o = document.createElement('option'); o.value = i; o.textContent = `${s.id || ''} ${s.title || ''}`.trim(); select.appendChild(o);
    });
    $('topic').disabled = false; $('start').disabled = false;
    $('status').textContent = `Индекс загружен: ${state.index.source || 'учебник Соловьева'}. Разделов: ${sections.length}.`;
  } catch (e) {
    $('status').innerHTML = `<strong>Не удалось загрузить индекс.</strong><br>Проверьте, что файл находится в <code>${INDEX_PATH}</code> и GitHub Pages опубликован из актуальной ветки.<br><small>${clean(e.message)}</small>`;
  }
}
$('start').onclick = () => {
  const sec = state.index.sections[Number($('topic').value)];
  state.questions = generate(sec, Number($('count').value)); state.current = 0; state.answers = [];
  if (!state.questions.length) { $('status').textContent = 'Для выбранной темы не найдено достаточного теоретического материала для генерации вопросов.'; return; }
  $('test').classList.remove('hidden'); $('resultCard').classList.add('hidden'); renderQuestion(); window.scrollTo({ top: $('test').offsetTop - 20, behavior: 'smooth' });
};
$('check').onclick = () => {
  const q = state.questions[state.current]; const result = evaluate($('answer').value, q);
  state.answers[state.current] = result.score;
  if (!clean($('answer').value)) {
    $('feedback').innerHTML = `<div class="feedback partial"><strong>${result.label}.</strong><br>Можно перейти к следующему вопросу без проверки.</div>`;
    return;
  }
  $('feedback').innerHTML = `<div class="feedback ${result.cls}"><div class="score">${Math.round(result.score * 100)}%</div><strong>${result.label}</strong><br>Учитывается совпадение содержания ответа с теоретическим материалом выбранного раздела. Повтор текста вопроса не повышает оценку.</div>`;
  $('reference').innerHTML = `<strong>Основа проверки — теоретический материал индекса:</strong><br><br>${clean(result.context || q.reference).slice(0, 3000)}`;
  $('reference').classList.remove('hidden');
};
$('next').onclick = () => {
  if (state.current + 1 >= state.questions.length) {
    const checked = state.answers.filter(x => typeof x === 'number');
    const avg = checked.length ? checked.reduce((a, b) => a + b, 0) / checked.length : 0;
    $('test').classList.add('hidden'); $('resultCard').classList.remove('hidden');
    $('result').innerHTML = `<div class="score">${checked.length ? Math.round(avg * 100) + '%' : '—'}</div><p>Проверено ответов: ${checked.length} из ${state.questions.length}. Пропущенные вопросы не считаются ошибкой.</p>`;
    window.scrollTo({ top: $('resultCard').offsetTop - 20, behavior: 'smooth' }); return;
  }
  state.current++; renderQuestion();
};
$('restart').onclick = () => { $('resultCard').classList.add('hidden'); $('test').classList.add('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
loadIndex();
