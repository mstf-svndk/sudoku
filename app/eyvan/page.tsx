'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AppBackLink } from '@/components/app-back-link';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, Bot, Castle, Grid2X2, Hammer, Layers, Maximize, Minimize, RotateCcw, Undo2, UsersRound, Zap } from 'lucide-react';
import {
  CANNON_CELLS, GOAL_CELLS, KNIGHT_CELLS, SIDE, START_CELLS, applyMove,
  chooseAiMove, colOf, crossesWall, distance, isBlocked, knightTargets, newRound, pawnMoves,
  rowOf, segmentsOf, wallAt,
  type Difficulty, type MatchMode, type Move, type Round, type Segment, type Wall,
} from '@/lib/eyvan/game';

const difficulties: Record<Difficulty, string> = {
  easy: 'Kolay', medium: 'Orta', hard: 'Zor',
};

const CELL = 100 / SIDE;

/** Tahta üzerindeki kare/sur konumları yüzdeyle hesaplanır (tahta kare). */
function cellStyle(index: number) {
  return { left: `${colOf(index) * CELL}%`, top: `${rowOf(index) * CELL}%`, width: `${CELL}%`, height: `${CELL}%` };
}

/**
 * Sur/sur yuvası konumu. `inset` verilirse çubuğun iki ucu içeri çekilir —
 * yuvalar köşelerde üst üste binmesin diye (yanlış yöne sur konmasını önler).
 */
function segmentStyle(segment: Segment, thickness = 12, inset = 0) {
  const thick = thickness;
  if (segment.orient === 'v') {
    const row = Math.floor(segment.index / (SIDE - 1));
    const col = segment.index % (SIDE - 1);
    return {
      left: `${(col + 1) * CELL}%`,
      top: `calc(${row * CELL}% + ${inset}px)`,
      width: `${thick}px`,
      height: `calc(${CELL}% - ${inset * 2}px)`,
      marginLeft: `${-thick / 2}px`,
    };
  }
  const row = Math.floor(segment.index / SIDE);
  const col = segment.index % SIDE;
  return {
    left: `calc(${col * CELL}% + ${inset}px)`,
    top: `${(row + 1) * CELL}%`,
    width: `calc(${CELL}% - ${inset * 2}px)`,
    height: `${thick}px`,
    marginTop: `${-thick / 2}px`,
  };
}

/**
 * Dokunulan birimden başlayan suru kurar. Uzun sur her zaman dokunulan
 * birimi kapsar ve tahtanın içine doğru (aşağı/sağa) uzar; kenarda ters yöne
 * döner. Böylece aynı yere dokunmak her zaman aynı suru koyar.
 */
function wallForSegment(segment: Segment, size: 1 | 2): Wall | null {
  const vertical = segment.orient === 'v';
  const wide = vertical ? SIDE - 1 : SIDE;
  const row = Math.floor(segment.index / wide);
  const col = segment.index % wide;
  const anchor = { orient: segment.orient, row, col };
  return wallAt(anchor, size, 'start') ?? wallAt(anchor, size, 'end');
}

export default function EyvanPage() {
  const [mode, setMode] = useState<MatchMode>('local');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [threeD, setThreeD] = useState(true);
  const [wallSize, setWallSize] = useState<1 | 2>(2);
  const [round, setRound] = useState<Round | null>(null);
  const [history, setHistory] = useState<Round[]>([]);
  const [notice, setNotice] = useState('');
  const [focus, setFocus] = useState(false);
  const [preview, setPreview] = useState<Wall | null>(null);
  const roundRef = useRef<Round | null>(null);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  const aiTurn = !!round && mode === 'ai' && round.turn === 1 && !round.finished;
  const humanTurn = !!round && !aiTurn && !round.finished;

  const targets = useMemo(() => {
    if (!round || !humanTurn || round.phase === 'cannon') return new Set<number>();
    if (round.phase === 'knight') return new Set(knightTargets(round, round.turn));
    return new Set(pawnMoves(round, round.turn));
  }, [round, humanTurn]);

  useEffect(() => {
    if (!round || round.finished || mode !== 'ai' || round.turn !== 1) return;
    const timer = window.setTimeout(() => {
      const current = roundRef.current;
      if (!current || current.finished || current.turn !== 1) return;
      const move = chooseAiMove(current, difficulty);
      const next = move ? applyMove(current, move) : current;
      if (next === current) return;
      setHistory((stack) => [...stack, current]);
      setRound(next);
    }, 460);
    return () => window.clearTimeout(timer);
  }, [round, mode, difficulty]);

  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setFocus(false);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  function start() {
    setRound(newRound(0));
    setHistory([]);
    setNotice('');
    setPreview(null);
    setWallSize(2);
  }

  function commit(next: Round, fallback: string) {
    if (!round || next === round) {
      setNotice(fallback);
      return;
    }
    setHistory((stack) => [...stack, round]);
    setRound(next);
    setNotice('');
  }

  function playMove(move: Move, fallback: string) {
    if (!round || !humanTurn) return;
    commit(applyMove(round, move), fallback);
  }

  function touchCell(index: number) {
    if (!round || !humanTurn) return;
    if (round.phase === 'cannon') {
      setNotice('Top hakkı: bir sur seç ya da rakibin elinden sur al.');
      return;
    }
    if (round.phase === 'knight') {
      playMove({ type: 'knight', to: index }, 'At hakkı iki adım: parlayan karelerden birini seç.');
      return;
    }
    if (index === round.pawns[round.turn]) return;
    if (targets.has(index)) {
      playMove({ type: 'move', to: index }, '');
      return;
    }
    const rowGap = Math.abs(rowOf(index) - rowOf(round.pawns[round.turn]));
    const colGap = Math.abs(colOf(index) - colOf(round.pawns[round.turn]));
    if (rowGap && colGap) setNotice('Kale çapraz gitmez — bir kare yatay ya da dikey.');
    else if (rowGap + colGap > 1) setNotice('İki kare ileri gitmek için önünde rakip kale olmalı; arkası da boş olmalı.');
    else setNotice('Orada sur var, o kare kapalı.');
  }

  function previewWall(segment: Segment | null) {
    if (!segment || !round || !humanTurn || round.phase !== 'move') {
      setPreview(null);
      return;
    }
    const wall = wallForSegment(segment, wallSize);
    const legal = wall && !segmentsOf(wall).some((piece) => isBlocked(round, piece)) && !crossesWall(round, wall);
    setPreview(legal ? wall : null);
  }

  function touchSegment(segment: Segment) {
    if (!round || !humanTurn) return;
    if (round.phase === 'cannon') {
      playMove({ type: 'cannon', target: 'board', segment }, 'Burada sur yok.');
      return;
    }
    if (round.phase !== 'move') {
      setNotice('Önce at/top hakkını kullan.');
      return;
    }
    const wall = wallForSegment(segment, wallSize);
    if (!wall) {
      setNotice('Sur tahtanın dışına taşıyor.');
      return;
    }
    if (segmentsOf(wall).some((piece) => isBlocked(round, piece))) {
      setNotice('Burada zaten sur var.');
      return;
    }
    if (crossesWall(round, wall)) {
      setNotice('Surlar artı oluşturacak şekilde üst üste konmaz.');
      return;
    }
    playMove({ type: 'wall', wall }, 'Sur buraya konmuyor — hedefe giden yol kapanıyor.');
    setPreview(null);
  }

  function undo() {
    if (!history.length) return;
    const stack = [...history];
    let previous = stack.pop()!;
    if (mode === 'ai') {
      let guard = 0;
      while (stack.length && (previous.turn !== 0 || previous.phase !== 'move') && guard < 40) {
        previous = stack.pop()!;
        guard += 1;
      }
    }
    setHistory(stack);
    setRound(previous);
    setNotice('');
    setPreview(null);
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

  const name = (player: 0 | 1) => (player === 0 ? '1. oyuncu' : mode === 'ai' ? 'Yapay zekâ' : '2. oyuncu');

  const status = !round
    ? ''
    : round.finished
      ? `${name(round.winner ?? 0)} kazandı!`
      : round.phase === 'knight'
        ? `${name(round.turn)} at karesinde — iki adım hakkı var`
        : round.phase === 'cannon'
          ? `${name(round.turn)} top karesinde — bir suru dışarı atacak`
          : aiTurn
            ? 'Yapay zekâ düşünüyor…'
            : `Sıra: ${name(round.turn)}`;

  const wallsLeft = round ? { big: round.big[round.turn], small: round.small[round.turn] } : null;

  return (
    <div className={`app-shell eyvan-page ${focus ? 'eyvan-focus' : ''}`}>
      {focus && <AppBackLink />}
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Zihin Atölyesi ana sayfa">
          <span className="brand-icon"><Grid2X2 /></span>
          <span>zihin<span className="brand-light"> atölyesi</span><small>KÜÇÜK ADIMLAR, BÜYÜK KEŞİFLER</small></span>
        </Link>
        <Link href="/" className="quiet-button"><ArrowLeft size={18} /><span>Oyunlar</span></Link>
      </header>

      <main className="eyvan-main">
        <div className="eyvan-heading">
          <span className="home-kicker">KALE YARIŞI</span>
          <h1>Eyvan<span>.</span></h1>
          <p>Kaleni karşı köşedeki iki kaleden birine ulaştır. Surlarınla yolunu kapat, at ve top kareleriyle avantaj kazan.</p>
        </div>

        {!round ? (
          <section className="eyvan-setup" aria-labelledby="eyvan-setup-title">
            <h2 id="eyvan-setup-title">Nasıl oynayalım?</h2>
            <div className="sos-field"><span>Rakip</span><div className="sos-options">
              <button className={mode === 'local' ? 'selected' : ''} onClick={() => setMode('local')} aria-pressed={mode === 'local'}><UsersRound size={20} /> Aynı cihazda iki kişi</button>
              <button className={mode === 'ai' ? 'selected' : ''} onClick={() => setMode('ai')} aria-pressed={mode === 'ai'}><Bot size={20} /> Yapay zekâ</button>
            </div></div>
            {mode === 'ai' && <div className="sos-field"><span>Yapay zekâ seviyesi</span><div className="sos-options">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((value) => <button key={value} className={difficulty === value ? 'selected' : ''} onClick={() => setDifficulty(value)} aria-pressed={difficulty === value}>{difficulties[value]}</button>)}
            </div></div>}
            <div className="sos-field"><span>Görünüm</span><div className="sos-options">
              <button className={threeD ? 'selected' : ''} onClick={() => setThreeD(true)} aria-pressed={threeD}>3 boyutlu</button>
              <button className={!threeD ? 'selected' : ''} onClick={() => setThreeD(false)} aria-pressed={!threeD}>Düz</button>
            </div></div>
            <button className="primary-button eyvan-start" onClick={start}>Oyuna başla <ArrowRight size={18} /></button>
            <p className="sos-rule">Kalen ortadaki oktan başlar, hedefin rakibin tarafındaki iki köşe kale. Her turda ya bir kare ilerle ya da bir sur koy — ikisini birden yapamazsın.</p>
          </section>
        ) : (
          <div className="eyvan-layout">
            <section className="eyvan-panel" aria-label="Eyvan oyun tahtası">
              <div className="eyvan-players">
                {([0, 1] as const).map((player) => (
                  <div key={player} className={`eyvan-player player-${player} ${round.turn === player && !round.finished ? 'active' : ''}`}>
                    <span className="eyvan-player-name"><i className={`sos-dot dot-${player}`} />{name(player)}</span>
                    <strong>{distance(round, player)}<small> adım</small></strong>
                    <em>{round.big[player]} uzun · {round.small[player]} kısa sur</em>
                  </div>
                ))}
              </div>

              <output className={`eyvan-status turn-${round.turn}`} aria-live="polite">
                <strong>{status}</strong>
                <span>{round.phase === 'move' ? 'Kale ya da sur' : round.phase === 'knight' ? 'At hakkı' : 'Top hakkı'}</span>
              </output>

              <div className={`eyvan-stage ${threeD ? 'is-3d' : 'is-flat'}`}>
                <div className="eyvan-frame">
                  <div className="eyvan-board">
                    {Array.from({ length: SIDE * SIDE }, (_, index) => {
                      const isGoal = GOAL_CELLS[0].includes(index) || GOAL_CELLS[1].includes(index);
                      const goalOf = GOAL_CELLS[0].includes(index) ? 0 : 1;
                      const knight = KNIGHT_CELLS.includes(index);
                      const cannon = CANNON_CELLS.includes(index);
                      const used = round.used[0].includes(index) && round.used[1].includes(index);
                      return (
                        <button
                          key={index}
                          type="button"
                          style={cellStyle(index)}
                          className={[
                            'eyvan-cell',
                            isGoal ? `goal goal-${goalOf}` : '',
                            knight ? 'knight' : '',
                            cannon ? 'cannon' : '',
                            START_CELLS.includes(index) ? 'start' : '',
                            targets.has(index) ? 'valid' : '',
                            round.lastMove && 'to' in round.lastMove && round.lastMove.to === index ? 'last' : '',
                            used ? 'used' : '',
                          ].filter(Boolean).join(' ')}
                          disabled={!humanTurn}
                          aria-label={`${rowOf(index) + 1}. satır ${colOf(index) + 1}. sütun`}
                          onClick={() => touchCell(index)}
                        >
                          {isGoal && <Castle size={15} aria-hidden="true" />}
                          {knight && <Zap size={15} aria-hidden="true" />}
                          {cannon && <Hammer size={15} aria-hidden="true" />}
                        </button>
                      );
                    })}

                    {round.v.map((set, index) => (set ? <div key={`wv${index}`} className="eyvan-wall v" style={segmentStyle({ orient: 'v', index })} /> : null))}
                    {round.h.map((set, index) => (set ? <div key={`wh${index}`} className="eyvan-wall h" style={segmentStyle({ orient: 'h', index })} /> : null))}

                    {preview && segmentsOf(preview).map((piece) => (
                      <div
                        key={`pv${piece.orient}${piece.index}`}
                        className={`eyvan-wall ghost ${piece.orient}`}
                        style={segmentStyle(piece)}
                        aria-hidden="true"
                      />
                    ))}

                    {humanTurn && round.phase === 'move' && (
                      <>
                        {round.v.map((set, index) => (!set ? (
                          <button key={`sv${index}`} type="button" className="eyvan-slot v" style={segmentStyle({ orient: 'v', index }, 14, 9)} aria-label="Dikey sur yeri" onMouseEnter={() => previewWall({ orient: 'v', index })} onFocus={() => previewWall({ orient: 'v', index })} onMouseLeave={() => setPreview(null)} onBlur={() => setPreview(null)} onClick={() => touchSegment({ orient: 'v', index })} />
                        ) : null))}
                        {round.h.map((set, index) => (!set ? (
                          <button key={`sh${index}`} type="button" className="eyvan-slot h" style={segmentStyle({ orient: 'h', index }, 14, 9)} aria-label="Yatay sur yeri" onMouseEnter={() => previewWall({ orient: 'h', index })} onFocus={() => previewWall({ orient: 'h', index })} onMouseLeave={() => setPreview(null)} onBlur={() => setPreview(null)} onClick={() => touchSegment({ orient: 'h', index })} />
                        ) : null))}
                      </>
                    )}

                    {humanTurn && round.phase === 'cannon' && (
                      <>
                        {round.v.map((set, index) => (set ? (
                          <button key={`cv${index}`} type="button" className="eyvan-slot cannon v" style={segmentStyle({ orient: 'v', index }, 14, 9)} aria-label="Suru kaldır" onClick={() => touchSegment({ orient: 'v', index })} />
                        ) : null))}
                        {round.h.map((set, index) => (set ? (
                          <button key={`ch${index}`} type="button" className="eyvan-slot cannon h" style={segmentStyle({ orient: 'h', index }, 14, 9)} aria-label="Suru kaldır" onClick={() => touchSegment({ orient: 'h', index })} />
                        ) : null))}
                      </>
                    )}

                    {([0, 1] as const).map((player) => (
                      <span
                        key={player}
                        className={`eyvan-pawn pawn-${player} ${round.turn === player && !round.finished ? 'active' : ''}`}
                        style={{
                          left: `${colOf(round.pawns[player]) * CELL + CELL / 2}%`,
                          top: `${rowOf(round.pawns[player]) * CELL + CELL / 2}%`,
                        }}
                        aria-hidden="true"
                      ><i /></span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="eyvan-controls">
                <div className="eyvan-wall-picker" aria-label="Sur boyu">
                  <button className={wallSize === 2 ? 'selected' : ''} onClick={() => { setWallSize(2); setPreview(null); }} aria-pressed={wallSize === 2} disabled={!humanTurn || (wallsLeft ? wallsLeft.big <= 0 : true)}>
                    Uzun sur <small>{round.big[round.turn]}</small>
                  </button>
                  <button className={wallSize === 1 ? 'selected' : ''} onClick={() => { setWallSize(1); setPreview(null); }} aria-pressed={wallSize === 1} disabled={!humanTurn || (wallsLeft ? wallsLeft.small <= 0 : true)}>
                    Kısa sur <small>{round.small[round.turn]}</small>
                  </button>
                </div>
                <div className="eyvan-tools">
                  <button className="quiet-button" onClick={undo} disabled={!history.length}><Undo2 size={17} /><span>Geri al</span></button>
                  <button className="quiet-button" onClick={() => setThreeD((value) => !value)} aria-pressed={!threeD} aria-label={threeD ? 'Düz görünüme geç' : '3 boyutlu görünüme geç'}><Layers size={17} /><span>{threeD ? 'Düz görünüm' : '3B görünüm'}</span></button>
                  <button className="quiet-button" onClick={toggleFocus} aria-label={focus ? 'Odak görünümünden çık' : 'Tahtayı büyüt'}>{focus ? <Minimize size={19} /> : <Maximize size={19} />}<span>{focus ? 'Küçült' : 'Büyüt'}</span></button>
                </div>
              </div>

              {round.phase === 'cannon' && humanTurn && (
                <div className="eyvan-cannon">
                  <p>Top hakkı: tahtadaki bir sura dokun ya da rakibin elinden sur al.</p>
                  <button className="quiet-button" onClick={() => playMove({ type: 'cannon', target: 'hand', take: 'big' }, 'Rakibin uzun suru kalmadı.')} disabled={round.big[round.turn === 0 ? 1 : 0] <= 0}>Rakibin uzun surunu al</button>
                  <button className="quiet-button" onClick={() => playMove({ type: 'cannon', target: 'hand', take: 'small' }, 'Rakibin kısa suru kalmadı.')} disabled={round.small[round.turn === 0 ? 1 : 0] <= 0}>Rakibin kısa surunu al</button>
                  <button className="text-button" onClick={() => playMove({ type: 'skip' }, '')}>Hakkı kullanma</button>
                </div>
              )}
              {round.phase === 'knight' && humanTurn && (
                <div className="eyvan-cannon">
                  <p>At hakkı: iki adımda ulaşabileceğin parlayan karelerden birini seç.</p>
                  <button className="text-button" onClick={() => playMove({ type: 'skip' }, '')}>Hakkı kullanma</button>
                </div>
              )}

              <p className="eyvan-notice">{notice || (round.phase === 'move' && humanTurn ? 'Kale için bir kareye, sur için iki kare arasındaki çizgiye dokun. Uzun sur dokunduğun noktayı ortalar.' : ' ')}</p>
            </section>

            <aside className="eyvan-side">
              <h2>Nasıl oynanır?</h2>
              <ul>
                <li>Kalen ortadaki oktan başlar; rakibin tarafındaki <b>iki köşe kaleden birine</b> ulaşan kazanır.</li>
                <li>Her tur tek hamle: bir kare ilerle <i>veya</i> bir sur koy.</li>
                <li>Çapraz yok, surdan atlanmaz. Rakibin kalesi önündeyse <b>üzerinden atlayıp</b> arkasındaki boş kareye konarsın.</li>
                <li>Uzun sur iki birim, kısa sur bir birim kapatır. Konan sur kalkmaz; surlar artı oluşturacak şekilde üst üste konmaz.</li>
                <li>Surlar tahtayı ikiye bölemez: herkesin hedefine giden yolu açık kalmalı.</li>
                <li><Zap size={14} /> at karesi: iki adım · <Hammer size={14} /> top karesi: bir suru dışarı at. Her biri bir kez.</li>
              </ul>
              <p className="eyvan-side-note">{mode === 'ai' ? `Yapay zekâ · ${difficulties[difficulty]}` : 'Aynı cihazda iki kişi'} · 9×9 tahta · 9 uzun + 3 kısa sur</p>
              <button className="text-button" onClick={() => setRound(null)}>Oyun ayarlarına dön</button>
            </aside>
          </div>
        )}

        <Dialog open={!!round?.finished} onOpenChange={() => undefined}>
          <DialogContent className="workshop-dialog game-result-dialog" showCloseButton={false}>
            <DialogTitle>{round?.winner !== null && round?.winner !== undefined ? `${name(round.winner)} kazandı!` : 'Oyun bitti'}</DialogTitle>
            <DialogDescription>Hedef kaleye ulaşan oyuncu oyunu kazanır · {round ? `${distance(round, 0)} / ${distance(round, 1)} adım kaldı` : ''}</DialogDescription>
            <button className="primary-button" onClick={() => { setRound(newRound(0)); setHistory([]); setNotice(''); }}><RotateCcw size={17} /> Yeniden oyna</button>
            <button className="quiet-button" onClick={() => setRound(null)}>Oyun ayarlarına dön</button>
            <Link href="/" className="text-button">Diğer oyunlara geç</Link>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
