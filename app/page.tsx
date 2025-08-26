import GameCard from '../components/GameCard'

export default function Home() {
  return (
    <div className="space-y-8">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Team Trust — Virtual Escape Room</h1>
        <p className="mt-2 text-slate-600">Choose a scenario and build trust as a team. Signal Relay is live; other scenarios are coming soon.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <GameCard
          title="Signal Relay"
          description="A cooperative radio-ops exercise where players describe fragments of a target pattern to align dials and lock channels. Best for 3-6 players."
          href="/rooms/new"
        />

        <GameCard
          title="Bridge Builders"
          description="(Coming soon) Coordinate as Architect, Builder and Inspector to safely span the gap."
          comingSoon
        />

        <GameCard
          title="Vault Protocol"
          description="(Coming soon) Crack a three-lock vault with asymmetric clues spread across roles."
          comingSoon
        />
      </section>

      <footer className="mt-8 text-sm text-slate-500">Made for trust-building exercises • No account required</footer>
    </div>
  )
}
