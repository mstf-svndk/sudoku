'use client';
import { useRef, useState } from 'react';
import {
  Undo2,
  Eraser,
  Pencil,
  Lightbulb,
  CheckCheck,
  Pause,
  Play,
  Flag,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { boxShape, candidates, peers, symbol, type Puzzle } from '@/lib/sudoku';
import { isComplete, move, undo, type Player } from '@/lib/game';

type Props = {
  puzzle: Puzzle;
  player: Player;
  index: number;
  race: boolean;
  locked: boolean;
  paused: boolean;
  ready: boolean;
  showErrors: boolean;
  onChange: (player: Player) => void;
  onResume: () => void;
};
export function GameBoard({
  puzzle,
  player,
  index,
  race,
  locked,
  paused,
  ready,
  showErrors,
  onChange,
  onResume,
}: Props) {
  const { size, givens, solution } = puzzle,
    [h, w] = boxShape(size);
  const [selected, setSelected] = useState(() =>
    Math.max(0, givens.indexOf(0)),
  );
  const [noteMode, setNoteMode] = useState(false),
    [checked, setChecked] = useState(false),
    [message, setMessage] = useState(
      'Bir kare seç, ardından bir sayıya dokun.',
    );
  const [hint, setHint] = useState<{
    index: number;
    value: number;
    text: string;
  } | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const completed = isComplete(player, puzzle),
    disabled = locked || completed;
  const filled = player.values.filter((v, i) => !givens[i] && v !== 0).length,
    total = givens.filter((v) => !v).length;
  const input = (value: number) => {
    if (disabled) return;
    const next = move(player, puzzle, selected, value, noteMode);
    if (next !== player) {
      onChange(next);
      setHint(null);
      setChecked(false);
      setMessage(
        value === 0
          ? 'Kare temizlendi.'
          : noteMode
            ? 'Olası sayı notlarına eklendi veya çıkarıldı.'
            : showErrors && value !== solution[selected]
              ? 'Bu sayıya tekrar bakalım. Silip yeniden deneyebilirsin.'
              : 'Güzel, düşünmeye devam!',
      );
    }
  };
  const requestHint = () => {
    if (disabled) return;
    const wrong = player.values.findIndex((v, i) => v && v !== solution[i]);
    if (wrong >= 0) {
      setSelected(wrong);
      setChecked(true);
      setMessage(
        'Önce işaretli kareyi gözden geçirelim. Bu sayı çözümle uyuşmuyor.',
      );
      return;
    }
    const blanks = player.values
      .map((v, i) => (v ? -1 : i))
      .filter((i) => i >= 0);
    const target =
      blanks.find((i) => candidates(player.values, i, size).length === 1) ??
      (blanks.includes(selected) ? selected : blanks[0]);
    if (target === undefined) return;
    const options = candidates(player.values, target, size),
      row = Math.floor(target / size) + 1,
      col = (target % size) + 1;
    setSelected(target);
    setHint({
      index: target,
      value: solution[target],
      text:
        options.length === 1
          ? `${row}. satır, ${col}. sütun: Satır, sütun ve kutudaki sayıları eleyince yalnızca ${symbol(options[0])} kalıyor.`
          : `${row}. satır, ${col}. sütun için adaylar: ${options.map(symbol).join(', ')}. Burada birden fazla olasılık var. Başka kareleri inceleyebilir veya çözümden bir sayıyı açabilirsin.`,
    });
  };
  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    let next = selected;
    if (key === 'arrowleft') next = Math.max(0, selected - 1);
    else if (key === 'arrowright')
      next = Math.min(size * size - 1, selected + 1);
    else if (key === 'arrowup') next = Math.max(0, selected - size);
    else if (key === 'arrowdown')
      next = Math.min(size * size - 1, selected + size);
    else if (key === 'backspace' || key === 'delete' || key === '0') {
      event.preventDefault();
      input(0);
      return;
    } else if (key === 'n') {
      event.preventDefault();
      setNoteMode((v) => !v);
      return;
    } else {
      const n = /^[1-9]$/.test(key)
        ? Number(key)
        : size === 12 && /^[abc]$/.test(key)
          ? key.charCodeAt(0) - 87
          : 0;
      if (n && n <= size) {
        event.preventDefault();
        input(n);
      }
      return;
    }
    event.preventDefault();
    setSelected(next);
    refs.current[next]?.focus();
  }
  return (
    <section
      className={`player-board ${race ? `player-${index}` : ''}`}
      aria-label={race ? `${index + 1}. oyuncunun tahtası` : 'Sudoku tahtası'}
    >
      {race && (
        <div className="player-title">
          <span className="player-dot" />
          <h3>{index === 0 ? 'Turuncu takım' : 'Yeşil takım'}</h3>
          <span>
            {filled}/{total}
          </span>
        </div>
      )}
      <div className="board-wrap">
        <fieldset
          className={`sudoku-board size-${size} ${paused || ready ? 'concealed' : ''}`}
          aria-label={`${size} çarpı ${size} Sudoku; ok tuşlarıyla gezinebilirsin`}
          style={{ gridTemplateColumns: `repeat(${size},1fr)` }}
          inert={paused || ready}
        >
          {player.values.map((value, i) => {
            const related = peers(selected, i, size),
              same = value !== 0 && value === player.values[selected];
            const wrong =
              (showErrors || checked) && !!value && value !== solution[i];
            return (
              <button
                key={i}
                onKeyDown={onKeyDown}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                tabIndex={selected === i ? 0 : -1}
                aria-label={`${Math.floor(i / size) + 1}. satır, ${(i % size) + 1}. sütun: ${value ? symbol(value) : 'boş'}${givens[i] ? ', sabit sayı' : ''}${wrong ? ', tekrar düşün' : ''}${player.notes[i].length ? `, notlar ${player.notes[i].map(symbol).join(', ')}` : ''}`}
                aria-pressed={selected === i}
                aria-disabled={disabled || !!givens[i]}
                onClick={() => {
                  if (!disabled) {
                    setSelected(i);
                    setHint(null);
                    if (givens[i])
                      setMessage(
                        'Bu sayı başlangıçta verildi. Boş bir kare seçebilirsin.',
                      );
                  }
                }}
                className={`cell ${givens[i] ? 'given' : 'entered'} ${related ? 'related' : ''} ${same ? 'same-value' : ''} ${selected === i ? 'selected' : ''} ${wrong ? 'wrong' : ''}`}
                style={{
                  borderRightWidth:
                    ((i % size) + 1) % w === 0 && i % size !== size - 1
                      ? 2
                      : i % size === size - 1
                        ? 0
                        : 1,
                  borderRightColor:
                    ((i % size) + 1) % w === 0 ? '#455e55' : undefined,
                  borderBottomWidth:
                    (Math.floor(i / size) + 1) % h === 0 &&
                    i < size * (size - 1)
                      ? 2
                      : i >= size * (size - 1)
                        ? 0
                        : 1,
                  borderBottomColor:
                    (Math.floor(i / size) + 1) % h === 0
                      ? '#455e55'
                      : undefined,
                }}
              >
                {value ? (
                  symbol(value)
                ) : player.notes[i].length ? (
                  <span
                    className="cell-notes"
                    style={{ gridTemplateColumns: `repeat(${w},1fr)` }}
                  >
                    {Array.from({ length: size }, (_, n) => (
                      <span key={n}>
                        {player.notes[i].includes(n + 1) ? symbol(n + 1) : ''}
                      </span>
                    ))}
                  </span>
                ) : null}
                {wrong && (
                  <span className="error-dot" aria-hidden="true">
                    !
                  </span>
                )}
              </button>
            );
          })}
        </fieldset>
        {(paused || ready) && (
          <div className="board-overlay">
            <span className="pause-circle">{ready ? <Flag /> : <Pause />}</span>
            <h3>{ready ? 'İkiniz de hazır mısınız?' : 'Küçük bir mola'}</h3>
            <p>
              {ready
                ? 'Aynı bulmaca, eşit koşullar.'
                : 'Bulmacan seni burada bekliyor.'}
            </p>
            <button className="primary-button" onClick={onResume}>
              <Play size={17} />
              {ready ? 'Yarışı başlat' : 'Devam et'}
            </button>
          </div>
        )}
      </div>
      <div className="board-progress">
        <span>
          {completed ? 'Tamamlandı!' : `${filled} / ${total} kare dolduruldu`}
        </span>
        <Progress
          value={(filled / total) * 100}
          aria-label="Doldurulan kareler"
        />
      </div>
      <div className={`number-pad ${size > 6 ? 'large-pad' : ''}`}>
        {Array.from({ length: size }, (_, i) => i + 1).map((n) => {
          const remaining = size - player.values.filter((v) => v === n).length;
          return (
            <button
              key={n}
              disabled={disabled}
              onClick={() => input(n)}
              aria-label={`${symbol(n)} ${noteMode ? 'notunu ekle' : 'yerleştir'}`}
              className={remaining <= 0 ? 'number-complete' : ''}
            >
              <span>{symbol(n)}</span>
              <small>{remaining > 0 ? remaining : '✓'}</small>
            </button>
          );
        })}
      </div>
      {size === 12 && (
        <p className="symbol-key">12×12: 1–9 ve A, B, C simgelerini kullan.</p>
      )}
      <div className="board-tools">
        <button
          disabled={disabled || !player.history.length}
          onClick={() => {
            onChange(undo(player));
            setHint(null);
            setChecked(false);
            setMessage('Son hamle geri alındı.');
          }}
        >
          <Undo2 />
          <span>Geri al</span>
        </button>
        <button
          disabled={disabled || !!givens[selected]}
          onClick={() => input(0)}
        >
          <Eraser />
          <span>Sil</span>
        </button>
        <button
          disabled={disabled}
          aria-pressed={noteMode}
          className={noteMode ? 'tool-active' : ''}
          onClick={() => setNoteMode((v) => !v)}
        >
          <Pencil />
          <span>Not {noteMode ? 'açık' : 'al'}</span>
        </button>
        {!race && (
          <button disabled={disabled} onClick={requestHint}>
            <Lightbulb />
            <span>İpucu</span>
          </button>
        )}
        <button
          disabled={disabled}
          onClick={() => {
            setChecked(true);
            const count = player.values.filter(
              (v, i) => v && v !== solution[i],
            ).length;
            setMessage(
              count
                ? `${count} kareyi yeniden düşünelim. İşaretli kareleri değiştirebilirsin.`
                : 'Şu ana kadar bütün sayılar doğru. Böyle devam!',
            );
          }}
        >
          <CheckCheck />
          <span>Kontrol</span>
        </button>
      </div>
      {hint ? (
        <output className="hint-reveal">
          <Lightbulb size={18} />
          <div>
            <p>{hint.text}</p>
            <button
              onClick={() => {
                const next = move(player, puzzle, hint.index, hint.value);
                onChange({ ...next, hints: player.hints + 1 });
                setHint(null);
                setMessage('Bir sayı açıldı. Şimdi sıra sende!');
              }}
            >
              Sayıyı yerleştir <span>+1 yardım</span>
            </button>
          </div>
        </output>
      ) : (
        <p className="board-message" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}
