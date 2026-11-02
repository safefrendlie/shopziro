import { useState } from 'react'
import Icon from './Icon'
import { Modal } from './ui'
import { isIOS, usePwaInstall } from '../state/pwa'
import { useToast } from '../state/toast'

export default function InstallButton({ className = 'btn btn-ghost btn-sm', label = 'Install app' }) {
  const { canPrompt, installed, install } = usePwaInstall()
  const [help, setHelp] = useState(false)
  const toast = useToast()

  if (installed) return null

  const click = async () => {
    if (canPrompt) {
      const outcome = await install()
      if (outcome === 'accepted') toast.success('Shopziro is being installed.')
      return
    }
    setHelp(true)
  }

  return (
    <>
      <button type="button" className={className} onClick={click}>
        <Icon name="download" size={16} />
        {label}
      </button>
      <Modal open={help} onClose={() => setHelp(false)} title="Install Shopziro">
        {isIOS() ? (
          <ol className="steps">
            <li>Open this page in <strong>Safari</strong>.</li>
            <li>Tap the <strong>Share</strong> button at the bottom of the screen.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong>. Shopziro now opens like an app.</li>
          </ol>
        ) : (
          <ol className="steps">
            <li>Open the browser menu (three dots) in <strong>Chrome</strong> or <strong>Edge</strong>.</li>
            <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
            <li>On a laptop you can also click the install icon at the right end of the address bar.</li>
          </ol>
        )}
        <p className="hint">
          If you do not see the option yet, use the app for a minute and reload; browsers only offer installing on a secure (https) website.
        </p>
      </Modal>
    </>
  )
}
