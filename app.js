const INDEX_PATH='data/soloviev_test_index_v5.json';

const state={
  index:null,
  questions:[],
  current:0,
  answers:[],
  currentTopic:null,
  graph:null
};

const $=id=>document.getElementById(id);

function clean(s){
  return String(s??'')
    .replace(/\u00ad/g,'')
    .replace(/\u0018/g,'')
    .replace(/\uf0b7/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function words(s){
  return clean(s).toLowerCase().match(/[а-яёa-z0-9]{3,}/g)||[];
}

const STOP=new Set('и в во на за по из к ко от до для с со у о об при не ни что это как так же если то чем где когда который которая которые которое быть был была были является можно нужно их его ее они мы вы нас вам мне меня уже еще только очень более менее также потому поэтому однако таким образом между через после перед над под при этом поскольку чтобы либо ли бы вот здесь там тогда далее теперь данный данная данные данной этого этой такой такая такие свое свои свою которых которые'.split(' '));

function stem(w){
  let x=w.toLowerCase();
  if(x.length<=5)return x;
  return x.replace(/(иями|ами|ями|ого|ему|ому|ими|ыми|ее|ие|ые|ой|ий|ый|ая|яя|ое|ем|им|ым|ом|ах|ях|ов|ев|ей|ам|ям|ум|ию|ью|ия|ья|ие|ье|у|ю|а|я|ы|и|е|о)$/,'').slice(0,12);
}

function keyset(s){
  return new Set(words(s).filter(w=>!STOP.has(w)).map(stem));
}

function overlap(a,b){
  const A=keyset(a),B=keyset(b);
  if(!A.size||!B.size)return 0;
  let n=0;
  A.forEach(x=>{if(B.has(x))n++});
  return n/Math.max(1,A.size);
}

function theory(sec){
  return Array.isArray(sec.theory)?sec.theory.map(clean).filter(x=>x.length>=35):[];
}

function validConcept(c){
  return c&&clean(c.name).length>=3&&clean(c.definition).length>=45&&!/пример|задач|решени|excel|ячейк/i.test(c.definition);
}

function validFormula(f){
  const x=clean(f?.formula);
  return !!f&&x.length>=5&&!/пример|задач|решени|excel|ячейк|табл\.|рис\./i.test(x)&&(/[=≤≥∑√]/.test(x)||/[A-ZА-ЯЁ]ₙ/.test(x));
}

function add(out,q,expected,reference,keys,type,sec,extra={}){
  out.push({
    type,
    question:q,
    expected:clean(expected),
    reference:clean(reference),
    keys:[...new Set(keys.filter(Boolean))].slice(0,18),
    section:sec,
    ...extra
  });
}

function topicOverrides(sec){
  const title=clean(sec.title),out=[];

  if(title==='Графики и диаграммы рассеяния'){
    const ctx=`Классический способ визуализации данных — построение графиков, изображающих зависимости между признаками в виде линий на плоскости. В анализе данных чаще всего строят графики зависимости признаков от времени; это возможно, когда в наборе данных присутствует признак, связанный со шкалой времени. В общем случае при анализе возможной взаимосвязи двух признаков функциональная зависимость между ними, как правило, отсутствует, но могут существовать более сложные статистические связи.

Поэтому в общем случае для того, чтобы выдвинуть гипотезу о наличии зависимости между признаками, строят диаграммы рассеяния, изображающие значения двух признаков в виде точек на плоскости. Каждой строке набора данных на диаграмме рассеяния соответствует точка: координата x соответствует значению одного признака в этой строке, а координата y — значению второго признака.`;

    add(out,'Для чего в общем случае строят диаграмму рассеяния и что на ней представляет каждая точка?',`
Диаграмму рассеяния строят для того, чтобы выдвинуть гипотезу о наличии зависимости между двумя признаками. Каждой строке набора данных соответствует точка на плоскости: координата x равна значению одного признака, координата y — значению второго признака.
`,ctx,['диаграмм рассеян','гипотез','зависим','точк','координат'],'theory',sec,{context:ctx,rubric:[['цель','гипотез','зависим'],['точк','строк','наблюден'],['координат','x','y']]});

    add(out,'Почему для анализа взаимосвязи двух признаков обычно используют диаграмму рассеяния, а не график функциональной зависимости?',`
В общем случае между двумя признаками отсутствует функциональная зависимость, но могут существовать более сложные статистические связи. Поэтому для выдвижения гипотезы о наличии зависимости значения двух признаков изображают точками на плоскости.
`,ctx,['функциональ','статистич','зависим'],'theory',sec,{context:ctx,rubric:[['отсутств','функциональ','функциональной'],['статистич','связ'],['точк','плоскост']]});

    add(out,'Как формируется одна точка на диаграмме рассеяния по строке исходного набора данных?',`
Каждой строке набора данных соответствует одна точка. Координата x этой точки соответствует значению одного из признаков в данной строке, а координата y — значению второго признака.
`,ctx,['строк','точк','координат'],'theory',sec,{context:ctx,rubric:[['строк','наблюден'],['точк'],['x','y','координат']]});
    return out;
  }

  if(title==='Диаграммы размаха'){
    const ctx=`Медиана делит организованный в порядке неубывания ряд значений признака X на две половины. Квартили — числа, делящие организованный ряд значений признака X на четыре равные по численности части: 25% значений не больше первой, 50% — не больше второй, 75% — не больше третьей квартили; вторая квартиль совпадает с медианой.

Чтобы найти квартили, сначала располагают значения признака в порядке неубывания и находят медиану — среднюю квартиль x₀,₅₀. Затем находят медиану для части значений, не больших медианы, — нижнюю квартиль x₀,₂₅, и медиану для части значений, не меньших медианы, — верхнюю квартиль x₀,₇₅.

Межквартильный размах IQR = x₀,₇₅ − x₀,₂₅ служит характеристикой разброса значений признака. Значения, не попадающие в отрезок [x₀,₂₅ − 1,5IQR; x₀,₇₅ + 1,5IQR], называются выбросами.

Для визуализации распределения данных по квартилям используется диаграмма размаха («ящик с усами»). «Ящик» — прямоугольник, нижняя и верхняя границы которого соответствуют нижней и верхней квартилям. Внутри ящика на уровне медианы проводят линию, а среднее значение отмечают крестиком. «Усы» определяют границы основного диапазона значений; выбросы отмечаются отдельными точками.

По диаграмме размаха можно увидеть типичные значения признака: половина значений находится в ящике, а практически все значения, кроме выбросов, — в границах усов. Если медиана и среднее совпадают и находятся примерно посередине ящика, это говорит в пользу симметричности распределения; смещение медианы к одному из концов ящика или различие длины верхнего и нижнего усов указывает на скошенность распределения.`;

    add(out,'Что такое межквартильный размах IQR и что он характеризует?',`
Межквартильный размах определяется формулой IQR = x₀,₇₅ − x₀,₂₅ и служит характеристикой разброса значений изучаемого признака.
`,ctx,['iqr','x₀,₇₅','x₀,₂₅','разброс'],'theory',sec,{context:ctx,rubric:[['iqr'],['x₀,₇₅','верхн','треть'],['x₀,₂₅','нижн','перв'],['разброс']]});

    add(out,'Какие элементы показывает диаграмма размаха и что означает каждый из них?',`
Диаграмма размаха содержит ящик, медиану, среднее, усы и, при наличии, отдельные точки-выбросы. Нижняя и верхняя границы ящика соответствуют нижней и верхней квартилям; линия внутри ящика соответствует медиане; среднее отмечается крестиком; усы задают границы основного диапазона значений; выбросы отмечаются отдельными точками.
`,ctx,['ящик','медиан','средн','усы','выброс'],'theory',sec,{context:ctx,rubric:[['ящик','квартил'],['медиан'],['средн'],['ус'],['выброс','точк']]});

    add(out,'Как по диаграмме размаха можно судить о симметричности или скошенности распределения?',`
Если медиана и среднее совпадают и находятся примерно посередине ящика, это говорит в пользу симметричности распределения. Если медиана смещена к одному из концов ящика или верхний и нижний усы имеют разную длину, распределение считается скошенным.
`,ctx,['симметр','скошен','медиан','средн','ус'],'theory',sec,{context:ctx,rubric:[['симметр','совпад','середин'],['медиан','смещ'],['ус','длин','различ'],['скошен']]});
    return out;
  }

  if(title==='Выбросы'){
    const ctx=`Одной из типичных и важных проблем при анализе реальных наборов данных является проблема выбросов, которые искажают характеристики признаков и их взаимосвязей. Выбросами называются значения признака, не попадающие в отрезок [x₀,₂₅ − 1,5IQR; x₀,₇₅ + 1,5IQR].

Первым шагом при поиске выбросов является визуализация данных с помощью диаграмм размаха и диаграмм рассеяния. При анализе выбросов необходимо рассматривать каждое значение-кандидат: действительно ли оно является выбросом либо в данных есть важные специальные подмножества, которые нужно рассматривать отдельно.

Выбросы могут быть связаны с ошибками подготовки данных, например с вводом числа не в тот столбец или с пропуском десятичной запятой. В некоторых случаях выбросы следует отбросить, чтобы избежать искажения результатов, а в других ситуациях выбросы являются важнейшим предметом исследования. Например, при обнаружении мошеннических транзакций именно необычные, нетипичные транзакции представляют основной интерес.

В общем случае рассматриваются варианты работы с выбросами: замена выброса соответствующей границей отрезка [x₀,₂₅ − 1,5IQR; x₀,₇₅ + 1,5IQR] или обработка выброса как пропущенного значения. Для каждого признака X целесообразно добавить специальный признак Xвыбр., равный единице, если значение X в данной строке исходного набора данных классифицировано как выброс.`;

    add(out,'Как определяется выброс в рассматриваемом подходе?',`
Выбросом называется значение признака, не попадающее в отрезок [x₀,₂₅ − 1,5IQR; x₀,₇₅ + 1,5IQR].
`,ctx,['выброс','отрезок','1,5IQR','квартил'],'theory',sec,{context:ctx,rubric:[['выброс','значен'],['не попада','за предел','вне'],['1,5IQR','iqr'],['x₀,₂₅','x₀,₇₅','квартил']]});

    add(out,'Почему обнаруженный кандидат в выбросы нельзя автоматически удалять?',`
Каждое значение-кандидат необходимо отдельно рассматривать: оно может быть действительно выбросом, ошибкой подготовки данных или частью важного специального подмножества. В некоторых задачах выбросы сами являются предметом исследования, например при обнаружении мошеннических транзакций.
`,ctx,['кандидат','ошибк','подмножеств','исследован'],'theory',sec,{context:ctx,rubric:[['кандидат','отдельн','рассмат'],['ошибк'],['подмножеств','специальн'],['исследован','мошеннич','мошен']]});

    add(out,'Какие варианты обработки выбросов рассматриваются в тексте?',`
Рассматриваются два варианта: заменить выброс соответствующей границей отрезка [x₀,₂₅ − 1,5IQR; x₀,₇₅ + 1,5IQR] или обработать выброс как пропущенное значение.
`,ctx,['замен','границ','пропущен'],'theory',sec,{context:ctx,rubric:[['замен'],['границ','1,5IQR'],['пропущен']]});

    add(out,'Зачем для признака X добавлять специальный признак Xвыбр. и что означает его значение 1?',`
Признак Xвыбр. позволяет сохранить информацию о том, какие исходные значения были классифицированы как выбросы. Значение Xвыбр. = 1 означает, что значение признака X в данной строке исходного набора данных было классифицировано как выброс.
`,ctx,['xвыбр','единиц','классифицир','выброс'],'theory',sec,{context:ctx,rubric:[['xвыбр','признак'],['1','единиц'],['классифицир','выброс']]});
    return out;
  }

  if(title==='Пропущенные значения'){
    const ctx=`При обработке реальных наборов данных могут встречаться пропущенные значения. Причина пропуска не всегда означает ошибку: например, для курса RUR/USD после каждых пяти значений курса идут два пропущенных значения, поскольку Банк России устанавливает обменные курсы в рабочие дни; в пятницу устанавливается курс на субботу, а в понедельник — на вторник.

Если значение нельзя восстановить по смыслу данных, его приходится заменять оценочным значением. В рассмотренном наборе данных пропущенные значения признаков «Серебр. кофеварки» и «Расходы на рекламу» предлагается заменить медианами, рассчитанными по имеющимся значениям. Альтернативный вариант — использовать метод ближайших соседей, например взять среднее между значениями в предыдущий и последующий дни.

При обработке данных целесообразно сохранять информацию о том, какие значения были пропущены: для этого вводятся дополнительные признаки «Пропущ – серебр.», «Пропущ – реклама» и т. п., равные единице в строках, где обрабатывались соответствующие пропуски, и нулю в остальных строках.`;

    add(out,'Почему пропущенное значение не всегда следует считать ошибкой?',`
Причина пропуска может быть обусловлена способом формирования данных. Например, для курса RUR/USD пропуски связаны с тем, что обменные курсы устанавливаются в рабочие дни: в пятницу устанавливается курс на субботу, а в понедельник — на вторник.
`,ctx,['пропуск','рабоч','курс','пятниц','понедельник'],'theory',sec,{context:ctx,rubric:[['пропуск','причин'],['рабоч','дн'],['пятниц','суббот'],['понедельник','вторник']]});

    add(out,'Какими способами в тексте предлагается заменить пропущенные значения?',`
В тексте предлагается заменять пропущенные значения медианой, вычисленной по имеющимся значениям. Альтернативой называется метод ближайших соседей, например использование среднего между значениями в предыдущий и последующий дни.
`,ctx,['медиан','ближайш сосед','предыдущ','последующ'],'theory',sec,{context:ctx,rubric:[['медиан'],['ближайш сосед'],['предыдущ','последующ']]});

    add(out,'Зачем при обработке пропусков вводить дополнительный признак «Пропущ»?',`
Дополнительный признак позволяет сохранить информацию о факте обработки пропущенного значения. Он равен единице в строках, где обрабатывался соответствующий пропуск, и нулю в остальных строках.
`,ctx,['пропущ','единиц','нул','обработ'],'theory',sec,{context:ctx,rubric:[['пропущ','признак'],['единиц'],['нул'],['обработ']]});
    return out;
  }

  if(title==='Проверка гипотезы о числовом значении математического ожидания нормального закона распределения'){
    const ctx=`Рассматривается проверка гипотезы H₀: a = a₀ о числовом значении математического ожидания при нормальном законе распределения генеральной совокупности. В случае известного σ и неизвестного a статистика критерия имеет вид Z = (X̄ − a₀)√n/σ.

Для альтернативы a > a₀ критическая область задаётся условием Z > z₁−α; для альтернативы a < a₀ — условием Z < −z₁−α. Для двусторонней альтернативы a ≠ a₀ критическая область определяется условием |Z| > z₁−α/2. При двусторонней альтернативе критерий уже не является наиболее мощным.

В тексте отдельно рассматривается ситуация, когда σ неизвестно. Тогда используется статистика Tₙ₋₁ = (X̄ − a₀)√n/s, имеющая распределение Стьюдента с n−1 степенью свободы. Для правосторонней, левосторонней и двусторонней альтернатив критические области задаются соответственно через правую, левую и двустороннюю критические точки распределения Стьюдента.

Важное замечание текста: отклонение нулевой гипотезы на малом уровне значимости не означает автоматически, что различие практически существенно. При больших объёмах выборки статистика критерия может стать большой даже при небольшом различии между математическими ожиданиями. Поэтому одной статистической значимости для принятия решения недостаточно; необходимо учитывать существенность различия.`;

    add(out,'Какую статистику используют для проверки H₀: a = a₀, если σ известно? Запишите формулу и объясните обозначения.',`
При известном σ используется статистика Z = (X̄ − a₀)√n/σ, где X̄ — выборочное среднее, a₀ — значение математического ожидания по нулевой гипотезе, n — объём выборки, σ — известное стандартное отклонение генеральной совокупности.
`,ctx,['Z','X̄','a₀','n','σ'],'formula',sec,{context:ctx,formula_answer:'Z=(X̄-a₀)√n/σ',rubric:[['Z'],['X̄','средн'],['a₀','нулев'],['n','объем'],['σ','известн']]});

    add(out,'Как изменяется критическая область при правосторонней, левосторонней и двусторонней альтернативных гипотезах?',`
Для альтернативы a > a₀ критическая область задаётся Z > z₁−α. Для альтернативы a < a₀ — Z < −z₁−α. Для альтернативы a ≠ a₀ — |Z| > z₁−α/2.
`,ctx,['правосторон','левосторон','двусторон','критическ'],'theory',sec,{context:ctx,rubric:[['a >','правосторон','>'],['a <','левосторон','<'],['a ≠','двусторон','|Z|']]});

    add(out,'Что меняется в критерии проверки гипотезы о математическом ожидании, если σ неизвестно?',`
При неизвестном σ используется статистика Tₙ₋₁ = (X̄ − a₀)√n/s, которая имеет распределение Стьюдента с n−1 степенью свободы. Критические области определяются с использованием соответствующих квантилей распределения Стьюдента.
`,ctx,['неизвестн','Tₙ₋₁','s','Стьюдент','n−1'],'theory',sec,{context:ctx,rubric:[['неизвестн','σ'],['T','статистик'],['s','выборочн'],['Стьюдент'],['n−1','степен']]});

    add(out,'Почему статистическая значимость различия не означает автоматически его практическую существенность?',`
При большом объёме выборки статистика критерия может возрастать даже при небольшом различии математических ожиданий. Поэтому можно получить основания отвергнуть H₀ при очень малом различии, которое практически незаметно. Для принятия решения необходимо учитывать не только статистическую значимость, но и существенность различия.
`,ctx,['значим','объем','выборк','маленьк','существен'],'theory',sec,{context:ctx,rubric:[['больш','объем','n'],['мал','различ'],['статистическ','значим'],['практическ','существен']]});
    return out;
  }


  if(title==='Комбинации без повторений'){
    const r={
      fact:'Факториалом натурального числа n называется число n! = n(n − 1)(n − 2) ··· 3·2·1. Факториалом нуля по определению является единица: 0! = 1.',
      arr:'Размещениями из n элементов по k называются упорядоченные подмножества множества S, состоящие из k различных элементов и отличающиеся друг от друга составом элементов или порядком их расположения. Число размещений: Aₙᵏ = n!/(n − k)! = n(n − 1)(n − 2)···(n − k + 1).',
      perm:'Перестановками из n элементов называются размещения из n элементов по n, то есть упорядоченные подмножества, состоящие из всех элементов множества и отличающиеся только порядком. Число перестановок: Pₙ = n!.',
      comb:'Сочетаниями из n элементов по k называются подмножества множества S, состоящие из k различных элементов и отличающиеся друг от друга только составом элементов. Число сочетаний: Cₙᵏ = n!/[k!(n − k)!].',
      sym:'Для сочетаний выполняется равенство Cₙᵏ = Cₙⁿ⁻ᵏ, 0 ≤ k ≤ n.'
    };
    add(out,'Как определяется факториал натурального числа n? Запишите формулу n! и укажите, чему равен 0!.',r.fact,r.fact,['факториал','n'],'fact',sec);
    add(out,'Что называется размещениями из n элементов по k? Чем два размещения могут отличаться друг от друга? Запишите формулу.',r.arr,r.arr,['размещен','состав','порядок'],'arr',sec);
    add(out,'Что называется перестановками из n элементов? Как связаны перестановки с размещениями и чему равно их число?',r.perm,r.perm,['перестанов','размещен','порядок'],'perm',sec);
    add(out,'Что называется сочетаниями из n элементов по k? Чем сочетания отличаются друг от друга и чему равно их число?',r.comb,r.comb,['сочетан','состав','n'],'comb',sec);
    add(out,'Запишите свойство симметрии числа сочетаний и укажите диапазон допустимых значений k.',r.sym,r.sym,['сочетан','симметр'],'sym',sec);
    return out;
  }

  if(title==='Комбинации с повторениями'){
    const r={
      arr:'Размещениями с повторениями из n элементов по k называются упорядоченные подмножества множества S, состоящие из k элементов. Среди элементов размещения могут оказаться одинаковые. Размещения отличаются друг от друга составом элементов или порядком их расположения. Число размещений с повторениями равно n^k.',
      comb:'Сочетаниями с повторениями из n элементов по k называются неупорядоченные подмножества множества S, состоящие из k элементов. Среди элементов сочетания могут быть одинаковые. Сочетания с повторениями отличаются друг от друга только составом элементов. Число сочетаний с повторениями равно C_{n+k-1}^k = (n+k-1)!/[k!(n-1)!].',
      k0:'Для k = 0 формулы числа размещений и сочетаний с повторениями справедливы при естественном соглашении о пустом подмножестве.',
      perm:'Перестановками с повторениями называются перестановки n элементов, среди которых имеются повторяющиеся элементы. Если элементы повторяются n₁, n₂, …, nₘ раз и n₁ + n₂ + … + nₘ = n, то число перестановок с повторениями равно P = n!/(n₁!n₂!…nₘ!).',
      dist:'Размещения с повторениями учитывают порядок элементов, а сочетания с повторениями порядок не учитывают. В обоих случаях одинаковые элементы могут повторяться.'
    };
    add(out,'Что называется размещениями с повторениями из n элементов по k? Укажите, могут ли элементы повторяться, и чем различаются два размещения.',r.arr,r.arr,['размещен','повторен','порядок'],'arrRep',sec);
    add(out,'Запишите формулу числа размещений с повторениями из n элементов по k. Что обозначают n и k?',r.arr,r.arr,['размещен','повторен','n','k'],'arrRepFormula',sec);
    add(out,'Что называется сочетаниями с повторениями из n элементов по k? Чем два таких сочетания могут различаться?',r.comb,r.comb,['сочетан','повторен','состав'],'combRep',sec);
    add(out,'Запишите формулу числа сочетаний с повторениями из n элементов по k. Что обозначают n и k?',r.comb,r.comb,['сочетан','формул','n','k'],'combRepFormula',sec);
    add(out,'Чем размещения с повторениями отличаются от сочетаний с повторениями по признаку порядка элементов?',r.dist,r.dist,['размещен','сочетан','порядок'],'repCompare',sec);
    add(out,'Что называется перестановками с повторениями? Запишите условие n₁ + n₂ + … + nₘ = n и формулу числа таких перестановок.',r.perm,r.perm,['перестанов','повторен','n₁'],'permRep',sec);
    add(out,'Какое утверждение о формулах для k = 0 приводится для размещений и сочетаний с повторениями?',r.k0,r.k0,['k','0','формул'],'k0',sec);
    return out;
  }

  if(title==='Выбросы'){
    const r={
      def:'Выбросами называются значения признака, не попадающие в отрезок [x₀,₂₅ − 1,5IQR; x₀,₇₅ + 1,5IQR].',
      step:'Первым шагом при поиске выбросов является визуализация данных с помощью диаграмм размаха и диаграмм рассеяния.',
      decision:'При анализе выбросов необходимо рассматривать каждое значение-кандидат: действительно ли оно является выбросом, либо в данных есть важные специальные подмножества, которые нужно рассматривать отдельно.',
      variants:'В общем случае возможны следующие варианты работы с выбросами: замена выброса соответствующей границей отрезка [x₀,₂₅ − 1,5IQR; x₀,₇₅ + 1,5IQR] и обработка выброса как пропущенного значения.',
      fraud:'В некоторых ситуациях выбросы являются важнейшим предметом исследования. Например, при обнаружении мошеннических транзакций по банковским картам именно необычные, нетипичные транзакции представляют основной интерес.',
      indicator:'Для каждого признака X целесообразно добавить специальный признак Xвыбр., значение которого равно единице, если значение X в данной строке классифицировано как выброс.'
    };
    add(out,'Как определяется выброс? Укажите интервал, за пределами которого значение признака считается выбросом.',r.def,r.def,['выброс','iqr','отрезок'],'outlierDef',sec);
    add(out,'Какой шаг является первым при поиске выбросов? Какие два вида диаграмм для этого используются?',r.step,r.step,['первым','поиск','диаграмм'],'outlierStep',sec);
    add(out,'Как следует принимать решение о том, является ли значение-кандидат действительно выбросом?',r.decision,r.decision,['кандидат','выброс','подмножеств'],'outlierDecision',sec);
    add(out,'Какие два варианта обработки выбросов рассматриваются?',r.variants,r.variants,['замен','границ','пропущен'],'outlierVariants',sec);
    add(out,'Почему выбросы не всегда следует удалять? Приведите ситуацию, когда выбросы сами являются предметом исследования.',r.fraud,r.fraud,['мошен','транзакц','интерес'],'outlierFraud',sec);
    add(out,'Какой специальный признак Xвыбр. рекомендуется добавить к набору данных и что означает его значение 1?',r.indicator,r.indicator,['xвыбр','единиц','классифицир'],'outlierIndicator',sec);
    return out;
  }

  return out;
}

async function loadConceptGraph(){
  try{
    const r=await fetch('data/concept_graph.json',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    state.graph=await r.json();
  }catch(e){
    console.warn('Concept graph unavailable:',e);
    state.graph=null;
  }
}

function graphContextFor(sec){
  const g=state.graph;
  if(!g?.nodes || !g?.edges) return {text:'',concepts:[]};

  const sectionNode=g.nodes.find(n=>n.type==='section' && n.section_id===sec.id);
  if(!sectionNode) return {text:'',concepts:[]};

  const direct=g.edges.filter(e=>e.from===sectionNode.id && e.relation==='covers').map(e=>e.to);
  const ids=new Set(direct);

  // Expand only one semantic hop from concepts of the selected section.
  g.edges.forEach(e=>{
    if(ids.has(e.from) && ['requires','defined_using','calculated_from','uses','helps_detect','checked_against','measured_by','contrasts_with'].includes(e.relation))
      ids.add(e.to);
    if(ids.has(e.to) && ['requires','defined_using','calculated_from','uses','helps_detect','checked_against','measured_by','contrasts_with'].includes(e.relation))
      ids.add(e.from);
  });

  const relatedSectionIds=new Set();
  g.edges.forEach(e=>{
    if(ids.has(e.from) || ids.has(e.to)){
      const target=[e.from,e.to];
      target.forEach(id=>{
        const n=g.nodes.find(x=>x.id===id);
        if(n?.type==='section' && n.section_id!==sec.id) relatedSectionIds.add(n.section_id);
      });
    }
  });

  const sections=state.index?.sections||[];
  const related=sections.filter(x=>relatedSectionIds.has(x.id)).slice(0,4);
  const ordered=[sec,...related];
  const chunks=[],seen=new Set();

  ordered.forEach(x=>{
    (x.theory||[]).forEach(t=>{
      const v=clean(t);
      if(v.length>=45 && !seen.has(v)){
        seen.add(v); chunks.push(v);
      }
    });
    (x.concepts||[]).forEach(c=>{
      if(validConcept(c)){
        const v=clean(c.definition);
        if(!seen.has(v)){seen.add(v);chunks.push(v);}
      }
    });
    (x.formulas||[]).forEach(f=>{
      if(validFormula(f)){
        const v=clean((f.name?f.name+': ':'')+f.formula+(f.explanation?' — '+f.explanation:''));
        if(!seen.has(v)){seen.add(v);chunks.push(v);}
      }
    });
  });

  const concepts=[...ids].map(id=>g.nodes.find(n=>n.id===id))
    .filter(n=>n && n.type!=='section')
    .map(n=>n.name);

  return {
    text:chunks.slice(0,14).join('\n\n'),
    concepts:[...new Set(concepts)]
  };
}

function enrichQuestionWithGraph(q,sec){
  const gx=graphContextFor(sec);
  if(!gx.text) return q;

  return {
    ...q,
    reference:[q.reference,gx.text].filter(Boolean).join('\n\n'),
    graph_context:gx.text,
    graph_concepts:gx.concepts,
    answer_spec:{
      type:q.type,
      expected:q.expected,
      required_terms:[...(q.keys||[]),...gx.concepts].slice(0,20)
    }
  };
}

function makeQuestions(sec){
  const override=topicOverrides(sec);
  if(override.length)return override;

  const out=[],
    cs=(sec.concepts||[]).filter(validConcept),
    fs=(sec.formulas||[]).filter(validFormula),
    ms=(sec.methods||[]).filter(m=>m&&clean(m.description).length>=55&&!/пример|задач|решени|excel|ячейк/i.test(m.description)),
    ts=theory(sec);

  cs.forEach(c=>{
    const n=clean(c.name),d=clean(c.definition);
    add(out,`Что называется «${n}»? Дайте определение и укажите отличительный признак, приведённый в определении.`,d,d,words(n).map(stem),'definition',sec);
    add(out,`Какими свойствами или признаками характеризуется «${n}»?`,d,d,words(d).filter(w=>!STOP.has(w)).map(stem),'definition',sec);
  });

  fs.forEach(f=>{
    const n=clean(f.name||'формулу'),formula=clean(f.formula),exp=clean(f.explanation||'');
    add(out,`Запишите ${n}. Объясните, что обозначают основные элементы формулы и при каких условиях она применяется.`,`${formula}. ${exp}`,`${formula}. ${exp}`,words(n+' '+exp).map(stem),'formula',sec,{formula_answer:formula});
  });

  ms.forEach(m=>add(out,`Каков основной порядок действий или назначение «${clean(m.name||sec.title)}»? Назовите конкретные действия или условия.`,m.description,m.description,words(m.description).filter(w=>!STOP.has(w)).map(stem),'method',sec));

  ts.forEach(t=>{
    const low=t.toLowerCase();
    if(/называется|называются|называют/.test(low)){
      const m=t.match(/(?:что\s+)?([^,.;:]{3,100})\s+(?:называется|называются|называют)\s+(.+)/i);
      if(m){
        add(out,`Что называется «${clean(m[1])}»? Сформулируйте определение.`,t,t,words(m[1]).map(stem),'theory',sec);
        return;
      }
    }
    if(/первым шагом|первый шаг/.test(low))
      add(out,`Каков первый шаг при описанной процедуре? Укажите его точно.`,t,t,words(t).filter(w=>!STOP.has(w)).map(stem),'theory',sec);
    else if(/вариант|следующие|способ(а|ы)|случа(е|ях)|услови/.test(low))
      add(out,`Какие конкретные варианты или условия рассматриваются? Перечислите их.`,t,t,words(t).filter(w=>!STOP.has(w)).map(stem),'theory',sec);
    else if(/отлича|различа|равно|равна|равны|определя|вычисля|выража/.test(low))
      add(out,`Какое конкретное правило, соотношение или различие сформулировано в теории? Запишите его и поясните.`,t,t,words(t).filter(w=>!STOP.has(w)).map(stem),'theory',sec);
  });

  const uniq=[],seen=new Set();
  for(const q of out){
    const k=q.question.toLowerCase();
    if(!seen.has(k)){seen.add(k);uniq.push(q);}
  }
  return uniq;
}

function shuffle(a){
  const x=[...a];
  for(let i=x.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [x[i],x[j]]=[x[j],x[i]];
  }
  return x;
}

function generate(sec,n){
  const pool=makeQuestions(sec);
  if(pool.length<n)return null;
  return shuffle(pool).slice(0,n).map(q=>enrichQuestionWithGraph(q,sec));
}

/* ---------- Формульная проверка ---------- */

const SUPER_TO_NORMAL={
  '⁰':'^0','¹':'^1','²':'^2','³':'^3','⁴':'^4',
  '⁵':'^5','⁶':'^6','⁷':'^7','⁸':'^8','⁹':'^9'
};

const SUB_TO_NORMAL={
  '₀':'_0','₁':'_1','₂':'_2','₃':'_3','₄':'_4',
  '₅':'_5','₆':'_6','₇':'_7','₈':'_8','₉':'_9'
};

function normalizeFormula(s){
  let x=clean(s).toLowerCase();

  Object.entries(SUPER_TO_NORMAL).forEach(([a,b])=>{x=x.split(a).join(b);});
  Object.entries(SUB_TO_NORMAL).forEach(([a,b])=>{x=x.split(a).join(b);});

  x=x
    .replace(/−|–|—/g,'-')
    .replace(/×|·|∙/g,'*')
    .replace(/⁄|∕/g,'/')
    .replace(/[{}\[\]]/g,m=>m==='{'||m==='['?'(':')')
    .replace(/\\frac/g,'/')
    .replace(/\s+/g,'');

  /* Cₙᵏ, Aₙᵏ, Pₙ и варианты с индексами приводим к единой записи. */
  x=x.replace(/\b([cap])_?n\^?k\b/g,'$1(n,k)');
  x=x.replace(/\b([cap])\^?k_?n\b/g,'$1(n,k)');
  x=x.replace(/\bp_?n\b/g,'p(n)');

  /* Убираем необязательные знаки умножения вокруг скобок и двойные скобки. */
  x=x.replace(/\(\(/g,'(').replace(/\)\)/g,')');
  x=x.replace(/(\d|[a-z)])\*/g,'$1*');
  x=x.replace(/\*/g,'*');

  return x;
}

function formulaTokens(s){
  return normalizeFormula(s)
    .replace(/[^a-z0-9()+\-*/^_=.,:]/g,'')
    .replace(/=/g,'=')
    .split(/(?=[()+\-*/^_=,:])|(?<=[()+\-*/^_=,:])/)
    .filter(Boolean);
}

function formulasEquivalent(student,expected){
  const a=normalizeFormula(student);
  const b=normalizeFormula(expected);
  if(!a||!b)return false;
  if(a===b)return true;

  /* Убираем только различия записи, не математическое содержание. */
  const compact=x=>x
    .replace(/;+/g,'')
    .replace(/,+/g,',')
    .replace(/\s/g,'')
    .replace(/\*+/g,'*')
    .replace(/\(\)/g,'');

  if(compact(a)===compact(b))return true;

  /* Допускаем эквивалентную запись дроби с квадратными/круглыми скобками
     и Unicode-записью основных комбинаторных обозначений. */
  const ca=compact(a), cb=compact(b);
  if(ca.replace(/\(([^()]*)\)/g,'[$1]')===cb.replace(/\(([^()]*)\)/g,'[$1]'))return true;

  return false;
}

/* ---------- Статистика использования ---------- */

const STATS_KEY='soloviev_test_generator_stats_v1';

function emptyStats(){
  return {
    generatedTests:0,
    generatedQuestions:0,
    checkedAnswers:0,
    topics:[],
    repeatedAttempts:0
  };
}

function loadStats(){
  try{
    const raw=localStorage.getItem(STATS_KEY);
    if(!raw)return emptyStats();
    const s={...emptyStats(),...JSON.parse(raw)};
    if(!Array.isArray(s.topics))s.topics=[];
    return s;
  }catch(e){
    return emptyStats();
  }
}

function saveStats(s){
  try{localStorage.setItem(STATS_KEY,JSON.stringify(s));}catch(e){}
}

function registerTestGenerated(sec,n){
  const s=loadStats();
  const topicId=`${sec.id||''} ${sec.title||''}`.trim();
  const already=s.topics.includes(topicId);
  s.generatedTests+=1;
  s.generatedQuestions+=n;
  if(already)s.repeatedAttempts+=1;
  else s.topics.push(topicId);
  saveStats(s);
  renderStats();
}

function registerCheckedAnswer(){
  const s=loadStats();
  s.checkedAnswers+=1;
  saveStats(s);
  renderStats();
}

function renderStats(){
  const s=loadStats();
  const map={
    generatedTests:s.generatedTests,
    generatedQuestions:s.generatedQuestions,
    checkedAnswers:s.checkedAnswers,
    topics:s.topics.length,
    repeatedAttempts:s.repeatedAttempts
  };
  Object.entries(map).forEach(([id,value])=>{
    const el=$('stat-'+id);
    if(el)el.textContent=value;
  });
}

function resetStats(){
  saveStats(emptyStats());
  renderStats();
}

/* ---------- Оценивание ---------- */

function essentialTerms(text){
  const counts=new Map();
  words(text).filter(w=>!STOP.has(w) && w.length>=4).forEach(w=>{
    const k=stem(w);
    counts.set(k,(counts.get(k)||0)+1);
  });
  return [...counts.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,14)
    .map(x=>x[0]);
}

function copiedQuestionPenalty(answer,question){
  const a=keyset(answer), q=keyset(question);
  if(!a.size || !q.size) return 0;
  let hit=0; q.forEach(x=>{if(a.has(x))hit++;});
  const ratio=hit/q.size;
  return ratio>.75 ? Math.min(.35,(ratio-.75)*1.4) : 0;
}

function evaluate(answer,q){
  const a=clean(answer);
  if(!a) return {score:0,label:'Ответ не введён',cls:'partial'};

  if(q.type==='formula'){
    const formulaExpected=q.formula_answer||q.expected||'';
    const formulaOk=formulasEquivalent(a,formulaExpected);
    const rubric=q.rubric||[];
    const A=keyset(a);
    const matched=rubric.filter(group=>group.some(term=>A.has(stem(term)) || A.has(stem(term.toLowerCase())))).length;
    const coverage=rubric.length?matched/rubric.length:0;
    const score=formulaOk ? .65+.35*coverage : .25*coverage;
    return {
      score:Math.max(0,Math.min(1,score)),
      label:formulaOk?'Формула зачтена':'Формула не зачтена',
      cls:formulaOk?'good':(coverage>=.4?'partial':'bad'),
      formulaOk,
      missing:rubric.filter(group=>!group.some(term=>A.has(stem(term)))).map(g=>g[0]).slice(0,6),
      context:q.context||q.reference||q.expected||''
    };
  }

  const A=keyset(a);
  if(Array.isArray(q.rubric) && q.rubric.length){
    const hits=q.rubric.map(group=>group.some(term=>A.has(stem(term))));
    const coverage=hits.filter(Boolean).length/q.rubric.length;
    let score=coverage;
    if(words(a).length<5) score-=.10;
    score=Math.max(0,Math.min(1,score));
    return {
      score,
      label:score>=.70?'Зачтено':(score>=.40?'Частично':'Не зачтено'),
      cls:score>=.70?'good':(score>=.40?'partial':'bad'),
      missing:q.rubric.filter((group,i)=>!hits[i]).map(g=>g[0]).slice(0,6),
      matched:hits.filter(Boolean).length,
      total:q.rubric.length,
      context:q.context||q.reference||q.expected||''
    };
  }

  const expected=q.expected||q.reference||'';
  const terms=essentialTerms(expected);
  const matched=terms.filter(x=>A.has(x)).length;
  const coverage=terms.length?matched/terms.length:0;
  const required=(q.keys||[]).map(stem).filter(Boolean);
  const requiredCoverage=required.length?required.filter(x=>A.has(x)).length/required.length:coverage;
  let score=.72*coverage+.28*requiredCoverage;
  if(words(a).length<5) score-=.08;
  score=Math.max(0,Math.min(1,score));
  return {
    score,
    label:score>=.65?'Зачтено':(score>=.38?'Частично':'Не зачтено'),
    cls:score>=.65?'good':(score>=.38?'partial':'bad'),
    missing:terms.filter(x=>!A.has(x)).slice(0,8),
    matched,total:terms.length,
    context:q.context||q.reference||expected
  };
}

function renderQuestion(){
  const q=state.questions[state.current];
  if(!q)return;

  $('qmeta').textContent=`Вопрос ${state.current+1} из ${state.questions.length} · ${q.section.id} ${q.section.title}`;
  $('question').textContent=q.question;
  $('answer').value='';
  $('feedback').innerHTML='';
  $('reference').classList.add('hidden');
  $('next').disabled=false;
  $('check').disabled=false;

  const hint=$('formulaHint');
  if(hint){
    if(q.type==='formula'){
      hint.innerHTML='<strong>Подсказка по записи формулы:</strong> используйте обычные символы клавиатуры. Для степени — <code>^</code>, факториала — <code>!</code>, дроби — <code>/</code>, скобки — <code>( )</code>. Например, степень можно записать как <code>n^k</code>. Красивое математическое форматирование не требуется.';
      hint.classList.remove('hidden');
    }else{
      hint.classList.add('hidden');
    }
  }
}

async function loadIndex(){
  try{
    const r=await fetch(INDEX_PATH,{cache:'no-store'});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    state.index=await r.json();

    const secs=Array.isArray(state.index.sections)?state.index.sections:[];
    if(!secs.length)throw new Error('В индексе нет разделов');

    const select=$('topic');
    select.innerHTML='';

    secs.forEach((s,i)=>{
      const o=document.createElement('option');
      o.value=i;
      o.textContent=`${s.id||''} ${s.title||''}`.trim();
      select.appendChild(o);
    });

    $('topic').disabled=false;
    $('start').disabled=false;
    $('status').textContent=`Индекс ${state.index.version||''} загружен: ${state.index.source||'фиксированный источник'}. Разделов: ${secs.length}.`;

    await loadConceptGraph();
    renderStats();
  }catch(e){
    $('status').innerHTML=`<strong>Не удалось загрузить индекс.</strong><br>Проверьте путь <code>${INDEX_PATH}</code> и публикацию GitHub Pages.<br><small>${clean(e.message)}</small>`;
  }
}

$('start').onclick=()=>{
  const sec=state.index.sections[Number($('topic').value)];
  const n=Number($('count').value);
  const generated=generate(sec,n);

  if(!generated){
    $('status').innerHTML=`<strong>Для выбранной темы сейчас доступно менее ${n} достаточно конкретных вопросов.</strong><br>Выберите меньшее количество вопросов или другую тему.`;
    return;
  }

  state.questions=generated;
  state.current=0;
  state.answers=[];
  state.currentTopic=sec;

  registerTestGenerated(sec,n);

  $('test').classList.remove('hidden');
  $('resultCard').classList.add('hidden');
  renderQuestion();
  window.scrollTo({top:$('test').offsetTop-20,behavior:'smooth'});
};

$('check').onclick=()=>{
  const q=state.questions[state.current];
  const raw=$('answer').value;

  if(!clean(raw)){
    $('feedback').innerHTML='<div class="feedback partial"><strong>Ответ не введён.</strong><br>Можно перейти к следующему вопросу без проверки.</div>';
    return;
  }

  const result=evaluate(raw,q);
  state.answers[state.current]=result.score;
  registerCheckedAnswer();

  const formulaNote=q.type==='formula'
    ?`<br><small>${result.formulaOk?'Формула распознана как математически эквивалентная эталонной записи.':'Формула не распознана как эквивалентная эталонной записи.'}</small>`
    :'';
  const missingNote=result.missing?.length
    ?`<div class="missing"><strong>Не хватает ключевых элементов:</strong> ${result.missing.join(', ')}</div>`
    :'';

  $('feedback').innerHTML=`<div class="feedback ${result.cls}"><div class="score">${Math.round(result.score*100)}%</div><strong>${result.label}</strong>${formulaNote}${missingNote}<br><small>Оценка основана на ключевых содержательных элементах эталонного ответа, а не только на совпадении отдельных слов.</small></div>`;

  $('reference').innerHTML=`<strong>Теоретический контекст для проверки:</strong><br><br>${clean(result.context).slice(0,6000)}`;
  $('reference').classList.remove('hidden');
};

$('next').onclick=()=>{
  if(state.current+1>=state.questions.length){
    const checked=state.answers.filter(x=>typeof x==='number');
    const avg=checked.length?checked.reduce((a,b)=>a+b,0)/checked.length:0;

    $('test').classList.add('hidden');
    $('resultCard').classList.remove('hidden');
    $('result').innerHTML=`<div class="score">${checked.length?Math.round(avg*100)+'%':'—'}</div><p>Проверено ответов: ${checked.length} из ${state.questions.length}. Пропущенные вопросы не считаются ошибкой.</p>`;
    window.scrollTo({top:$('resultCard').offsetTop-20,behavior:'smooth'});
    return;
  }

  state.current++;
  renderQuestion();
};

$('restart').onclick=()=>{
  $('resultCard').classList.add('hidden');
  $('test').classList.add('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
};

$('resetStats').onclick=()=>{
  if(confirm('Сбросить локальную статистику использования этого браузера?')){
    resetStats();
  }
};

loadIndex();
