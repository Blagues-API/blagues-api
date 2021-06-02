/* global document, window, fetch */
/* eslint-disable no-unused-vars */

const copyToClipboard = () => {
  const btn = document.getElementById('copy-btn');
  const el = document.getElementById('copy-target');
  window.getSelection().removeAllRanges();
  const range = document.createRange();
  range.selectNode(el);
  window.getSelection().addRange(range);
  document.execCommand('copy');
  btn.innerHTML = 'COPIÉ !';
  setTimeout(() => {
    btn.innerHTML = 'COPIER';
    window.getSelection().removeAllRanges();
  }, 2000);
};

const regenerateToken = () => {
  const btn = document.getElementById('regenerate-btn');
  fetch('/api/regenerate', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer <%= user.token %>',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key: '<%= user.token_key %>' }),
  })
    .then(r => r.json())
    .then(newToken => {
      if (newToken.error) return;
      document.getElementById('copy-target').innerHTML = newToken;
      btn.innerHTML = 'REGÉNÉRÉ !';
      setTimeout(() => {
        btn.innerHTML = 'REGÉNÉRER';
        window.getSelection().removeAllRanges();
      }, 2000);
    });
};
