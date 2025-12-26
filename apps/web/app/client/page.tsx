import MyPass from '../../components/MyPass';
import ClientXpTile from '../../components/ClientXpTile';

export default function ClientPage() {
  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Progress</h2>
        <div className="flex gap-2 text-xs text-slate-300">
          <a href="/client" className="rounded-full bg-surface px-3 py-1 hover:text-emerald-300">
            Overview
          </a>
          <a href="/client/classes" className="rounded-full bg-surface px-3 py-1 hover:text-emerald-300">
            Classes
          </a>
          <a href="/dashboard/wrapped" className="rounded-full bg-surface px-3 py-1 hover:text-emerald-300">
            Wrapped
          </a>
        </div>
      </div>
      <ClientXpTile />
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">My Pass</h3>
        <MyPass />
      </section>
    </main>
  );
}
