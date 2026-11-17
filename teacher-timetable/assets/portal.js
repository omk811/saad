'use strict';
const dateLabel = document.getElementById('portal-date');
if (dateLabel) {
  const now = new Date();
  const day = document.createElement('strong');
  day.textContent = new Intl.DateTimeFormat('ar-OM', { weekday: 'long', timeZone: 'Asia/Muscat' }).format(now);
  dateLabel.append(day, new Intl.DateTimeFormat('ar-OM', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Muscat' }).format(now));
}
