/* Graph integration layer v1.0
   Loaded after app.js. It does not replace the Soloviev index.
   The graph expands context and answer keywords through prerequisite concepts.
*/
const CONCEPT_GRAPH_PATH='data/concept_graph.json';

async function loadConceptGraph(){
  try{
    const r=await fetch(CONCEPT_GRAPH_PATH,{cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    state.graph=await r.json();
    return state.graph;
  }catch(e){
    console.warn('Concept graph is unavailable:',e);
    state.graph=null;
    return null;
  }
}

function graphSectionConcepts(sectionId){
  const g=state.graph;
  if(!g?.nodes) return [];
  return g.nodes.filter(n=>
    Array.isArray(n.section_ids) && n.section_ids.includes(sectionId)
  );
}

function graphNeighbors(conceptIds){
  const g=state.graph;
  if(!g?.edges) return [];
  const direct=new Set(conceptIds);
  const result=new Set(conceptIds);
  g.edges.forEach(e=>{
    if(direct.has(e.from)) result.add(e.to);
    if(direct.has(e.to) && ['requires','defined_using','calculated_from','uses'].includes(e.relation))
      result.add(e.from);
  });
  return [...result];
}

function graphContextFor(section){
  const g=state.graph;
  if(!g?.nodes || !state.index?.sections) return {text:'',keys:[]};

  const own=graphSectionConcepts(section.id);
  const ids=graphNeighbors(own.map(n=>n.id));

  /* Найти разделы Соловьёва, которые раскрывают связанные понятия. */
  const relatedSectionIds=new Set();
  g.nodes.forEach(n=>{
    if(ids.includes(n.id) && Array.isArray(n.section_ids))
      n.section_ids.forEach(s=>relatedSectionIds.add(s));
  });
  relatedSectionIds.delete(section.id);

  const related=state.index.sections.filter(s=>relatedSectionIds.has(s.id));

  /* Сначала собственная тема, затем максимум четыре наиболее близких раздела. */
  const ordered=[section,...related.slice(0,4)];

  const chunks=[];
  const seen=new Set();

  ordered.forEach(s=>{
    (Array.isArray(s.theory)?s.theory:[]).forEach(t=>{
      const x=clean(t);
      if(x.length>=45 && !seen.has(x)){
        seen.add(x);
        chunks.push(x);
      }
    });
    (Array.isArray(s.concepts)?s.concepts:[]).forEach(c=>{
      if(validConcept(c)){
        const x=clean(c.definition);
        if(!seen.has(x)){
          seen.add(x);
          chunks.push(x);
        }
      }
    });
    (Array.isArray(s.formulas)?s.formulas:[]).forEach(f=>{
      if(validFormula(f)){
        const x=clean(`${f.name||''}: ${f.formula}. ${f.explanation||''}`);
        if(!seen.has(x)){
          seen.add(x);
          chunks.push(x);
        }
      }
    });
  });

  const names=ids.map(id=>g.nodes.find(n=>n.id===id)?.name).filter(Boolean);
  return {
    text:chunks.slice(0,12).join('\n\n'),
    keys:names
  };
}

function installGraphIntegration(){
  const originalGenerate=window.generate;
  if(typeof originalGenerate!=='function') return;

  window.generate=function(sec,n){
    const qs=originalGenerate(sec,n);
    if(!qs || !state.graph) return qs;

    return qs.map(q=>{
      const gx=graphContextFor(sec);
      if(!gx.text) return q;

      return {
        ...q,
        /* expected остаётся локальным эталоном ответа из Соловьёва.
           Расширяется только reference/context и набор понятий для диагностики. */
        reference:[q.reference,gx.text].filter(Boolean).join('\n\n'),
        graph_context:gx.text,
        graph_concepts:[...new Set([...(q.keys||[]),...gx.keys])].slice(0,24)
      };
    });
  };
}

loadConceptGraph().then(installGraphIntegration);
