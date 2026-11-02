import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"

/** A decorative scene: load assets locally, bound GPU cost, and stop offscreen. */
export function mountSeaScene(canvas: HTMLCanvasElement): void {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    })
  } catch {
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100)
  camera.position.set(0, 8, 14)
  camera.lookAt(0, 0, 0)
  scene.add(new THREE.HemisphereLight(0xc5f1ff, 0x173b4d, 2.1))
  const sun = new THREE.DirectionalLight(0xffefcc, 2.4)
  sun.position.set(-5, 10, 8)
  scene.add(sun)

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 28, 48, 36),
    new THREE.MeshStandardMaterial({
      color: 0x116780,
      roughness: 0.65,
      metalness: 0.12,
      flatShading: true,
    }),
  )
  sea.rotation.x = -Math.PI / 2
  sea.position.y = -0.4
  scene.add(sea)
  const positions = sea.geometry.attributes.position
  const base = Float32Array.from(positions.array)
  const loader = new GLTFLoader()
  let disposed = false
  let horizontalScale = 1
  const placed: Array<{ object: THREE.Object3D; x: number; z: number }> = []
  const loadModel = async (
    name: string,
    size: number,
    x: number,
    y: number,
    z: number,
  ): Promise<THREE.Group | null> => {
    try {
      const { scene: model } = await loader.loadAsync(`/models/${name}.glb`)
      if (disposed) return null
      const box = new THREE.Box3().setFromObject(model)
      const dimensions = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const factor = size / Math.max(dimensions.x, dimensions.y, dimensions.z)
      model.position.copy(center).multiplyScalar(-factor)
      model.scale.setScalar(factor)
      const group = new THREE.Group()
      group.add(model)
      group.position.set(
        x * horizontalScale,
        y,
        z - (horizontalScale < 1 ? 4 : 0),
      )
      group.scale.setScalar(horizontalScale < 1 ? 0.7 : 1)
      scene.add(group)
      placed.push({ object: group, x, z })
      renderer.render(scene, camera)
      return group
    } catch (error) {
      console.warn(`Unable to load ${name} model`, error)
      return null
    }
  }
  let wave: THREE.Group | null = null
  void loadModel("wave", 4.8, -8.2, -0.5, -1.3).then((model) => {
    wave = model
  })
  void loadModel("rock", 2.3, 8.3, 0, -1.2)
  void loadModel("rock", 1.4, -8.1, -0.15, 2.2)
  void loadModel("lighthouse", 3.7, 8.4, 1.0, -2.6)
  let dolphin: THREE.Group | null = null
  void loadModel("dolphin", 1.6, -2, 0, 1.8).then((model) => {
    dolphin = model
  })

  // A small original low-poly character, with the logo's blue split tail.
  const mermaid = new THREE.Group()
  const skin = new THREE.MeshStandardMaterial({
    color: 0xe5ae8d,
    flatShading: true,
  })
  const hair = new THREE.MeshStandardMaterial({
    color: 0x173845,
    flatShading: true,
  })
  const tail = new THREE.MeshStandardMaterial({
    color: 0x2b9ac4,
    metalness: 0.18,
    roughness: 0.45,
    flatShading: true,
  })
  const part = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mermaid.add(mesh)
    return mesh
  }
  part(new THREE.SphereGeometry(0.28, 8, 6), skin, 0, 1.22, 0)
  part(new THREE.SphereGeometry(0.31, 8, 6), hair, 0, 1.3, -0.12)
  part(new THREE.ConeGeometry(0.29, 0.62, 7), skin, 0, 0.75, 0)
  const torso = part(new THREE.ConeGeometry(0.34, 0.8, 7), tail, 0, 0.15, 0)
  torso.rotation.z = Math.PI
  const armL = part(
    new THREE.CapsuleGeometry(0.075, 0.48, 3, 6),
    skin,
    -0.29,
    0.72,
    0,
  )
  armL.rotation.z = -0.65
  const armR = part(
    new THREE.CapsuleGeometry(0.075, 0.48, 3, 6),
    skin,
    0.29,
    0.72,
    0,
  )
  armR.rotation.z = 0.65
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x132932 })
  part(new THREE.SphereGeometry(0.025, 6, 4), eyeMaterial, -0.09, 1.25, 0.245)
  part(new THREE.SphereGeometry(0.025, 6, 4), eyeMaterial, 0.09, 1.25, 0.245)
  const flukeL = part(
    new THREE.ConeGeometry(0.25, 0.52, 4),
    tail,
    -0.22,
    -0.32,
    0,
  )
  flukeL.rotation.z = -1
  const flukeR = part(
    new THREE.ConeGeometry(0.25, 0.52, 4),
    tail,
    0.22,
    -0.32,
    0,
  )
  flukeR.rotation.z = 1
  mermaid.position.set(-7.4, 0.3, -1.8)
  mermaid.rotation.y = 0.35
  scene.add(mermaid)
  placed.push({ object: mermaid, x: -7.4, z: -1.8 })

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
  let visible = true
  let frame = 0
  let start = performance.now()
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    const aspect = width / height
    horizontalScale = aspect < 1 ? 0.38 : 1
    for (const { object, x, z } of placed) {
      object.position.x = x * horizontalScale
      object.position.z = z - (aspect < 1 ? 4 : 0)
      object.scale.setScalar(aspect < 1 ? 0.7 : 1)
    }
    const viewHeight = aspect < 1 ? 15 : 10
    camera.left = (-viewHeight * aspect) / 2
    camera.right = (viewHeight * aspect) / 2
    camera.top = viewHeight / 2
    camera.bottom = -viewHeight / 2
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    renderer.render(scene, camera)
  }
  const tick = (now: number) => {
    if (!visible || document.hidden || reduced.matches || disposed) {
      frame = 0
      return
    }
    const t = (now - start) / 1000
    for (let i = 0; i < positions.count; i++) {
      const j = i * 3
      positions.setZ(
        i,
        Math.sin(base[j]! * 0.7 + t * 0.7) * 0.13 +
          Math.cos(base[j + 1]! * 0.8 + t * 0.9) * 0.08,
      )
    }
    positions.needsUpdate = true
    sea.geometry.computeVertexNormals()
    mermaid.position.y = 0.3 + Math.sin(t * 1.2) * 0.08
    if (wave) {
      wave.position.y = -0.5 + Math.sin(t * 0.8) * 0.12
      wave.rotation.z = Math.sin(t * 0.6) * 0.035
    }
    if (dolphin) {
      const phase = (t % 8) / 8
      dolphin.position.x = (-2.8 + phase * 5.6) * horizontalScale
      dolphin.position.y =
        phase < 0.55 ? Math.sin((phase / 0.55) * Math.PI) * 1.7 - 0.3 : -0.55
      dolphin.rotation.z =
        phase < 0.55 ? 0.7 * Math.cos((phase / 0.55) * Math.PI) : 0
    }
    renderer.render(scene, camera)
    frame = requestAnimationFrame(tick)
  }
  const resume = () => {
    if (visible && !document.hidden && !reduced.matches && !frame) {
      start = performance.now()
      frame = requestAnimationFrame(tick)
    } else if (reduced.matches) renderer.render(scene, camera)
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    resume()
  })
  observer.observe(canvas)
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  document.addEventListener("visibilitychange", resume)
  reduced.addEventListener("change", resume)
  resize()
  resume()
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) return
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener("visibilitychange", resume)
      reduced.removeEventListener("change", resume)
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material]
        for (const material of materials) material.dispose()
      })
      renderer.dispose()
    },
    { once: true },
  )
}
