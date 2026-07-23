/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body));
}

function getBody(req: any): Record<string, any> {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function clean(value: unknown, max = 180): string {
  return String(value ?? '').trim().slice(0, max);
}

export default async function handler(req: any, res: any) {
  if (!['POST', 'GET', 'PATCH'].includes(req.method)) {
    return json(res, 405, { error: 'Método não permitido.' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: 'Variáveis de servidor do Supabase não configuradas.' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (req.method === 'POST') {
    const body = getBody(req);
    const requesterName = clean(body.requester_name);
    const email = clean(body.email).toLowerCase();
    const worksiteName = clean(body.worksite_name);
    const city = clean(body.city);
    const state = clean(body.state, 2).toUpperCase();

    if (!requesterName || !email || !worksiteName || !city || state.length !== 2) {
      return json(res, 400, {
        error: 'Preencha nome, e-mail, obra, cidade e a sigla do estado.',
      });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return json(res, 400, { error: 'Informe um e-mail válido.' });
    }

    const { data: existingProfile } = await admin
      .from('travel_app_profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (existingProfile) {
      return json(res, 409, { error: 'Este e-mail já possui acesso ao sistema de Viagens.' });
    }

    const { data: pending } = await admin
      .from('travel_app_access_requests')
      .select('id')
      .eq('status', 'pendente')
      .ilike('email', email)
      .maybeSingle();
    if (pending) {
      return json(res, 409, { error: 'Já existe uma solicitação de acesso pendente para este e-mail.' });
    }

    const { data, error } = await admin
      .from('travel_app_access_requests')
      .insert({
        requester_name: requesterName,
        registration: clean(body.registration, 80) || null,
        email,
        phone: clean(body.phone, 50) || null,
        position: clean(body.position, 120) || null,
        worksite_name: worksiteName,
        cost_center: clean(body.cost_center, 100) || null,
        city,
        state,
        status: 'pendente',
      })
      .select('id')
      .single();

    if (error) {
      return json(res, 400, { error: error.message });
    }

    return json(res, 201, {
      ok: true,
      id: data.id,
      message: 'Solicitação enviada. A Gestão de Viagens analisará o cadastro.',
    });
  }

  const authHeader = req.headers.authorization ?? '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!accessToken) return json(res, 401, { error: 'Sessão não informada.' });

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) return json(res, 401, { error: 'Sessão inválida ou expirada.' });

  const { data: actor } = await admin
    .from('travel_app_profiles')
    .select('id, role, active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!actor?.active || !['gestao_viagens', 'super_admin'].includes(actor.role)) {
    return json(res, 403, { error: 'Você não possui permissão para analisar solicitações de acesso.' });
  }

  if (req.method === 'GET') {
    const status = clean(req.query?.status || 'pendente', 20);
    const { data, error } = await admin
      .from('travel_app_access_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true });
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { items: data ?? [] });
  }

  const body = getBody(req);
  const id = clean(body.id, 80);
  const action = clean(body.action, 20);
  if (!id || !['aprovar', 'rejeitar'].includes(action)) {
    return json(res, 400, { error: 'Informe a solicitação e a ação.' });
  }

  const status = action === 'aprovar' ? 'aprovada' : 'rejeitada';
  const { error } = await admin
    .from('travel_app_access_requests')
    .update({
      status,
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
      review_notes: clean(body.review_notes, 500) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pendente');

  if (error) return json(res, 400, { error: error.message });
  return json(res, 200, { ok: true });
}
