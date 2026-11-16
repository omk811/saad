
const DATA=window.SAAD_TIMETABLE.teachers;function printSection(id){
 const section=document.getElementById(id);
 if(!section)return;
 if(id==='studentClassTimetable'&&!document.getElementById('studentClassSelect').value)return;
 const selectValue=document.getElementById('classTeacherSelect')?.value||'';
 const classMeta=document.getElementById('classPrintMeta');
 const lookupMeta=document.getElementById('lookupPrintMeta');
 const weeklyMeta=document.getElementById('weeklyPrintMeta');
 if(classMeta)classMeta.textContent=selectValue?'الصف '+(selectValue.split('/')[1]||'')+' — الشعبة '+(selectValue.split('/')[0]||''):'يرجى اختيار الشعبة';
 if(weeklyMeta)weeklyMeta.textContent='المعلم: '+(document.getElementById('teacher')?.value||'');
 if(lookupMeta)lookupMeta.textContent='اليوم: '+(document.getElementById('lookupDay')?.value||'')+' — الحصة: '+(document.getElementById('lookupPeriod')?.value||'')+' — الصف: '+(LOOKUP_GRADES[document.getElementById('lookupClass')?.value]||'');
 document.querySelectorAll('main>section.print-selected').forEach(x=>x.classList.remove('print-selected'));
 section.classList.add('print-selected');
 document.body.dataset.printTarget=id;
 const oldPageRule=document.getElementById('timetablePrintPageRule');if(oldPageRule)oldPageRule.remove();
 if(id==='weeklyTimetable'||id==='studentClassTimetable'){
  const landscape=document.createElement('style');landscape.id='timetablePrintPageRule';landscape.textContent='@page{size:A4 landscape;margin:10mm}';document.head.appendChild(landscape);
 }
 window.print();
}
window.addEventListener('afterprint',()=>{
 delete document.body.dataset.printTarget;
 const pageRule=document.getElementById('timetablePrintPageRule');if(pageRule)pageRule.remove();
 document.querySelectorAll('main>section.print-selected').forEach(x=>x.classList.remove('print-selected'));
});
const DAYS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'];const teacher=document.getElementById('teacher'),day=document.getElementById('day');const names=Object.keys(DATA).sort((a,b)=>a.localeCompare(b,'ar'));teacher.innerHTML=names.map(n=>'<option value="'+n+'">'+n+'</option>').join('');const prev=localStorage.getItem('saad-timetable-teacher');if(prev&&DATA[prev])teacher.value=prev;const weekday=new Intl.DateTimeFormat('ar-OM',{weekday:'long',timeZone:'Asia/Muscat'}).format(new Date());if(DAYS.includes(weekday))day.value=weekday;function render(){
 const name=teacher.value,d=day.value;
 localStorage.setItem('saad-timetable-teacher',name);
 const periods=DATA[name]?.[d]||Array(8).fill('');
 document.getElementById('title').textContent=name;
 document.getElementById('subtitle').textContent='اليوم: '+d;
 document.getElementById('count').textContent=periods.filter(Boolean).length+' حصص دراسية';
 const getSub=(c)=>typeof lookupSubject==='function'?lookupSubject(name,c):'';
 document.getElementById('periods').innerHTML=periods.map((c,i)=>{
   const sub=c?getSub(c):'';
   return '<div class="period '+(c?'':'free')+'"><div class="num">الحصة '+(i+1)+'</div><strong>'+(c||'فارغة')+'</strong><div class="sub">'+(c?(sub||'المادة غير محددة'):'لا توجد حصة')+'</div></div>';
 }).join('');
 let total=0;
 document.getElementById('weekBody').innerHTML=DAYS.map(wd=>{
   const a=DATA[name]?.[wd]||Array(8).fill('');
   total+=a.filter(Boolean).length;
   return '<tr><th scope="row">'+wd+'</th>'+a.map(c=>{const sub=c?getSub(c):'';return '<td class="'+(c?'has-lesson':'empty-lesson')+'">'+(c?'<div class="weekly-lesson"><strong class="weekly-class">'+c+'</strong><span class="weekly-subject">'+(sub||'المادة غير محددة')+'</span></div>':'<span class="empty-dash">—</span>')+'</td>'}).join('')+'</tr>';
 }).join('');
 document.getElementById('weekTotal').textContent='مجموع الحصص الأسبوعية: '+total;
}const ld=document.getElementById('lookupDay'),lp=document.getElementById('lookupPeriod'),lc=document.getElementById('lookupClass'),lr=document.getElementById('lookupResult');ld.innerHTML=DAYS.map(d=>'<option>'+d+'</option>').join('');ld.value=day.value;lp.innerHTML=Array.from({length:8},(_,i)=>'<option value="'+(i+1)+'">الحصة '+(i+1)+'</option>').join('');const cls=[...new Set(Object.values(DATA).flatMap(v=>Object.values(v).flat().filter(Boolean)))].sort((a,b)=>{const x=a.split('/').map(Number),y=b.split('/').map(Number);return x[1]-y[1]||x[0]-y[0]});const LOOKUP_GRADES={5:'الخامس',6:'السادس',7:'السابع',8:'الثامن'};lc.innerHTML=Object.entries(LOOKUP_GRADES).map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('');function searchLesson(){
 const d=ld.value,p=Number(lp.value),groups=new Map();
 for(const [name,days] of Object.entries(DATA)){
  const c=(days[d]||[])[p-1];if(!c||c.split('/')[1]!==lc.value)continue;
  if(!groups.has(c))groups.set(c,[]);
  groups.get(c).push(name);
 }
 const safe=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const ordered=[...groups].sort(([a],[b])=>{const aa=a.split('/').map(Number),bb=b.split('/').map(Number);return aa[1]-bb[1]||aa[0]-bb[0]});
 const conflicts=ordered.filter(([,names])=>names.length>1).length;
 const summary='<div class="lesson-lookup-summary" role="status"><strong>'+ordered.length+' شعبة لديها حصة</strong><span>'+safe(d)+' — الحصة '+p+' — الصف '+safe(LOOKUP_GRADES[lc.value])+(conflicts?' | '+conflicts+' تعارض يحتاج مراجعة':'')+'</span></div>';
 lr.innerHTML=summary+(ordered.length?'<div class="lookup-class-grid">'+ordered.map(([c,names])=>
  '<article class="lookup-class-card'+(names.length>1?' has-conflict':'')+'">'+
  '<div class="lookup-class-head"><span>الصف '+safe(c.split('/')[1])+'</span><strong>الشعبة '+safe(c.split('/')[0])+'</strong></div>'+
  names.map(name=>'<div class="lookup-class-info"><div class="lookup-class-teacher">'+safe(name)+'</div><div class="lookup-class-subject">'+safe(typeof lookupSubject==='function'?(lookupSubject(name,c)||'المادة غير محددة'):'المادة غير محددة')+'</div></div>').join('')+
  (names.length>1?'<div class="lookup-class-warning">تعارض: أكثر من معلم لهذه الشعبة في الحصة نفسها</div>':'')+
  '</article>').join('')+'</div>':'<div class="lookup-empty">لا توجد حصص لهذا الصف في التوقيت المحدد.</div>');
}
[ld,lp,lc].forEach(el=>el.addEventListener('change',searchLesson));document.getElementById('openSubjectAdmin').addEventListener('click',()=>{const panel=document.getElementById('subjectsAdmin');panel.hidden=!panel.hidden;panel.style.display=panel.hidden?'none':'block';if(!panel.hidden)panel.scrollIntoView({behavior:'smooth'});});const SUBJECT_API='https://script.google.com/macros/s/AKfycbxaE54AYPy3XPTl7JUUw_nVEjA466BJqwZvwHfwPObBAxUuP_tfSZWgmbbne2xMsnxh/exec';const KEY_SUB='saad-subjects-v1';let subjectMap={};try{subjectMap=JSON.parse(localStorage.getItem(KEY_SUB)||'{}')||{}}catch(e){}const et=document.getElementById('editTeacher'),ec=document.getElementById('editClass'),es=document.getElementById('editSubject'),st=document.getElementById('subjectStatus');et.innerHTML=teacher.innerHTML;function editClasses(){const cs=[...new Set(Object.values(DATA[et.value]||{}).flat().filter(Boolean))];ec.innerHTML=cs.map(c=>'<option value="'+c+'">الصف '+c.split('/')[1]+' - الشعبة '+c.split('/')[0]+'</option>').join('');editValue()}function editValue(){const mode=document.getElementById('subjectApplyMode').value;es.value=mode==='one'?(subjectMap[et.value]?.[ec.value]||''):'';ec.disabled=mode==='all';document.getElementById('saveSubject').textContent=mode==='all'?'حفظ المادة لجميع الشعب':'حفظ تعديل الشعبة'}document.getElementById('subjectApplyMode').addEventListener('change',editValue);et.addEventListener('change',editClasses);ec.addEventListener('change',editValue);function storeSubjects(){localStorage.setItem(KEY_SUB,JSON.stringify(subjectMap));showClassTeachers();render();searchLesson();if(typeof renderStudentTimetable==='function')renderStudentTimetable()}document.getElementById('saveSubject').addEventListener('click',async()=>{
 const all=document.getElementById('subjectApplyMode').value==='all';
 const teacherName=et.value,subject=es.value.trim();
 const classes=all?[...new Set(Object.values(DATA[teacherName]||{}).flat().filter(Boolean))]:[ec.value];
 if(!teacherName||!subject||!classes.length||!classes[0]){st.textContent='اختر المعلم والشعبة واكتب المادة';return}
 const adminKey=document.getElementById('subjectAdminKey').value;
 if(!adminKey){st.textContent='أدخل رمز الإدارة أولًا';return}
 const button=document.getElementById('saveSubject');button.disabled=true;
 let saved=0;
 try{
   for(const className of classes){
     st.textContent='جارٍ حفظ المادة: '+(saved+1)+' من '+classes.length;
     const r=await fetch(SUBJECT_API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'saveSubject',teacher:teacherName,className,subject,adminKey})});
     const j=await r.json();
     if(!j.ok)throw Error(j.error||'تعذر حفظ الشعبة '+className);
     subjectMap=j.subjects||subjectMap;
     saved++;
   }
   storeSubjects();
   document.getElementById('subjectAdminKey').value='';
   document.getElementById('subjectsPublicStatus').textContent='تم تحديث المواد بعد الحفظ';
   st.textContent='تم الحفظ الدائم للمادة في '+saved+' شعبة عبر Google Sheets';
 }catch(err){
   if(saved)storeSubjects();
   st.textContent='توقف الحفظ بعد '+saved+' من '+classes.length+' شعبة: '+err.message;
 }finally{button.disabled=false}
});document.getElementById('exportSubjects').addEventListener('click',()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(subjectMap,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='saad-subjects.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});document.getElementById('importSubjects').addEventListener('change',async e=>{try{const v=JSON.parse(await e.target.files[0].text());if(!v||typeof v!=='object'||Array.isArray(v))throw Error('ملف غير صالح');const clean={};for(const [n,cs] of Object.entries(v)){if(!DATA[n]||!cs||typeof cs!=='object')continue;const valid=new Set(Object.values(DATA[n]).flat().filter(Boolean));for(const [c,s] of Object.entries(cs))if(valid.has(c)&&typeof s==='string'&&s.trim())(clean[n]??={})[c]=s.trim().slice(0,100)}subjectMap=clean;storeSubjects();editValue();st.textContent='تم الاستيراد'}catch(err){st.textContent='تعذر استيراد الملف'}e.target.value='' });editClasses();async function loadSubjects(){const pub=document.getElementById('subjectsPublicStatus');pub.textContent='جارٍ مزامنة المواد...';try{const r=await fetch(SUBJECT_API+'?action=subjects&t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(!j.ok)throw Error(j.error||'تعذر التحميل');if(!j.subjects||typeof j.subjects!=='object'||Array.isArray(j.subjects))throw Error('بيانات المواد غير صالحة');subjectMap=j.subjects;storeSubjects();editValue();const count=Object.values(subjectMap).reduce((a,x)=>a+Object.keys(x||{}).length,0);pub.textContent='تمت المزامنة: '+count+' مادة محفوظة';st.textContent='المواد متزامنة مع Google Sheets ('+count+' مادة)';}catch(err){pub.textContent='تعذر تحديث المواد: '+err.message;st.textContent='تعذر تحميل المواد: '+err.message;}}loadSubjects();document.getElementById('refreshSubjects').addEventListener('click',loadSubjects);const link=document.createElement('a');link.href='https://script.google.com/macros/s/AKfycbxaE54AYPy3XPTl7JUUw_nVEjA466BJqwZvwHfwPObBAxUuP_tfSZWgmbbne2xMsnxh/exec?action=subjects';link.target='_blank';link.rel='noopener noreferrer';link.textContent='اختبار اتصال المواد مباشرة';link.style.cssText='display:inline-block;margin-top:10px;color:#176c83;text-decoration:underline';st.after(link);const classSelect=document.getElementById('classTeacherSelect'),classResult=document.getElementById('classTeacherResult');classSelect.innerHTML=lc.innerHTML;function lookupSubject(name,c){const norm=v=>String(v||'').normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();const record=subjectMap[name]||subjectMap[Object.keys(subjectMap).find(k=>norm(k)===norm(name))]||{};const exact=record[c]||record[Object.keys(record).find(k=>norm(k)===norm(c))];if(exact)return exact;const unique=[...new Set(Object.values(record).filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))];return unique.length===1?unique[0]:''}function showClassTeachers(){const c=classSelect.value;if(!c){classResult.textContent='اختر الصف والشعبة لعرض المعلمين.';return}const list=Object.entries(DATA).map(([name,days])=>({name,count:Object.values(days).flat().filter(v=>v===c).length})).filter(x=>x.count).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'ar'));classResult.innerHTML=list.length?'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">'+list.map(x=>'<div style="border:1px solid #dce6ed;border-radius:12px;padding:14px;background:#f8fbfd"><strong>'+x.name+'</strong><div class="sub">عدد الحصص الأسبوعية: '+x.count+'</div><div class="sub">المادة: '+(lookupSubject(x.name,c)||'غير محددة بعد')+'</div></div>').join('')+'</div>':'لا يوجد معلم مسجل لهذه الشعبة.';}
const studentClassSelect=document.getElementById('studentClassSelect');
studentClassSelect.innerHTML='<option value="">اختر الصف والشعبة</option>'+cls.map(c=>'<option value="'+c+'">الصف '+c.split('/')[1]+' — الشعبة '+c.split('/')[0]+'</option>').join('');
function escStudent(t){return String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function renderStudentTimetable(){
 const c=studentClassSelect.value,body=document.getElementById('studentScheduleBody');
 document.getElementById('printStudentSchedule').disabled=!c;
 if(!c){body.innerHTML='<tr><td colspan="9">اختر شعبة لعرض الجدول.</td></tr>';document.getElementById('studentScheduleStatus').textContent='اختر الشعبة أولًا';return}
 let count=0,conflicts=0,missing=0;
 body.innerHTML=DAYS.map(d=>'<tr><th>'+d+'</th>'+Array.from({length:8},(_,p)=>{
 const found=Object.keys(DATA).filter(n=>(DATA[n][d]||[])[p]===c);
 if(!found.length)return '<td class="empty-lesson" title="لا توجد حصة مسجلة لهذه الشعبة في البيانات الحالية"><span class="empty-dash">غير مسجلة</span></td>';
 count++;if(found.length>1)conflicts++;
 return '<td class="has-lesson">'+found.map((n,index)=>{
 const subject=lookupSubject(n,c);
 if(!subject)missing++;
 return '<div class="student-lesson"><b>'+escStudent(subject||'المادة غير محددة')+'</b><small>'+escStudent(n)+'</small>'+(found.length>1&&index===0?'<em>تعارض بالجدول: يلزم مراجعة التكليفين</em>':'')+'</div>';
 }).join('')+'</td>';
 }).join('')+'</tr>').join('');
 const label='الصف '+c.split('/')[1]+' — الشعبة '+c.split('/')[0];
 document.getElementById('studentPrintMeta').textContent='جدول الطالب — '+label+' — العام الدراسي 2026/2027';
 document.getElementById('studentScheduleStatus').textContent=label+' | الحصص: '+count+(conflicts?' | تعارضات تحتاج مراجعة: '+conflicts:'')+(missing?' | مواد تحتاج تحديدًا':'');
}
studentClassSelect.addEventListener('change',renderStudentTimetable);
renderStudentTimetable();
classSelect.addEventListener('change',showClassTeachers);showClassTeachers();teacher.addEventListener('change',render);day.addEventListener('change',render);render();searchLesson();

/* تخصيص مظهر الصفحة دون تغيير منطق الجدول والحفظ والطباعة */
(function(){
 const view=document.body.dataset.view;
 if(view==='admin'){
   const panel=document.getElementById('subjectsAdmin');
   panel.hidden=false;panel.style.display='block';
 }
 const labels={daily:'الجدول اليومي',weekly:'الجدول الأسبوعي',classes:'معلمو الصف والشعبة',lookup:'البحث عن معلم الحصة',student:'جدول الطالب',admin:'إدارة المواد'};
 if(labels[view])document.title=labels[view]+' | مدرسة سعد بن معاذ';
})();
