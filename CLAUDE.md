# CLAUDE.md — Plataforma Jairo O D C v10

Este arquivo é o guia de instruções para o Claude Code ao trabalhar neste repositório.
Leia-o integralmente antes de tocar em qualquer arquivo.

---

## ⚠️ Histórico de Mudanças

**2026-09-11 — v10: correções de segurança, integridade e documentação (degrau 3)**

A primeira mudança de COMPORTAMENTO da v10. Fecha os achados do estudo de
engenharia reversa (`_estudos/degrau-01-engenharia-reversa.html`) e prepara o
terreno para o módulo C FINANCEIRO. **Exige recriar o banco** (`00 → 01 → 02`) e
**criar o usuário do Desenvolvedor à mão** — ver o fim do `plataforma_02_seed.sql`.

| Frente | O que mudou |
|---|---|
| Banco | Schema reescrito: 5 tabelas (nova `audit_log`), 19 funções, 10 policies com `TO`, privilégios por coluna, `allowed_modules` virou `text[]`, datas com `now()`, `tenant_members` na publicação do Realtime |
| Autenticação | A credencial fixa `admin@pjodc.ia`/`1qaz` **deixou de existir**; o Desenvolvedor é um usuário real com `is_superuser` |
| Core | `supabaseAdmin` removido; `adminApiService` e `apiBaseUrl` apagados; novos `lib/dinheiro.ts`, `lib/datas.ts` e `constants/padroes.ts` |
| admin-web | As 9 rotas `/api/*` e as 3 Server Actions administrativas **foram apagadas**; `middleware.ts` virou `proxy.ts` |
| mobile-app | Sessão saiu do AsyncStorage para o SecureStore (em pedaços); telas de engenharia falam direto com o banco |
| Testes | `npm test` (node:test, sem dependências) e `supabase/testes/teste_rls.sql` |
| Git | Repositório iniciado; `master` = estado v10 renumerado (`d463721`), branch `degrau-03-correcoes` = estas mudanças (`2b9e42e`), depois integradas ao `master` e enviadas a `github.com/jairooc19/plataforma-jairo-o-d-c_v10_c_financeiro` |

⚠️ **AS ROTAS `/api/*` NÃO FORAM "PROTEGIDAS" — FORAM REMOVIDAS.** Autenticar seis
rotas que existiam só para carregar a chave mestra seria remendar: o desenho
certo é o banco decidir. Toda operação administrativa virou função `admin_*` com
`is_superuser()` conferido dentro do PostgreSQL. Se um dia uma rota HTTP voltar a
ser necessária, ela nasce com verificação de sessão — a ausência dela era o risco
nº 1 do repositório.

⚠️ **A CHAVE MESTRA NÃO ESTÁ MAIS NO CÓDIGO.** `SUPABASE_SERVICE_ROLE_KEY` saiu
dos `.env.example` e do Core. Ela ignora a RLS inteira; enquanto existir uma
variável que a aplicação lê, existe um caminho para vazá-la. Rotina de manutenção
que precise dela cria o cliente dentro do próprio script, no servidor.

⚠️ **O `role` DO CADASTRO ERA ESCOLHIDO PELO NAVEGADOR.** O gatilho
`handle_new_user` lia `raw_user_meta_data->>'role'`, que vai no corpo do
`signUp` — bastava mandar `role: 'active'` para nascer aprovado e pular a
triagem. Agora todo mundo nasce `pending`, e só o Desenvolvedor promove.

⚠️ **AS DATAS ESTAVAM 3 HORAS ATRASADAS.** `timezone('utc', now() AT TIME ZONE
'America/Sao_Paulo')` converte o fuso duas vezes. Virou `now()`. Para o módulo
financeiro isso importa: `timestamptz` guarda o INSTANTE e a conversão acontece
na exibição — ver `packages/core/src/lib/datas.ts`.

⚠️ **DINHEIRO SÓ EM CENTAVOS INTEIROS.** `packages/core/src/lib/dinheiro.ts` é a
base do C FINANCEIRO: `0.1 + 0.2` não dá `0.3` em ponto flutuante, e `10.10 * 3`
dá `30.299999999999997`. No banco, `numeric(14,2)` ou `bigint` — nunca
`real`/`double`.

⚠️ **O DESENVOLVEDOR NÃO ENTRA NA PRÓPRIA FILA DE TRIAGEM** (corrigido em
2026-09-11, durante os testes). Ele nasce `role = 'pending'` como todo mundo — o
gatilho ignora o papel enviado pelo cliente — e o passo manual do seed só marca
`is_superuser`. A tela classifica como "aguardando triagem" quem está `pending`
ou `user`, então a conta de serviço aparecia na própria fila, com o botão de
promover ao lado; promovê-la criaria uma empresa em nome dela, com
`is_client_owner = true`. O filtro (`WHERE u.is_superuser = false`) ficou dentro
de `admin_list_users()`, **não na tela**: web e aplicativo consomem a mesma
função, e filtrar na tela consertaria uma ponta só.

⚠️ **`git commit` NÃO PUBLICA NADA — QUEM PUBLICA É O `git push`** (lição de
2026-09-11). Entre o commit das correções e o envio ao GitHub, a Vercel seguiu
construindo o commit anterior, e os sintomas apontavam para todo lado menos para
a causa: o Painel de Engenharia **aceitava a senha fixa antiga** (`1qaz`) e
recusava a nova, e a "Triagem de Usuários" vinha vazia — porque a versão no ar
buscava a lista com a chave mestra, já removida da Vercel. Ao testar
comportamento novo em produção, confira antes qual commit foi construído
(`git log origin/master --oneline -1` contra o painel da Vercel).

⚠️ **O DOMÍNIO DA VERCEL É TRUNCADO, E O GOOGLE COMPARA CARACTERE A CARACTERE.**
O projeto publicado responde em `https://plataforma-jairo-o-d-c-v10-c-financ.vercel.app`
— não no nome completo que se supõe pelo nome do projeto. Registrar o nome
"esperado" nas Origens JavaScript do Google Cloud dá `Erro 400: origin_mismatch`,
e a mensagem de erro (base64 no parâmetro `authError` da URL) traz a origem exata
que o navegador enviou. É de lá que se tira o valor certo, não do palpite.

⚠️ **O QUE FOI E O QUE NÃO FOI TESTADO.** Na entrega (2026-09-11), nada havia
sido executado contra um banco real — não há `.env` nem projeto Supabase
alcançável a partir daqui. Foram validados `npm test` (19 testes), `tsc --noEmit`
nos dois apps, `eslint` e `npm run build` do admin-web.

Na mesma data, o dono do projeto publicou na Vercel e começou a validação real.
**Confirmado por ele, no ambiente publicado:**

- login do Proprietário por Google, fim a fim (depois de corrigir a origem
  JavaScript no Google Cloud — ver a armadilha do domínio truncado, acima);
- o usuário do Desenvolvedor existe com `is_superuser = true`;
- o usuário que entrou pelo Google nasce `role = 'pending'`, como o gatilho manda.

**Confirmado no banco real em 2026-09-12** (SQL Editor do Supabase, pelo dono do
projeto): `supabase/testes/teste_rls.sql` rodou e devolveu **PASSOU nos 10
testes** — inclusive o S3, a empresa criada pelo próprio cliente, que era o
buraco da v9. As funções `admin_*` existem e funcionam (habilitar/desabilitar
usuário e alterar `global_settings` exercitados pela tela).

**Continua pendente:** o build novo ainda não foi exercitado fim a fim; e **o
aplicativo não foi aberto em aparelho nem em emulador** — adiado sem previsão
(2026-09-12), porque o foco é o `apps/admin-web`.

⚠️ **`RAISE NOTICE` NÃO APARECE NO SQL EDITOR DO SUPABASE, E O SILÊNCIO PARECE
APROVAÇÃO.** A primeira versão do `teste_rls.sql` reportava os dez vereditos por
`RAISE NOTICE` dentro de blocos `DO` e terminava em `ROLLBACK`. No painel, o
resultado foi `Success. No rows returned`, com o botão de exportar desabilitado
— o editor exibe **apenas conjuntos de linhas** e descarta mensagens do servidor
(`NOTICE` só sai no `psql`). Ou seja: os testes rodaram e as respostas foram
jogadas fora, com aparência de sucesso. O arquivo foi reescrito para gravar cada
veredito numa tabela e terminar com um `SELECT`. O `BEGIN … ROLLBACK` teve de
sair junto: o rollback apagaria também as linhas de resultado — tabela
temporária e `SET` de sessão voltam atrás do mesmo jeito. A limpeza virou
explícita, idempotente, no início e no fim.

⚠️ **TESTE DE TRAVA NÃO PODE OLHAR SÓ PARA O ERRO.** A RLS recusa de dois modos:
levantando `42501` (privilégio de coluna ou de função) **ou em silêncio**,
descartando a linha que a policy não deixa passar. Um teste que só verifica "deu
exceção?" aprova o segundo caso sem perceber. Os testes 3 e 4 passaram a conferir
o **valor final** (`is_superuser` continuou `false`; a empresa pirata não existe),
e o 9 conta só os eventos da empresa criada pelo próprio teste — contar
`audit_log` inteiro o faria passar de graça com o uso normal da plataforma.

---

**2026-09-11 — v10: renumeração da versão (v9 → v10)**

Marco de versão, **sem mudança de comportamento**. Nada foi acrescentado, removido ou
reescrito na plataforma: o que mudou foram as strings de versão e os cabeçalhos que as
citam. É o primeiro passo do projeto **C FINANCEIRO**, que começa a partir desta versão.

| Onde | O que mudou |
|---|---|
| `packages/core/src/constants/versions.ts` | `WEB_VERSION = "v10 - 2026-09-11-01"` e `APP_VERSION = "v10 - 2026-09-11-02"` |
| `README.md`, `CLAUDE.md` | Título, bloco de versões, convenção de commit, "schema consolidado", "migrations de verdade (v10+)", cabeçalho de `criar-bd/` e da seção de segurança |
| `supabase/criar-bd/plataforma_*.sql` | Cabeçalhos e rodapé dos 3 arquivos (7 linhas) |
| `packages/core/src/services/platform/authService.ts` | Linha `Versão:` do cabeçalho |
| Comentários TSDoc (`PJODC v9` → `PJODC v10`) | 138 arquivos: 107 do `mobile-app`, 27 do `admin-web`, 4 do `packages/core` |

⚠️ **A troca foi feita por script, com contagem conferida ANTES de gravar.** Cada substituição
tinha um número esperado de ocorrências; se qualquer um divergisse, nada seria gravado. Foram
144 arquivos. Nenhum arquivo foi renomeado, então `supabase/config.toml` não precisou ser
tocado. O schema do banco não mudou: só comentários de cabeçalho.

⚠️ **ESTAS MENÇÕES A `v9` CONTINUAM DE PROPÓSITO** — elas registram *quando* a peça entrou, não
em que versão o repositório está:

- os marcadores `v9: [100% NATIVO — …]` e `v9: [OTIMIZADO PARA MÁXIMA PERFORMANCE]` e as frases
  "NA v9" / "Até a v9" — 54 menções em 46 arquivos do `mobile-app`;
- as entradas de histórico abaixo e as seções "Otimização v9", "Menus do sistema — v9",
  "Abas nativas — v9" e "Painel de Engenharia (v9)" deste arquivo;
- o `CLAUDE_CODE_MOBILE_PROMPT_01.md` inteiro (68 menções): ele descreve a entrega da v9;
- `apps/mobile-app/AGENTS.md`: o título "(v9)" da seção do Painel de Engenharia.

⚠️ **`https://plataforma-jairo-o-d-c-v9-admin-web.vercel.app` NÃO É CARIMBO, É ENDEREÇO.** Está
em `apps/mobile-app/AGENTS.md` e é o domínio publicado na Vercel, cadastrado nas Origens
JavaScript do Google. Trocar o texto não muda o domínio: só deixaria a documentação apontando
para um endereço que não existe.

⚠️ **Falsos positivos que uma busca cega por `v9` encontraria:** hashes `integrity` dos dois
`package-lock` e a coordenada SVG `m14 0V9` em `DeveloperDashboardView.tsx`. Na próxima
renumeração, busque por `PJODC v10`, não por `v10`.

⚠️ **Nada foi compilado nem executado.** A pasta está sem `node_modules`, então `tsc`, `lint` e
`build` não rodaram. O risco é baixo — só comentários e duas strings mudaram —, mas é uma
expectativa, não uma verificação.

⚠️ **A tabela de stack do `README.md` continua desatualizada** (React 19.1.0, Expo ~54, RN 0.81.5).
Ficou fora deste escopo, que era só a renumeração. Os campos `version` dos `package.json`
continuam alheios à versão da plataforma, como nas renumerações anteriores.

---

**2026-09-07 — v9: preparação para a primeira publicação na Google Play Store**

Auditoria do `apps/mobile-app` para publicação, com `npx expo-doctor` como referência
(passou de 19/21 para 20/21). Nenhuma mudança de comportamento do app.

| Onde | O que mudou |
|---|---|
| `app.json` | 3 chaves obsoletas removidas/migradas; `adaptiveIcon.backgroundColor` corrigido |
| `src/assets/images/*.png` | Os 4 assets **eram o placeholder do Expo** — substituídos pela marca |
| `apps/admin-web/src/app/privacidade/page.tsx` | ✨ **NOVA** — política de privacidade (exigida pela Play Console) |
| `apps/admin-web/src/lib/mobileBlock.ts` | `ROTAS_SEM_BLOQUEIO` — isenta `/privacidade` do overlay |
| Variáveis do EAS | 3 criadas em `production` e 3 em `preview` (fora do repositório) |

⚠️ **O `.env` NÃO CHEGA AO EAS BUILD, E O APP FALHA EM SILÊNCIO.** `.gitignore` linha 45
(`**/.env*`) ignora `apps/mobile-app/.env`, e o EAS sobe a cópia versionada do projeto. No
development build isso nunca apareceu porque o bundle vem do Metro **na sua máquina**, que lê
o `.env` local; no build de produção o bundle é gerado nos servidores da Expo, sem ele. E o
`packages/core/src/lib/supabase.ts` cai em `https://placeholder.supabase.co` / `placeholder-key`
quando as variáveis faltam — ou seja: **o app compila, instala, abre e falha em todo login**,
sem erro de configuração em lugar nenhum. Resolvido com variáveis de ambiente do EAS
(`eas env:set`), não com um bloco `env` no `eas.json`, que versionaria as chaves.

⚠️ **AS 3 CHAVES REMOVIDAS DO `app.json` NÃO ERAM COSMÉTICAS.** `newArchEnabled` e
`android.edgeToEdgeEnabled` saíram do schema porque no SDK 57 as duas coisas são sempre
ligadas — mantê-las só reprovava a validação. Já `splash` no topo **estava sendo ignorado**:
a tela de carregamento não estava configurada. Migrou para o plugin `expo-splash-screen`.

⚠️ **OS QUATRO ASSETS ERAM O PLACEHOLDER DO TEMPLATE** (o quadriculado cinza com círculos), e
`adaptive-icon.png` e `splash-icon.png` eram **o mesmo arquivo**. Foram regerados a partir da
marca que o app já usa — o quadrado `#2c5282` com o raio branco do `BrandMark`, com o vetor
real do `lucide` — para que ícone, splash e interface digam a mesma coisa.

⚠️ **`adaptiveIcon.backgroundColor` PRECISOU IR PARA `#2c5282`.** O primeiro plano de um ícone
adaptativo é transparente e o raio é branco: sobre o `#ffffff` anterior, o ícone seria um
quadrado branco vazio em todo aparelho Android. E o raio ocupa 38% ali (contra 55% no ícone
cheio) porque o Android recorta a máscara e só o miolo de ~66% é garantido.

⚠️ **`/privacidade` PRECISA SER LEGÍVEL NO CELULAR, e o `MobileBlocker` a cobria.** O revisor
da Play Store abre a URL da política **no telefone**; a cortina de "use em desktop" por cima
significaria reprovação. Daí `ROTAS_SEM_BLOQUEIO`.

⚠️ **O TEXTO DA POLÍTICA DESCREVE O QUE O CÓDIGO FAZ, e precisa continuar assim.** As colunas
citadas são as de `public.users`; "sem provedor externo de analytics" reflete a remoção do
PostHog na v4; "a biometria não sai do aparelho" é como o `expo-local-authentication` funciona;
e a exclusão de conta descreve `delete_user_permanently`, inclusive a recusa para dono de
empresa. **O formulário *Data safety* da Play Console tem de bater com essa página** — declarar
coleta que não existe é tão problemático quanto omitir a que existe.

⚠️ **`react-native-gesture-handler` 3.2.1 CONTRA os ~2.32.0 que o SDK 57 espera** é a única
falha que resta no `expo-doctor`, e **não deve ser "corrigida" baixando a versão**: a v3 é
escolha deliberada e o `src/lib/gestureRuntime.ts` sonda funções que só existem nela
(`flushOperations`, `updateGestureHandlerConfig`, `installUIRuntimeBindings`). Downgrade faria
a detecção falhar e **desligaria os gestos em silêncio**. O caminho é validar com
`eas build --profile preview` antes do `production`.

**O que continua pendente e depende do dono do projeto:** publicar o `admin-web` com a rota
`/privacidade`, criar o app na Play Console, preencher o formulário *Data safety* de acordo com
esta política, e rodar os builds (`preview` para validar, depois `production`).

**Validação executada:** `expo-doctor` 20/21; `tsc --noEmit` limpo nos dois apps; `eslint`
limpo; `npm run build` do `admin-web` com `/privacidade` listada; `expo export --platform
android` empacotou. As 6 variáveis do EAS conferidas por `eas env:list`. ⚠️ **Nenhum build de
loja foi gerado** — nem `preview`, nem `production`.

---

**2026-09-07 — v9: Meu Perfil completo e Painel de Engenharia com paridade no `mobile-app`**

Duas lacunas do mobile em relação ao `admin-web` foram fechadas. O `Meu Perfil` ganhou
**editar** e **apagar conta**; o `Painel de Engenharia` ganhou **Central de Comandos** e
**Ajustes Globais** — as duas únicas ferramentas que o painel da web tem.

| Onde | O que entrou |
|---|---|
| `src/screens/profile/` | ✨ **NOVA PASTA** — `useProfileScreen`, `ProfileIdentity`, `ProfileDetailsView`, `ProfileEditForm`, `DeleteAccountConfirm`, `ProfileRow`, `iniciais` |
| `src/screens/ProfileScreen.tsx` | Virou orquestrador de três painéis (374 → 143 linhas de código) |
| `src/screens/admin/` | ✨ **NOVA PASTA** — Central de Comandos e Ajustes Globais, 12 arquivos |
| `app/central-comandos.tsx`, `app/ajustes-globais.tsx` | ✨ **NOVAS ROTAS** empilhadas (fora de `(tabs)`) |
| `packages/core/src/services/platform/adminApiService.ts` | ✨ **NOVO** — as 4 operações que exigem servidor |
| `packages/core/src/lib/apiBaseUrl.ts` | ✨ **NOVO** — resolve `EXPO_PUBLIC_API_URL`, sem valor padrão |
| `apps/admin-web/src/app/api/admin/{users,user-tenants,sync-tenants}/route.ts` | ✨ **3 ROTAS NOVAS** |
| `src/components/icon/Icon.tsx` | 8 ícones novos (`Editar`, `Apagar`, `Adicionar`, `Salvar`, `Confirmar`, `Restaurar`, `Paleta`, `UsuarioOk`) |
| `src/components/auth/LocationFields.tsx` | `formData` afrouxado para `CamposLocalizacao`, o que permitiu reusá-lo no perfil |
| `src/components/developer/DeveloperDashboard.tsx` | Seis cartões vagos viraram cinco, quatro com destino real |

⚠️ **O PERFIL NÃO PRECISOU DE SERVIDOR; O PAINEL DE ENGENHARIA PRECISOU — e a razão é a
mesma dos dois lados.** O Proprietário tem sessão Supabase de verdade, então o
`profileService` (cliente **anon**) funciona igual no mobile e na web: quem autoriza é a RLS
(`auth.uid() = id` no UPDATE) e a trava de identidade dentro de `delete_user_permanently`.
Já o Desenvolvedor **não tem sessão nenhuma** — a credencial dele é fixa no Core — e as
operações do painel exigem `supabaseAdmin`. Não é questão de escrever a policy certa: **não
há identidade para o `auth.uid()` comparar.**

⚠️ **POR ISSO O PAINEL DE ENGENHARIA DO MOBILE FALA HTTP, E NÃO SUPABASE.** É a única tela
do app assim. O `adminApiService` do Core chama as rotas `/api/admin/*` do `admin-web`, onde
a service role vive em segurança. Pôr `SUPABASE_SERVICE_ROLE_KEY` no aparelho é a proibição
nº 1 deste repositório — a chave viajaria dentro do APK.

⚠️ **`EXPO_PUBLIC_API_URL` NÃO PODE SER `localhost` NO APARELHO.** No telemóvel, `localhost`
é o próprio telemóvel — não o seu PC. O valor precisa ser o IP da máquina na rede local
(`http://192.168.x.x:3000`) ou a URL publicada. O `apiBaseUrl.ts` **recusa `localhost` com a
instrução de correção** em vez de deixar a chamada morrer num "Network request failed"
genérico. E ele **não tem valor padrão**, de propósito: `sincronizarEmpresas` CRIA E DESATIVA
EMPRESAS, e um host chutado significa escrever no banco de outra implantação em silêncio.
(O `authService.notifyAdminNewUser` ainda carrega um padrão embutido apontando para a v3 —
ficou fora deste escopo, mas para notificar o dano é só a notificação se perder.)

⚠️ **AS 3 ROTAS NOVAS NÃO TÊM AUTENTICAÇÃO — como as 6 que já existiam.** Quem souber a URL
lista usuários e sincroniza empresas. Esta entrega **não piorou nem consertou** a postura do
projeto: seguiu a que já estava lá (ver a credencial fixa do Painel de Engenharia). Quando
for endurecida, o lugar de pôr o cabeçalho de segredo é o `adminApiService`, num ponto só, e
a conferência nas rotas. **Decisão consciente do dono do projeto (2026-09-07).**

⚠️ **NÃO EXISTE `<input type="color">` NO REACT NATIVE.** Os sete campos de cor do
white-label são caixa hexadecimal + **amostra que se pinta ao vivo**, e a amostra só pinta com
hexadecimal válido: passar `"#12"` ao `backgroundColor` não avisa nada — no Android a cor
simplesmente não é aplicada. Um quadro com a cor anterior mentiria sobre o que está gravado.

⚠️ **"REMOVER" EMPRESA NÃO APAGA — DESATIVA.** A empresa vai para `is_active = false` e
reaparece no "Histórico de empresas" com o botão Reabilitar. É o comportamento da web, e é o
que faz o botão Reabilitar existir. Empresa criada e removida **antes de salvar** some sem ir
para o histórico: ela nunca chegou ao banco.

⚠️ **A GRAVAÇÃO DAS EMPRESAS É UMA CHAMADA SÓ.** Criar, desativar, reabilitar e ajustar o
papel do usuário são efeitos de uma operação única — a proibição contra quebrar operação
transacional em chamadas separadas vale também atravessando a rede, e aqui pior: metade
aplicada deixa o usuário com papel incoerente com as empresas que tem.

⚠️ **AS DUAS TELAS NOVAS FICAM FORA DE `(tabs)/`**, como `sobre` e `suporte`: dentro do
grupo, o `NativeTabs` monta um gatilho por rota e elas virariam abas para todo mundo.
E **esconder rota não é controle de acesso** — o papel vem do cofre do aparelho.

⚠️ **`PADROES_DE_FABRICA` É UMA SEGUNDA CÓPIA.** A primeira está em
`admin-web/src/app/dashboard/settings/page.tsx`; e há uma TERCEIRA, com valores
**diferentes**, no `DEFAULT_SETTINGS` do `settingsService` — aquela é a paleta de emergência
de quando o banco não responde, não o padrão de fábrica. Unificá-las muda o contrato do Core
e atinge a web; ficou fora deste escopo. Ao mexer numa, mexa nas duas de propósito.

**Validação executada:** `tsc --noEmit` limpo no `mobile-app`, no `admin-web` e no Core;
`npm run lint` limpo no `admin-web`; `npm run build` do `admin-web` concluído com as 3 rotas
novas listadas; `expo export --platform android` empacotou sem erro. ⚠️ **Nada foi testado em
aparelho nem em emulador** — a validação de comportamento continua pendente, e para o Painel
de Engenharia ela depende de `EXPO_PUBLIC_API_URL` apontar para um `admin-web` alcançável.

---

**2026-09-07 — v9: login do PROPRIETÁRIO por Google no `mobile-app` (a armadilha dos dois cadastros)**

O acesso do Proprietário por Google chegou ao `apps/mobile-app` no commit `64fb9f5`
(2026-09-06) e passou **seis rodadas de depuração sem funcionar em desenvolvimento** por um
erro de **configuração de painel**, não de código. Nenhuma linha do fluxo precisou mudar —
o que entrou em 2026-09-07 foi o diagnóstico e esta documentação.

| Onde | O que faz |
|---|---|
| `app/auth/google.tsx` | ✨ **NOVO (tarde)** — a ROTA do deep link `plataformajairo://auth/google` |
| `src/lib/oauthCallbackSession.ts` | ✨ **NOVO (tarde)** — converte a URL de retorno em sessão; implícito **e** PKCE |
| `src/lib/googleOAuthMobile.ts` | `WebBrowser.openAuthSessionAsync` + deep link |
| `src/lib/oauthDiagnostics.ts` | ✨ **NOVO** — imprime no Metro os DOIS endereços, cada um com o painel de destino ao lado |
| `src/hooks/auth/useGoogleLogin.ts` | Portão do `profile_completed`, telemetria e triagem |
| `src/components/auth/LoginGoogleView.tsx` | Botão `outline` (diretriz de marca do Google) |

⚠️ **SÃO DOIS ENDEREÇOS, EM DOIS PAINÉIS, E UM NÃO SUBSTITUI O OUTRO.** Foi confundi-los
que custou as seis rodadas:

| Valor | Onde se cadastra | Quem consome |
|---|---|---|
| `https://<ref>.supabase.co/auth/v1/callback` | **Google Cloud Console** › Credenciais › URIs de redirecionamento autorizados | O Google |
| `plataformajairo://auth/google` | **Supabase** › Authentication › URL Configuration › Redirect URLs | O Supabase |

⚠️ **O GOOGLE NUNCA RECEBE A URI DO APP.** Quem fala com o Google é o Supabase, e ele se
apresenta com a própria URL de callback. O `redirectTo` que o app passa só é usado **depois**,
quando o Google já devolveu o usuário ao Supabase. Cadastrar `exp://192.168.1.3:8081/…` no
Google Console é cadastrar um valor que o Google jamais vai comparar — daí o
`Erro 400: redirect_uri_mismatch` teimoso, que na verdade dizia "não tenho o callback do
Supabase na lista". Some-se a isso que o Google recusa, de saída, IP privado, `localhost`
sem domínio público e esquema customizado: as quatro tentativas eram todas inviáveis.

⚠️ **A WEB PASSAR NO LOGIN NÃO DIZ NADA SOBRE O MOBILE.** A web usa o caminho do **popup**
(`signInWithIdToken`), que se apoia em *Origens JavaScript autorizadas* e **não tem redirect
URI nenhum**. O mobile usa o caminho do **redirecionamento**, que só olha para *URIs de
redirecionamento*. São metades diferentes do **mesmo** OAuth client — uma pode estar
configurada há meses enquanto a outra está vazia.

⚠️ **CAUSA RAIZ Nº 2 — O GOTRUE REJEITA O ESQUEMA `exp://`.** Corrigido o Google, o fluxo
passou a completar (usuário criado, sessão emitida) mas o navegador continuou parando numa
página de erro. O Supabase **cai silenciosamente na Site URL** quando o `redirect_to` não
casa com a lista — sem mensagem, sem log, sem código de erro. Testes controlados:

| `redirect_to` | GoTrue |
|---|---|
| `https://example.com/oauth-test` | ✅ aceita |
| `plataformajairo://auth/google` | ✅ aceita |
| `exp://192.168.1.3:8081/--/auth/google` (literal, exato) | ❌ rejeita |
| `exp://**` (curinga) | ❌ rejeita |

⚠️ **CONSEQUÊNCIA: O LOGIN GOOGLE NÃO FUNCIONA NO EXPO GO, e não há configuração que
resolva.** O `exp://` só existe no Expo Go e some quando o app ganha identidade própria.
Daí a migração para **development build** (`eas build --profile development`), onde o
endereço passa a ser `plataformajairo://auth/google` — sem IP, cadastrado uma vez, e
idêntico ao que a produção usa.

⚠️ **O `eas.json` SAIU DA RAIZ para `apps/mobile-app/`** — o EAS CLI define a raiz do
projeto pelo `app.json` e exige o `eas.json` ao lado. E `withoutCredentials: true` foi
removido do perfil `development`: ele só serve com debug keystore versionado, que aqui não
existe; o APK sairia sem assinatura e o Android recusaria instalar. Instalado
`expo-dev-client`, requisito do `developmentClient: true`.

⚠️ **CAUSA RAIZ Nº 3 — A ROTA `auth/google` NÃO EXISTIA NO APP** (2026-09-07,
tarde). Depois de acertar os dois painéis, o retorno do Google passou a abrir no
app a tela **"Endereço não encontrado"** — o `+not-found.tsx`, de dentro do
aplicativo. O deep link chega por DOIS caminhos: o `WebBrowser.openAuthSessionAsync`
o captura, **e** o sistema operacional o entrega ao Expo Router, que procura um
arquivo em `app/` respondendo por `/auth/google`. Não havia nenhum. Que o fluxo
tenha funcionado antes é uma **corrida ganha**, não um projeto: quando o retorno
abre o app do zero, o `openAuthSessionAsync` nem existe mais e só a rota pode
concluir o login. Corrigido com `app/auth/google.tsx` (a rota) e
`src/lib/oauthCallbackSession.ts` (a conversão da URL em sessão, agora
compartilhada pelos dois caminhos). ✅ **Verificado em aparelho Android real** no
mesmo dia; iOS segue sem teste.

⚠️ **A ROTA VAI EM `app/auth/`, COM O SEGMENTO `auth` REAL.** Em `app/(auth)/` o
grupo some da URL e o endereço viraria `/google`, diferente do que está cadastrado
no Supabase; em `app/(tabs)/` ela viraria uma aba.

⚠️ **O PORTEIRO DO `app/_layout.tsx` PRECISOU ABRIR EXCEÇÃO.** O boot faz
`router.replace(temSessao ? '/(tabs)' : '/(auth)')` uma vez — numa abertura por
deep link isso atropelava a tela de retorno antes de ela concluir o login. A
verificação usa `Linking.getInitialURL()`, que é determinística; olhar para os
segmentos da rota dependeria de o roteador já ter montado.

⚠️ **CAUSA RAIZ Nº 4 — `Linking.useURL()` NÃO LÊ O RETORNO COM O APP ABERTO**
(2026-09-07, tarde). A primeira versão de `app/auth/google.tsx` lia o deep link por
`Linking.useURL()` e ficava presa em "Concluindo o login…" para sempre: aquele hook faz
`getInitialURL()` (que com o app rodando é `null`) e assina o evento `url` — que **já
disparou antes**, pois foi ele que fez o roteador navegar para lá. **Só o Proprietário sem
empresa via o defeito**, porque no fluxo normal o `useGoogleLogin` faz
`router.replace('/(tabs)')` e destrói a pilha com a tela travada dentro, enquanto
`tratarSemVinculos` apenas troca o estado da tela de login, sem navegar. A correção foi parar
de esperar a URL e passar a esperar a **sessão** (`esperarSessao()`, teto de 6s): o
supabase-js é a fonte comum aos dois caminhos. ✅ **Verificado em aparelho** com usuário
pendente no mesmo dia.

📄 **O dossiê completo está em `apps/mobile-app/AGENTS.md`** (carregado
automaticamente por quem trabalha naquela pasta): o diagrama dos dois saltos, os comandos
`curl` que verificam cada metade sem aparelho e sem painel, as alternativas descartadas com
o motivo, e a lista do que já foi tentado e falhou.

**Validação executada:** `tsc --noEmit` limpo no `mobile-app`; as duas metades do cadastro
verificadas por requisição direta ao Google e ao Supabase. ✅ **Fluxo fim a fim CONCLUÍDO
COM SUCESSO em aparelho Android real** (2026-09-07), com development build: login pelo
Google, portão do `profile_completed`, cadastro completado e sessão criada. ⚠️ **iOS nunca
foi testado** — o esquema vale para as duas plataformas, mas isso é expectativa, não
verificação.

---

**2026-09-06 — v9: refatoração de design do `mobile-app` (padrão aplicativo nativo)**

Redesenho de **100% da interface do `apps/mobile-app`**, sem mudança de fluxo, de rota
existente nem de contrato com o Core. Nenhum serviço, hook de autenticação ou consulta ao
Supabase foi tocado — o que mudou foi forma, cor, corpo de texto e hierarquia.

| Onde | O que mudou |
|---|---|
| `src/constants/Colors.ts` | Paleta repintada; `elevacao()` ganhou o nível 4; raios encolhidos |
| `src/constants/Typography.ts` | ✨ **NOVO** — escala de 6 degraus, 3 pesos |
| `src/constants/Spacing.ts` | ✨ **NOVO** — grade de 8pt, alvos de toque, ícones, durações |
| `src/components/icon/Icon.tsx` | ✨ **NOVO** — registro único de ícones |
| `src/components/card/MenuCard.*` | ✨ **NOVO** — a opção como cartão (ícone, chevron, elevação) |
| `src/components/card/StatCard.tsx` | ✨ **NOVO** — métrica (número grande + rótulo) |
| `src/components/BrandMark.tsx` | ✨ **NOVO** — símbolo + nome, abre a guarita |
| `src/components/dashboard/DashboardHeader.tsx` | ✨ **NOVO** — saudação + saída no canto |
| `src/hooks/useGreeting.ts` | ✨ **NOVO** — "Bom dia, Jairo" pela hora do aparelho |
| `src/screens/AboutScreen.tsx`, `SupportScreen.tsx` | ✨ **NOVAS TELAS** |
| `app/sobre.tsx`, `app/suporte.tsx` | ✨ **NOVAS ROTAS** (fora de `(tabs)`) |
| `Button`, `Input`, `Card`, `authStyles`, as 5 views de auth, os 2 painéis, `ProfileScreen`, `InstitutionalFooter`, `_layout` | refatorados |

⚠️ **A MARCA DO MOBILE DIVERGIU DA DO `admin-web`, e isso foi uma decisão, não um
descuido.** O app passou a `#2c5282` (azul-marinho) e a web **continua em `#1d4ed8`**
(blue-700). Até a v9 o `Colors.ts` do mobile documentava que a marca era idêntica nas duas
pontas; **essa regra está temporariamente quebrada por escolha do dono do projeto
(2026-09-06)**. Quem for unificar troca `BRAND.primary` em
`apps/mobile-app/src/constants/Colors.ts` e a referência de
`apps/admin-web/src/app/dashboard/settings/page.tsx` — são os dois únicos lugares.

⚠️ **O `lucide-react-native@1.x` RENOMEOU O CATÁLOGO, e o modo de falhar é silencioso.**
`Home`, `CheckCircle`, `AlertCircle`, `HelpCircle`, `UserCircle` e `BarChart3` **não existem
mais** — agora são `House`, `CircleCheck`, `CircleAlert`, `CircleQuestionMark`, `CircleUser`
e `ChartColumn`. Um `import { Home }` do nome antigo **não quebra o empacotamento e não
acusa nada no editor**: devolve `undefined` e só estoura no aparelho, ao renderizar, com
"Element type is invalid". Por isso todo ícone passa pelo registro de
`src/components/icon/Icon.tsx` — lá o nome errado vira erro de TypeScript.

⚠️ **Nunca importe o Lucide com curinga (`import * as Lucide`).** O curinga arrasta os mais
de mil ícones do catálogo para o bundle, porque o empacotador não consegue provar quais
serão usados quando o nome só se conhece em tempo de execução. O registro importa nome a
nome de propósito.

⚠️ **`app/sobre.tsx` e `app/suporte.tsx` ficam FORA de `(tabs)/`.** Um arquivo dentro do
grupo `(tabs)` vira candidato a aba — o `NativeTabs` monta um gatilho por rota do grupo, e
as duas telas apareceriam na barra inferior. Elas são destinos **empilhados**, abertos por
toque num `MenuCard` e fechados pelo botão voltar, como o `modal.tsx`.

⚠️ **Cor de texto NÃO se herda em React Native.** `MenuCard`, `StatCard`,
`DashboardHeader` e `InstitutionalFooter` têm prop `escuro` em vez de aceitarem um `style`
com a cor de fundo: sobrescrever só o `backgroundColor` de fora pinta a superfície e deixa
os `<Text>` internos nas cores claras, produzindo texto quase preto sobre superfície quase
preta no Painel de Engenharia. Cada `<Text>` resolve a própria cor, e só quem está dentro
do componente as alcança.

⚠️ **`authStyles.campo` precisa continuar sendo `ViewStyle` puro.** O `SearchableSelect` o
aplica em dois papéis: num `Pressable` (o gatilho) e num `TextInput` (a busca). Espalhar
tipografia nele o torna `TextStyle` aos olhos do TypeScript e o `Pressable` passa a
recusá-lo. O texto do campo vem de `authStyles.campoTexto`, que é separado por essa razão.

⚠️ **`.expo/types/router.d.ts` é GERADO, e rota nova não existe para o TypeScript até o
dev server rodar.** Depois de criar um arquivo em `app/`, `router.push('/nova-rota')` falha
o typecheck com "not assignable to ... Href" até que `npx expo start` regenere o arquivo.
Não contorne com `as Href` — rode o servidor uma vez.

⚠️ **Botão não usa mais caixa alta.** `textTransform: 'uppercase'` em botão é herança do
Material Design 1; o Material 3 abandonou a prática em 2021 e o HIG do iOS nunca a teve.
Versal remove o perfil ascendente/descendente que o olho usa para reconhecer a forma da
palavra — num botão, ler rápido é a função inteira.

**O que NÃO mudou:** nenhuma tabela, policy, função SQL ou arquivo de `supabase/`; nenhum
serviço do `packages/core`; nenhum hook de `src/hooks/auth/`; o `admin-web` inteiro (exceto
nada — ele não foi tocado); as versões em `versions.ts`. Nenhuma dependência foi instalada
ou removida — `lucide-react-native`, `react-native-reanimated` e
`react-native-safe-area-context` já estavam no `package.json`.

**Validação executada:** `tsc --noEmit` limpo; `expo export --platform android` (3804
módulos) e `--platform web` (22 rotas) empacotaram sem erro; os 33 nomes de ícone do
registro conferidos contra a superfície pública do pacote. **Não houve teste em aparelho
nem em emulador** — a validação visual em iOS e Android continua pendente.

---

**2026-09-06 — v9: renumeração da versão (v8 → v9)**

Marco de versão, **sem mudança de comportamento**. Nada foi acrescentado, removido ou
reescrito na plataforma: o que mudou foram as strings de versão e os cabeçalhos que as
citam.

| Onde | O que mudou |
|---|---|
| `packages/core/src/constants/versions.ts` | `WEB_VERSION` e `APP_VERSION` passaram a `v9` |
| `README.md`, `CLAUDE.md` | Título, bloco de versões e convenção de commit |
| `supabase/criar-bd/plataforma_*.sql` | Cabeçalhos e comentários de seção dos 3 arquivos |
| Comentários TSDoc (`PJODC v8` → `PJODC v9`) | 78 arquivos: 56 do `mobile-app`, 20 do `admin-web`, 2 do `packages/core` |

⚠️ **O grosso da renumeração agora está no mobile.** Até a v8 os cabeçalhos TSDoc viviam
quase só no `admin-web`; hoje o `apps/mobile-app` responde por 56 dos 78 arquivos
carimbados. Quem for renumerar a v10 deve contar com isso — varrer só o `admin-web` e o
`packages/core` deixaria a maior parte do repositório para trás.

⚠️ **Uma ocorrência de `v8` continua no `admin-web` e deve continuar.** Em
`LoginGoogleOwnerView.tsx` o `<path d="…H24v8.9h11.8…">` do logotipo do Google é
**coordenada de SVG**, não versão: `v8.9` significa "linha vertical de 8.9 unidades".
Trocá-lo por `v9.9` deformaria o desenho. Substituição cega por `v8` quebra esse arquivo —
use `PJODC v8` como padrão de busca.

⚠️ **Nenhum arquivo foi renomeado.** Os três SQL mantêm o prefixo `plataforma_` que a v6
introduziu, então `supabase/config.toml` **não precisou ser tocado** — `db.seed.sql_paths`
continua apontando para `./criar-bd/plataforma_02_seed.sql`.

⚠️ **O schema do banco não mudou.** Os arquivos de `supabase/criar-bd/` só tiveram
cabeçalhos reescritos — nenhum `CREATE`, `ALTER` ou policy foi tocado. Rodar de novo o
`plataforma_01_schema.sql` num banco já criado continua sendo desnecessário.

⚠️ **Os campos `version` dos `package.json` continuam alheios à versão da plataforma.**
`@jairo/core` e `@jairo/mobile-app` seguem em `1.0.0`, `@jairo/admin-web` em `0.1.0`, e o
`name` da raiz continua `plataforma-jairo-o-d-c-v4`. São semvers de workspace npm, não a
versão do produto — a fonte única é `versions.ts`.

> As entradas de histórico abaixo **continuam dizendo v8, v7, v6, v5 e v4** de propósito:
> elas descrevem o que aconteceu naquelas versões. Reescrevê-las apagaria a informação de
> *quando* cada peça entrou.

Pelo mesmo motivo continuam intactas as menções históricas a `v7` no código — as duas
do `admin-web` (`MainMenuView.tsx`, `AuthInterface.tsx`), as duas do `mobile-app`
(`MainMenuView.tsx`, `(auth)/signup.tsx`), a de `authService.ts` — e os quatro comentários
`-- 🌍/🔐/✅ v7:` de `plataforma_01_schema.sql`: elas registram em que versão a peça
entrou, não em que versão o repositório está.

---

**2026-09-05 — v8: renumeração da versão (v7 → v8)**

Marco de versão, **sem mudança de comportamento**. Nada foi acrescentado, removido ou
reescrito na plataforma: o que mudou foram as strings de versão e os cabeçalhos que as
citam.

| Onde | O que mudou |
|---|---|
| `packages/core/src/constants/versions.ts` | `WEB_VERSION` e `APP_VERSION` passaram a `v8` |
| `README.md`, `CLAUDE.md` | Título, bloco de versões e convenção de commit |
| `supabase/criar-bd/plataforma_*.sql` | Cabeçalhos e comentários de seção dos 3 arquivos |
| Comentários TSDoc (`PJODC v7` → `PJODC v8`) | 22 arquivos do `admin-web` e do `packages/core` |

⚠️ **`APP_VERSION` deixou de ser um texto de espera.** Até a v7 ela dizia
`"v7 - a definir a primeira versão"`; agora carrega um carimbo de data como a Web:
`"v8 - 2026-09-05-02"`. O sufixo `-02` distingue a linha do mobile da linha da web
(`-01`) no mesmo dia. **Isso não significa que o mobile ganhou uma release** — o
`apps/mobile-app` continua sem build publicado; a string apenas parou de ser uma frase.

⚠️ **Nenhum arquivo foi renomeado.** Os três SQL mantêm o prefixo `plataforma_` que a v6
introduziu, então `supabase/config.toml` **não precisou ser tocado** — `db.seed.sql_paths`
continua apontando para `./criar-bd/plataforma_02_seed.sql`.

⚠️ **O schema do banco não mudou.** Os arquivos de `supabase/criar-bd/` só tiveram
cabeçalhos reescritos — nenhum `CREATE`, `ALTER` ou policy foi tocado. Rodar de novo o
`plataforma_01_schema.sql` num banco já criado continua sendo desnecessário.

⚠️ **Os campos `version` dos `package.json` não acompanham a versão da plataforma.**
`@jairo/core` e `@jairo/mobile-app` seguem em `1.0.0`, `@jairo/admin-web` em `0.1.0`, e o
`name` da raiz continua `plataforma-jairo-o-d-c-v4`. São semvers de workspace npm, não a
versão do produto — a fonte única é `versions.ts`. Bumpar um deles daria a impressão de
que existem duas numerações concorrentes.

> As entradas de histórico abaixo **continuam dizendo v7, v6, v5 e v4** de propósito: elas
> descrevem o que aconteceu naquelas versões. Reescrevê-las apagaria a informação de
> *quando* cada peça entrou.

Três menções a `v7` sobrevivem no código por serem históricas, não versionais — elas
registram em que versão a peça entrou, não em que versão o repositório está:
`MainMenuView.tsx` (sem botão de cadastro), `AuthInterface.tsx` (porta do Google) e
`authService.ts` (`googleSignInOwner`). Pelo mesmo motivo, os quatro comentários
`-- 🌍/🔐/✅ v7:` de `plataforma_01_schema.sql` ficaram como estavam.

---

**2026-09-05 — v7: renumeração da versão (v6 → v7)**

Marco de versão, **sem mudança de comportamento**. Nada foi acrescentado, removido ou
reescrito na plataforma: o que mudou foram as strings de versão e os cabeçalhos que as
citam.

| Onde | O que mudou |
|---|---|
| `packages/core/src/constants/versions.ts` | `WEB_VERSION` e `APP_VERSION` passaram a `v7` |
| `README.md`, `CLAUDE.md` | Título, bloco de versões e convenção de commit |
| `supabase/criar-bd/plataforma_*.sql` | Cabeçalhos e comentários de seção dos 3 arquivos |
| Comentários TSDoc (`PJODC v6` → `PJODC v7`) | 23 arquivos do `admin-web` e do `packages/core` |

⚠️ **Nenhum arquivo foi renomeado.** Os três SQL mantêm o prefixo `plataforma_` que a v6
introduziu, então `supabase/config.toml` **não precisou ser tocado** — `db.seed.sql_paths`
continua apontando para `./criar-bd/plataforma_02_seed.sql`. Foi exatamente essa a
armadilha da v6, e ela não se repete aqui.

⚠️ **O schema do banco não mudou.** Os arquivos de `supabase/criar-bd/` só tiveram
comentários reescritos — nenhum `CREATE`, `ALTER` ou policy foi tocado. Rodar de novo o
`plataforma_01_schema.sql` num banco já criado continua sendo desnecessário.

> As entradas de histórico abaixo **continuam dizendo v6, v5 e v4** de propósito: elas
> descrevem o que aconteceu naquelas versões. Reescrevê-las apagaria a informação de
> *quando* cada peça entrou.

---

**2026-09-04 — v6: renumeração da versão (v5 → v6)**

Marco de versão, **sem mudança de comportamento**. Nada foi acrescentado, removido ou
reescrito na plataforma: o que mudou foram as strings de versão e os cabeçalhos que as
citam.

| Onde | O que mudou |
|---|---|
| `packages/core/src/constants/versions.ts` | `WEB_VERSION` e `APP_VERSION` passaram a `v6` |
| `README.md`, `CLAUDE.md` | Título, bloco de versões e convenção de commit |
| `supabase/criar-bd/plataforma_*.sql` | Cabeçalhos, comentários de seção **e renomeação dos 3 arquivos** |
| Comentários TSDoc (`PJODC v5` → `PJODC v6`) | 18 arquivos do `admin-web` e do `packages/core` |

**Os 3 arquivos SQL ganharam o prefixo `plataforma_`:**

| Antes | Depois |
|---|---|
| `supabase/criar-bd/00_reset.sql` | `supabase/criar-bd/plataforma_00_reset.sql` |
| `supabase/criar-bd/01_schema.sql` | `supabase/criar-bd/plataforma_01_schema.sql` |
| `supabase/criar-bd/02_seed.sql` | `supabase/criar-bd/plataforma_02_seed.sql` |

O prefixo nomeia **o dono do schema**, não a ordem: `plataforma_*` é o CORE. Quando um
módulo trouxer o próprio SQL, ele vira `<nome>_00_reset` e os dois conjuntos param de
disputar os mesmos três nomes na mesma tela do SQL Editor.

⚠️ **`supabase/config.toml` acompanhou a renomeação.** A chave `db.seed.sql_paths`
apontava para `./criar-bd/02_seed.sql`; renomear sem corrigi-la deixaria o único passo
que o Supabase CLI ainda consegue aplicar sozinho apontando para um arquivo inexistente.

⚠️ **O schema do banco não mudou.** Os arquivos de `supabase/criar-bd/` só tiveram
comentários reescritos — nenhum `CREATE`, `ALTER` ou policy foi tocado. Rodar de novo o
`plataforma_01_schema.sql` num banco já criado continua sendo desnecessário.

> As entradas de histórico abaixo **continuam dizendo v5** de propósito: elas descrevem
> o que aconteceu naquela versão. Reescrevê-las apagaria a informação de *quando* cada
> peça entrou.

Duas menções a `v5` sobrevivem no código por serem históricas, não versionais:
`constants/locations/brazilStates.ts` e `countries.ts`, onde a frase registra que a v5
herdou uma API descontinuada.

---

**2026-09-01 — v5: logout completo, completar cadastro Google, perfil e exclusão de conta**

Quatro peças que faltavam depois de o Proprietário passar a entrar pelo Google.

**1. Completar Cadastro (obrigatório, só para quem entra pelo Google)**

O Google entrega e-mail e nome — mais nada. Planeta, país, estado e cidade ficavam vazios.
Agora `public.users.profile_completed` marca se o cadastro chegou ao fim, e há **dois portões**
verificando isso:

| Portão | Onde | Cobre |
|---|---|---|
| Login por popup | `useAuthLogic.handleGoogleSignIn` | O caminho normal |
| Entrada no dashboard | `dashboard/page.tsx` | Caminho de reserva do Google (aterrissa direto em `/dashboard`) e reaberturas posteriores |

A tela não tem "pular" nem "voltar" — a única saída é **SAIR**. Um "voltar ao início"
devolveria o usuário à guarita ainda autenticado, e o portão o traria de volta: um laço.
Pela mesma razão, os botões "Sobre a Plataforma" e "Painel de Engenharia" ficam escondidos
enquanto essa tela está aberta.

**2. Logout completo — as duas metades da sessão**

⚠️ **A sessão vive em DOIS lugares.** Sair de um só não é sair:

| Metade | Onde mora | Quem limpa |
|---|---|---|
| Cliente | armazenamento do navegador (supabase-js) | `authService.signOut()` |
| Servidor | cookies HTTP (escritos por `loginWithCatracaAction` / `syncGoogleSessionAction`) | `POST /auth/logout` |

Antes o dashboard chamava só `signOut()` + `sessionStorage.clear()`: a tela voltava à
guarita e o **middleware continuava reconhecendo o usuário como autenticado**. Agora as duas
metades (mais o `sessionStorage`, que guarda a empresa ativa) saem juntas, em
`apps/admin-web/src/lib/logout.ts` — um arquivo só, porque o dashboard, o lobby e a tela de
completar cadastro precisam exatamente do mesmo encerramento.

> A rota `/auth/logout` **responde JSON e não redireciona**: um 3xx devolvido a um
> `fetch(POST)` é seguido pelo navegador, que re-envia o POST ao destino — a página `/`
> receberia um POST que ela não atende. Quem navega é o cliente, depois.

**3. Meu Perfil — ver, editar e apagar a conta**

Modal no dashboard, fatiado conforme a regra de ouro:

```
src/components/dashboard/profile/
├── ProfileModal.tsx          → moldura e escolha do painel
├── useProfileModal.ts        → todo o estado e as chamadas de serviço
├── ProfileDetailsView.tsx    → leitura
├── ProfileEditForm.tsx       → edição
└── DeleteAccountConfirm.tsx  → confirmação da exclusão
```

O modal é **montado só enquanto aberto** (`{aberto && <ProfileModal/>}`), sem prop `isOpen`.
Assim cada abertura nasce limpa e relê o perfil, sem um efeito de reinicialização — que
geraria renderização em cascata e reabriria com dados velhos se o perfil tivesse mudado
noutra aba.

**4. Renovação de token (refresh)**

Nada estava quebrado; faltava deixar explícito. `packages/core/src/lib/supabase.ts` agora
declara `autoRefreshToken`, `persistSession` e `detectSessionInUrl` (os mesmos padrões do
supabase-js), e `authService.refreshSession()` existe para forçar a renovação quando o app
precisa de um token válido *agora*. Nos cookies do servidor, quem renova continua sendo o
middleware, a cada requisição.

**O que mudou no banco** (`supabase/criar-bd/plataforma_01_schema.sql`):

- `public.users.profile_completed` — nova coluna, `NOT NULL DEFAULT false` (seções 2.1 e 8.5).
  Nasce `true` no cadastro com senha (o formulário já pediu tudo) e `false` no Google.
- `handle_new_user()` (5.2) — passou a carimbar `profile_completed`.
- `check_profile_completed(uuid)` (5.8) — confere a bandeira **e** os cinco campos. A bandeira
  sozinha mentiria se um campo fosse esvaziado depois.
- `delete_user_permanently(uuid)` (5.9) — apaga a própria conta em definitivo.

> 🛡️ **A trava de identidade da 5.9 não é opcional.** A função é `SECURITY DEFINER` e recebe
> o id por parâmetro: sem comparar com `auth.uid()`, qualquer pessoa autenticada apagaria a
> conta de qualquer outra só trocando o uuid na chamada — RLS não protege nada ali, porque
> `SECURITY DEFINER` passa por cima dele. O parâmetro declara a intenção; **quem manda é a sessão.**

> 🏢 **Dono de empresa não se apaga.** A empresa e os vínculos dos dependentes ficariam órfãos,
> com `owner_id` apontando para o nada. Como todo Proprietário promovido possui uma empresa,
> na prática **a exclusão de conta hoje só funciona para quem ainda não foi promovido**.
> Para os demais, é preciso antes transferir a propriedade — funcionalidade que não existe.

**Backfill seguro:** a seção 8.5 não chuta `false` para todo mundo. Quem se cadastrou com
senha já preencheu o formulário inteiro e seria jogado à tela de "Completar Cadastro" sem ter
o que completar.

**Arquivos novos:**

| Arquivo | Papel |
|---|---|
| `packages/core/src/services/platform/profileService.ts` | Ler, completar, editar e apagar o perfil |
| `apps/admin-web/src/lib/logout.ts` | Encerramento das duas metades da sessão |
| `apps/admin-web/src/hooks/useBrazilCities.ts` | Cidades do IBGE, compartilhado entre os dois formulários |
| `apps/admin-web/src/components/auth/views/CompleteProfileView.tsx` | Tela de completar cadastro |
| `apps/admin-web/src/app/auth/complete-profile/page.tsx` | Endereço próprio dessa tela |
| `apps/admin-web/src/app/auth/logout/route.ts` | Limpeza dos cookies de sessão |

---

**2026-09-01 — v5: login do PROPRIETÁRIO por Google OAuth 2.0**

O acesso "Usuário Proprietário" deixou de usar e-mail + senha e passou a ser feito
exclusivamente pelo Google. **Dependente e Desenvolvedor não mudaram nada** — continuam
no `LoginFormsView`, com e-mail e senha, e o Desenvolvedor segue na credencial fixa.

| Acesso | Antes | Depois |
|---|---|---|
| Usuário Proprietário | e-mail + senha | ✅ **Google OAuth 2.0** |
| Usuário Dependente | e-mail + senha | e-mail + senha (inalterado) |
| Acesso Desenvolvedor | credencial fixa | credencial fixa (inalterado) |

**Cadastro automático:** não há mais formulário de cadastro no menu principal — o botão
"CADASTRAR USUÁRIO" foi removido do `MainMenuView.tsx`. Quem entra pelo Google e ainda não
tem perfil é criado na hora em `public.users`, pelo gatilho `on_auth_user_created`.

**Dois caminhos, decididos por variável de ambiente:**

1. **Popup (padrão)** — exige `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. O botão do Google devolve um
   ID Token, que o Core troca por sessão via `signInWithIdToken`. O usuário não sai da tela.
2. **Redirecionamento (reserva)** — sem a chave, a tela oferece um botão que entrega o OAuth
   ao Supabase (`signInWithOAuth`). A volta é tratada em `/auth/google/callback`.

   > Sem esse segundo caminho, esquecer a variável deixaria a porta do Proprietário sem
   > maçaneta: o `GoogleOAuthProvider` não renderiza botão nenhum com Client ID vazio.

**O que mudou no banco** (`supabase/criar-bd/plataforma_01_schema.sql`):

- `public.users.auth_provider` — nova coluna, `NOT NULL DEFAULT 'email'` (seções 2.1 e 8.4).
  Guarda `'email'` ou `'google'`.
- `handle_new_user()` (5.2) — detecta o provedor por `raw_app_meta_data->>'provider'`.
  ⚠️ **Não consultar `auth.identities` dentro desse gatilho:** a linha de identidade só
  nasce DEPOIS do `AFTER INSERT`, então a consulta volta vazia e todo usuário Google seria
  carimbado como `'email'`. Ganhou também `ON CONFLICT (id) DO NOTHING`.
- `ensure_google_user_profile(uuid, text, text)` (5.7) — rede de segurança `SECURITY DEFINER`,
  chamada pelo Core logo após o login. Existe porque **não há policy de INSERT em
  `public.users`**: o cliente anon não consegue criar o próprio perfil, só uma função
  `SECURITY DEFINER` consegue.
- `sync_auth_users()` (5.6) — passou a preservar o provedor real na re-sincronização.

**Arquivos novos:**

| Arquivo | Papel |
|---|---|
| `packages/core/src/services/platform/googleAuthService.ts` | Toda a lógica do OAuth (popup, redirecionamento, perfil) |
| `apps/admin-web/src/lib/googleClientId.ts` | Fonte única do Client ID e do "tem chave?" |
| `apps/admin-web/src/components/providers/GoogleAuthProvider.tsx` | Casca `"use client"` do Google Identity Services |
| `apps/admin-web/src/components/auth/views/LoginGoogleOwnerView.tsx` | Tela do Proprietário (sem campos) |
| `apps/admin-web/src/app/auth/google-actions.ts` | Grava a sessão do popup nos cookies SSR |
| `apps/admin-web/src/app/auth/google/callback/route.ts` | Retorno do caminho de reserva |

**Ponte de cookies SSR:** o login por senha nasce no servidor e já grava os cookies. O login
por popup nasce no **navegador** — sem o `syncGoogleSessionAction`, o middleware e as Server
Actions veriam um visitante anônimo (o mesmo loop de "Aguardando Triagem" que a v4 resolveu).

**Configuração obrigatória no Supabase:** Authentication > Providers > Google, ativado e com
o **mesmo** Client ID de `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. É o Supabase quem valida a assinatura
do token — Client IDs diferentes derrubam o login com "Unacceptable audience in id_token".

**Dependência instalada:** `@react-oauth/google` (apenas no `admin-web`).

---

**2026-09-01 — v5: SQL consolidado e `migrations/` → `criar-bd/`**

A pasta `supabase/migrations/` deixou de existir. As 7 migrations `core_platform_00..06`
foram consolidadas em **um único arquivo**, e os três scripts do ciclo de vida do banco
passaram a morar juntos, numerados na ordem de execução:

| Antes (v4) | Depois (v5) |
|---|---|
| `supabase/migrations/core_platform_00..06.sql` (7 arquivos) | ❌ apagados |
| `supabase/reset_total_core_platform.sql` | `supabase/criar-bd/00_reset.sql` |
| *(consolidação das 7 migrations)* | `supabase/criar-bd/01_schema.sql` |
| `supabase/seed_core_platform.sql` | `supabase/criar-bd/02_seed.sql` |

**Por que `criar-bd/` e não `migrations/`:** o ciclo desta plataforma é *wipe + rebuild*
(derruba tudo e recria), não evolução incremental de um banco em produção. O nome
`migrations/` prometia algo que o conteúdo não entregava.

**O que a consolidação corrigiu:** rodar as 7 migrations em sequência era frágil — a `04`
usava `DROP POLICY` para derrubar uma policy criada na `00` e recriá-la corrigida. No
arquivo único, cada objeto nasce já na forma final, na ordem certa de dependência.

⚠️ **O Supabase CLI não enxerga `criar-bd/` automaticamente.** `supabase db reset` procura
por `supabase/migrations/`, que não existe mais — o comando roda sem aplicar schema nenhum.
A execução hoje é **manual**, colando os 3 arquivos no SQL Editor na ordem. Ver
"`supabase/criar-bd/` — Criação do Banco do Zero".

---

**2026-08-31 — v4: remoção das integrações externas e acesso imediato**

A plataforma passou a ser **autossuficiente**: não depende mais de nenhum serviço de
terceiros para funcionar. Só restam Supabase (banco/auth) e as APIs públicas de
geografia consultadas pelo formulário de cadastro (restcountries e IBGE).

| Integração | Estado |
|---|---|
| PostHog (analytics) | ❌ removida — substituída por telemetria local no Core |
| Resend (e-mail transacional) | ❌ removida — `/api/notify-admin` grava no log do servidor |
| Cloudflare Turnstile (catraca) | ❌ removida — `Catraca.tsx` opera em **bypass** |

Mudanças de comportamento que você precisa conhecer:

1. **Acesso imediato** — não há mais confirmação de e-mail bloqueando a entrada.
   Isso é garantido **pelo banco** (`supabase/criar-bd/plataforma_01_schema.sql`, seções 5.1 e 7.1), não pelo
   painel do Supabase: o gatilho `on_auth_user_auto_confirm` carimba `email_confirmed_at`
   antes de a linha entrar em `auth.users`. Se a chave "Confirm email" do projeto estiver
   ligada, o login continua funcionando mesmo assim — e nenhum passo manual é necessário.
   O fluxo `resend-email` ("Reenviar Confirmação") foi removido da UI, junto da rota
   `/api/auth/verify-email` e do método `authService.verifyEmailExists`.
   O fluxo `forgot-password` (redefinir senha) **permanece** — é outra coisa.
2. **País obrigatório** — `public.users.country` virou `NOT NULL DEFAULT 'BRASIL'`.
   Validado no frontend (web e mobile) e no banco. Ver `supabase/criar-bd/plataforma_01_schema.sql`, seção 8.1.
3. **Catraca preservada como ponto de extensão** — `Catraca.tsx` continua existindo e
   sendo renderizado no login, mas sempre libera a passagem, sem rede e sem chave de API.
4. **Arquivos removidos** — `PostHogProvider.tsx`, `AuditLogView.tsx`,
   `/api/analytics/audit-logs/route.ts`, `/api/auth/verify-email/route.ts`.
5. **Dependências desinstaladas** — `posthog-js`, `resend`, `@marsidev/react-turnstile`.
6. **Login de desenvolvedor: mantido como na v3.** A credencial `admin@pjodc.ia` / `1qaz`
   continua **fixa no código**, em `authService.developerSignIn`. Uma tentativa de movê-la
   para variável de ambiente com hash bcrypt foi revertida a pedido: exigia `.env.local`
   configurado e uma rota de servidor, o que quebrava o acesso local que antes funcionava
   sem nenhuma configuração. Ver "Acesso de Desenvolvedor" abaixo.

---

**2026-08-30 — Remoção total dos módulos funcionais**

Os três módulos de negócio foram removidos do código:

| Módulo | Estado |
|---|---|
| Gestão de Tarefas (`tasks`) | ❌ removido |
| Conciliador de Cartões (`conciliador`) | ❌ removido |
| Finanças Pessoal (`financas_pessoal`) | ❌ removido |

**Estado atual: apenas a Plataforma CORE está ativa.**
Não existem mais serviços em `packages/core/src/services/modules/`, nem rotas, componentes
ou Server Actions de módulo no `admin-web`, nem componentes de módulo no `mobile-app`.

A limpeza foi concluída em três frentes:

1. **Código** — serviços, rotas, componentes e Server Actions dos módulos removidos do
   `admin-web`, do `packages/core` e do `mobile-app`.
2. **Banco** — 28 migrations com prefixo de módulo e 26 scripts de reset de módulo
   apagados de `supabase/`. Restaram só as migrations `core_platform_*`, o
   `reset_total_core_platform.sql` e o `seed_core_platform.sql` — os três hoje
   consolidados em `supabase/criar-bd/` (ver a mudança de 2026-09-01, abaixo do índice).
3. **Dependências** — `recharts` (admin-web) e `xlsx`/SheetJS (core) desinstalados,
   por serem exclusivos dos módulos removidos.

> O script de reset também foi podado (142 → 43 linhas): hoje derruba **apenas** as
> estruturas do CORE. Consequência a conhecer: se algum banco ainda tiver tabelas dos
> módulos antigos (`tasks`, `conciliador_*`, `fin_*`), **este script não as remove mais** —
> elas precisam ser derrubadas manualmente uma única vez.

---

## Idioma

Sempre responda em português do Brasil.

---

## Regra de Ouro: Um Arquivo por Função

**Nunca concentre múltiplas responsabilidades em um único arquivo.**
Se um arquivo ultrapassar ~150 linhas, é sinal de que ele deve ser fatiado.
Crie subpastas e sub-arquivos. Prefira muitos arquivos pequenos e focados a poucos arquivos gigantes.
Isso vale para serviços, componentes, hooks, seções de formulário, filtros de busca e ações de servidor.

---

## Regra de Ouro: Separação entre Plataforma e Módulos

A base multi-tenant (usuários, empresas, autenticação, configurações) é a **Plataforma Jairo ODC**.
As funcionalidades de negócio são **Módulos** independentes entre si.
Nunca misture código de plataforma com código de módulo, nem código de um módulo com outro.

---

## Estrutura do Monorepo

Nome do projeto: `plataforma-jairo-o-d-c-v4` (npm workspaces)

```
plataforma-jairo-o-d-c-v4/
├── apps/
│   ├── admin-web/          → Dashboard Web (Next.js 16.2.2)
│   └── mobile-app/         → App Mobile (Expo 57 / React Native 0.86.3)
├── packages/
│   └── core/               → @jairo/core — cérebro único compartilhado
├── supabase/
│   ├── criar-bd/           → Criação do banco do zero (3 arquivos, ordem 00→01→02)
│   │   ├── plataforma_00_reset.sql    → Demolidor: derruba tudo do CORE
│   │   ├── plataforma_01_schema.sql   → Construtor: schema consolidado v10
│   │   └── plataforma_02_seed.sql     → Hidratador: dados iniciais obrigatórios
│   ├── testes/             → 🆕 v10: teste_rls.sql prova as travas de acesso no banco
│   ├── migrations/         → 🆕 v10: vazia; ler o README antes do primeiro dado real
│   └── config.toml         → Configuração do Supabase CLI
└── package.json            → Workspace root
```

---

## Comandos

Na **raiz do repositório**:
```bash
npm install          # Instala as dependências de todos os workspaces
npm run web          # Inicia o admin-web em desenvolvimento (porta 3000)
```

> `packages/core` **não tem script de build** e não precisa de um: é consumido como
> TypeScript cru via `transpilePackages: ["@jairo/core"]` no `next.config.ts` e via
> `metro.config.js` no mobile. O `package.json` da raiz ainda declara um script de build
> do core que aponta para um alvo inexistente no `@jairo/core` — ele falha ao ser executado
> e não deve ser usado.

Em **apps/admin-web**:
```bash
npm run dev          # Servidor de desenvolvimento Next.js
npm run build        # Build de produção
npm run lint         # ESLint 9
```

Em **apps/mobile-app**:
```bash
npm run start        # Servidor Expo
npm run android      # Build Android
npm run ios          # Build iOS
```

Não há scripts de teste em nenhum pacote.

---

## Versões Exatas das Tecnologias

| Tecnologia | Versão |
|---|---|
| Next.js | 16.2.2 |
| React | 19.2.3 (nos dois apps) |
| React Native | 0.86.3 |
| Expo | ~57.0.20 |
| Expo Router | ~57.0.19 |
| expo-local-authentication | ~57.0.2 |
| expo-secure-store | ~57.0.3 |
| expo-dev-client | ~57.0.18 |
| TypeScript | estrito em todos os pacotes |
| TailwindCSS | 4 (admin-web) |
| Lucide React | `lucide-react@^1.14` (web) · `lucide-react-native@^1.8` (mobile) |

**Atenção:** O Next.js 16 tem breaking changes em relação ao 15.
Antes de mexer em rotas ou middleware do admin-web, consulte `apps/admin-web/AGENTS.md`.

⚠️ **Os pacotes do Expo agora seguem o número do SDK, não a própria linha.** O
`expo-router` pulou de `~6.0.23` para `~57.0.19`, o `expo-secure-store` de `~15.0.8` para
`~57.0.3`, e assim por diante — não é salto de 51 versões, é o esquema de numeração que
mudou para casar com o SDK. Quem vir `~57` num pacote que "estava na 15" não deve tentar
"corrigir" para baixo.

⚠️ **Esta tabela já mentiu.** Em 2026-09-07 ela ainda dizia Expo ~54.0.33 e RN 0.81.5,
enquanto o repositório estava em Expo 57 / RN 0.86.3 — dois SDKs subiram sem que ninguém
atualizasse aqui. **A fonte da verdade são os `package.json`**; esta tabela é conveniência.
Ao desconfiar, confira:

```bash
node -p "Object.entries(require('./apps/mobile-app/package.json').dependencies).map(([k,v])=>k+' '+v).join('\n')"
```

---

## Versões do Sistema

Controladas exclusivamente em `packages/core/src/constants/versions.ts`:

```
WEB_VERSION  = "v10 - 2026-09-11-01"
APP_VERSION  = "v10 - 2026-09-11-02"
```

Convenção de commit: `WEB_v10 YYYY-MM-DD – NN - APP_v10 YYYY-MM-DD - NN`

---

## O Cérebro Único — `@jairo/core` (packages/core)

**Regra absoluta:** toda inteligência de negócio nasce aqui.
Nunca escreva lógica de validação, chamada ao Supabase ou evento de analytics diretamente no admin-web ou no mobile-app. Escreva no core, exporte pelo `src/index.ts`, consuma nos apps.

### Conexão com o Supabase
`src/lib/supabase.ts`
Instância única (Singleton). Detecta o ambiente via `navigator.product`:
- No React Native: aplica fetch customizado compatível com o Expo
- No Next.js: aplica `cache: 'no-store'`
- **Nunca importar React Native no nível de módulo** (quebra o build da Vercel)

Exporta dois clientes:
- `supabase` — cliente anon (RLS ativo). Usado por componentes React no browser.
- `supabaseAdmin` — cliente service role (bypassa RLS). Usado exclusivamente por serviços chamados a partir de Server Actions. **Nunca usar no mobile.**

### Constantes
`src/constants/versions.ts` — versões Web e Mobile

### Analytics (telemetria local — sem provedor externo)
```
src/analytics/
├── eventNames.ts       → constantes de nomes de eventos
├── propertyNames.ts    → constantes de propriedades dos eventos
├── telemetry.ts        → registrador local (capture/identify/group/reset)
└── index.ts            → exportação do módulo
```
Nunca escrever strings de eventos soltos nos apps. Sempre usar as constantes deste módulo.

O `telemetry` grava apenas no console do ambiente atual (`console.debug`): nenhum
`fetch`, cookie, `localStorage` ou chave de API. Se um dia entrar um provedor real,
ele entra **aqui dentro** — os apps não mudam.

```typescript
import { telemetry, ANALYTICS_EVENTS } from '@jairo/core';
telemetry.capture(ANALYTICS_EVENTS.AUTH_ATTEMPT_SUBMIT, { ... });
```

### Serviços de Plataforma
```
src/services/platform/
├── authService.ts        → login (senha), Google, signOut, refresh, triagem, ehDesenvolvedor
├── googleAuthService.ts  → Google OAuth 2.0 do PROPRIETÁRIO (popup e redirecionamento)
├── profileService.ts     → perfil: ler, completar, editar e apagar a conta
├── tenantService.ts      → empresas, membros, permissões, módulos por membro
└── settingsService.ts    → configurações globais (cores, título, emails admin)
```

> `authService.googleSignInOwner()` é uma **fachada fina** sobre o `googleAuthService`:
> existe para que a guarita tenha uma porta só, sem que a tela precise saber qual serviço
> chamar para cada tipo de acesso. A lógica mora no `googleAuthService`.

### Exportação
`src/index.ts` — porta de entrada. Exporta tudo: clientes, serviços, tipos, constantes, analytics.

---

## O Banco de Dados — Supabase (PostgreSQL + RLS)

### `supabase/criar-bd/` — Criação do Banco do Zero (v10)

**Esta pasta não contém migrations.** Ela contém os três arquivos que **criam o banco
inteiro do zero**, na ordem `00 → 01 → 02`. O ciclo desta plataforma é *wipe + rebuild*,
não evolução incremental — o nome da pasta diz isso explicitamente.

```
supabase/criar-bd/
├── plataforma_00_reset.sql    → O Demolidor  — TRUNCATE auth.users/identities + DROP das 4 tabelas,
│                                               6 funções e 2 triggers do CORE
├── plataforma_01_schema.sql   → O Construtor — schema consolidado v10: 2 extensões, 4 tabelas,
│                                               4 RLS ENABLE, 1 seed, 6 funções, 12 policies,
│                                               2 triggers, 4 ALTER COLUMN
└── plataforma_02_seed.sql     → O Hidratador — dados iniciais obrigatórios (linha `id = 1` de
                                                `global_settings`), idempotente via DO UPDATE SET
```

**Como executar** (SQL Editor do Supabase — colar cada arquivo inteiro, na ordem):
```
1) plataforma_00_reset.sql    ← apenas em desenvolvimento/teste. DESTRUTIVO.
2) plataforma_01_schema.sql
3) plataforma_02_seed.sql
```

> Em banco novo e vazio, o `plataforma_00_reset.sql` pode ser pulado: o `plataforma_01_schema.sql` já cria
> tudo do zero. Rode o `00` só quando precisar demolir um banco existente antes.

> O `plataforma_01_schema.sql` já embute o mesmo `INSERT` de `global_settings` que está no
> `plataforma_02_seed.sql`. A diferença: o do schema usa `ON CONFLICT DO NOTHING` (só cria se
> faltar), o do seed usa `ON CONFLICT DO UPDATE` (reaplica cores e título). Rodar o
> `02` depois do `01` é o que permite reajustar o white-label sem reset destrutivo.

> **Escopo do `plataforma_00_reset.sql`:** restrito ao CORE. Se algum banco ainda tiver tabelas
> dos módulos antigos (`tasks`, `conciliador_*`, `fin_*`), este script **não** as
> remove — precisam ser derrubadas manualmente uma única vez.

**Se um dia houver migrations de verdade (v10+):** crie uma pasta
`supabase/migrations/` separada, ao lado de `criar-bd/`. A distinção fica explícita:
`criar-bd/` reconstrói do zero, `migrations/` evolui um banco em produção.

#### Histórico: as 7 migrations da v4

O `criar-bd/plataforma_01_schema.sql` é a consolidação de `core_platform_00_schema.sql` até
`core_platform_06_auto_confirm_email.sql`, que foram **apagadas** na v5. A consolidação
eliminou uma race condition real: a `04` derrubava com `DROP POLICY` uma policy criada
na `00` para recriá-la corrigida. No arquivo único, a policy
`"Acesso à Empresa (Dono ou Membro)"` já nasce na forma final (Dono **OU** membro ativo).

Ordem interna obrigatória do `plataforma_01_schema.sql`, que não deve ser reordenada:
funções **antes** das policies que as chamam (`check_is_tenant_member`,
`check_is_tenant_owner`), e trigger **BEFORE** (`on_auth_user_auto_confirm`) antes do
**AFTER** (`on_auth_user_created`).

### Tabelas Principais

**Plataforma:**
- `users` — perfil (id, email, full_name, role, is_superuser, is_client_owner, is_active, `planet` **NOT NULL** default `'TERRA'`, `country` **NOT NULL** default `'BRASIL'`, `state`, `city`, `auth_provider` **NOT NULL** default `'email'`, `profile_completed` **NOT NULL** default `false`)
- `tenants` — empresas (id, tenant_name, slug, owner_id, is_active)
- `tenant_members` — vínculos (tenant_id, user_id, role: OWNER|DEPENDENT|VIEWER, allowed_modules text[], module_configs jsonb)
- `global_settings` — singleton (id=1), white-label (cores, título) e admin_emails

### Regras Críticas do Banco

- `allowed_modules` em `tenant_members` é `text[]` — nunca string separada por vírgula
- Toda lógica multi-passo no banco deve ser uma única função SQL `SECURITY DEFINER` transacional — nunca uma sequência de chamadas TypeScript separadas
- RLS ativo em todas as tabelas. Escudo: toda query começa com `tenant_id = p_tenant_id`
- Views e funções de módulo usam `SECURITY INVOKER` para respeitar RLS do usuário logado
- Extensão `unaccent` ativada na seed para buscas sem acento

---

## O Site Administrativo — `apps/admin-web`

Next.js 16.2.2 com App Router. Antes de mexer em rotas ou middleware, ler `AGENTS.md`.

### Configurações
- `next.config.ts` — `transpilePackages: ["@jairo/core"]`
- `src/proxy.ts` — renova a sessão SSR a cada requisição e barra celular em `/dashboard`
  - ⚠️ **v10: era `middleware.ts`.** No Next.js 16 a convenção `middleware` está
    depreciada e foi renomeada para `proxy`; o `proxy` roda sempre no runtime
    Node.js (o `middleware` rodava no Edge). O build confirma a troca: ele lista
    `ƒ Proxy (Middleware)` no relatório de rotas.
- ⚠️ **Não existe `src/lib/supabaseAdmin.ts`** — nunca existiu como arquivo, e
  desde a v10 não existe cliente de chave mestra em lugar nenhum da aplicação
- Path alias: `@/*` → `src/*`

### Variáveis de Ambiente
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          ← nunca exposta no navegador
EXPO_PUBLIC_API_URL                ← URL base usada pelo Core para chamar as API Routes
NEXT_PUBLIC_GOOGLE_CLIENT_ID       ← Client ID do Google; o MESMO cadastrado no Supabase
```

> Sem `NEXT_PUBLIC_GOOGLE_CLIENT_ID` o login do Proprietário **não quebra**: a tela troca o
> popup pelo redirecionamento conduzido pelo Supabase. O popup, porém, só existe com ela.

Modelo versionado: `apps/admin-web/.env.example`.

> **Removidas na v4** (nenhum código as lê mais): `RESEND_API_KEY`,
> `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_PERSONAL_API_KEY`,
> `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

### Rotas da Aplicação
```
src/app/
├── page.tsx
├── layout.tsx                      → layout raiz (sem provedores externos)
├── auth/
│   ├── actions.ts                  → loginWithCatracaAction (senha + cookies SSR)
│   ├── google-actions.ts           → syncGoogleSessionAction (cookies SSR do popup Google)
│   ├── google/callback/route.ts    → retorno do OAuth por redirecionamento (caminho de reserva)
│   ├── logout/route.ts             → limpa os cookies de sessão (metade servidor do logout)
│   └── complete-profile/page.tsx   → endereço da tela de completar cadastro
├── mobile-blocked/page.tsx         → destino do redirecionamento de user agent móvel
└── dashboard/
    ├── page.tsx                    → orquestrador: lobby, dashboard dev ou operacional
    ├── settings/page.tsx
    └── tenants/
        ├── page.tsx
        └── actions.ts
```

> Não existe mais a pasta `src/app/actions/` — todas as Server Actions que ela continha
> pertenciam aos módulos removidos. As únicas actions restantes são as de plataforma,
> em `src/app/auth/actions.ts` e `src/app/dashboard/tenants/actions.ts`.

### API Routes — ⚠️ TODAS REMOVIDAS NA v10

> **Nenhuma das rotas listadas abaixo existe mais.** As nove `/api/*` rodavam com
> a chave mestra e **não pediam identificação**: quem soubesse o endereço criava
> empresas, promovia usuários e trocava as cores do sistema. Autenticá-las seria
> remendo; o desenho certo é o banco decidir. Cada operação virou uma função
> `admin_*` no PostgreSQL, que confere `is_superuser()` com a sessão de quem
> chama — e a mesma chamada serve à web e ao aplicativo.
>
> | Rota antiga | O que faz hoje |
> |---|---|
> | `GET /api/admin/users` | `admin_list_users()` |
> | `GET /api/admin/user-tenants` | `admin_list_user_tenants(uuid)` |
> | `POST /api/admin/sync-tenants` | `admin_sync_user_tenants(uuid, jsonb, uuid[])` |
> | `GET /api/users/pending` | `admin_list_users()` (a tela filtra) |
> | `POST /api/users/promote` | `admin_promote_to_owner(uuid, text)` |
> | `POST /api/settings` | `admin_update_global_settings(jsonb)` |
> | `GET /api/settings` | `settingsService.getGlobalSettings()` (leitura pública) |
> | `GET /api/tenants` | removida — estava quebrada (pedia a coluna `name`, que não existe) |
> | `POST /api/notify-admin` | removida — só escrevia no log do servidor |
>
> A listagem original fica abaixo como registro do que existia.

### API Routes (registro histórico — v9)
```
src/app/api/
├── admin/                          → ⚠️ porta HTTP do Painel de Engenharia do MOBILE
│   ├── users/route.ts              → GET  todos os usuários (tenantService.getAllUsers)
│   ├── user-tenants/route.ts       → GET  ?userId= — empresas de um usuário
│   └── sync-tenants/route.ts       → POST cria/desativa/reabilita empresas + ajusta o papel
├── notify-admin/route.ts           → registra novo cadastro no log do servidor
├── settings/route.ts
├── tenants/route.ts
└── users/
    ├── pending/route.ts
    └── promote/route.ts
```

> `auth/verify-email/` e `analytics/audit-logs/` foram apagadas na v4: a primeira
> servia ao gate de confirmação de e-mail, a segunda consultava a API do PostHog.

### Componentes — Separação por Área

**Autenticação:**
```
src/components/auth/
├── Catraca.tsx             → modo BYPASS: sempre libera, sem rede nem chave de API
├── hooks/useAuthLogic.ts
└── views/
    ├── MainMenuView.tsx          → SEM botão de cadastro (v7)
    ├── AccessOptionsView.tsx
    ├── LoginGoogleOwnerView.tsx  → PROPRIETÁRIO: só o botão do Google (v7)
    ├── CompleteProfileView.tsx   → cadastro pela metade (obrigatório, sem "voltar")
    ├── LoginFormsView.tsx        → DEPENDENTE e DESENVOLVEDOR: e-mail + senha
    ├── SignUpView.tsx            → só alcançável pelo desvio de planeta
    ├── TenantSelectorView.tsx
    └── MiscViews.tsx
```

> ⚠️ `LoginFormsView.tsx` **não atende mais** o `login-owner`. O `AuthInterface` roteia
> `login-owner` para o `LoginGoogleOwnerView` e deixa apenas `login-dependent` e
> `login-developer` no formulário de senha.

**Dashboard — Perfil (fatiado por responsabilidade):**
```
src/components/dashboard/profile/
├── ProfileModal.tsx          → moldura e escolha do painel
├── useProfileModal.ts        → estado e chamadas de serviço
├── ProfileDetailsView.tsx    → leitura
├── ProfileEditForm.tsx       → edição
└── DeleteAccountConfirm.tsx  → confirmação da exclusão
```

**Utilitários compartilhados:**
```
src/lib/logout.ts             → encerra as DUAS metades da sessão (navegador + cookies)
src/lib/mobileBlock.ts        → fonte única do bloqueio móvel (rota, mensagem, regex de user agent)
src/hooks/useBrazilCities.ts  → cidades do IBGE (cadastro e edição de perfil)
src/hooks/useIsMobile.ts      → largura da janela < 768px (breakpoint `md`)
```

**Provedores:**
```
src/components/providers/
└── GoogleAuthProvider.tsx  → casca "use client" do Google Identity Services;
                              sai da frente quando não há Client ID configurado
```

**Dashboard:**
```
src/components/dashboard/
├── DashboardHeader.tsx
└── views/
    ├── OperationalDashboardView.tsx
    ├── DeveloperDashboardView.tsx
    └── LobbyView.tsx
```

**Plataforma:**
```
src/components/platform/
└── team/
    └── TeamManagementModal.tsx
```

**Utilitários:**
```
src/components/
├── MobileBlocker.tsx       → cortina de bloqueio em telas < 768px; montada no layout raiz
└── SearchableSelect.tsx    → select com busca; aceita `id` para vincular um <label>
```

> 📱 **O bloqueio móvel tem duas camadas, e só uma delas vale.** O `MobileBlocker`
> mede a **largura real da janela** e cobre toda rota — é o portão de verdade. O
> middleware barra por **user agent** apenas em `/dashboard`, redirecionando para
> `/mobile-blocked`; user agent se falsifica em dois cliques, então essa camada é
> conveniência (evita renderizar o painel), não segurança. O `MobileBlocker` **não
> renderiza em `/mobile-blocked`**: aquela página já é a mensagem, e o overlay
> enterraria o botão "Ir para a Home" dela.
>
> ⚠️ **`ipad` está fora da regex do middleware de propósito** — tablet em paisagem
> é uso permitido pela própria mensagem. Quando estreito demais, quem barra é a
> camada de largura.

> A pasta `src/components/analytics/` (com o `AuditLogView.tsx`) e a
> `src/components/providers/` (com o `PostHogProvider.tsx`) foram apagadas na v4.
> O `AuditLogView` já estava sem consumidor desde a remoção dos módulos, e dependia
> inteiramente da API do PostHog.

---

## O Aplicativo Mobile — `apps/mobile-app`

Expo 57 / React Native 0.86.3 com Nova Arquitetura ativada.
Roteamento via Expo Router 57.

### Configurações
- `metro.config.js` — vigia `workspaceRoot` para resolver `@jairo/core`
- `babel.config.js` — tradução de código moderno para nativo
- `app.json` — nome: "Plataforma Jairo O D C", scheme: "plataformajairo"
- Path alias: `@/*` → `src/*`

### Variáveis de Ambiente
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL
```

Modelo versionado: `apps/mobile-app/.env.example`.
`EXPO_PUBLIC_POSTHOG_KEY` foi removida na v4.

### Estrutura de Rotas

```
app/
├── _layout.tsx              → layout raiz + porteiro (boot, sessão, biometria)
├── +html.tsx                → casca HTML, só na web
├── +not-found.tsx
├── modal.tsx
├── auth/
│   └── google.tsx           → retorno do deep link plataformajairo://auth/google
├── central-comandos.tsx     → Painel de Engenharia: triagem de usuários e empresas
├── ajustes-globais.tsx      → Painel de Engenharia: white-label (título, e-mails, cores)
├── (auth)/                  → guarita: tudo antes de entrar
│   ├── _layout.tsx
│   ├── index.tsx            → menu principal
│   ├── login.tsx
│   ├── signup.tsx
│   ├── complete-profile.tsx
│   ├── select-tenant.tsx
│   ├── about.tsx
│   └── contact.tsx
└── (tabs)/                  → painel: barra de abas NATIVA do sistema
    ├── _layout.tsx          → NativeTabs
    ├── index.tsx            → painel (cliente ou engenharia, pelo papel)
    └── perfil.tsx           → Meu Perfil (escondido do Desenvolvedor)
```

> ⚠️ **`app/auth/` NÃO É O GRUPO `app/(auth)/`.** Com parênteses é grupo e
> some da URL; sem parênteses é segmento real. A rota do retorno do Google
> precisa responder em `/auth/google`, exatamente como está cadastrado no
> Supabase — por isso ela fica fora do grupo.

> ⚠️ **Não existe `app/index.tsx`.** Ele foi absorvido pelo `app/_layout.tsx` na
> v9 porque `(auth)/index.tsx` também responde em `/` — duas rotas no mesmo
> endereço, e o Expo Router não escolhe entre elas.

> A aba `two.tsx` foi removida junto com o módulo de Tarefas — ela era o dashboard de tarefas
> inteiro (rotulado como "Ajustes" no tab bar por engano histórico). A segunda aba de hoje é
> `perfil`, e ela é condicional: ver "Abas nativas — v9" abaixo.

### Componentes e Telas Mobile
```
components/
├── auth/RegisterForm.tsx
├── client/ClientDashboard.tsx
└── developer/DeveloperDashboard.tsx

screens/
├── ProfileScreen.tsx        → orquestrador dos três painéis do Meu Perfil
├── profile/                 → useProfileScreen, ProfileIdentity, ProfileDetailsView,
│                              ProfileEditForm, DeleteAccountConfirm, ProfileRow, iniciais
├── admin/                   → Painel de Engenharia (v9)
│   ├── CommandCenterScreen.*    → triagem de usuários + clientes operacionais
│   ├── TenantManagerModal.*     → gerenciar as empresas de um usuário
│   ├── TenantLists.tsx          → habilitadas + histórico
│   ├── UserListItem.tsx         → um usuário na lista
│   ├── GlobalSettingsScreen.*   → white-label
│   ├── ColorField.tsx           → hexadecimal + amostra ao vivo (não há input color no RN)
│   ├── useCommandCenter.ts      → lista e divide pendentes/operacionais
│   ├── useTenantManager.ts      → estado do gerenciador + gravação
│   └── useGlobalSettingsScreen.ts
├── AboutScreen.tsx
└── SupportScreen.tsx
```

> ⚠️ **`screens/admin/` é a ÚNICA parte do app que fala HTTP em vez de Supabase.**
> As operações do Painel de Engenharia exigem service role, e o Desenvolvedor do
> mobile não tem sessão Supabase para a RLS reconhecer. Ver `adminApiService`.

### Otimização v9 — gestos, ciclo de vida e tema animado

Três frentes entraram na v9, cada uma em arquivo próprio (regra de ouro), todas
com o carimbo `[OTIMIZADO PARA MÁXIMA PERFORMANCE]` no TSDoc.

| Arquivo | Papel |
|---|---|
| `src/lib/gestureRuntime.ts` | Fonte única de "há gestos nativos?" + `require` preguiçoso |
| `src/components/GestureRoot.tsx` | `GestureHandlerRootView` real, ou um `View` |
| `src/components/GestureArea.tsx` | `GestureDetector` real, ou nada na árvore |
| `src/hooks/useSheetDragGesture.ts` | Arrasto para fechar a folha do `SearchableSelect` |
| `src/hooks/usePermissionWatch.ts` | Realtime + `AppState`, extraído do `_layout.tsx` |
| `src/context/ThemeAnimationContext.tsx` | Shared values das cores do white-label |
| `src/hooks/useAnimatedThemeColor.ts` | Consome o contexto: fundo, texto e borda animados |

⚠️ **A detecção de gestos NÃO pergunta pelo ambiente, e não deve passar a
perguntar.** `Constants.executionEnvironment` do `expo-constants` devolve
`storeClient` tanto no Expo Go quanto num development build com `expo-dev-client`
— justamente os dois casos que precisam ser distinguidos. Quem responde é
`TurboModuleRegistry.get('RNGestureHandlerModule')`, e a checagem ainda confirma
que o módulo traz as funções da v3 (`flushOperations`,
`updateGestureHandlerConfig`, `installUIRuntimeBindings`): um módulo da era v2
responde ao nome e só estoura depois, no primeiro gesto.

⚠️ **O `GestureHandlerRootView` volta por `require()`, nunca por `import`.** O
`import` estático é içado e avaliado em todo ambiente — foi ele que matava o
Expo Go no arranque, e é por isso que a v8 arrancou os imports em vez de
protegê-los com `try/catch`. O erro acontece na avaliação do módulo, não no JSX.

⚠️ **O canal Realtime cai só em `background`, nunca em `inactive`.** O iOS entra
em `inactive` a cada central de controle ou seletor de apps; derrubar o websocket
ali gastaria mais bateria do que mantê-lo aberto. E o retorno ao `active` remonta
o canal por um `getSession()` explícito — `onAuthStateChange` **não** dispara ao
voltar do background, então confiar nele deixaria a vigilância morta pelo resto
da sessão, em silêncio.

⚠️ **O canal vive num `useRef`, não numa variável de efeito.** São dois efeitos
(autenticação e ciclo de vida) que precisam falar do mesmo canal; um `let` em
cada um daria a cada efeito a sua própria cópia, e o corte em background nunca
aconteceria — sem erro nenhum para denunciar.

**Perfis de build** (`eas.json`, em `apps/mobile-app/`): `development` (APK + dev client),
`preview` (APK interno) e `production` (app-bundle, com `autoIncrement`). Os
gestos funcionam nos três; no Expo Go o app sobe igual, sem eles.

### Menus do sistema — v9

Dois hooks e um componente, todos sem dependência nova: quem desenha o menu é o
sistema operacional.

| Arquivo | Papel |
|---|---|
| `src/hooks/useNativeActionSheet.ts` | Menu de ações: `ActionSheetIOS` no iOS, `AlertDialog` no Android |
| `src/hooks/useNativeContextMenu.ts` | Fachada fina sobre o anterior, para o gesto de segurar |
| `src/components/NativeContextMenu.tsx` | Envoltório `Pressable` com `onLongPress` |

⚠️ **`ActionSheetAndroid` NÃO EXISTE.** O React Native expõe `ActionSheetIOS` e
mais nada nessa família — uma busca por `ActionSheetAndroid` em todo o
`node_modules/react-native` não devolve ocorrência nenhuma. Escrever
`ActionSheetAndroid.showActionSheetWithOptions` estoura no aparelho com
`ReferenceError`. No Android, o menu desenhado pelo sistema é o `AlertDialog`,
que é o que `Alert.alert` abre.

⚠️ **No máximo TRÊS ações no Android.** O `AlertDialog` tem três papéis de botão
(positivo, negativo, neutro) e a partir do quarto o `Alert` simplesmente não o
mostra. O hook avisa em `__DEV__` em vez de fingir que coube.

⚠️ **Não use action sheet para o `SearchableSelect`.** As listas dele têm 250
países e 5.570 municípios: no Android o teto acima mata a ideia, e no iOS seria
uma parede rolante sem campo de busca — pior que a folha atual, que filtra
enquanto se digita. Action sheet é para punhado de ações, não para catálogo.

⚠️ **O `UIMenu` do iOS 13 não é isto, e não está exposto pelo React Native.**
Aquele menu com fundo escurecido, prévia levantada e ícones SF Symbols exige um
módulo nativo de terceiro (`react-native-context-menu-view`), com suporte fraco
no Android e recompilação a cada SDK. Decisão do dono do projeto (2026-09-06):
ficar no núcleo. Se um dia mudar, a troca acontece inteira dentro de
`useNativeContextMenu` — as telas só conhecem `abrir(itens)`.

### Abas nativas — v9

A barra de abas passou de `<Tabs>` (React Navigation, desenhada em JavaScript)
para `<NativeTabs>` de `expo-router/unstable-native-tabs`, que instancia o
controlador de abas REAL de cada plataforma: `UITabBarController` no iOS e
`BottomNavigationView` no Android, via `RNSTabsHostIOS` / `RNSTabsHostAndroid`
do `react-native-screens`. **Zero dependência nova.**

| Arquivo | Papel |
|---|---|
| `app/(tabs)/_layout.tsx` | `NativeTabs` + gatilhos; esconde "Perfil" do Desenvolvedor |
| `app/(tabs)/perfil.tsx` | Endereço da segunda aba (reexporta a tela) |
| `src/screens/ProfileScreen.tsx` | Meu Perfil: leitura + sair, com confirmação nativa |
| `src/hooks/useSessionRole.ts` | Papel da sessão, para compor a barra |
| `src/components/InstitutionalFooter.tsx` | Rodapé © + versão, agora dentro do conteúdo |

⚠️ **Não instale `@react-navigation/bottom-tabs`.** O expo-router traz o
navegador embutido em `build/react-navigation/bottom-tabs`; o pacote avulso
colocaria uma segunda cópia no bundle, em versão que ninguém garante casar.

⚠️ **A barra nativa não desenha cabeçalho.** O título do white-label migrou para
o `<Stack.Screen name="(tabs)">` de `app/_layout.tsx`, que já tinha `settings` em
mãos. Isso eliminou de quebra a **segunda** busca de `global_settings` que o
`(tabs)/_layout.tsx` fazia a cada abertura do painel.

⚠️ **A barra nativa é dona da borda inferior.** O rodapé institucional não cabe
mais abaixo dela: virou o último elemento do conteúdo de cada aba, fixo logo
acima da barra. Ver `components/InstitutionalFooter.tsx`.

⚠️ **Nunca alterne `hidden` depois de a barra montar.** O Expo Router remonta o
navegador e zera o estado — a aba trocaria sozinha sob o dedo do usuário. Por
isso o `(tabs)/_layout.tsx` espera `useSessionRole().carregando` terminar antes
de renderizar: a barra nasce com a composição final e nunca mais muda.

⚠️ **Esconder aba não é controle de acesso.** O papel vem do cofre do aparelho,
que é gravável por quem tem o aparelho. Quem protege dado é a RLS — o mesmo erro
do `sessionStorage.dev_vip_access` documentado acima.

**Ícones:** `sf` (SF Symbols) no iOS e `md` (Material Symbols) no Android — do
sistema, não de fonte empacotada. Foi por isso que o `lucide-react-native` saiu
da barra: um ícone nosso ficaria correto e ainda assim estrangeiro ali.

⚠️ **`unstable-` no caminho de importação é aviso de verdade.** A API pode mudar
em versão menor do expo-router. Se ela quebrar, o `<Tabs>` anterior está no
commit `9a41664` e volta com um `git checkout`.

**Abas por papel:** usuários comuns veem `Início` e `Perfil`; o Desenvolvedor vê
só `Início`, porque não tem linha em `public.users` para um perfil carregar.
## Segurança de Autenticação — v10

### Proprietário — Google OAuth 2.0

1. `LoginGoogleOwnerView` mostra **só** o botão do Google (sem e-mail, sem senha)
2. O popup devolve um ID Token; `authService.googleSignInOwner` → `googleAuthService`
   troca por sessão via `supabase.auth.signInWithIdToken`
3. `ensure_google_user_profile` confirma o perfil em `public.users` (rede de segurança:
   o gatilho `on_auth_user_created` já é o caminho normal)
4. `syncGoogleSessionAction` espelha a sessão nos cookies HTTP — sem isso o servidor não
   enxerga o login feito no navegador
5. Segue para a triagem de empresas, igual ao fluxo de senha

> **Quem valida o token é o Supabase**, contra o Client ID cadastrado no provedor Google.
> Validar o ID Token no navegador seria teatro: um cliente comprometido validaria o que
> quisesse. Por isso o Core não tem nenhuma função `validateGoogleToken`.

### Dependente e Desenvolvedor — e-mail + senha (inalterado)

A catraca anti-bot (Cloudflare Turnstile) foi removida. O fluxo hoje é:

1. `Catraca.tsx` é renderizado no login, mas **sempre libera** (bypass) — sem token,
   sem rede, sem chave de API
2. `loginWithCatracaAction` chama direto o `authService.signIn`
3. Sessão gravada nos cookies HTTP via `createServerClient` + `setSession()` no servidor
   — elimina o loop "Aguardando Triagem"
4. Não há confirmação de e-mail: após o cadastro o usuário já pode entrar

> **Se um dia voltar a haver verificação anti-bot**, ela entra dentro do `Catraca.tsx`
> e volta a condicionar o submit do `LoginFormsView` — a Server Action já está isolada.

### Acesso de Desenvolvedor (Painel de Engenharia)

> 🔄 **REESCRITO NA v10.** O texto abaixo descreve o desenho ANTIGO e está
> mantido como registro. **Hoje não existe credencial fixa:** o Desenvolvedor é
> um usuário real do Supabase com `is_superuser = true` em `public.users`, criado
> à mão pelo painel (ver `plataforma_02_seed.sql`). Quem confere o papel é o
> banco, dentro das funções `admin_*` e da `is_superuser()`.

**Como era até a v9** — a credencial era **fixa no código**, em
`packages/core/src/services/platform/authService.ts`:

```typescript
if (email === 'admin@pjodc.ia' && pass === '1qaz') { ... }
```

Não há variável de ambiente, rota de servidor nem hash. Funciona sem nenhuma configuração,
inclusive numa máquina limpa — foi por isso que a versão com bcrypt foi revertida.

> ⚠️ **Riscos conhecidos e aceitos** (decisão do dono do projeto, 2026-08-31):
> - A senha está em texto puro no repositório e no bundle do navegador.
> - O e-mail é lowercase e a senha é `1qaz` minúsculo — `1QAZ` **não** funciona.
> - O privilégio é mantido em `sessionStorage.setItem('dev_vip_access','true')`, que o
>   navegador controla: dá para setar essa chave pelo DevTools e entrar sem senha.
>
> Se um dia isso for endurecido, a correção certa é `is_superuser` no banco com
> verificação server-side por RLS — **não** basta esconder a senha, porque o portão
> real é o `sessionStorage`.

---

## Analytics — telemetria local

- Eventos e propriedades centralizados em `packages/core/src/analytics/`
- A captura é feita pelo `telemetry` (`console.debug`), sem provedor externo
- A trilha de auditoria cruzada com o PostHog não existe mais

---

## Padrões Obrigatórios ao Criar Código

### Adicionar novo serviço de plataforma
1. Criar em `packages/core/src/services/platform/<nomeService>.ts`
2. Exportar em `packages/core/src/index.ts`
3. Consumir via `import { nomeService } from '@jairo/core'`

### Adicionar novo módulo
1. Criar `packages/core/src/services/modules/<nome>/`
2. SQL do módulo: `supabase/criar-bd-<nome>/`, arquivos `<nome>_00_reset` / `<nome>_01_schema` /
   `<nome>_02_seed` — o prefixo é o dono do schema, como `plataforma_*` é o do CORE
3. Nunca acrescentar DROPs nem CREATEs de módulo aos arquivos de `supabase/criar-bd/` —
   essa pasta é exclusiva do CORE
4. Admin-web: `src/app/dashboard/<nome>/` + `src/components/<nome>/`
5. Nunca compartilhar tabelas entre módulos
6. Todos os serviços do módulo que são chamados de Server Actions devem usar `supabaseAdmin`

### Uso do cliente Supabase
- Componentes React no browser: `import { supabase } from '@jairo/core'`
- Serviços de módulo chamados por Server Actions: `import { supabaseAdmin } from '@jairo/core'`
- SSR: usar `@supabase/ssr` com cookies (configurado no middleware)

### Datas e Fusos Horários
- Nunca `toISOString()` para datas de emissão/vencimento
- Usar "Midnight Local" para datas do Brasil
- No banco: `(coluna AT TIME ZONE 'America/Sao_Paulo')::date`
- Formatação: `.toLocaleString('sv-SE')`

---

## Dependências Principais por App

**admin-web:** `@supabase/ssr`, `@supabase/supabase-js`, `@react-oauth/google`, `tailwindcss@4`, `lucide-react`

**mobile-app:** `@supabase/supabase-js`, `expo-local-authentication`, `expo-secure-store`, `expo-router`

**core:** `@supabase/supabase-js`

> `recharts` (admin-web) e `xlsx`/SheetJS (core) foram **desinstalados** junto com os módulos:
> eram usados só pelos gráficos e pelos parsers de planilha do Conciliador.
>
> Na v4 saíram também `posthog-js`, `resend` e `@marsidev/react-turnstile` (admin-web),
> junto das integrações que os usavam.

---

## O Que NÃO Fazer (Proibições Absolutas)

- ❌ Nunca reintroduzir o cliente de chave mestra (`supabaseAdmin`) no Core — ele foi removido na v10; operação administrativa é função `admin_*` no banco, com `is_superuser()` conferido lá dentro
- ❌ Nunca criar rota HTTP (`/api/*`) ou Server Action que escreva no banco sem verificar a sessão de quem chamou — a documentação do Next.js avisa que Server Action é alcançável por POST direto
- ❌ Nunca declarar `SUPABASE_SERVICE_ROLE_KEY` em `.env` lido pela aplicação (web ou mobile); se uma rotina de manutenção precisar, o cliente nasce e morre dentro dela
- ❌ Nunca conceder permissão de tabela ao `authenticated` sem pensar na coluna: `GRANT UPDATE (colunas)` é o que impede um usuário de gravar `is_superuser` no próprio perfil
- ❌ Nunca escrever policy sem a cláusula `TO` — o padrão do PostgreSQL é PUBLIC, e foi assim que a lista de usuários ficou aberta até a v9
- ❌ Nunca confiar em `sessionStorage`, `SecureStore` ou qualquer marca no cliente como autorização — o papel vem do banco (`is_superuser()`)
- ❌ Nunca importar React Native no nível de módulo dentro de `packages/core`
- ❌ Nunca salvar `allowed_modules` como string separada por vírgula — desde a v10 a coluna é `text[]` de verdade (até a v9 ela era `text` e os tipos do TypeScript mentiam)
- ❌ Nunca guardar valor monetário em ponto flutuante — centavos inteiros no código (`lib/dinheiro.ts`), `numeric(14,2)` ou `bigint` no banco
- ❌ Nunca gravar data de vencimento/competência como `timestamptz` — use `date`; `timestamptz` é para o INSTANTE de um registro
- ❌ Nunca calcular fuso à mão (`-3 horas`) — use `lib/datas.ts`, que trata o horário de verão pelo `Intl`
- ❌ Nunca quebrar uma operação transacional do banco em chamadas TypeScript separadas — usar uma função SQL única
- ❌ Nunca reportar resultado de teste SQL por `RAISE NOTICE` — o SQL Editor do Supabase descarta mensagens do servidor e mostra `Success. No rows returned`; grave os vereditos numa tabela e termine o arquivo com um `SELECT`
- ❌ Nunca criar arquivo com múltiplas responsabilidades distintas
- ❌ Nunca misturar lógica de plataforma com módulo, nem módulo com módulo
- ❌ Nunca usar `toISOString()` para datas que precisam respeitar UTC-3
- ❌ Nunca criar strings de eventos de telemetria avulsas — usar `ANALYTICS_EVENTS` do Core
- ❌ Nunca reintroduzir SDK de serviço externo (analytics, e-mail, anti-bot) sem passar pelo Core
- ❌ Nunca colocar chave de API ou segredo de terceiro no código — usar variável de ambiente
  (exceção consciente: a credencial do Painel de Engenharia, documentada acima)
- ❌ Nunca gravar `users.country` como `NULL` — a coluna é `NOT NULL` e o padrão é `'BRASIL'`
- ❌ Nunca gravar `users.auth_provider` como `NULL` — é `NOT NULL` e o padrão é `'email'`
- ❌ Nunca rotear `login-owner` para o `LoginFormsView` — o Proprietário entra só por Google
- ❌ Nunca detectar o provedor consultando `auth.identities` dentro do gatilho `on_auth_user_created` — a identidade ainda não existe naquele instante; usar `raw_app_meta_data->>'provider'`
- ❌ Nunca criar perfil em `public.users` por `upsert` do cliente anon — não há policy de INSERT; usar a função `SECURITY DEFINER` `ensure_google_user_profile`
- ❌ Nunca usar `@supabase/auth-helpers-nextjs` — descontinuado e ausente do projeto; o padrão aqui é `@supabase/ssr`
- ❌ Nunca fazer logout chamando só `authService.signOut()` no admin-web — a sessão também vive nos cookies HTTP; usar `encerrarSessao()` de `src/lib/logout.ts`
- ❌ Nunca escrever uma função `SECURITY DEFINER` que age sobre um id recebido por parâmetro sem compará-lo com `auth.uid()` — o RLS não protege dentro de `SECURITY DEFINER`
- ❌ Nunca renderizar `COUNTRIES`/`BRAZIL_STATES` como string em `<option>` — são `{ label, value }[]`; usar o `SearchableSelect`
- ❌ Nunca chamar `.from('public.users')` no PostgREST — o nome da tabela é `users`; com o prefixo dá 404
- ❌ Nunca resolver tenantId via `.single()` em `tenant_members` — o usuário pode ter múltiplos vínculos; passe o tenant como prop/parâmetro explícito
- ❌ Nunca reutilizar o cliente Supabase após erro de constraint para executar rollback — criar novo cliente
- ❌ Nunca usar `supabase` (anon client) em serviços chamados por Server Actions — usar `supabaseAdmin`
- ❌ Nunca usar `GROUP BY` + `ORDER BY coluna_não_agrupada` via CTE em funções PostgreSQL — usar subquery correlacionada
- ❌ Nunca usar `document.addEventListener('mousedown', fechar)` para fechar dropdowns inline — usar `'click'` para não bloquear o evento do botão
- ❌ Nunca espalhar o objeto do formulário (`...item`) no payload de inserção — mapear explicitamente apenas as colunas que existem na tabela
- ❌ Nunca importar `react-native-gesture-handler` por `import` estático no mobile — o módulo é avaliado em todo ambiente e mata o Expo Go no arranque; usar `carregarGestos()` de `src/lib/gestureRuntime.ts`
- ❌ Nunca detectar Expo Go por `Constants.executionEnvironment` — `storeClient` também cobre development builds; sondar o módulo nativo com `TurboModuleRegistry.get`
- ❌ Nunca guardar um canal Realtime numa variável local de `useEffect` quando outro efeito precisa encerrá-lo — cada efeito ficaria com a sua cópia; usar `useRef`
- ❌ Nunca derrubar o canal Realtime em `AppState === 'inactive'` — o iOS passa por esse estado a cada gesto trivial; só `background` significa que o usuário foi embora
- ❌ Nunca contar com `onAuthStateChange` para remontar algo ao voltar do background — ele reage a login/logout/refresh, não ao ciclo de vida do app
- ❌ Nunca aplicar um estilo de `useAnimatedStyle` num `View` comum — só os componentes do Reanimated o entendem, e num `View` cru ele falha em silêncio
- ❌ Nunca usar `ActionSheetAndroid` — o símbolo não existe no React Native; no Android o menu do sistema é o `AlertDialog`, aberto por `Alert.alert`
- ❌ Nunca passar mais de 3 ações a um menu nativo no Android — o `AlertDialog` só tem três papéis de botão e as excedentes somem
- ❌ Nunca instalar `@react-navigation/bottom-tabs` neste projeto — o expo-router já traz o navegador embutido; instalar duplica a cópia no bundle
- ❌ Nunca passar `component` a um `<Stack.Screen>` do expo-router — ali as telas vêm dos arquivos de `app/`, e a prop é ignorada
- ❌ Nunca fixar `userInterfaceStyle` no `ActionSheetIOS` — omitir faz o menu seguir a aparência do sistema, que é o comportamento nativo
- ❌ Nunca importar um ícone direto de `lucide-react-native` numa tela — usar o registro de `src/components/icon/Icon.tsx`; a v1 renomeou o catálogo e o nome antigo devolve `undefined` sem acusar erro de build
- ❌ Nunca usar `import * as Lucide from 'lucide-react-native'` — o curinga arrasta o catálogo inteiro para o bundle
- ❌ Nunca escrever `fontSize`/`fontWeight` solto num `StyleSheet` de tela — usar `TIPOGRAFIA` de `src/constants/Typography.ts`
- ❌ Nunca escrever margem ou recheio fora da grade de 8pt — usar `ESPACO` de `src/constants/Spacing.ts`
- ❌ Nunca temar um componente do mobile passando `backgroundColor` pelo `style` — cor de texto não se herda em React Native; usar a prop `escuro`
- ❌ Nunca pôr uma tela que não é aba dentro de `app/(tabs)/` — o `NativeTabs` monta um gatilho por rota do grupo e ela vira aba
- ❌ Nunca espalhar tipografia em `authStyles.campo` — o `SearchableSelect` o aplica num `Pressable`, e `TextStyle` não é atribuível a `ViewStyle`
- ❌ Nunca contornar rota nova com `as Href` no `router.push` — `.expo/types/router.d.ts` é gerado; rodar `npx expo start` uma vez
- ❌ Nunca cadastrar a URI do app (`exp://…`, `plataformajairo://…`) no Google Cloud Console — quem se apresenta ao Google é o Supabase, com `https://<ref>.supabase.co/auth/v1/callback`; a URI do app vai na lista de Redirect URLs do **Supabase**
- ❌ Nunca tentar fazer o login Google do mobile funcionar no Expo Go — o GoTrue rejeita o esquema `exp://` (literal e curinga, ambos testados); use development build, onde o endereço é `plataformajairo://auth/google`
- ❌ Nunca interpretar "o navegador parou numa página estranha" como falha do app — quando o `redirect_to` não casa com a lista do Supabase, o GoTrue cai **silenciosamente** na Site URL, sem erro nenhum
- ❌ Nunca chamar `tenantService` ou `settingsService.updateGlobalSettings` direto do mobile — usam `supabaseAdmin`; no aparelho a porta é o `adminApiService`, que fala com `/api/admin/*`
- ❌ Nunca deixar `EXPO_PUBLIC_API_URL` em `localhost` para uso em aparelho — `localhost` no telemóvel é o telemóvel; use o IP da máquina na rede ou a URL publicada
- ❌ Nunca dar valor padrão à URL base de operações que ESCREVEM no banco — um host chutado grava noutra implantação em silêncio
- ❌ Nunca esperar `<input type="color">` no React Native — ele não existe; use campo hexadecimal com amostra, e só pinte a amostra com hexadecimal válido
- ❌ Nunca tratar "remover empresa" como exclusão — é `is_active = false`, e o histórico com "Reabilitar" depende disso
- ❌ Nunca ler o deep link do OAuth com `Linking.useURL()` numa rota de callback — com o app já aberto ele devolve `null` para sempre (o evento `url` disparou antes de a tela montar); espere a SESSÃO pelo supabase-js
- ❌ Nunca confiar só no `WebBrowser.openAuthSessionAsync` para receber o retorno do OAuth no mobile — o Expo Router escuta o mesmo deep link, e sem a rota `app/auth/google.tsx` o app cai em "Endereço não encontrado" (`+not-found`)
- ❌ Nunca concluir que o OAuth do mobile está configurado porque o da web funciona — popup usa "Origens JavaScript autorizadas", redirecionamento usa "URIs de redirecionamento"; são metades independentes do mesmo OAuth client

---

## Pulos do Gato — Lições Aprendidas

Estas lições nasceram durante o desenvolvimento dos módulos que já foram removidos, mas o
aprendizado é genérico (Supabase, PostgreSQL, React) e continua valendo para a plataforma.
Os exemplos foram reescritos com nomes de tabela neutros.

---

### 1. supabaseAdmin obrigatório para serviços chamados por Server Actions

**Problema:** Serviços do `@jairo/core` que usam o cliente `supabase` (anon) falham com erro de RLS
quando chamados a partir de Server Actions. Em contexto servidor, o cliente anon não tem acesso aos
cookies do browser, logo `auth.uid()` retorna NULL, e qualquer política RLS que dependa de
`auth.uid()` bloqueia a operação com:
`"new row violates row-level security policy for table '...'"`

**Solução:** Todo serviço chamado por Server Actions deve usar `supabaseAdmin` em vez de `supabase`.
A segurança é garantida pela validação de sessão no nível da action, não pelo RLS.

```typescript
// ❌ ERRADO para serviços chamados por Server Actions:
import { supabase } from '../../lib/supabase';
await supabase.from('minha_tabela').insert(...)

// ✅ CORRETO:
import { supabaseAdmin } from '../../lib/supabase';
await supabaseAdmin!.from('minha_tabela').insert(...)
```

---

### 2. GROUP BY via CTE bloqueia ORDER BY coluna não agrupada no PostgreSQL

**Problema:** Quando uma função PostgreSQL usa um CTE (`WITH ... AS (SELECT ...)`) e depois faz
`GROUP BY` no alias do CTE, o banco NÃO reconhece dependências funcionais pelo primary key.
`ORDER BY p.created_at` falha com:
`"column must appear in the GROUP BY clause or be used in an aggregate function"`
mesmo que `p.id` (primary key) esteja no GROUP BY.

**Solução:** Usar subquery correlacionada para agregar os filhos em vez de LEFT JOIN + GROUP BY.
É mais legível, resolve o problema de escopo e não exige GROUP BY.

```sql
-- ❌ ERRADO (GROUP BY via CTE — ORDER BY created_at falha):
WITH pais_filtrados AS (SELECT p.* FROM pai p WHERE ...)
SELECT p.id, jsonb_agg(f.*) FROM pais_filtrados p
LEFT JOIN filho f ON f.pai_id = p.id
GROUP BY p.id, p.data, ...
ORDER BY p.data DESC, p.created_at DESC;  -- ← ERRO

-- ✅ CORRETO (subquery correlacionada):
SELECT p.id, p.created_at,
  COALESCE((SELECT jsonb_agg(...) FROM filho f WHERE f.pai_id = p.id), '[]')
FROM pai p WHERE ...
ORDER BY p.data DESC, p.created_at DESC;  -- ← FUNCIONA
```

---

### 3. mousedown vs click no fechamento de dropdowns flutuantes

**Problema:** Usar `document.addEventListener('mousedown', fechar)` para fechar dropdowns causa
falha silenciosa nos botões de ação dentro do dropdown. O `mousedown` dispara ANTES do React
processar qualquer evento. A sequência é:
1. Usuário clica em EDITAR dentro do dropdown
2. `mousedown` no documento → `fechar()` → `menuAberto = null` (estado agendado)
3. React re-renderiza → dropdown desmonta (botão EDITAR some)
4. `click` tenta disparar no botão que já foi desmontado → nada acontece

**Solução:** Usar `'click'` em vez de `'mousedown'`. Com `click`, o React processa o `onClick` do
botão interno antes do evento subir ao documento, garantindo que a ação execute antes do fechamento.
O `stopPropagation` também deve ser no `onClick` (não `onMouseDown`) do container do dropdown.

```typescript
// ❌ ERRADO — fecha antes de executar a ação:
document.addEventListener('mousedown', fechar);
// no container: onMouseDown={(e) => e.stopPropagation()}

// ✅ CORRETO — executa a ação antes de fechar:
document.addEventListener('click', fechar);
// no container: onClick={(e) => e.stopPropagation()}
```

---

### 4. position:fixed para dropdowns dentro de containers overflow

**Problema:** Dropdowns com `position: absolute` dentro de modais com `overflow-y: auto` são
clipados (cortados) pelo container scroll. O menu some atrás do modal.

**Solução:** Usar `position: fixed` com coordenadas calculadas via `getBoundingClientRect()` no
momento do clique. O menu flutua sobre tudo, independente de overflow.

```typescript
// No onClick do botão que abre o menu — DETECTAR ESPAÇO DISPONÍVEL:
const rect = e.currentTarget.getBoundingClientRect();
const ALTURA_MENU = 106; // aprox. 3 itens de 35px
const espacoAbaixo = window.innerHeight - rect.bottom;
setMenuPos({
  top: espacoAbaixo < ALTURA_MENU + 8
    ? rect.top - ALTURA_MENU - 4   // abre para CIMA (evita esconder atrás da taskbar)
    : rect.bottom + 4,             // abre para BAIXO (padrão)
  right: window.innerWidth - rect.right,
});
```

---

### 5. Árvore hierárquica com MAX (não COUNT) para numeração permanente

**Problema:** Usar `COUNT(filhos)` para gerar o próximo número hierárquico causa colisão após
exclusões. Se "1.1" é excluído, o próximo filho vira "1.1" novamente — conflito com registros
históricos que referenciavam o número antigo.

**Solução:** Usar `MAX(último segmento numérico dos filhos existentes) + 1`. O número é imutável
após atribuído. Exclusões não reordenam os irmãos.

```typescript
// ❌ ERRADO — colisão após exclusão:
const proximo = filhosExistentes.length + 1;

// ✅ CORRETO — preserva numeração mesmo após exclusões:
const segmentos = filhos.map(f => parseInt(f.nivel_numerico.split('.').pop() || '0'));
const proximo = Math.max(0, ...segmentos) + 1;
```

---

### 6. Mapeamento explícito de colunas ao inserir (nunca espalhar o objeto do formulário)

**Problema:** Espalhar o objeto do formulário no payload de inserção (`...item`) leva TODOS
os campos do estado do frontend para o banco, incluindo campos auxiliares de UI como
`*_label`, que não existem na tabela. O Supabase retorna:
`"Could not find the 'xxx_label' column of 'minha_tabela' in the schema cache"`

**Solução:** Mapear explicitamente apenas as colunas que existem no banco:

```typescript
// ❌ ERRADO — espalha campos de label do frontend:
const payload = itens.map(item => ({ ...item, tenant_id, pai_id }));

// ✅ CORRETO — apenas colunas reais do banco:
const payload = itens.map(item => ({
  tenant_id,
  pai_id,
  descricao: item.descricao,
  quantidade: item.quantidade,
  valor_unitario: item.valor_unitario,
  valor_total: item.valor_total,
}));
```

---

### 7. isTypingRef — evitar cursor saltando para o final em inputs controlados

**Problema:** Em inputs controlados com `type="text"` que formatam o valor (ex: números
em formato BRL), um `useEffect([valorExterno])` que atualiza o estado local de string
dispara a cada tecla pressionada (porque o pai atualiza o estado ao receber o novo valor),
resetando o cursor para o final do input.

**Solução:** Usar um `useRef` como flag para ignorar o `useEffect` quando a mudança
veio do próprio usuário:

```typescript
const montadoRef = useRef(false);
const isTypingRef = useRef(false);

const handleChange = (e) => {
  isTypingRef.current = true;      // sinaliza: mudança veio do usuário
  setInputStr(e.target.value);
  onValorChange(parse(e.target.value));
};

useEffect(() => {
  if (!montadoRef.current) { montadoRef.current = true; return; }
  if (isTypingRef.current) { isTypingRef.current = false; return; } // ignora
  setInputStr(formatar(valorExterno)); // só atualiza se veio de fora
}, [valorExterno]);
```

---

### 8. Dropdown que abre para cima quando próximo à borda inferior

**Problema:** Dropdown com `position: fixed` e `top: rect.bottom + 4` fica escondido
atrás da barra de tarefas do sistema quando o botão está próximo da borda inferior.

**Solução:** Verificar o espaço disponível antes de posicionar:

```typescript
const ALTURA_MENU = 106; // aprox. 3 botões × 35px
const espacoAbaixo = window.innerHeight - rect.bottom;
setPos({
  top: espacoAbaixo < ALTURA_MENU + 8
    ? rect.top - ALTURA_MENU - 4  // abre para cima
    : rect.bottom + 4,            // abre para baixo (padrão)
  right: window.innerWidth - rect.right,
});
```

---

### 9. `redirect_uri_mismatch` num OAuth intermediado aponta para o INTERMEDIÁRIO, não para o seu app

**Problema:** no OAuth conduzido pelo Supabase (`signInWithOAuth`), o `redirectTo` que o app
informa **não é** o `redirect_uri` que chega ao Google. São dois saltos:

```
app ──(redirectTo: plataformajairo://…)──►  Supabase  ──(redirect_uri: https://<ref>.supabase.co/auth/v1/callback)──►  Google
                                                ◄── volta aqui primeiro ──┘
     ◄──(só agora o deep link é usado)──────────┘
```

Ler o `Erro 400: redirect_uri_mismatch` como "a URI do app está errada" leva a cadastrar
`exp://`, `localhost` e IP privado no Google Console — valores que o Google **nunca compara**
e que ele ainda recusa por formato. O erro estava dizendo outra coisa: falta o callback do
**intermediário** na lista.

**Solução:** cadastrar cada endereço no painel de quem o consome.

```
Google Cloud Console › URIs de redirecionamento  →  https://<ref>.supabase.co/auth/v1/callback
Supabase › URL Configuration › Redirect URLs     →  plataformajairo://auth/google
```

⚠️ **A igualdade é exata, query string incluída.** O cadastro deste projeto tinha
`…/auth/v1/callback?provider=google`; o Supabase envia sem a query. Um caractere a mais e o
Google recusa. E o `?provider=google` é a confusão natural: é o parâmetro do *endpoint do
Supabase*, não do cadastro no Google.

**Generalizando:** vale para qualquer OAuth com intermediário (Supabase, Auth0, Firebase,
Clerk). O provedor de identidade só conhece o intermediário; o seu deep link é assunto entre
você e o intermediário. **Pergunte sempre "quem faz a chamada ao Google?"** — o `redirect_uri`
pertence a quem faz a chamada, não a quem recebe o usuário no fim.

**Armadilha de diagnóstico associada:** o caminho do popup (`signInWithIdToken`, usado pela
web) não passa por redirect URI nenhum. Um login web saudável **não é evidência** de que o
OAuth client está configurado para o mobile — é a mesma credencial exercitada por outra
metade. Ver `apps/mobile-app/src/lib/oauthDiagnostics.ts`, que imprime os dois endereços
lado a lado no Metro.
