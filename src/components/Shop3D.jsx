import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import Icon from './Icon'
import { mix, readableOn, resolveTheme } from '../lib/utils'

/* Optional 3D storefront. Outside: a building with the shop name on the signboard and a door
   you can click. Inside: product frames on the walls; click one to open its details.
   Drag to look around. Works with touch. Everything is disposed when closed. */

function signTexture(text, bg, fg, font) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 1024, 256)
  ctx.strokeStyle = fg
  ctx.lineWidth = 6
  ctx.strokeRect(14, 14, 996, 228)
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 120
  ctx.font = `700 ${size}px ${font}`
  while (ctx.measureText(text).width > 900 && size > 30) {
    size -= 6
    ctx.font = `700 ${size}px ${font}`
  }
  ctx.fillText(text, 512, 134)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function labelTexture(name, price, bg, fg) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 512, 128)
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '600 34px Poppins, Inter, system-ui, sans-serif'
  const n = name.length > 26 ? `${name.slice(0, 25)}...` : name
  ctx.fillText(n, 256, 48)
  ctx.font = '500 28px Poppins, Inter, system-ui, sans-serif'
  ctx.globalAlpha = 0.75
  ctx.fillText(price, 256, 92)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function Shop3D({ shop, products, onClose, onOpenProduct }) {
  const mount = useRef(null)
  const [inside, setInside] = useState(false)
  const [hint, setHint] = useState('Tap the door to walk in. Drag to look around.')
  const apiRef = useRef({ enter: () => {}, leave: () => {} })
  const propsRef = useRef({ onOpenProduct })
  propsRef.current = { onOpenProduct }

  useEffect(() => {
    const el = mount.current
    if (!el) return undefined
    const theme = resolveTheme(shop.config || {})
    const accent = theme.accent
    const wall = mix(theme.bg, theme.text, 0.18)
    const floorCol = mix(theme.bg, '#000000', 0.25)
    const ink = readableOn(accent)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(mix(theme.bg, '#000000', 0.35))
    scene.fog = new THREE.Fog(scene.background, 14, 34)

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.shadowMap.enabled = false
    el.appendChild(renderer.domElement)
    renderer.domElement.style.touchAction = 'none'

    scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.15))
    const sun = new THREE.DirectionalLight(0xffffff, 1.1)
    sun.position.set(6, 10, 8)
    scene.add(sun)

    const disposables = []
    const track = (o) => {
      disposables.push(o)
      return o
    }
    const mat = (color, opts = {}) => track(new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...opts }))

    /* ---------- OUTSIDE ---------- */
    const outside = new THREE.Group()
    scene.add(outside)

    const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(60, 60)), mat(mix(theme.bg, '#000000', 0.5)))
    ground.rotation.x = -Math.PI / 2
    outside.add(ground)

    const building = new THREE.Mesh(track(new THREE.BoxGeometry(8, 4.4, 4)), mat(wall))
    building.position.set(0, 2.2, 0)
    outside.add(building)

    const roof = new THREE.Mesh(track(new THREE.BoxGeometry(8.6, 0.35, 4.6)), mat(accent))
    roof.position.set(0, 4.55, 0)
    outside.add(roof)

    const awning = new THREE.Mesh(track(new THREE.BoxGeometry(8, 0.18, 1.2)), mat(accent))
    awning.position.set(0, 3.3, 2.5)
    awning.rotation.x = 0.18
    outside.add(awning)

    const signTex = track(signTexture(shop.name, accent, ink, 'Poppins, Inter, system-ui, sans-serif'))
    const sign = new THREE.Mesh(track(new THREE.PlaneGeometry(5.2, 1.3)), track(new THREE.MeshBasicMaterial({ map: signTex })))
    sign.position.set(0, 3.95, 2.04)
    outside.add(sign)

    const door = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 2.5, 0.12)), mat(mix(accent, '#000000', 0.35), { emissive: accent, emissiveIntensity: 0.18 }))
    door.position.set(0, 1.25, 2.04)
    door.name = 'door'
    outside.add(door)
    const knob = new THREE.Mesh(track(new THREE.SphereGeometry(0.07, 12, 12)), mat('#f5d97a', { metalness: 0.8, roughness: 0.3 }))
    knob.position.set(0.5, 1.2, 2.13)
    outside.add(knob)

    const glassMat = mat('#9fd8ff', { transparent: true, opacity: 0.35, roughness: 0.1 })
    ;[-2.7, 2.7].forEach((x) => {
      const w = new THREE.Mesh(track(new THREE.BoxGeometry(2, 1.7, 0.1)), glassMat)
      w.position.set(x, 1.7, 2.03)
      outside.add(w)
    })

    // a few decorative planters
    ;[-4.6, 4.6].forEach((x) => {
      const pot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.35, 0.28, 0.5, 14)), mat('#8a5a3c'))
      pot.position.set(x, 0.25, 2.8)
      const bush = new THREE.Mesh(track(new THREE.SphereGeometry(0.5, 14, 12)), mat('#2f9e5b'))
      bush.position.set(x, 0.85, 2.8)
      outside.add(pot, bush)
    })

    /* ---------- INSIDE ---------- */
    const room = new THREE.Group()
    room.visible = false
    room.position.set(0, 0, -60) // far away, so it never overlaps the outside scene
    scene.add(room)

    const W = 14
    const D = 12
    const H = 4.4
    const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(W, D)), mat(floorCol, { roughness: 0.5 }))
    floor.rotation.x = -Math.PI / 2
    room.add(floor)
    const ceil = new THREE.Mesh(track(new THREE.PlaneGeometry(W, D)), mat(mix(theme.bg, theme.text, 0.1), { side: THREE.DoubleSide }))
    ceil.rotation.x = Math.PI / 2
    ceil.position.y = H
    room.add(ceil)
    const wallMat = mat(wall, { side: THREE.DoubleSide })
    const back = new THREE.Mesh(track(new THREE.PlaneGeometry(W, H)), wallMat)
    back.position.set(0, H / 2, -D / 2)
    const left = new THREE.Mesh(track(new THREE.PlaneGeometry(D, H)), wallMat)
    left.position.set(-W / 2, H / 2, 0)
    left.rotation.y = Math.PI / 2
    const right = new THREE.Mesh(track(new THREE.PlaneGeometry(D, H)), wallMat)
    right.position.set(W / 2, H / 2, 0)
    right.rotation.y = -Math.PI / 2
    const front = new THREE.Mesh(track(new THREE.PlaneGeometry(W, H)), wallMat)
    front.position.set(0, H / 2, D / 2)
    room.add(back, left, right, front)

    const stripe = new THREE.Mesh(track(new THREE.PlaneGeometry(W, 0.18)), track(new THREE.MeshBasicMaterial({ color: accent })))
    stripe.position.set(0, 0.5, -D / 2 + 0.01)
    room.add(stripe)

    const lamp = new THREE.PointLight(0xffffff, 18, 22)
    lamp.position.set(0, H - 0.4, 0)
    room.add(lamp)

    // exit door (front wall, click to leave)
    const exitDoor = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 2.4, 0.1)), mat(mix(accent, '#000000', 0.4), { emissive: accent, emissiveIntensity: 0.25 }))
    exitDoor.position.set(0, 1.2, D / 2 - 0.06)
    exitDoor.name = 'exit'
    room.add(exitDoor)
    const exitSign = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.6, 0.4)),
      track(new THREE.MeshBasicMaterial({ map: track(signTexture('EXIT', '#14141a', '#ffffff', 'Inter, sans-serif')) }))
    )
    exitSign.position.set(0, 2.8, D / 2 - 0.1)
    exitSign.rotation.y = Math.PI
    room.add(exitSign)

    // brand on the back wall
    const brand = new THREE.Mesh(track(new THREE.PlaneGeometry(5, 1.25)), track(new THREE.MeshBasicMaterial({ map: signTex })))
    brand.position.set(0, 3.2, -D / 2 + 0.02)
    room.add(brand)

    // product frames
    const clickable = [exitDoor, door]
    const shown = products.slice(0, 18)
    const currency = (shop.config && shop.config.currency) || 'INR'
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    const slots = []
    const perWall = 6
    shown.forEach((p, i) => {
      const wallIdx = Math.floor(i / perWall) // 0 back, 1 left, 2 right
      const k = i % perWall
      const col = k % 3
      const row = Math.floor(k / 3)
      let pos
      let rotY = 0
      if (wallIdx === 0) {
        pos = [-4 + col * 4, 1.5 + row * 1.7 - 0.2, -D / 2 + 0.06]
      } else if (wallIdx === 1) {
        pos = [-W / 2 + 0.06, 1.5 + row * 1.7 - 0.2, -3.6 + col * 3.6]
        rotY = Math.PI / 2
      } else {
        pos = [W / 2 - 0.06, 1.5 + row * 1.7 - 0.2, -3.6 + col * 3.6]
        rotY = -Math.PI / 2
      }
      slots.push({ p, pos, rotY })
    })

    const fmt = (p) => {
      if (p.offer_type === 'quote') return 'Request a quote'
      if (p.price == null) return 'Custom order'
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(p.price))
      } catch {
        return `${currency} ${p.price}`
      }
    }

    slots.forEach(({ p, pos, rotY }) => {
      const g = new THREE.Group()
      g.position.set(...pos)
      g.rotation.y = rotY
      const frame = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 1.5, 0.08)), mat(accent))
      const picMat = track(new THREE.MeshBasicMaterial({ color: mix(theme.bg, theme.text, 0.25) }))
      const pic = new THREE.Mesh(track(new THREE.PlaneGeometry(1.9, 1.3)), picMat)
      pic.position.z = 0.05
      pic.userData.productId = p.id
      const label = new THREE.Mesh(
        track(new THREE.PlaneGeometry(1.9, 0.48)),
        track(new THREE.MeshBasicMaterial({ map: track(labelTexture(p.name, fmt(p), '#14141a', '#ffffff')) }))
      )
      label.position.set(0, -0.98, 0.05)
      g.add(frame, pic, label)
      room.add(g)
      clickable.push(pic)
      const img = p.images && p.images[0]
      if (img) {
        loader.load(
          img,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace
            disposables.push(tex)
            picMat.map = tex
            picMat.color.set('#ffffff')
            picMat.needsUpdate = true
          },
          undefined,
          () => {}
        )
      }
    })

    if (shown.length === 0) {
      const empty = new THREE.Mesh(
        track(new THREE.PlaneGeometry(4, 1)),
        track(new THREE.MeshBasicMaterial({ map: track(signTexture('Products coming soon', '#14141a', '#ffffff', 'Inter, sans-serif')) }))
      )
      empty.position.set(0, 2, -D / 2 + 0.05)
      room.add(empty)
    }

    /* ---------- CAMERA / CONTROLS ---------- */
    let mode = 'outside'
    const look = { yaw: 0, pitch: 0 }
    const eyeOutside = new THREE.Vector3(0, 1.7, 11)
    const eyeInside = new THREE.Vector3(0, 1.7, -60 + 4.5)
    camera.position.copy(eyeOutside)
    const target = { yaw: 0, pitch: 0 }

    const apply = () => {
      look.yaw += (target.yaw - look.yaw) * 0.18
      look.pitch += (target.pitch - look.pitch) * 0.18
      camera.rotation.order = 'YXZ'
      camera.rotation.y = look.yaw
      camera.rotation.x = Math.max(-0.6, Math.min(0.6, look.pitch))
    }

    const enter = () => {
      mode = 'inside'
      outside.visible = false
      room.visible = true
      camera.position.copy(eyeInside)
      target.yaw = 0
      target.pitch = 0
      look.yaw = 0
      look.pitch = 0
      scene.fog.near = 20
      scene.fog.far = 60
      setInside(true)
      setHint('Drag to look around. Tap a picture to see the product. Tap the exit door to leave.')
    }
    const leave = () => {
      mode = 'outside'
      room.visible = false
      outside.visible = true
      camera.position.copy(eyeOutside)
      target.yaw = 0
      target.pitch = 0
      look.yaw = 0
      look.pitch = 0
      scene.fog.near = 14
      scene.fog.far = 34
      setInside(false)
      setHint('Tap the door to walk in. Drag to look around.')
    }
    apiRef.current = { enter, leave }

    // pointer input
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let down = null
    const dom = renderer.domElement

    const onDown = (e) => {
      down = { x: e.clientX, y: e.clientY, tx: target.yaw, ty: target.pitch, moved: false }
      dom.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e) => {
      if (!down) return
      const dx = e.clientX - down.x
      const dy = e.clientY - down.y
      if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true
      const range = mode === 'outside' ? 0.7 : 1.9
      target.yaw = Math.max(-range, Math.min(range, down.tx + dx * 0.005))
      target.pitch = Math.max(-0.5, Math.min(0.5, down.ty + dy * 0.004))
    }
    const onUp = (e) => {
      if (!down) return
      const wasTap = !down.moved
      down = null
      dom.releasePointerCapture?.(e.pointerId)
      if (!wasTap) return
      const rect = dom.getBoundingClientRect()
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      ray.setFromCamera(ndc, camera)
      const active = clickable.filter((o) => (mode === 'outside' ? o === door : o !== door))
      const hit = ray.intersectObjects(active, false)[0]
      if (!hit) return
      if (hit.object === door) enter()
      else if (hit.object === exitDoor) leave()
      else if (hit.object.userData.productId) propsRef.current.onOpenProduct(hit.object.userData.productId)
    }
    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerup', onUp)
    dom.addEventListener('pointercancel', onUp)

    const resize = () => {
      const w = el.clientWidth || 300
      const h = el.clientHeight || 300
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    let raf = 0
    let t = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      t += 0.016
      if (mode === 'outside') {
        door.material.emissiveIntensity = 0.18 + Math.sin(t * 2.4) * 0.12
      }
      apply()
      renderer.render(scene, camera)
    }
    loop()

    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      ro.disconnect()
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointercancel', onUp)
      disposables.forEach((d) => d && d.dispose && d.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement)
    }
    // The scene is built once per open; shop and products do not change while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="s3d" role="dialog" aria-modal="true" aria-label={`3D view of ${shop.name}`}>
      <div className="s3d-top">
        <button type="button" className="btn btn-glass" onClick={onClose}>
          <Icon name="x" size={18} /> Close 3D
        </button>
        {inside && (
          <button type="button" className="btn btn-glass" onClick={() => apiRef.current.leave()}>
            <Icon name="arrow-left" size={18} /> Exit shop
          </button>
        )}
      </div>
      <div className="s3d-canvas" ref={mount} />
      {!inside && (
        <button type="button" className="btn btn-accent btn-lg s3d-enter" onClick={() => apiRef.current.enter()}>
          Enter shop
        </button>
      )}
      <div className="s3d-hint">{hint}</div>
    </div>
  )
}
