'use strict';
(()=>{
const SOURCE=window.SAAD_MEETING_TIMETABLE||{};
const NAMES=Object.keys(SOURCE).sort((a,b)=>a.localeCompare(b,'ar'));
const DAYS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'];
const CLASSES=[...new Set(NAMES.flatMap(t=>Object.values(SOURCE[t]).flat().filter(Boolean)))].sort((a,b)=>{const [as,ag]=a.split('/').map(Number),[bs,bg]=b.split('/').map(Number);return ag-bg||as-bs});
const STORE='saad.emergencyPlan.v1';
const $=id=>document.getElementById(id);
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
const defaultTimes=[['07:45','08:45'],['08:45','09:45'],['10:15','11:15'],['11:15','12:15']];
const onsiteTimes=[['07:30','08:10'],['08:10','08:50'],['08:50','09:30'],['09:30','10:10'],['10:10','10:50'],['10:50','11:30'],['11:30','12:10'],['12:10','12:50']];
const actions=['متزامن','غير متزامن','معلم بديل','نشاط بديل','مؤجلة','ملغاة'];
const draft=()=>({version:1,title:'خطة استمرارية التعليم',records:{},training:[
{id:'tr1',day:'الأحد',time:'09:00',title:'جاهزية المنصة والفصول الافتراضية',audience:'فريق التعلم عن بُعد',state:'مقترح'},
{id:'tr2',day:'الإثنين',time:'10:00',title:'إدارة الجلسات والأنشطة التفاعلية',audience:'معلمو المواد',state:'مقترح'},
{id:'tr3',day:'الثلاثاء',time:'09:00',title:'التقويم الإلكتروني وآليات المتابعة',audience:'المعلمون الأوائل والمعلمون',state:'مقترح'}
],checks:{},notes:''});
let state=draft();
try{const v=JSON.parse(localStorage.getItem(STORE)||'null');if(v&&v.version===1&&typeof v.records==='object'&&Array.isArray(v.training))state={...draft(),...v};}catch(_){}
const slotKey=(scenario,day,cls)=>[scenario,day,cls].join('|');
const formKey=()=>slotKey($('scenario').value,$('day').value,$('cls').value);
const count=()=>$('scenario').value==='remote'?4:8;
function initial(scenario,day,cls){
 const result=[];
 for(let i=0;i<(scenario==='remote'?4:8);i++){
 const matches=NAMES.filter(t=>SOURCE[t]?.[day]?.[i]===cls);
 const times=scenario==='remote'?defaultTimes:onsiteTimes;
 result.push({timeFrom:times[i][0],timeTo:times[i][1],teacher:scenario==='onsite'?(matches[0]||''):'',alternative:'',subject:'',action:scenario==='remote'?'متزامن':'معلم بديل',note:''});
 }return result;
}
function getRows(){const k=formKey();if(!Array.isArray(state.records[k]))state.records[k]=initial($('scenario').value,$('day').value,$('cls').value);return state.records[k];}
function isInactive(row){return row.action==='مؤجلة'||row.action==='ملغاة'||row.action==='نشاط بديل'||row.action==='غير متزامن';}
function assigned(row){return isInactive(row)?'':row.action==='معلم بديل'?(row.alternative||''):row.teacher;}
function collectAssignments(scenario,day){
 const list=[];
 for(const cls of CLASSES){const k=slotKey(scenario,day,cls),items=state.records[k];if(!Array.isArray(items))continue;items.forEach((r,i)=>{const name=assigned(r);if(name)list.push({cls,period:i+1,name});});}
 return list;
}
function originalAssignment(name,day,slot){return !!SOURCE[name]?.[day]?.[slot-1];}
function overlap(a,b){return a.timeFrom<b.timeTo&&b.timeFrom<a.timeTo;}
function issues(row,slot,cls,scenario,day){
 const found=[];const name=assigned(row);
 if(!name)return row.action==='معلم بديل'?'اختر معلمًا بديلًا':'';
 if(name==='خليل اسلامية'&&day==='الأحد')found.push('مرتبط بالتدريب الأحد');
 if(row.timeFrom>=row.timeTo)found.push('توقيت غير صالح');
 // يتعارض مع حصته الأصلية عند استخدام الجدول الاعتيادي، وليس مع قالب التعلم عن بُعد
 if(scenario==='onsite'&&originalAssignment(name,day,slot)&&SOURCE[name][day][slot-1]!==cls)found.push('لديه حصة أصلية مع شعبة أخرى');
 for(const [key,items] of Object.entries(state.records)){
 const [sc,d,otherCls]=key.split('|');if(sc!==scenario||d!==day||!Array.isArray(items))continue;
 items.forEach((other,i)=>{if(otherCls===cls&&i+1===slot)return;
 if(assigned(other)===name&&overlap(row,other))found.push('متزامن مع '+otherCls+' (الفترة '+(i+1)+')');
 });
 }
 return [...new Set(found)].join('، ');
}
function selectOptions(values,current,empty='— غير محدد —'){
 return '<option value="">'+escape(empty)+'</option>'+values.map(n=>'<option value="'+escape(n)+'" '+(n===current?'selected':'')+'>'+escape(n)+'</option>').join('');
}
function renderTable(){
 const scenario=$('scenario').value,day=$('day').value,cls=$('cls').value,rows=getRows();
 const owner=NAMES.filter(n=>Object.values(SOURCE[n]||{}).some(arr=>arr.includes(cls))).length;
 $('viewLabel').textContent='الشعبة '+cls+' · '+day+' · '+(scenario==='remote'?'أربع ساعات للتعلم عن بُعد':'ثماني حصص للطوارئ')+' · معلمون مرتبطون بالشعبة: '+owner;
 $('grid').innerHTML=rows.map((r,i)=>{
 const issue=issues(r,i+1,cls,scenario,day);
 return '<tr data-i="'+i+'"><td>'+(i+1)+'</td>'+
 '<td><input class="small" type="time" data-field="timeFrom" value="'+escape(r.timeFrom)+'"></td>'+
 '<td><input class="small" type="time" data-field="timeTo" value="'+escape(r.timeTo)+'"></td>'+
 '<td><select data-field="teacher">'+selectOptions(NAMES,r.teacher)+'</select></td>'+
 '<td><select data-field="alternative">'+selectOptions(NAMES,r.alternative)+'</select></td>'+
 '<td><input class="long" data-field="subject" maxlength="100" value="'+escape(r.subject)+'" placeholder="المادة أو النشاط"></td>'+
 '<td><select data-field="action">'+actions.map(a=>'<option '+(a===r.action?'selected':'')+'>'+a+'</option>').join('')+'</select></td>'+
 '<td><input class="long" data-field="note" maxlength="250" value="'+escape(r.note)+'" placeholder="تفاصيل إضافية"></td>'+
 '<td class="'+(issue?'conflict':'valid')+'">'+(issue?escape(issue):'✓')+'</td></tr>';
 }).join('');
 const problems=rows.map((r,i)=>issues(r,i+1,cls,scenario,day)).filter(Boolean);
 $('alerts').textContent=problems.length?'تنبيهات لهذا الجدول: '+problems.length+' — '+problems.join(' | '):'لا توجد تعارضات مرصودة في هذا الجدول. راجع الالتزامات غير المدخلة قبل الاعتماد.';
}
$('grid').addEventListener('change',event=>{
 const field=event.target.dataset.field,row=event.target.closest('tr');if(!field||!row)return;
 const i=Number(row.dataset.i),items=getRows();if(!items[i])return;
 items[i][field]=event.target.value;
 renderTable();
});
function renderTraining(){
 $('training').innerHTML=state.training.map((t,i)=>'<tr data-i="'+i+'"><td><select data-field="day">'+DAYS.map(d=>'<option '+(d===t.day?'selected':'')+'>'+d+'</option>').join('')+'</select></td><td><input type="time" data-field="time" value="'+escape(t.time)+'"></td><td><input class="long" data-field="title" value="'+escape(t.title)+'"></td><td><input class="long" data-field="audience" value="'+escape(t.audience)+'"></td><td><select data-field="state">'+['مقترح','معتمد','منفذ','مؤجل'].map(v=>'<option '+(v===t.state?'selected':'')+'>'+v+'</option>').join('')+'</select></td><td><button class="warn" data-remove="'+i+'" type="button">حذف</button></td></tr>').join('');
}
$('training').addEventListener('change',e=>{const row=e.target.closest('tr'),field=e.target.dataset.field;if(!row||!field)return;state.training[Number(row.dataset.i)][field]=e.target.value;});
$('training').addEventListener('click',e=>{const btn=e.target.closest('[data-remove]');if(!btn)return;state.training.splice(Number(btn.dataset.remove),1);renderTraining();});
$('addTraining').onclick=()=>{state.training.push({id:'tr'+Date.now(),day:$('day').value,time:'09:00',title:'',audience:'',state:'مقترح'});renderTraining();};
function persist(message){try{state.title=$('planName').value;state.notes=$('notes').value;for(const id of ['checkTeam','checkPlatform','checkTeachers','checkFamilies','checkSafety'])state.checks[id]=$(id).checked;localStorage.setItem(STORE,JSON.stringify(state));$('status').textContent=message||'حُفظت التعديلات على هذا الجهاز.';}catch(_){$('status').textContent='تعذر الحفظ على هذا الجهاز. استخدم تصدير JSON للاحتفاظ بالخطة.';}}
$('save').onclick=()=>persist('حُفظت الخطة على هذا الجهاز. يمكن تصدير نسخة احتياطية مستقلة.');
$('export').onclick=()=>{
 persist();
 const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='saad-emergency-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('import').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(file.size>1500000){$('status').textContent='حجم الملف كبير جدًا.';return;}
 try{const v=JSON.parse(await file.text());if(v.version!==1||!v.records||!Array.isArray(v.training)||typeof v.records!=='object'||Array.isArray(v.records))throw Error('صيغة غير صالحة');if(!confirm('سيتم استبدال المسودة المحلية الحالية بالملف. متابعة؟'))return;state={...draft(),...v};hydrate();persist('استُعيدت الخطة من الملف بنجاح.');}catch(_){$('status').textContent='الملف غير صالح أو لا ينتمي إلى خطة الطوارئ.';}
 e.target.value='';
});
$('reset').onclick=()=>{if(!confirm('سيتم مسح مسودة خطة الطوارئ المخزنة محليًا فقط. هل تتابع؟'))return;state=draft();hydrate();persist('استعيدت المسودة الافتراضية.');};
$('fromOriginal').onclick=()=>{
 const scenario=$('scenario').value,day=$('day').value,cls=$('cls').value;
 if(!confirm('سيُعاد تكوين مسودة هذه الشعبة فقط اعتمادًا على الجدول الأصلي. تُستبدل التعديلات غير المحفوظة لهذه الشعبة، وتبقى بيانات البوابة الأصلية دون تغيير. متابعة؟'))return;
 const key=formKey();const rows=initial(scenario,day,cls);
 if(scenario==='remote'){
 const lessons=[];
 for(let p=0;p<8;p++)for(const name of NAMES)if(SOURCE[name]?.[day]?.[p]===cls)lessons.push({teacher:name,p});
 lessons.slice(0,4).forEach((x,i)=>{rows[i].teacher=x.teacher;rows[i].subject='مادة المعلم (تحدد يدويًا)';});
 }
 state.records[key]=rows;renderTable();
};
$('scenario').onchange=renderTable;$('day').onchange=renderTable;$('cls').onchange=renderTable;
$('print').onclick=()=>window.print();
function hydrate(){
 $('planName').value=state.title||'خطة استمرارية التعليم';$('notes').value=state.notes||'';
 for(const id of ['checkTeam','checkPlatform','checkTeachers','checkFamilies','checkSafety'])$(id).checked=!!state.checks?.[id];
 renderTraining();renderTable();
}
for(const d of DAYS)$('day').add(new Option(d,d));
for(const cls of CLASSES)$('cls').add(new Option('الصف '+cls.split('/')[1]+' / الشعبة '+cls.split('/')[0],cls));
hydrate();
})();
