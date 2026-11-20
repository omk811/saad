/** ملتقى أولياء الأمور 2026 — الأستاذ خليل البلوشي
 * Apps Script مستقل. اربطه بالجدول الأصلي ثم انشره كتطبيق ويب.
 * لا تنشر مفاتيح المعلمين أو رموز التحقق في GitHub.
 */
const PM={SOURCE:'1bv2nIKMcu9-I5_dAC7q8-dfcZlCj38fqJbMvyv1An2g',DATE:'2026-12-03',TZ:'Asia/Muscat',FAMILIES:'الملتقى - تحقق الأسر',VISITS:'الملتقى - الحضور',REPORTS:'الملتقى - تقارير المواد'};
const HEADERS={
 [PM.FAMILIES]:['رقم الهاتف','اسم ولي الأمر','بصمة رمز التحقق','الأرقام المدرسية المصرح بها','مفعل'],
 [PM.VISITS]:['وقت التسجيل','تاريخ الملتقى','رقم الهاتف','اسم ولي الأمر','الأرقام المدرسية'],
 [PM.REPORTS]:['الرقم المدرسي','المادة','اسم المعلم','المستوى','أدوات التقويم','نقاط القوة','جوانب التحسين','التوصيات','آخر تحديث']
};
function setupParentMeeting(){
 const ss=SpreadsheetApp.openById(PM.SOURCE);
 Object.entries(HEADERS).forEach(([name,heads])=>{let sh=ss.getSheetByName(name)||ss.insertSheet(name);if(sh.getLastRow()===0){sh.appendRow(heads);sh.setFrozenRows(1)}});
 return 'تم تجهيز التبويبات دون تغيير بيانات الطلاب أو الزيارات الأصلية';
}
function doGet(){return ContentService.createTextOutput(JSON.stringify({ok:true,service:'parent-meeting',ready:true})).setMimeType(ContentService.MimeType.JSON)}
function doPost(e){let out;try{const p=JSON.parse(e.postData.contents||'{}');const action=String(p.action||'');if(!['family','report','checkin','teacherSave','adminSummary'].includes(action))throw Error('طلب غير معروف');out=({family:family,report:report,checkin:checkin,teacherSave:teacherSave,adminSummary:adminSummary})[action](p)}catch(err){out={ok:false,error:String(err.message||'تعذر تنفيذ الطلب')}}return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON)}
function ss(){return SpreadsheetApp.openById(PM.SOURCE)}
function rows(name){const sh=ss().getSheetByName(name);if(!sh)throw Error('يلزم تشغيل setupParentMeeting أولًا');return sh.getDataRange().getDisplayValues().slice(1).filter(r=>r.some(Boolean))}
function normPhone(v){let s=String(v||'').replace(/[^0-9]/g,'');if(s.startsWith('968')&&s.length===11)s=s.slice(3);if(!/^\d{8}$/.test(s))throw Error('رقم هاتف غير صالح');return s}
function digest(v){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v),Utilities.Charset.UTF_8).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('')}
function clean(v,n=500){return String(v||'').trim().slice(0,n).replace(/^[=+@\-]/,'\u0027$&')}
function authorized(p){const phone=normPhone(p.phone);const code=String(p.verificationCode||'');if(!/^\d{6}$/.test(code))throw Error('أدخل رمز التحقق المكون من ٦ أرقام');const key='pm_attempt_'+digest(phone).slice(0,16),cache=CacheService.getScriptCache(),attempt=Number(cache.get(key)||0);if(attempt>=8)throw Error('محاولات كثيرة، يرجى مراجعة المدرسة');cache.put(key,String(attempt+1),600);const match=rows(PM.FAMILIES).find(r=>normPhone(r[0])===phone&&r[2]===digest(phone+':'+code)&&String(r[4]).toLowerCase()!=='false'&&r[4]!=='0');if(!match)throw Error('تعذر التحقق من بيانات الأسرة');cache.remove(key);const ids=String(match[3]).split(/[,،;\s]+/).filter(Boolean);if(!ids.length)throw Error('لا يوجد أبناء مرتبطون بهذا السجل');return {phone,name:match[1],ids}}
function students(){return rows('الطلاب').map(r=>({schoolId:String(r[0]),name:r[1],grade:r[2],section:r[3],phone:r[4]}))}
function family(p){const a=authorized(p),list=students().filter(s=>a.ids.includes(s.schoolId));return {ok:true,students:list.map(({schoolId,name,grade,section})=>({schoolId,name,grade,section}))}}
function report(p){const a=authorized(p),id=String(p.schoolId||'');if(!a.ids.includes(id))throw Error('غير مصرح بعرض هذا التقرير');const student=students().find(s=>s.schoolId===id);if(!student)throw Error('الطالب غير موجود');const subjects=rows(PM.REPORTS).filter(r=>r[0]===id).map(r=>({subject:r[1],teacher:r[2],level:r[3],assessment:r[4],strengths:r[5],improvements:r[6],recommendation:r[7]}));return {ok:true,student,subjects}}
function checkin(p){const a=authorized(p),lock=LockService.getScriptLock();lock.waitLock(15000);try{const sh=ss().getSheetByName(PM.VISITS),existing=rows(PM.VISITS).some(r=>r[1]===PM.DATE&&normPhone(r[2])===a.phone);if(existing)return {ok:true,already:true};sh.appendRow([new Date(),PM.DATE,a.phone,clean(a.name,120),a.ids.join(',')]);return {ok:true,already:false}}finally{lock.releaseLock()}}
function role(p,role){const given=String(p.staffKey||'');const expected=PropertiesService.getScriptProperties().getProperty(role==='teacher'?'PM_TEACHER_KEY':'PM_ADMIN_KEY');if(!expected||given.length<16||digest(given)!==digest(expected))throw Error('صلاحية غير كافية')}
function teacherSave(p){role(p,'teacher');const id=String(p.schoolId||'');if(!students().some(s=>s.schoolId===id))throw Error('الطالب غير موجود');const subject=clean(p.subject,80);if(!subject)throw Error('المادة مطلوبة');const sh=ss().getSheetByName(PM.REPORTS),lock=LockService.getScriptLock();lock.waitLock(15000);try{const data=sh.getDataRange().getDisplayValues();const idx=data.findIndex((r,i)=>i>0&&r[0]===id&&r[1]===subject);const values=[id,subject,clean(p.teacher,120),clean(p.level,80),clean(p.assessment),clean(p.strengths),clean(p.improvements),clean(p.recommendation),new Date()];if(idx<0)sh.appendRow(values);else sh.getRange(idx+1,1,1,values.length).setValues([values]);return {ok:true}}finally{lock.releaseLock()}}
function adminSummary(p){role(p,'admin');return {ok:true,studentCount:students().length,visitCount:rows(PM.VISITS).filter(r=>r[1]===PM.DATE).length,reportCount:rows(PM.REPORTS).length}}
/** شغّلها يدويًا من محرر Apps Script بعد تعديل القيم التجريبية.
 * الرمز لا يُخزَّن صريحًا في الجدول؛ يجب تسليمه للأسرة عبر قناة موثوقة.
 */
function provisionFamily(phone,guardianName,studentIds,sixDigitCode){
 const n=normPhone(phone);if(!/^\d{6}$/.test(String(sixDigitCode)))throw Error('الرمز يجب أن يتكون من ستة أرقام');
 const ids=String(studentIds).split(/[,،;\s]+/).filter(Boolean);if(!ids.length||!ids.every(id=>students().some(s=>s.schoolId===id)))throw Error('أرقام مدرسية غير صحيحة');
 const sh=ss().getSheetByName(PM.FAMILIES);sh.appendRow([n,clean(guardianName,120),digest(n+':'+sixDigitCode),ids.join(','),true]);
 return 'تم تسجيل الأسرة';
}
