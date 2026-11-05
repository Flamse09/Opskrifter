import { useState } from 'preact/hooks';
import { joinHousehold, useStore } from '../../data/store';
import { LoginForm } from '../LoginForm';

export function Settings() {
  const { household, recipes } = useStore();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join(e: Event) {
    e.preventDefault();
    setBusy(true);
    const err = await joinHousehold(code);
    setBusy(false);
    setMsg(err ?? 'Du er nu med i husstanden.');
    if (!err) setCode('');
  }

  return (
    <div>
      <h2>Konto</h2>
      <LoginForm />

      <h2>Husstand</h2>
      {household && (
        <div class="card stack">
          <div>
            <strong>{household.name}</strong> · {recipes.length} opskrifter
          </div>
          <div>
            Invitationskode: <code class="code">{household.invite_code}</code>
          </div>
          <p class="muted small" style="margin:0">
            Din kæreste opretter en konto, åbner Indstillinger og skriver koden her. Så deler I opskrifter og indkøbsliste.
          </p>
        </div>
      )}
      <form class="card stack" onSubmit={join}>
        <div>Har du fået en kode?</div>
        <input value={code} onInput={(e) => setCode(e.currentTarget.value)} placeholder="Kode" autoCapitalize="characters" />
        <button type="submit" disabled={busy || code.trim().length < 4}>
          Bliv en del af husstanden
        </button>
        {msg && <p class="muted" style="margin:0">{msg}</p>}
      </form>
    </div>
  );
}
