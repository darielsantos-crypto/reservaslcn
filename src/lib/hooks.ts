import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { Notification } from './types';

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications((data as Notification[]) ?? []);
    setUnread((data as Notification[])?.filter((n) => !n.read).length ?? 0);
  }, [profile]);

  useEffect(() => {
    load();
    if (!profile) return;
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, load]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }, [profile]);

  return { notifications, unread, markRead, markAllRead, reload: load };
}

export async function notify(userId: string, title: string, body?: string, link?: string) {
  await supabase.from('notifications').insert({ user_id: userId, title, body, link });
}

export async function logAudit(
  userId: string,
  action: string,
  entity?: { type: string; id?: string },
  extra?: { previousStatus?: string; newStatus?: string; field?: string; justification?: string; observation?: string }
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: entity?.type,
    entity_id: entity?.id,
    previous_status: extra?.previousStatus,
    new_status: extra?.newStatus,
    field_changed: extra?.field,
    justification: extra?.justification,
    observation: extra?.observation,
  });
}

export async function appendStatus(
  requestId: string,
  userId: string,
  previous: string | null,
  next: string,
  note?: string
) {
  await supabase.from('status_history').insert({
    request_id: requestId,
    user_id: userId,
    previous_status: previous,
    new_status: next,
    note,
  });
}
