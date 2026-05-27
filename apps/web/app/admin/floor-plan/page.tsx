import FloorPlan from "../../../components/FloorPlan";

export default function FloorPlanPage() {
  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Live Floor Plan</h2>
      <p className="text-xs text-slate-400">
        Real-time gym map. Zones colour-fade by utilization. Each dot is a member currently in the zone — updates push live over WebSocket on every check-in/check-out.
      </p>
      <FloorPlan />
    </main>
  );
}
