const SPREADSHEET_ID='1YWmUfGar1EYewF7m4kXt8ymKCekTkGjteJxUnJYI4bE';
const TZ='Asia/Muscat';
const SH={teachers:'المعلمون',records:'سجل الاحتياط',timetable:'الجدول الأسبوعي',rules:'قواعد التوزيع',cycles:'دورات الاحتياط',settings:'إعدادات النظام'};
function out(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function ss(){return SpreadsheetApp.openById(SPREADSHEET_ID)}
function sheet(n){const s=ss().getSheetByName(n);if(!s)throw Error('الورقة غير موجودة: '+n);return s}
function doGet(e){try{const a=(e.parameter.action||'bootstrap');if(a==='attendance')return attendancePage_();if(a==='readinessPublic')return out({ok:true,...readinessPublic_(e.parameter)});if(a==='schoolChangesPublic')return out({ok:true,...schoolChangesPublic_(e.parameter)});if(a==='ping')return out({ok:true});if(a==='subjects')return out({ok:true,subjects:getSubjects()});if(a==='now')return out({ok:true,...serverNow()});if(a==='teachers'||a==='timetable'||a==='records'||a==='bootstrap')return out({ok:false,error:'الوصول إلى حصص الاحتياط يتطلب تسجيل دخول الإدارة'});if(a==='teachers')return out({ok:true,teachers:getTeachers()});if(a==='timetable')return out({ok:true,timetable:getTimetable()});if(a==='records')return out({ok:true,records:getRecords()});if(a==='bootstrap')return out({ok:true,teachers:getTeachers(),timetable:getTimetable(),records:getRecords(),cycles:getCycles(),serverNow:serverNow()});return out({ok:false,error:'إجراء غير معروف'})}catch(x){return out({ok:false,error:x.message})}}
function doPost(e){const lock=LockService.getScriptLock();lock.waitLock(20000);try{const d=JSON.parse(e.postData.contents||'{}');let r;if(d.action==='reserveBootstrap'){verifySubjectAdmin_(d);r={teachers:getTeachers(),timetable:getTimetable(),records:getRecords(),cycles:getCycles(),serverNow:serverNow()};}else if(d.action==='saveDay'){verifySubjectAdmin_(d);r=saveDay(d);}else if(d.action==='saveSubject'){verifySubjectAdmin_(d);r=saveSubject(d);}else if(d.action==='saveSubjectAll'){verifySubjectAdmin_(d);r=saveSubjectAll(d);}else if(d.action==='studentsQuery'){verifyStudentAdmin_(d);r=studentsQuery_(d);}else if(d.action==='studentUpdate'){verifyStudentAdmin_(d);r=studentUpdate_(d);}else if(d.action==='studentsImport'){verifyStudentAdmin_(d);r=studentsImport_(d);}else if(d.action==='guardianVisitSave'){verifyStudentAdmin_(d);r=guardianVisitSave_(d);}else if(d.action==='guardianVisitRecent'){verifyStudentAdmin_(d);r=guardianVisitRecent_(d);}else if(d.action==='updateTeacher'){verifySubjectAdmin_(d);r=updateTeacher(d);}else if(d.action==='readinessPublish'){verifySubjectAdmin_(d);r=readinessPublish_(d);}else if(d.action==='readinessWithdraw'){verifySubjectAdmin_(d);r=readinessWithdraw_(d);}else if(d.action==='schoolPreviewSwap'){verifySubjectAdmin_(d);r=schoolPreviewSwap_(d);}else if(d.action==='schoolPublishChange'){verifySubjectAdmin_(d);r=schoolPublishChange_(d);}else if(d.action==='schoolMeetingCheck'){verifySubjectAdmin_(d);r=schoolMeetingCheck_(d);}else if(d.action==='schoolProgress'){verifySubjectAdmin_(d);r=schoolProgress_(d);}else if(d.action==='startCycle'){verifySubjectAdmin_(d);r=startCycle(d);}else throw Error('إجراء غير معروف');SpreadsheetApp.flush();return out({ok:true,...r})}catch(x){return out({ok:false,error:x.message})}finally{lock.releaseLock()}}
function serverNow(){const n=new Date(),date=Utilities.formatDate(n,TZ,'yyyy-MM-dd'),dow=+Utilities.formatDate(n,TZ,'u');const days={1:'الإثنين',2:'الثلاثاء',3:'الأربعاء',4:'الخميس',5:'الجمعة',6:'السبت',7:'الأحد'};return{date,day:days[dow],time:Utilities.formatDate(n,TZ,'HH:mm:ss'),timezone:TZ}}
function getTeachers(){
  const rows=sheet(SH.teachers).getDataRange().getValues();
  return rows.slice(1).filter(r=>r[0]).map(r=>{
    const name=String(r[0]),base=Number(r[1])||0;
    const extra=r[2]!==''&&Number.isFinite(Number(r[2]))&&Number(r[2])>=0?Number(r[2]):(RESERVE_ADMIN_LOAD_[name]||0);
    const reserveCount=Number(r[9])||0;
    const eligible=String(r[7]||'نعم')!=='لا'&&!FULL_RESERVE_EXCLUSIONS_.includes(name);
    return {name,base,extra,reserveCount,currentLoad:base+extra+reserveCount,
      remaining:eligible?Math.max(0,reserveLimit_({name,base,extra})-reserveCount):0,lastReserve:fmt(r[5]),
      status:String(r[6]||''),eligible,scheduleName:String(r[8]||name)};
  });
}
function getTimetable(){const v=sheet(SH.timetable).getDataRange().getValues();return v.slice(1).filter(r=>r[0]&&r[1]).map(r=>({teacher:String(r[0]),day:String(r[1]),periods:Object.fromEntries([1,2,3,4,5,6,7,8].map((p,i)=>[p,String(r[i+2]||'')])),dailyCount:+r[10]||0}))}
function fmt(v){return v instanceof Date?Utilities.formatDate(v,TZ,'yyyy-MM-dd'):String(v||'')}
function getRecords(){const v=sheet(SH.records).getDataRange().getValues();return v.slice(1).filter(r=>r[0]).map(r=>({id:String(r[0]),date:fmt(r[1]),day:String(r[2]),absent:String(r[3]),period:+r[4],reserve:String(r[5]||''),className:String(r[6]||''),approvedAt:fmt(r[7]),notes:String(r[8]||'')}))}
function getCycles(){const s=ss().getSheetByName(SH.cycles);if(!s)return[];const v=s.getDataRange().getValues();return v.slice(1).filter(r=>r[0]).map(r=>({number:+r[0],start:fmt(r[1]),end:fmt(r[2]),target:+r[3]||0,done:+r[4]||0,progress:r[5],completed:+r[6]||0,status:String(r[7]||''),notes:String(r[8]||'')}))}
function updateTeacher(d){
  if(!d.name)throw Error('اسم المعلم مطلوب');
  const name=String(d.name).trim();
  const base=Number(d.base);
  if(!Number.isInteger(base)||base<0||base>25)throw Error('أدخل نصابًا تدريسيًا صحيحًا.');
  const tab=sheet(SH.teachers), rows=tab.getDataRange().getValues();
  const index=rows.findIndex((r,i)=>i>0&&String(r[0])===name);
  const eligible=!FULL_RESERVE_EXCLUSIONS_.includes(name)&&(d.eligible===undefined?index<0||rows[index][7]!=='لا':d.eligible===true);
  if(index>=0){
    tab.getRange(index+1,2).setValue(base);
    tab.getRange(index+1,8).setValue(eligible?'نعم':'لا');
    if(d.scheduleName)tab.getRange(index+1,9).setValue(d.scheduleName);
  }else{
    if(!d.create)throw Error('المعلم غير موجود');
    const row=tab.getLastRow()+1;
    const has="COUNTIF('الجدول الأسبوعي'!A:A,A"+row+")";
    const start=`IFERROR(INT(LOOKUP(2,1/('دورات الاحتياط'!$H$2:$H="نشطة"),'دورات الاحتياط'!$B$2:$B)),1)`;
    const history=`=SUMPRODUCT(N('سجل الاحتياط'!$F$2:$F=A${row}),N(IFERROR(IF(ISNUMBER('سجل الاحتياط'!$B$2:$B),INT('سجل الاحتياط'!$B$2:$B),DATEVALUE('سجل الاحتياط'!$B$2:$B)),0)>=${start}))`;
    tab.getRange(row,1,1,12).setValues([[name,base,RESERVE_ADMIN_LOAD_[name]||0,'=B'+row+'+C'+row+'+J'+row,
      '=MAX(0,L'+row+'-J'+row+')','','=IF(H'+row+'="لا","مستبعد",IF('+has+'=0,"بلا جدول معتمد",IF(D'+row+'>=25,"أكمل النصاب","متاح")))',
      eligible?'نعم':'لا',d.scheduleName||name,history,'','=IF(OR(H'+row+'="لا",'+has+'=0),0,MAX(0,25-B'+row+'-C'+row+'))']]);
  }
  SpreadsheetApp.flush();
  return {teachers:getTeachers()};
}
const FULL_RESERVE_EXCLUSIONS_=["خليل عربي","ياسر الذهلي","راشد المزروعي","عبدالله حسن","سعيد المخمري","ناصر بريك","عبدالله المقبالي"];
const RESERVE_ADMIN_LOAD_={"خليفة قناص":7,"خليفة سعيد":7,"اسماعيل البلوشي":7,"خليل اسلامية":7,"سعيد الحضرمي":7,"ابراهيم الهاشمي":0,"سالم المعمري":5,"علي المعمري":3,"خميس المزروعي":5,"علي العبري":3,"وليد الريسي":3};
function reserveLimit_(teacher){
  if(RESERVE_TRAINEES_.includes(teacher.name))return 4;
  return Math.max(0,25-teacher.base-(teacher.extra??(RESERVE_ADMIN_LOAD_[teacher.name]||0)));
}

const RESERVE_TRAINEES_=['عزام علي','محمد حمد','عبدالرحمن قاسم','أحمد العجمي'];
function reserveDailyLimit_(name,day){
  if(!RESERVE_TRAINEES_.includes(name))return 1;
  if(day==='الأربعاء')return name==='أحمد العجمي'?1:2;
  return day==='الخميس'?2:0;
}

function hardValidate(r,teachers,tt,usedBeforeDay,batchNames,absentNames){
  const teacher=teachers.find(t=>t.name===r.reserve);
  if(!teacher||!teacher.eligible||FULL_RESERVE_EXCLUSIONS_.includes(r.reserve))throw Error('معلم الاحتياط غير مؤهل: '+r.reserve);
  if(r.reserve==='عمر البلوشي'&&!['الأربعاء','الخميس'].includes(r.day))throw Error('عمر البلوشي منتدب ولا يحضر المدرسة إلا الأربعاء والخميس.');
  if(r.reserve==='خليل اسلامية'&&r.day==='الأحد')throw Error('خليل إسلامية مرتبط بالتدريب يوم الأحد.');
  if(!/^[1-7]\/[5-8]$/.test(String(r.className||'').trim())||!Number.isInteger(r.period)||r.period<1||r.period>8)throw Error('الصف والشعبة والحصة يجب أن تكون صالحة.');
  if(absentNames.has(r.reserve))throw Error('لا يمكن تكليف معلم مسجل غائبًا اليوم.');
  const row=tt.find(x=>(x.teacher===r.reserve||x.teacher===teacher.scheduleName)&&x.day===r.day);
  if(!row)throw Error('لا يوجد جدول معتمد لـ '+r.reserve);
  if(row.periods[r.period])throw Error(r.reserve+' لديه حصة أصلية في الحصة '+r.period);
  const dailyLimit=reserveDailyLimit_(r.reserve,r.day);
  const dailyCount=batchNames.get(r.reserve)||0;
  const slotKey=r.reserve+'|'+r.period;
  if(!dailyLimit||(RESERVE_TRAINEES_.includes(r.reserve)&&r.period>6))throw Error('المتدرب متاح للاحتياط الأربعاء والخميس حتى الحصة السادسة فقط.');
  if(dailyCount>=dailyLimit)throw Error('أكمل المعلم الحد اليومي للاحتياط.');
  if(batchNames.has(slotKey))throw Error('لا يجوز إسناد حصتين للمعلم في الوقت نفسه.');
  const original=Object.keys(row.periods).filter(p=>row.periods[p]).map(Number);
  const occupied=new Set(original);
  const adjacent=original.some(p=>[1,2,3].every(offset=>occupied.has(p+offset))&&(r.period===p-1||r.period===p+4));
  if(r.exceptional!==true&&(original.length>=5||adjacent||(r.period===8&&!occupied.has(7)))){
    throw Error('التكليف يحتاج إلى اعتماد استثنائي وفق شروط العبء اليومي.');
  }
  if((usedBeforeDay.get(r.reserve)||0)+dailyCount>=reserveLimit_(teacher))throw Error(r.reserve+' أكمل نصاب الدورة.');
  batchNames.set(r.reserve,dailyCount+1);
  batchNames.set(slotKey,true);
}
function saveDay(d){if(!d.date||!d.day)throw Error('التاريخ واليوم مطلوبان');const incoming=(d.records||[]).map(r=>({...r,date:d.date,day:d.day,period:+r.period}));const assigned=incoming.filter(r=>r.reserve);const all=getRecords(),teachers=getTeachers(),tt=getTimetable(),seen=new Map(),absentNames=new Set(incoming.map(r=>String(r.absent||'')).filter(Boolean));
 const cycle=getCycles().filter(c=>c.start<=d.date&&(!c.end||d.date<=c.end)).sort((a,b)=>b.number-a.number)[0];
 const counts=new Map();
 for(const entry of all){
   if(!entry.reserve||entry.date===d.date||(cycle&&(entry.date<cycle.start||cycle.end&&entry.date>cycle.end)))continue;
   counts.set(entry.reserve,(counts.get(entry.reserve)||0)+1);
 }
 assigned.forEach(r=>hardValidate(r,teachers,tt,counts,seen,absentNames));const s=sheet(SH.records),v=s.getDataRange().getValues();s.getRange('G:G').setNumberFormat('@');for(let i=v.length-1;i>=1;i--)if(fmt(v[i][1])===d.date&&String(v[i][2])===d.day)s.deleteRow(i+1);if(incoming.length)s.getRange(s.getLastRow()+1,1,incoming.length,9).setValues(incoming.map(r=>[r.id||Utilities.getUuid(),new Date(r.date+'T12:00:00'),r.day,r.absent,r.period,r.reserve||'',r.className||'',new Date(),r.reserve?(r.exceptional?'استثنائي':''):'غير مسند - لا يوجد متاح']));return{records:getRecords(),teachers:getTeachers()}}
function startCycle(d){
  const tab=sheet(SH.cycles),cycles=getCycles(),active=cycles.find(x=>x.status==='نشطة');
  if(active){
    const oldRow=cycles.findIndex(x=>x.number===active.number)+2;
    const totals=tab.getRange(oldRow,4,1,4);
    totals.setValues(totals.getValues());
    tab.getRange(oldRow,3).setValue(new Date());
    tab.getRange(oldRow,8).setValue('مغلقة');
  }
  const number=cycles.length?Math.max(...cycles.map(x=>x.number))+1:1;
  const row=tab.getLastRow()+1;
  tab.appendRow([number,new Date(),'',`=SUM('المعلمون'!L2:L)`,
    `=SUMIF('المعلمون'!L2:L,">0",'المعلمون'!J2:J)`,'=IFERROR(E'+row+'/D'+row+',0)',
    `=COUNTIF('المعلمون'!G2:G,"أكمل النصاب")`,'نشطة',d.notes||'']);
  tab.getRange(row,6).setNumberFormat('0.0%');
  return {cycles:getCycles()};
}

function getSubjects(){const v=sheet('مواد المعلمين').getDataRange().getValues(),o={};v.slice(1).forEach(r=>{const n=String(r[0]||''),c=String(r[1]||''),s=String(r[2]||'');if(n&&c&&s)(o[n]||(o[n]={}))[c]=s});return o}
function saveSubject(d){const n=String(d.teacher||'').trim(),c=String(d.className||'').trim(),subject=String(d.subject||'').trim();if(!n||!c||!subject||subject.length>100)throw Error('بيانات المادة غير مكتملة');const tt=getTimetable();if(!tt.some(t=>t.teacher===n&&Object.values(t.periods).includes(c)))throw Error('المعلم لا يدرس هذه الشعبة في الجدول');const sh=sheet('مواد المعلمين'),v=sh.getDataRange().getValues();let i=v.findIndex((r,k)=>k>0&&String(r[0])===n&&String(r[1])===c);if(i<0)i=sh.getLastRow();sh.getRange(i+1,1,1,4).setValues([[n,c,subject,new Date()]]);return{subjects:getSubjects()}}

/* الرمز المستقل لقسم الطلاب، محفوظ في Script Properties ولا يُرسل إلى المستودع */
function verifyStudentAdmin_(d){
 const saved=PropertiesService.getScriptProperties().getProperty('STUDENT_ADMIN_KEY');
 if(!saved||saved.length<8)throw Error('يلزم إعداد STUDENT_ADMIN_KEY برمز لا يقل عن 8 أحرف في خصائص السكريبت');
 const input=String(d.adminKey||'');
 if(input.length!==saved.length)throw Error('رمز قسم الطلاب غير صحيح');
 const a=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,input);
 const b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,saved);
 let diff=0;
 for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 if(diff!==0)throw Error('رمز قسم الطلاب غير صحيح');
}

function verifySubjectAdmin_(d){const saved=PropertiesService.getScriptProperties().getProperty('SUBJECT_ADMIN_KEY');if(!saved||saved.length<12)throw Error('لم يتم إعداد رمز إدارة المواد في خصائص السكريبت');const input=String(d.adminKey||'');if(input.length!==saved.length)throw Error('رمز الإدارة غير صحيح');const a=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,input),b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,saved);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff!==0)throw Error('رمز الإدارة غير صحيح')}

function saveSubjectAll(d){
 const n=String(d.teacher||'').trim(),subject=String(d.subject||'').trim();
 if(!n||!subject||subject.length>100)throw Error('اختر المعلم واكتب المادة');
 const classes=[...new Set(getTimetable().filter(t=>t.teacher===n).reduce((a,t)=>a.concat(Object.values(t.periods)),[]).filter(Boolean))];
 if(!classes.length)throw Error('لا توجد شعب مسجلة لهذا المعلم');
 const sh=sheet('مواد المعلمين'),values=sh.getDataRange().getValues(),now=new Date();
 const pending=[];
 classes.forEach(c=>{
   let row=-1;
   for(let i=1;i<values.length;i++)if(String(values[i][0])===n&&String(values[i][1])===c){row=i+1;break}
   if(row>0)sh.getRange(row,1,1,4).setValues([[n,c,subject,now]]);
   else pending.push([n,c,subject,now]);
 });
 if(pending.length)sh.getRange(sh.getLastRow()+1,1,pending.length,4).setValues(pending);
 return{subjects:getSubjects(),updatedClasses:classes.length}
}

/* سجل الطلاب الخاص: لا يوفر doGet أي بيانات شخصية */
const STUDENTS_PRIVATE_SPREADSHEET_ID='1bv2nIKMcu9-I5_dAC7q8-dfcZlCj38fqJbMvyv1An2g';
function studentsSheet_(){
 const sh=SpreadsheetApp.openById(STUDENTS_PRIVATE_SPREADSHEET_ID).getSheetByName('الطلاب');
 if(!sh)throw Error('ورقة الطلاب غير موجودة');
 return sh;
}

/* البحث الإداري: لا توجد استجابة عامة بأسماء الطلاب */
function studentsQuery_(d){
 const grade=String(d.grade||'الخامس').trim();
 if(!['الخامس','السادس','السابع','الثامن'].includes(grade))throw Error('الصف غير صالح');
 const section=String(d.section||'').trim();
 if(section&&!/^[1-7]$/.test(section))throw Error('الشعبة غير صالحة');
 const q=String(d.query||'').trim().toLowerCase().slice(0,100);
 const sh=studentsSheet_(),v=sh.getDataRange().getDisplayValues();
 const matches=v.slice(1).filter(r=>r[0]&&r[1]&&String(r[2])===grade)
  .filter(r=>(!section||String(r[3])===section)&&(!q||String(r[1]).toLowerCase().includes(q)||String(r[0]).includes(q)));
 return{students:matches.slice(0,250).map(r=>({schoolId:String(r[0]),name:String(r[1]),grade:String(r[2]),section:String(r[3]),phone:String(r[4]),status:String(r[5]),area:String(r[6])})),total:matches.length};
}
function studentUpdate_(d){
 const id=String(d.schoolId||'').trim(),phone=String(d.phone||'').trim();
 if(!id||id.length>50)throw Error('معرف السجل مطلوب');
 if(!/^[+0-9 -]{5,20}$/.test(phone))throw Error('رقم الجوال غير صالح');
 const sh=studentsSheet_(),v=sh.getRange(1,1,Math.max(1,sh.getLastRow()),5).getDisplayValues();
 const ix=v.findIndex((r,i)=>i>0&&String(r[0])===id);
 if(ix<0)throw Error('الطالب غير موجود');
 sh.getRange(ix+1,5).setValue(phone);
 sh.getRange(ix+1,8).setValue(new Date());
 return{updated:true};
}
function studentsImport_(d){
 const incoming=d.students;
 if(!Array.isArray(incoming)||incoming.length<1||incoming.length>900)throw Error('عدد سجلات الاستيراد غير صالح');
 const seen=new Set(),incomingRows=[],importedGrades=new Set();
 const validGrades=['الخامس','السادس','السابع','الثامن'];
 incoming.forEach(rec=>{
  const id=String(rec.schoolId||'').trim(),name=String(rec.name||'').trim();
  const grade=String(rec.grade||'الخامس').trim(),section=String(rec.section||'').trim();
  const phone=String(rec.phone||'').trim(),status=String(rec.status||'').trim(),area=String(rec.area||'').trim();
  if(!id||id.length>50||!name||name.length>160||!validGrades.includes(grade)||!/^[1-7]$/.test(section))throw Error('سجل غير مكتمل: الاسم أو معرف السجل أو الشعبة');
  if(grade!=='السابع'&&section==='7')throw Error('الشعبة السابعة متاحة للصف السابع فقط');
  if(seen.has(id))throw Error('معرف مكرر في ملف الاستيراد');
  if([id,name,grade,section,phone,status,area].some(v=>/^[=+@]/.test(v)))throw Error('قيمة غير آمنة في ملف الاستيراد');
  seen.add(id);importedGrades.add(grade);
  incomingRows.push([id,name,grade,section,phone,status,area,new Date()]);
 });
 const sh=studentsSheet_(),last=sh.getLastRow();
 const existing=last>1?sh.getRange(2,1,last-1,8).getValues():[];
 const keep=existing.filter(r=>r[0]&&r[1]&&!importedGrades.has(String(r[2])));
 const all=keep.concat(incomingRows);
 const allIds=new Set();
 all.forEach(r=>{const id=String(r[0]);if(allIds.has(id))throw Error('معرف مكرر بين الصفوف');allIds.add(id);});
 if(last>1)sh.getRange(2,1,last-1,8).clearContent();
 if(all.length){sh.getRange(2,1,all.length,8).setNumberFormat('@');sh.getRange(2,1,all.length,8).setValues(all);}
 return{imported:incomingRows.length,retained:keep.length,total:all.length,grades:[...importedGrades]};
}


/* أرشيف زيارات أولياء الأمور — قاعدة الطلاب الخاصة، دون أي مسار GET عام */
function guardianVisitsSheet_(){
 const sh=SpreadsheetApp.openById(STUDENTS_PRIVATE_SPREADSHEET_ID).getSheetByName('زيارات أولياء الأمور');
 if(!sh)throw Error('ورقة سجل الزيارات غير موجودة في قاعدة الطلاب الخاصة');
 return sh;
}
function guardianVisitText_(value,max,label){
 const s=String(value==null?'':value).trim().replace(/\s+/g,' ');
 if(!s||s.length>max||/^[=+@\-\t\r]/.test(s))throw Error('تحقق من '+label);
 return s;
}
function guardianVisitSave_(d){
 const id=guardianVisitText_(d.schoolId,55,'الرقم المدرسي');
 const grade=guardianVisitText_(d.grade,20,'الصف');
 const section=guardianVisitText_(d.section,2,'الشعبة');
 if(!['الخامس','السادس','السابع','الثامن'].includes(grade)||!/^[1-7]$/.test(section)||(section==='7'&&grade!=='السابع'))throw Error('اختيار الصف والشعبة غير صالح');
 const visitor=guardianVisitText_(d.visitorName||d.guardianName,120,'اسم الزائر');
 const relationship=guardianVisitText_(d.relationship,60,'صلة القرابة');
 if(!['الأب','الأم','الأخ','الأخت','الجد','الجدة','العم','العمة','الخال','الخالة','ولي الأمر','قريب آخر'].includes(relationship))throw Error('اختر صلة القرابة من القائمة');
 const identity=guardianVisitText_(d.identityNumber,22,'رقم الهوية').replace(/[\s-]/g,'');
 if(!/^[0-9]{5,20}$/.test(identity))throw Error('أدخل رقم الهوية بالأرقام فقط (5 إلى 20 رقمًا)');
 const phone=guardianVisitText_(d.phone,22,'رقم الهاتف').replace(/[\s-]/g,'');
 if(!/^\+?[0-9]{7,15}$/.test(phone))throw Error('رقم الهاتف غير صالح');
 const date=guardianVisitText_(d.visitDate,10,'تاريخ الزيارة');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('تاريخ الزيارة غير صالح');
 const dt=new Date(date+'T12:00:00Z');
 if(Number.isNaN(dt.getTime())||dt.toISOString().slice(0,10)!==date)throw Error('تاريخ الزيارة غير صالح');
 const day=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][dt.getUTCDay()];
 if(!['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'].includes(day))throw Error('اختر تاريخًا من أيام الدراسة');
 const today=Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd');
 if(date>today)throw Error('لا يمكن تسجيل زيارة بتاريخ مستقبلي');
 const period=Number(d.period);
 if(!Number.isInteger(period)||period<1||period>8)throw Error('الحصة غير صالحة');
 const time=guardianVisitText_(d.visitTime,5,'ساعة الزيارة');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('حدد وقت الزيارة بدقة');
 const students=studentsSheet_().getDataRange().getDisplayValues();
 const student=students.slice(1).find(r=>String(r[0]).trim()===id&&String(r[2]).trim()===grade&&String(r[3]).trim()===section);
 if(!student)throw Error('الطالب غير موجود ضمن الصف والشعبة المحددين');
 const requestId=guardianVisitText_(d.requestId,80,'معرف التسجيل');
 if(!/^[a-zA-Z0-9-]{12,80}$/.test(requestId))throw Error('معرف التسجيل غير صالح');
 const sh=guardianVisitsSheet_(),last=sh.getLastRow();
 if(last>1){
  const existing=sh.getRange(2,1,last-1,10).getDisplayValues();
  const prior=existing.find(r=>String(r[0])===requestId);
  if(prior)return{saved:true,duplicate:true,visitId:requestId,studentName:String(prior[9]||student[1])};
 }
 const record=[requestId,Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd HH:mm:ss'),date,day,String(period),time,grade,section,id,String(student[1]),visitor,identity,phone,relationship];
 sh.getRange(last+1,1,1,record.length).setNumberFormat('@');
 sh.getRange(last+1,1,1,record.length).setValues([record]);
 return{saved:true,visitId:requestId,studentName:String(student[1]),day:day};
}
function guardianVisitRecent_(d){
 const sh=guardianVisitsSheet_(),last=sh.getLastRow();
 if(last<2)return{visits:[],total:0};
 const count=Math.min(last-1,100),values=sh.getRange(last-count+1,1,count,14).getDisplayValues();
 return{visits:values.reverse().map(r=>({visitId:r[0],date:r[2],day:r[3],period:r[4],time:r[5],grade:r[6],section:r[7],studentName:r[9],visitorName:r[10],guardianName:r[10],relationship:r[13]||'',identityNumber:r[11],phone:r[12]})),total:last-1};
}

const ATTENDANCE_GRADES_ = {5:'الخامس', 6:'السادس', 7:'السابع', 8:'الثامن'};
const ATTENDANCE_SECTIONS_ = {5:6, 6:6, 7:7, 8:5};
const ATTENDANCE_DAYS_ = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const ATTENDANCE_SHEET_ = 'حضور وغياب الطلبة';
const ATTENDANCE_HEADERS_ = ['معرّف الحصة','التاريخ','اليوم','الصف','الشعبة','الحصة','المعلم','الحاضرون','الغائبون','أسماء الغائبين','بيانات الغياب','نسخة السجل','وقت الحفظ','وقت اعتماد المعلم'];

function attendancePage_() {
  return HtmlService.createHtmlOutputFromFile('Attendance')
    .setTitle('حضور وغياب الطلبة | بوابة سعد')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function attendanceSheet_(create) {
  const book = studentsSheet_().getParent();
  const current = book.getSheetByName(ATTENDANCE_SHEET_);
  if (current) {
    const column = ATTENDANCE_HEADERS_.length;
    if (create && current.getLastColumn() < column) {
      const missing = column-current.getMaxColumns();
      if (missing > 0) current.insertColumnsAfter(current.getMaxColumns(),missing);
      current.getRange(1,column).setValue(ATTENDANCE_HEADERS_[column-1]);
    }
    return current;
  }
  if (!create) return null;
  const tab = book.insertSheet(ATTENDANCE_SHEET_);
  tab.getRange(1,1,1,ATTENDANCE_HEADERS_.length).setValues([ATTENDANCE_HEADERS_]);
  tab.setFrozenRows(1);
  return tab;
}

function attendanceClass_(grade, section) {
  grade = String(grade);
  section = String(section);
  const max = ATTENDANCE_SECTIONS_[grade];
  if (!max || !/^[1-7]$/.test(section) || Number(section) > max) throw Error('اختر الصف والشعبة.');
  return {grade, section, label:ATTENDANCE_GRADES_[grade], code:section+'/'+grade};
}

function attendanceTimetableDay_(day) {
  const groups = new Map();
  const teachers = new Set();
  if (!ATTENDANCE_DAYS_.slice(0,5).includes(day)) return {groups, teachers:[]};
  const dayKey = value => String(value).trim().replace(/[أإآ]/g,'ا');
  const classKey = value => String(value).replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)).replace(/\s+/g,'');
  for (const row of getTimetable()) {
    const teacher = row.teacher.trim();
    if (!teacher) continue;
    teachers.add(teacher);
    if (dayKey(row.day) !== dayKey(day)) continue;
    for (const [period, value] of Object.entries(row.periods)) {
      const code = classKey(value);
      if (!/^[1-7]\/[5-8]$/.test(code)) continue;
      if (!groups.has(code)) groups.set(code,{});
      const periods = groups.get(code);
      if (!periods[period]) periods[period] = [];
      if (!periods[period].includes(teacher)) periods[period].push(teacher);
    }
  }
  return {groups, teachers:[...teachers].sort((a,b) => a.localeCompare(b,'ar'))};
}

function attendanceSchedule_(day, group, date) {
  const daySchedule = attendanceTimetableDay_(day);
  const periods=daySchedule.groups.get(group.code) || {};
  if(date){
    const label=group.grade+'/'+group.section;
    for(const change of schoolChanges_(date)){
      if(change.type!=='swap'||change.group!==label)continue;
      periods[change.first]=[change.afterFirst];
      periods[change.second]=[change.afterSecond];
    }
  }
  return {periods, teachers:daySchedule.teachers};
}

function attendanceRoster_(group) {
  return studentsSheet_().getDataRange().getDisplayValues().slice(1)
    .filter(r => r[0] && r[1] && r[2].trim() === group.label && r[3].trim() === group.section)
    .map(r => ({id:r[0].trim(),name:r[1].trim()}))
    .sort((a,b) => a.name.localeCompare(b.name,'ar'));
}

function attendanceRosterVersion_(roster) {
  const keys = JSON.stringify(roster.map(s => [s.id,s.name]));
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,keys));
}

function attendanceRows_(date, group) {
  const tab = attendanceSheet_(false);
  const last = tab ? tab.getLastRow() : 0;
  if (last < 2) return [];
  const prefix = group ? [date,group.grade,group.section,''].join('|') : date+'|';
  const keys = tab.getRange(2,1,last-1,1).getDisplayValues();
  const first = keys.findIndex(([key]) => key.startsWith(prefix));
  if (first < 0) return [];
  let end = keys.length-1;
  while (!keys[end][0].startsWith(prefix)) end--;
  const values = tab.getRange(first+2,1,end-first+1,Math.min(tab.getMaxColumns(),ATTENDANCE_HEADERS_.length)).getDisplayValues();
  return values.flatMap((r,index) => r[0].startsWith(prefix) ? [{
    row:first+index+2, key:r[0], period:Number(r[5]), teacher:r[6],
    absent:JSON.parse(r[10]), revision:r[11], approved:Boolean(r[13])
  }] : []);
}

function attendanceBootstrap() {
  return serverNow();
}

function attendanceOpen(grade, section) {
  const today = serverNow();
  const group = attendanceClass_(grade,section);
  const schedule = attendanceSchedule_(today.day,group,today.date);
  const roster = attendanceRoster_(group);
  const indexes = new Map(roster.map((s,i) => [s.id,i]));
  const records = attendanceRows_(today.date,group).map(r => ({
    period:r.period, teacher:r.teacher,
    absentIndexes:r.absent.map(s => indexes.get(s.id)).filter(Number.isInteger),
    revision:r.revision, approved:r.approved
  }));
  return {today, schedule, roster:roster.map(s => s.name), rosterVersion:attendanceRosterVersion_(roster), records};
}

function attendanceSave(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const today = serverNow();
    if (d.date !== today.date) throw Error('تغيّر التاريخ. أعد فتح تسجيل اليوم.');
    const group = attendanceClass_(d.grade,d.section);
    const period = Number(d.period);
    const schedule = attendanceSchedule_(today.day,group,today.date);
    if (!Number.isInteger(period) || !schedule.periods[period]?.length) throw Error('لا توجد حصة مجدولة لهذا الاختيار.');
    if (!schedule.teachers.includes(d.teacher)) throw Error('اختر المعلم من القائمة.');
    const roster = attendanceRoster_(group);
    if (!roster.length) throw Error('لا توجد أسماء طلبة لهذه الشعبة.');
    if (d.rosterVersion !== attendanceRosterVersion_(roster)) throw Error('تغيرت قائمة الطلبة. أعد تحميل الشعبة.');
    if (!Array.isArray(d.absentIndexes) || d.absentIndexes.length > roster.length ||
        (!d.absentIndexes.length && d.allPresent !== true)) throw Error('حدد الغائبين أو أكّد حضور الجميع.');
    const indexes = new Set(d.absentIndexes);
    if ([...indexes].some(i => !Number.isInteger(i) || i < 0 || i >= roster.length)) throw Error('اختيار الغياب غير صالح.');
    const absent = roster.filter((_,i) => indexes.has(i));
    const previous = attendanceRows_(today.date,group).find(r => r.period === period);
    if ((previous?.revision || '') !== (d.revision || '')) throw Error('عُدّل هذا السجل. أعد تحميل الشعبة قبل الحفظ.');
    const revision = Utilities.getUuid();
    const tab = attendanceSheet_(true);
    const range = tab.getRange(previous?.row || tab.getLastRow()+1,1,1,ATTENDANCE_HEADERS_.length);
    const key = [today.date,group.grade,group.section,period].join('|');
    const plain = value => /^[=+\-@]/.test(value) ? "'"+value : value;
    range.setNumberFormats([['@','@','@','@','@','0','@','0','0','@','@','@','@','@']]);
    range.setValues([[key,today.date,today.day,group.label,group.section,period,plain(d.teacher),
      roster.length-absent.length,absent.length,plain(absent.map(s => s.name).join('، ')),JSON.stringify(absent),
      revision,today.date+' '+today.time,'']]);
    SpreadsheetApp.flush();
    return {period, teacher:d.teacher, absentIndexes:[...indexes], revision, approved:false};
  } finally {
    lock.releaseLock();
  }
}

function attendanceApprove(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const today = serverNow();
    if (d.date !== today.date) throw Error('تغيّر التاريخ. أعد فتح تسجيل اليوم.');
    const group = attendanceClass_(d.grade,d.section);
    const period = Number(d.period);
    if (!Number.isInteger(period) || period < 1 || period > 8) throw Error('اختر الحصة.');
    const record = attendanceRows_(today.date,group).find(r => r.period === period);
    if (!record) throw Error('احفظ التسجيل قبل اعتماده.');
    if (record.revision !== d.revision) throw Error('عُدّل السجل. أعد تحميل الشعبة قبل الاعتماد.');
    if (record.approved) return {approved:true};
    const column = ATTENDANCE_HEADERS_.length;
    attendanceSheet_(true).getRange(record.row,column).setNumberFormat('@')
      .setValue(today.date+' '+today.time);
    SpreadsheetApp.flush();
    return {approved:true};
  } finally {
    lock.releaseLock();
  }
}

function attendanceReport(date, selectedPeriod) {
  const today = serverNow();
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today.date) throw Error('اختر تاريخًا صحيحًا.');
  const calendarDate = new Date(date+'T12:00:00Z');
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0,10) !== date) throw Error('اختر تاريخًا صحيحًا.');
  const day = ATTENDANCE_DAYS_[calendarDate.getUTCDay()];
  const period = selectedPeriod === '' ? 0 : Number(selectedPeriod);
  if (selectedPeriod !== '' && (!Number.isInteger(period) || period < 1 || period > 8)) throw Error('اختر الحصة.');
  const {groups} = attendanceTimetableDay_(day);
  for(const change of schoolChanges_(date)){
    if(change.type!=='swap')continue;
    const [grade,section]=change.group.split('/');
    const periods=groups.get(section+'/'+grade)||{};
    periods[change.first]=[change.afterFirst];
    periods[change.second]=[change.afterSecond];
    groups.set(section+'/'+grade,periods);
  }
  const saved = new Map(attendanceRows_(date).map(r => [r.key,r]));
  const records = [];
  for (const [grade,maxSection] of Object.entries(ATTENDANCE_SECTIONS_)) {
    for (let section=1; section<=maxSection; section++) {
      const schedule = groups.get(section+'/'+grade) || {};
      for (let slot=1; slot<=8; slot++) {
        if (period && slot !== period) continue;
        const entry = saved.get([date,grade,section,slot].join('|'));
        const scheduled = schedule[slot];
        if (!entry && !scheduled?.length) continue;
        records.push({
          grade:ATTENDANCE_GRADES_[grade], section, period:slot,
          teacher:entry ? entry.teacher : scheduled.join('، '),
          saved:Boolean(entry), approved:Boolean(entry?.approved), absent:entry ? entry.absent.map(s => s.name) : []
        });
      }
    }
  }
  return {date, day, period, records};
}

const READINESS_SHEET_ = 'نشر خطة الجاهزية';
const READINESS_CLASSES_ = Object.entries(ATTENDANCE_SECTIONS_).flatMap(([grade,count]) =>
  Array.from({length:count},(_,i) => grade+'/'+(i+1)));
const READINESS_MODES_ = ['live','async','postponed','cancelled'];

function readinessDate_(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('اختر تاريخ الخطة.');
  const date = new Date(value+'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value || date.getUTCDay() > 4) {
    throw Error('اختر تاريخًا صحيحًا من الأحد إلى الخميس.');
  }
  return value;
}

function readinessSheet_(create) {
  const book = ss();
  let tab = book.getSheetByName(READINESS_SHEET_);
  if (!tab && create) {
    tab = book.insertSheet(READINESS_SHEET_);
    const headers = ['التاريخ','وقت النشر',...READINESS_CLASSES_];
    if (tab.getMaxColumns() < headers.length) tab.insertColumnsAfter(tab.getMaxColumns(),headers.length-tab.getMaxColumns());
    tab.getRange(1,1,1,headers.length).setNumberFormat('@').setValues([headers]);
    tab.setFrozenRows(1);
  }
  return tab;
}

function readinessRow_(tab,date) {
  const last = tab?.getLastRow() || 0;
  if (last < 2) return 0;
  const match = tab.getRange(2,1,last-1,1).createTextFinder(date).matchEntireCell(true).findNext();
  return match ? match.getRow() : 0;
}

function readinessPublish_(d) {
  const date = readinessDate_(d.date);
  if (date < serverNow().date) throw Error('اختر اليوم أو تاريخًا لاحقًا للنشر.');
  if (!Array.isArray(d.rows) || !d.rows.length || d.rows.length > READINESS_CLASSES_.length*4) throw Error('اختر حصصًا صالحة للنشر.');
  const seen = new Set();
  const grouped = new Map(READINESS_CLASSES_.map(group => [group,[]]));
  for (const row of d.rows) {
    if (!row || !grouped.has(row.group) || !Number.isInteger(row.slot) || row.slot<1 || row.slot>4 ||
        !READINESS_MODES_.includes(row.mode) || typeof row.subject!=='string' || row.subject.length>120 ||
        typeof row.teacher!=='string' || row.teacher.length>160 ||
        typeof row.link!=='string' || row.link.length>1500 || (row.link && !/^https:\/\/[^\s<>"']+$/.test(row.link)) ||
        typeof row.from!=='string' || typeof row.to!=='string' ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.from) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.to) || row.from>=row.to) {
      throw Error('راجع بيانات الحصص وأوقاتها وروابطها قبل النشر.');
    }
    const key = row.group+'|'+row.slot;
    if (seen.has(key)) throw Error('يوجد أكثر من سجل للشعبة في الحصة نفسها. راجع التوزيع قبل النشر.');
    seen.add(key);
    grouped.get(row.group).push({slot:row.slot,from:row.from,to:row.to,mode:row.mode,subject:row.subject,teacher:row.teacher,link:row.link});
  }
  const tab = readinessSheet_(true);
  const row = readinessRow_(tab,date) || tab.getLastRow()+1;
  const published = serverNow();
  const values = [date,published.date+' '+published.time,...READINESS_CLASSES_.map(group =>
    JSON.stringify(grouped.get(group).sort((a,b)=>a.slot-b.slot)))];
  tab.getRange(row,1,1,values.length).setNumberFormat('@').setValues([values]);
  return {date,lessons:seen.size};
}

function readinessWithdraw_(d) {
  const date = readinessDate_(d.date);
  const tab = readinessSheet_(false);
  const row = readinessRow_(tab,date);
  if (row) tab.deleteRow(row);
  return {date,withdrawn:Boolean(row)};
}

function readinessPublic_(parameters) {
  const date = parameters.date || serverNow().date;
  const group = String(parameters.group || '');
  const index = READINESS_CLASSES_.indexOf(group);
  if (index<0) throw Error('اختر الصف والشعبة.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('اختر تاريخًا صحيحًا.');
  const tab = readinessSheet_(false);
  const row = readinessRow_(tab,date);
  const lessons = row ? JSON.parse(tab.getRange(row,index+3).getDisplayValue() || '[]') : [];
  return {date,group,active:Boolean(row),lessons};
}

const SCHOOL_CHANGES_SHEET_ = 'التغييرات المدرسية المعتمدة';
const SCHOOL_CHANGES_HEADERS_ = ['المعرّف','التاريخ','الشعبة','النوع','بيانات التغيير'];

function schoolGroup_(value) {
  const group = String(value || '');
  if (!READINESS_CLASSES_.includes(group)) throw Error('اختر الصف والشعبة.');
  return group;
}

function schoolChanges_(date) {
  const tab = ss().getSheetByName(SCHOOL_CHANGES_SHEET_);
  if (!tab || tab.getLastRow()<2) return [];
  return tab.getRange(2,1,tab.getLastRow()-1,SCHOOL_CHANGES_HEADERS_.length).getDisplayValues()
    .flatMap(r=>r[1]===date?[{...JSON.parse(r[4]),id:r[0],group:r[2],type:r[3]}]:[]);
}

function schoolChangesPublic_(p) {
  const date = p.date || serverNow().date;
  const value = new Date(date+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(value.getTime())||value.toISOString().slice(0,10)!==date)throw Error('اختر تاريخًا صحيحًا.');
  const group = p.group ? schoolGroup_(p.group) : '';
  return {date,changes:schoolChanges_(date).filter(change=>!group||change.group===group)};
}

function schoolDayGrid_(date) {
  const day = ATTENDANCE_DAYS_[new Date(date+'T12:00:00Z').getUTCDay()];
  const {groups,teachers:names}=attendanceTimetableDay_(day);
  const grid=new Map();
  for(const [code,periods] of groups){
    const group=code.split('/').reverse().join('/');
    for(const [slot,teachers] of Object.entries(periods))grid.set(group+'|'+slot,teachers);
  }
  const changes = schoolChanges_(date);
  for (const change of changes.filter(c=>c.type==='swap')) {
    grid.set(change.group+'|'+change.first,[change.afterFirst]);
    grid.set(change.group+'|'+change.second,[change.afterSecond]);
  }
  return {day,grid,names,changes};
}

function schoolPreviewSwap_(d) {
  const date = readinessDate_(d.date), group=schoolGroup_(d.group);
  const first=Number(d.first), second=Number(d.second);
  if (![first,second].every(slot=>Number.isInteger(slot)&&slot>=1&&slot<=8)||first===second) throw Error('اختر حصتين مختلفتين.');
  const {grid}=schoolDayGrid_(date);
  const a=grid.get(group+'|'+first)||[], b=grid.get(group+'|'+second)||[];
  if (a.length!==1||b.length!==1) throw Error('يلزم وجود معلم واحد لكل من الحصتين في الجدول.');
  if (a[0]===b[0]) throw Error('المعلم نفسه يدرّس الحصتين.');
  const conflicts=[];
  for (const [key,names] of grid) {
    const [other,slot]=key.split('|');
    if (other===group) continue;
    if ((Number(slot)===first&&names.includes(b[0]))||(Number(slot)===second&&names.includes(a[0]))) {
      conflicts.push({group:other,slot:Number(slot),teacher:Number(slot)===first?b[0]:a[0]});
    }
  }
  return {date,group,first,second,beforeFirst:a[0],beforeSecond:b[0],afterFirst:b[0],afterSecond:a[0],conflicts};
}

function schoolPublishChange_(d) {
  const date=readinessDate_(d.date), group=schoolGroup_(d.group);
  if (date<serverNow().date) throw Error('اختر اليوم أو تاريخًا لاحقًا.');
  let change;
  if(d.type==='swap'){
    const next=schoolPreviewSwap_(d);
    if(next.conflicts.length)throw Error('تغيّر الجدول أو توجد حصة متعارضة. راجع المعاينة.');
    if(next.beforeFirst!==d.beforeFirst||next.beforeSecond!==d.beforeSecond)throw Error('تغيّرت الحصص. أعد المعاينة.');
    change={first:next.first,second:next.second,afterFirst:next.afterFirst,afterSecond:next.afterSecond,
      text:'تبديل الحصتين '+next.first+' و'+next.second};
  }else if(d.type==='note'){
    const message=String(d.text||'').trim(), slot=Number(d.slot||0);
    if(!message||message.length>240||!Number.isInteger(slot)||slot<0||slot>8)throw Error('أدخل تنبيهًا مختصرًا واختر الحصة عند الحاجة.');
    change={slot,text:message};
  }else throw Error('اختر نوع التغيير.');
  const book=ss();
  let tab=book.getSheetByName(SCHOOL_CHANGES_SHEET_);
  if(!tab){
    tab=book.insertSheet(SCHOOL_CHANGES_SHEET_);
    tab.appendRow(SCHOOL_CHANGES_HEADERS_);
    tab.setFrozenRows(1);
  }
  const id=Utilities.getUuid();
  tab.getRange(tab.getLastRow()+1,1,1,5).setNumberFormat('@').setValues([[id,date,group,d.type,JSON.stringify(change)]]);
  return {date,id};
}

function schoolMeetingCheck_(d) {
  const date=readinessDate_(d.date), slot=Number(d.slot);
  const {grid,names,day}=schoolDayGrid_(date);
  const teachers=Array.isArray(d.teachers)?[...new Set(d.teachers)]:[];
  if(!Number.isInteger(slot)||slot<1||slot>8||teachers.length<2||teachers.some(t=>!names.includes(t))) throw Error('اختر حصة ومعلمين اثنين على الأقل.');
  const conflicts=[];
  for(const teacher of teachers){
    const groups=[...grid].filter(([key,members])=>key.endsWith('|'+slot)&&members.includes(teacher)).map(([key])=>key.split('|')[0]);
    if(groups.length||teacher==='عمر البلوشي'&&!['الأربعاء','الخميس'].includes(day)||teacher==='خليل اسلامية'&&day==='الأحد') conflicts.push({teacher,groups});
  }
  return {conflicts};
}

function schoolProgress_(d) {
  const date=readinessDate_(d.date);
  const {grid}=schoolDayGrid_(date);
  const attendance=new Map(attendanceRows_(date).map(r=>[r.key,r]));
  const waiting=[], missing=[];
  for(const [key,teachers] of grid){
    const [group,slot]=key.split('|');
    const [grade,section]=group.split('/');
    const saved=attendance.get([date,grade,section,slot].join('|'));
    const item={group,slot:Number(slot),teacher:saved?.teacher||teachers.join('، ')};
    if(!saved)missing.push(item);
    else if(!saved.approved)waiting.push(item);
  }
  const order=(a,b)=>a.group.localeCompare(b.group,'ar',{numeric:true})||a.slot-b.slot;
  const uncovered=getRecords().filter(r=>r.date===date&&!r.reserve).map(r=>({group:r.className.split('/').reverse().join('/'),slot:r.period,teacher:r.absent}));
  return {date,missing:missing.sort(order),waiting:waiting.sort(order),uncovered,scheduled:grid.size};
}
