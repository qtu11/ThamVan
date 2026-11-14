// No authenticated pages, API responses, location histories or photos are cached.
function defaultLocaleFromBrowser(){
 const lang=(self.navigator?.language||'').toLowerCase();
 if(lang.startsWith('zh'))return 'zh';
 if(lang.startsWith('en'))return 'en';
 return 'vi';
}
function defaultMessage(locale){
 if(locale==='zh')return {title:'THÁM VĂN',body:'您有新的通知更新。',url:'/zh/dashboard?tab=notifications'};
 if(locale==='en')return {title:'THÁM VĂN',body:'You have a new update.',url:'/en/dashboard?tab=notifications'};
 return {title:'THÁM VĂN',body:'Bạn có cập nhật mới.',url:'/vi/dashboard?tab=notifications'};
}
self.addEventListener('push',event=>{
 const locale=defaultLocaleFromBrowser();
 const fallback=defaultMessage(locale);
 let message={...fallback};
 try{if(event.data)message={...message,...event.data.json()};}catch{/* Keep a visible fallback notification. */}
 const target=typeof message.url==='string'&&/^\/(vi|en|zh)\//.test(message.url)&&!message.url.startsWith('//')?message.url:`/${locale}/dashboard`;
 event.waitUntil(self.registration.showNotification(String(message.title).slice(0,120),{body:String(message.body).slice(0,400),icon:'/icons/pwa-192.png',badge:'/icons/pwa-192.png',data:{url:target},tag:message.id||undefined}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const locale=defaultLocaleFromBrowser();const target=new URL(event.notification.data?.url||`/${locale}/dashboard`,self.location.origin);
 if(target.origin!==self.location.origin)return;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
  const existing=clients.find(client=>new URL(client.url).origin===self.location.origin);if(existing){await existing.navigate(target.href);return existing.focus();}return self.clients.openWindow(target.href);
 }));
});
