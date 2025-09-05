type KpiCardProps = { title: string; value: string };
export default function KpiCard({ title, value }: KpiCardProps) {
  return (
    <div className="bg-white rounded p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

