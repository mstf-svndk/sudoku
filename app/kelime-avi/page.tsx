'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Grid2X2, Lightbulb, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  LETTERS, WORDS, cleanWord, pickWord, validCustomWord,
  type Category, type WordEntry,
} from '@/lib/word-hunt';

type WordMode = 'solo' | 'together';
type Round = {
  entry: WordEntry;
  guesses: string[];
  mistakes: number;
  hintUsed: boolean;
  outcome: 'won' | 'lost' | null;
};
const categories: (Category | 'Karışık')[] = ['Karışık', 'Hayvanlar', 'Doğa', 'Günlük yaşam', 'Bilim'];

export default function WordHuntPage() {
  const [mode, setMode] = useState<WordMode>('solo');
  const [category, setCategory] = useState<Category | 'Karışık'>('Karışık');
  const [limit, setLimit] = useState(7);
  const [round, setRound] = useState<Round | null>(null);
  const [customWord, setCustomWord] = useState('');
  const [customClue, setCustomClue] = useState('');
  const [setter, setSetter] = useState<0 | 1>(0);
  const [passing, setPassing] = useState(false);
  const [previous, setPrevious] = useState<string>();
  const [message, setMessage] = useState('');

  function begin(entry: WordEntry) {
    setRound({ entry, guesses: [], mistakes: 0, hintUsed: false, outcome: null });
    setPrevious(entry.word);
    setMessage('');
  }
  function start() {
    if (mode === 'solo') {
      begin(pickWord(category, previous));
      return;
    }
    if (!validCustomWord(customWord)) {
      setMessage('Kelime 4–20 harf olmalı; yalnızca Türkçe harf ve boşluk kullan.');
      return;
    }
    if (customClue.trim().length < 3) {
      setMessage('Arkadaşın için kısa bir ipucu yaz.');
      return;
    }
    begin({ word: cleanWord(customWord), clue: customClue.trim(), category: 'Günlük yaşam' });
    setCustomWord('');
    setCustomClue('');
    setPassing(true);
  }
  function guess(letter: string) {
    if (passing) return;
    setRound((current) => {
      if (!current || current.outcome || current.guesses.includes(letter)) return current;
      const guesses = [...current.guesses, letter];
      const mistakes = current.mistakes + (current.entry.word.includes(letter) ? 0 : 1);
      const won = Array.from(current.entry.word).every((char) => char === ' ' || guesses.includes(char));
      return { ...current, guesses, mistakes, outcome: won ? 'won' : mistakes >= limit ? 'lost' : null };
    });
  }
  function hint() {
    setRound((current) => {
      if (!current || current.outcome || current.hintUsed || current.mistakes >= limit - 1) return current;
      const letter = Array.from(current.entry.word).find((char) => char !== ' ' && !current.guesses.includes(char));
      if (!letter) return current;
      const guesses = [...current.guesses, letter];
      const mistakes = current.mistakes + 1;
      const won = Array.from(current.entry.word).every((char) => char === ' ' || guesses.includes(char));
      return { ...current, guesses, mistakes, hintUsed: true, outcome: won ? 'won' : null };
    });
  }
  function next() {
    if (mode === 'solo') begin(pickWord(category, previous));
    else {
      setSetter((value) => value === 0 ? 1 : 0);
      setRound(null);
      setPassing(false);
    }
  }

  return (
    <div className="app-shell word-page">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Zihin Atölyesi ana sayfa"><span className="brand-icon"><Grid2X2 /></span><span>zihin<span className="brand-light"> atölyesi</span><small>KÜÇÜK ADIMLAR, BÜYÜK KEŞİFLER</small></span></Link>
        <Link href="/" className="quiet-button"><ArrowLeft size={18} /><span>Oyunlar</span></Link>
      </header>
      <main className="word-main">
        <div className="sos-heading"><span className="home-kicker">KELİME OYUNU</span><h1>Kelime Avı<span>.</span></h1><p>İpucunu takip et, harfleri keşfet ve kelimeyi bul.</p></div>
        {!round ? <section className="word-setup">
          <h2>Nasıl oynayalım?</h2>
          <div className="sos-field"><span>Oyun şekli</span><div className="sos-options"><button className={mode === 'solo' ? 'selected' : ''} aria-pressed={mode === 'solo'} onClick={() => setMode('solo')}>Hazır kelimeler</button><button className={mode === 'together' ? 'selected' : ''} aria-pressed={mode === 'together'} onClick={() => setMode('together')}>İki kişi</button></div></div>
          {mode === 'solo' ? <div className="sos-field"><span>Kategori</span><div className="sos-options word-categories">{categories.map((value) => <button key={value} className={category === value ? 'selected' : ''} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div><small>{WORDS.filter((entry) => category === 'Karışık' || entry.category === category).length} kelime hazır</small></div> : <div className="word-custom">
            <p><strong>{setter + 1}. oyuncu</strong> kelimeyi ve ipucunu yazsın. Başlatınca ekran gizlenecek; cihazı arkadaşına ver.</p>
            <label>Gizli kelime<input value={customWord} onChange={(event) => setCustomWord(event.target.value)} maxLength={20} autoComplete="off" spellCheck={false} placeholder="Örneğin: GÖKKUŞAĞI" /></label>
            <label>İpucu<input value={customClue} onChange={(event) => setCustomClue(event.target.value)} maxLength={100} placeholder="Kelimeyi söylemeden ipucu ver" /></label>
          </div>}
          <div className="sos-field"><span>Yanlış tahmin hakkı</span><div className="sos-options">{[6, 7, 9].map((value) => <button key={value} className={limit === value ? 'selected' : ''} aria-pressed={limit === value} onClick={() => setLimit(value)}>{value} hak</button>)}</div></div>
          {message && <p className="word-error" role="alert">{message}</p>}
          <button className="primary-button sos-start" onClick={start}>Oyunu başlat <ArrowRight size={18} /></button>
        </section> : passing ? <section className="word-pass"><span className="word-pass-icon">?</span><h2>Cihazı arkadaşına ver</h2><p>Kelime gizlendi. Hazır olduğunda tahmin ekranını aç.</p><button className="primary-button" onClick={() => setPassing(false)}>Tahmine başla <ArrowRight size={18} /></button></section> : <section className="word-game">
          <div className="word-topline"><span>{mode === 'solo' ? round.entry.category : `${setter === 0 ? 2 : 1}. oyuncu tahmin ediyor`}</span><span>{limit - round.mistakes} hak kaldı</span></div>
          <div className="word-progress" aria-label={`${round.mistakes} yanlış tahmin`}>{Array.from({ length: limit }, (_, index) => <span key={index} className={index < round.mistakes ? 'used' : ''} />)}</div>
          <div className="word-clue"><Lightbulb size={23} /><div><small>İPUCU</small><p>{round.entry.clue}</p></div></div>
          <div className="word-letters" aria-label="Bulunacak kelime">{Array.from(round.entry.word).map((letter, index) => letter === ' ' ? <span key={index} className="space" /> : <span key={index} className={round.guesses.includes(letter) ? 'revealed' : round.outcome === 'lost' ? 'missed' : ''}>{round.guesses.includes(letter) || round.outcome === 'lost' ? letter : ''}</span>)}</div>
          <div className="word-keyboard">{LETTERS.map((letter) => <button key={letter} disabled={round.guesses.includes(letter) || !!round.outcome} className={round.guesses.includes(letter) ? round.entry.word.includes(letter) ? 'correct' : 'wrong' : ''} onClick={() => guess(letter)} aria-label={`${letter} harfi`}>{letter}</button>)}</div>
          <div className="word-actions"><button className="quiet-button" onClick={hint} disabled={round.hintUsed || !!round.outcome || round.mistakes >= limit - 1}><Lightbulb size={18} /> Harf ipucu (1 hak)</button><button className="text-button" onClick={() => setRound(null)}>Ayarlar</button></div>
        </section>}
        <Dialog open={!!round?.outcome} onOpenChange={() => undefined}>
          <DialogContent className="workshop-dialog game-result-dialog" showCloseButton={false}>
            <DialogTitle>{round?.outcome === 'won' ? 'Harika, kelimeyi buldun!' : 'Bu kez olmadı. Yeni kelimede dene!'}</DialogTitle>
            <DialogDescription>Kelime: <strong>{round?.entry.word}</strong></DialogDescription>
            <button className="primary-button" onClick={next}><RotateCcw size={18} /> {mode === 'solo' ? 'Yeni kelime' : 'Rolleri değiştir'}</button>
            <Link href="/" className="text-button">Diğer oyunlara geç</Link>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
