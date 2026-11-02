import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { balloonPath } from "./balloon-path"
import { oceanTileRadius } from "./ocean-layout"
import { sailboatFlagVertex } from "./sailboat-flag"
import { sailboatPath } from "./sailboat-path"
import { flapWing, seagullFlight } from "./seagull-flight"

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
  const oceanTiles = new THREE.Group()
  scene.add(oceanTiles)
  let oceanSource: THREE.Group | null = null
  let tileWidth = 0
  let tileDepth = 0
  let viewWidth = 16
  let tileRadius = -1
  const updateOceanTiles = () => {
    if (oceanSource === null || tileWidth <= 0 || tileDepth <= 0) return
    const radius = oceanTileRadius(viewWidth, tileWidth)
    if (radius === tileRadius) return
    tileRadius = radius
    oceanTiles.clear()
    // Extra depth covers the tilted camera's view of the water plane.
    for (let x = -radius; x <= radius; x++) {
      for (let z = -2; z <= 2; z++) {
        const tile = new THREE.Group()
        tile.position.set(x * tileWidth, -0.4, z * tileDepth)
        tile.scale.set(Math.abs(x) % 2 ? -1 : 1, 1, Math.abs(z) % 2 ? -1 : 1)
        tile.add(oceanSource.clone())
        oceanTiles.add(tile)
      }
    }
  }
  const oceanMeshes: Array<{
    geometry: THREE.BufferGeometry
    positions: THREE.BufferAttribute
    base: Float32Array
    scale: number
  }> = []
  void loader
    .loadAsync("/models/ocean.glb")
    .then(({ scene: ocean }) => {
      if (disposed) return
      const bounds = new THREE.Box3().setFromObject(ocean)
      const size = bounds.getSize(new THREE.Vector3())
      const center = bounds.getCenter(new THREE.Vector3())
      const scale = 12 / Math.max(size.x, size.z)
      ocean.position.copy(center).multiplyScalar(-scale)
      ocean.scale.setScalar(scale)
      ocean.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        const positions = object.geometry.getAttribute("position")
        if (!(positions instanceof THREE.BufferAttribute)) return
        positions.setUsage(THREE.DynamicDrawUsage)
        oceanMeshes.push({
          geometry: object.geometry,
          positions,
          base: Float32Array.from(positions.array),
          scale,
        })
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material]
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial)
            material.color.multiplyScalar(0.7)
        }
      })
      if (oceanMeshes.length === 0)
        throw new Error("Ocean model has no animatable mesh")
      // Mirror and slightly overlap the uneven model edges to avoid visible gaps.
      oceanSource = ocean
      tileWidth = size.x * scale * 0.98
      tileDepth = size.z * scale * 0.98
      updateOceanTiles()
      sea.visible = false
      renderer.render(scene, camera)
    })
    .catch((error: unknown) => {
      console.warn("Unable to load ocean model; using fallback water", error)
    })
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
      if (name === "island") {
        // The supplied island's Cylinder002 contains only its water and foam.
        const water = model.getObjectByName("Cylinder002")
        if (!water) throw new Error("Island water mesh was not found")
        water.removeFromParent()
        water.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          object.geometry.dispose()
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material]
          for (const material of materials) material.dispose()
        })
      }
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
  void loadModel("rock", 2.3, 4.2, 0, 2.5)
  void loadModel("rock", 1.4, -8.1, -0.15, 2.2)
  void loadModel("island", 4, -6.4, 0.25, -3.7)
  void loadModel("lighthouse", 3.7, 8.4, 1.0, -2.6)
  let balloon: THREE.Group | null = null
  void loadModel("balloon", 2.4, -5, 2.7, -2).then((model) => {
    balloon = model
  })
  const seagulls: Array<{
    group: THREE.Group
    index: number
    geometry: THREE.BufferGeometry
    positions: THREE.BufferAttribute
    base: Float32Array
  }> = []
  for (let index = 0; index < 5; index++) {
    const initial = seagullFlight(0, index, horizontalScale)
    void loadModel("seagull", 0.45, initial.x, initial.y, initial.z).then(
      (group) => {
        if (!group) return
        group.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          const positions = object.geometry.getAttribute("position")
          if (!(positions instanceof THREE.BufferAttribute)) return
          positions.setUsage(THREE.DynamicDrawUsage)
          seagulls.push({
            group,
            index,
            geometry: object.geometry,
            positions,
            base: Float32Array.from(positions.array),
          })
        })
      },
    )
  }
  let sailboat: THREE.Group | null = null
  let boatFlag: {
    geometry: THREE.BufferGeometry
    positions: THREE.BufferAttribute
    base: Float32Array
    mastX: number
  } | null = null
  const animateBoatFlag = (seconds: number) => {
    if (!boatFlag) return
    const { geometry, positions, base, mastX } = boatFlag
    for (let i = 0; i < positions.count; i++) {
      const offset = i * 3
      const { x, z } = sailboatFlagVertex(
        base[offset]!,
        base[offset + 2]!,
        mastX,
        seconds,
      )
      positions.setX(i, x)
      positions.setZ(i, z)
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
  }
  const boatStart = sailboatPath(0, horizontalScale)
  void loadModel("sailboat", 1.8, boatStart.x, 0.4, boatStart.z).then(
    (model) => {
      sailboat = model
      model?.traverse((object) => {
        if (
          !(object instanceof THREE.Mesh) ||
          Array.isArray(object.material) ||
          object.material.name !== "13___Default"
        )
          return
        const positions = object.geometry.getAttribute("position")
        if (!(positions instanceof THREE.BufferAttribute)) return
        positions.setUsage(THREE.DynamicDrawUsage)
        object.material.side = THREE.DoubleSide
        object.geometry.computeBoundingBox()
        const mastX = object.geometry.boundingBox?.min.x
        if (mastX === undefined) return
        boatFlag = {
          geometry: object.geometry,
          positions,
          base: Float32Array.from(positions.array),
          mastX,
        }
      })
      animateBoatFlag(0)
      renderer.render(scene, camera)
    },
  )

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
  let visible = true
  let frame = 0
  let elapsed = 0
  let lastFrame: number | null = null
  let boatPoseReady = false
  const waterRay = new THREE.Raycaster()
  const rayOrigin = new THREE.Vector3()
  const down = new THREE.Vector3(0, -1, 0)
  const waterHeight = (x: number, z: number) => {
    rayOrigin.set(x, 10, z)
    waterRay.set(rayOrigin, down)
    const surface = sea.visible ? sea : oceanTiles
    return waterRay.intersectObject(surface, true)[0]?.point.y ?? -0.4
  }
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
    viewWidth = viewHeight * aspect
    sea.scale.x = Math.max(1, (viewWidth + 4) / 36)
    updateOceanTiles()
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
      lastFrame = null
      return
    }
    const delta =
      lastFrame === null ? 0 : Math.min((now - lastFrame) / 1000, 0.1)
    if (lastFrame !== null) elapsed += (now - lastFrame) / 1000
    lastFrame = now
    const t = elapsed
    if (sea.visible) {
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
    }
    for (const ocean of oceanMeshes) {
      for (let i = 0; i < ocean.positions.count; i++) {
        const j = i * 3
        const x = ocean.base[j]! * ocean.scale
        const z = ocean.base[j + 2]! * ocean.scale
        const swell =
          Math.sin(x * 0.55 + z * 0.28 - t * 0.8) * 0.18 +
          Math.sin(z * 0.6 - x * 0.18 - t * 0.5) * 0.09
        ocean.positions.setY(i, ocean.base[j + 1]! + swell / ocean.scale)
      }
      ocean.positions.needsUpdate = true
      ocean.geometry.computeVertexNormals()
    }
    if (balloon) {
      const { x, y, rotationZ } = balloonPath(t, viewWidth)
      balloon.position.set(x, y, -2 - (horizontalScale < 1 ? 4 : 0))
      balloon.rotation.z = rotationZ
    }
    for (const bird of seagulls) {
      const flight = seagullFlight(t, bird.index, horizontalScale)
      bird.group.position.set(
        flight.x,
        flight.y,
        flight.z - (horizontalScale < 1 ? 4 : 0),
      )
      bird.group.rotation.set(flight.bank, flight.yaw, 0, "YXZ")
      for (let i = 0; i < bird.positions.count; i++) {
        const offset = i * 3
        const { y, z } = flapWing(
          bird.base[offset + 1]!,
          bird.base[offset + 2]!,
          flight.flap,
        )
        bird.positions.setY(i, y)
        bird.positions.setZ(i, z)
      }
      bird.positions.needsUpdate = true
      bird.geometry.computeVertexNormals()
    }
    if (sailboat) {
      animateBoatFlag(t)
      const { x, z, yaw } = sailboatPath(t, horizontalScale)
      // Sample the animated mesh, including its mirrored tiles and base geometry.
      scene.updateMatrixWorld(true)
      const forwardX = Math.cos(yaw) * 0.4
      const forwardZ = -Math.sin(yaw) * 0.4
      const center = waterHeight(x, z)
      const forward = waterHeight(x + forwardX, z + forwardZ)
      const side = waterHeight(x - forwardZ, z + forwardX)
      const size = sailboat.scale.y
      const targetY = Math.max(center, forward, side) + 0.9 * size
      const roll = THREE.MathUtils.clamp(
        Math.atan2(side - center, 0.4),
        -0.1,
        0.1,
      )
      const pitch = THREE.MathUtils.clamp(
        Math.atan2(forward - center, 0.4),
        -0.1,
        0.1,
      )
      const blend = boatPoseReady ? 1 - Math.exp(-delta * 2) : 1
      sailboat.position.set(
        x,
        THREE.MathUtils.lerp(sailboat.position.y, targetY, blend),
        z,
      )
      sailboat.rotation.order = "YXZ"
      sailboat.rotation.x = THREE.MathUtils.lerp(
        sailboat.rotation.x,
        roll,
        blend,
      )
      sailboat.rotation.y = yaw
      sailboat.rotation.z = THREE.MathUtils.lerp(
        sailboat.rotation.z,
        pitch,
        blend,
      )
      boatPoseReady = true
    }
    renderer.render(scene, camera)
    frame = requestAnimationFrame(tick)
  }
  const resume = () => {
    if (visible && !document.hidden && !reduced.matches && !frame) {
      lastFrame = null
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
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        geometries.add(object.geometry)
        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material]
        for (const material of meshMaterials) materials.add(material)
      })
      for (const geometry of geometries) geometry.dispose()
      for (const material of materials) material.dispose()
      renderer.dispose()
    },
    { once: true },
  )
}
