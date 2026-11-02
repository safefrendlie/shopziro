import Logo from './Logo'

/** Shown instead of the app when the Supabase keys are missing, so nothing crashes. */
export default function SetupScreen() {
  return (
    <div className="setup">
      <div className="setup-card">
        <Logo size={44} showTag />
        <h1>One last step: connect your database</h1>
        <p className="muted">
          Shopziro needs two values from your free Supabase project. Add them as environment variables, then restart or redeploy.
        </p>
        <ol className="steps">
          <li>
            Create a project at <strong>supabase.com</strong> (free).
          </li>
          <li>
            In <strong>SQL Editor</strong>, paste everything from <code>supabase/schema.sql</code> and press <strong>Run</strong>.
          </li>
          <li>
            In <strong>Project Settings, API</strong>, copy the <strong>Project URL</strong> and the <strong>anon public key</strong>.
          </li>
          <li>
            Create a file named <code>.env</code> (or add them in Vercel or Netlify) with:
            <pre className="code">{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}</pre>
          </li>
          <li>
            Restart <code>npm run dev</code> (or redeploy). This screen disappears.
          </li>
        </ol>
        <p className="hint">The full go-live guide is in README.md.</p>
      </div>
    </div>
  )
}
