import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Plataforma Jairo O D C",
  description:
    "Quais dados o aplicativo Plataforma Jairo O D C coleta, por que coleta, com quem compartilha e como apagá-los.",
};

const ATUALIZADO_EM = "11 de setembro de 2026";
const CONTATO = "jairooc19@gmail.com";

/**
 * 📄 POLÍTICA DE PRIVACIDADE (PJODC v10)
 * Local: apps/admin-web/src/app/privacidade/page.tsx
 *
 * ⚠️ ESTA PÁGINA EXISTE POR EXIGÊNCIA DA GOOGLE PLAY CONSOLE. Todo app que
 * coleta dado pessoal precisa informar uma URL pública de política de
 * privacidade, e o `apps/mobile-app` coleta.
 *
 * ⚠️ O CONTEÚDO DESCREVE O QUE O CÓDIGO FAZ, e a v10 mudou três afirmações que
 * antes NÃO ERAM VERDADE:
 *
 *   1. "só vê os dados das empresas às quais você tem vínculo" — até a v9 uma
 *      policy `USING (true)` deixava qualquer pessoa ler a lista inteira de
 *      usuários. A regra foi substituída por `can_view_user_profile()`.
 *   2. "as credenciais ficam no armazenamento protegido do sistema" — até a v9 a
 *      sessão do aplicativo era gravada no AsyncStorage, que a documentação do
 *      React Native descreve como NÃO criptografado. Agora vai no SecureStore
 *      (Keychain no iOS, Keystore no Android), em pedaços.
 *   3. O registro de alterações (auditoria) passou a existir, e está declarado
 *      abaixo — omitir seria tão errado quanto declarar coleta que não existe.
 *
 * ⚠️ O formulário *Data safety* da Play Console precisa continuar batendo com
 * esta página.
 *
 * 📱 ELA PRECISA SER LEGÍVEL NO CELULAR. O revisor da Play Store abre este link
 * no telefone. Por isso `/privacidade` está em `ROTAS_SEM_BLOQUEIO`.
 */
export default function PoliticaDePrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Aplicativo <strong>Plataforma Jairo O D C</strong> · Atualizada em {ATUALIZADO_EM}
        </p>
      </header>

      <div className="space-y-10 py-10 text-[15px] leading-relaxed text-slate-700">
        <Secao titulo="Quem somos">
          <p>
            A Plataforma Jairo O D C é um sistema de gestão multiempresa. Esta política descreve
            como o aplicativo móvel e o painel web tratam os dados de quem os utiliza. O
            responsável pelo tratamento pode ser contactado pelo e-mail{" "}
            <a className="font-semibold text-blue-700 underline" href={`mailto:${CONTATO}`}>
              {CONTATO}
            </a>
            .
          </p>
        </Secao>

        <Secao titulo="Que dados coletamos">
          <p>Coletamos apenas o necessário para identificar você e vinculá-lo à sua empresa:</p>
          <Lista
            itens={[
              <>
                <strong>E-mail e nome completo</strong> — informados por você no cadastro ou
                fornecidos pela sua Conta Google quando você escolhe entrar pelo Google.
              </>,
              <>
                <strong>Localização declarada</strong> — planeta, país, estado e cidade, digitados
                por você. Não usamos o GPS nem qualquer localização automática do aparelho.
              </>,
              <>
                <strong>Dados da conta</strong> — o tipo de acesso (proprietário, dependente),
                a situação da conta, as empresas às quais você está vinculado e a data de criação.
              </>,
              <>
                <strong>Senha</strong> — apenas para quem entra por e-mail e senha. Ela é guardada
                de forma cifrada pelo nosso provedor de autenticação e não é legível por nós.
              </>,
              <>
                <strong>Registro de alterações</strong> — quando um dado do seu cadastro ou da sua
                empresa muda, guardamos o que mudou, quando e quem alterou. É o que permite
                investigar um erro e é exigência básica de um sistema que lida com dinheiro.
              </>,
            ]}
          />
        </Secao>

        <Secao titulo="O que NÃO coletamos">
          <Lista
            itens={[
              <>
                <strong>Nenhum dado biométrico.</strong> Quando você usa impressão digital ou
                reconhecimento facial para abrir o aplicativo, quem confere é o sistema operacional
                do seu aparelho, que nos devolve apenas &quot;autorizado&quot; ou &quot;negado&quot;.
                A biometria nunca sai do aparelho e nunca chega aos nossos servidores.
              </>,
              <>
                <strong>Nenhuma localização por GPS</strong>, nenhum acesso a contatos, câmera,
                microfone, fotos, arquivos, agenda ou lista de aplicativos instalados.
              </>,
              <>
                <strong>Nenhum rastreamento publicitário.</strong> O aplicativo não exibe anúncios,
                não usa identificadores de publicidade e não possui SDK de terceiros para
                analytics. Os eventos de uso ficam apenas no registro local do próprio aparelho,
                para depuração, e não são enviados a lugar nenhum.
              </>,
            ]}
          />
        </Secao>

        <Secao titulo="Quem enxerga os seus dados">
          <p>
            O seu perfil é visível para você, para o proprietário da empresa em que você trabalha,
            para os colaboradores que você mesmo vincula (quando você é o proprietário) e para o
            administrador da plataforma. Essa regra é aplicada pelo banco de dados, e não apenas
            pela tela: um pedido que não se encaixe nela é recusado antes de devolver qualquer
            informação.
          </p>
        </Secao>

        <Secao titulo="Por que usamos esses dados">
          <Lista
            itens={[
              "Autenticar você e manter a sua sessão aberta.",
              "Mostrar apenas os dados das empresas às quais você tem vínculo.",
              "Permitir que o administrador da plataforma libere o seu acesso.",
              "Registrar quem alterou o quê, para investigação de erros e segurança.",
              "Entrar em contacto sobre a sua conta, quando necessário.",
            ]}
          />
          <p className="mt-4">
            Não vendemos, alugamos nem cedemos os seus dados a terceiros para fins comerciais, de
            marketing ou de publicidade.
          </p>
        </Secao>

        <Secao titulo="Com quem compartilhamos">
          <p>Apenas com dois prestadores de serviço, e apenas no que cada um precisa para funcionar:</p>
          <Lista
            itens={[
              <>
                <strong>Supabase</strong> — hospeda o banco de dados e o serviço de autenticação.
                É onde os dados descritos acima ficam guardados.
              </>,
              <>
                <strong>Google</strong> — apenas quando você escolhe entrar com a sua Conta Google.
                O Google nos informa o seu e-mail e o seu nome; nós não recebemos a sua senha do
                Google nem temos acesso a qualquer outro dado da sua conta.
              </>,
            ]}
          />
          <p className="mt-4">
            Também podemos divulgar dados quando formos legalmente obrigados a isso por autoridade
            competente.
          </p>
        </Secao>

        <Secao titulo="Onde os dados ficam no seu aparelho">
          <p>
            O aplicativo guarda no próprio aparelho as credenciais da sua sessão e a empresa
            selecionada, para que você não precise entrar de novo a cada abertura. Esses dados
            ficam no armazenamento seguro do sistema operacional — Keychain no iOS e Keystore no
            Android —, protegidos por criptografia do próprio aparelho, e são apagados quando você
            sai da conta ou desinstala o aplicativo.
          </p>
        </Secao>

        <Secao titulo="Por quanto tempo guardamos">
          <p>
            Enquanto a sua conta existir. Ao apagar a conta, os dados descritos nesta política são
            removidos em definitivo, conforme a seção seguinte. O registro de alterações guarda o
            histórico das mudanças feitas antes da exclusão, sem os seus dados de contacto.
          </p>
        </Secao>

        <Secao titulo="Como apagar a sua conta e os seus dados">
          <p>Você pode apagar a sua conta a qualquer momento, sem pedir autorização a ninguém:</p>
          <ol className="mt-3 list-decimal space-y-2 pl-6">
            <li>Abra o aplicativo e entre na sua conta.</li>
            <li>
              Vá até a aba <strong>Perfil</strong>.
            </li>
            <li>
              Toque em <strong>Apagar conta</strong> e confirme.
            </li>
          </ol>
          <p className="mt-4">
            A exclusão é imediata e definitiva: o seu perfil, os seus vínculos com empresas e a sua
            credencial de acesso são removidos, e não há como recuperá-los depois.
          </p>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Exceção:</strong> se você for o proprietário de uma empresa cadastrada, a
            exclusão é recusada — apagá-la deixaria a empresa e os acessos dos seus dependentes sem
            responsável. Nesse caso, escreva para{" "}
            <a className="font-semibold underline" href={`mailto:${CONTATO}`}>
              {CONTATO}
            </a>{" "}
            para que a propriedade seja transferida antes da exclusão.
          </div>
          <p className="mt-4">
            Se preferir, também pode solicitar a exclusão diretamente por e-mail, a partir do
            endereço cadastrado na sua conta.
          </p>
        </Secao>

        <Secao titulo="Os seus direitos">
          <p>
            Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode confirmar
            a existência de tratamento, acessar os seus dados, corrigi-los, solicitar a sua
            exclusão e revogar o consentimento. O acesso e a correção estão disponíveis na própria
            aba <strong>Perfil</strong> do aplicativo; para os demais pedidos, use o e-mail de
            contacto.
          </p>
        </Secao>

        <Secao titulo="Crianças">
          <p>
            A plataforma é destinada ao uso profissional por maiores de 18 anos e não é dirigida a
            crianças. Não coletamos dados de menores de forma consciente.
          </p>
        </Secao>

        <Secao titulo="Alterações desta política">
          <p>
            Se esta política mudar, a data de atualização no topo desta página será alterada. Se a
            mudança afetar de forma relevante como tratamos os seus dados, avisaremos dentro do
            aplicativo.
          </p>
        </Secao>

        <Secao titulo="Contacto">
          <p>
            Dúvidas, pedidos de acesso ou de exclusão:{" "}
            <a className="font-semibold text-blue-700 underline" href={`mailto:${CONTATO}`}>
              {CONTATO}
            </a>
          </p>
        </Secao>
      </div>
    </main>
  );
}

/** Título e corpo de uma seção. Existe para não repetir as classes em doze blocos. */
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-black uppercase tracking-tight text-slate-900">{titulo}</h2>
      {children}
    </section>
  );
}

/** Lista de tópicos. Aceita texto ou JSX, porque vários itens têm trechos em negrito. */
function Lista({ itens }: { itens: React.ReactNode[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {itens.map((item, indice) => (
        <li key={indice} className="flex gap-2">
          <span aria-hidden className="mt-[2px] text-blue-600">
            •
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
