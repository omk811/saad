/* بيانات المواد العامة فقط — الأستاذ خليل البلوشي */
'use strict';
window.SaadSubjects = (() => {
  const endpoint = 'https://script.google.com/macros/s/AKfycbxaE54AYPy3XPTl7JUUw_nVEjA466BJqwZvwHfwPObBAxUuP_tfSZWgmbbne2xMsnxh/exec';
  const key = 'saad-subjects-v1';
  const timeKey = 'saad-subjects-updated-at';
  const maxAge = 5 * 60 * 1000;
  let subjects = {};
  let updatedAt = 0;
  let pending;
  let revision = 0;
  const listeners = new Set();
  const valid = value => value && typeof value === 'object' && !Array.isArray(value);
  function restore() {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      if (valid(value)) subjects = value;
      updatedAt = Number(localStorage.getItem(timeKey)) || 0;
    } catch {}
  }
  restore();
  function notify() { for (const listener of listeners) listener(subjects); }
  function replace(value, fresh = true) {
    if (!valid(value)) throw Error('بيانات المواد غير صالحة');
    revision++;
    subjects = value;
    updatedAt = fresh ? Date.now() : 0;
    try {
      localStorage.setItem(key, JSON.stringify(subjects));
      localStorage.setItem(timeKey, String(updatedAt));
    } catch {}
    notify();
  }
  async function refresh(force = false) {
    if (pending) return pending;
    if (!force && updatedAt && Date.now() - updatedAt < maxAge) return subjects;
    const started = revision;
    pending = (async () => {
      const response = await fetch(endpoint + '?action=subjects', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw Error('تعذّر الاتصال بخدمة المواد');
      const data = await response.json();
      if (!data.ok) throw Error(data.error || 'تعذّر تحديث المواد');
      if (started === revision) replace(data.subjects);
      return subjects;
    })();
    try { return await pending; } finally { pending = null; }
  }
  const normalize = value => String(value || '').normalize('NFKC').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
  function lookup(name, group) {
    const record = subjects[name] || subjects[Object.keys(subjects).find(key => normalize(key) === normalize(name))] || {};
    const exact = record[group] || record[Object.keys(record).find(key => normalize(key) === normalize(group))];
    if (typeof exact === 'string' && exact.trim()) return exact;
    const values = [...new Set(Object.values(record).filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
    return values.length === 1 ? values[0] : '';
  }
  window.addEventListener('storage', event => {
    if (event.key === timeKey || event.key === null) { revision++; restore(); notify(); }
  });
  return { endpoint, lookup, refresh, replace, subscribe(listener) { listeners.add(listener); }, get data() { return subjects; } };
})();
