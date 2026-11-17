/* تشغيل مكونات الصفحة المعروضة — الأستاذ خليل البلوشي */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const DATA = window.SAAD_TIMETABLE?.teachers;
  if (!DATA) {
    const message = document.createElement('p');
    message.setAttribute('role', 'alert');
    message.textContent = 'تعذّر تحميل الجدول. أعد تحميل الصفحة.';
    document.querySelector('main').prepend(message);
    return;
  }
  const subjects = window.SaadSubjects;
  const DAYS = window.SAAD_TIMETABLE.days;
  const GRADES = { 5: 'الخامس', 6: 'السادس', 7: 'السابع', 8: 'الثامن' };
  const names = Object.keys(DATA).sort((a, b) => a.localeCompare(b, 'ar'));
  const classes = [...new Set(Object.values(DATA).flatMap(days => Object.values(days).flat()).filter(Boolean))]
    .sort((a, b) => Number(a.split('/')[1]) - Number(b.split('/')[1]) || Number(a.split('/')[0]) - Number(b.split('/')[0]));
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const label = code => { const [group, grade] = code.split('/'); return (GRADES[grade] || grade) + ' — الشعبة ' + group; };
  const todayIndex = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Muscat' }).format(new Date());
  const currentDay = DAYS[['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].indexOf(todayIndex)] || DAYS[0];
  const renderers = [];
  function read(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch {} }
  function fill(select, options, placeholder) {
    select.replaceChildren();
    if (placeholder) select.add(new Option(placeholder, ''));
    for (const [value, text] of options) select.add(new Option(text, value));
  }
  function classOptions(select) { fill(select, classes.map(code => [code, label(code)]), 'اختر الصف والشعبة'); }
  const subject = (name, code) => subjects.lookup(name, code) || 'المادة غير محددة';
  function renderVisible() { for (const render of renderers) render(); }

  window.printSection = id => {
    const section = $(id);
    if (!section || (id === 'studentClassTimetable' && !$('studentClassSelect').value)) return;
    const classMeta = $('classPrintMeta');
    if (classMeta) classMeta.textContent = $('classTeacherSelect').value ? label($('classTeacherSelect').value) : 'يرجى اختيار الشعبة';
    if ($('weeklyPrintMeta')) $('weeklyPrintMeta').textContent = 'المعلم ' + $('teacher').value;
    if ($('lookupPrintMeta')) $('lookupPrintMeta').textContent = $('lookupDay').value + ' — الحصة ' + $('lookupPeriod').value + ' — الصف ' + GRADES[$('lookupClass').value];
    document.querySelectorAll('.print-selected').forEach(node => node.classList.remove('print-selected'));
    section.classList.add('print-selected');
    document.body.dataset.printTarget = id;
    if (id === 'weeklyTimetable' || id === 'studentClassTimetable') {
      const rule = document.createElement('style');
      rule.id = 'timetablePrintPageRule';
      rule.textContent = '@page{size:A4 landscape;margin:10mm}';
      document.head.append(rule);
    }
    window.print();
  };
  window.addEventListener('afterprint', () => {
    delete document.body.dataset.printTarget;
    $('timetablePrintPageRule')?.remove();
    document.querySelectorAll('.print-selected').forEach(node => node.classList.remove('print-selected'));
  });

  if ($('teacher')) {
    const teacher = $('teacher');
    fill(teacher, names.map(name => [name, name]));
    const previous = read('saad-timetable-teacher');
    if (DATA[previous]) teacher.value = previous;
    function renderTeacher() {
      const name = teacher.value;
      save('saad-timetable-teacher', name);
      if ($('weekBody')) {
        let total = 0;
        $('weekBody').innerHTML = DAYS.map(day => {
          const values = DATA[name]?.[day] || Array(8).fill('');
          total += values.filter(Boolean).length;
          return '<tr><th scope="row">' + safe(day) + '</th>' + values.map(code => '<td class="' + (code ? 'has-lesson' : 'empty-lesson') + '">' + (code ? '<div class="weekly-lesson"><strong class="weekly-class">' + safe(code) + '</strong><span class="weekly-subject">' + safe(subject(name, code)) + '</span></div>' : '<span class="empty-dash">—</span>') + '</td>').join('') + '</tr>';
        }).join('');
        $('weekTotal').textContent = 'مجموع الحصص الأسبوعية ' + total;
      }
    }
    teacher.addEventListener('change', renderTeacher);
    renderers.push(renderTeacher);
  }

  if ($('classTeacherSelect')) {
    const select = $('classTeacherSelect');
    classOptions(select);
    function renderClass() {
      if ($('classTeachers').hidden) return;
      const code = select.value;
      if (!code) { $('classTeacherResult').textContent = 'اختر الصف والشعبة لعرض المعلمين.'; return; }
      const teachers = names.map(name => ({ name, count: Object.values(DATA[name]).flat().filter(value => value === code).length }))
        .filter(row => row.count).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'));
      $('classTeacherResult').innerHTML = '<div class="class-teacher-grid">' + teachers.map(row => '<article class="class-teacher"><strong>' + safe(row.name) + '</strong><div class="sub">' + safe(subject(row.name, code)) + '</div><small>الحصص الأسبوعية ' + row.count + '</small></article>').join('') + '</div>';
    }
    select.addEventListener('change', renderClass);
    renderers.push(renderClass);
  }

  if ($('lookupDay')) {
    fill($('lookupDay'), DAYS.map(day => [day, day]));
    $('lookupDay').value = currentDay;
    fill($('lookupPeriod'), Array.from({ length: 8 }, (_, i) => [String(i + 1), 'الحصة ' + (i + 1)]));
    fill($('lookupClass'), Object.entries(GRADES));
    function renderLookup() {
      if ($('lookup').hidden) return;
      const day = $('lookupDay').value, period = Number($('lookupPeriod').value), grade = $('lookupClass').value;
      const groups = new Map();
      for (const name of names) {
        const code = DATA[name]?.[day]?.[period - 1];
        if (!code || code.split('/')[1] !== grade) continue;
        if (!groups.has(code)) groups.set(code, []);
        groups.get(code).push(name);
      }
      const ordered = [...groups].sort(([a], [b]) => Number(a.split('/')[0]) - Number(b.split('/')[0]));
      $('lookupResult').innerHTML = '<div class="lesson-lookup-summary"><strong>' + ordered.length + ' شعبة لديها حصة</strong><span>' + safe(day) + ' — الحصة ' + period + '</span></div>' + (ordered.length ? '<div class="lookup-class-grid">' + ordered.map(([code, teachers]) => '<article class="lookup-class-card' + (teachers.length > 1 ? ' has-conflict' : '') + '"><div class="lookup-class-head"><span>الصف ' + safe(GRADES[grade]) + '</span><strong>الشعبة ' + safe(code.split('/')[0]) + '</strong></div>' + teachers.map(name => '<div class="lookup-class-info"><div class="lookup-class-teacher">' + safe(name) + '</div><div class="lookup-class-subject">' + safe(subject(name, code)) + '</div></div>').join('') + (teachers.length > 1 ? '<div class="lookup-class-warning">تعارض يحتاج إلى مراجعة</div>' : '') + '</article>').join('') + '</div>' : '<p>لا توجد حصص لهذا الصف في التوقيت المحدد.</p>');
    }
    for (const id of ['lookupDay', 'lookupPeriod', 'lookupClass']) $(id).addEventListener('change', renderLookup);
    renderers.push(renderLookup);
  }

  if ($('studentClassSelect')) {
    const select = $('studentClassSelect');
    classOptions(select);
    const query = new URLSearchParams(location.search).get('group');
    const linked = query?.split('/').reverse().join('/');
    const previous = read('saad-student-class');
    if (classes.includes(linked)) select.value = linked;
    else if (classes.includes(previous)) select.value = previous;
    function renderStudent() {
      const code = select.value;
      $('printStudentSchedule').disabled = !code;
      if (!code) { $('studentScheduleBody').innerHTML = '<tr><td colspan="9">اختر شعبة لعرض الجدول.</td></tr>'; $('studentScheduleStatus').textContent = 'اختر الشعبة أولًا'; return; }
      save('saad-student-class', code);
      let total = 0, conflicts = 0, missing = 0;
      $('studentScheduleBody').innerHTML = DAYS.map(day => '<tr><th scope="row">' + safe(day) + '</th>' + Array.from({ length: 8 }, (_, slot) => {
        const teachers = names.filter(name => DATA[name]?.[day]?.[slot] === code);
        if (!teachers.length) return '<td class="empty-lesson">غير مسجلة</td>';
        total++;
        if (teachers.length > 1) conflicts++;
        return '<td class="has-lesson">' + teachers.map((name, index) => {
          const value = subjects.lookup(name, code);
          if (!value) missing++;
          return '<div class="student-lesson"><b>' + safe(value || 'المادة غير محددة') + '</b><small>' + safe(name) + '</small>' + (teachers.length > 1 && index === 0 ? '<em>تعارض يحتاج إلى مراجعة</em>' : '') + '</div>';
        }).join('') + '</td>';
      }).join('') + '</tr>').join('');
      $('studentPrintMeta').textContent = 'جدول الطالب — ' + label(code) + ' — العام الدراسي 2026/2027';
      $('studentScheduleStatus').textContent = label(code) + ' | الحصص ' + total + (conflicts ? ' | تعارضات ' + conflicts : '') + (missing ? ' | مواد تحتاج تحديدًا' : '');
    }
    select.addEventListener('change', renderStudent);
    renderers.push(renderStudent);
  }

  if ($('subjectsAdmin')) {
    const teacher = $('editTeacher'), group = $('editClass'), input = $('editSubject'), status = $('subjectStatus');
    fill(teacher, names.map(name => [name, name]));
    let dirty = false;
    input.addEventListener('input', () => { dirty = true; });
    function editValue() {
      dirty = false;
      const all = $('subjectApplyMode').value === 'all';
      group.disabled = all;
      input.value = all ? '' : subjects.data[teacher.value]?.[group.value] || '';
      $('saveSubject').textContent = all ? 'حفظ المادة لجميع الشعب' : 'حفظ تعديل الشعبة';
    }
    function editClasses() { fill(group, classes.filter(code => Object.values(DATA[teacher.value]).flat().includes(code)).map(code => [code, label(code)])); editValue(); }
    teacher.addEventListener('change', editClasses);
    group.addEventListener('change', editValue);
    $('subjectApplyMode').addEventListener('change', editValue);
    async function post(payload) {
      const response = await fetch(subjects.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      if (!response.ok) throw Error('تعذّر الاتصال بخدمة الحفظ');
      const data = await response.json();
      if (!data.ok) throw Error(data.error || 'تعذّر الحفظ');
      return data;
    }
    $('saveSubject').addEventListener('click', async () => {
      const all = $('subjectApplyMode').value === 'all';
      const payload = { action: all ? 'saveSubjectAll' : 'saveSubject', teacher: teacher.value, className: group.value, subject: input.value.trim(), adminKey: $('subjectAdminKey').value };
      if (!payload.teacher || !payload.subject || payload.subject.length > 100 || !payload.className) { status.textContent = 'اختر المعلم والشعبة واكتب مادة لا تتجاوز ١٠٠ حرف.'; return; }
      if (!payload.adminKey) { status.textContent = 'أدخل رمز الإدارة أولًا.'; return; }
      $('saveSubject').disabled = true;
      status.textContent = 'جارٍ حفظ المادة…';
      let saved = 0;
      try {
        let data;
        try { data = await post(payload); }
        catch (error) {
          // دعم النشر القديم عند عدم توفر الحفظ الجماعي فقط.
          if (!all || error.message !== 'إجراء غير معروف') throw error;
          for (const option of group.options) {
            data = await post({ ...payload, action: 'saveSubject', className: option.value });
            subjects.replace(data.subjects);
            saved++;
          }
        }
        subjects.replace(data.subjects);
        $('subjectAdminKey').value = '';
        status.textContent = 'تم الحفظ الدائم للمادة في ' + (all ? data.updatedClasses || saved || group.options.length : 1) + ' شعبة.';
      } catch (error) { status.textContent = (saved ? 'حُفظت ' + saved + ' شعبة قبل توقف العملية. ' : '') + error.message; }
      finally { $('saveSubject').disabled = false; }
    });
    $('exportSubjects').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(subjects.data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'saad-subjects.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    $('importSubjects').addEventListener('change', async event => {
      try {
        const value = JSON.parse(await event.target.files[0].text());
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('ملف غير صالح');
        const clean = {};
        for (const [name, groups] of Object.entries(value)) {
          if (!DATA[name] || !groups || typeof groups !== 'object' || Array.isArray(groups)) continue;
          const valid = new Set(Object.values(DATA[name]).flat().filter(Boolean));
          for (const [code, text] of Object.entries(groups)) if (valid.has(code) && typeof text === 'string' && text.trim()) (clean[name] ??= {})[code] = text.trim().slice(0, 100);
        }
        subjects.replace(clean, false);
        editValue();
        status.textContent = 'تم الاستيراد على هذا الجهاز. استخدم الحفظ لنقل التعديلات إلى السجل.';
      } catch { status.textContent = 'تعذّر استيراد الملف.'; }
      event.target.value = '';
    });
    $('subjectAdminKey').addEventListener('keydown', event => { if (event.key === 'Enter') $('saveSubject').click(); });
    editClasses();
    subjects.subscribe(() => { if (!dirty) editValue(); });
  }

  for (const tab of document.querySelectorAll('[data-panel]')) {
    tab.addEventListener('click', () => {
      for (const button of document.querySelectorAll('[data-panel]')) {
        const active = button === tab;
        button.setAttribute('aria-pressed', String(active));
        $(button.dataset.panel).hidden = !active;
      }
      history.replaceState(null, '', '#' + tab.dataset.panel);
      renderVisible();
    });
  }
  const linkedTab = [...document.querySelectorAll('[data-panel]')].find(tab => '#' + tab.dataset.panel === location.hash);
  if (linkedTab) linkedTab.click();
  subjects.subscribe(renderVisible);
  renderVisible();
  const syncStatus = $('subjectsPublicStatus');
  async function sync(force = false) {
    syncStatus.textContent = 'جارٍ تحديث المواد…';
    $('refreshSubjects').disabled = true;
    try { await subjects.refresh(force); syncStatus.textContent = 'المواد محدثة · يُتحقَّق من تحديثها عند فتح الجداول بعد خمس دقائق'; }
    catch { syncStatus.textContent = 'تعذّر التحديث. تظهر المواد المحفوظة على هذا الجهاز إن توفرت.'; }
    finally { $('refreshSubjects').disabled = false; }
  }
  $('refreshSubjects').addEventListener('click', () => sync(true));
  sync();
})();
