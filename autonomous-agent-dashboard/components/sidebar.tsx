'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Zap,
  Settings,
  BarChart3,
  Bell,
  LogOut,
} from 'lucide-react';

const menuItems = [
  { icon: Home, label: 'Overview', href: '/dashboard' },
  { icon: Zap, label: 'Workflows', href: '/dashboard/workflows' },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside 
      className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r backdrop-blur-xl overflow-y-auto"
      style={{
        backgroundColor: '#06060e',
        borderColor: 'rgba(124,58,237,0.4)',
        boxShadow: '0 0 20px rgba(124,58,237,0.4), inset 0 0 10px rgba(124,58,237,0.2)',
      }}
    >
      <div className="p-6 space-y-8">
        {/* Menu Section */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'text-white border-l-4 border-purple-600'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: 'rgba(124, 58, 237, 0.12)',
                        boxShadow: 'inset 0 0 20px rgba(124,58,237,0.05)',
                      }
                    : undefined
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-purple-900/20 to-transparent" />

        {/* Bottom Section */}
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-purple-900/10 transition-all">
            <Bell className="w-5 h-5" />
            <span className="font-medium">Notifications</span>
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400/70 hover:text-red-300 hover:bg-red-900/10 transition-all">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Floating Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-600/5 to-transparent pointer-events-none" />
    </aside>
  );
}
