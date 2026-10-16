(async () => {
  const button = document.querySelector('[data-commission-cta]');
  if (!button) return;
  try {
    const response = await fetch('data/commission.json', { cache: 'no-store' });
    if (!response.ok) return;
    const config = await response.json();
    let target = config.url;
    if (!target && ['127.0.0.1', 'localhost'].includes(location.hostname)) target = location.protocol + '//' + location.hostname + ':4180/';
    if (!target) return;
    const url = new URL(target);
    const local = ['127.0.0.1', 'localhost'].includes(location.hostname) && ['127.0.0.1', 'localhost'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return;
    button.href = url.href;
    button.hidden = false;
  } catch { /* Keep the existing contact methods available until setup is complete. */ }
})();
