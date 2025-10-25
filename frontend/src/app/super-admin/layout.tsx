'use client';

/**
 * Super Admin Layout
 * Separate layout for super admin portal with its own navigation
 */

import { Building2, LayoutDashboard, Users, BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    title: 'Dashboard',
    href: '/super-admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Companies',
    href: '/super-admin/companies',
    icon: Building2,
  },
  {
    title: 'Platform Users',
    href: '/super-admin/users',
    icon: Users,
  },
  {
    title: 'Analytics',
    href: '/super-admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Settings',
    href: '/super-admin/settings',
    icon: Settings,
  },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-purple-900 to-purple-800 text-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-purple-700">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-yellow-400">⚡</span>
              Super Admin
            </h1>
            <p className="text-purple-200 text-sm mt-1">Platform Management</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <SuperAdminNavItem key={item.href} item={item} />
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-purple-700">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-purple-200 hover:text-white"
            >
              <span>← Back to App</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}

function SuperAdminNavItem({ item }: { item: typeof navItems[0] }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        isActive
          ? 'bg-purple-700 text-white shadow-lg'
          : 'text-purple-200 hover:bg-purple-700/50 hover:text-white'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{item.title}</span>
    </Link>
  );
}
