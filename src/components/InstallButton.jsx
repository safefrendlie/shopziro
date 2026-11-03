import { useState } from 'react'
import Icon from './Icon'
import { Modal } from './ui'
import { diagnoseInstall, isIOS, usePwaInstall } from '../state/pwa'
import { useToast } from '../state/toast'

/** Install button. Uses the browser's one-tap install when available, otherwise shows exact steps
    and tells the owner if hosting settings are blocking installation. */
export default function InstallButton({ className = 'btn btn-ghost btn-sm', label = 'Install app', iconOnlyOnPhone = false }) {
  const { canPrompt, installed, install } = usePwaInstall()
  const [help, setHelp] = useState(false)
  const [issue, setIssue] = useState('')
  const [checking, setChecking] = useState(false)
  const toast = useToast()

  if (installed) return null

  const click = async () => {
    if (canPrompt) {
      const outcome = await install()
      if (outcome === 'accepted') toast.success('Shopziro is being installed.')
      return
    }
    setHelp(true)
    setChecking(true)
    setIssue(await diagnoseInstall())
    setChecking(false)
  }

  return (
    <>
      <button type="button" className={className} onClick={click} aria-label={label}>
        <Icon name="download" size={16} />
        <span className={iconOnlyOnPhone ? 'lbl' : undefined}>{label}</span>
      </button>
      <Modal open={help} onClose={() => setHelp(false)} title="Install Shopziro">
        <div className="stack">
          {checking && <p className="hint">Checking your setup...</p>}
          {issue && <div className="notice notice-bad">{issue}</div>}
          {isIOS() ? (
            <ol className="steps">
              <li>Open this page in <strong>Safari</strong>.</li>
              <li>Tap the <strong>Share</strong> button at the bottom of the screen.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong>. Shopziro now opens like an app.</li>
            </ol>
          ) : (
            <ol className="steps">
              <li>Open this site in <strong>Chrome</strong> or <strong>Edge</strong> (not inside Instagram or WhatsApp's built-in browser).</li>
              <li>Open the browser menu (three dots) and tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              <li>On a laptop you can also click the install icon at the right end of the address bar.</li>
            </ol>
          )}
          <p className="hint">Installing works only on a secure (https) address. If the option is missing, reload the page once and try again.</p>
        </div>
      </Modal>
    </>
  )
}
