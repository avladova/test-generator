const INDEX_PATH='data/soloviev_test_index_v5.json';
const state={index:null,questions:[],current:0,answers:[]};
const $=id=>document.getElementById(id);
function clean(s){return String(s??'').replace(/\u00ad/g,'').replace(/\u0018/g,'').replace(/\uf0b7/g,' ').replace(/\s+/g,' ').trim()}
function words(s){return clean(s).toLowerCase().match(/[а-яёa-z0-9]{3,}/g)||[]}
const STOP=new Set('и в во на за по из к ко от до для с со у о об при не ни что это как так же если то чем где когда который которая которые которое быть был была были является можно нужно их его ее они мы вы нас вам мне меня уже еще только очень более менее также потому поэтому однако таким образом между через после перед над под при этом поскольку чтобы либо ли бы вот здесь там тогда далее теперь данный данная данные данной этого этой такой такая такие свое свои свою которых которые'.split(' '));
function stem(w){let x=w.toLowerCase();if(x.length<=5)return x;return x.replace(/(иями|ами|ями|ого|ему|ому|ими|ыми|ее|ие|ые|ой|ий|ый|ая|яя|ое|ем|им|ым|ом|ах|ях|ов|ев|ей|ам|ям|ум|ию|ью|ия|ья|ие|ье|у|ю|а|я|ы|и|е|о)$/,'').slice(0,12)}
function keyset(s){return new Set(words(s).filter(w=>!STOP.has(w)).map(stem))}
function overlap(a,b){const A=keyset(a),B=keyset(b);if(!A.size||!B.size)return 0;let n=0;A.forEach(x=>{if(B.has(x))n++});return n/Math.max(1,A.size)}
function theory(sec){return Array.isArray(sec.theory)?sec.theory.map(clean).filter(x=>x.length>=35):[]}
function validConcept(c){return c&&clean(c.name).length>=3&&clean(c.definition).length>=45&&!/пример|задач|решени|excel|ячейк/i.test(c.definition)}
function validFormula(f){const x=clean(f?.formula);return !!f&&x.length>=5&&!/пример|задач|решени|excel|ячейк|табл\.|рис\./i.test(x)&&(/[=≤≥∑√]/.test(x)||/[A-ZА-ЯЁ]ₙ/.test(x))}
function add(out,q,expected,reference,keys,type,sec){out.push({type,question:q,expected:clean(expected),reference:clean(reference),keys:[...new Set(keys.filter(Boolean))].slice(0,18),section:sec})}

// For topics where the PDF text layer is damaged or too sparse, use only statements
// that were verified directly against the textbook pages. This prevents generic questions.
function topicOverrides(sec){
 const title=clean(sec.title); const out=[];
 if(title==='Комбинации без повторений'){
   const refs={
    factorial:'Факториалом натурального числа n называется число n! = n(n − 1)(n − 2) ··· 3·2·1. Факториалом нуля по определению является единица: 0! = 1.',
    arrangements:'Размещениями из n элементов по k называются упорядоченные подмножества множества S, состоящие из k различных элементов и отличающиеся друг от друга составом элементов или порядком их расположения. Число размещений: Aₙᵏ = n!/(n − k)! = n(n − 1)(n − 2)···(n − k + 1).',
    permutations:'Перестановками из n элементов называются размещения из n элементов по n, то есть упорядоченные подмножества, состоящие из всех элементов множества и отличающиеся только порядком. Число перестановок: Pₙ = n!.',
    combinations:'Сочетаниями из n элементов по k называются подмножества множества S, состоящие из k различных элементов и отличающиеся друг от друга только составом элементов. Число сочетаний: Cₙᵏ = n!/[k!(n − k)!].',
    symmetry:'Для сочетаний выполняется равенство Cₙᵏ = Cₙⁿ⁻ᵏ, 0 ≤ k ≤ n.',
    excel:'В учебнике для вычисления факториала, числа перестановок и числа сочетаний в Microsoft Excel указаны функции ФАКТР(<n>), ПЕРЕСТ(<n>; <k>) и ЧИСЛКОМБ(<n>; <k>).'
   };
   add(out,'Как определяется факториал натурального числа n? Запишите формулу n! и укажите, чему равен 0!.',refs.factorial,refs.factorial,['факториал','n'],'fact',sec);
   add(out,'Что такое размещения из n элементов по k? Чем два размещения могут отличаться друг от друга? Запишите формулу Aₙᵏ.',refs.arrangements,refs.arrangements,['размещен','состав','порядок'],'arr',sec);
   add(out,'Что такое перестановки из n элементов? Как связаны перестановки с размещениями и чему равно их число?',refs.permutations,refs.permutations,['перестанов','размещен','порядок'],'perm',sec);
   add(out,'Что такое сочетания из n элементов по k? Чем сочетания отличаются друг от друга и чему равно их число?',refs.combinations,refs.combinations,['сочетан','состав','n'],'comb',sec);
   add(out,'Запишите свойство симметрии числа сочетаний и укажите диапазон допустимых значений k.',refs.symmetry,refs.symmetry,['сочетан','симметр'],'sym',sec);
   add(out,'Какие функции Microsoft Excel в учебнике указаны для вычисления факториала, перестановок и сочетаний? Назовите все три функции.',refs.excel,refs.excel,['фактр','перест','числкомб','excel'],'excel',sec);
   add(out,'Чем размещения, перестановки и сочетания различаются по признаку порядка элементов? Приведите для каждого вида соответствующее обозначение числа способов.',`${refs.arrangements} ${refs.permutations} ${refs.combinations}`,`${refs.arrangements} ${refs.permutations} ${refs.combinations}`,['размещен','перестанов','сочетан','порядок'],'compare',sec);
   return out;
 }
 if(title==='Выбросы'){
   const refs={
    def:'Выбросами называются значения признака, не попадающие в отрезок [x₀,₂₅ − 1,5IQR; x₀,₇₅ + 1,5IQR].',
    step:'Первым шагом при поиске выбросов является визуализация данных с помощью диаграмм размаха и диаграмм рассеяния.',
    decision:'При анализе выбросов необходимо рассматривать каждое значение-кандидат: действительно ли оно является выбросом, либо в данных есть важные специальные подмножества, которые нужно рассматривать отдельно.',
    variants:'В общем случае возможны следующие варианты работы с выбросами: замена выброса соответствующей границей отрезка [x₀,₂₅ − 1,5IQR; x₀,₇₅ + 1,5IQR] и обработка выброса как пропущенного значения.',
    fraud:'В некоторых ситуациях выбросы являются важнейшим предметом исследования. Например, при обнаружении мошеннических транзакций по банковским картам именно необычные, нетипичные транзакции представляют основной интерес.',
    indicator:'Для каждого признака X целесообразно добавить специальный признак Xвыбр., значение которого равно единице, если значение X в данной строке классифицировано как выброс.'
   };
   add(out,'Как в учебнике определяется выброс? Укажите интервал, за пределами которого значение признака считается выбросом.',refs.def,refs.def,['выброс','iqr','отрезок'],'outlierDef',sec);
   add(out,'Какой шаг в учебнике назван первым при поиске выбросов? Какие два вида диаграмм для этого используются?',refs.step,refs.step,['первым','поиск','диаграмм'],'outlierStep',sec);
   add(out,'Как следует принимать решение о том, является ли значение-кандидат действительно выбросом?',refs.decision,refs.decision,['кандидат','выброс','подмножеств'],'outlierDecision',sec);
   add(out,'Какие два варианта обработки выбросов перечислены в учебнике?',refs.variants,refs.variants,['замен','границ','пропущен'],'outlierVariants',sec);
   add(out,'Почему выбросы не всегда следует удалять? Приведите ситуацию, когда выбросы сами являются предметом исследования.',refs.fraud,refs.fraud,['мошен','транзакц','интерес'],'outlierFraud',sec);
   add(out,'Какой специальный признак Xвыбр. рекомендуется добавить к набору данных и что означает его значение 1?',refs.indicator,refs.indicator,['xвыбр','единиц','классифицир'],'outlierIndicator',sec);
   return out;
 }
 return out;
}
function makeQuestions(sec){
 const override=topicOverrides(sec); if(override.length)return override;
 const out=[],cs=(sec.concepts||[]).filter(validConcept),fs=(sec.formulas||[]).filter(validFormula),ms=(sec.methods||[]).filter(m=>m&&clean(m.description).length>=55&&!/пример|задач|решени|excel|ячейк/i.test(m.description)),ts=theory(sec);
 cs.forEach(c=>{const name=clean(c.name),def=clean(c.definition);add(out,`Что в учебнике называется «${name}»? Дайте определение и укажите отличительный признак, приведённый в определении.`,def,def,words(name).map(stem),'definition',sec);add(out,`Какими свойствами или признаками характеризуется «${name}» согласно определению в теме?`,def,def,words(def).filter(w=>!STOP.has(w)).map(stem),'definition',sec)});
 fs.forEach(f=>{const name=clean(f.name||'формулу'),formula=clean(f.formula),exp=clean(f.explanation||'');add(out,`Запишите ${name}. Объясните, что обозначают основные элементы формулы и при каких условиях она применяется.`,`${formula}. ${exp}`,`${formula}. ${exp}`,words(name+' '+exp).map(stem),'formula',sec);add(out,`Какую формулу для «${name}» приводит учебник? Запишите её и объясните смысл результата.`,`${formula}. ${exp}`,`${formula}. ${exp}`,words(name+' '+exp).map(stem),'formula',sec)});
 ms.forEach(m=>add(out,`Каков основной порядок действий/назначение «${clean(m.name||sec.title)}», описанный в теории? Назовите конкретные действия или условия.`,m.description,m.description,words(m.description).filter(w=>!STOP.has(w)).map(stem),'method',sec));
 ts.forEach((t,i)=>{const low=t.toLowerCase();if(/называется|называются|называют/.test(low)){const m=t.match(/(?:что\s+)?([^,.;:]{3,100})\s+(?:называется|называются|называют)\s+(.+)/i);if(m){add(out,`Что называется «${clean(m[1])}»? Сформулируйте определение из учебника.`,t,t,words(m[1]).map(stem),'theory',sec);return}}if(/первым шагом|первый шаг/.test(low))add(out,`Каков первый шаг при описанной в теме процедуре? Укажите его точно по теории.`,t,t,words(t).filter(w=>!STOP.has(w)).map(stem),'theory',sec);else if(/вариант|следующие|способ(а|ы)|случа(е|ях)|услови/.test(low))add(out,`Какие конкретные варианты или условия работы рассматриваются в этом фрагменте? Перечислите их.`,t,t,words(t).filter(w=>!STOP.has(w)).map(stem),'theory',sec);else if(/отлича|различа|равно|равна|равны|определя|вычисля|выража/.test(low))add(out,`Какое конкретное соотношение, различие или правило сформулировано в этом фрагменте теории? Запишите его и поясните.`,t,t,words(t).filter(w=>!STOP.has(w)).map(stem),'theory',sec)});
 const uniq=[],seen=new Set();for(const q of out){const k=q.question.toLowerCase();if(!seen.has(k)){seen.add(k);uniq.push(q)}}return uniq;
}
function shuffle(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function generate(sec,n){const pool=makeQuestions(sec);return shuffle(pool).slice(0,Math.min(n,pool.length))}
function evaluate(answer,q){const a=clean(answer);if(!a)return{score:0,label:'Ответ не введён',cls:'partial'};const A=keyset(a),C=keyset(q.expected||q.reference||'');const expectedWords=[...C].filter(x=>x.length>=4);let matched=0;expectedWords.forEach(x=>{if(A.has(x))matched++});const coverage=expectedWords.length?matched/expectedWords.length:0;const named=(q.keys||[]).filter(x=>A.has(x)).length,namedCoverage=q.keys?.length?named/q.keys.length:0;const sim=overlap(a,q.expected||q.reference||''),qsim=overlap(a,q.question);let score=Math.max(coverage*1.35,namedCoverage*1.15,sim*.95);score-=Math.min(.35,qsim*.65);if(words(a).length<3)score-=.08;score=Math.max(0,Math.min(1,score));let label='Не зачтено',cls='bad';if(score>=.55){label='Зачтено';cls='good'}else if(score>=.30){label='Частично';cls='partial'}return{score,label,cls,matched,total:expectedWords.length,context:q.expected||q.reference||''}}
function renderQuestion(){const q=state.questions[state.current];if(!q)return;$('qmeta').textContent=`Вопрос ${state.current+1} из ${state.questions.length} · ${q.section.id} ${q.section.title}`;$('question').textContent=q.question;$('answer').value='';$('feedback').innerHTML='';$('reference').classList.add('hidden');$('next').disabled=false;$('check').disabled=false}
async function loadIndex(){try{const r=await fetch(INDEX_PATH,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);state.index=await r.json();const secs=Array.isArray(state.index.sections)?state.index.sections:[];if(!secs.length)throw new Error('В индексе нет разделов');const select=$('topic');select.innerHTML='';secs.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${s.id||''} ${s.title||''}`.trim();select.appendChild(o)});$('topic').disabled=false;$('start').disabled=false;$('status').textContent=`Индекс ${state.index.version||''} загружен: ${state.index.source||'учебник Соловьева'}. Разделов: ${secs.length}.`;}catch(e){$('status').innerHTML=`<strong>Не удалось загрузить индекс.</strong><br>Проверьте путь <code>${INDEX_PATH}</code> и публикацию GitHub Pages.<br><small>${clean(e.message)}</small>`}}
$('start').onclick=()=>{const sec=state.index.sections[Number($('topic').value)];state.questions=generate(sec,Number($('count').value));state.current=0;state.answers=[];if(!state.questions.length){$('status').textContent='Для выбранной темы не найдено достаточно конкретного материала.';return}$('test').classList.remove('hidden');$('resultCard').classList.add('hidden');renderQuestion();window.scrollTo({top:$('test').offsetTop-20,behavior:'smooth'})};
$('check').onclick=()=>{const q=state.questions[state.current],result=evaluate($('answer').value,q);if(!clean($('answer').value)){$('feedback').innerHTML=`<div class="feedback partial"><strong>${result.label}.</strong><br>Можно перейти к следующему вопросу без проверки.</div>`;return}state.answers[state.current]=result.score;$('feedback').innerHTML=`<div class="feedback ${result.cls}"><div class="score">${Math.round(result.score*100)}%</div><strong>${result.label}</strong><br>Ответ сопоставлен с эталонным содержанием именно этого вопроса, а не с произвольным фрагментом раздела.</div>`;$('reference').innerHTML=`<strong>Основа проверки:</strong><br><br>${clean(result.context).slice(0,3000)}`;$('reference').classList.remove('hidden')};
$('next').onclick=()=>{if(state.current+1>=state.questions.length){const checked=state.answers.filter(x=>typeof x==='number'),avg=checked.length?checked.reduce((a,b)=>a+b,0)/checked.length:0;$('test').classList.add('hidden');$('resultCard').classList.remove('hidden');$('result').innerHTML=`<div class="score">${checked.length?Math.round(avg*100)+'%':'—'}</div><p>Проверено ответов: ${checked.length} из ${state.questions.length}. Пропущенные вопросы не считаются ошибкой.</p>`;window.scrollTo({top:$('resultCard').offsetTop-20,behavior:'smooth'});return}state.current++;renderQuestion()};
$('restart').onclick=()=>{$('resultCard').classList.add('hidden');$('test').classList.add('hidden');window.scrollTo({top:0,behavior:'smooth'})};
loadIndex();
