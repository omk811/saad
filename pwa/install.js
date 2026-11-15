const installButton = document.querySelector('#install-app');
const installHelp = document.querySelector('#install-help');
const installSteps = document.querySelector('#install-steps');
const standalone = window.matchMedia('(display-mode: standalone)');
const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installEvent;

function updateInstallButton() {
  installButton.hidden = standalone.matches || navigator.standalone === true;
  if (installButton.hidden) installHelp.hidden = true;
}

function showInstructions() {
  if (isAppleMobile) {
    installSteps.textContent = 'افتح قائمة المشاركة في المتصفح، ثم اختر «إضافة إلى الشاشة الرئيسية». فعّل «فتح كتطبيق ويب» إن ظهر، ثم اضغط «إضافة». إذا غاب الخيار، افتح هذه الصفحة في Safari.';
  } else if (/Android/i.test(navigator.userAgent)) {
    installSteps.textContent = 'افتح قائمة المتصفح (⋮)، واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». قد يضيف متصفحك اختصارًا. إذا غاب الخيار، افتح هذه الصفحة في Chrome أو Samsung Internet.';
  } else {
    installSteps.textContent = 'ابحث عن «تثبيت التطبيق» في شريط العنوان أو قائمة المتصفح. على الهاتف افتح رابط البوابة في متصفح الجهاز إذا كنت تعرضه داخل تطبيق آخر.';
  }
  installHelp.hidden = false;
  installButton.setAttribute('aria-expanded', 'true');
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installEvent = event;
});

window.addEventListener('appinstalled', () => {
  installEvent = undefined;
  installButton.hidden = true;
  installHelp.hidden = true;
  installButton.setAttribute('aria-expanded', 'false');
});

installButton.addEventListener('click', async () => {
  if (installEvent) {
    const prompt = installEvent;
    installEvent = undefined;
    try {
      await prompt.prompt();
    } catch {
      showInstructions();
    }
    return;
  }

  if (installHelp.hidden) {
    showInstructions();
  } else {
    installHelp.hidden = true;
    installButton.setAttribute('aria-expanded', 'false');
  }
});

standalone.addEventListener?.('change', updateInstallButton);
updateInstallButton();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.warn('Service worker registration failed.', error);
  });
}
