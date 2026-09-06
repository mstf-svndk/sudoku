'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import {
  Grid2X2,
  Sparkles,
  ArrowRight,
  Lightbulb,
  UserRound,
  UsersRound,
  CalendarDays,
  Presentation,
  BookOpen,
  Pause,
  Play,
  Clock3,
  Share2,
  Maximize,
  Minimize,
  Trophy,
  Star,
  Flame,
  ChevronDown,
  Download,
  X,
  Check,
  Leaf,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { GameBoard } from '@/components/game-board';
import {
  LEVELS,
  SIZES,
  dailySeed,
  dayKey,
  formatTime,
  parseCode,
  puzzleCode,
  type Mode,
  type Size,
} from '@/lib/sudoku';
import {
  emptyStats,
  isComplete,
  newSession,
  recordWin,
  restoreSession,
  restoreStats,
  type Player,
  type Session,
} from '@/lib/game';

const sizeDescriptions: Record<Size, string> = {
  4: 'İlk keşif · 9 yaş ve yeni başlayanlar',
  6: 'Bir adım ileri · 9–11 yaş için güzel bir başlangıç',
  9: 'Klasik sudoku · 11 yaş ve üzeri',
  12: 'Büyük meydan okuma · Deneyimli oyuncular',
};
const levelDescriptions = [
  'Bol verilen sayı, tek tek keşif.',
  'Biraz daha düşün, tek olasılıkları bul.',
  'Daha az sayı, daha çok bağlantı.',
  'Az ipucuyla daha uzun bir meydan okuma.',
  'En az başlangıç sayısı için tek çözüm sınırı zorlanır.',
];
const modeInfo: Record<Mode, { label: string; kicker: string; title: string }> =
  {
    solo: {
      label: 'Tek başıma',
      kicker: 'KEŞİF ZAMANI',
      title: 'Senin küçük zihin molan',
    },
    daily: {
      label: 'Günün bulmacası',
      kicker: 'BUGÜNE ÖZEL',
      title: 'Bugünün ortak keşfi',
    },
    versus: {
      label: 'İki kişilik',
      kicker: 'DOSTÇA BİR YARIŞ',
      title: 'İki takım, aynı bulmaca',
    },
    classroom: {
      label: 'Sınıfta oyna',
      kicker: 'BİRLİKTE DÜŞÜNELİM',
      title: 'Bir sınıf dolusu fikir',
    },
  };
const modeIcons = {
  solo: UserRound,
  daily: CalendarDays,
  versus: UsersRound,
  classroom: Presentation,
};
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type Request = { mode: Mode; size: Size; level: number; seed?: number };

export default function Home() {
  const [game, setGame] = useState<Session>(() => newSession(6, 1, 13909));
  const [size, setSize] = useState<Size>(6),
    [level, setLevel] = useState(1),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [round, setRound] = useState(0);
  const [showErrors, setShowErrors] = useState(true),
    [showTimer, setShowTimer] = useState(true),
    [focus, setFocus] = useState(false),
    [settingsOpen, setSettingsOpen] = useState(false);
  const [help, setHelp] = useState(false),
    [learnAnswer, setLearnAnswer] = useState<number | null>(null),
    [share, setShare] = useState(false),
    [shareUrl, setShareUrl] = useState(''),
    [copied, setCopied] = useState(false),
    [pending, setPending] = useState<Request | null>(null),
    [celebrate, setCelebrate] = useState(false);
  const [stats, setStats] = useState(emptyStats),
    [status, setStatus] = useState(''),
    [canInstall, setCanInstall] = useState(false),
    [installHelp, setInstallHelp] = useState(false);
  const installEvent = useRef<InstallEvent | null>(null),
    recorded = useRef(''),
    gameRef = useRef(game),
    readyRef = useRef(false);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);
  const winner = game.players.findIndex((p) => isComplete(p, game.puzzle)),
    finished = winner >= 0,
    mode = game.mode;
  const blocked =
    game.paused || help || share || !!pending || installHelp || busy;
  const raceReady = mode === 'versus' && !game.started;

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let restored: Session | null = null;
      try {
        const raw = localStorage.getItem('sudoku-session-v1');
        if (raw) restored = restoreSession(raw);
        setStats(restoreStats(localStorage.getItem('sudoku-stats-v1')));
        const prefs = JSON.parse(
          localStorage.getItem('sudoku-prefs-v1') || '{}',
        );
        if (typeof prefs.errors === 'boolean') setShowErrors(prefs.errors);
        if (typeof prefs.timer === 'boolean') setShowTimer(prefs.timer);
      } catch {
        setStatus(
          'Bu tarayıcı kayıt izni vermiyor. Oyun açık olduğu sürece oynayabilirsin.',
        );
      }
      const url = new URL(window.location.href),
        code = url.searchParams.get('p'),
        parsed = code ? parseCode(code) : null;
      if (parsed && (!restored || puzzleCode(restored.puzzle) !== code)) {
        restored = newSession(parsed.size, parsed.level, parsed.seed);
        setStatus(
          'Paylaşılan bulmaca hazır. Herkes kendi cihazında çözebilir.',
        );
      } else if (code && !parsed)
        setStatus('Bulmaca bağlantısı geçersiz. Yeni bir oyun açıldı.');
      if (restored) {
        setGame(restored);
        setSize(restored.puzzle.size);
        setLevel(restored.puzzle.level);
      } else {
        const fresh = newSession(
          6,
          1,
          crypto.getRandomValues(new Uint32Array(1))[0],
        );
        setGame(fresh);
      }
      setLoaded(true);
      readyRef.current = true;
    });
    const install = (e: Event) => {
      e.preventDefault();
      installEvent.current = e as InstallEvent;
      setCanInstall(true);
    };
    const installed = () => {
      setCanInstall(false);
      installEvent.current = null;
      setStatus('Sudoku Atölyesi ana ekranına eklendi.');
    };
    window.addEventListener('beforeinstallprompt', install);
    window.addEventListener('appinstalled', installed);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator)
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() =>
          setStatus(
            'Çevrimdışı hazırlık tamamlanamadı; internet bağlantısıyla oynayabilirsin.',
          ),
        );
    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', install);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('sudoku-session-v1', JSON.stringify(game));
    } catch {
      queueMicrotask(() =>
        setStatus(
          'İlerlemen bu cihazda kaydedilemiyor. Sayfayı kapatırsan oyun sıfırlanabilir.',
        ),
      );
    }
  }, [game, loaded]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        'sudoku-prefs-v1',
        JSON.stringify({ errors: showErrors, timer: showTimer }),
      );
    } catch {
      /* Session warning already explains unavailable storage. */
    }
  }, [showErrors, showTimer, loaded]);
  useEffect(() => {
    if (!loaded || !game.started || blocked || finished) return;
    let last = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now(),
        delta = Math.floor((now - last) / 1000);
      if (delta > 0) {
        last += delta * 1000;
        setGame((g) => ({ ...g, elapsed: g.elapsed + delta }));
      }
    }, 500);
    return () => clearInterval(timer);
  }, [loaded, game.started, blocked, finished]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden)
        setGame((g) => (g.started ? { ...g, paused: true } : g));
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(() => {
    if (!loaded || !finished || recorded.current === game.id) return;
    recorded.current = game.id;
    const next = recordWin(
      stats,
      game.puzzle,
      game.players[winner].hints,
      game.elapsed,
      dayKey(),
    );
    queueMicrotask(() => {
      setStats(next);
      setCelebrate(true);
    });
    try {
      localStorage.setItem('sudoku-stats-v1', JSON.stringify(next));
    } catch {
      /* Continue playing without durable stats. */
    }
  }, [
    finished,
    loaded,
    game.id,
    game.puzzle,
    game.players,
    game.elapsed,
    winner,
    stats,
  ]);

  function start(request: Request) {
    setPending(null);
    setBusy(true);
    setCelebrate(false);
    window.setTimeout(() => {
      try {
        const seed =
          request.seed ??
          (request.mode === 'daily'
            ? dailySeed()
            : crypto.getRandomValues(new Uint32Array(1))[0]);
        const fresh = newSession(
          request.size,
          request.level,
          seed,
          request.mode,
        );
        setGame(fresh);
        setSize(request.size);
        setLevel(request.level);
        setRound((r) => r + 1);
        setSettingsOpen(false);
        recorded.current = '';
        const url = new URL(window.location.href);
        url.searchParams.delete('p');
        window.history.replaceState({}, '', url);
        setStatus(
          request.mode === 'daily'
            ? 'Bugünün bulmacası hazır. Aynı boyut ve seviyeyi seçen herkes aynı bulmacayı çözer.'
            : request.mode === 'versus'
              ? 'İki oyuncu aynı cihazı paylaşır. Başlat düğmesine birlikte karar verin.'
              : request.mode === 'classroom'
                ? 'Tahtayı yansıtabilir veya bağlantıyı öğrencilerinle paylaşabilirsin.'
                : 'Yeni bulmacan hazır. İyi keşifler!',
        );
      } catch {
        setStatus('Bulmaca oluşturulamadı. Tekrar deneyebilirsin.');
      } finally {
        setBusy(false);
      }
    }, 30);
  }
  function requestStart(request: Request) {
    if (game.started && !finished) setPending(request);
    else start(request);
  }
  function updatePlayer(index: number, player: Player) {
    setGame((g) => {
      if (g.paused || g.players.some((p) => isComplete(p, g.puzzle))) return g;
      return {
        ...g,
        started: true,
        players: g.players.map((p, i) => (i === index ? player : p)),
      };
    });
  }
  function resume() {
    setGame((g) => ({ ...g, paused: false, started: true }));
  }
  function openShare() {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('p', puzzleCode(game.puzzle));
    setShareUrl(url.toString());
    setCopied(false);
    setShare(true);
  }
  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setStatus('Otomatik kopyalanamadı. Bağlantıyı seçip kopyalayabilirsin.');
    }
  }
  async function install() {
    if (installEvent.current) {
      try {
        await installEvent.current.prompt();
        const choice = await installEvent.current.userChoice;
        if (choice.outcome === 'accepted') setCanInstall(false);
        installEvent.current = null;
      } catch {
        setInstallHelp(true);
      }
    } else setInstallHelp(true);
  }

  useEffect(() => {
    type Context = {
      registerTool: (
        tool: {
          name: string;
          description: string;
          inputSchema: object;
          annotations: object;
          execute: (input: unknown) => unknown;
        },
        options: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const tool = {
      name: 'read_sudoku_game',
      description:
        'Read the active Sudoku board, visible player entries and game settings. Does not expose the solution.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: (input: unknown) => {
        if (
          input === null ||
          typeof input !== 'object' ||
          Object.keys(input).length
        )
          throw new Error('Expected an empty object.');
        const g = gameRef.current;
        return {
          ready: readyRef.current,
          size: g.puzzle.size,
          level: LEVELS[g.puzzle.level],
          mode: g.mode,
          givens: g.puzzle.givens,
          players: g.players.map((p) => ({ values: p.values, notes: p.notes })),
          elapsed: g.elapsed,
          paused: g.paused,
        };
      },
    };
    const pauseTool = {
      name: 'pause_sudoku_game',
      description:
        'Pause the active Sudoku game and hide the board, matching the visible pause control.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: (input: unknown) => {
        if (
          input === null ||
          typeof input !== 'object' ||
          Object.keys(input).length
        )
          throw new Error('Expected an empty object.');
        if (!readyRef.current) throw new Error('Game is loading.');
        flushSync(() => setGame((g) => ({ ...g, paused: true })));
        return { paused: true };
      },
    };
    for (const t of [tool, pauseTool]) {
      try {
        void Promise.resolve(
          context.registerTool(t, { signal: controller.signal }),
        ).catch(() => {});
      } catch {
        /* Optional browser capability. */
      }
    }
    return () => controller.abort();
  }, []);

  return (
    <div className={`app-shell ${focus ? 'focus-mode' : ''}`}>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Sudoku Atölyesi ana sayfa">
          <span className="brand-icon">
            <Grid2X2 />
          </span>
          <span>
            sudoku<span className="brand-light"> atölyesi</span>
            <small>KÜÇÜK ADIMLAR, BÜYÜK KEŞİFLER</small>
          </span>
        </Link>
        <div className="header-actions">
          <button
            className="quiet-button install-button"
            onClick={install}
            aria-label="Telefona ekle"
          >
            <Download size={17} />
            <span>{canInstall ? 'Uygulamayı yükle' : 'Telefona ekle'}</span>
          </button>
          <button
            className="quiet-button"
            onClick={() => setHelp(true)}
            aria-label="Nasıl oynanır?"
          >
            <BookOpen size={18} />
            <span>Nasıl oynanır?</span>
          </button>
        </div>
      </header>
      <main className="page-wrap">
        <div className="intro">
          <div>
            <div className="eyebrow">
              <span /> HER YAŞTA BİR KEŞİF
            </div>
            <h1>
              Biraz düşün, çokça keyif al<span>.</span>
            </h1>
            <p>Kendi hızında ilerle. Her karede yeni bir şey keşfet.</p>
          </div>
          <div className="intro-mark">
            <Sparkles />
            <span>
              Bugün zihnine
              <br />
              <strong>bir oyun molası ver.</strong>
            </span>
          </div>
        </div>
        <Tabs
          value={mode}
          onValueChange={(value) => {
            if (value !== mode)
              requestStart({ mode: value as Mode, size, level });
          }}
          className="mode-tabs"
        >
          <TabsList aria-label="Oyun modu">
            {(Object.keys(modeInfo) as Mode[]).map((m) => {
              const Icon = modeIcons[m];
              return (
                <TabsTrigger disabled={!loaded || busy} key={m} value={m}>
                  <Icon />
                  {modeInfo[m].label}
                  {m === 'daily' && <span className="new-dot" />}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        <div
          className={`workspace ${mode === 'versus' ? 'race-workspace' : ''}`}
        >
          <aside
            className={`settings-panel ${settingsOpen ? 'mobile-open' : ''}`}
          >
            <div className="section-caption">SENİN OYUNUN</div>
            <h2>Nasıl oynayalım?</h2>
            <button
              className="mobile-settings-toggle"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
            >
              <span>
                <Grid2X2 size={17} />
                {size}×{size} <span className="settings-dot">·</span>{' '}
                {LEVELS[level]}
              </span>
              <span>
                Ayarlar <ChevronDown size={17} />
              </span>
            </button>
            <div className="settings-content">
              <p className="settings-label" id="size-label">
                Tahta boyutu
              </p>
              <RadioGroup
                value={size}
                onValueChange={(v) => setSize(v as Size)}
                aria-labelledby="size-label"
                className="size-options"
              >
                {SIZES.map((n) => (
                  <label
                    key={n}
                    className={`size-option ${size === n ? 'chosen' : ''}`}
                  >
                    <RadioGroupItem value={n} aria-label={`${n} çarpı ${n}`} />
                    <span>
                      {n}×{n}
                    </span>
                  </label>
                ))}
              </RadioGroup>
              <p className="helper">
                {sizeDescriptions[size]}
                <br />
                <span>Yaşlar öneridir; seviyeni kendin seç.</span>
              </p>
              <p className="settings-label" id="level-label">
                Zorluk seviyesi
              </p>
              <RadioGroup
                value={level}
                onValueChange={(v) => setLevel(v as number)}
                aria-labelledby="level-label"
                className="difficulty-options"
              >
                {LEVELS.map((d, i) => (
                  <label
                    className={`difficulty-option ${level === i ? 'chosen' : ''}`}
                    key={d}
                  >
                    <span>
                      <RadioGroupItem value={i} />
                      {d}
                      {i === 0 && <Leaf size={13} />}
                    </span>
                    <span className="difficulty-bars" aria-hidden="true">
                      {Array.from({ length: 5 }, (_, j) => (
                        <i key={j} className={j <= i ? 'filled' : ''} />
                      ))}
                    </span>
                  </label>
                ))}
              </RadioGroup>
              <p className="level-description">{levelDescriptions[level]}</p>
              <button
                className="primary-button"
                disabled={!loaded || busy}
                onClick={() => requestStart({ mode, size, level })}
              >
                {busy
                  ? 'Bulmaca hazırlanıyor…'
                  : mode === 'daily'
                    ? 'Günün bulmacasını aç'
                    : mode === 'versus'
                      ? 'Yeni yarış hazırla'
                      : 'Yeni oyun'}
                <ArrowRight size={18} />
              </button>
              {(size !== game.puzzle.size || level !== game.puzzle.level) && (
                <p className="setting-pending">
                  Seçimin yeni oyunda uygulanacak.
                </p>
              )}
              <div className="preferences">
                <label htmlFor="error-toggle">
                  Hataları göster
                  <Switch
                    id="error-toggle"
                    checked={showErrors}
                    onCheckedChange={setShowErrors}
                  />
                </label>
                <label htmlFor="timer-toggle">
                  Süreyi göster
                  <Switch
                    id="timer-toggle"
                    checked={showTimer}
                    onCheckedChange={setShowTimer}
                  />
                </label>
              </div>
              <div className="settings-note">
                <Sparkles size={18} />
                <p>
                  Burada acele etmek yok.
                  <br />
                  Düşünmek oyunun bir parçası.
                </p>
              </div>
            </div>
          </aside>
          <section className="game-card">
            <div className="game-heading">
              <div>
                <span className="game-kicker">{modeInfo[mode].kicker}</span>
                <h2>{modeInfo[mode].title}</h2>
              </div>
              <span className="level-pill">
                {LEVELS[game.puzzle.level]} · {game.puzzle.size}×
                {game.puzzle.size}
              </span>
            </div>
            <div className="game-statusbar">
              <div className="timer-group">
                {showTimer ? (
                  <>
                    <Clock3 size={16} />
                    <span
                      className="timer"
                      aria-label={`Geçen süre ${formatTime(game.elapsed)}`}
                    >
                      {formatTime(game.elapsed)}
                    </span>
                  </>
                ) : (
                  <span className="relax-label">
                    <Leaf size={15} /> Kendi hızında
                  </span>
                )}
                <button
                  className="icon-button"
                  disabled={finished || !loaded}
                  onClick={() =>
                    game.paused
                      ? resume()
                      : setGame((g) => ({ ...g, paused: true }))
                  }
                  aria-label={game.paused ? 'Oyuna devam et' : 'Oyunu duraklat'}
                  title={game.paused ? 'Devam et' : 'Duraklat'}
                >
                  {game.paused ? <Play size={15} /> : <Pause size={15} />}
                </button>
              </div>
              <div className="game-actions">
                <button
                  className="icon-button"
                  onClick={openShare}
                  aria-label="Bulmacayı paylaş"
                  title="Bulmacayı paylaş"
                >
                  <Share2 size={17} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => setFocus((v) => !v)}
                  aria-label={
                    focus ? 'Normal görünüme dön' : 'Odak görünümünü aç'
                  }
                  title={focus ? 'Normal görünüm' : 'Odak görünümü'}
                >
                  {focus ? <Minimize size={17} /> : <Maximize size={17} />}
                </button>
              </div>
            </div>
            {mode === 'daily' && (
              <div className="mode-note">
                <CalendarDays size={16} />
                <p>
                  {String(game.puzzle.seed).replace(
                    /^(\d{4})(\d{2})(\d{2})$/,
                    '$3.$2.$1',
                  )}{' '}
                  · Her boyut ve seviyeye özel günlük bulmaca.
                </p>
              </div>
            )}
            {mode === 'classroom' && (
              <div className="mode-note">
                <Presentation size={17} />
                <p>
                  Tahtayı yansıt, sırayla fikir al.{' '}
                  <button onClick={() => setFocus(true)}>Tahtayı büyüt</button>{' '}
                  veya <button onClick={openShare}>bulmacayı paylaş.</button>
                </p>
              </div>
            )}
            {mode === 'versus' && (
              <div className="mode-note">
                <UsersRound size={17} />
                <p>
                  Aynı cihazda iki oyuncu. İlk doğru tamamlayan kazanır. Tablet
                  veya geniş ekran önerilir.
                </p>
              </div>
            )}
            <div className={mode === 'versus' ? 'race-boards' : 'single-board'}>
              {game.players.map((player, i) => (
                <GameBoard
                  key={`${game.id}-${round}-${i}`}
                  puzzle={game.puzzle}
                  player={player}
                  index={i}
                  race={mode === 'versus'}
                  locked={blocked || raceReady || finished || !loaded}
                  paused={game.paused}
                  ready={raceReady}
                  showErrors={showErrors}
                  onChange={(p) => updatePlayer(i, p)}
                  onResume={resume}
                />
              ))}
            </div>
            {finished && (
              <div className="finished-inline">
                <Trophy size={20} />
                <span>
                  {mode === 'versus'
                    ? `${winner === 0 ? 'Turuncu' : 'Yeşil'} takım kazandı. İkinize de tebrikler!`
                    : 'Harika iş! Bütün sayılar yerini buldu.'}
                </span>
                <button onClick={() => setCelebrate(true)}>Sonuç</button>
              </div>
            )}
            <p className="keyboard-tip">
              <span>KLAVYE</span> Sayı tuşları · Yön tuşları · N: not · Delete:
              sil
            </p>
          </section>
          <aside className="discovery-panel">
            <div className="tip-card">
              <span className="icon-bubble">
                <Lightbulb />
              </span>
              <div className="section-caption">BİR KÜÇÜK İPUCU</div>
              <h3>
                Bak, düşün,
                <br />
                yerini bul.
              </h3>
              <p>
                Her satırda, sütunda ve kalın çizgili kutuda her sayı yalnızca
                bir kez bulunur.
              </p>
              <button
                className="mini-lesson"
                onClick={() => setHelp(true)}
                aria-label="Eksik sayıyı bulmayı öğren"
              >
                <span className="mini-sequence">
                  <span>1</span>
                  <span>2</span>
                  <span>?</span>
                  <span>4</span>
                </span>
                <small>
                  Eksik sayıyı birlikte bulalım <ArrowRight size={12} />
                </small>
              </button>
            </div>
            <div className="progress-card">
              <span className="section-caption">ADIM ADIM GELİŞ</span>
              <h3>
                {stats.completed.length
                  ? 'Keşiflerine devam et!'
                  : 'İlk yıldızın seni bekliyor.'}
              </h3>
              <p>
                {stats.completed.length
                  ? `${stats.completed.length} farklı bulmaca tamamladın. Her biri yeni bir keşif.`
                  : 'İlk bulmacanı tamamla, ilk yıldızlarını kazan.'}
              </p>
              <div className="star-row" aria-label={`${stats.stars} yıldız`}>
                {[0, 1, 2].map((n) => (
                  <Star
                    key={n}
                    fill={stats.stars > n ? '#e9ae56' : 'none'}
                    strokeWidth={1.5}
                  />
                ))}
                <strong>{stats.stars || ''}</strong>
              </div>
              {stats.streak > 0 && (
                <div className="streak">
                  <Flame size={16} />
                  {stats.streak} günlük oyun serisi
                </div>
              )}
              <small className="stats-note">
                Yıldızların bu tarayıcıda saklanır.
              </small>
            </div>
            <p className="local-note">
              Giriş yok. Reklam yok.
              <br />
              Sadece sen ve bir avuç sayı.
            </p>
          </aside>
        </div>
        <output className="page-status">
          {status && (
            <>
              <span>{status}</span>
              <button
                aria-label="Bildirimi kapat"
                onClick={() => setStatus('')}
              >
                <X size={14} />
              </button>
            </>
          )}
        </output>
        <footer>
          <span>Bir kare, bir fikir, bir “buldum!” anı.</span>
          <span>
            Sevgiyle düşünülmüş bir zihin oyunu{' '}
            <span className="footer-dot">✦</span>
          </span>
        </footer>
      </main>

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="workshop-dialog" showCloseButton={false}>
          <DialogClose className="dialog-x" aria-label="Kapat">
            <X size={20} />
          </DialogClose>
          <div className="dialog-emblem">
            <Lightbulb size={30} />
          </div>
          <DialogTitle>Sudoku, küçük bir keşif oyunu.</DialogTitle>
          <DialogDescription>
            İşlem yapmana gerek yok. Sayıların yerini bulman yeterli!
          </DialogDescription>
          <ol className="lesson-rules">
            <li>
              <span>1</span>
              <p>
                <strong>Satıra bak.</strong> Soldan sağa her sayı bir kez.
              </p>
            </li>
            <li>
              <span>2</span>
              <p>
                <strong>Sütuna bak.</strong> Yukarıdan aşağıya her sayı bir kez.
              </p>
            </li>
            <li>
              <span>3</span>
              <p>
                <strong>Kutuya bak.</strong> Kalın çizgilerin içinde tekrar yok.
              </p>
            </li>
          </ol>
          <div className="lesson-demo">
            <p>
              4×4 bir tahtada 1, 2, 3 ve 4 kullanılır.
              <br />
              <strong>Bu satırda hangi sayı eksik?</strong>
            </p>
            <div className="mini-sequence">
              <span>1</span>
              <span>2</span>
              <span className={learnAnswer === 3 ? 'demo-correct' : ''}>
                {learnAnswer === 3 ? '3' : '?'}
              </span>
              <span>4</span>
            </div>
            <div className="lesson-answers">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  aria-label={`${n} cevabını seç`}
                  onClick={() => setLearnAnswer(n)}
                  className={learnAnswer === n ? 'selected-answer' : ''}
                >
                  {n}
                </button>
              ))}
            </div>
            <p aria-live="polite">
              {learnAnswer === null
                ? 'Bir sayıya dokun.'
                : learnAnswer === 3
                  ? 'Evet, 3! Diğer sayılar zaten satırda var.'
                  : 'Bu sayı zaten satırda var. Bir daha deneyelim.'}
            </p>
          </div>
          <p className="dialog-small">
            Not al ile olası sayıları küçük yazabilirsin. İpucu sana bir sonraki
            adımı açıklar. Yanlış yapınca oyun bitmez.
          </p>
          <button
            className="primary-button"
            onClick={() => {
              setHelp(false);
              if (!game.started && game.puzzle.size !== 4)
                requestStart({ mode: 'solo', size: 4, level: 0 });
            }}
          >
            {game.started ? 'Oyunuma dön' : 'Hazırım, başlayalım'}
            <ArrowRight size={18} />
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={share} onOpenChange={setShare}>
        <DialogContent className="workshop-dialog" showCloseButton={false}>
          <DialogClose className="dialog-x" aria-label="Kapat">
            <X size={20} />
          </DialogClose>
          <div className="dialog-emblem">
            <Share2 size={28} />
          </div>
          <DialogTitle>Aynı bulmacada buluşun.</DialogTitle>
          <DialogDescription>
            Bu bağlantı, aynı başlangıç tahtasını açar. Herkes kendi cihazında
            çözer; ilerlemeler ve süreler cihazlar arasında canlı paylaşılmaz.
          </DialogDescription>
          <label className="share-label" htmlFor="share-link">
            Bulmaca bağlantısı
          </label>
          <input
            id="share-link"
            className="share-input"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
          />
          <button className="primary-button" onClick={copyShare}>
            {copied ? <Check size={18} /> : <Share2 size={18} />}{' '}
            {copied ? 'Bağlantı kopyalandı' : 'Bağlantıyı kopyala'}
          </button>
          {shareUrl.includes('127.0.0.1') && (
            <p className="dialog-small">
              Şu an yerel önizlemedesin. Diğer cihazlarda paylaşım, site
              yayınlandığında çalışacak.
            </p>
          )}
          <div className="classroom-tip">
            <Presentation size={21} />
            <p>
              <strong>Sınıf fikri</strong>
              <br />
              Herkese aynı bulmacayı aç. İlk bitiren çözümünü açıklasın; en
              güzel stratejiyi birlikte seçin.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent className="workshop-dialog">
          <AlertDialogTitle>Yeni bir keşfe geçelim mi?</AlertDialogTitle>
          <AlertDialogDescription>
            Şu anki bulmacandaki ilerleme yerine yeni oyun kaydedilecek.
            İstersen önce bu bulmacayı bitirebilirsin.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Oyunuma dön</AlertDialogCancel>
            <button
              className="primary-button"
              onClick={() => {
                if (pending) start(pending);
              }}
            >
              Yeni oyuna geç
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={celebrate} onOpenChange={setCelebrate}>
        <DialogContent
          className="workshop-dialog celebration"
          showCloseButton={false}
        >
          <DialogClose className="dialog-x" aria-label="Kapat">
            <X size={20} />
          </DialogClose>
          <div className="celebration-stars">
            <Star />
            <Trophy />
            <Star />
          </div>
          <div className="eyebrow">BİR “BULDUM!” ANI DAHA</div>
          <DialogTitle>
            {mode === 'versus'
              ? `${winner === 0 ? 'Turuncu' : 'Yeşil'} takım kazandı!`
              : 'Bütün parçalar yerli yerinde!'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'versus'
              ? 'Güzel bir yarıştı. Şimdi takımları değiştirip yeniden deneyebilirsiniz.'
              : 'Düşündün, denedin ve başardın. Kendinle gurur duyabilirsin.'}
          </DialogDescription>
          <div className="result-metrics">
            <div>
              <strong>{formatTime(game.elapsed)}</strong>
              <span>Oyun süresi</span>
            </div>
            <div>
              <strong>{game.players[Math.max(0, winner)].hints}</strong>
              <span>Açılan sayı</span>
            </div>
            <div>
              <strong>
                {game.puzzle.size}×{game.puzzle.size}
              </strong>
              <span>{LEVELS[game.puzzle.level]}</span>
            </div>
          </div>
          <p className="dialog-small">
            Her farklı bulmacada 1–3 yıldız kazanırsın. Aynı bulmacayı tekrar
            çözmek ek yıldız vermez.
          </p>
          <button
            className="primary-button"
            onClick={() =>
              start({ mode: mode === 'daily' ? 'solo' : mode, size, level })
            }
          >
            Bir bulmaca daha
            <ArrowRight size={18} />
          </button>
          <button className="text-button" onClick={() => setCelebrate(false)}>
            Tamamladığım tahtayı gör
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={installHelp} onOpenChange={setInstallHelp}>
        <DialogContent className="workshop-dialog" showCloseButton={false}>
          <DialogClose className="dialog-x" aria-label="Kapat">
            <X size={20} />
          </DialogClose>
          <div className="dialog-emblem">
            <Download size={28} />
          </div>
          <DialogTitle>Atölyen hep yanında.</DialogTitle>
          <DialogDescription>
            Sudoku Atölyesi’ni telefonunun ana ekranına ekleyebilirsin.
          </DialogDescription>
          <ol className="install-steps">
            <li>
              <strong>iPhone / iPad:</strong> Safari’de Paylaş düğmesine,
              ardından Ana Ekrana Ekle’ye dokun.
            </li>
            <li>
              <strong>Android:</strong> Chrome menüsünde Uygulamayı yükle veya
              Ana ekrana ekle seçeneğini kullan.
            </li>
          </ol>
          <p className="dialog-small">
            Yayınlanan siteyi bir kez internetle açtıktan sonra çevrimdışı da
            oynayabilirsin. Kayıtların bu tarayıcıda kalır.
          </p>
          <button
            className="primary-button"
            onClick={() => setInstallHelp(false)}
          >
            Anladım
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
