import { useState } from 'preact/hooks';
import { addFreezerItem, removeFreezerItem, setFreezerAmount, useStore } from '../../data/store';
import { ageLevel, canTakeOne, daysSince, formatAge, formatDate, sortOldestFirst, today, type FreezerItem } from '../../freezer/freezer';
import { formatQuantity, parseIngredientLine } from '../../recipe/ingredients';
import { Icon } from '../icons';

export function Freezer() {
  const { freezer } = useStore();
  const [text, setText] = useState('');
  const [date, setDate] = useState(today());
  const [open, setOpen] = useState<string | null>(null);
  const items = sortOldestFirst(freezer);

  async function add(e: Event) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const ing = parseIngredientLine(t);
    setText('');
    await addFreezerItem({ name: ing.name || t, amount: ing.amount ?? null, unit: ing.unit ?? null, note: ing.note ?? null, frozen_on: date || today() });
    setDate(today());
  }

  return (
    <div>
      <div class="page-head">
        <h2>Fryser</h2>
        <p class="muted small">{items.length === 0 ? 'Tom' : `${items.length} ting · ældste først`}</p>
      </div>

      <form class="add-box" onSubmit={add}>
        <div class="add-line">
          <Icon name="plus" size={20} />
          <input placeholder="Læg i fryseren, fx 4 kugler pizzadej" value={text} onInput={(e) => setText(e.currentTarget.value)} enterKeyHint="done" />
        </div>
        {text.trim() && (
          <div class="add-extra">
            <label class="date-label">
              Lagt ind
              <input type="date" value={date} max={today()} onInput={(e) => setDate(e.currentTarget.value)} />
            </label>
            <button class="primary" type="submit">
              Tilføj
            </button>
          </div>
        )}
      </form>

      {items.length === 0 && (
        <div class="empty">
          <p class="muted">Skriv, hvad der ligger i fryseren. Har det ligget der et stykke tid, kan du vælge datoen, det blev lagt ind.</p>
        </div>
      )}

      <ul class="rows">
        {items.map((it) => (
          <Row key={it.id} item={it} open={open === it.id} onToggle={() => setOpen(open === it.id ? null : it.id)} />
        ))}
      </ul>
    </div>
  );
}

function Row({ item, open, onToggle }: { item: FreezerItem; open: boolean; onToggle: () => void }) {
  const days = daysSince(item.frozen_on);
  const level = ageLevel(days);
  const qty = formatQuantity({ name: item.name, amount: item.amount ?? undefined, unit: item.unit ?? undefined });
  return (
    <li class={open ? 'open' : undefined}>
      <button class="row-btn" aria-expanded={open} onClick={onToggle}>
        <span class="what">
          <span class="name">
            {qty && <span class="qty">{qty}</span>} {item.name}
          </span>
          <span class="sub">
            {days === 0 ? 'Lagt ind i dag' : `Lagt ind ${formatDate(item.frozen_on)}`}
            {item.note && ` · ${item.note}`}
          </span>
        </span>
        <span class={`age ${level}`}>
          {formatAge(days)}
          {level === 'old' && <span class="age-hint">brug snart</span>}
        </span>
      </button>
      {open && (
        <div class="row-actions">
          {canTakeOne(item) && (
            <button onClick={() => setFreezerAmount(item.id, item.amount! - 1)}>
              <Icon name="minus" size={18} /> Tag én ud
            </button>
          )}
          <button onClick={() => removeFreezerItem(item.id)}>
            <Icon name="check" size={18} /> {canTakeOne(item) ? 'Tag alt ud' : 'Taget ud'}
          </button>
        </div>
      )}
    </li>
  );
}
