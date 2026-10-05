'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Grid2X2, Sparkles, WholeWord } from 'lucide-react';

export default function Home() {
  useEffect(() => {
    // Preserve links shared before the workshop gained a game selection screen.
    if (new URLSearchParams(window.location.search).has('p'))
      window.location.replace(`/sudoku${window.location.search}`);
  }, []);

  return (
    <div className="app-shell workshop-home">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Zihin Atölyesi ana sayfa">
          <span className="brand-icon"><Grid2X2 /></span>
          <span>zihin<span className="brand-light"> atölyesi</span><small>KÜÇÜK ADIMLAR, BÜYÜK KEŞİFLER</small></span>
        </Link>
      </header>
      <main className="home-main">
        <div className="home-intro">
          <span className="home-kicker"><Sparkles size={16} /> HER YAŞTA BİR KEŞİF</span>
          <h1>Bugün ne oynayalım<span>?</span></h1>
          <p>Bir oyun seç, kendi hızında düşün ve keyifle keşfet.</p>
        </div>
        <div className="workshop-cards">
          <Link className="workshop-game-card sudoku-choice" href="/sudoku">
            <span className="choice-art sudoku-art" aria-hidden="true"><span>1</span><span>2</span><span>3</span><span>4</span></span>
            <span className="choice-copy"><span className="choice-tag">ANA OYUN</span><strong>Sudoku</strong><span>Tek başına, birlikte veya sınıfta. Farklı boyutlar ve günlük bulmacalar seni bekliyor.</span></span>
            <span className="choice-go">Oynamaya başla <ArrowRight size={18} /></span>
          </Link>
          <Link className="workshop-game-card sos-choice" href="/sos">
            <span className="choice-art sos-art" aria-hidden="true"><span>S</span><span>O</span><span>S</span></span>
            <span className="choice-copy"><span className="choice-tag">STRATEJİ OYUNU</span><strong>SOS</strong><span>Yan yana veya yapay zekâya karşı oyna. Harfleri yerleştir, SOS yap ve seriyi kazan.</span></span>
            <span className="choice-go">Oynamaya başla <ArrowRight size={18} /></span>
          </Link>
          <Link className="workshop-game-card word-choice" href="/kelime-avi">
            <span className="choice-art word-art" aria-hidden="true"><WholeWord size={60} strokeWidth={1.6} /></span>
            <span className="choice-copy"><span className="choice-tag">KELİME OYUNU</span><strong>Kelime Avı</strong><span>İpucunu oku, harfleri keşfet. Tek başına veya aynı cihazda arkadaşınla oyna.</span></span>
            <span className="choice-go">Oynamaya başla <ArrowRight size={18} /></span>
          </Link>
        </div>
        <p className="home-footnote">Ücretsiz · Reklamsız · Hesapsız · Aynı cihazda oynanır</p>
      </main>
    </div>
  );
}
