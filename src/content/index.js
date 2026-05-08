(async function() {
  const targetParam = 'self_page_botcake_extension';
  if (!window.location.search.includes(targetParam)) return;

  window.stop();

  // 1. 在有权限的 Content Script 环境预读数据
  const storedData = await chrome.storage.local.get(['botcake_token']);
  const cookieJwt = document.cookie.match(/token_jwt=([^;]+)/)?.[1] || '';

  // 2. 构建干净的宿主环境
  document.documentElement.innerHTML = `
    <head><meta charset="UTF-8"><title>Botcake 看板</title></head>
    <body style="margin:0;"><div id="app"></div></body>
  `;
  
  // 3. 注入资源并传递初始数据
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('assets/popup.js');
  script.type = 'module';
  
  // 将持久化数据和 Cookie 数据挂载在 dataset 上传给 Vue
  script.dataset.initToken = storedData.botcake_token || '';
  script.dataset.autoToken = cookieJwt;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('assets/popup.css');

  document.head.appendChild(link);
  document.body.appendChild(script);

  // 4. 监听 Vue 发出的指令并执行插件特权操作
  window.addEventListener('SAVE_BOTCAKE_DATA', (event) => {
    const { token } = event.detail;
    chrome.storage.local.set({ botcake_token: token });
  });

  window.addEventListener('REMOVE_BOTCAKE_DATA', () => {
    chrome.storage.local.remove(['botcake_token']);
  });
})();