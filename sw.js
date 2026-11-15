self.addEventListener('fetch', (event) => {
  const { request } = event;
  const scope = new URL(self.registration.scope);
  const target = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate' ||
      target.origin !== scope.origin || !target.pathname.startsWith(scope.pathname)) return;

  // Keep school pages current and leave data requests to the browser.
  event.respondWith(fetch(request).catch(() => new Response(
    '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>بوابة سعد | الاتصال بالإنترنت</title>' +
    '<body style="font:1.1rem system-ui;background:#f3f8f7;color:#123e45;padding:2rem">' +
    '<h1>تعذّر الاتصال بالبوابة</h1><p>تحقّق من اتصال الإنترنت، ثم أعد تحميل الصفحة.</p></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )));
});
