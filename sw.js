/* Barış Öğretmen — bildirim servis çalışanı (sw.js) · sürüm 5 (14. sürüm ile). HTML ile AYNI klasöre yükleyin.
   Sayfa HER ZAMAN önce internetten taze alınır (eski sürüm asla geri gelmez); internet yoksa son taze kopya açılır.
   Gelen bildirimlerin metni "Bildirim Kutusu" için kısa süre saklanır (uygulama açılınca kutuya taşınır). */
var KUTU = 'zirve-kutu', SAYFA = 'zirve-sayfa', KUTUPHANE = 'zirve-kutuphane',
    SAKLA = ['zirve-kutu', 'zirve-kuran-veri', 'zirve-sayfa', 'zirve-kutuphane', 'zirve-derleme', 'zirve-meal-ses', 'zirve-tilavet-ses'];
// 14. sürüm: uygulamanın kullandığı kütüphaneler (React, Tailwind, Firebase, yazı tipleri…) cihazda saklanır →
// açılış hızlanır, internet yokken de uygulama açılır. Önce saklanan kopya verilir, arkada sessizce tazelenir.
var KUTUPHANE_ADRES = /^https:\/\/(unpkg\.com\/|cdn\.tailwindcss\.com\/?|www\.gstatic\.com\/firebasejs\/|cdn\.jsdelivr\.net\/npm\/|fonts\.googleapis\.com\/|fonts\.gstatic\.com\/)/;
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  // yalnız bu uygulamanın eski "zirve-" önbellekleri silinir (aynı github.io altındaki diğer uygulamalara dokunulmaz)
  e.waitUntil(
    (self.caches ? caches.keys().then(function(k){ return Promise.all(k.filter(function(x){ return /^zirve-/.test(x) && SAKLA.indexOf(x) < 0; }).map(function(x){ return caches.delete(x); })); }) : Promise.resolve())
      .catch(function(){}).then(function(){ return self.clients.claim(); })
  );
});
// Sayfa açılışı: önce internetten taze (304 ile hızlı); 4 sn içinde gelmezse ya da internet yoksa bu sayfanın son kopyası
function anahtarUrl(u){ return String(u).split('#')[0].split('?')[0]; }
self.addEventListener('fetch', function(e){
  var r = e.request;
  if (r.method === 'GET' && r.mode !== 'navigate' && self.caches && KUTUPHANE_ADRES.test(r.url) && !r.headers.has('range')) {
    e.respondWith(caches.open(KUTUPHANE).then(function(c){
      return c.match(r).then(function(eski){
        var taze = fetch(r).then(function(cevap){ if (cevap && (cevap.ok || cevap.type === 'opaque')) c.put(r, cevap.clone()).catch(function(){}); return cevap; });
        if (eski) { e.waitUntil(taze.catch(function(){})); return eski; }
        return taze;
      });
    }).catch(function(){ return fetch(r); }));
    return;
  }
  if (r.method !== 'GET' || r.mode !== 'navigate') return;
  if (r.url.indexOf(self.registration.scope) !== 0) return;
  var k = anahtarUrl(r.url);
  if (!/\.html?$|\/$/.test(k)) return; // yalnız HTML sayfaları
  var ag = fetch(r, { cache: 'no-cache' }).then(function(cevap){
    if (cevap && cevap.ok && cevap.type === 'basic' && self.caches) { var kopya = cevap.clone(); caches.open(SAYFA).then(function(c){ return c.put(k, kopya); }).catch(function(){}); }
    return cevap;
  });
  var kayitli = function(){ return self.caches ? caches.open(SAYFA).then(function(c){ return c.match(k); }) : Promise.resolve(null); };
  e.respondWith(new Promise(function(coz){
    var bitti = false; function ver(x){ if (!bitti && x) { bitti = true; coz(x); } }
    var sure = setTimeout(function(){ kayitli().then(function(m){ ver(m); }).catch(function(){}); }, 4000);
    ag.then(function(c){ clearTimeout(sure); ver(c); }, function(){ clearTimeout(sure); kayitli().then(function(m){ if (m) ver(m); else ag.then(ver, function(){ ver(Response.error()); }); }); });
    ag.catch(function(){}).then(function(c){ if (c) ver(c); });
  }));
});

function kutuYaz(o){
  if (!self.caches) return Promise.resolve();
  return caches.open(KUTU).then(function(c){
    return c.put(new Request(self.registration.scope + '__zirve_kutu__/' + o.tip + '/' + o.id), new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json' } }));
  }).catch(function(){});
}
// Simgedeki sayı = okunmamış bildirim sayısı. iPhone'da getNotifications() boş dönebildiği için
// kutudaki (henüz uygulamaya taşınmamış) okunmamış kayıtlar da sayılır; büyük olan kullanılır.
function okunmamisSay(){
  if (!self.caches) return Promise.resolve(0);
  return caches.open(KUTU).then(function(c){ return c.keys(); }).then(function(ks){
    var b = {}, o = {};
    ks.forEach(function(k){ var m = /__zirve_kutu__\/(bildirim|okundu)\/([^/?#]+)$/.exec(k.url); if (m) (m[1] === 'bildirim' ? b : o)[m[2]] = 1; });
    return Object.keys(b).filter(function(id){ return !o[id]; }).length;
  }).catch(function(){ return 0; });
}
function rozet(enAz){
  if (!(self.navigator && self.navigator.setAppBadge)) return Promise.resolve();
  return Promise.all([ self.registration.getNotifications().then(function(l){ return l.length; }).catch(function(){ return 0; }), okunmamisSay() ]).then(function(s){
    var n = Math.max(s[0], s[1], enAz || 0);
    if (n > 0) return self.navigator.setAppBadge(n);
    return self.navigator.clearAppBadge ? self.navigator.clearAppBadge() : self.navigator.setAppBadge(0);
  }).catch(function(){});
}
function sayfalaraHaber(){
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(l){ l.forEach(function(c){ try { c.postMessage({ tip: 'zirve-kutu' }); } catch(x){} }); }).catch(function(){});
}

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var veri = e.notification.data || {};
  var url = veri.url || self.registration.scope;
  e.waitUntil(Promise.all([
    (veri.kid ? kutuYaz({ tip: 'okundu', id: veri.kid, t: Date.now() }) : Promise.resolve()).then(function(){ return rozet(0); }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
      for (var i = 0; i < list.length; i++){ var c = list[i]; if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c){ if (c.navigate && url.indexOf('#') > 0) { try { c.navigate(url); } catch(x){} } return c.focus(); } }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  ]));
});
// Kullanıcı bildirimi kaydırıp silince sayı da düşer
// (kaydırılan bildirim "görüldü" sayılır; metni Bildirim Kutusu'nda kalır)
self.addEventListener('notificationclose', function(e){
  var veri = (e.notification && e.notification.data) || {};
  e.waitUntil((veri.kid ? kutuYaz({ tip: 'okundu', id: veri.kid, t: Date.now() }) : Promise.resolve()).then(function(){ return rozet(0); }));
});

self.addEventListener('push', function(e){
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch(x){ d = { baslik: 'Bildirim', govde: e.data ? e.data.text() : '' }; }
  var kid = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  var baslik = d.baslik || d.title || 'Bildirim', govde = d.govde || d.body || '', url = d.url || self.registration.scope;
  var opt = { body: govde, icon: d.icon, badge: d.icon, data: { url: url, kid: kid } };
  if (d.etiket) { opt.tag = d.etiket; opt.renotify = false; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(baslik, opt),
    kutuYaz({ tip: 'bildirim', id: kid, t: Date.now(), baslik: baslik, govde: govde, url: url }).then(sayfalaraHaber)
  ]).then(function(){ return rozet(1); }));
});

self.addEventListener('message', function(e){ if (e.data && e.data.tip === 'rozet') e.waitUntil(rozet(0)); });
