# AGENTS.md — `apps/mobile-app`

Guia específico do aplicativo mobile. O guia geral da plataforma é o `CLAUDE.md` da
raiz do repositório; leia-o também.

---

## 🔵 DOSSIÊ: LOGIN DO PROPRIETÁRIO POR GOOGLE

> **Este dossiê existe porque o problema consumiu ~10 rodadas de depuração em
> 2026-09-07, e nenhuma delas era um erro de código.** Todas as causas eram de
> configuração, em painéis externos ao repositório, com sintomas que apontavam
> para o lugar errado. Se você vai mexer no login Google do mobile, leia isto
> inteiro antes — economiza um dia.

### Estado em 2026-09-07

| Item | Estado |
|---|---|
| Cadastro no Google Cloud Console | ✅ correto e **verificado contra o Google** |
| `exp://` na lista do Supabase (Expo Go) | ❌ **rejeitado pelo GoTrue** — abandonado |
| `plataformajairo://` na lista do Supabase | ✅ **aceito pelo GoTrue** (verificado) |
| Development build (EAS) | ✅ construído e instalado em Android |
| Fluxo fim a fim no aparelho | ✅ concluído em 2026-09-07 (manhã) |
| Rota `app/auth/google.tsx` | ✅ **acrescentada e VERIFICADA em aparelho** em 2026-09-07 (tarde) — ver causa raiz nº 3 |
| Retorno com o app já aberto | ✅ **corrigido e VERIFICADO em aparelho** em 2026-09-07 — ver causa raiz nº 4 |

✅ **O fluxo funciona.** Confirmado num aparelho Android real com development
build: login pelo Google, portão do `profile_completed`, cadastro completado e
sessão criada. O retorno ao app pelo deep link `plataformajairo://auth/google`
acontece sozinho, sem passar por página de erro.

⚠️ **Nunca foi testado no iOS.** O perfil `development` do `eas.json` tem
`"simulator": true` para iOS, mas nenhum build de iOS foi feito. O esquema
`plataformajairo` está declarado no `app.json` e vale para as duas plataformas,
então a expectativa é que funcione — expectativa, não verificação.

---

### Causa raiz nº 3 — o app não tinha a rota `auth/google` (2026-09-07, tarde)

**Sintoma:** escolher a conta do Google e o app abrir *"Endereço não encontrado —
a tela que você tentou abrir não existe nesta versão do aplicativo"* — o
`+not-found.tsx`, **dentro do app**, não uma página do navegador.

⚠️ **O deep link chega ao app POR DOIS CAMINHOS, e só um estava implementado.**
`WebBrowser.openAuthSessionAsync` escuta o retorno e o devolve a quem chamou;
mas quem entrega o `plataformajairo://auth/google` é o SISTEMA OPERACIONAL, e o
assinante de links do Expo Router recebe o mesmo evento. O roteador procura um
arquivo em `app/` que responda por `/auth/google` — não existia nenhum — e vai
para o `+not-found`.

⚠️ **É UMA CORRIDA, e é por isso que "funcionou uma vez".** Com o app em primeiro
plano e o `openAuthSessionAsync` vivo, ele às vezes fecha a Custom Tab antes de o
roteador navegar, e o login termina normalmente. Já quando o retorno **abre o app
do zero**, não há `openAuthSessionAsync` nenhum para capturar coisa alguma: só a
rota pode concluir o login. Depender da corrida é depender da sorte.

✅ **Correção confirmada pelo dono do projeto em aparelho Android real
(2026-09-07, tarde):** login pelo Google concluído sem passar pelo `+not-found`.
⚠️ **iOS continua sem verificação** — o esquema `plataformajairo` vale para as
duas plataformas e a rota é a mesma, mas isso é expectativa, não teste.

**Correção (código, desta vez — as duas primeiras causas eram de painel):**

| Arquivo | Papel |
|---|---|
| `app/auth/google.tsx` | ✨ **NOVO** — a rota que faltava; conclui a sessão, passa pelo portão do `profile_completed` e chama a triagem |
| `src/lib/oauthCallbackSession.ts` | ✨ **NOVO** — converte a URL de retorno em sessão; um só código para os dois caminhos |
| `src/lib/googleOAuthMobile.ts` | Passou a usar o módulo acima; tolera a sessão já criada pela rota |
| `app/_layout.tsx` | O porteiro **não redireciona** quando o app abriu por `auth/google` |

⚠️ **A ROTA PRECISA FICAR EM `app/auth/`, com o segmento `auth` REAL.** Em
`app/(auth)/` o grupo desaparece da URL e o endereço viraria `/google`, que não é
o que está cadastrado no Supabase. Em `app/(tabs)/` ela viraria uma aba.

⚠️ **O PORTEIRO DO `_layout.tsx` MATAVA A ROTA NO BERÇO.** O boot faz
`router.replace(temSessao ? '/(tabs)' : '/(auth)')` uma vez — e numa abertura por
deep link isso atropela a tela de retorno antes de ela concluir o login. A
verificação usa `Linking.getInitialURL()`, que é determinística, e **não** os
segmentos da rota, que dependem de o roteador já ter montado.

---

### Causa raiz nº 4 — `Linking.useURL()` não serve para ler o retorno

**Sintoma:** com o app JÁ ABERTO, escolher a conta do Google deixava a tela
"Concluindo o login…" girando para sempre. Voltar (botão do aparelho) revelava a
tela correta embaixo.

⚠️ **`Linking.useURL()` NUNCA ENTREGA O DEEP LINK QUANDO O APP JÁ ESTÁ ABERTO.**
Olhe a implementação: ela faz `getInitialURL()` e assina o evento `url`.

  • `getInitialURL()` devolve a URL que **abriu** o app — com o app rodando, `null`;
  • o evento `url` **já disparou antes** — foi ele que fez o Expo Router navegar
    para `/auth/google`. Quando a tela monta e assina o evento, ele já passou.

A rota ficava presa numa guarda `if (url === null) return;` que nunca liberava.

⚠️ **O SINTOMA ESCONDIA A CAUSA: só o Proprietário SEM EMPRESA via o problema.**
No fluxo normal o `useGoogleLogin` termina em `router.replace('/(tabs)')`, que
destrói a pilha inteira e leva a tela travada junto — ninguém percebia. Já
`tratarSemVinculos('OWNER')` apenas chama `setView('waiting-approval')` na tela
de login, **sem navegar**: a tela travada continuava por cima, girando, enquanto
a tela certa esperava embaixo. Foi por isso que "voltar" parecia consertar.

✅ **Correção confirmada pelo dono do projeto em aparelho (2026-09-07):** com usuário
pendente, a tela vai sozinha para "Aguardando Triagem", sem precisar voltar.

**Correção:** a rota parou de depender da URL e passou a esperar a **sessão**.

| Caso | Quem tem o retorno | Como a rota resolve |
|---|---|---|
| App aberto PELO deep link (frio) | a própria URL inicial | `getInitialURL()` + `concluirSessaoOAuth` |
| App já rodando (quente) | o `openAuthSessionAsync` | `esperarSessao()` — o supabase-js é a fonte comum |

`esperarSessao()` (em `lib/oauthCallbackSession.ts`) consulta `getSession()` a
cada 250ms, no máximo 24 vezes. **O teto é deliberado:** sem ele, alguém que
alcançasse `/auth/google` sem login nenhum giraria para sempre.

⚠️ **A CHECAGEM DE MONTAGEM VEM ANTES DO `triar`, e não só depois.** O `triar`
NAVEGA POR DENTRO quando acha empresa; se o outro caminho já concluiu e
desmontou a rota, chamá-lo faria uma segunda navegação para o mesmo lugar.

---

### Como o fluxo REALMENTE funciona (dois saltos, não um)

Este é o mal-entendido que originou tudo. O `redirectTo` que o app informa **não
é** o `redirect_uri` que chega ao Google:

```
  app  ──(redirect_to: plataformajairo://auth/google)──►  Supabase
                                                             │
                    (redirect_uri: https://<ref>.supabase.co/auth/v1/callback)
                                                             ▼
                                                          Google
                                                             │
        ┌────────────── volta para o SUPABASE primeiro ──────┘
        ▼
     Supabase valida o redirect_to contra a SUA lista
        │
        ├─ válido   → redireciona para o app (tokens no fragmento)
        └─ inválido → **cai silenciosamente na Site URL**, sem erro nenhum
```

⚠️ **A queda para a Site URL é silenciosa.** Não há mensagem, não há log no
cliente, não há código de erro. O sintoma é o navegador parando numa página
inesperada (tipicamente `http://localhost:3000/#access_token=...`, a Site URL
padrão de todo projeto Supabase). Quem não conhece esse comportamento procura o
defeito no app, e não vai achar.

---

### Os DOIS cadastros, em DOIS painéis

| Valor | Onde se cadastra | Quem consome |
|---|---|---|
| `https://fycgttkchgheohqxuzza.supabase.co/auth/v1/callback` | **Google Cloud Console** › Credenciais › URIs de redirecionamento autorizados | O Google |
| `plataformajairo://auth/google` | **Supabase** › Authentication › URL Configuration › Redirect URLs | O Supabase |

⚠️ **O Google NUNCA recebe a URI do app.** Quem fala com o Google é o Supabase, e
ele se apresenta com a própria URL. Cadastrar `exp://…` ou `plataformajairo://…`
no Google Console é cadastrar um valor que o Google jamais vai comparar.

---

### Causa raiz nº 1 — `?provider=google` grudado no cadastro do Google

O Console tinha registrado:

```
https://fycgttkchgheohqxuzza.supabase.co/auth/v1/callback?provider=google   ❌
```

E o Supabase envia a URI **sem** query string. **O Google compara por igualdade
exata, e a query string entra na comparação** — um caractere a mais e falha com
`Erro 400: redirect_uri_mismatch`.

O sufixo `?provider=google` é confusão fácil: esse é o formato do parâmetro do
*endpoint de autorização do Supabase*, não do cadastro no Google.

⚠️ **A web passar no login não diz NADA sobre o mobile.** A web usa o caminho do
popup (`signInWithIdToken`), que se apoia em *Origens JavaScript autorizadas* e
**não tem redirect URI nenhum**. O mobile usa o redirecionamento, que só olha
para *URIs de redirecionamento*. São metades independentes do MESMO OAuth client
— uma pode estar certa há meses enquanto a outra está quebrada.

---

### Causa raiz nº 2 — o GoTrue rejeita o esquema `exp://`

Corrigido o Google, o fluxo passou a completar mas continuou caindo na Site URL.
Testes controlados, um `redirect_to` por vez:

| `redirect_to` | GoTrue |
|---|---|
| `https://example.com/oauth-test` | ✅ aceita |
| `plataformajairo://auth/google` | ✅ aceita |
| `exp://192.168.1.3:8081/--/auth/google` (literal, exato) | ❌ rejeita |
| `exp://**` (curinga) | ❌ rejeita |

A lista de Redirect URLs **funciona** (https e esquema customizado próprio
passam). O que ela não aceita é o `exp://`. A causa interna não foi determinada —
o que importa é a consequência prática.

⚠️ **Consequência: o login Google NÃO funciona no Expo Go, e não há configuração
que resolva.** O `exp://` só existe no Expo Go; ele desaparece assim que o app
tem identidade própria. Por isso a migração para **development build**.

---

### Por que development build, e não Expo Go

Não foi preferência: foi a única saída depois de esgotar a configuração.

- No Expo Go o endereço é `exp://<IP-da-sua-máquina>:8081/--/auth/google` —
  **muda de rede em rede**, exige recadastro num painel remoto a cada mudança, e
  ainda por cima é rejeitado.
- No development build o endereço é `plataformajairo://auth/google` — sem IP, sem
  porta, cadastrado **uma vez**, e idêntico ao que a produção usa.
- Bônus: some a diferença entre o ambiente de teste e o de produção, que era um
  risco silencioso (o Expo Go não é o que o usuário final recebe).

Perfis em `eas.json` (**neste diretório**, não na raiz — o EAS CLI exige
`eas.json` e `app.json` no mesmo lugar).

⚠️ **Não ponha `withoutCredentials: true` no perfil `development`.** Ele só serve
"quando o debug keystore está versionado no repositório", e aqui **não há
keystore nem pastas nativas**. O APK sairia sem assinatura e o Android recusa
instalar. Isso foi removido em 2026-09-07, antes do primeiro build.

---

### Ferramentas de verificação (sem aparelho, sem painel)

**O `redirect_uri` e o `client_id` que o Google realmente recebe:**

```bash
curl -sS -o /dev/null -D - \
  "https://fycgttkchgheohqxuzza.supabase.co/auth/v1/authorize?provider=google&redirect_to=plataformajairo%3A%2F%2Fauth%2Fgoogle" \
  | grep -i "^location:"
```

**O Google aceita a URI hoje?** (responde em uma linha)

```bash
curl -sS -o /dev/null -w '%{redirect_url}\n' \
  "https://accounts.google.com/o/oauth2/v2/auth?client_id=690521256015-d1ctoa6rlo0t0qjsbbt66u81o16h30b7.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Ffycgttkchgheohqxuzza.supabase.co%2Fauth%2Fv1%2Fcallback&response_type=code&scope=email+profile&state=t" \
  | grep -q "signin/oauth/error" && echo "RECUSANDO" || echo "ACEITO"
```

⚠️ **Não existe oráculo para a lista do Supabase.** O endpoint `/authorize` ecoa
o `redirect_to` igual para válidos e inválidos — testado com um domínio fora da
lista, que voltou idêntico. A validação só ocorre no callback, depois do
consentimento. Para testar um `redirect_to`, cadastre-o e abra o `/authorize`
**no navegador do PC**: se aterrissar no destino, é aceito; se cair na Site URL,
é rejeitado.

**Em tempo de execução:** `src/lib/oauthDiagnostics.ts` imprime no Metro os dois
endereços com o painel de destino de cada um, a cada tentativa de login. Leia o
bloco `🩺 OAUTH GOOGLE` **antes** de cadastrar qualquer coisa — nunca presuma o
valor do `redirect_to`, sempre copie o que foi impresso.

---

### O que NÃO fazer (tudo já tentado, tudo falhou)

- ❌ Cadastrar `exp://<IP>:8081/--/auth/google` no Google Console — IP privado, recusado por formato
- ❌ Cadastrar `exp://localhost:19000/--/auth/google` no Google Console — esquema customizado, recusado
- ❌ Cadastrar `http://localhost:8081` no Google Console — sem domínio público, recusado
- ❌ Cadastrar `http://<IP>:8081` no Google Console — IP privado, recusado
- ❌ Acrescentar `?provider=google` à URI de callback no Google Console — quebra a igualdade exata
- ❌ Insistir em `exp://` na lista do Supabase, literal ou curinga — o GoTrue rejeita
- ❌ Concluir que está configurado porque o login da web funciona — metades independentes
- ❌ Confiar só no `openAuthSessionAsync` para receber o retorno — o Expo Router escuta o mesmo deep link e, sem `app/auth/google.tsx`, cai em `+not-found`
- ❌ Ler o deep link do OAuth com `Linking.useURL()` na rota de callback — com o app já aberto ele devolve `null` para sempre; espere a SESSÃO, não a URL

**Alternativas cogitadas e descartadas, com o motivo:**

| Alternativa | Por que não |
|---|---|
| `expo-google-sign-in` | Descontinuado, fora do SDK do Expo |
| `@react-native-google-signin` | Legítimo, mas exige dev build + SHA-1 + client iOS — mais custo que a solução adotada, que reaproveita o código existente |
| Servidor intermediário local | Reconstruiria à mão o que `/auth/v1/callback` já é |
| Túnel (ngrok) | Resolveria o `redirect_to`, que nunca foi o problema |
| Página-ponte https no `admin-web` | Funcionaria, mas altera o `admin-web` (proibido pelo dono) e acrescenta peça permanente ao fluxo |

---

### Configuração final (valores exatos)

**Google Cloud Console** — client `690521256015-d1ctoa6rlo0t0qjsbbt66u81o16h30b7`
(tipo *Aplicativo Web*; só esse tipo tem o campo de URIs de redirecionamento):

```
URIs de redirecionamento autorizados:
  https://fycgttkchgheohqxuzza.supabase.co/auth/v1/callback

Origens JavaScript autorizadas (usadas SÓ pelo popup da web):
  https://plataforma-jairo-o-d-c-v9-admin-web.vercel.app
```

**Supabase** › Authentication › URL Configuration › Redirect URLs:

```
plataformajairo://auth/google
```

⚠️ O mesmo OAuth client serve web e mobile. Por isso o nome do app na **tela de
permissão OAuth** vale para as duas pontas — e por isso ele precisa estar
preenchido: em branco, o Google exibe "Projeto sem título" no consentimento e na
lista de apps vinculados do usuário, o que parece phishing.

---

### Arquivos envolvidos

| Arquivo | Papel |
|---|---|
| `app/auth/google.tsx` | A ROTA do deep link `plataformajairo://auth/google` — sem ela, `+not-found` |
| `src/lib/oauthCallbackSession.ts` | Converte a URL de retorno em sessão; trata implícito **e** PKCE |
| `src/lib/googleOAuthMobile.ts` | `WebBrowser.openAuthSessionAsync` + deep link |
| `src/lib/oauthDiagnostics.ts` | Imprime os dois endereços no Metro |
| `src/hooks/auth/useGoogleLogin.ts` | Portão do `profile_completed`, telemetria, triagem |
| `src/components/auth/LoginGoogleView.tsx` | Botão `outline` (diretriz de marca do Google) |
| `packages/core/src/services/platform/googleAuthService.ts` | `signInWithGoogleRedirect` — **compartilhado com a web, não quebrar o contrato** |

---

## 🛠️ PAINEL DE ENGENHARIA E MEU PERFIL — a paridade com o admin-web (v9)

### O que decide onde a operação roda

A pergunta que resolve qualquer dúvida aqui é **"quem é o usuário, e ele tem sessão
Supabase?"**:

| Tela | Quem usa | Tem sessão? | Como conversa com os dados |
|---|---|---|---|
| Meu Perfil | Proprietário / Dependente | ✅ sim | `profileService`, cliente **anon**, RLS autoriza |
| Painel de Engenharia | Desenvolvedor | ❌ **não** | `adminApiService` → HTTP → `/api/admin/*` |

⚠️ **O DESENVOLVEDOR NÃO TEM SESSÃO SUPABASE, E ISSO NÃO É UM DETALHE.** A credencial dele
é fixa no Core (`authService.developerSignIn`) e nunca passa pelo GoTrue. Então `auth.uid()`
é nulo e **nenhuma policy o reconhece** — não adianta escrever a RLS certa, não há
identidade para comparar. Some-se a isso que `getAllUsers`, `getUserTenantManagement`,
`syncUserTenants` e `updateGlobalSettings` usam `supabaseAdmin`, proibido no aparelho. As
duas coisas juntas fecham todas as portas exceto a do servidor.

### As três rotas novas do admin-web

```
GET  /api/admin/users                    → tenantService.getAllUsers()
GET  /api/admin/user-tenants?userId=…    → tenantService.getUserTenantManagement()
POST /api/admin/sync-tenants             → tenantService.syncUserTenants()
```

Elas existem **para o mobile**. O `admin-web` continua usando as Server Actions de sempre —
nada nele mudou. O que faltava era um ENDEREÇO: Server Action não é rota, é uma chamada RPC
interna do Next.js, com protocolo proprietário que o app não tem como falar.

A gravação dos ajustes globais reaproveita a `/api/settings`, que já existia.

⚠️ **AS SEIS ROTAS `/api` DESTE PROJETO NÃO TÊM AUTENTICAÇÃO**, e as três novas seguiram o
mesmo padrão — decisão consciente do dono do projeto (2026-09-07). Quem souber a URL lista
usuários e sincroniza empresas. Ao endurecer, o cabeçalho de segredo entra no
`adminApiService` (um ponto só) e a conferência nas rotas.

### `EXPO_PUBLIC_API_URL` — o engano que custa uma tarde

⚠️ **`localhost` NO APARELHO É O PRÓPRIO APARELHO.** `http://localhost:3000` funciona no
navegador do PC e falha no telemóvel com "Network request failed", porque o celular procura
um servidor nele mesmo. Use o IP da máquina na rede local (`http://192.168.x.x:3000`) ou a
URL publicada.

`packages/core/src/lib/apiBaseUrl.ts` **recusa `localhost` nomeando o engano**, em vez de
deixar a chamada morrer num erro genérico de rede. E ele **não tem valor padrão**:
`sincronizarEmpresas` cria e desativa empresas, e cair num host chutado significaria gravar
no banco de outra implantação, em silêncio.

### Detalhes que já custaram tempo em outros lugares

⚠️ **Não existe `<input type="color">` no React Native.** Os sete campos de cor são caixa
hexadecimal + amostra ao vivo. A amostra **só pinta com hexadecimal válido** — `"#12"` em
`backgroundColor` não avisa nada e no Android simplesmente não é aplicado, deixando o quadro
com a cor anterior, mentindo sobre o que está gravado.

⚠️ **"Remover" empresa é desativar, não apagar.** Vai para `is_active = false` e reaparece no
histórico com "Reabilitar". Empresa criada e removida antes de salvar some sem ir ao
histórico — nunca chegou ao banco.

⚠️ **A chave da lista de empresas inclui o índice.** Empresa nova ainda não tem `tenant_id`;
duas novas na mesma sessão colidiriam numa chave baseada só nele, e o React reaproveitaria a
linha errada ao remover uma delas.

⚠️ **`app/central-comandos.tsx` e `app/ajustes-globais.tsx` ficam FORA de `(tabs)/`** — dentro
do grupo virariam abas para todo mundo. E **esconder rota não é controle de acesso**: o papel
vem do cofre do aparelho, gravável por quem tem o aparelho.

---

## Outras notas do mobile-app

⚠️ **`eas.json` mora NESTE diretório**, não na raiz do monorepo. O EAS CLI define
a raiz do projeto pelo `app.json` e exige o `eas.json` ao lado.

⚠️ **Os pacotes do Expo seguem o número do SDK.** `expo-router@~57.0.19`,
`expo-secure-store@~57.0.3`, `expo-local-authentication@~57.0.2` — não são
versões "adiantadas", é o esquema de numeração do Expo casando com o SDK 57.
Não tente "corrigir" para as linhas antigas (`~6.x`, `~15.x`, `~17.x`).

⚠️ **A tabela de versões do `CLAUDE.md` da raiz já ficou dois SDKs atrasada uma
vez** (corrigida em 2026-09-07). A fonte da verdade é o `package.json` deste
diretório.
