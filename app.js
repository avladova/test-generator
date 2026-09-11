const state={index:null,questions:[],current:0,answers:[]};
const $=id=>document.getElementById(id);
function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
function words(s){return clean(s).toLowerCase().match(/[а-яёa-z0-9]{3,}/g)||[]}
const stop=new Set('и в во на за по из к ко от до для с со у о об при не ни что это как так же если то чем где когда который которая которые которое быть был была были является можно нужно их его ее они мы вы нас вам мне меня уже еще только очень более менее также потому поэтому однако таким образом между через после перед над под при этом поскольку чтобы либо ли бы вот здесь там тогда далее теперь данный данная данные данной этого этой такой такая такие свое свои свою которых которых которые'.split(' '));
function stem(w){let x=w.toLowerCase();if(x.length<=5)return x;return x.replace(/(иями|ами|ями|ого|ему|ому|ими|ыми|ее|ие|ые|ой|ий|ый|ая|яя|ое|ее|ем|им|ым|ом|ах|ях|ов|ев|ей|ий|ый|ам|ям|ем|им|ом|ум|ах|ях|ию|ью|ия|ья|ие|ье|у|ю|а|я|ы|и|е|о)$/,'').slice(0,10)}
function keyset(s){return new Set(words(s).filter(x=>!stop.has(x)).map(stem))}
function similarity(a,b){const A=keyset(a),B=keyset(b);if(!A.size||!B.size)return 0;let n=0;A.forEach(x=>{if(B.has(x))n++});return n/Math.max(1,A.size)}
function sectionSentences(sec){
  if(Array.isArray(state.index.sentences)){
    const a=Number(sec.start_page)||1,b=Number(sec.end_page)||99999;
    const x=state.index.sentences.filter(s=>Number(s.page)>=a&&Number(s.page)<=b&&clean(s.text));
    if(x.length)return x;
  }
  return clean(sec.text).split(/(?<=[.!?])\s+/).filter(x=>x.length>=60).map(text=>({text,page:sec.start_page}));
}
function isTheory(text){
  const t=clean(text).toLowerCase();
  if(t.length<70)return false;
  if(/^(пример|решение|задача|ответ|самостоятельн|контрольн)/.test(t))return false;
  if(/\bпример\s*\d|\bрешение\s*\d|\bзадача\s*\d|ответы к заданиям/.test(t))return false;
  return true;
}
function theoryFor(sec){
  const all=sectionSentences(sec).filter(s=>isTheory(s.text));
  // Prefer the explanatory part near the beginning of the section; examples usually occur later.
  return all.slice(0,Math.min(14,all.length));
}
function conceptFromTitle(sec){
  let title=clean(sec.title||'').replace(/^\d+(?:\.\d+)*\.?\s*/,'');
  title=title.replace(/\s*[–—-]\s*.*$/,'').trim();
  return title||'данной темы';
}
function theoryTerms(sec){
  const title=keyset(conceptFromTitle(sec));
  const freq=new Map();
  for(const s of theoryFor(sec)){for(const w of words(s.text)){const z=stem(w);if(stop.has(w)||z.length<5||title.has(z))continue;freq.set(z,(freq.get(z)||0)+1)}}
  return [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]);
}
function makeQuestion(sec,variant,ref){
  const concept=conceptFromTitle(sec);
  const title=clean(sec.title||concept);
  const formula=/формул|уравнен|коэффициент|показател/.test(concept.toLowerCase());
  let q;
  if(variant===0) q=`Сформулируйте основное понятие «${concept}» и объясните его содержание в теме «${title}».`;
  else if(variant===1) q=formula?`Запишите основную формулу, связанную с темой «${title}», и расшифруйте входящие в неё обозначения.`:`Какие основные свойства, признаки или характеристики понятия «${concept}» рассматриваются в теоретической части темы «${title}»?`;
  else if(variant===2) q=`Для чего используется «${concept}» в анализе данных? Опишите назначение и условия применения, указанные в теории.`;
  else q=`Какие положения теории необходимо знать по теме «${title}»? Объясните связь между основными понятиями и результатом метода или расчёта.`;
  const terms=theoryTerms(sec);
  return {question:q,reference:ref,must:terms.slice(0,5),section:sec};
}
function generate(sec,n){
  const theory=theoryFor(sec);
  if(!theory.length)return [];
  // Questions are anchored to the actual section title and theoretical exposition, not arbitrary words.
  const refs=[];for(let i=0;i<Math.min(theory.length,8);i++){const start=Math.max(0,i-1);refs.push(theory.slice(start,Math.min(theory.length,start+3)).map(x=>x.text).join(' '))}
  const out=[];for(let i=0;i<n;i++){out.push(makeQuestion(sec,i%4,refs[i%refs.length]))}return out;
}
function renderQuestion(){const q=state.questions[state.current];if(!q)return;const total=state.questions.length;$('qmeta').textContent=`Вопрос ${state.current+1} из ${total} · Тема: ${q.section.title}`;$('question').textContent=q.question;$('answer').value='';$('feedback').innerHTML='';$('reference').classList.add('hidden');$('next').disabled=false;$('check').disabled=false}
function evaluate(answer,q){
  const theory=theoryFor(q.section).map(x=>x.text).join(' ');
  const context=(q.reference+' '+theory).slice(0,12000);
  const answerSim=similarity(answer,context);
  const questionSim=similarity(answer,q.question);
  const answerKeys=keyset(answer), must=q.must||[];
  const coverage=must.length?must.filter(t=>answerKeys.has(t)).length/must.length:0;
  // Copying the question should not be rewarded: overlap with the question is explicitly penalized.
  let score=Math.max(answerSim*.72,coverage*.95);
  score-=Math.min(.45,questionSim*.65);
  if(words(answer).length<3)score=0;
  score=Math.max(0,Math.min(1,score));
  let cls='bad',label='Не зачтено';if(score>=.55){cls='good';label='Зачтено'}else if(score>=.30){cls='partial';label='Частично'}
  return{score,len:words(answer).length,label,cls,context};
}
async function loadIndex(){try{const r=await fetch('data/book_index.json',{cache:'no-store'});if(!r.ok)throw new Error('Файл data/book_index.json не найден');state.index=await r.json();const secs=state.index.sections||[];const select=$('topic');select.innerHTML='';secs.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${s.id||''} ${s.title}`.trim();select.appendChild(o)});if(secs.length){$('topic').disabled=false;$('start').disabled=false;$('status').textContent=`Учебник загружен: ${state.index.source||'индексированный учебник'}. Тем из оглавления: ${secs.length}.`;}else throw new Error('В индексе нет разделов.')}catch(e){$('status').innerHTML=`<strong>Ошибка загрузки индекса:</strong> ${e.message}. Файл должен находиться по пути data/book_index.json.`}}
$('start').onclick=()=>{const sec=state.index.sections[Number($('topic').value)];state.questions=generate(sec,Number($('count').value));state.current=0;state.answers=[];if(!state.questions.length){$('status').textContent='Для выбранной темы не удалось сформировать вопросы из теоретической части.';return}$('test').classList.remove('hidden');$('resultCard').classList.add('hidden');renderQuestion();window.scrollTo({top:$('test').offsetTop-20,behavior:'smooth'})};
$('check').onclick=()=>{const ans=$('answer').value.trim();if(!ans){$('feedback').innerHTML='<div class="feedback partial"><strong>Ответ не введён.</strong><br>Можно перейти к следующему вопросу или сначала написать ответ.</div>';return}const r=evaluate(ans,state.questions[state.current]);state.answers[state.current]=r.score;$('feedback').innerHTML=`<div class="feedback ${r.cls}"><div class="score">${Math.round(r.score*100)}%</div><strong>${r.label}</strong><br>В ответе: ${r.len} слов.<br><br>Оценка диагностическая: учитываются ключевые понятия теоретической части выбранной темы. Копирование формулировки вопроса не повышает результат.</div>`;$('reference').innerHTML=`<strong>Теоретический фрагмент для самопроверки:</strong><br><br>${r.context.slice(0,2500)}`;$('reference').classList.remove('hidden');$('next').disabled=false;$('check').disabled=false};
$('next').onclick=()=>{if(state.current+1>=state.questions.length){const a=state.answers.filter(x=>typeof x==='number');const avg=a.length?a.reduce((x,y)=>x+y,0)/a.length:0;$('test').classList.add('hidden');$('resultCard').classList.remove('hidden');$('result').innerHTML=`<div class="score">${a.length?Math.round(avg*100):'—'}</div><p>Проверено ответов: ${a.length} из ${state.questions.length}. Вопросы без ответа можно было пропустить.</p>`;window.scrollTo({top:$('resultCard').offsetTop-20,behavior:'smooth'});return}state.current++;renderQuestion()};
$('restart').onclick=()=>{$('resultCard').classList.add('hidden');$('test').classList.add('hidden');window.scrollTo({top:0,behavior:'smooth'})};
loadIndex();
