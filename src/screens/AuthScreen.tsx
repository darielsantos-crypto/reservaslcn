import { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Plane,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';

type AccessForm = {
  requester_name: string;
  registration: string;
  email: string;
  phone: string;
  position: string;
  worksite_name: string;
  cost_center: string;
  city: string;
  state: string;
};

const EMPTY_ACCESS_FORM: AccessForm = {
  requester_name: '',
  registration: '',
  email: '',
  phone: '',
  position: '',
  worksite_name: '',
  cost_center: '',
  city: '',
  state: '',
};

export function AuthScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessForm, setAccessForm] = useState<AccessForm>(EMPTY_ACCESS_FORM);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessSuccess, setAccessSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setError(signInError);
    setLoading(false);
  }

  function openAccessRequest() {
    setAccessError(null);
    setAccessSuccess(false);
    setAccessForm(EMPTY_ACCESS_FORM);
    setAccessOpen(true);
  }

  async function submitAccessRequest() {
    setAccessError(null);
    if (
      !accessForm.requester_name.trim()
      || !accessForm.email.trim()
      || !accessForm.worksite_name.trim()
      || !accessForm.city.trim()
      || accessForm.state.trim().length !== 2
    ) {
      setAccessError('Preencha nome, e-mail, obra, cidade e a sigla do estado.');
      return;
    }

    setAccessLoading(true);
    try {
      const response = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...accessForm,
          email: accessForm.email.trim().toLowerCase(),
          state: accessForm.state.trim().toUpperCase(),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a solicitação.');
      setAccessSuccess(true);
    } catch (requestError) {
      setAccessError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar a solicitação.');
    } finally {
      setAccessLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#f4f6f8] lg:grid lg:grid-cols-2">
      <section className="relative hidden min-h-[100dvh] overflow-hidden bg-[#064f88] px-10 py-8 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Plane className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Lucena Infraestrutura</p>
            <p className="text-xs text-white/70">Gestão de Viagens</p>
          </div>
        </div>

        <div className="relative z-10 mt-20 max-w-xl xl:mt-24">
          <h1 className="text-3xl font-bold leading-tight xl:text-4xl">
            Gestão de Passagens e Hospedagens Lucena.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 xl:text-lg">
            Organize suas viagens com a Lucena de forma simples e centralizada. Solicite passagens e hospedagens, acompanhe os prazos e consulte cada etapa do processo, desde a solicitação até a emissão.
          </p>
        </div>

        <a
          href="/politica-de-viagens.pdf"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-8 left-10 z-20 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <FileText className="h-4 w-4" />
          Acesse aqui a Política de Viagens Corporativas
        </a>

        <img
          src="/assets/viajante-lucena.png"
          alt="Colaborador Lucena preparado para viajar"
          className="pointer-events-none absolute bottom-0 right-4 z-10 h-[55vh] max-h-[610px] w-auto object-contain xl:right-10 xl:h-[61vh]"
        />
      </section>

      <section className="flex min-h-[100dvh] items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:mb-10">
            <img
              src="/assets/logo-lucena.png"
              alt="Lucena Infraestrutura"
              className="h-auto w-48 object-contain sm:w-52"
            />
          </div>

          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-xl font-semibold text-gray-950">Acessar sua conta</h2>
            <p className="mt-1 text-sm text-gray-500">Entre para solicitar, acompanhar e organizar viagens.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="E-mail" required>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@lucena.com.br"
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Senha" required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  minLength={6}
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                  className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Entrar
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-800">Use o e-mail cadastrado para a sua obra.</p>
            <p className="mt-1 text-sm text-gray-500">Sua obra ainda não possui acesso?</p>
            <button
              type="button"
              onClick={openAccessRequest}
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#004883] hover:underline"
            >
              <UserPlus className="h-4 w-4" />
              Solicitar cadastro
            </button>
          </div>

          <a
            href="/politica-de-viagens.pdf"
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-[#004883] lg:hidden"
          >
            <FileText className="h-4 w-4" />
            Abrir Política de Viagens
          </a>
        </div>
      </section>

      <Modal
        open={accessOpen}
        onClose={() => setAccessOpen(false)}
        title="Solicitar acesso da obra"
        size="lg"
        footer={accessSuccess ? (
          <Button className="w-full sm:w-auto" onClick={() => setAccessOpen(false)}>Fechar</Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => setAccessOpen(false)}>Cancelar</Button>
            <Button loading={accessLoading} onClick={submitAccessRequest}>Enviar solicitação</Button>
          </>
        )}
      >
        {accessSuccess ? (
          <div className="flex min-h-72 flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Solicitação enviada</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">
              Seus dados estão em validação. Após a liberação, o acesso será criado e comunicado.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
              Informe os dados do responsável que fará as solicitações e da obra que precisa de acesso. O cadastro ficará sujeito à análise da Gestão de Viagens.
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Dados do solicitante</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Nome completo" required>
                    <Input value={accessForm.requester_name} onChange={(event) => setAccessForm({ ...accessForm, requester_name: event.target.value })} />
                  </Field>
                </div>
                <Field label="Matrícula">
                  <Input value={accessForm.registration} onChange={(event) => setAccessForm({ ...accessForm, registration: event.target.value })} />
                </Field>
                <Field label="Cargo ou função">
                  <Input value={accessForm.position} onChange={(event) => setAccessForm({ ...accessForm, position: event.target.value })} />
                </Field>
                <Field label="E-mail corporativo" required>
                  <Input type="email" value={accessForm.email} onChange={(event) => setAccessForm({ ...accessForm, email: event.target.value })} />
                </Field>
                <Field label="Telefone">
                  <Input inputMode="tel" value={accessForm.phone} onChange={(event) => setAccessForm({ ...accessForm, phone: event.target.value })} />
                </Field>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Dados da obra</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Nome da obra" required>
                    <Input value={accessForm.worksite_name} onChange={(event) => setAccessForm({ ...accessForm, worksite_name: event.target.value })} />
                  </Field>
                </div>
                <Field label="Centro de custo">
                  <Input value={accessForm.cost_center} onChange={(event) => setAccessForm({ ...accessForm, cost_center: event.target.value })} />
                </Field>
                <Field label="Cidade" required>
                  <Input value={accessForm.city} onChange={(event) => setAccessForm({ ...accessForm, city: event.target.value })} />
                </Field>
                <Field label="Estado" required>
                  <Input maxLength={2} value={accessForm.state} onChange={(event) => setAccessForm({ ...accessForm, state: event.target.value.toUpperCase() })} placeholder="MA" />
                </Field>
              </div>
            </div>

            {accessError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {accessError}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
