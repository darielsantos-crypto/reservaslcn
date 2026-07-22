import { useState } from 'react';
import { Plane, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

export function AuthScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setError(error);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-[#004883] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center">
            <Plane className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-lg leading-tight">Lucena Infraestrutura</p>
            <p className="text-sm text-white/70">Gestão de Viagens</p>
          </div>
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold leading-tight mb-3">
            Solicite, acompanhe e organize viagens corporativas com agilidade.
          </h1>
          <p className="text-white/80 max-w-md">
            Um sistema simples para registrar pedidos, verificar a política de viagens
            automaticamente e acompanhar cotações, compras e emissões.
          </p>
        </div>
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Building2 className="h-4 w-4" />
          <span>Política de Viagens Corporativas</span>
        </div>
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="absolute -left-16 -bottom-20 h-64 w-64 rounded-full bg-white/5" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-11 w-11 rounded-xl bg-[#004883] text-white flex items-center justify-center">
              <Plane className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 leading-tight">Lucena Infraestrutura</p>
              <p className="text-sm text-gray-500">Gestão de Viagens</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900">
Acessar sua conta
          </h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">
Entre para solicitar e acompanhar viagens.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <Field label="E-mail" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@lucena.com.br"
                required
              />
            </Field>
            <Field label="Senha" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </Field>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
Entrar
            </Button>
          </form>

          <p className="mt-5 text-sm text-center text-gray-500">
            O acesso é criado pela Gestão de Viagens ou pelo Super Administrador.
          </p>
        </div>
      </div>
    </div>
  );
}
