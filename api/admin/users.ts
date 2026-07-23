/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';

type Role = 'solicitante' | 'gestao_viagens' | 'super_admin';

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  if (!['POST', 'DELETE'].includes(req.method)) {
    return json(res, 405, { error: 'Método não permitido.' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  const authHeader = req.headers.authorization ?? '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!supabaseUrl || !serviceRoleKey) {
    const missing = [
      !supabaseUrl ? 'SUPABASE_URL' : null,
      !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
    ].filter(Boolean);
    return json(res, 500, {
      error: `Variáveis de servidor não configuradas na Vercel: ${missing.join(', ')}.`,
      missing,
    });
  }
  if (!accessToken) return json(res, 401, { error: 'Sessão não informada.' });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) return json(res, 401, { error: 'Sessão inválida ou expirada.' });

  const { data: actor, error: actorError } = await admin
    .from('travel_app_profiles')
    .select('id, role, active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (actorError || !actor || !actor.active || !['gestao_viagens', 'super_admin'].includes(actor.role)) {
    return json(res, 403, { error: 'Você não possui permissão para gerenciar usuários.' });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const role: Role = body.role ?? 'solicitante';
    if (!body.email || !body.password || !body.full_name) {
      return json(res, 400, { error: 'Nome, e-mail e senha temporária são obrigatórios.' });
    }
    if (role === 'super_admin' && actor.role !== 'super_admin') {
      return json(res, 403, { error: 'Somente o Super Administrador pode criar outro Super Administrador.' });
    }

    const normalizedEmail = String(body.email).trim().toLowerCase();
    let authUserId = '';
    let createdNewAuthUser = false;

    // O Auth é compartilhado com outros sistemas. Se o e-mail já existir,
    // apenas vinculamos o usuário ao módulo de Viagens e preservamos sua senha.
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return json(res, 400, { error: listError.message, stage: 'auth.listUsers' });
    const existing = listed.users.find((user) => user.email?.toLowerCase() === normalizedEmail);

    if (existing) {
      authUserId = existing.id;
      const { data: existingTravelProfile } = await admin
        .from('travel_app_profiles')
        .select('id')
        .eq('id', existing.id)
        .maybeSingle();
      if (existingTravelProfile) {
        return json(res, 409, { error: 'Este e-mail já está cadastrado no sistema de Viagens.' });
      }
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: String(body.password),
        email_confirm: true,
        user_metadata: { full_name: body.full_name },
      });
      if (createError || !created.user) {
        return json(res, 400, { error: createError?.message ?? 'Não foi possível criar o usuário no Supabase Auth.', stage: 'auth.createUser' });
      }
      authUserId = created.user.id;
      createdNewAuthUser = true;
    }

    const { error: profileError } = await admin.from('travel_app_profiles').insert({
      id: authUserId,
      full_name: String(body.full_name).trim(),
      registration: body.registration || null,
      email: normalizedEmail,
      phone: body.phone || null,
      position: body.position || null,
      city: body.city || null,
      state: body.state || null,
      role,
      active: true,
      created_by: actor.id,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      if (createdNewAuthUser) await admin.auth.admin.deleteUser(authUserId);
      return json(res, 400, { error: `Não foi possível criar o perfil de Viagens: ${profileError.message}`, stage: 'profiles.insert' });
    }

    if (Array.isArray(body.worksiteIds) && body.worksiteIds.length) {
      const { error: worksiteError } = await admin.from('travel_app_user_worksites').insert(
        body.worksiteIds.map((worksite_id: string) => ({ user_id: authUserId, worksite_id })),
      );
      if (worksiteError) {
        await admin.from('travel_app_profiles').delete().eq('id', authUserId);
        if (createdNewAuthUser) await admin.auth.admin.deleteUser(authUserId);
        return json(res, 400, { error: `Não foi possível vincular as obras: ${worksiteError.message}`, stage: 'worksites.insert' });
      }
    }

    return json(res, 201, {
      ok: true,
      user_id: authUserId,
      existing_auth: !createdNewAuthUser,
      message: createdNewAuthUser
        ? 'Usuário criado com sucesso.'
        : 'Usuário vinculado ao sistema de Viagens. A senha já existente foi preservada.',
    });
  }

  const userId = String(req.query?.id ?? req.body?.id ?? '');
  if (!userId) return json(res, 400, { error: 'Usuário não informado.' });
  if (actor.role !== 'super_admin') {
    return json(res, 403, { error: 'Somente o Super Administrador pode remover usuários.' });
  }
  if (userId === actor.id) return json(res, 400, { error: 'Você não pode remover o próprio usuário.' });

  // Remove somente o acesso ao sistema de Viagens. A conta do Auth e qualquer
  // acesso a outros sistemas da Lucena permanecem intactos.
  const { error: profileDeleteError } = await admin.from('travel_app_profiles').delete().eq('id', userId);
  if (profileDeleteError) return json(res, 400, { error: profileDeleteError.message });
  return json(res, 200, { ok: true, message: 'Acesso removido somente do sistema de Viagens.' });
}
