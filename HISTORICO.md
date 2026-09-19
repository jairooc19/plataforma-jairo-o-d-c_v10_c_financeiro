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

**2026-09-18 (quinta rodada) — v10: a última função sem dono, e três buracos de tela**

Rodada de dívida, não de funcionalidade: nenhuma tela nova. Ele pediu a correção da
`fin_proxima_ordem` e os três bônus que sobraram do estudo de 17/09.

> 🧱 **O MURO: FILTRAR POR EMPRESA NÃO CONSERTAVA NADA.** A `fin_proxima_ordem` recebia
> conta e data, não olhava a empresa e tinha `GRANT` para `authenticated` — qualquer pessoa
> logada, de qualquer empresa, que conhecesse o id de uma conta alheia descobria quantos
> lançamentos ela tem num dia. O reflexo é acrescentar `p_tenant_id` e filtrar por ele; e
> **isso não fecha porta nenhuma**, porque quem chama informa a empresa: bastaria informar a
> alheia junto com a conta alheia. Quem fecha é a `fin_pode`, que não pergunta "de qual
> empresa é este dado?" e sim "**quem está chamando** é de lá?". O filtro ficou como segunda
> tranca: com permissão na empresa A e uma conta da B, a resposta é 1 — nenhum dado
> atravessa. As duas metades estão na trava 51, cada uma com a sua mutação.

**A permissão aceita duas chaves, e isso foi decisão, não frouxidão.** A sugestão serve a
duas telas: NOVO LANÇAMENTO (`lc_criar`) e TRANSFERÊNCIA (`transferencia`). Exigir só a
primeira deixaria o campo ORDEM em branco, sem explicação nenhuma, para quem só transfere.

> ⚠️ **O RITUAL DO `DROP` FOI EXERCITADO, E NÃO SÓ ESCRITO.** Mudar a lista de parâmetros
> cria uma SOBRECARGA — as duas versões vivas, a velha ainda com o GRANT. Para provar que o
> `DROP FUNCTION ... (uuid, date)` cumpre o papel, a versão antiga foi **recriada à mão** num
> banco local: o `inventario_financeiro.sql` acusou em **cinco linhas de uma vez** (contagem
> 37 em vez de 36, SOBRECARGA 1, ASSINATURA 1, CAMINHO FELIZ 35 e — a mais reveladora —
> SEGUNDA TRANCA 1, porque função recriada nasce executável por PUBLIC, e `anon` herda de
> PUBLIC).

**Os três bônus do estudo de 17/09, e o que cada um escondia:**

**1. A tela dizia que excluir não tinha volta — e tinha, desde 17/09.** A confirmação da
PESQUISAR terminava com "ESTA AÇÃO NÃO PODE SER DESFEITA". Era verdade quando foi escrita e
deixou de ser no dia em que a LIXEIRA nasceu; ninguém voltou para corrigir a frase. **Isso é
pior do que não avisar**: quem lê aquilo e ainda assim exclui por engano fica convencido de
que perdeu o registro, e não vai procurar.

> ⚠️ **E O RECADO CERTO DEPENDE DE QUEM ESTÁ LENDO.** Restaurar exige `lc_excluir_lote`.
> Prometer "você pode restaurar" a quem não tem a permissão seria trocar uma frase falsa por
> outra — ele procuraria a tela e não encontraria. Para esse, a verdade é que **alguém** pode,
> e o que ele precisa é saber a quem pedir. Quem decide é o Core (`recadoDeExclusao`), com
> teste; o atalho "IR PARA A LIXEIRA" só aparece para quem a lixeira vai aceitar.

**2. "Os últimos 30 dias" era um número meu, escrito na tela como fato.** A
`fin_listar_exclusoes` sempre aceitou `p_desde`; a tela é que nunca passava. Quem excluiu algo
há 45 dias abria a lixeira, não encontrava e concluía que tinha sumido de vez. Agora há um
seletor (7 dias a 1 ano, ou desde o começo) — **e o padrão continua sendo 30 dias**, porque o
ecrã tem um botão de apagar de vez: o padrão precisa mostrar MENOS.

> ⚠️ **DE QUEBRA, A LISTA NÃO AVISAVA QUANDO ERA CORTADA.** Ela pede 200 registros; um
> período com mais mostrava 200 sem dizer nada, e quem marcasse "todos" estaria marcando só
> os que couberam. É a mesma regra que a exclusão em lote já seguia desde 17/09, e que a
> lixeira não seguia. Agora avisa.

**3. O primeiro fechamento de um período não aparecia em lugar nenhum.** O histórico lia só a
`audit_log`, e o gatilho da plataforma cobre `UPDATE` e `DELETE` — não `INSERT`. Quem fechou
setembro uma única vez lia "NENHUMA ALTERAÇÃO REGISTRADA".

> ⚠️ **A SAÍDA NÃO FOI MEXER NO GATILHO DA PLATAFORMA.** Fazer a `registrar_auditoria()`
> cobrir INSERT mudaria o comportamento de TODAS as tabelas do sistema a pedido de um módulo
> (regra R5 do `MODULOS.md`), e dobraria o tamanho da `audit_log` de quebra. A saída é óbvia
> depois de vista: **o primeiro fechamento não está na auditoria porque ainda está VIVO na
> tabela**. A função passou a unir as duas fontes — a linha viva (`em_vigor: true`) e os
> eventos passados (`em_vigor: false`).

> ⚠️ **A LINHA VIVA USA `updated_at`, E NÃO `created_at`.** O `fin_fechar_periodo` é um
> `INSERT ... ON CONFLICT DO UPDATE`: refechar reaproveita a linha e troca `fechado_por`.
> Mostrar `created_at` ao lado do autor novo juntaria a data de um evento com o autor de
> outro — verdadeiro em cada metade, falso inteiro.

> ⚠️ **E A COR DA LINHA PASSOU A VIR DE UM DADO, NÃO DO TEXTO.** A tela decidia a cor com
> `operacao.startsWith('EXCLUIU')`. Funciona até alguém reescrever a frase no banco — e aí
> quebra em silêncio. Quem decide agora é `em_vigor`.

**O ensaio de mutação, quatro tiros:** tirar a checagem de permissão da sugestão (trava 51
acusou), tirar o filtro de empresa (51), fazer o histórico ignorar a linha viva (52), e
devolver o "não pode ser desfeita" ao Core (2 dos 124 testes do `npm test`). Nenhuma passou
despercebida.

**Placar:** `npm test` **124/124** · `teste_financeiro.sql` **52/52** · `teste_rls.sql`
**16/16** · `inventario_financeiro.sql` **17/17** · `inventario.sql` **4/4** · LEGO 0
violações · lint e build limpos · ensaio de upgrade **21 ok, 0 divergindo**.

Módulo: **5 tabelas, 36 funções, 22 permissões, 18 rotas** — os mesmos números da rodada
anterior, de propósito: nada nasceu, e uma coisa parou de vazar.

---

**2026-09-18 (quarta rodada) — v10: ORÇAMENTO e DINHEIRO DO PERÍODO, e a fase 5 fecha**

As duas últimas peças "EM DESENVOLVIMENTO" do módulo. Um estudo foi entregue antes
(`_estudos/estudo-2026-09-18c-orcamento-e-dinheiro-do-periodo.html`), com seis perguntas e
doze bônus; ele respondeu **"PODE FAZER E ACEITO TODOS OS BONUS"**.

> 🧱 **O MURO DESTA RODADA ESTAVA NO PEDIDO DO "SÓ PERCENTUAL".** Ele pediu que o Dependente
> pudesse ver a barra **sem os valores**, só o percentual. O jeito natural de fazer isso — o
> banco devolver tudo e a TELA esconder — **não esconderia nada**: os números atravessariam a
> internet e ficariam legíveis no navegador com a tecla F12, na aba de rede, em texto puro.
> Não é preciso saber programar; é preciso saber clicar. É exatamente o erro do
> `sessionStorage.dev_vip_access` que este projeto já documentou.

A saída foi pôr a decisão no BANCO: `fin_dinheiro_do_periodo` lê o modo daquele membro e, no
modo percentual, devolve `orcado`, `realizado` e `saldo` em **NULO** — só o percentual
atravessa, arredondado para inteiro (77,9412% reduziria muito as combinações possíveis para
quem soubesse o realizado por outro caminho). **A tela não esconde nada porque não há o que
esconder.** A trava 46 confere o que chega do banco, e não o que a tela desenha.

> ⚠️ **E ISSO NÃO É UM COFRE — O ESTUDO DISSE, E A TELA REPETE.** Quem tiver `extrato_ver`,
> `lc_ver_todos`, `imprimir`, `orc_ver` ou `cm_ver` chega aos mesmos valores por outra tela,
> que já tem hoje. A lista está em `PERMISSOES_QUE_REVELAM_VALOR`, e a tela de CONFIGURAÇÕES
> **avisa dizendo quais**, com um botão para retirá-las. Avisar, e não bloquear: pode haver
> caso legítimo em que o percentual é só conforto, e decidir isso pelo dono da empresa seria
> errado — mas deixá-lo decidir sem saber seria pior.

**A quinta tabela do módulo.** `fin_orcamentos` é a primeira tabela nova desde a criação dele
(4 → 5). A competência "MÊS – ANO" é uma `date` travada no dia 1:

| Como guardar | O que quebra |
|---|---|
| texto `"09/2026"` | ordenar por texto põe `01/2027` **antes** de `09/2026` |
| dois inteiros | todo filtro de intervalo passa a precisar dos dois campos com um `OR` |
| **`date` no dia 1** | nada — e é o tipo que o projeto inteiro já usa para data de calendário |

> ⚠️ **O `CHECK (EXTRACT(DAY FROM competencia) = 1)` NÃO É ENFEITE.** Sem ele, gravar
> `2026-09-17` criaria **duas "SETEMBRO / 2026"** no banco — a tela mostraria o mesmo mês duas
> vezes, com valores diferentes, e ninguém entenderia por quê. A trava 42 o exercita.

**Sete funções novas** (29 → 36): gravar, excluir, listar, as competências da PESQUISAR,
copiar de um mês para outro, o dinheiro do período e a configuração de quem vê o quê.

> ⚠️ **`fin_pode()` NÃO DAVA CONTA DOS DOIS CONTROLES NOVOS.** Ela responde "tem esta chave no
> array de permissões?" — sim ou não. Uma LISTA de contas liberadas e um MODO de exibição não
> são sim-ou-não: são configuração, e moram em campos próprios do `module_configs`
> (`dinheiro_contas` e `dinheiro_percentual`). **A plataforma não mudou nada** — aquele `jsonb`
> é livre por módulo, e desplugar o financeiro leva a configuração junto.

> ⚠️ **E O MODO NÃO VIROU PERMISSÃO, DE PROPÓSITO.** Uma permissão "só percentual" seria
> INVERTIDA — *ter* a permissão significaria *ver menos* —, e um dia alguém marcaria a caixa
> achando que estava dando acesso.

> ⚠️ **`[]` NÃO É AUSENTE, PELA TERCEIRA VEZ NESTE MÓDULO.** Na lista de contas liberadas,
> ausente = TODAS e `[]` = NENHUMA. Confundi-los faria o botão DESMARCAR TODAS liberar o
> orçamento inteiro. Trava 47.

**Um buraco no pedido, tapado com o bônus B2.** A tela do dinheiro do período mostrava só as
contas ORÇADAS — então uma conta em que se gastou e **não se orçou** simplesmente sumia. Se
você orçou 6 e gastou em 9, some justamente o gasto que ninguém planejou. O bloco
**GASTO FORA DO ORÇAMENTO** existe por isso, e a trava 45 o fixa.

**Os doze bônus, todos aceitos e feitos.** Os três que mudam o valor da entrega:
**copiar o orçamento do mês anterior** (sem ele, montar outubro é redigitar as 15 contas de
setembro todo mês), o **bloco FORA** acima, e o **aviso de vazamento** do modo percentual. Os
outros: linha de RESULTADO orçado × realizado, **marca do ritmo do mês** na barra (consumir
78% no dia 18 é diferente de consumir 78% no dia 30), total do ano na PESQUISAR, aviso de data
fora da competência, contas que faltam em relação ao mês anterior, campo de observação, faxina
dos ids órfãos e o atalho para criar o orçamento que falta.

**As armadilhas da rodada:**

1. **O ensaio de mutação mentiu, e quase passou batido.** O script que quebra as funções de
   propósito recebia as âncoras da linha de comando com `\n`, e o schema é CRLF: **seis das
   oito mutações acharam ZERO ocorrências** e reportaram "não consegui quebrar" — que se lê
   facilmente como "está tudo bem". As travas pareciam sólidas sem nunca terem sido
   exercitadas. O mutador agora normaliza as âncoras.

2. **`CREATE TRIGGER ... EXECUTE PROCEDURE public.set_updated_at()` não existe neste banco.**
   A função da plataforma chama-se `marcar_atualizacao()`. Escrever o nome "óbvio" fez o
   schema parar no meio, e só o ensaio local pegou.

3. **O compilador do React recusou um `useCallback`** na tela de lançar ("existing memoization
   could not be preserved"). A busca foi para dentro do efeito, com um contador que só cresce
   — porque gravar não muda a conta nem a competência, e sem o contador a barra não se
   atualizaria depois de gravar. É a mesma armadilha da sugestão de ordem, de 16/09.

**Placar:** `npm test` **118/118** · `teste_financeiro.sql` **50/50** · `teste_rls.sql`
**16/16** · `inventario_financeiro.sql` **17/17** · LEGO 0 violações · lint e build limpos ·
ensaio de upgrade sem sobrecarga · **as 9 travas novas vistas FALHAR**, cada uma por uma
mutação própria aplicada na função que ela protege.

Módulo: **5 tabelas, 36 funções, 22 permissões, 18 rotas**.
---

**2026-09-18 (terceira rodada) — v10: quem decide se o mês aparece é a COLUNA, não a linha**

Ele rodou o SQL de novo (17/17 e 41/41), testou, e pediu um ajuste único — que é, na verdade,
a correção do buraco que a rodada anterior tinha aberto e que eu havia apenas **avisado**:

> *"Em SALDOS POR CONTA MOVIMENTO a coluna referente ao mês só deve apresentar saldo se
> existir algum lançamento em pelo menos uma das contas movimento. Se em um determinado mês
> não existir NENHUM lançamento, todas as contas são apresentadas com saldo zero, 0,00. Se
> existir um ou mais lançamentos para este mês em QUALQUER das contas, apresentar os saldos
> finais para TODAS as contas individualmente, mesmo se a conta neste mês não existir
> lançamento."*

> ⚠️ **A 2ª RODADA ESCONDIA A CÉLULA CONTA A CONTA, E ISSO QUEBRAVA A SOMA.** Num mês em que
> só o CAIXA se mexeu, o BANCO ficava em branco — mas o dinheiro dele continuava dentro da
> linha de TOTAL. A pessoa via três células e um total que não era a soma delas, e tinha de
> acreditar num número que a tela não mostrava como se formava. Eu documentei isso como
> "consequência assumida" e avisei na entrega; **ele resolveu de um jeito melhor do que o meu
> aviso**: mover a decisão da LINHA para a COLUNA faz os dois casos fecharem.

| Situação | O que a coluna mostra | A soma bate? |
|---|---|---|
| Nenhum lançamento no mês, em conta nenhuma | `0,00` em todas as contas **e no total** | sim: 0+0+0 = 0 |
| Um ou mais lançamentos em qualquer conta | o saldo de **todas** as contas, inclusive as paradas | sim |

A célula ganhou um segundo campo: `temLancamento` continua sendo a verdade da LINHA (aquela
conta, naquele mês) e alimenta a dica do mouse — *"esta conta não teve lançamento neste
mês"* —, enquanto `mesTeveLancamento` é a verdade da COLUNA e é quem decide o que aparece.

> ⚠️ **O MÊS PARADO MOSTRA `0,00`, E NÃO O VAZIO.** Foi o que ele pediu, e tem razão: coluna
> em branco parece tabela quebrada e some na impressão sem dizer por quê; uma coluna inteira
> de zeros — total incluído — se lê de relance como "neste mês não houve movimento nenhum". O
> zero sai em cinza claro, e a dica do mouse informa o **saldo real** da conta, que continua
> acumulando por dentro.

> ⚠️ **OS DOIS BLOCOS DECIDEM JUNTOS.** Um mês em que só uma conta de tipo OUTRAS se mexeu é
> um mês COM movimento, e o bloco CAIXA E BANCO também mostra os saldos dele — senão as duas
> tabelas da mesma tela contariam histórias diferentes sobre o mesmo período.

**Placar:** `npm test` **98/98** · `teste_financeiro.sql` **41/41** · `teste_rls.sql`
**16/16** · `inventario_financeiro.sql` **17/17** · LEGO 0 violações · lint e build limpos ·
ensaio de upgrade sem sobrecarga · **os 3 testes novos vistos FALHAR**, com a regra revertida
para a da 2ª rodada (decidir pela linha). Nenhuma mudança no banco: a regra é de exibição, e
os números continuam vindo prontos de `fin_saldos_mensais_movimento`.
---

**2026-09-18 (segunda rodada) — v10: voltar de onde se veio, o mês em branco, e a receita em dois blocos**

Ele rodou o SQL (17/17 e 40/40), testou os dashboards no publicado — *"estão funcionando
lindamente"* — e pediu três ajustes de uso real, todos nascidos de olhar a tela pronta.

**1. VOLTAR de onde se veio.** *"Ao clicar e abrir a conferência, seria possível ter função
para retornar para a tela que estava antes? Atualmente preciso iniciar todo o caminho do
zero."*

> ⚠️ **`router.back()` SOZINHO NÃO RESOLVERIA, e é aí que estava a armadilha.** Ele traz a
> página de volta, mas **remonta o componente** — e o ANO e a caixa de ocultar transferências
> eram estado de componente. Quem tivesse navegado até 2023 voltaria para o ano corrente, ou
> seja, quase o mesmo atrito que ele reclamou. A saída foi mover o que DESCREVE A TELA para a
> URL (`?ano=2023&semtransf=1`): o endereço passou a descrever o dashboard inteiro, e o
> clique leva esse endereço junto, em `?voltar=`. O botão só o reabre.

O `back()` continua sendo a rede de segurança para quem chegou por link colado ou favorito, e
o endereço de volta é validado antes de ser usado — ele vem da URL, que qualquer um escreve, e
um `//site.externo` levaria a pessoa para fora do sistema com um clique que parece inofensivo.

**2. O mês só mostra saldo se houve lançamento.** *"Em SALDOS POR CONTA MOVIMENTO o mês só
deve apresentar saldo se existir lançamento para o mesmo."* Mês parado passou a aparecer como
"—".

> ⚠️ **O SALDO CONTINUA ACUMULANDO POR DENTRO** — o que mudou é só o que a célula MOSTRA. Se
> março fechou em 2.600,00 e abril não teve movimento, abril aparece vazio e MAIO continua
> partindo de 2.600,00. A conta não "reinicia" por causa da célula em branco.

> ⚠️ **E A CONSEQUÊNCIA PRECISA FICAR DITA: a soma das células visíveis de um mês pode não
> bater com a linha de TOTAL daquele mês.** O total é o saldo REAL do bloco, contando também
> as contas que ficaram em branco porque não se mexeram. Não é divergência — é a diferença
> entre "o que andou" e "o que há" —, mas só não vira defeito porque a dica do mouse e o
> cabeçalho da tela explicam. E o papel impresso e o .TSV seguem a tela: célula vazia numa
> ponta e cheia na outra faria a pessoa deixar de confiar nas duas.

A célula vazia também deixou de ser clicável: abrir uma conferência de um mês sem lançamento
nenhum mostraria o saldo inicial e mais nada.

**3. A receita virou dois blocos: PRÓPRIAS e DE TERCEIROS.** A distinção já existia no
lançamento (a coluna `propriedade`) e não aparecia em relatório nenhum.

> ⚠️ **A DIVISÃO É POR LANÇAMENTO, NÃO POR CADASTRO — e a MESMA conta identificadora aparece
> nos DOIS blocos**, com valores diferentes, se tiver recebido dinheiro próprio numa conta e
> de terceiros noutra. Isso não é duplicidade: é a informação pedida. No Core, o bloco passou
> a entrar na CHAVE da linha; sem isso as duas linhas teriam a mesma identidade e uma sumiria
> levando os valores junto.

> ⚠️ **O RESULTADO PASSOU A USAR SÓ AS RECEITAS PRÓPRIAS.** Dinheiro de terceiros entra no
> SALDO (está na conta) mas não é receita do negócio; somá-lo daria um número que se parece
> com lucro e não é — o mesmo motivo pelo qual o bloco OUTRAS (aporte, transferência) já
> ficava de fora. A trava 41 fixa isso: 262.000 antes de existir a receita de terceiros,
> 262.000 depois.

A mudança exigiu `DROP FUNCTION` antes do `CREATE` — o `RETURNS TABLE` ganhou a coluna
`propriedade`, e `CREATE OR REPLACE` recusa mudança de tipo de retorno com *"cannot change
return type of existing function"*, parando o arquivo idempotente no meio.

**A armadilha da rodada, e ela é de JavaScript puro:**

> ⚠️ **`$$` NUMA STRING DE SUBSTITUIÇÃO DO `String.replace` VIRA UM CIFRÃO SÓ.** O script que
> inseriu a trava 41 no arquivo de teste gravou `DO $` onde devia gravar `DO $$` — e o psql
> respondeu com **dez erros de sintaxe seguidos, nenhum deles apontando para a causa**
> ("erro de sintaxe em ou próximo a $", depois "v_terceiros não existe", depois "Sem permissao
> para ver saldos"). A correção é passar uma FUNÇÃO: `s.replace(a, () => b)` entrega o texto
> cru. Vale igual para `$&` e `$1`.

**Placar:** `npm test` **95/95** · `teste_financeiro.sql` **41/41** · `teste_rls.sql`
**16/16** · `inventario_financeiro.sql` **17/17** · LEGO 0 violações · lint e build limpos ·
ensaio de upgrade sem sobrecarga · **a trava 41 vista FALHAR por dois motivos diferentes**
(a receita deixando de se dividir, e o RESULTADO passando a usar a receita errada).
---

**2026-09-18 — v10: os dois dashboards de saldos por mês, e as duas conferências que eles abrem**

Ele pediu dois dashboards de janeiro a dezembro: um com o **saldo final de cada conta
movimento** (CAIXA e BANCO num bloco com total, OUTRAS noutro) e outro com o **movimento de
cada conta identificadora** (receitas primeiro, despesas, e OUTRAS, cada tipo totalizado).
Em ambos, clicar no nome da conta abre a conferência do ano; clicar na célula abre a do mês.
Mais imprimir e exportar .TSV. Um estudo foi entregue antes
(`_estudos/estudo-2026-09-18-dashboards-saldos-por-mes.html`), com seis perguntas; ele
aceitou todas as recomendações e **todos os 12 bônus**.

> 🧱 **O ACHADO DO DIA FOI UM MURO, NÃO UM PRESENTE.** A "CONFERÊNCIA DA CONTA" que ele
> mandou abrir **não é uma tela**: é a coluna direita de "Novo Lançamento". E aquela tela
> começa recusando quem não tem `lc_criar`, com a mensagem "VOCÊ NÃO TEM PERMISSÃO PARA
> CRIAR LANÇAMENTOS". Ou seja: o contador ou o sócio que só confere — exatamente quem mais
> precisa de um dashboard — clicaria numa célula e receberia uma recusa que **nem responde
> ao que ele pediu**. Pior: com as permissões padrão de Dependente o defeito não aparece,
> porque elas incluem `lc_criar`. Só apareceria com quem foi configurado à mão.

A saída foi criar `/dashboard/financeiro/conferencia`, que exige apenas `extrato_ver`. Isso
esbarra numa decisão de 13/09 escrita em `menu/opcoes.ts` ("não deve haver entrada de menu
para uma terceira tela de extrato — criaria duas respostas para a mesma pergunta"), e ela
**continua valendo ao pé da letra**: a tela nova **não entra no menu**; só se chega a ela
clicando no dashboard. Continua havendo uma porta; o que nasceu foi um atalho. E não há
segunda cópia de nada — a tabela é o mesmo `ExtratoDaConta.tsx`, os atalhos de mês são o
mesmo `AtalhosDeMes.tsx`, e os números vêm da mesma `fin_extrato`.

**A verdade incômoda sobre o segundo dashboard.** Ele pediu "saldos finais por conta
identificadora", e a palavra não cabe: a conta movimento tem `saldo_abertura_centavos` —
ela GUARDA dinheiro. A identificadora não tem coluna nenhuma de saldo: ela EXPLICA dinheiro.
"ENERGIA ELÉTRICA" não tem saldo, como o motivo de uma viagem não tem quilometragem. Então
cada célula ali é o **movimento líquido do mês**, sem acumular — e isso decide, sozinho, uma
diferença visível entre as duas telas:

| | Dashboard 1 (contas movimento) | Dashboard 2 (identificadoras) |
|---|---|---|
| A célula de março é | o saldo em **31/03** (acumulado) | o que passou **em março** |
| Mês sem lançamento | **repete** o saldo anterior | fica em zero |
| Coluna TOTAL DO ANO | **não existe** | **existe** |

> ⚠️ **SOMAR DOZE SALDOS FINAIS DÁ UM NÚMERO QUE NUNCA EXISTIU.** É a soma de doze
> fotografias do mesmo dinheiro — como somar o peso de uma pessoa medido em doze meses e
> dizer que ela pesa 280 kg. O número do ano já está na tela: é a coluna DEZEMBRO. Já no
> dashboard 2, somar doze fluxos dá "quanto gastei de energia no ano", que é provavelmente o
> número mais útil daquela tela. A regra geral: **valor acumulado não se soma entre
> períodos; valor de fluxo se soma.**

**Quatro funções novas no banco** (25 → 29), e a primeira existe por aritmética: chamar
`fin_extrato` doze vezes por conta seriam **240 idas ao banco** numa empresa com 20 contas,
só para desenhar uma tela. Agora é uma.

| Função | O que responde |
|---|---|
| `fin_saldos_mensais_movimento(tenant, ano)` | a grade inteira do dashboard 1, com as linhas de TOTAL já somadas |
| `fin_movimentos_mensais_identificadora(tenant, ano)` | a do dashboard 2, com os totais e a linha RESULTADO |
| `fin_extrato_identificadora(tenant, conta, de, ate)` | a conferência nova, espelhada |
| `fin_extrato_consolidado(tenant, contas[], de, ate)` | o extrato de VÁRIAS contas somadas (o clique na linha de TOTAL) |

> ⚠️ **AS LINHAS DE TOTAL VÊM DO BANCO, NÃO DA TELA.** É a mesma regra que a exclusão em
> lote pagou em 17/09 ("quem conta tem de ser quem executa"), agora na leitura: a tela, o
> papel impresso e o arquivo .TSV mostram o mesmo número porque **nenhum dos três soma**.

> ⚠️ **A CONTA DESATIVADA CONTINUA NO RELATÓRIO, e isso contraria a RN-06 de propósito.**
> A RN-06 manda o inativo sumir das listas — certíssimo para LANÇAR. Num relatório de saldos
> seria desastre: encerrar em julho uma conta com R$ 6.800,00 dentro faria o TOTAL de
> janeiro a julho encolher **em silêncio**. Ela aparece marcada como INATIVA. Trava 36.

> ⚠️ **`[]` NÃO É `NULL`, AGORA TAMBÉM NA LEITURA.** Em `fin_extrato_consolidado`, `NULL`
> quer dizer "não estou escolhendo, leve todas as contas" e `{}` quer dizer "desmarquei
> tudo, não leve nada". Confundi-los faria um DESMARCAR TODOS mostrar o extrato inteiro da
> empresa. É a lição de 17/09 repetida do outro lado. Trava 40.

**As armadilhas encontradas construindo — todas medidas, nenhuma suposta:**

1. **O `npm test` não resolve import sem extensão.** `from '../../lib/datas'` dentro de um
   arquivo com teste estoura com `ERR_MODULE_NOT_FOUND` no `node --test`. E escrever
   `'../../lib/datas.ts'` **quebraria o build**: o `tsconfig.json` do admin-web não liga
   `allowImportingTsExtensions`, e o `next build` recusa com TS5097. Saída: os rótulos dos
   meses **chegam por parâmetro** em `dashboardRegras.ts` e `dashboardRelatorio.ts`. Eles
   continuam tendo uma casa só (`MESES_CURTOS`, em `lib/datas.ts`, com teste lá). É o mesmo
   motivo pelo qual `importacao.ts` não importa nada: **arquivo com teste é arquivo sem
   dependência**.

2. **Copiar a URL para o estado é recusado pelo ESLint — e ele está certo.** A tentação era
   um `useEffect` lendo `?conta=&de=&ate=` e chamando `setState`; além do
   `react-hooks/set-state-in-effect`, ele precisaria de uma guarda de "só na primeira vez",
   senão trocar o mês na tela seria **desfeito na renderização seguinte** pela URL antiga. O
   desenho que ficou: o estado nasce `null` ("ainda não mexi nisto") e o valor em uso é
   `estado ?? o que veio na URL`. Sem efeito, sem guarda, sem cópia.

3. **Um curinga de caminho fechou um comentário de bloco.** Escrever a pasta de módulo com
   asterisco e barra no fim, dentro de um `/** … */`, fecha o comentário ali — e o
   `scripts/ensaio-geral.mjs` inteiro virou erro de sintaxe, apontado pelo Node **trinta
   linhas depois da causa**.

4. **`shell: true` no Windows quebra caminho com espaço.** `spawnSync` com
   `"C:\Program Files\PostgreSQL\18\bin\initdb"` e `shell: true` tenta rodar
   `"C:\Program"`. O sintoma foi mudo: "initdb falhou", sem dizer por quê. O `shell` agora
   só entra em comando de nome curto (`npm`), que no Windows é um `.cmd`.

5. **`pg_ctl start` com a saída capturada NUNCA RETORNA.** O servidor que ele deixa de pé
   herda o pipe do `spawnSync`, e o `spawnSync` só volta quando o pipe fecha — ou seja,
   quando o banco morre. O script ficou **quinze minutos parado, com 0% de CPU e sem
   mensagem nenhuma**, com o PostgreSQL no ar. `stdio: "ignore"` resolve: sem pipe não há
   o que esperar, e a saída do servidor já ia para o arquivo do `-l`.

6. **Quatro arquivos que "deviam ser LF" eram CRLF, e o pipeline os converteu.** O diff do
   `financeiro_01_schema.sql` saiu com **2.885 linhas** onde a alteração real era de
   **611** — exatamente o estrago que a regra do `CLAUDE.md` já descrevia para o próprio
   `CLAUDE.md` e para os `.html` de `_estudos`, agora em `.sql` e em `.test.ts`. A defesa
   que ficou escrita como regra: comparar `git diff --numstat` com
   `git diff --numstat --ignore-cr-at-eol`; se os números não baterem, as quebras de linha
   foram reescritas e o diff está escondendo a alteração de verdade.

7. **O ensaio deu vermelho nos dois inventários que estavam perfeitos.** Ele procurava
   `| OK |` num veredito que é a ÚLTIMA coluna da tabela e termina em `| OK`, sem barra
   depois. Ficou a regra: contagem zero de veredito é FALHA, nunca aprovação — um arquivo
   de prova que não imprime veredito nenhum ou estourou, ou está sendo lido errado, e
   "não sei" é vermelho.

8. **A trava 39 nasceu errada e acusou na primeira execução.** Ela esperava receita de
   6.100,00 em março, esquecendo que a mesma identificadora recebeu 1.000,00 noutra conta
   movimento — e o dashboard 2 soma **todas** as contas, porque olha o dinheiro pelo motivo,
   não pelo lugar. Foi o primeiro serviço que ela prestou, antes de existir tela.

**O bônus que mais muda o dia a dia: `npm run ensaio`.** Ele roda as seis provas de uma vez
— testes do Core, verificador de LEGO, lint, build, banco descartável com todas as travas,
e o **ensaio de upgrade**: monta um banco com o schema do último commit e aplica o de agora
por cima, que é o que pega a SOBRECARGA de função (já aconteceu três vezes neste projeto).
Antes eram seis comandos à mão, um deles com nove passos numa folha de instruções — o que
mais tomava tempo em todas as rodadas, e o mais fácil de pular na pressa.

Os outros bônus aceitos: cadeado no mês fechado, vermelho no saldo negativo, primeira coluna
congelada ao rolar, linha RESULTADO, caixa para ocultar a transferência (que **esconde a
linha e não mexe no total**, porque o total tem de bater com a conferência), fundo
acinzentado no mês futuro (saldo à frente é previsão, não fato), dica de entradas e saídas
ao passar o mouse, aviso quando o ano está vazio, nome da empresa e exercício na tela, e o
botão de imprimir visível-e-apagado em vez de escondido.

**Nenhuma permissão nova.** `extrato_ver` já se chama, na tela de permissões, "VER A
CONFERÊNCIA DA CONTA (SALDOS)" — continuam sendo 18, e ninguém precisa reconfigurar a
equipe. O item DASHBOARDS do menu deixou de dizer "EM DESENVOLVIMENTO".

**Placar:** `npm test` **90/90** · `teste_financeiro.sql` **40/40** · `teste_rls.sql`
**16/16** · `inventario_financeiro.sql` **17/17** · LEGO 0 violações · lint e build limpos ·
ensaio de upgrade sem sobrecarga · **as 6 travas novas vistas FALHAR**, cada uma por uma
mutação diferente aplicada de propósito na função que ela protege.

---

**2026-09-17 (terceira rodada) — v10: marcar registro a registro, reabrir todas as contas e limpar a lixeira**

Ele testou as telas da rodada anterior e pediu três coisas, todas nascidas do uso real:
reabrir o período de **todas** as contas de uma vez, **listar os lançamentos com caixa de
marcar** na exclusão por período, e **excluir definitivamente** (limpar a lixeira).

> 🎁 **REABRIR TODAS NÃO EXIGIU UMA LINHA DE SQL.** A `fin_reabrir_periodo` aceita
> `conta_movimento_id` nulo como "todas as contas desta empresa" **desde o degrau 7** — era
> capacidade instalada e INALCANÇÁVEL, porque a tela só a chamava conta por conta. É o
> segundo achado desse tipo em dois dias, depois da lixeira: o banco já sabia fazer,
> faltava a porta. Vale procurar por outras.

**A LISTAGEM COM CAIXAS mudou a função do banco**, e por isso veio com o ritual completo:
`fin_excluir_lancamentos_por_periodo` ganhou `p_ids uuid[]`, com `DROP FUNCTION` da
assinatura antiga **antes** do `CREATE` — a terceira vez que esse cuidado aparece (depois da
`fin_transferir` em 14/09 e da `fin_periodo_fechado` na 1ª rodada de hoje). Sem o DROP,
sobreviveria uma segunda função que apaga o **período inteiro** sem olhar o que a tela
marcou, e com o GRANT que o arquivo lhe deu.

> ⚠️ **`[]` E `NULL` NÃO PODEM SER A MESMA COISA — É O DEFEITO MAIS GRAVE QUE ESTA TELA
> PODERIA TER.** `NULL` em `p_ids` quer dizer "não estou escolhendo, leve o período";
> `'{}'` quer dizer "desmarquei tudo, não leve nada". Se os dois caíssem no mesmo caminho,
> clicar em **DESMARCAR TODOS** e confirmar apagaria justamente o mês inteiro — o contrário
> exato do pedido. A distinção está travada em três camadas: no SQL (trava 31), no serviço
> do Core (`params.ids === undefined ? null : params.ids`, nunca `?? null`) e na regra de
> tela (`mesmaSelecao` trata `null` como igual só a `null`).

> ⚠️ **`p_ids` SE SOMA AO FILTRO, NÃO O SUBSTITUI.** O conjunto é a INTERSEÇÃO: "estes ids,
> E dentro do período/conta informados". Se os ids valessem sozinhos, uma chamada forjada
> apagaria qualquer lançamento da empresa, de qualquer data, driblando a conferência de
> período que a tela mostrou. Trava 32.

> ⚠️ **A LISTAGEM PRECISOU DE TETO, E O MOTIVO É O `pesquisar` PAGINAR EM 50.** Sem teto
> explícito, um período com 300 lançamentos mostraria 50 — e a pessoa marcaria as 50
> achando que marcou o mês, enquanto a conferência devolveria 300. O teto é 500, e **ao
> batê-lo a tela RECUSA seguir** e pede um período menor, em vez de trabalhar sobre um
> recorte em silêncio.

**A tela ficou de QUATRO passos:** listar → marcar → conferir → digitar o número e excluir.
Listar e conferir são separados de propósito: se a listagem já disparasse a conferência,
cada clique numa caixa invalidaria o número e marcar cinco registros custaria cinco
conferências.

**LIMPAR A LIXEIRA é a única operação do módulo que apaga informação de vez**, e está
escrito assim no código e na tela. Tudo o mais apaga DADO, e o dado apagado deixa rastro na
auditoria — é dele que a lixeira vive. Esta apaga **o rastro**. Por isso ela simula antes e
devolve `restauraveis`: quantos lançamentos deixarão de poder voltar. A confirmação mostra
esse número, e avisa que "limpar tudo" alcança **todas** as exclusões já registradas, não
só os 30 dias que a lista mostra.

> ⚠️ **NA LIXEIRA A LINHA NÃO É CLICÁVEL — e na lista de exclusão é.** Não é inconsistência:
> na lixeira a linha já tem uma ação de sentido OPOSTO (RESTAURAR) e a caixa marca para
> apagar de vez; linha que faz as duas coisas é receita de clique errado. Na lista de
> exclusão os dois gestos querem o MESMO, então a linha inteira alterna e o `<input>` é
> `readOnly` — senão o clique contaria duas vezes e pareceria não funcionar.

**Correção registrada:** a entrada da 2ª rodada dizia que `fin_periodo_fechado` "era a única
função do módulo sem filtro de empresa". **Errado** — `fin_proxima_ordem` também não filtra
(alcançável, gravidade baixa: devolve só o próximo número de ordem) e
`fin_abrir_espaco_na_ordem` também não (sem GRANT, chamada só de dentro). Corrigido no item
4 daquela entrada.

**As 5 travas novas (30 a 34) foram todas vistas FALHAR**, sabotando uma a uma a proteção
que cada uma guarda. E um teste antigo apanhou uma mudança minha: ao reescrever o aviso de
"simulação vencida" para citar também os marcados, a asserção `/FILTROS MUDARAM/` quebrou —
corrigi o teste, não a mensagem.

**Placar:** `npm test` **69/69** (eram 63) · `teste_financeiro.sql` **34/34** (eram 29) ·
`teste_rls.sql` **16/16** · `inventario_financeiro.sql` **17/17** · `inventario.sql`
**4/4** · verificador de LEGO sem violação · lint e build limpos · **caminho de atualização
ensaiado a partir do schema publicado** (24 → 25 funções, sem sobrecarga, nada aberto ao
`anon`).

---

**2026-09-17 (segunda rodada) — v10: exclusão em lote, a LIXEIRA que já existia sem ninguém saber, e os sete bônus**

Ele autorizou tudo do estudo da manhã, **menos o pedido A** — e pela razão certa:
*"se já existe REABRIR, não precisa criar o pedido porque já tem função que gere o efeito
desejado"*. Duplicar um caminho para o mesmo efeito seria criar duas regras onde há uma.

**O QUE ENTROU:** pedido C (ficha na PESQUISAR), pedido B (excluir lançamentos por período)
e os 7 bônus.

> 🎁 **A DESCOBERTA QUE MUDOU O PROJETO DO PEDIDO B: a lixeira já existia, e ninguém
> estava olhando.** O gatilho `audit_fin_lanc` é `AFTER UPDATE OR DELETE ... FOR EACH ROW`
> e a `registrar_auditoria()` grava `dados_antes = to_jsonb(OLD)` — **o registro inteiro,
> campo por campo**, antes de morrer. Isso sempre esteve lá; faltava a janela. Com
> `fin_listar_exclusoes` e `fin_restaurar_lancamento` (nenhuma tabela nova), a exclusão em
> massa deixou de ser irreversível. Foi o que tornou o pedido B aceitável.

**As decisões do pedido B, e o porquê de cada uma:**

| Decisão | Por quê |
|---|---|
| `p_simular` com padrão **`true`** | Esquecer o argumento tem de ser inofensivo. O caminho seguro precisa ser o preguiçoso |
| Quem **conta** é quem **apaga** | Com duas contagens, um dia a tela diz 137 e o banco apaga 141 — e a confirmação vira mentira |
| Fechamento **preciso**, não rígido | A leitura rígida puniria quem fecha o mês todo mês: a ferramenta ficaria só para quem NÃO fecha |
| Permissão própria `lc_excluir_lote` | "Apagar UM lançamento alheio" e "apagar UM ANO" são poderes de tamanhos diferentes |
| Digitar o NÚMERO para confirmar | "Tem certeza?" é clicado no automático. Digitar 137 obriga a LER e a CONCORDAR |

> ⚠️ **A TRANSFERÊNCIA SAI INTEIRA, INCLUSIVE A PERNA FORA DO FILTRO (RN-23).** Apagar só
> a perna que casa com o filtro deixaria a OUTRA conta com dinheiro que não veio de lugar
> nenhum. Por isso o conjunto é expandido por `transferencia_id` ANTES de conferir
> fechamento e de apagar — e o relatório devolve `fora_do_filtro` separado, para a tela
> avisar que "apagar setembro do CAIXA" vai mexer no BANCO.

> ⚠️ **`CREATE TEMP TABLE` DENTRO DE `SECURITY DEFINER` FOI TROCADO POR ARRAY.** A primeira
> versão usava tabela temporária; o PostgreSQL procura relações em `pg_temp` **antes** do
> `search_path` declarado, então quem chama poderia criar uma tabela com aquele nome na
> sessão dele e a função passaria a trabalhar sobre ela. `uuid[]` + `jsonb[]` com `unnest`
> são variáveis: não existem fora da função, e não há o que sequestrar.

**OS SETE BÔNUS — e dois deles corrigiram defeitos que JÁ ESTAVAM no banco dele:**

1. **Lixeira + restaurar** — descrito acima.
2. **`lc_excluir_lote`** — a 18ª permissão.
3. **Trava de intenção no `financeiro_00_reset.sql`** — ele apagava os lançamentos de
   TODAS as empresas sem trava nenhuma.
4. **`fin_periodo_fechado` ganhou `p_tenant_id`** — ⚠️ **CORREÇÃO (17/09, 2ª rodada):
   esta entrada dizia "era a ÚNICA função do módulo sem filtro de empresa", e isso
   estava ERRADO.** Descobri conferindo o retrato do banco publicado. Faltam ainda
   `fin_proxima_ordem` (tem GRANT, alcançável; gravidade BAIXA — só devolve o próximo
   número de ordem, e exige adivinhar um UUID) e `fin_abrir_espaco_na_ordem` (sem
   GRANT, só chamada de dentro de outra `SECURITY DEFINER` que já validou o tenant —
   gravidade nenhuma). A `fin_normalizar` não tem tenant a filtrar. Era a única sem
   filtro de empresa.
5. **Conferência de ASSINATURA no inventário do módulo** (linha 17).
6. **Histórico de fechamentos** — `fin_fechamentos` tem UMA linha por conta, então reabrir
   apagava o vestígio; o histórico sai da auditoria.
7. **Teste da camada de tela** — na forma que cabe, ver abaixo.

> ⚠️ **EU ERREI NO ESTUDO DA MANHÃ, E O CÓDIGO ME CORRIGIU.** Eu havia escrito que o
> `inventario_financeiro.sql` "não conta as funções do módulo". **Conta desde sempre** (é a
> linha 2), e a linha 7 já pegava sobrecarga. O que faltava mesmo era outra coisa: contar
> pega a função que SUMIU e a que SOBROU, mas **não a que MUDOU DE FORMA** — trocar um
> parâmetro deixa o total igual e o inventário diz OK. Daí a linha 17 nova, que compara a
> lista INTEIRA de assinaturas. Provada sabotando `fin_saldo_atual`: a linha 2 disse OK e a
> 17 nomeou o culpado com as duas assinaturas lado a lado.

> ⚠️ **DOIS DEFEITOS ANTIGOS APARECERAM AO ENSAIAR, NÃO AO LER.**
> **(a)** O `financeiro_00_reset.sql` **nunca derrubou as duas funções de importação** —
> elas nasceram em 13/09/2026 e ninguém as pôs na lista de baixa. O reset dizia "pronto"
> deixando duas funções `fin_*` vivas: um módulo "desplugado" com código instalado.
> **(b)** O `inventario.sql` da PLATAFORMA contava tudo que havia no schema `public`. Com o
> módulo instalado — que é o estado do banco dele — as **quatro** contagens davam DIVERGE
> (12 tabelas onde esperava 7, 51 funções onde esperava 27) e as 24 funções do módulo
> apareciam como "SOBRANDO". Vermelho falso desde que o módulo foi plugado, e **vermelho
> falso ensina a ignorar o vermelho**. O conserto: a plataforma passa a contar **as próprias
> peças, pelo nome**, e para ignorar as de módulo **deduz o prefixo de
> `platform_modules.funcao_limpeza`** — sem escrever o nome de módulo nenhum, que o LEGO
> proíbe.

> ⚠️ **O `BEGIN;` TEM DE VIR ANTES DA TRAVA — descoberto errando.** Na primeira versão da
> trava do reset do módulo eu pus o `BEGIN;` **depois** do bloco que recusa. O ensaio com
> `psql -f` sem `ON_ERROR_STOP` mostrou o buraco na hora: o erro era impresso, o psql seguia
> para a instrução seguinte — que era o próprio `BEGIN;` — e **as 4 tabelas caíam com a
> trava fechada**. A transação abria depois do erro.

**O BÔNUS 7, NA FORMA HONESTA.** Testar o `.tsx` de verdade **não cabe hoje, e isso foi
medido**: o `npm test` roda `node --test`, e o Node 24 remove anotações de tipo mas **não
lê JSX** (`SyntaxError: Unexpected token '<'`). Seriam de 3 a 5 dependências novas num
projeto com **zero** — e mudança no que a Vercel instala, num projeto cujo dono não roda
nada local. O caminho que cabe é o que a própria regra do projeto já manda: **tirar a
DECISÃO de dentro da tela**. Nasceram `manutencaoRegras.ts` e 19 testes. A trava mais
importante deles: **mexer no filtro DEPOIS de conferir invalida a conferência** — sem isso,
conferir setembro (137) e trocar para janeiro deixaria o botão dizendo 137 sobre outro
período. É a mesma classe de defeito da sugestão de ordem presa a `[contaId, data]`.
**Não cobre clique, foco nem propagação de evento, e eu não vou fingir que cobre.**

**Placar, tudo medido em PostgreSQL 18 local:** `npm test` **63/63** (eram 44) ·
`teste_rls.sql` **16/16** · `teste_financeiro.sql` **29/29** (eram 21) ·
`inventario_financeiro.sql` **17/17** · `inventario.sql` **4/4 com o módulo instalado**
(antes dava DIVERGE nas quatro) · verificador de LEGO sem violação · build compilado.

**As 8 travas novas foram todas vistas FALHAR**, uma a uma, sabotando a proteção que cada
uma guarda. Uma das sabotagens foi **erro meu**: trocar `ON CONFLICT DO NOTHING` por um
`NOT EXISTS` equivalente manteve o comportamento correto, e o teste ficou verde com razão.
Refeita removendo a proteção de vez, a trava 26 acusou `23505 duplicar valor da chave`.

---

**2026-09-17 — v10: o porteiro do reset, e oito divergências entre o que a doc diz e o que o código faz**

Dois pedidos autorizados no mesmo dia: **corrigir as divergências doc × código** apontadas
pelo estudo de engenharia reversa de 16/09, e **gerar o porteiro** que faz o
`plataforma_00_reset.sql` recusar rodar com módulo instalado — a armadilha que a entrada
de 16/09, logo abaixo, só tinha conseguido *documentar*.

**AS DIVERGÊNCIAS ERAM 7 NA LISTA; FORAM ENCONTRADAS 8.** Todas corrigidas:

| # | O que a doc/comentário dizia | O que o código faz |
|---|---|---|
| 1 | `CLAUDE.md`: "Não há scripts de teste em nenhum pacote" | A raiz tem `npm test` com **44 testes** |
| 2 | `CLAUDE.md`: "25 funções" no schema da plataforma | **27** |
| 3 | `CLAUDE.md`: a raiz "ainda declara um script de build do core" | Não declara; são 6 scripts, nenhum deles |
| 4 | `CLAUDE.md`: listava `dashboard/tenants/actions.ts` | Não existe; e faltavam `dashboard/modulos/`, `privacidade/` e 3 arquivos de `src/lib/` |
| 5 | `registro.ts`: "Hoje a lista está VAZIA" | Registra um módulo desde o degrau 6 |
| 6 | `dashboard/modulos/page.tsx`: "com zero módulos plugados (o estado de hoje)" | Há um; o aviso de estado vazio é condicional e não aparece |
| 7 | `package.json`: nome `plataforma-jairo-o-d-c-v4` | Projeto na v10 — sete versões de defasagem |
| **8** | 3 arquivos citavam `LoginGoogleOwnerView` | Virou `LoginGoogleView.tsx` em 13/09/2026 |

> ⚠️ **A Nº 1 ERA A PERIGOSA, E NÃO PELO TEXTO.** Uma doc que diz não haver teste ensina
> que não existe rede de proteção — e convida a entregar sem rodar nada. Ela estava lá
> enquanto o `npm test` passava 44 verdes.

> ⚠️ **A Nº 7 NÃO SE CORRIGE À MÃO.** Trocar o nome no `package.json` sem o
> `package-lock.json` desincroniza os dois, e é isso que o `npm ci` da Vercel recusa —
> quebraria a publicação por um detalhe cosmético. O certo é alterar o `package.json` e
> deixar o **npm** regravar o lockfile: `npm install --package-lock-only`. Resultado
> medido: **2 linhas** mudadas no lockfile, zero mexida em dependência.

**O PORTEIRO — e por que ele não pode citar o nome de um módulo.** Um porteiro escrito
como `IF to_regclass('public.fin_lancamentos') IS NOT NULL` seria uma **quarta solda
clandestina** (a plataforma passaria a conhecer a peça, contra a regra do LEGO) e ainda
ficaria **cego para o segundo módulo**. Então ele não procura nomes — procura **o dano**,
em duas travas: (1) chave estrangeira de tabela que **não é** da plataforma apontando para
tabela que o reset vai derrubar; (2) linha sobrando em `platform_modules`. Serve para o
módulo de hoje, para os de amanhã e para qualquer tabela avulsa.

> ⚠️ **O PORTEIRO SOZINHO NÃO BASTAVA — E SÓ O ENSAIO MOSTROU.** Com o módulo instalado,
> `psql -f plataforma_00_reset.sql` **sem** `-v ON_ERROR_STOP=1` imprimia a recusa e
> **seguia para a instrução seguinte**: `users` e `tenants` caíram e as **8 chaves do
> módulo foram destruídas** — exatamente o estrago que o porteiro existia para impedir,
> agora com um aviso já rolado para fora da tela. O SQL Editor do Supabase **aborta
> sozinho** (manda o arquivo como lote único, que o PostgreSQL embrulha numa transação
> implícita — provado com um lote de duas instruções), mas porteiro que protege só num
> cliente é meio porteiro. **A correção foi envolver o arquivo em `BEGIN;` … `COMMIT;`**,
> e de brinde o reset ficou atômico: ou volta tudo ao estado limpo, ou nada muda.

**As seis provas, num PostgreSQL 18 descartável desta máquina** — e o porteiro foi visto
**recusar antes** de ser visto liberar:

| Cenário | Esperado | Medido |
|---|---|---|
| A · Plataforma + módulo instalados | Recusa, nomeando as 4 tabelas | Recusou; **2** tabelas de plataforma e **8** chaves intactas |
| B · Reset do módulo primeiro | Tabelas `fin_*` e catálogo a zero | 0 e 0 |
| C · Reset da plataforma depois | "PORTEIRO OK", 7 tabelas derrubadas | exit 0; 7 derrubadas |
| D · Banco virgem (sem `platform_modules`) | Não estoura | "PORTEIRO OK", exit 0 |
| E · Só a linha do catálogo sobrando | Recusa pela trava 2 | Recusou, nomeando o módulo |
| F · Pior caso: cliente que ignora erro | Nada é derrubado | **2** tabelas e **8** chaves sobreviveram |

Reconstrução completa no mesmo banco depois de tudo: `teste_rls.sql` **16/16 PASSOU**
localmente, `npm test` **44/44**, verificador de LEGO sem violação.

> ⚠️ **O VERIFICADOR DE LEGO ACUSOU UMA CORREÇÃO MINHA — E TINHA RAZÃO PELA METADE.** Ao
> reescrever o comentário de `dashboard/modulos/page.tsx` eu escrevi o nome do módulo
> dentro de um `{/* … */}`. O `ehComentario` dele é **linha a linha**, então a linha de
> continuação (que não começa com `//`, `*` ou `--`) foi lida como código e virou violação
> R1/R8. É **falso positivo** do verificador — mas a correção certa é tirar o nome do
> comentário, não relaxar o verificador. Ele apanhou o gesto errado pelo motivo quase
> certo.

**Três números defasados foram corrigidos de quebra**, todos do tipo que não quebra nada e
só ensina o errado: `LEIA-ME-ORDEM.md` dizia "os 8 arquivos" listando 10 e "25 funções";
o README do ambiente local dizia "**14 linhas**, todas PASSOU" onde o teste tem **16**.
Cada um ganhou, na mesma linha, o comando que o recalcula.

---

**2026-09-16 (noite) — v10: o LEIA-ME-ORDEM, e a armadilha que ele desenterrou**

Nasceu o `supabase/LEIA-ME-ORDEM.md`: qual dos 10 SQLs rodar, em que ordem e em qual
das quatro situações (banco novo, recomeçar do zero, só atualizar o módulo, desplugar).
Era para ser meia hora de escrita. Virou outra coisa ao conferir a ordem dos dois resets.

> ⚠️ **RODAR O `plataforma_00_reset.sql` COM O MÓDULO INSTALADO DESTRÓI AS CHAVES DO
> MÓDULO PARA SEMPRE — EM SILÊNCIO.** Medido num PostgreSQL 18, três passos:
> módulo instalado **11 chaves** → após o reset da plataforma **3** → após reconstruir
> **tudo**, módulo incluso, **3**. O reset derruba `tenants` e `users` com `CASCADE`: as
> tabelas `fin_*` **sobrevivem** (o reset é restrito ao CORE, de propósito) mas as 8
> chaves delas para a plataforma vão junto. **E reaplicar o `financeiro_01_schema.sql`
> não as traz de volta:** `CREATE TABLE IF NOT EXISTS` vê a tabela de pé e pula o bloco
> inteiro — e as chaves moram dentro dele. O módulo fica sem a amarra `tenant_id →
> tenants`, e apagar uma empresa passa a deixar lançamentos órfãos. Nada reclama.
> **A ordem certa é o reset do MÓDULO primeiro**, e aí as 11 chaves voltam inteiras.

> ⚠️ **A LIÇÃO GERAL, maior que este caso:** "schema idempotente" não quer dizer
> "conserta o que estiver errado". `CREATE TABLE IF NOT EXISTS` **não compara nada** —
> constraint perdida, coluna nova e default alterado ficam de fora para sempre.

**O inventário aprendeu a pegar isso, e passou a ter 16 linhas.** A linha 16 (AMARRAS)
espera 8 chaves de `fin_*` para a plataforma; no banco estragado ela diz `8 → 0` e as
linhas DETALHE nomeiam as quatro tabelas soltas. **Provado nos dois sentidos:** 16/16 OK
num banco do zero (os 5 arquivos sem um único erro) e DIVERGE no banco com o estrago.

> **Medida de brinde, para o documento não afirmar o que não foi medido:** aplicar o
> `financeiro_01_schema.sql` num banco SEM a plataforma estoura **47 vezes** — e o SQL
> Editor mostra só o primeiro erro, que fala de uma tabela que ninguém esperava ver
> citada ali. Por isso a ordem plataforma→módulo ganhou explicação, e não só um número.

> ⚠️ **ARMADILHA DE FERRAMENTA, A MESMA DE HORAS ANTES, E EU CAÍ NELA DE NOVO:**
> `open(p, "wb").write(s.encode())` avalia o `open` **antes** do `encode` — o arquivo
> é truncado e, se a codificação estourar, sobra **zero byte**. De manhã zerou o
> `useNovoLancamento.ts`; à noite zerou o próprio `CLAUDE.md`. Os dois recuperados com
> `git checkout`, porque estavam commitados. **Codificar para uma variável primeiro, e
> só então abrir o arquivo** — virou regra, depois de duas.

> ⚠️ **E UM SUSTO QUE NÃO ERA DEFEITO:** durante as medições, o `plataforma_01_schema.sql`
> parecia criar só 2 das 7 tabelas e funcionar na segunda tentativa. **Não é defeito do
> arquivo:** era o meu roteiro conectando ao banco recém-criado antes de ele estar
> pronto, e o `00_supabase_falso.sql` falhando calado. Com uma consulta de espera entre
> `CREATE DATABASE` e o primeiro uso, os 5 arquivos rodam com **zero erros**. Fica
> registrado para ninguém "consertar" um schema que está certo.

---

**2026-09-16 (tarde) — v10: a ordem que voltou, e o inventário do módulo**

Dois pedidos dele, e um defeito mais grave achado no caminho do primeiro.

**1) A ORDEM NO EXTRATO volta sozinha depois de gravar.** Pedido dele: lançando em
série, a tela mantém conta e data, mas o campo ORDEM vinha em branco. Agora ele traz
o próximo número do dia — 4, 5, 6 — sem ninguém digitar.

> ⚠️ **DUAS FUNÇÕES CERTAS, SOZINHAS, PRODUZINDO UM DEFEITO JUNTAS.** A sugestão de
> ordem nasceu presa a `[contaId, data]` — "quando a conta ou a data mudarem". E o
> bônus N2 existe justamente para **não** mudar conta nem data após gravar, que é o
> que permite lançar em série. Uma esperava a outra: nada mudava, o efeito não rodava,
> e o campo ficava em branco **exatamente no caso em que mais se lança seguido**. A
> correção é um contador que só cresce — o jeito de dizer "pergunte de novo, mesmo que
> nada tenha mudado".

> ⚠️ **O DEFEITO VIZINHO, ACHADO NO MESMO CAMPO, E PIOR QUE O PEDIDO.** Ao abrir um
> lançamento para EDITAR, a tela preenchia a ordem REAL do registro — e a sugestão
> disparava logo atrás e **sobrescrevia esse número pela próxima livre**. Gravar em
> seguida **MOVIA o lançamento para o fim do dia**, empurrando os vizinhos (RN-12), sem
> aviso nenhum. **Só aparecia quando o lançamento era de outra conta ou de outra data**
> — o caso de quem chega pela tela PESQUISAR. Estava lá desde o degrau 7.

> ⚠️ **A GUARDA VAI NO EFEITO, NUNCA DENTRO DA BUSCA.** Uma checagem de `editandoId`
> feita dentro da função `async` leria o valor ANTIGO do fecho quando `limparFormulario`
> zera o modo de edição — e pularia a sugestão justamente ao gravar uma edição.

**2) Nasceu o `supabase/testes/inventario_financeiro.sql`** (ele autorizou depois de eu
explicar o que era). Uma tabela de **15 linhas**, um SELECT só, **sem escrever nada** —
pode rodar em produção. Responde "as peças estão todas lá?", que é outra pergunta da
do `teste_financeiro.sql` ("as regras funcionam?").

> **Provado nos dois sentidos, num PostgreSQL 18 local:** 15/15 OK num banco montado do
> zero **e**, com sete defeitos injetados de propósito (a sobrecarga de `fin_transferir`,
> o seed apagado, função interna com GRANT, porta aberta ao anônimo, RLS desligado,
> policy sem `TO`, chave estrangeira simples entre tabelas do módulo), **os sete foram
> pegos**, com as linhas DETALHE nomeando cada culpado.

> ⚠️ **ACHADO DE BRINDE, E ELE VALE POR SI:** a sobrecarga injetada apareceu **também**
> como aberta ao anônimo. O motivo é a regra que já estava escrita e agora tem prova:
> **função nova nasce executável por PUBLIC, e o `GRANT` sozinho não fecha isso** — só o
> `REVOKE … FROM PUBLIC` fecha. Uma sobrecarga esquecida não é só lixo: pode ser porta.

> ⚠️ **`has_function_privilege('anon', …)` ESTOURA SE O PAPEL NÃO EXISTIR**, e leva junto
> o resultado das linhas que já tinham passado. O arquivo lê privilégio por `aclexplode`
> com `JOIN` em `pg_roles` — devolve "ninguém" em vez de morrer — e trata `proacl IS
> NULL` explicitamente como ABERTA A PUBLIC.

> ⚠️ **SEIS NÚMEROS DELE SÃO ESCRITOS À MÃO, E ESTÁ CERTO QUE SEJAM.** Tabelas (4),
> funções (20), policies (4), triggers (8), índices (16) e alcance do app (18) são a
> AFIRMAÇÃO do schema; deduzi-los do catalágo seria perguntar ao banco se ele concorda
> consigo mesmo, e a resposta seria sempre sim. As outras nove linhas esperam ZERO, e o
> zero não envelhece. **Objeto novo no schema = atualizar o número no mesmo commit**, ou
> o inventário vira decoração que ensina a ignorar o vermelho.

> ⚠️ **ARMADILHA DE FERRAMENTA, NÃO DE CÓDIGO:** um script de edição em Python que abre o
> arquivo com `open(caminho, "w")` **trunca antes de codificar**. Um `\ud83d\udd01` escrito
> como par substituto fez a codificação falhar **depois** do truncamento, e o
> `useNovoLancamento.ts` ficou com **zero byte**. Recuperado com `git checkout` porque
> estava commitado. A partir daqui: montar o texto, `.encode('utf-8')`, só então abrir
> em `"wb"`.

---

**2026-09-16 — v10: o placar fechou no banco real, e a linha do extrato abriu**

Dia de duas naturezas: uma conferência que faltava e um recurso novo pequeno.

**1) As travas 19, 20 e 21 rodaram no Supabase de produção: `teste_financeiro.sql`
21/21.** Era a única pendência técnica aberta desde 14/09 — elas tinham passado num
PostgreSQL 18 local (do zero **e** simulando o upgrade), mas nunca no banco dele. O
resultado #16 é o que mais importa da tabela: **"alcança 18 de 18, sem EXECUTE: —"**.
Nenhuma função ficou para trás no upgrade, e o #15 confirma **0 funções abertas ao
anônimo**. A especificação deixou de dizer "medido no local" e passou a dizer, com
data, **onde cada número foi medido**.

**2) A "divergência da conta desativada" foi resolvida NO DOCUMENTO, não no código.**
A especificação dizia, desde 12/09, que o filtro CONTA MOVIMENTO da CONFERÊNCIA traria
também as contas inativas, "porque elas têm histórico". **O código nunca fez isso** —
ele usa a mesma busca do campo de lançamento, que obedece à RN-06. Apresentada a
escolha, o dono do projeto decidiu: *"ajustar para refletir o código real"*. Virou a
seção **13.7**, com o que se perde escrito sem maquiagem (o extrato de conta
desativada só pela PESQUISAR).

> ⚠️ **O motivo técnico de a decisão ser boa, e não só a mais curta:** os dois campos
> chamados CONTA MOVIMENTO vivem na **mesma tela** — um no formulário, outro no filtro.
> Fazer um listar o que o outro recusa é a armadilha que este projeto já pagou em
> 14/09 com o campo digitável: **dois campos de mesmo nome e comportamentos
> diferentes ensinam uma coisa e cobram outra**.

**3) Clicar numa linha do extrato abre a ficha completa do lançamento** (pedido dele,
do dia). Quatro arquivos, **nenhuma mudança no banco**: `detalhar()` no
`lancamentoService`, o hook `useDetalheDoLancamento`, a janela `DetalheDoLancamento` e
o clique na `<tr>` do `ExtratoDaConta`. A ficha **só lê** — editar, excluir e conferir
continuam no menu AÇÕES e na caixa OK da linha, que já têm as recusas do banco atrás
deles.

> ⚠️ **A ARMADILHA DO DIA: A LINHA JÁ TINHA DOIS DONOS.** A `<tr>` do extrato já
> respondia a dois cliques — a caixa **OK** (conferido) e o botão do menu **AÇÕES**.
> Um clique **sobe** pelos elementos que o contêm; sem `stopPropagation` nessas duas
> células, marcar um lançamento como conferido abriria a ficha **por cima** da ação, e
> o menu nasceria enterrado sob a janela. **Não quebra build, não acusa erro e só
> aparece no dedo de quem usa** — primo do defeito `mousedown`×`click` do degrau 3.

> ⚠️ **A ficha busca de novo no banco, e não reaproveita a linha da tela.** A
> `fin_extrato` devolve dez campos feitos para somar saldo: não traz PROPRIEDADE,
> REGIME, o TIPO gravado das contas nem a marca de transferência. Montar a ficha com o
> que a linha tem seria **adivinhar**; alargar o `RETURNS TABLE` faria toda abertura do
> extrato carregar campos que quase ninguém abre. Uma leitura sob demanda, de uma linha
> só, custa menos e **não mexe no banco**.

> ⚠️ **O `.html` da especificação é CRLF; os `.ts`/`.tsx` são LF.** Um script de
> edição em Python que lê o HTML em modo texto **sem `newline=''`** troca as 2.431
> quebras de linha do arquivo em silêncio — o `git diff` do dia acusou **2.429
> inserções e 2.431 remoções** para uma alteração de quatro trechos. Foi revertido
> antes do commit, mas o diff teria escondido a mudança real dentro do ruído.

**Placar ao fim do dia:** `npm test` **44/44** · `teste_financeiro.sql` **21/21 (banco
real)** · `teste_rls.sql` **16/16** · verificador de LEGO sem violação · build
compilando. **Fase 5 (DINHEIRO DO PERÍODO, DASHBOARDS, ORÇAMENTO) adiada por ele, sem
previsão.**

---

**2026-09-14 (tarde) — v10: a transferência escolhe a posição nas duas contas**

Segunda rodada do dia. **Exige rodar de novo SÓ o `financeiro_01_schema.sql`** —
o mesmo arquivo que a rodada da manhã já pedia, então é uma execução só para as
duas.

| Onde | O que mudou |
|---|---|
| `financeiro_01_schema.sql` 4.3-b | ✨ `fin_abrir_espaco_na_ordem` — a RN-12 num lugar só; o banco foi a **20 funções `fin_`** |
| `financeiro_01_schema.sql` 4.7 | `fin_gravar_lancamento` passou a CHAMAR o helper em vez de repetir a regra |
| `financeiro_01_schema.sql` 4.9 | `fin_transferir` ganhou `p_ordem_origem` e `p_ordem_destino`, com `DROP` da assinatura antiga antes |
| `financeiro_00_reset.sql` | Derruba as **duas** assinaturas de `fin_transferir` e o helper |
| `teste_financeiro.sql` | ✨ Teste **21**; o porteiro e o teste 16 excluem a função interna. Foi para **21 testes** |
| `lancamentoService.transferir` | Recebe `ordemOrigem`/`ordemDestino` e devolve em que ordem cada perna entrou |
| `transferencia/page.tsx` | ✨ Os dois campos, com sugestão da próxima ordem livre em cada conta |

⚠️ **ACRESCENTAR PARÂMETRO A UMA FUNÇÃO NÃO A SUBSTITUI — CRIA UMA SEGUNDA.**
`CREATE OR REPLACE FUNCTION` só substitui quando a **lista de parâmetros** é
idêntica; com uma lista diferente, o PostgreSQL entende que é outra função e
cria uma **sobrecarga**. **Medido**, aplicando o schema novo sem o `DROP` sobre
um banco que tinha a versão antiga: ficaram **duas** `fin_transferir`, a de 6 e
a de 8 parâmetros, **e as duas com `EXECUTE` para `authenticated`** — a antiga
continuaria respondendo, jogando as pernas para o fim do dia, e qual das duas
atenderia dependeria dos argumentos enviados. Com o `DROP`, sobra **uma**. É o
irmão do problema do `RETURNS TABLE` que o `fin_extrato` já documenta, e a
assinatura do DROP são os **parâmetros antigos**.

⚠️ **A REGRA DA ORDEM SAIU DE DENTRO DO `fin_gravar_lancamento`.** Com a
transferência informando ordem nas duas contas, a mesma RN-12 passaria a existir
em **três** lugares. A `fin_abrir_espaco_na_ordem` a guarda uma vez só — e o
detalhe que uma cópia esqueceria é o `p_excluir_id`, sem o qual o lançamento
editado empurraria a si mesmo e deixaria um buraco atrás.

⚠️ **A FUNÇÃO INTERNA NÃO RECEBE `GRANT`, E O TESTE 16 PRECISOU SABER DISSO.**
Ela é chamada de dentro de funções `SECURITY DEFINER`, que a executam como dona
do banco — não precisa de privilégio para o cliente. Exposta ao `authenticated`,
deixaria qualquer um embaralhar a ordem do extrato alheio **sem passar por
checagem de permissão nenhuma**, porque ela não chama `fin_pode()`: quem a chama
já conferiu. O teste 16 (e o porteiro do topo do arquivo) passaram a excluí-la,
como já excluíam a `fin_apagar_dados_da_empresa`.

⚠️ **AS DUAS CONTAS SÃO DIFERENTES, E É ISSO QUE FAZ OS DOIS DESLOCAMENTOS NÃO
SE ATRAPALHAREM.** Se origem e destino fossem a mesma conta, abrir espaço para a
segunda perna empurraria a primeira, recém-inserida. A função já recusava conta
igual (`23514`) desde o degrau 7 — o que era uma regra de negócio virou também a
garantia de correção da ordem.

⚠️ **ORDEM EM BRANCO NÃO É ZERO: É "NO FIM DO DIA".** Os dois parâmetros nascem
`NULL` e, nulos, a perna continua indo para a última posição pela
`fin_proxima_ordem` — o comportamento de sempre. O teste 21 prova os dois
caminhos na mesma execução, para que ninguém "conserte" o `COALESCE` achando que
é sobra.

⚠️ **O AVISO DA TELA REPETE A ORDEM QUE O BANCO GRAVOU, NÃO A QUE A TELA
MANDOU.** A sugestão é lida quando se escolhe a conta e a data; entre ver o
número e clicar em TRANSFERIR, outra pessoa pode ter lançado no mesmo dia. A
função devolve `ordem_origem` e `ordem_destino`, e é isso que a mensagem mostra.
É a mesma razão pela qual o relatório da importação vem do banco, e não da
prévia.

⚠️ **O TESTE 21 USA QUANTIDADES DIFERENTES NAS DUAS CONTAS DE PROPÓSITO.** Três
lançamentos na origem e dois no destino, com a transferência pedindo a ordem 2 na
origem e a 1 no destino. Com quantidades iguais e a mesma posição, uma confusão
entre as contas passaria despercebida — os números bateriam por coincidência.

⚠️ **O UPGRADE FOI ENSAIADO, E NÃO SÓ A INSTALAÇÃO LIMPA.** Montou-se um banco
com o schema do commit anterior (o que está no Supabase hoje), aplicou-se o novo
por cima e rodaram-se os testes: **21/21**. Instalação do zero: **21/21**.
Plataforma: **16/16**. Ensaiar só a instalação limpa esconderia exatamente a
armadilha da sobrecarga descrita acima, porque num banco vazio não há função
antiga para sobrar.

⚠️ **UM SUSTO QUE NÃO ERA DEFEITO, E VALE REGISTRAR.** Na primeira execução no
banco de upgrade, 12 testes falharam com `42501 Sem permissao para gravar contas
movimento`. Não era o código: era o `financeiro_02_seed.sql` que não tinha sido
aplicado naquele banco, e sem a linha do módulo em `platform_modules` a
`fin_pode()` nega tudo. **A mensagem de erro do módulo não diz isso** — ela fala
de permissão, e a causa é o catálogo vazio. Quem vir esse erro numa instalação
nova deve conferir o seed antes de procurar defeito na permissão.

⚠️ **O QUE FOI E O QUE NÃO FOI TESTADO.** Validado aqui: `npm test` (44),
`npm run modulos:verificar`, `tsc --noEmit`, `eslint`, `npm run build` (saída 0,
20 rotas) e os dois arquivos SQL contra o PostgreSQL 18 local, nos dois caminhos
(zero e upgrade). **A tela da transferência não foi aberta num navegador.**

---

**2026-09-14 — v10: o menu à esquerda, os atalhos de mês e a conta que se digita**

Primeira rodada do dia, precedida de um estudo
(`_estudos/estudo-2026-09-14-tres-pedidos.html`) e autorizada com os bônus.
**Exige rodar de novo SÓ o `financeiro_01_schema.sql`** — e só por causa do
bônus B6; os três pedidos, sozinhos, não tocariam o banco.

| Onde | O que mudou |
|---|---|
| `lib/datas.ts` | ✨ `primeiroDiaDoMes`, `ultimoDiaDoMes`, `mesInteiro`, `deslocarMes`, `mesAnterior`, `mesSeguinte`, `rotuloDoMes` e o tipo `PeriodoDoMes` |
| `lib/datas.test.ts` | ✨ 8 testes novos; `npm test` foi de 36 para **44** |
| ✨ `components/financeiro/AtalhosDeMes.tsx` | Os três botões de mês + o rótulo do mês carregado |
| `PainelDeConferencia` | Os atalhos de mês; o `<select>` de CONTA MOVIMENTO virou campo que se digita |
| `FormularioDeLancamento` | O `<select>` de CONTA MOVIMENTO virou campo que se digita |
| `useNovoLancamento` | ✨ `sugerirContasMovimento` e `definirPeriodo` |
| `lancamentos/pesquisar` | Os mesmos atalhos, pelo mesmo componente (uma linha) |
| `PainelDeOpcoes` | `right-0`→`left-0`, `border-l`→`border-r`, ✨ Esc fecha |
| `MolduraFinanceiro` | O botão OPÇÕES foi para a **esquerda**, junto com o painel |
| `IconeFin` | ✨ `mesAnterior`, `mesSeguinte`, `calendario` |
| `globals.css` | ✨ `@keyframes fade-in` — a classe que 10 telas usavam e **não existia** |
| `financeiro_01_schema.sql` 4.4 | As duas funções de busca passaram a filtrar `is_active = true` (RN-06) |
| `teste_financeiro.sql` | ✨ Testes **19 e 20**; foi de 18 para **20 testes** |

⚠️ **`animate-fade-in` ESTAVA ESCRITA EM 10 TELAS E NÃO EXISTIA EM LUGAR
NENHUM.** Medido ao mover o painel de opções: o `globals.css` tinha **15 linhas**
e nenhum `@keyframes`; o Tailwind 4 traz de fábrica só `spin`, `ping`, `pulse` e
`bounce`. Classe utilitária inexistente **não quebra o build e não acusa nada** —
o navegador ignora o nome. As dez telas (painel do módulo, Catraca, cinco telas
de autenticação, menu principal, ajustes globais) apareciam secamente, enquanto
o código prometia um esmaecimento. Agora a animação existe, com
`prefers-reduced-motion` respeitado. **Classe que não faz nada é pior que classe
nenhuma: ensina quem lê a duvidar do que está escrito.**

⚠️ **A BUSCA POR TEXTO DEVOLVIA CADASTRO DESATIVADO — E ISSO CONTRARIAVA A
RN-06, EM PRODUÇÃO, DESDE 13/09.** A regra diz "conta desativada some das listas
de lançamento novo". As **listas** já respeitavam (`listarContasMovimento`
filtra `is_active = true`); as funções `fin_buscar_*`, não. Resultado: o cadastro
desativado **não aparecia ao abrir a lista e aparecia ao digitar o nome**. Pior:
`fin_gravar_lancamento` confere existência, não situação — dava para lançar numa
conta desativada, bastando chegar a ela digitando. Provado no PostgreSQL local:
sem o filtro, o teste 20 devolve `{"ZORRO ATIVA","ZORRO INATIVA"}` e **falha**;
com o filtro, passa. O `ORDER BY c.is_active DESC` ficou de propósito, para o dia
em que o filtro virar parâmetro.

⚠️ **`setMonth(getMonth() - 1)` NÃO VOLTA UM MÊS — ELE PULA.** `new Date(2026, 2,
31)` com `setMonth(-1)` devolve **3 de março**: o JavaScript tenta montar "31 de
fevereiro", não encontra, e transborda três dias para a frente. Nenhum erro é
levantado. Num botão "MÊS ANTERIOR" isso significa que, a partir de um dia 31,
clicar não sai do lugar — e o defeito parece "o botão não funciona". Todo cálculo
de mês em `lib/datas.ts` **ancora no dia 1**, e o último dia vem do `dia 0 do mês
seguinte` (`new Date(ano, mes + 1, 0)`), que acerta 28, 29, 30 e 31 sem tabela
escrita à mão. O teste que prova isso é o primeiro do bloco novo.

⚠️ **O CÁLCULO DE MÊS MORA NO CORE, NÃO NA TELA.** Se morasse no
`PainelDeConferencia`, não haveria como testá-lo sem abrir um navegador — e os
casos que importam (31/03, janeiro virando dezembro, fevereiro bissexto, 1900
não sendo bissexto) são exatamente os que ninguém exercita clicando.

⚠️ **O BOTÃO DE MÊS PARTE DO QUE ESTÁ NA TELA, NÃO DE HOJE.** É isso que faz o
clique repetido andar mês a mês. Partindo sempre de hoje, o segundo clique
devolveria o mesmo mês do primeiro, para sempre. E a referência é a DATA INICIAL,
com a DATA FINAL como rede: quem digita uma e é interrompido não deve receber um
salto que não pediu.

⚠️ **COM PERÍODO PARCIAL, O ATALHO ENTREGA O MÊS INTEIRO** (decisão do dono do
projeto, 14/09/2026). Estando 10/09 a 20/09 na tela, MÊS ANTERIOR devolve 01/08 a
31/08 — não 10/08 a 20/08. Deslocar os mesmos dias exigiria inventar uma resposta
para "31 de fevereiro", e regra de data inventada é defeito que aparece uma vez
por ano.

⚠️ **OS ATALHOS NASCERAM COMPONENTE, E NÃO CÓDIGO SOLTO NA CONFERÊNCIA.** A tela
PESQUISAR tem os mesmos dois campos de data e o mesmo atrito; escritos como
componente, colocá-los lá custou **uma linha**. A segunda cópia de qualquer coisa
é sempre a que esquece um detalhe — o projeto já documenta isso para os menus de
linha.

⚠️ **A FUNÇÃO DE BUSCA DA CONTA MOVIMENTO JÁ EXISTIA E NUNCA TINHA SIDO CHAMADA.**
`fin_buscar_contas_movimento` nasceu no degrau 7, com `LIKE '%texto%'` sobre
`nome_normalizado`, `LIMIT 4` e o par REVOKE+GRANT no lugar — era uma tomada
instalada esperando o aparelho. O pedido de 13/09 ligou só a da categoria. **Ao
estimar trabalho, abrir o arquivo vale mais que confiar na memória:** a estimativa
anotada era "~4 linhas" e o trabalho real foram três mudanças pequenas, em dois
arquivos.

⚠️ **OS DOIS CAMPOS "CONTA MOVIMENTO" DA TELA MUDARAM JUNTOS.** O pedido citava o
do formulário; o da CONFERÊNCIA ficou igual por decisão explícita. Com um só
digitável, a mesma tela teria dois campos de mesmo nome e comportamentos
diferentes — pior que os dois serem antigos, porque ensina uma coisa e cobra
outra.

⚠️ **O BOTÃO OPÇÕES FOI PARA A ESQUERDA JUNTO COM O PAINEL.** Mover só o painel
era a leitura literal do pedido e funcionaria; mas o olho acompanha o dedo, e
clicar num canto para a coisa aparecer no outro cansa em uso diário. **E trocar
`right-0` por `left-0` não basta: a borda também vira** (`border-l` → `border-r`),
senão a linha divisória fica colada na borda da janela, onde ninguém a vê.

⚠️ **O `useEffect` DO ESC FICA ACIMA DO `if (!aberto) return null`.** As regras
dos hooks proíbem chamar `useEffect` depois de um retorno antecipado — a
quantidade de hooks tem de ser a mesma em toda renderização. Quem decide é o `if`
DENTRO do efeito, não a posição dele. A primeira tentativa foi partir o corpo do
componente em uma função declarada após o `return`: funciona em JavaScript e é
ilegível — foi descartada.

⚠️ **O SQL FOI EXECUTADO ANTES DE SER ENTREGUE, INCLUSIVE O TESTE NEGATIVO.**
PostgreSQL 18 local e descartável, com o Supabase falso: plataforma **16/16** e
módulo **20/20**. E, para provar que o teste 20 não é decorativo, o schema foi
reaplicado SEM o filtro novo: o teste falhou, nomeando a conta inativa que
apareceu. Teste que nunca se viu falhar não é teste — é decoração.

⚠️ **O QUE FOI E O QUE NÃO FOI TESTADO.** Validado aqui: `npm test` (44),
`npm run modulos:verificar` (sem violação), `tsc --noEmit` e `eslint` limpos,
`npm run build` com as 9 rotas do módulo, e os dois arquivos SQL contra o
PostgreSQL local. **Nada foi aberto num navegador** — a posição do menu, o
comportamento dos botões e o campo de busca só se provam na tela, e isso é do
dono do projeto.

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

