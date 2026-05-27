import MyPass from '../../components/MyPass';
import ClientXpTile from '../../components/ClientXpTile';
import StreakBadge from '../../components/StreakBadge';
import TrainerLeaderboard from '../../components/TrainerLeaderboard';

export default function ClientPage() {
  return (
    <main className="space-y-6">
      <h2 className="text-xl font-semibold">My Progress</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <ClientXpTile />
        <StreakBadge />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">My Pass</h3>
        <MyPass />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <TrainerLeaderboard />
        <div className="rounded-2xl bg-surface p-4 text-xs text-slate-300">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Quick links</h3>
          <ul className="space-y-1.5">
            <li>📅 <a href="/client/classes" className="hover:text-emerald-300">Book a class</a></li>
            <li>📊 <a href="/client/metrics" className="hover:text-emerald-300">Log body metrics</a></li>
            <li>🤖 <a href="/client/workout-plan" className="hover:text-emerald-300">Generate AI workout plan</a></li>
            <li>🎁 <a href="/dashboard/wrapped" className="hover:text-emerald-300">View Wrapped</a></li>
          </ul>
        </div>
      </section>
    </main>
  );
}
