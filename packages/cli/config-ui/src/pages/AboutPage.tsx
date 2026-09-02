import { VERSION } from "../../../src/version"

export const AboutPage = (): React.ReactElement => (
  <section
    className="mx-auto max-w-2xl space-y-6 p-6"
    aria-labelledby="about-title"
  >
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-sky-400">
        Sireno Deck
      </p>
      <h1
        id="about-title"
        className="mt-2 text-3xl font-semibold text-neutral-100"
      >
        A tactile command center for your desktop.
      </h1>
    </div>
    <p className="text-sm leading-7 text-neutral-300">
      Sireno Deck is a local, config-driven controller for Elgato Stream Deck
      devices. It turns YAML into responsive button surfaces, addon workflows,
      themes, and navigable decks that work on hardware and in the browser.
    </p>
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
        <dt className="text-neutral-500">Author</dt>
        <dd className="mt-1 text-neutral-100">Sergio Carracedo</dd>
      </div>
      <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
        <dt className="text-neutral-500">Version</dt>
        <dd className="mt-1 font-mono text-neutral-100">{VERSION}</dd>
      </div>
      <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
        <dt className="text-neutral-500">License</dt>
        <dd className="mt-1 text-neutral-100">MIT</dd>
      </div>
      <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
        <dt className="text-neutral-500">Repository</dt>
        <dd className="mt-1">
          <a
            className="text-sky-400 hover:underline"
            href="https://github.com/sergiocarracedo/sireno-deck"
            target="_blank"
            rel="noreferrer"
          >
            github.com/sergiocarracedo/sireno-deck
          </a>
        </dd>
      </div>
    </dl>
  </section>
)
