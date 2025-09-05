import Link from 'next/link';

export default function TopNav() {
  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold text-primary-700">IntegrityPlay</Link>
          <Link href="/dashboard" className="text-gray-700 hover:text-primary-700">Dashboard</Link>
          <Link href="/alerts" className="text-gray-700 hover:text-primary-700">Alerts</Link>
          <Link href="/cases" className="text-gray-700 hover:text-primary-700">Cases</Link>
          <Link href="/demo/sebi" className="text-gray-700 hover:text-primary-700">SEBI Demo</Link>
          <Link href="/settings" className="text-gray-700 hover:text-primary-700">Settings</Link>
        </div>
        <div className="text-sm text-gray-500">Demo</div>
      </div>
    </nav>
  );
}

