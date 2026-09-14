# HISTÓRICO DE MUDANÇAS — Plataforma Jairo O D C

Este arquivo é a **memória do projeto**: o que mudou, em que data, e — o que mais importa —
**por quê**. Cada entrada traz as armadilhas encontradas em ⚠️, com o estrago que elas
causaram e o gesto que as causou.

Ele foi separado do `CLAUDE.md` em 14/09/2026, quando aquele arquivo passou do limite de
150 mil caracteres que o Claude Code carrega por conversa — o histórico respondia por 57%
dele. As **regras** continuam lá (`## O Que NÃO Fazer` e `## Pulos do Gato`); aqui está o
*porquê* de cada uma.

⚠️ **Leia este arquivo antes de reverter qualquer decisão que pareça estranha.** Quase
todas foram pagas com um defeito em produção.

⚠️ **Entrada nova vai no TOPO** (mais recente primeiro), logo abaixo desta abertura. A
**regra** que a mudança gerar sobe para o `CLAUDE.md`, na seção de proibições.

---

**2026-09-13 (noite) — v10: importar cadastros de um CSV/TSV pela coluna A**

Terceira rodada do dia. **Exige rodar de novo SÓ o `financeiro_01_schema.sql`.**

| Onde | O que entrou |
|---|---|
| `financeiro_01_schema.sql` 4.6-b/c | ✨ `fin_importar_contas_movimento` e `fin_importar_identificadoras` — o banco foi a **19 funções `fin_`** |
| `teste_financeiro.sql` | ✨ Testes **17 e 18**; o teste 16 e o porteiro pararam de usar número fixo. Foi para **18 testes** |
| ✨ `core/modules/financeiro/importacao.ts` | O leitor de CSV/TSV — função pura, sem React |
| ✨ `core/modules/financeiro/importacao.test.ts` | **17 testes** do leitor; `npm test` foi de 19 para **36** |
| `cadastroService` | ✨ `importarContasMovimento` e `importarIdentificadoras` |
| ✨ `components/financeiro/importar/` | `lerArquivo.ts`, `useImportacao.ts`, `ImportarCadastros.tsx` |
| `CadastroDeContas` | Botão IMPORTAR nas duas telas |

⚠️ **A IMPORTAÇÃO É UMA FUNÇÃO DE BANCO, NÃO UM LAÇO NA TELA.** Um laço chamando
`fin_gravar_conta_movimento` por linha faria 300 idas e voltas à internet num
arquivo de 300 nomes — e, se a conexão caísse na linha 180, metade entraria sem
ninguém saber qual metade. É uma chamada só, e o banco devolve o relatório.

⚠️ **MAS NÃO É "TUDO OU NADA".** Importar 300 cadastros não é uma operação
transacional única: cada nome é independente. Recusar as 300 porque 4 já
existiam seria hostil — e esse é o caso MAIS comum (a segunda importação do
mesmo arquivo corrigido). O desenho é **ignorar e dizer o que ignorou**.

⚠️ **SÃO TRÊS ESPÉCIES DE DUPLICATA, E "ESCRITO DIFERENTE" É UMA DELAS.** O
mesmo nome repetido no arquivo; o nome já cadastrado no banco; e o mesmo nome
com acento/caixa/espaço diferentes. A comparação usa `fin_normalizar` — a MESMA
função que alimenta `nome_normalizado` e o índice único (RN-02). Comparar por
igualdade crua deixaria os três passarem pelo filtro e o índice único derrubaria
a instrução inteira no fim, sem relatório nenhum.

⚠️ **"TRANSFERÊNCIA ENTRE CONTAS" É RECUSADO NA IMPORTAÇÃO DE CATEGORIAS, E O
MOTIVO É DE EFEITO TARDIO.** Essa categoria é criada pelo banco com
`is_sistema = true` na primeira transferência da empresa (RN-30). Se uma
importação a criasse antes como categoria comum, a primeira transferência
tentaria inserir a dela e bateria no índice único — **a transferência falharia
para sempre**, com um erro que não menciona importação. O estrago apareceria
dias depois do gesto que o causou. Teste 18 cobre isso.

⚠️ **`texto.split("\n").map(l => l.split(",")[0])` NÃO LÊ CSV.** Falha em quatro
situações comuns: vírgula dentro de aspas (`"MERCADO SILVA, LTDA"`); quebra de
linha dentro de aspas (CSV permite); **o Excel brasileiro usa ponto e vírgula**,
porque a vírgula é o separador decimal aqui; e `""` dentro de um campo é uma
aspa literal. O leitor percorre caractere a caractere, com estado.

⚠️ **A DETECÇÃO DO SEPARADOR TAMBÉM PRECISA RESPEITAR ASPAS — e o teste pegou
isso.** A primeira versão fazia `split('\n')[0]` para achar o separador. Num
arquivo que começa com `"CONTA COM\nDUAS LINHAS",X`, aquele split cortava dentro
das aspas e a "primeira linha" virava `"CONTA COM`, sem vírgula nenhuma: o
separador saía como inexistente e a coluna A vinha com o resto grudado. Agora a
contagem varre até 64 KB **ignorando o que está entre aspas**.

⚠️ **O BOM DO EXCEL FAZ O PRIMEIRO REGISTRO ENTRAR DUPLICADO PARA SEMPRE.**
Arquivo salvo como "CSV UTF-8" começa com o caractere invisível `U+FEFF`. Sem
removê-lo, o primeiro nome vira `﻿CAIXA` — **idêntico a "CAIXA" na tela e
outro texto para o banco**. Uma segunda importação criaria "CAIXA" ao lado, e
ninguém veria a diferença olhando.

⚠️ **O EXCEL EM PORTUGUÊS SALVA EM WINDOWS-1252, NÃO EM UTF-8.** Lido como
UTF-8, "ÁGUA" vira "�GUA" — e a importação **funciona**, gravando o lixo sem
erro nenhum. O leitor tenta UTF-8 primeiro e, se aparecer o caractere de
substituição `�`, relê tudo como Windows-1252. ⚠️ **A ordem não pode ser
invertida:** o Windows-1252 nunca falha (qualquer byte é válido nele), então
seria ele a corromper um UTF-8 legítimo, em silêncio. Só o UTF-8 sabe dizer
"estes bytes não são meus".

⚠️ **A PRÉVIA USA A LISTA COM OS INATIVOS, NÃO A LISTA DA TELA.** A lista
visível está filtrada (por padrão, só ativos), mas um cadastro DESATIVADO
continua ocupando o índice único. Usando a lista visível, a prévia diria "novo"
sobre um nome que o banco vai ignorar — a pessoa marcaria 40 e receberia 37.

⚠️ **O RELATÓRIO FINAL É DO BANCO, NÃO A PRÉVIA REPETIDA.** A prévia é um
palpite feito no navegador; entre conferir e gravar, outra pessoa pode ter
cadastrado o mesmo nome na outra ponta. Mostrar a prévia como resultado seria
mentir com confiança.

⚠️ **TESTE COM NÚMERO MÁGICO ENVELHECE SOZINHO.** O teste 16 dizia "as 16
funções" com o 16 escrito à mão; as duas funções novas o fizeram acusar
"18 de 16" e **falhar com o código certo**. Agora o total é contado do catálogo.
O pior efeito de um teste assim não é falhar — é ensinar quem lê a ignorar o
vermelho.

⚠️ **TESTE QUE DEPENDE DO ESTADO DEIXADO POR OUTRO TESTE QUEBRA QUANDO ALGUÉM
INSERE UM TERCEIRO NO MEIO.** O teste 17 contava com o "BANCO ITAU" do teste 2 —
e o teste 14, que roda entre os dois, aciona o botão de apagar os dados da
empresa. O relatório voltou dizendo "criado", o que estava correto: não havia
mais nada lá. Cada teste monta o que precisa.

---

**2026-09-13 (tarde) — v10: editar e excluir na linha, campo que se digita, e quem está logado**

Segunda rodada do dia, nascida do teste dele no Vercel depois de o banco fechar
**16/16 nos dois arquivos**. **Exige rodar de novo SÓ o
`financeiro_01_schema.sql`** — a plataforma não mudou.

| Onde | O que mudou |
|---|---|
| `financeiro_01_schema.sql` 4.12 | `fin_extrato` passou a devolver **`usuario`** (quem lançou); ganhou um `DROP FUNCTION` antes |
| `modules/tipos.ts` | ✨ `rotaConfiguracao?` no manifesto — o endereço da tela de permissões finas |
| `manifesto.ts` (financeiro) | Preenche `rotaConfiguracao` |
| `TeamManagementModal` | Módulo marcado agora mostra o link "AJUSTAR AS PERMISSÕES DE …" |
| `lancamentoService` | ✨ `buscarPorId` — o registro completo, para a edição |
| ✨ `SelecaoComBusca.tsx` | Campo que se digita **e** se escolhe; 4 sugestões do banco |
| ✨ `MenuDeLinha.tsx` | O botão OPÇÕES por linha, com EDITAR e EXCLUIR |
| `ExtratoDaConta` | Colunas **USUÁRIO** e **AÇÕES** |
| `useNovoLancamento` | Modo edição (`?editar=<id>`), `excluir`, `sugerirIdentificadoras` |
| `FormularioDeLancamento` | HISTÓRICO em linha própria, abaixo do VALOR; faixa do modo edição |
| `novo/page.tsx` | Partido em casca + conteúdo por causa do `<Suspense>` |
| `MolduraFinanceiro` | Mostra **o e-mail e o papel** de quem está logado |

⚠️ **`CREATE OR REPLACE FUNCTION` NÃO CONSEGUE MUDAR O `RETURNS TABLE`.** Ao
acrescentar a coluna `usuario` ao `fin_extrato`, o arquivo do módulo — que é
idempotente e feito para ser reaplicado — **falharia em quem já tem o módulo
instalado**, com `cannot change return type of existing function`, parando o
schema no meio. A correção é o `DROP FUNCTION IF EXISTS` imediatamente antes do
`CREATE`. Derrubar função não toca em dado nenhum. E **a assinatura do DROP são
os PARÂMETROS, não o retorno**: no PostgreSQL o tipo de retorno não faz parte da
identidade da função.

⚠️ **A COLUNA `usuario` VEM DE `LEFT JOIN`, E O `LEFT` IMPORTA.** `criado_por`
aponta para `public.users`, cuja RLS só deixa cada um ver o próprio perfil. Com
`JOIN` simples, um Dependente veria as linhas dos colegas **sumirem do extrato**
— e extrato com linha faltando é pior que extrato sem a coluna: o saldo deixaria
de bater com a soma visível. Hoje a função é `SECURITY DEFINER` e lê `users`
como dona do banco; o `LEFT` é a rede para o dia em que isso mudar.

⚠️ **SÃO DUAS DECISÕES SOBRE UM INTEGRANTE, E ELAS MORAM EM LUGARES DIFERENTES
DE PROPÓSITO.** (1) *"ele pode ABRIR este módulo?"* é da **plataforma**
(`allowed_modules`, Painel de Controle de Tripulação). (2) *"o que ele pode fazer
DENTRO?"* é do **módulo** (as 17 permissões, tela do próprio módulo). O dono do
projeto foi à tela (1) procurar a resposta de (2) e não achou — justo, porque
nada ali dizia que a segunda decisão existia. **A lista detalhada não pode subir
para a plataforma**: ela conheceria o negócio de uma peça, e o
`npm run modulos:verificar` reprovaria. A saída foi o campo genérico
`rotaConfiguracao` no manifesto: a plataforma desenha um link sem saber o que há
do outro lado, e módulo que não declarar a rota não mostra link nenhum.

⚠️ **`useSearchParams()` EXIGE `<Suspense>`, E O `<Suspense>` TEM DE FICAR FORA
DO COMPONENTE QUE CHAMA O HOOK.** Ao ler `?editar=<id>`, o `npm run build`
passou a **falhar** (não avisar) com *"useSearchParams() should be wrapped in a
suspense boundary"*. Pôr o `<Suspense>` dentro do mesmo componente não resolve:
o erro acontece ao renderizar aquele componente, antes de o `<Suspense>` dele
existir na árvore. Por isso `novo/page.tsx` está partido em casca (não lê a URL)
e conteúdo (lê).

⚠️ **O MENU DE LINHA REPETE AS TRÊS ARMADILHAS DE DROPDOWN QUE O PROJETO JÁ
DOCUMENTA — POR ISSO É UM COMPONENTE SÓ.** (1) `position: fixed` com
`getBoundingClientRect`, nunca `absolute`: as tabelas rolam
(`overflow-x-auto`) e um menu `absolute` é recortado, sumindo atrás da borda;
(2) fechar no `click`, nunca no `mousedown`, senão o item desmonta antes de o
React processar o clique e **nada acontece**; (3) abrir para cima quando não cabe
embaixo. A segunda cópia de um menu desses é sempre a que esquece uma delas.

⚠️ **QUEM BUSCA A CATEGORIA É O BANCO, NÃO A TELA.** O campo novo chama
`fin_buscar_identificadoras`, que já fazia `LIKE '%texto%'` sobre
`nome_normalizado` (sem acento) com `LIMIT 4` desde o degrau 7. Filtrar no
navegador daria o mesmo resultado **hoje** e mentiria amanhã: a lista carregada
na tela é a primeira página do cadastro — numa empresa com 500 categorias, o
item digitado poderia não estar na memória, e o campo diria "nada encontrado"
sobre algo que existe. E "independente da posição" é o `%` **dos dois lados**:
`LIKE 'texto%'` acharia "LUZ" ao digitar "LU", mas nunca "CONTA DE LUZ".

⚠️ **TRANSFERÊNCIA NÃO SE EDITA — SÓ SE EXCLUI E SE REFAZ.** Ela tem duas pernas
amarradas (RN-23); alterar uma sozinha deixaria o saldo da outra conta errado
para sempre. As duas telas escondem EDITAR quando `transferencia_id` está
preenchido, e o hook recusa com uma mensagem que explica o caminho.

⚠️ **`react-hooks/set-state-in-effect` REPROVOU O CAMPO DE BUSCA, E DE NOVO
ESTAVA CERTA.** O efeito fazia `setSugestoes([])` no mesmo tique quando o texto
ficava vazio. A correção foi **sair do efeito sem tocar em estado** (com o campo
vazio a lista exibida é a completa, e `sugestoes` nem é lido) e limpar no
`onChange`, que é evento de gente digitando. O `setBuscando(true)` também desceu
para dentro do `setTimeout`. Nada de `eslint-disable`.

---

**2026-09-13 — v10: o REVOKE que desligava o módulo, o Dependente sem porta, e o módulo com ícones**

Rodada de correções nascida do teste do dono do projeto no Vercel. **Exige rodar
de novo dois arquivos, nesta ordem: `plataforma_01_schema.sql` e
`financeiro_01_schema.sql`** (os dois são idempotentes e não apagam dado).

| Onde | O que mudou |
|---|---|
| `plataforma_01_schema.sql` 8.3 | O `REVOKE … ON ALL FUNCTIONS IN SCHEMA public` virou **27 REVOKEs nome a nome** |
| `plataforma_01_schema.sql` 8.4 | O `ALTER DEFAULT PRIVILEGES … REVOKE` foi removido: ele **não fazia nada** |
| `financeiro_01_schema.sql` 7 | ✨ **17 REVOKEs novos** — as funções do módulo estavam abertas ao `anon` |
| `teste_financeiro.sql` | ✨ Porteiro no topo + **testes 15 e 16**; foi de 14 para **16 testes** |
| `AuthInterface`, `useAuthLogic`, `LoginGoogleView`, `MiscViews` | ✨ O **Dependente entra pelo Google**, como o Proprietário |
| `authService`, `googleAuthService` | `googleSignInOwner` → **`googleSignIn(idToken, papel)`** |
| ✨ `components/financeiro/IconeFin.tsx` | Registro de ícones **de linha** do módulo |
| ✨ `components/financeiro/menu/` | O menu OPÇÕES virou **painel à direita, com níveis que abrem ao clique** |
| ✨ `components/financeiro/ContextoFinanceiro.tsx` | O contexto do módulo carrega **uma vez**, não uma por tela |
| ✨ `components/financeiro/lancamento/` | A tela de 354 linhas virou hook + 2 componentes |
| `financeiro/page.tsx` | **Três botões centrais**, só |

⚠️ **`REVOKE … ON ALL FUNCTIONS IN SCHEMA public` NA PLATAFORMA DESLIGA O MÓDULO
PLUGADO, EM SILÊNCIO.** Foi a causa do `42501: permission denied for function
fin_gravar_lancamento` que apareceu no `teste_financeiro.sql` **e** nos botões
"+ ADICIONAR NOVA" da tela de lançamento. O gesto que causou o estrago foi o
**correto e recomendado**: reaplicar só o `plataforma_01_schema.sql` para
corrigir o defeito das duas chaves, em 12/09/2026. Aquele REVOKE não distingue
"funções da plataforma" de "funções do schema `public`" — arrancou o EXECUTE das
17 `fin_*`, e as linhas seguintes só devolvem as da plataforma. **Nada avisa:**
tabelas, dados, policies e gatilhos continuam no lugar; o erro só aparece na
primeira gravação, e parece defeito do módulo. É o irmão suave da proibição que
já existia ("nunca 'limpe' o `public` com um laço de `DROP FUNCTION`").

⚠️ **`ALTER DEFAULT PRIVILEGES … REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` É UM
COMANDO QUE NÃO FAZ NADA.** A seção 8.4 prometia que "o que vier daqui para a
frente nasce fechado". Medido no PostgreSQL 18 local: o comando é aceito, grava
**zero** linhas em `pg_default_acl`, e uma função criada logo depois continua
com `=X/postgres` na ACL — executável por `anon`. O motivo é a semântica do
comando: `ALTER DEFAULT PRIVILEGES … REVOKE` só subtrai de um privilégio que o
próprio `ALTER DEFAULT PRIVILEGES` concedeu antes; o padrão embutido do
PostgreSQL não está lá para ser subtraído. (Com `GRANT`, a mesma família de
comando funciona e a linha aparece na hora — foi assim que se provou que o
problema é o `REVOKE`, e não o ambiente.)

⚠️ **AS 17 FUNÇÕES DO MÓDULO ESTAVAM ABERTAS AO `anon` — INCLUSIVE A DE APAGAR
TUDO.** Consequência direta do item acima. `fin_apagar_dados_da_empresa` tinha
um comentário dizendo que ela "não recebe GRANT para `authenticated`" — verdade,
e irrelevante: **"sem GRANT" no PostgreSQL significa "no padrão", e o padrão é
PUBLIC.** Não houve vazamento (as funções são `SECURITY DEFINER` e conferem
`fin_pode()` ou `is_superuser()`, que dependem de `auth.uid()`, nulo para o
anônimo), mas a plataforma exige duas trancas e esta estava só encostada.
Medição antes: `anon` alcançava **17 de 17**. Depois: **0 de 17**, e
`authenticated` alcança **16 de 17** — todas menos a de apagar.

⚠️ **O TESTE QUE FALTAVA ERA, DE NOVO, O DO CAMINHO FELIZ.** Os 14 testes do
módulo provavam recusas; nenhum provava que o app **alcança** as funções. O
teste 16 faz exatamente isso, e teria acusado o estrago no mesmo dia. É a mesma
lição do degrau 7-b, repetida — ao escrever uma trava, escreva o par que prova
que alguém passa.

⚠️ **ARQUIVO DE TESTE QUE ESTOURA NÃO MOSTRA LINHA NENHUMA.** Quando o
`teste_financeiro.sql` morria no `42501`, o `SELECT` final nunca rodava e sumia
até o resultado dos testes que já tinham passado. Agora há um **porteiro no
topo**: ele confere se o módulo está instalado e com privilégio e, se não
estiver, levanta uma exceção que **diz qual arquivo rodar**. Erro que instrui
vale mais do que erro que descreve.

⚠️ **NÃO HAVIA CAMINHO NENHUM PARA UM DEPENDENTE ENTRAR NA PLATAFORMA, E ISSO
ERA MAIOR DO QUE "FALTA UM BOTÃO".** O Dependente era mandado ao formulário de
e-mail e senha; para ter senha, precisaria ter se cadastrado; o botão "CADASTRAR
USUÁRIO" saiu do menu principal na **v7**; e o `SignUpView` só é alcançável pelo
desvio de planeta. A porta do Google resolve porque **cria a conta no primeiro
acesso**, pelo gatilho `on_auth_user_created`. Agora `login-owner` e
`login-dependent` usam o mesmo `LoginGoogleView`; o `LoginFormsView` ficou só
para o Desenvolvedor.

⚠️ **O PAPEL ESCOLHIDO NA GUARITA PRECISA SER ESTADO, NÃO DEDUÇÃO DA TELA
ATUAL.** Entre o login e a triagem existe o desvio do "Completar Cadastro" —
naquele instante a `view` já não é `login-dependent`. Se a triagem olhasse a
tela, todo Dependente novo seria triado como Proprietário, não acharia vínculo e
cairia na sala de espera errada, **sem erro nenhum para denunciar**. Daí o
`papelDoAcesso`, gravado no clique de `AccessOptionsView`.

⚠️ **O PAPEL DA GUARITA NÃO AUTORIZA NADA.** Ele não vai ao Google, não vai ao
Supabase e não é gravado: escolhe só qual pergunta a triagem faz
(`getUserTenants(id, 'DEPENDENT')` em vez de `'OWNER'`). Quem é o quê está em
`tenant_members`, e a RLS não pergunta por qual botão a pessoa clicou.

⚠️ **AS DUAS SALAS DE ESPERA NÃO SÃO A MESMA.** Quem espera pelo Proprietário é
o **Desenvolvedor** (triagem do Painel de Engenharia, tela `waiting-approval`).
Quem espera pelo Dependente é o **dono da empresa**, que precisa incluir o
e-mail dele na equipe — daí a tela nova `waiting-team`. Reaproveitar a primeira
diria ao Dependente que "o Desenvolvedor está analisando sua solicitação": ele
esperaria por alguém que não vai agir.

⚠️ **`lucide-react` 1.x TAMBÉM RENOMEOU O CATÁLOGO — A ARMADILHA DO MOBILE VALE
NA WEB.** Conferido na versão instalada: `Trash2` → **`Trash`**, `Unlock` →
**`LockOpen`**, `Filter` → **`Funnel`**. O nome antigo **não quebra o build e não
acusa nada no editor**: devolve `undefined` e só estoura no navegador. Por isso
todo ícone do módulo passa por `components/financeiro/IconeFin.tsx`, onde o nome
errado vira erro de TypeScript. E nunca `import * as Lucide` — o curinga arrasta
os mais de mil ícones do catálogo para o pacote.

⚠️ **"TRANSFERÊNCIA" SAIU DE TRÊS LUGARES, NÃO DE UM.** O pedido foi que ela
exista apenas dentro de "Novo Lançamento". Ela estava na tela inicial **e** na
tela `/lancamentos` — cumprir o pedido só na primeira deixaria um segundo
caminho que ninguém mandou existir. A rota continua e funciona; o que mudou foi
de onde se chega até ela.

⚠️ **O BOTÃO IMPRIMIR DA "CONFERÊNCIA DA CONTA" NÃO ESTAVA ESCONDIDO À ESPERA DE
LINHAS — ELE NÃO EXISTIA.** Foi a dúvida honesta do dono do projeto, e a
resposta honesta é essa. Agora existe, com o comportamento da tela PESQUISAR:
visível para quem tem a permissão `imprimir`, habilitado só quando há linhas.

⚠️ **O PROPRIETÁRIO JÁ VINHA COM TODAS AS LIBERAÇÕES — O ERRO ERA OUTRO.** Tanto
`fin_pode()` no banco quanto o contexto da tela já davam as 17 permissões a quem
é `OWNER`. O `permission denied` que ele viu era o GRANT arrancado, não falta de
permissão de negócio. Nada precisou mudar nessa frente.

---

**2026-09-12 — v10: o beco sem saída das duas chaves (correção encontrada na validação do degrau 7)**

O dono do projeto contratou o módulo no Painel de Engenharia, liberou no painel de
equipe, entrou como **Proprietário** — e o painel dele continuou dizendo *"nenhum
módulo disponível"*. Não era o módulo: era a plataforma. **Exige rodar de novo o
`plataforma_01_schema.sql`** (só ele; o arquivo é idempotente e não apaga nada).

| Onde | O que mudou |
|---|---|
| `plataforma_01_schema.sql` 5.24 | `modulos_do_membro` passou a devolver, para quem é `OWNER`, tudo o que a empresa contratou |
| `plataforma_01_schema.sql` 5.24-b | ✨ **NOVA** `modulos_contratados(uuid)` — a lista que o Proprietário distribui; o banco foi a **27 funções** |
| `moduleService` | ✨ `modulosContratados()` |
| `TeamManagementModal` | O cartaz fixo virou **uma caixa por módulo contratado**, com as marcações do integrante carregadas ao abri-lo |
| `teste_rls.sql` | Foi de 14 para **16 testes** (os 2 novos são exatamente este defeito) |
| `inventario.sql`, `plataforma_00_reset.sql` | Acompanharam a função nova |

⚠️ **ERAM DOIS DEFEITOS, E O SEGUNDO ESCONDIA O PRIMEIRO.**

1. **`modulos_do_membro` exigia `allowed_modules` também do dono da empresa.** Mas
   `allowed_modules` é a chave que o Proprietário entrega à **tripulação** dele —
   o dono não se convida. Para ele, o que a empresa contratou já é o que ele pode
   abrir.
2. **O "Painel de Controle de Tripulação" nunca perguntou ao banco quais módulos
   existiam.** Mostrava o cartaz *"nenhum módulo contratado encontrado"* fixo no
   JSX, escrito quando não havia módulo nenhum, e **nunca revisto**. Pior: o
   `handleSave` chamava `salvarDependente(tenant, user, ativo)` sem a lista — e o
   parâmetro tem `= []` por padrão, então **gravar um integrante APAGAVA as
   permissões dele**. Ou seja: não havia caminho para liberar módulo a ninguém, e
   o pouco que se liberasse por SQL seria apagado na primeira edição pela tela.

⚠️ **A FUNÇÃO DO PROPRIETÁRIO NÃO PODIA SER A DO DESENVOLVEDOR.**
`admin_list_tenant_modules` confere `is_superuser()` por dentro e devolveria
`42501` na mão do dono da empresa. Daí a `modulos_contratados(uuid)` separada, que
confere `check_is_tenant_owner()` — e mostra só o que está **contratado e ativo**,
não o catálogo inteiro: o catálogo é assunto da plataforma, não da empresa.

⚠️ **O TESTE QUE FALTAVA ERA O ÓBVIO.** Os 14 testes provavam que o Dependente
**não** recebe módulo não contratado (L4, quatro ângulos) e nenhum provava que
alguém **recebe**. Os testes 14 e 15 fecham isso: o Proprietário vê o módulo com
`allowed_modules = {}`, e `modulos_contratados` responde ao dono e recusa o
estranho. Provados no PostgreSQL local: **16/16**.

⚠️ **RODAR SÓ O `01` É SEGURO, E É O CAMINHO AQUI.** O arquivo não tem
`TRUNCATE`, `DELETE`, `DROP TABLE` nem `DROP COLUMN`: as tabelas são
`CREATE TABLE IF NOT EXISTS`, as funções `CREATE OR REPLACE` e cada policy tem o
`DROP POLICY IF EXISTS` antes. Quem apaga dado é o `00`, e ele **não** deve ser
rodado para esta correção.

---

**2026-09-12 — v10: degrau 7, o MÓDULO CONTROLE FINANCEIRO conectado (a primeira peça de LEGO)**

A primeira peça entrou no soquete que o degrau 5 construiu. O módulo `financeiro`
está **plugado**: banco, Core e telas. **Exige recriar o banco** — primeiro a
plataforma (`plataforma_00 → 01 → 02`), depois o módulo
(`financeiro_01 → financeiro_02`).

| Frente | O que entrou |
|---|---|
| Banco do módulo | `supabase/criar-bd-financeiro/` — 4 tabelas (`fin_contas_movimento`, `fin_contas_identificadoras`, `fin_lancamentos`, `fin_fechamentos`), 16 funções `fin_*`, 4 policies de SELECT, 9 gatilhos |
| Travas | `supabase/testes/teste_financeiro.sql` — 14 testes, todos verdes no ambiente local |
| Core | `packages/core/src/modules/financeiro/` — manifesto, tipos, 4 serviços e as 17 permissões |
| Soldas | **S1** (`modules/registro.ts`, 2 linhas) e **S2** (`index.ts`, 1 linha) — as únicas linhas de plataforma que citam o módulo |
| Telas | `apps/admin-web/src/app/dashboard/financeiro/` — 9 rotas; `components/financeiro/` — 9 componentes |
| Mapa | `MODULOS.md` bloco 2 preenchido **no mesmo degrau** (regra R10) |

⚠️ **O MÓDULO NÃO TEM UMA ÚNICA TABELA "POR USUÁRIO" — E ISSO FOI MEDIDO, NÃO
ARGUMENTADO.** O dono do projeto propôs tabelas separadas por usuário para
facilitar a exclusão. As duas propostas foram construídas no ambiente local e
comparadas: o isolamento é **idêntico** nos dois modelos (a RLS já separa), e o
modelo de tabelas separadas perde num ponto concreto — `DROP TABLE ... CASCADE`
na tabela de contas **deixa a tabela de lançamentos com dado dentro**, em
silêncio. Venceu **tabela única + RLS + botão de exclusão**
(`fin_apagar_dados_da_empresa`). A medição está em
`supabase/testes/ambiente-local/prova-tabela-unica-x-por-cliente.sql`.

⚠️ **AS CHAVES ESTRANGEIRAS DO MÓDULO SÃO COMPOSTAS `(tenant_id, id)` — RN-29.**
Uma FK simples para `fin_contas_movimento(id)` aceitaria um lançamento da empresa
A apontando para a conta da empresa B: o id existe, a FK fica satisfeita, e o
extrato da B passa a mostrar dinheiro da A. Com a chave composta o banco recusa —
e recusa também no `UPDATE`, o que foi provado em
`supabase/testes/ambiente-local/prova-chave-composta.sql`.

⚠️ **A AUDITORIA DO MÓDULO GRAVA SÓ `UPDATE` E `DELETE`** (decisão do dono,
12/09/2026). Lançamento é dado de alto volume; auditar `INSERT` faria a trilha
crescer sem acrescentar informação — a linha criada já está lá para ser lida.

⚠️ **TRÊS ERROS DO `fin_extrato` SÓ APARECERAM AO EXECUTAR.** O ambiente local
descartável (`supabase/testes/ambiente-local/`) pagou-se neste degrau: (1)
`ORDER BY` com expressão não é válido **depois** de um `UNION` — a ordenação
precisou migrar para dentro de uma CTE com uma coluna `bloco`; (2) faltava a
vírgula entre duas CTEs; (3) `SUM(bigint)` devolve **`numeric`**, não `bigint`, e
a função só casou o tipo de retorno com `::bigint` explícito. Nenhum dos três
seria pego por leitura.

⚠️ **A GUIA DE IMPRESSÃO RECEBE OS DADOS PELO `localStorage`, NÃO PELA URL NEM
PELO `sessionStorage`.** O `sessionStorage` é **por aba** — a guia nova nasceria
vazia; a URL estoura o limite de tamanho com poucas dezenas de linhas. A chave
`fin_impressao` é apagada assim que a guia a lê, para não deixar dado financeiro
parado no navegador.

⚠️ **A NUMERAÇÃO DE PÁGINAS DO RELATÓRIO É DO NAVEGADOR, E NÃO DO NOSSO CSS.** O
único lugar onde o CSS conhece o número da página é a caixa de margem do `@page`
(`@bottom-right { content: counter(page) }`), que **nenhum navegador de mercado
implementa**. Quem numera é a opção "Cabeçalhos e rodapés" do diálogo de
impressão. O rodapé que desenhamos (totais + empresa) se repete em toda folha por
`position: fixed`; escrever "Página 1" nele seria mentira a partir da segunda.

⚠️ **`react-hooks/set-state-in-effect` REPROVOU SEIS EFEITOS DO MÓDULO, E A REGRA
ESTAVA CERTA.** Chamar `setState` no mesmo tique do efeito dispara renderização
em cascata. A correção foi sempre a mesma: a busca vira uma função `async`
definida **dentro** do efeito, e o estado só muda depois do `await`. Não use
`eslint-disable` para calar essa regra neste projeto.

⚠️ **DESPLUGAR CONTINUA SENDO APAGAR 5 PASTAS E 3 LINHAS.** Está medido: depois
do `financeiro_00_reset.sql` o banco fica com **0 tabelas `fin_`, 0 funções
`fin_`, 0 linhas no catálogo e 0 sobras em `allowed_modules`**, e o
`teste_rls.sql` da plataforma segue **14/14**. O caminho completo está em
`MODULOS.md`, seção 7.

⚠️ **O QUE FOI E O QUE NÃO FOI TESTADO.** Validado aqui: `npm test` (19),
`npm run modulos:verificar` (sem violação), `tsc --noEmit` nos dois apps,
`eslint` limpo e `npm run build` do admin-web com as **9 rotas do módulo**
listadas; e os 14 testes de `teste_financeiro.sql` contra um PostgreSQL 18 local
com um Supabase falso. **Nada foi executado contra o Supabase real** — não há
`.env` alcançável a partir daqui. Pendente com o dono do projeto: recriar o banco
na ordem acima, rodar os dois arquivos de teste no SQL Editor, contratar o módulo
para uma empresa no Painel de Engenharia › Módulos e liberá-lo a um membro na
Central de Comandos.

---

**2026-09-12 — v10: degrau 5, o soquete dos módulos (a plataforma vira LEGO de verdade)**

O pedido do degrau 4 virou código: a Plataforma Jairo O D C é o **Sol**, cada módulo é
uma **peça** que se pluga e se despluga. Nenhum módulo foi criado — o que entrou foi o
**encaixe**. **Exige recriar o banco** (`00 → 01 → 02`), porque há duas tabelas novas.

| Frente | O que entrou |
|---|---|
| Mapa | ✨ **`MODULOS.md`** na raiz — o que é plataforma, o que é módulo, as 10 regras, os pontos de solda, como conectar e desconectar |
| Banco | 2 tabelas novas (`platform_modules`, `tenant_modules`), 6 funções, 2 policies, 5 triggers — passou a **7 tabelas, 25 funções, 12 policies, 15 triggers** |
| Core | ✨ `modules/tipos.ts` (o formato do manifesto), ✨ `modules/registro.ts` (⚡ o soquete) e ✨ `services/platform/moduleService.ts` |
| admin-web | `OperationalDashboardView` passou a **listar os módulos de verdade**; ✨ `dashboard/modulos/` (contratação por empresa); ✨ `components/dashboard/modules/ModuleCard.tsx` |
| Ferramenta | ✨ `scripts/verificar-modulos.mjs` + `npm run modulos:verificar` — falha se plataforma e módulo se grudarem |
| Testes | `teste_rls.sql` foi de 10 para **14 testes** (os 4 novos cobrem a contratação) |
| Limpeza | os 2 `*.backup.sdk54` da raiz foram apagados; `CLAUDE_CODE_MOBILE_PROMPT_01.md` desceu para `_estudos/` |

⚠️ **A REGRA 6 DE "ADICIONAR NOVO MÓDULO" ESTAVA OBSOLETA E CONTRADIZIA A PROIBIÇÃO Nº 1.**
Ela mandava usar `supabaseAdmin` nos serviços de módulo chamados por Server Actions — e o
`supabaseAdmin` foi **removido do Core na v10**. Agora serviço de módulo usa o cliente
`anon` protegido por RLS; o que exigir privilégio vira função `SECURITY DEFINER` com a
checagem dentro do banco.

⚠️ **`allowed_modules` DEIXOU DE ACEITAR TEXTO LIVRE.** Um erro de digitação
(`'financiero'`) criava um módulo fantasma que nunca abriria, e ninguém descobriria por
quê. Agora todo módulo existe como linha em `platform_modules`, escrita pelo **seed do
próprio módulo** — nunca pela aplicação: um módulo no catálogo sem tabelas, sem telas e
sem manifesto é um nome apontando para o vazio.

⚠️ **AGORA SÃO DUAS CHAVES PARA ABRIR UM MÓDULO: A EMPRESA CONTRATOU (`tenant_modules`) E
O MEMBRO FOI LIBERADO (`tenant_members.allowed_modules`).** Faltava a primeira, e a falta
tinha consequência concreta: o Proprietário **monta a própria equipe**, então podia
escrever `allowed_modules = {financeiro}` para si mesmo sem que a empresa tivesse
contratado nada. O gatilho `validar_modulos_membro` recusa isso e **nomeia o módulo** na
mensagem de erro.

⚠️ **DESCONTRATAR LIMPA OS MEMBROS NA MESMA TRANSAÇÃO.** Se `admin_set_tenant_module`
apenas desligasse o contrato, os vínculos ficariam com um módulo que a empresa não tem
mais — e o próximo UPDATE em `tenant_members` (mudar o papel de alguém) seria recusado
pelo gatilho por causa de um resto que ninguém pediu.

⚠️ **A WEB IGNORAVA `allowed_modules`; O APLICATIVO, NÃO.** O `OperationalDashboardView`
era um cartaz fixo de "Aguardando Liberação" — liberar um módulo não mudava nada na tela.
O mobile já lia a coluna desde a v10. Agora os dois leem, e a web usa o registro do Core:
**nenhum arquivo da plataforma cita o nome de um módulo**, então plugar o décimo não vai
exigir tocar nessa tela.

⚠️ **O BANCO PUBLICADO TEM UMA FUNÇÃO QUE NÃO É NOSSA, E ELA NÃO DEVE SER APAGADA.**
O inventário de 2026-09-12 encontrou **26 funções no `public` onde o schema cria 25**. A
extra é `public.rls_auto_enable()`, dona `postgres`, chamada pelo event trigger
`ensure_rls` (`ddl_command_end`): a cada `CREATE TABLE` no `public` ela executa
`alter table … enable row level security`. É uma rede de segurança do ambiente — ótima de
ter, e **de fora deste repositório**. Duas consequências:

- O `supabase/testes/inventario.sql` a exclui **por nome** da contagem, em vez de subir o
  esperado para 26: assim, se um dia aparecer OUTRA função estranha, o placar acusa de novo
  em vez de engolir a diferença.
- Os `ALTER TABLE … ENABLE ROW LEVEL SECURITY` do schema **continuam obrigatórios**. Num
  Postgres puro, noutro provedor ou num projeto antigo, esse gatilho pode não existir — e
  aí a tabela nasceria aberta. O arquivo de schema tem de bastar por si.

⚠️ **NUNCA "LIMPE" O `public` COM UM LAÇO DE `DROP FUNCTION`.** Levaria junto essa rede de
segurança e as funções das extensões (`uuid-ossp`, `unaccent`), que moram no `public` neste
banco. O `plataforma_00_reset.sql` derruba por NOME, um a um, de propósito.

⚠️ **`request.jwt.claims = ''` SÓ NÃO ESTOURA PORQUE A `auth.uid()` DO SUPABASE TRATA
ISSO.** A função deles faz `NULLIF(..., '')` **antes** do cast; uma implementação que faça
`''::json` direto quebra com *"input string ended unexpectedly"*. E o erro não aparece onde
se espera: ele estoura **dentro do gatilho de auditoria**, no meio de um INSERT que nada
tem a ver com sessão. Por isso o `teste_rls.sql` passou a gravar `'{}'` para "sair da
sessão" — JSON válido sem `sub`, que devolve `NULL` em qualquer implementação. Descoberto
ao rodar o teste num PostgreSQL puro (2026-09-12).

⚠️ **O SQL EDITOR DO SUPABASE EXECUTA TODO O TEXTO DO PAINEL, NÃO O QUE VOCÊ ACABOU DE
COLAR.** Resto da execução anterior entra junto, e o erro aponta para uma linha que parece
ser do comando novo. Foi assim que um placar de contagem quebrou com
`syntax error at or near "WHERE"` numa linha que estava correta. Antes de colar: `Ctrl+A` e
apague — ou selecione com o mouse só o trecho a executar, que o editor roda apenas a
seleção.

⚠️ **O VERIFICADOR IGNORA COMENTÁRIOS E E-MAILS DE EXEMPLO, DE PROPÓSITO.** Um TSDoc que
menciona o módulo (o `lib/dinheiro.ts` diz ter sido escrito para o C FINANCEIRO) não
quebra nada ao desplugar; e um módulo chamado `exemplo` casaria dentro de
`voce@exemplo.com`. Verificador que grita à toa é desligado na terceira vez — e
verificador desligado não protege nada. **Ele foi testado com um módulo de mentira,
plantado com violações de propósito: acusou as duas e saiu com código 1.**

---

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
- o `_estudos/CLAUDE_CODE_MOBILE_PROMPT_01.md` inteiro (68 menções): ele descreve a entrega da v9
  (desceu da raiz para `_estudos/` no degrau 5);
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

