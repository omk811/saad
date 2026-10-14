'use strict';
(()=>{
const API='https://script.google.com/macros/s/AKfycbxaE54AYPy3XPTl7JUUw_nVEjA466BJqwZvwHfwPObBAxUuP_tfSZWgmbbne2xMsnxh/exec';
const el=id=>document.getElementById(id);
const activeGrade=()=>el('studentGrade').value;
const updateSectionOptions=()=>{const sel=el('studentSection');sel.querySelector('[value="7"]').hidden=activeGrade()!=='السابع';if(activeGrade()!=='السابع'&&sel.value==='7')sel.value='';};
let students=[];
function safe(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
async function api(action,fields={}){
 const adminKey=el('studentPassword').value;
 if(!adminKey)throw Error('رمز الإدارة مطلوب');
 const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,adminKey,...fields})});
 if(!r.ok)throw Error('تعذر الاتصال بالخدمة');
 const j=await r.json();if(!j.ok)throw Error(j.error||'تعذر تنفيذ الطلب');
 return j;
}
function draw(){
 el('studentTotal').textContent='('+students.length+' طالب)';
 el('studentRows').innerHTML=students.length?students.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+safe(x.name)+'</td><td>'+safe(x.section)+'</td><td>'+safe(x.schoolId.startsWith('PENDING-')?'غير متوفر':x.schoolId)+'</td><td>'+safe(x.area||'—')+'</td><td>'+safe(x.phone)+'</td><td class="actions-col"><button data-i="'+i+'">تعديل الجوال</button></td></tr>').join(''):'<tr><td colspan="7">لا توجد سجلات مطابقة.</td></tr>';
}
async function refresh(){
 el('studentStatus').textContent='جارٍ جلب السجلات...';
 try{let j=await api('studentsQuery',{grade:activeGrade(),section:el('studentSection').value,query:el('studentSearch').value});students=j.students||[];draw();el('studentStatus').textContent='تم تحميل '+j.total+' سجل';}catch(e){el('studentStatus').textContent=e.message;}
}
el('studentLogin').onclick=async()=>{el('studentLogin').disabled=true;el('studentMessage').textContent='جارٍ التحقق...';try{const j=await api('studentsQuery',{grade:activeGrade()});students=j.students||[];el('studentPrivate').hidden=false;el('studentMessage').textContent='';draw();el('studentStatus').textContent='تم تسجيل الدخول. '+j.total+' سجل';}catch(e){el('studentMessage').textContent=e.message;}finally{el('studentLogin').disabled=false;}};
el('studentLogout').onclick=()=>{el('studentPrivate').hidden=true;el('studentPassword').value='';students=[];el('studentRows').textContent='';};
el('studentRefresh').onclick=refresh;el('studentSection').onchange=refresh;el('studentGrade').onchange=()=>{updateSectionOptions();refresh();};updateSectionOptions();
el('studentSearch').onkeydown=e=>{if(e.key==='Enter')refresh()};
el('studentPrint').onclick=()=>window.print();
el('studentImportToggle').onclick=()=>{el('studentImportBox').hidden=!el('studentImportBox').hidden;};
el('studentRows').onclick=async e=>{const b=e.target.closest('button[data-i]');if(!b)return;const s=students[Number(b.dataset.i)];if(!s)return;const value=prompt('رقم الجوال المسجل للطالب: '+s.name,s.phone||'');if(value===null)return;b.disabled=true;try{await api('studentUpdate',{schoolId:s.schoolId,phone:value.trim()});await refresh();}catch(err){el('studentStatus').textContent=err.message;}finally{b.disabled=false;}};
function parseCsv(t){
 const out=[];let row=[],field='',quoted=false;t=t.replace(/^\uFEFF/,'');
 for(let i=0;i<t.length;i++){const c=t[i];if(c==='"'){if(quoted&&t[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&t[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))out.push(row);row=[];field='';}else field+=c;}
 row.push(field);if(row.some(x=>x.trim()))out.push(row);return out;
}
el('studentImport').onclick=async()=>{const file=el('studentFile').files[0];if(!file){el('studentImportStatus').textContent='اختر ملف CSV';return}
 el('studentImport').disabled=true;
 try{const rows=parseCsv(await file.text()),header=rows.shift();const indices={};header.forEach((v,i)=>indices[v.trim()]=i);
 const required=['schoolId','name','section','phone'];for(const col of required)if(indices[col]===undefined)throw Error('عمود مفقود: '+col);
 const students=rows.map(r=>({schoolId:r[indices.schoolId],name:r[indices.name],grade:indices.grade===undefined?'الخامس':r[indices.grade],section:r[indices.section],phone:r[indices.phone],status:r[indices.status]||'',area:r[indices.area]||''}));
 if(!students.length||students.length>900)throw Error('ملف غير صالح');
 if(!confirm('استيراد '+students.length+' طالبًا؟ سيتم استبدال سجلات الصفوف المشمولة في الملف فقط مع الاحتفاظ ببقية الصفوف.'))return;
 el('studentImportStatus').textContent='جارٍ استيراد بيانات الطلاب...';
 const x=await api('studentsImport',{students});el('studentImportStatus').textContent='تم استيراد '+x.imported+' طالبًا';await refresh();
 }catch(err){el('studentImportStatus').textContent='فشل الاستيراد: '+err.message;}finally{el('studentImport').disabled=false;}
};
})();
