import { createClient } from '@supabase/supabase-js';

type Role = 'solicitante' | 'gestao_viagens' | 'super_admin';

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  if (!['POST', 'DELETE'].includes(req.method)) {
    return json(res, 405, { error: 'Método não permitido.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = req.headers.authorization ?? '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: 'Variáveis de servidor do Supabase não configuradas.' });
  }
  if (!accessToken) return json(res, 401, { error: 'Sessão não informada.' });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) return json(res, 401, { error: 'Sessão inválida ou expirada.' });

  const { data: actor, error: actorError } = await admin
    .from('profiles')
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

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: String(body.email).trim().toLowerCase(),
      password: String(body.password),
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
    });
    if (createError || !created.user) {
      return json(res, 400, { error: createError?.message ?? 'Não foi possível criar o usuário.' });
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: created.user.id,
      full_name: body.full_name,
      registration: body.registration || null,
      email: created.user.email,
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
      await admin.auth.admin.deleteUser(created.user.id);
      return json(res, 400, { error: profileError.message });
    }

    if (Array.isArray(body.worksiteIds) && body.worksiteIds.length) {
      await admin.from('user_worksites').insert(
        body.worksiteIds.map((worksite_id: string) => ({ user_id: created.user.id, worksite_id })),
      );
    }

    return json(res, 201, { ok: true, user_id: created.user.id });
  }

  const userId = String(req.query?.id ?? req.body?.id ?? '');
  if (!userId) return json(res, 400, { error: 'Usuário não informado.' });
  if (actor.role !== 'super_admin') {
    return json(res, 403, { error: 'Somente o Super Administrador pode excluir usuários.' });
  }
  if (userId === actor.id) return json(res, 400, { error: 'Você não pode excluir o próprio usuário.' });

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return json(res, 400, { error: error.message });
  return json(res, 200, { ok: true });
}
