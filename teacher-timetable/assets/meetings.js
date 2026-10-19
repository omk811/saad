'use strict';
(()=>{
const DATA=window.SAAD_MEETING_TIMETABLE||{};
const DAYS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'];
const teacherNames=Object.keys(DATA).sort((a,b)=>a.localeCompare(b,'ar'));
const $=id=>document.getElementById(id);
const selected=new Set();
const normalized=x=>String(x||'').trim().toLowerCase();
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
function key(){return 'saad-meeting-group:'+normalized($('meetingSubject').value);}
function members(){return teacherNames.filter(n=>selected.has(n));}
function renderTeachers(){
 const filter=normalized($('teacherFilter').value);
 const filtered=teacherNames.filter(n=>normalized(n).includes(filter));
 $('meetingTeachers').innerHTML=filtered.map(n=>'<label class="teacher-option"><input type="checkbox" data-name="'+safe(n)+'" '+(selected.has(n)?'checked':'')+'><span>'+safe(n)+'</span></label>').join('')||'<p class="meeting-help">لا توجد أسماء مطابقة.</p>';
 $('chosenCount').textContent=selected.size+' من '+teacherNames.length+' معلمًا';
}
$('meetingTeachers').addEventListener('change',ev=>{
 const input=ev.target.closest('input[data-name]');if(!input)return;
 if(input.checked)selected.add(input.dataset.name);else selected.delete(input.dataset.name);
 $('chosenCount').textContent=selected.size+' من '+teacherNames.length+' معلمًا';
});
$('teacherFilter').addEventListener('input',renderTeachers);
$('selectVisible').onclick=()=>{teacherNames.filter(n=>normalized(n).includes(normalized($('teacherFilter').value))).forEach(n=>selected.add(n));renderTeachers();};
$('clearTeachers').onclick=()=>{selected.clear();renderTeachers();};
$('saveGroup').onclick=()=>{
 if(!$('meetingSubject').value.trim()){$('meetingStatus').textContent='اكتب اسم المادة قبل حفظ المجموعة.';return;}
 if(selected.size<2){$('meetingStatus').textContent='اختر معلمين اثنين على الأقل.';return;}
 try{localStorage.setItem(key(),JSON.stringify(members()));$('meetingStatus').textContent='حُفظت المجموعة على هذا الجهاز والمتصفح فقط.';}
 catch(_){$('meetingStatus').textContent='تعذر الحفظ المحلي؛ يمكنك متابعة البحث دون حفظ.';}
};
$('loadGroup').onclick=()=>{
 if(!$('meetingSubject').value.trim()){$('meetingStatus').textContent='اكتب اسم المادة أولًا.';return;}
 try{const list=JSON.parse(localStorage.getItem(key())||'[]');selected.clear();list.filter(n=>teacherNames.includes(n)).forEach(n=>selected.add(n));renderTeachers();$('meetingStatus').textContent=selected.size?'تم استرجاع '+selected.size+' معلمًا.':'لا توجد مجموعة محفوظة لهذه المادة على هذا الجهاز.';}
 catch(_){$('meetingStatus').textContent='لم أتمكن من استرجاع المجموعة.';}
};
function free(name,day,period){
 if(name==='خليل اسلامية'&&day==='الأحد')return false;
 return !!DATA[name]?.[day]&&!String(DATA[name][day][period-1]||'').trim();
}
const times=()=>DAYS.flatMap(day=>Array.from({length:8},(_,i)=>({day,period:i+1})));
function calculate(){
 const group=members();
 if(group.length<2){$('meetingStatus').textContent='اختر معلمين اثنين على الأقل لحساب الاجتماع.';return;}
 const rows=times().map(slot=>({...slot,freeNames:group.filter(name=>free(name,slot.day,slot.period))}));
 const slots=rows.filter(x=>x.freeNames.length===group.length);
 const dayTotals=Object.fromEntries(DAYS.map(d=>[d,slots.filter(x=>x.day===d).length]));
 slots.sort((a,b)=>dayTotals[b.day]-dayTotals[a.day]||DAYS.indexOf(a.day)-DAYS.indexOf(b.day)||a.period-b.period);
 $('meetingSummary').innerHTML='<p class="meeting-stamp">المادة: <strong>'+safe($('meetingSubject').value.trim()||'مجموعة مختارة')+'</strong> · المشاركون: '+group.length+' · المواعيد المشتركة: <strong>'+slots.length+'</strong></p><p class="meeting-help">المعلمون: '+group.map(safe).join('، ')+'</p>';
 $('meetingSlots').innerHTML=slots.length?'<h3>المواعيد المقترحة</h3>'+slots.map((slot,i)=>'<div class="slot '+(i===0?'best':'')+'"><strong>'+safe(slot.day)+' — الحصة '+slot.period+(i===0?' · الخيار الأول':'')+'</strong><small>يوجد '+dayTotals[slot.day]+' موعد مشترك في هذا اليوم</small></div>').join(''):'<div class="no-slots">لا توجد حصة أسبوعية يتفرغ خلالها جميع المعلمين المختارين. جرّب تعديل أعضاء الاجتماع، أو ابحث في إمكانية ترتيب اجتماع خارج الحصص.</div>';
 $('meetingMatrix').innerHTML='<h3>خريطة التفرغ المشتركة</h3><div class="meeting-matrix"><table><thead><tr><th>اليوم / الحصة</th>'+Array.from({length:8},(_,i)=>'<th>'+(i+1)+'</th>').join('')+'</tr></thead><tbody>'+DAYS.map(day=>'<tr><th>'+day+'</th>'+Array.from({length:8},(_,i)=>{const n=group.filter(name=>free(name,day,i+1)).length;return '<td class="'+(n===group.length?'available all-free':'busy')+'" title="'+n+' من '+group.length+' متفرغين">'+n+'/'+group.length+'</td>';}).join('')+'</tr>').join('')+'</tbody></table></div>';
 $('meetingStatus').textContent='اكتمل فحص 40 حصة أسبوعية وفق جدول 17 أكتوبر 2026.';
}
$('findMeetings').onclick=calculate;
$('printMeeting').onclick=()=>window.print();
renderTeachers();
})();
