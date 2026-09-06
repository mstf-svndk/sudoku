# Sudoku Atölyesi

Çocukların sınıfta veya tek başına, yetişkinlerin de kendi seviyesinde oynayabileceği Türkçe Sudoku. TypeScript, React ve Vinext/Vite ile hazırlanır; tamamen statik dosyalar olarak yayınlanır. Kullanıcı girişi, veritabanı, API anahtarı ve ücretli servis gerekmez.

## Oyun

- **Boyut:** 4×4, 6×6, 9×9, 12×12. 12×12, 1–9 ve A/B/C kullanır.
- **Seviye:** İlk adım, Kolay, Orta, Zor, Uzman. Boyut ve zorluk bağımsızdır. Yaş etiketleri bağlayıcı değildir.
- **Tek başıma:** Yeni bulmacalar, cihazda otomatik kayıt ve devam etme.
- **Günün bulmacası:** İstanbul tarihine göre her boyut/seviye için aynı günlük bulmaca.
- **İki kişilik:** Aynı cihazda iki bağımsız, aynı başlangıç tahtası. İlk doğru bitiren kazanır. Geniş ekran önerilir.
- **Sınıfta oyna:** Yansıtma için odak görünümü ve aynı bulmacayı farklı cihazlarda açan bağlantı.
- Notlar, geri alma, silme, isteğe bağlı hata işaretleri, kontrol, açıklamalı ipuçları, duraklatma ve gizlenebilir süre.
- Etkileşimli kısa öğretici, yıldızlar ve günlük seri; tekrar çözülen aynı bulmaca ek yıldız kazandırmaz.
- PWA ve üretim derlemesinde çevrimdışı önbellek. Kayıtlar yalnızca kullanılan tarayıcıda tutulur.

Paylaşım **canlı çevrimiçi yarış değildir**. İlerleme, süre ve sonuçlar cihazlar arasında eşitlenmez. Bu sürümde sunucu bulunmaz. Gizli mod veya tarayıcı verilerinin silinmesi yerel kayıtları kaldırabilir.

## Çalıştırma

Node.js **24 LTS** önerilir (testler için en az 22.13).

```sh
npm ci
npm run dev
```

Yerel önizleme: http://127.0.0.1:5173. Windows PowerShell `npm.ps1` çalıştırılmasını engellerse `npm.cmd` kullanın.

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

Üretim önizlemesi: http://127.0.0.1:4173. Statik çıktı: `dist/client`. Geliştirme ortamında service worker kaydedilmez. PWA testi için üretim önizlemesi veya HTTPS kullanın. Yeni sürüm önbelleği, eski sekmeler kapandıktan sonra devreye girer; oyun sırasında zorla yenileme yapılmaz.

## Vercel

1. Vercel → Add New → Project → `mstf-svndk/sudoku` deposunu içe aktarın.
2. Root Directory: depo kökü. Node.js: 24.x. Framework Preset: **Other**.
3. `vercel.json` ayarları: `npm ci`, `npm run build`, çıktı `dist/client`.
4. Ortam değişkeni gerekmez. Deploy seçin.

Yayınlandıktan sonra ana sayfa, paylaşımlı bağlantı, mobil dokunma, ana ekrana ekleme ve çevrimdışı açılış gerçek cihazlarda denenmelidir. Web sürümü mobil uyumludur; ayrıca paketlenmiş iOS/Android mağaza uygulaması içermez.

## Bulmaca üretimi ve test kapsamı

Tohumlu üretici, geçerli bir çözüm tahtasından sayıları çıkarır. MRV geri izleme çözücüsü her çıkarma için tek çözümü doğrular. Arama bütçesi aşılırsa sayı korunur; doğrulanmamış bulmaca kabul edilmez. İlk adım ve Kolay seviyeleri tek aday elemesiyle çözülebilir. Daha üst seviyeler daha az başlangıç sayısı hedefler; tek çözüm sınırı nedeniyle özellikle 4×4'te komşu seviyelerin verilen sayı sayıları eşit olabilir. Uzman seviyesi belirli ileri Sudoku tekniklerini zorunlu kılan bir insan zorluk derecelendirmesi değildir.

Testler tüm boyut/seviye kombinasyonları ve farklı tohumlarda satır/sütun/kutu kurallarını, tek çözümü, günlük tarih sınırını, kayıt doğrulamasını, değiştirilemeyen sayıları, notları, geri almayı, yarışmacı bağımsızlığını ve yıldız tekrarını kapsar.

6 Eylül 2026 görünüm düzeltmesinde gerçek tarayıcıyla masaüstü ve telefon ölçülerinde 4×4, 6×6, 9×9, 12×12 tahtalar; günlük ve sınıf/odak görünümü; iki kişilik yarışın hazır, oynanıyor ve duraklatılmış durumları kontrol edildi. Tahta ve hücre boyutları ile sayı düğmelerinin tahta dışında kaldığı ölçüldü. Sayı girişi, geri alma, oyuncu bağımsızlığı ve mobil yardım/paylaşım pencereleri denendi. Bu kontroller fiziksel iOS/Android cihaz testinin veya tüm tarayıcılarda kapsamlı uçtan uca testin yerine geçmez.

Uygun tarayıcılarda isteğe bağlı `document.modelContext` üzerinden görünür oyun durumunu okuyan ve oyunu duraklatan iki WebMCP aracı kaydolur. Standart desteği olmayan tarayıcılarda normal oyun çalışır; WebMCP araçları destekleyen canlı bir bağlamda henüz doğrulanmadı.
