#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build v5.2: a deterministic, theory-first test index from the Soloviev textbook PDF.

Usage:
    python build_test_index.py --pdf "Соловьев Анализ Данных учебник сжатый(1).pdf" \
        --output soloviev_test_index_v5.json

The builder uses the book's own table of contents for section boundaries and
conservative extraction of theory, definitions and formulas. Examples, tasks,
solutions, answer keys and Excel-cell examples are excluded. No LLM is required.
"""
from __future__ import annotations
import argparse, json, re
from pathlib import Path
from typing import List, Dict
import fitz

SECTION_RE=re.compile(r"^\s*(\d+\.\d+\.\d+)\.?\s+(.+?)\s+(\d{2,3})\s*$")
PAGE_NO_RE=re.compile(r"^\s*\d+\s*$")
BAD_START=re.compile(r"^(пример|решение|задач[аиу]|упражнение|самостоятельн|контрольн|ответ|проверьте себя|вопросы|тест)",re.I)
BAD_ANY=re.compile(r"\b(ПРИМЕР\s*\d+|Задачи|Упражнения|Контрольные вопросы|Ответы к заданиям|Ответы к задачам)\b",re.I)
EXCEL_RE=re.compile(r"(Microsoft\s+Excel|Excel|ячейк|столбц|строк[аи].*таблиц|\[@|#ЗНАЧ|#ДЕЛ/0)",re.I)

def norm(s:str)->str:
    s=s.replace("\u00ad","").replace("\u001a","").replace("\u0010","").replace("\ufb01","fi").replace("\ufb02","fl")
    s=re.sub(r"(?<=\w)-\s+(?=\w)","",s)
    for _ in range(3): s=re.sub(r"(?<![А-ЯЁа-яёA-Za-z])((?:[А-ЯЁа-яёA-Za-z]\s+){2,}[А-ЯЁа-яёA-Za-z])(?![А-ЯЁа-яёA-Za-z])",lambda m:re.sub(r"\s+","",m.group(1)),s)
    s=re.sub(r"\s+"," ",s).strip();s=re.sub(r"\s+([,.;:!?])",r"\1",s)
    for a,b in {"Номиналь ные":"Номинальные","свой ству":"свойству","включа ют":"включают","всвязи":"в связи","вкачестве":"в качестве","синициализации":"с инициализации","структурированнымиданными":"структурированными данными","соструктурированными":"со структурированными"}.items():s=s.replace(a,b)
    return s

def clean_line(s:str)->str:return re.sub(r"\s+"," ",re.sub(r"\.{3,}"," ",norm(s))).strip()
def toc_pages(pages:List[str])->List[str]:
    idx=next((i for i,p in enumerate(pages) if "ОГЛАВЛЕНИЕ" in p.upper()),2);return pages[idx:idx+8]
def parse_toc(pages:List[str])->List[Dict]:
    entries=[]
    for page in toc_pages(pages):
        pending=None
        for raw in page.splitlines():
            line=clean_line(raw)
            if not line:continue
            m=SECTION_RE.match(line)
            if m:
                sid,title,pg=m.groups();entries.append({"id":sid,"title":re.sub(r"\s+\d{2,3}$","",title.strip(" .")),"toc_page":int(pg)});pending=None;continue
            m0=re.match(r"^\s*(\d+\.\d+\.\d+)\.?\s+(.+)$",line)
            if m0 and not re.search(r"\s\d{2,3}$",line):pending={"id":m0.group(1),"title":m0.group(2).strip(" .")};continue
            if pending and re.search(r"\b(\d{2,3})\s*$",line):
                pg=int(re.search(r"(\d{2,3})\s*$",line).group(1));title=norm(pending["title"]+" "+re.sub(r"\s*\.\.\.\s*\d{2,3}$","",line).strip());entries.append({"id":pending["id"],"title":re.sub(r"\s+\d{2,3}$","",title),"toc_page":pg});pending=None
    d={e["id"]:e for e in entries};return [d[k] for k in sorted(d,key=lambda x:tuple(map(int,x.split('.'))))]
def locate_heading(page_text:str,sid:str,title:str)->int:
    t=norm(page_text)
    for m in re.finditer(r"\b"+re.escape(sid)+r"\.?\s+",t,re.I):
        tail=t[m.end():m.end()+500].lower();tw=norm(title).lower().split()
        if not tw or all(w in tail for w in tw[:min(4,len(tw))]):return m.start()
    return t.lower().find(norm(title).lower())
def strip_heading_title(t:str,title:str)->str:
    words=[re.escape(w) for w in norm(title).split() if w];return re.sub(r"^\s*"+r"\s*".join(words)+r"\s*","",t,count=1,flags=re.I) if words else t
def section_page_text(page:str,sid:str,title:str,is_start:bool,is_end:bool,next_sid=None,next_title=None)->str:
    t=norm(re.sub(r"^\s*\d{1,3}\s*\n","",page))
    if is_start:
        pos=locate_heading(t,sid,title)
        if pos>=0:t=strip_heading_title(re.sub(r"^"+re.escape(sid)+r"\.?\s*","",t[pos:],count=1,flags=re.I),title)
    if is_end and next_sid:
        pos=locate_heading(t,next_sid,next_title or "")
        if pos>0:t=t[:pos]
    return t
def looks_example_or_task(s:str)->bool:
    if BAD_START.search(s) or BAD_ANY.search(s):return True
    if re.search(r"\b(рис\.|табл\.|таблица)\s*\d",s,re.I) and len(s)<180:return True
    if re.search(r"\b(найдите|определите|рассчитайте|вычислите|постройте|докажите|какова|каков|сколько)\b",s,re.I):return True
    return bool(re.match(r"^\s*\d{1,3}[.)]\s+",s))
def split_paragraphs(text:str)->List[str]:
    lines=[clean_line(x) for x in text.splitlines() if clean_line(x) and not PAGE_NO_RE.match(clean_line(x))];paras=[];cur=[]
    for line in lines:
        if SECTION_RE.match(line):
            if cur:paras.append(" ".join(cur));cur=[]
            paras.append(line);continue
        if len(line)<=2 and not re.search(r"[.!?]$",line):continue
        cur.append(line)
        if re.search(r"[.!?]$",line) and len(line)>60:paras.append(" ".join(cur));cur=[]
    if cur:paras.append(" ".join(cur))
    return [norm(p) for p in paras if len(norm(p))>=25]
def theory_only_text(text:str)->str:
    t=norm(text);marks=[m.start() for pat in [r"\bПРИМЕР\s+\d",r"\bЗадачи\b",r"\bУпражнения\b",r"\bКонтрольные вопросы\b",r"\bОтветы к заданиям\b"] for m in [re.search(pat,t,re.I)] if m];return t[:min(marks)] if marks else t
def sentence_chunks(text:str)->List[str]:
    chunks=re.split(r"(?<=[.!?])\s+|(?=\(\d+\.\d+\.\d+\))",norm(text));return [norm(x) for x in chunks if 45<=len(norm(x))<=1200]
def extract_theory(paragraphs:List[str])->List[str]:
    out=[]
    for p in paragraphs:
        p=theory_only_text(p)
        if not p or looks_example_or_task(p):continue
        if EXCEL_RE.search(p) and ("ячей" in p.lower() or "формул" in p.lower()):continue
        for s in sentence_chunks(p):
            if looks_example_or_task(s) or re.search(r"\b\d{1,2}:\d{2}:\d{2}\b|anonymous|#ЗНАЧ!",s,re.I):continue
            if len(re.findall(r"\d",s))>max(12,len(s)//12):continue
            out.append(s)
    seen=set();res=[]
    for s in out:
        k=re.sub(r"\W+"," ",s.lower()).strip()
        if k not in seen:seen.add(k);res.append(s)
    return res[:40]
def extract_concepts(theory:List[str],sid:str,title:str,page:int)->List[Dict]:
    pats=[re.compile(r"(?P<name>[^.;:]{2,160}?)\s*[—–-]\s*это\s+(?P<def>[^.!?]{30,700})[.!?]",re.I),re.compile(r"(?P<name>[^.;:]{2,160}?)\s+(?:называется|называют)\s+(?P<def>[^.!?]{30,700})[.!?]",re.I),re.compile(r"под\s+(?P<name>[^,.]{2,120})\s+понимается\s+(?P<def>[^.!?]{30,700})[.!?]",re.I)];out=[]
    for s in theory:
        if len(s)>900 or EXCEL_RE.search(s) or looks_example_or_task(s) or re.search(r"\b(например|рассмотрим|пусть|предположим)\b",s,re.I):continue
        for pat in pats:
            m=pat.search(s)
            if not m:continue
            name=norm(m.group("name")).strip(" —–-.:;()\uf071");name=re.sub(r"^\(?\d+(?:\.\d+)*\)?\s*","",name);definition=norm(m.group("name")+" — "+m.group("def"))
            if not(1<=len(name.split())<=14) or re.search(r"\d|[=+*/^{}]",name) or re.search(r"\b(формул[аы]|доказательств|свойств[ао])\b",name,re.I):continue
            if len(definition)>=70:out.append({"name":name[:180],"definition":definition[:900],"source_page":page})
            break
    seen=set();res=[]
    for x in out:
        k=re.sub(r"\W+"," ",x["definition"].lower()).strip()
        if k not in seen:seen.add(k);res.append(x)
    return res[:10]
def formula_clean(s:str)->bool:
    if EXCEL_RE.search(s) or re.search(r"\b(рис\.|табл\.|таблица|пример\w*|задач\w*|решени\w*|доказательств\w*)",s,re.I):return False
    if len(re.findall(r"\d",s))>max(10,len(s)//15):return False
    return len(re.findall(r"[=+\-*/√∑∏≤≥<>^(){}]|\bP\(|\bM\(|\bD\(|\bE\(",s))>=2 and len(s)<=420
def extract_formula_blocks(page_obj,title:str,page:int)->List[Dict]:
    out=[];title_formula=bool(re.search(r"формул[аы]|закон|схема|теорем",title,re.I))
    for block in page_obj.get_text("blocks"):
        raw=block[4]
        if not raw or EXCEL_RE.search(raw) or re.search(r"\b(ПРИМЕР|Задачи|задача|решение|рис\.|табл\.|таблица)\b",raw,re.I):continue
        for m in re.finditer(r"\(\d+\.\d+\.\d+\)",raw):
            lines=[norm(x) for x in raw[:m.start()].splitlines() if norm(x)]
            if not lines:continue
            candidate=norm(" ".join(lines[-4:]))
            if formula_clean(candidate) and "=" in candidate and re.search(r"[|+/\-]|\b(?:P|E|Var|M)\(",candidate) and len(set(re.findall(r"[A-Za-zА-Яа-яЁё]",candidate)))>=3:
                out.append({"name":norm(title)[:180] if title_formula else "Формула","formula":candidate[:500],"explanation":candidate[:700],"source_page":page})
    seen=set();res=[]
    for x in out:
        k=re.sub(r"\W+"," ",x["formula"].lower()).strip()
        if k not in seen:seen.add(k);res.append(x)
    return res[:10]
def extract_methods(theory:List[str],title:str,page:int)->List[Dict]:
    cue=re.compile(r"\b(метод|алгоритм|процедур[аы]|порядок|шаг[аи]|последовательност[ьи]|построени[яе])\b",re.I)
    return [{"name":norm(title),"description":s[:1000],"source_page":page} for s in theory if cue.search(s)][:6]
def main():
    ap=argparse.ArgumentParser();ap.add_argument("--pdf",required=True);ap.add_argument("--output",required=True);a=ap.parse_args();pdf=Path(a.pdf);out=Path(a.output);doc=fitz.open(pdf);pages=[doc[i].get_text("text") for i in range(len(doc))]
    entries=parse_toc(pages)
    if len(entries)<80:raise RuntimeError(f"TOC parsing produced only {len(entries)} sections; refusing incomplete index")
    for i,e in enumerate(entries):e["start_page"]=e["toc_page"];e["end_page"]=(entries[i+1]["toc_page"]-1) if i+1<len(entries) else len(pages)
    sections=[]
    for i,e in enumerate(entries):
        theory=[];concepts=[];formulas=[];methods=[]
        for page_no in range(e["start_page"],min(e["end_page"],len(pages))+1):
            idx=page_no-1;last=page_no==e["end_page"] or page_no==len(pages);ns=entries[i+1]["id"] if i+1<len(entries) else None;nt=entries[i+1]["title"] if i+1<len(entries) else None;txt=section_page_text(pages[idx],e["id"],e["title"],page_no==e["start_page"],last,ns,nt);th=extract_theory(split_paragraphs(txt));theory+=th;concepts+=extract_concepts(th,e["id"],e["title"],page_no);formulas+=extract_formula_blocks(doc[idx],e["title"],page_no);methods+=extract_methods(th,e["title"],page_no)
        def uniq(items,key):
            seen=set();r=[]
            for x in items:
                k=key(x)
                if k not in seen:seen.add(k);r.append(x)
            return r
        sections.append({"id":e["id"],"title":e["title"],"toc_page":e["toc_page"],"start_page":e["start_page"],"end_page":e["end_page"],"theory":uniq(theory,lambda x:re.sub(r"\W+"," ",x.lower()).strip())[:40],"concepts":uniq(concepts,lambda x:re.sub(r"\W+"," ",x["definition"].lower()).strip())[:10],"formulas":uniq(formulas,lambda x:re.sub(r"\W+"," ",x["formula"].lower()).strip())[:10],"methods":uniq(methods,lambda x:re.sub(r"\W+"," ",x["description"].lower()).strip())[:6],"excluded_blocks":["examples","tasks","solutions","answer_keys","excel_formula_examples"]})
    data={"version":"5.2","source":"В. И. Соловьев. Анализ данных в экономике. Москва: КНОРУС, 2018.","source_pdf":pdf.name,"pages_count":len(pages),"sections_count":len(sections),"indexing_method":{"source_pdf":True,"toc_based_boundaries":True,"actual_heading_boundaries":True,"theory_first":True,"conservative_definitions":True,"conservative_formulas":True,"examples_tasks_excluded":True,"answer_sections_excluded":True,"excel_formula_examples_excluded":True,"deterministic":True,"no_llm_required":True},"sections":sections};out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8");print(f"Wrote {out} | sections={len(sections)} | bytes={out.stat().st_size}")
if __name__=="__main__":main()
