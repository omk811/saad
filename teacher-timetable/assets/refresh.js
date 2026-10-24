/* واجهات العرض فقط — لا يغير البيانات أو صلاحيات الحفظ */
(()=>{'use strict';
const root=document.getElementById('dailyBody');
if(root){
 const wrap=root.closest('.tablewrap');wrap.classList.add('reserve-table');
 const labelRows=()=>{const headers=[...wrap.querySelectorAll('thead th')].map(x=>x.textContent);root.querySelectorAll('tr').forEach(tr=>[...tr.cells].forEach((td,i)=>td.dataset.label=headers[i]||''));const rows=[...root.rows].filter(r=>r.cells.length>1);const values=[rows.length,rows.filter(r=>r.querySelector('.reserveSel')?.value).length,rows.filter(r=>!r.querySelector('.reserveSel')?.value).length];document.querySelectorAll('[data-summary]').forEach((e,i)=>e.textContent=values[i]);};
 new MutationObserver(labelRows).observe(root,{childList:true,subtree:true});labelRows();
 const tabs=[...document.querySelectorAll('.tab[data-tab]')];tabs.forEach(b=>{b.setAttribute('aria-controls',b.dataset.tab);b.setAttribute('aria-pressed',String(b.classList.contains('active')));b.addEventListener('click',()=>tabs.forEach(x=>x.setAttribute('aria-pressed',String(x===b))));});
}
for(const id of ['weeklyTimetable','studentClassTimetable']){
 const section=document.getElementById(id);if(!section)continue;
 const table=section.querySelector('.weekly table');if(!table)continue;
 section.classList.add('schedule-view');
 const switches=document.createElement('div');switches.className='view-switch';switches.setAttribute('role','group');switches.setAttribute('aria-label','طريقة عرض الجدول');
 const cards=document.createElement('div');cards.className='week-cards';
 const mobile=matchMedia('(max-width:700px)');let chosen=false;
 const setMode=mode=>{section.dataset.mode=mode;switches.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));};
 for(const [mode,label] of [['cards','عرض الأيام'],['table','الجدول الكامل']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.mode=mode;b.addEventListener('click',()=>{chosen=true;setMode(mode)});switches.append(b)}
 table.parentElement.before(switches);table.parentElement.after(cards);setMode(mobile.matches?'cards':'table');mobile.addEventListener('change',()=>{if(!chosen)setMode(mobile.matches?'cards':'table')});
 const rebuild=()=>{cards.replaceChildren();for(const tr of table.tBodies[0].rows){const cells=[...tr.cells];if(cells.length<2){const p=document.createElement('p');p.textContent=tr.textContent;cards.append(p);continue}const article=document.createElement('article');article.className='day-card';const h=document.createElement('h3');h.textContent=cells[0].textContent;article.append(h);cells.slice(1).forEach((td,i)=>{const row=document.createElement('div');row.className='lesson-line';const n=document.createElement('span');n.className='lesson-number';n.textContent='الحصة '+(i+1);const content=document.createElement('div');for(const node of td.childNodes)content.append(node.cloneNode(true));row.append(n,content);article.append(row)});cards.append(article)}};
 new MutationObserver(rebuild).observe(table.tBodies[0],{childList:true,subtree:true,characterData:true});rebuild();
}
})();
