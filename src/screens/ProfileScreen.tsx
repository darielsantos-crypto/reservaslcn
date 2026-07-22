import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { ROLE_LABELS } from '@/lib/nav';

export function ProfileScreen() {
  const { profile, refreshProfile } = useAuth();
  const [full_name, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [state, setState] = useState(profile?.state ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!profile) return;
    setSaving(true);
    await supabase.from('travel_app_profiles').update({ full_name, phone, city, state, updated_at: new Date().toISOString() }).eq('id', profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!profile) return null;

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Meu perfil</h1>
      <Card>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-[#004883]/10 text-[#004883] flex items-center justify-center text-lg font-semibold">
              {full_name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{profile.email}</p>
              <p className="text-sm text-gray-500">{ROLE_LABELS[profile.role]}</p>
            </div>
          </div>
          <Field label="Nome completo"><Input value={full_name} onChange={(e) => setFullName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label="Matrícula"><Input value={profile.registration ?? ''} disabled /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            <Field label="Estado"><Input value={state} onChange={(e) => setState(e.target.value)} /></Field>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save} loading={saving}>Salvar alterações</Button>
            {saved && <span className="text-sm text-emerald-600">Salvo!</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
