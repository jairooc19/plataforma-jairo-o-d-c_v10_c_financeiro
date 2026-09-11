import { useCallback, useMemo, useState } from 'react';

/** Os nove campos do cadastro. Mesmo formato do `formData` da web. */
export interface AuthFormData {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  planet: string;
  country: string;
  state: string;
  city: string;
}

export const FORM_VAZIO: AuthFormData = {
  full_name: '',
  email: '',
  password: '',
  confirm_password: '',
  planet: 'TERRA',
  country: 'BRASIL',
  state: '',
  city: '',
};

/** Erros por campo. Ausente = campo válido (ou ainda não preenchido). */
export type AuthFormErrors = Partial<Record<keyof AuthFormData, string>>;

/**
 * Formato de e-mail: um `@`, algo antes, algo depois, e um ponto no domínio.
 *
 * ⚠️ DELIBERADAMENTE FROUXA. A validação rigorosa de e-mail (RFC 5322) é uma
 * expressão de centenas de caracteres que rejeita endereços válidos e aceita
 * inválidos assim mesmo. O único teste que decide de verdade é a entrega — o
 * que esta checagem faz é pegar o erro de digitação óbvio antes da ida à rede.
 */
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Mínimo exigido pelo GoTrue. Falhar aqui evita uma ida inútil ao servidor. */
const TAMANHO_MINIMO_SENHA = 6;

/**
 * 📝 ESTADO E VALIDAÇÃO DO FORMULÁRIO DE AUTENTICAÇÃO (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useAuthForm.ts
 *
 * Fatiado do `useAuthLogicMobile` por responsabilidade: aqui mora só o que o
 * usuário digitou e se aquilo tem forma válida. Quem decide o que fazer com
 * isso é o hook principal.
 *
 * 🔤 NORMALIZAÇÃO IGUAL À DA WEB, e ela não é cosmética: o e-mail vai para
 * minúsculas porque o GoTrue trata `Joao@x.com` e `joao@x.com` como contas
 * diferentes no cadastro mas casa por minúsculas no login; os campos de
 * localização vão para maiúsculas porque é assim que o banco os guarda
 * (`country` tem default `'BRASIL'`) e é assim que o `COUNTRIES`/`BRAZIL_STATES`
 * do Core entrega os valores. Gravar 'Brasil' criaria uma segunda grafia do
 * mesmo país, invisível até alguém filtrar por ela.
 *
 * 🧹 TROCAR DE ESTADO LIMPA A CIDADE. Sem isso o usuário escolhe SÃO PAULO/
 * CAMPINAS, muda a UF para BAHIA e fica com CAMPINAS gravada — uma combinação
 * que não existe e que o formulário aceitaria em silêncio.
 *
 * ⚠️ A VALIDAÇÃO DAQUI NÃO É A DE VERDADE, e tratá-la como tal seria um erro de
 * segurança. O banco tem `country NOT NULL`, o GoTrue exige seis caracteres e o
 * `profileService` confere os cinco campos do perfil. Esta camada existe para
 * ANTECIPAR o erro no campo onde ele nasceu, poupando uma ida à rede e um
 * balão vermelho genérico no topo do cartão. Quem chegar por outro caminho
 * esbarra nas mesmas regras, do lado do servidor.
 *
 * 🔇 ERRO SÓ APARECE EM CAMPO PREENCHIDO. Acusar "e-mail inválido" no primeiro
 * caractere digitado é ralhar com quem ainda está escrevendo. Campo vazio é
 * "incompleto", não "errado" — e a diferença entre os dois é o que `errors`
 * (o que está errado) e `podeEnviarCadastro` (o que ainda falta) separam.
 */
export function useAuthForm() {
  const [formData, setFormData] = useState<AuthFormData>(FORM_VAZIO);

  const handleInputChange = useCallback((name: keyof AuthFormData, value: string) => {
    let finalValue = value;
    if (name === 'email') finalValue = value.toLowerCase();
    else if (['planet', 'country', 'state', 'city', 'full_name'].includes(name)) {
      finalValue = value.toUpperCase();
    }

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
      ...(name === 'state' ? { city: '' } : {}),
    }));
  }, []);

  /** Preenche o formulário com o que o perfil já tem (fluxo do Google). */
  const preencherDoPerfil = useCallback((parcial: Partial<AuthFormData>) => {
    setFormData((prev) => ({ ...prev, ...parcial }));
  }, []);

  const resetForm = useCallback(() => setFormData(FORM_VAZIO), []);

  /** Erros de forma, recalculados só quando o formulário muda. */
  const errors = useMemo<AuthFormErrors>(() => {
    const achados: AuthFormErrors = {};

    if (formData.email.trim() && !FORMATO_EMAIL.test(formData.email.trim())) {
      achados.email = 'E-mail inválido.';
    }

    if (formData.password && formData.password.length < TAMANHO_MINIMO_SENHA) {
      achados.password = `Mínimo de ${TAMANHO_MINIMO_SENHA} caracteres.`;
    }

    if (formData.confirm_password && formData.password !== formData.confirm_password) {
      achados.confirm_password = 'As senhas não coincidem.';
    }

    // Nome de uma palavra só quase sempre é o primeiro nome — o banco guarda
    // `full_name`, e um "JOÃO" solto não identifica ninguém numa lista de membros.
    const nome = formData.full_name.trim();
    if (nome && !nome.includes(' ')) {
      achados.full_name = 'Informe o nome completo.';
    }

    return achados;
  }, [formData]);

  const temErros = Object.keys(errors).length > 0;

  /** Login: bastam e-mail e senha preenchidos e sem erro de forma. */
  const podeEnviarLogin =
    !!formData.email.trim() && !!formData.password && !errors.email && !errors.password;

  /** Cadastro: os nove campos obrigatórios, sem erro de forma. */
  const podeEnviarCadastro =
    !!formData.full_name.trim() &&
    !!formData.email.trim() &&
    !!formData.password &&
    !!formData.confirm_password &&
    !!formData.country.trim() &&
    !temErros;

  /** Completar perfil: cinco campos, sem e-mail e sem senha. */
  const podeEnviarPerfil =
    !!formData.full_name.trim() &&
    !!formData.planet.trim() &&
    !!formData.country.trim() &&
    !!formData.state.trim() &&
    !!formData.city.trim() &&
    !errors.full_name;

  return {
    formData,
    handleInputChange,
    preencherDoPerfil,
    resetForm,
    errors,
    temErros,
    podeEnviarLogin,
    podeEnviarCadastro,
    podeEnviarPerfil,
  };
}
