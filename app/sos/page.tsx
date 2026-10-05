'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Bot, Grid2X2, Maximize, Minimize, RotateCcw, UsersRound } from 'lucide-react';
import {
  SIDE, chooseAiMove, newMatch, nextRound, play,
  type Difficulty, type Mark, type Match, type MatchMode, type Target,
} from '@/lib/sos/game';

const difficulties: Record<Difficulty, string> = {
  easy: 'Kolay', medium: 'Orta', hard: 'Zor',
};

export default function SosPage() {
  const [mode, setMode] = useState<MatchMode>('local');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [target, setTarget] = useState<Target>(3);
  const [match, setMatch] = useState<Match | null>(null);
  const [mark, setMark] = useState<Mark>('S');
  const [focus, setFocus] = useState(false);
  const round = match?.round;
  const aiTurn = !!match && match.mode === 'ai' && round?.turn === 1 && !round.finished;

  useEffect(() => {
    const syncFullscreen = () => {
      if (!document.fullscreenElement) setFocus(false);
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (!match || !aiTurn) return;
    const timer = window.setTimeout(() => {
      setMatch((current) => {
        if (!current || current.mode !== 'ai' || current.round.turn !== 1 || current.round.finished) return current;
        const move = chooseAiMove(current.round, current.difficulty);
        return move ? play(current, move) : current;
      });
    }, 420);
    return () => window.clearTimeout(timer);
  }, [match, aiTurn]);

  function start() {
    setMatch(newMatch(mode, difficulty, target));
    setMark('S');
  }
  function put(index: number) {
    setMatch((current) =>
      current && !(current.mode === 'ai' && current.round.turn === 1)
        ? play(current, { index, mark }) : current,
    );
  }
  async function toggleFocus() {
    if (focus) {
      setFocus(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    } else {
      setFocus(true);
      await document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  }

  const playerName = (player: 0 | 1) =>
    player === 0 ? '1. oyuncu' : match?.mode === 'ai' ? 'Yapay zekâ' : '2. oyuncu';
  const scored = new Set(round?.lastMove?.lines.flat() || []);

  return (
    <div className={`app-shell sos-page ${focus ? 'sos-focus' : ''}`}>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Zihin Atölyesi ana sayfa">
          <span className="brand-icon"><Grid2X2 /></span>
          <span>zihin<span className="brand-light"> atölyesi</span><small>KÜÇÜK ADIMLAR, BÜYÜK KEŞİFLER</small></span>
        </Link>
        <Link href="/" className="quiet-button"><ArrowLeft size={18} /><span>Oyunlar</span></Link>
      </header>
      <main className="sos-main">
        <div className="sos-heading">
          <span className="home-kicker">STRATEJİ OYUNU</span>
          <h1>SOS<span>.</span></h1>
          <p>Bir kare seç, S veya O yerleştir. Yatay, dikey ya da çapraz her SOS bir puan kazandırır.</p>
        </div>
        {!match ? (
          <section className="sos-setup" aria-labelledby="sos-setup-title">
            <h2 id="sos-setup-title">Nasıl oynayalım?</h2>
            <div className="sos-field"><span>Rakip</span><div className="sos-options">
              <button className={mode === 'local' ? 'selected' : ''} onClick={() => setMode('local')} aria-pressed={mode === 'local'}><UsersRound size={20} /> Aynı cihazda iki kişi</button>
              <button className={mode === 'ai' ? 'selected' : ''} onClick={() => setMode('ai')} aria-pressed={mode === 'ai'}><Bot size={20} /> Yapay zekâ</button>
            </div></div>
            {mode === 'ai' && <div className="sos-field"><span>Yapay zekâ seviyesi</span><div className="sos-options">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((value) => <button key={value} className={difficulty === value ? 'selected' : ''} onClick={() => setDifficulty(value)} aria-pressed={difficulty === value}>{difficulties[value]}</button>)}
            </div></div>}
            <div className="sos-field"><span>Seriyi kazanan</span><div className="sos-options">
              {([3, 5, 10] as Target[]).map((value) => <button key={value} className={target === value ? 'selected' : ''} onClick={() => setTarget(value)} aria-pressed={target === value}>{value} galibiyet</button>)}
            </div></div>
            <button className="primary-button sos-start" onClick={start}>Maçı başlat <ArrowRight size={18} /></button>
            <p className="sos-rule">SOS yapan puan alır ve bir kez daha oynar. Tahta dolunca puanı yüksek olan raundu kazanır. Eşitlikte raund tekrarlanır.</p>
          </section>
        ) : (
          <div className="sos-play-layout">
            <section className="sos-game-panel" aria-label="SOS oyun tahtası">
              <div className="sos-scoreline">
                <div className={round?.turn === 0 && !round.finished ? 'active' : ''}><span>1. oyuncu</span><strong>{match.wins[0]}<small> / {match.target} galibiyet</small></strong><em>{round?.scores[0]} puan</em></div>
                <span className="sos-versus">—</span>
                <div className={round?.turn === 1 && !round.finished ? 'active' : ''}><span>{playerName(1)}</span><strong>{match.wins[1]}<small> / {match.target} galibiyet</small></strong><em>{round?.scores[1]} puan</em></div>
              </div>
              <output className="sos-status" aria-live="polite">
                {round?.finished
                  ? round.winner === null ? 'Berabere! Bu raund için galibiyet yazılmadı.' : `${playerName(round.winner)} raundu kazandı!`
                  : aiTurn ? 'Yapay zekâ düşünüyor…' : `${playerName(round!.turn)} oynuyor`}
                <span>{match.roundNumber}. raund</span>
              </output>
              <div className="sos-board" style={{ gridTemplateColumns: `repeat(${SIDE}, 1fr)` }}>
                {round?.board.map((cell, index) => (
                  <button key={index} type="button"
                    className={`${index === round.lastMove?.index ? 'last' : ''} ${scored.has(index) ? 'scored' : ''}`}
                    aria-label={`${Math.floor(index / SIDE) + 1}. satır ${index % SIDE + 1}. sütun${cell ? `, ${cell}` : ', boş'}${index === round.lastMove?.index ? ', son hamle' : ''}`}
                    disabled={!!cell || round.finished || aiTurn}
                    onClick={() => put(index)}>{cell}</button>
                ))}
              </div>
              <div className="sos-controls">
                <div className="sos-mark-picker" aria-label="Yerleştirilecek harf">
                  {(['S', 'O'] as Mark[]).map((value) => <button key={value} className={mark === value ? 'selected' : ''} aria-pressed={mark === value} onClick={() => setMark(value)} disabled={round?.finished}>{value}</button>)}
                </div>
                <button className="quiet-button" onClick={toggleFocus} aria-label={focus ? 'Odak görünümünden çık' : 'Tahtayı büyüt'}>{focus ? <Minimize size={19} /> : <Maximize size={19} />}<span>{focus ? 'Küçült' : 'Büyüt'}</span></button>
              </div>
              <p className="sos-last">{round?.lastMove ? `Son hamle: ${playerName(round.lastMove.player)} ${round.lastMove.mark} koydu${round.lastMove.points ? `, ${round.lastMove.points} SOS yaptı` : ''}.` : 'Başlamak için bir harf seç ve boş bir kareye dokun.'}</p>
              {round?.finished && <section className="sos-result" aria-live="polite">
                <strong>{match.champion !== null ? `${playerName(match.champion)} seriyi kazandı!` : round.winner === null ? 'Raund berabere' : `${playerName(round.winner)} kazandı`}</strong>
                <span>Raund puanı {round.scores[0]} – {round.scores[1]} · Seri {match.wins[0]} – {match.wins[1]}</span>
                {match.champion === null && <button className="primary-button" onClick={() => setMatch((current) => current ? nextRound(current) : current)}>Sonraki raund <ArrowRight size={18} /></button>}
                <button className="quiet-button" onClick={() => setMatch(newMatch(match.mode, match.difficulty, match.target))}><RotateCcw size={17} /> Yeniden maç</button>
              </section>}
            </section>
            <aside className="sos-side">
              <h2>Oyun bilgisi</h2>
              <p>{match.mode === 'ai' ? `Yapay zekâ · ${difficulties[match.difficulty]}` : 'Aynı cihazda iki kişi'} · {match.target} galibiyetlik seri</p>
              <ul><li>SOS yatay, dikey ve çapraz kurulabilir.</li><li>Bir hamlede birden fazla SOS yapabilirsin.</li><li>SOS yapan oyuncu yeniden oynar.</li><li>Tur bitince daha çok puan alan kazanır.</li></ul>
              <button className="text-button" onClick={() => setMatch(null)}>Maç ayarlarına dön</button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
