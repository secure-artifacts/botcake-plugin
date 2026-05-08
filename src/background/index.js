chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ 
    url: "https://botcake.io/dashboard?self_page_botcake_extension" 
  });
});

// 监听导航防止 SPA 路由干扰
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0 && details.url.includes('self_page_botcake_extension')) {
    console.log("拦截到插件目标导航");
  }
});