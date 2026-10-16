/* Barış Öğretmen — bildirim servis çalışanı (sw.js). HTML ile AYNI klasöre yükleyin. Önbellek tutmaz. */
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list){
    for (var i=0;i<list.length;i++){ var c=list[i]; if (c.url.indexOf(self.registration.scope)===0 && 'focus' in c){ if (c.navigate && url.indexOf('#')>0) { try{ c.navigate(url); }catch(x){} } return c.focus(); } }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});
self.addEventListener('push', function(e){
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch(x){ d = { baslik:'Bildirim', govde: e.data ? e.data.text() : '' }; }
  var opt = { body: d.govde || d.body || '', icon: d.icon, badge: d.icon, data: { url: d.url || self.registration.scope } };
  if (d.etiket) { opt.tag = d.etiket; opt.renotify = false; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.baslik || d.title || 'Bildirim', opt),
    (self.navigator && self.navigator.setAppBadge) ? self.registration.getNotifications().then(function(l){ return self.navigator.setAppBadge(l.length||1); }).catch(function(){}) : Promise.resolve()
  ]));
});
