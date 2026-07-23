import { useState, type ReactNode } from 'react';
import { Plane, Menu, LogOut, Bell, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { NAV_ITEMS, ROLE_LABELS } from '@/lib/nav';
import { cn } from '@/lib/helpers';
import { useNotifications } from '@/lib/hooks';

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { route, navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { unread, notifications, markRead } = useNotifications();

  if (!profile) return null;

  const items = NAV_ITEMS.filter((n) => n.roles.includes(profile.role));
  const mobileItems = items.filter((n) => n.mobile).slice(0, 4);

  const initials = profile.full_name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  function go(id: string) {
    navigate(id);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen flex bg-[#f5f7fa]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-white border-r border-gray-200">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100">
          <div className="h-9 w-9 rounded-lg bg-[#004883] text-white flex items-center justify-center">
            <Plane className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-sm text-gray-900">Lucena</p>
            <p className="text-[11px] text-gray-500">Gestão de Viagens</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = route === item.id || (item.id === 'home' && route === 'overview' && profile.role === 'super_admin');
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#004883] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-[#004883]/10 text-[#004883] flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{profile.full_name}</p>
              <p className="text-[11px] text-gray-500">{ROLE_LABELS[profile.role]}</p>
            </div>
            <button onClick={signOut} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#004883] text-white flex items-center justify-center">
            <Plane className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">Lucena</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setNotifOpen(true)}
            className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 inset-y-0 w-[88vw] max-w-sm bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#004883] text-white flex items-center justify-center">
                  <Plane className="h-4 w-4" />
                </div>
                <span className="font-semibold text-sm">Lucena</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = route === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                      active ? 'bg-[#004883] text-white' : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="h-9 w-9 rounded-full bg-[#004883]/10 text-[#004883] flex items-center justify-center text-xs font-semibold">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{profile.full_name}</p>
                  <p className="text-[11px] text-gray-500">{ROLE_LABELS[profile.role]}</p>
                </div>
                <button onClick={signOut} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100">
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications drawer (mobile + desktop) */}
      {notifOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNotifOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100">
              <span className="font-semibold text-sm">Notificações</span>
              <button onClick={() => setNotifOpen(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-10">Sem notificações</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markRead(n.id);
                      if (n.link) navigate(n.link);
                      setNotifOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50',
                      !n.read && 'bg-blue-50/40'
                    )}
                  >
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Desktop topbar */}
        <header className="hidden lg:flex h-16 items-center justify-between px-6 bg-white border-b border-gray-200 sticky top-0 z-20">
          <h1 className="text-base font-semibold text-gray-900">
            {items.find((i) => i.id === route)?.label ?? 'Lucena'}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 pt-14 lg:pt-0 px-3 sm:px-5 lg:px-6 py-4 sm:py-5 pb-28 lg:pb-8 max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 safe-bottom">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}>
            {mobileItems.map((item) => {
              const Icon = item.icon;
              const active = route === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium',
                    active ? 'text-[#004883]' : 'text-gray-500'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate max-w-[78px]">{item.shortLabel ?? item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
