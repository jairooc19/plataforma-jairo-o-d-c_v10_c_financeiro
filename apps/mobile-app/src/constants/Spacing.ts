/**
 * 📏 GRADE DE ESPAÇAMENTO (PJODC v10)
 * Local: apps/mobile-app/src/constants/Spacing.ts
 *
 * v9: [100% NATIVO — TOKEN]
 *
 * Uma grade de 8 pontos, que é a mesma do Material Design e a mesma que o
 * layout do iOS assume. Antes desta refatoração o app tinha margens de 4, 6, 8,
 * 10, 12, 14, 16, 18, 20, 22, 24, 25, 28 e 40 pontos convivendo — quatorze
 * valores para uma dimensão que precisa de seis.
 *
 * 🎯 POR QUE 8 E NÃO 10. Densidades de tela em Android são múltiplos de 0,5
 * (mdpi 1x, hdpi 1,5x, xhdpi 2x, xxhdpi 3x). Um valor par sobrevive a todas
 * essas multiplicações caindo em pixel inteiro; 10 × 1,5 = 15 também, mas
 * 5 × 1,5 = 7,5 arredonda, e meia-unidade de erro repetida ao longo de uma
 * coluna é o que produz aquela borda que parece mais grossa de um lado.
 *
 * ⚠️ `xs` É O ÚNICO VALOR FORA DA GRADE (4pt = meio degrau), e existe porque a
 * folga entre um ícone e o texto ao lado dele não é espaçamento de layout — é
 * ajuste ótico, e 8pt ali abre um buraco visível. Não use `xs` para separar
 * blocos: se a distância entre duas coisas é 4pt, elas são uma coisa só.
 */
export const ESPACO = {
  /** 4 — folga ótica entre ícone e texto. Nunca entre blocos. */
  xs: 4,
  /** 8 — dentro de um componente. */
  sm: 8,
  /** 12 — entre elementos irmãos de um cartão. */
  md: 12,
  /** 16 — a margem lateral padrão de toda tela. */
  lg: 16,
  /** 24 — entre blocos de assunto diferente. */
  xl: 24,
  /** 32 — antes de um título de seção novo. */
  xxl: 32,
  /** 48 — respiro final do conteúdo, acima da barra de abas. */
  xxxl: 48,
} as const;

/**
 * 👆 ALVOS DE TOQUE MÍNIMOS.
 *
 * ⚠️ AS DUAS PLATAFORMAS PEDEM MEDIDAS DIFERENTES — 44pt no HIG do iOS, 48dp no
 * Material — e a resposta certa não é escolher uma: é usar o maior, porque um
 * alvo grande demais não incomoda ninguém e um alvo pequeno demais faz o usuário
 * errar o botão. Por isso `minimo` é 48, não 44.
 *
 * 🎚️ AS TRÊS ALTURAS DE CONTROLE existem para a hierarquia da tela, não para o
 * gosto de quem monta: `grande` é a ação principal (um por tela), `medio` é o
 * padrão, `pequeno` é ação secundária dentro de uma linha. Um formulário com
 * três botões `grande` não tem ação principal nenhuma.
 */
export const TOQUE = {
  /** O piso absoluto. Nada tocável pode ser menor que isto. */
  minimo: 48,
  pequeno: 40,
  medio: 48,
  grande: 56,
} as const;

/**
 * 🎯 TAMANHOS DE ÍCONE.
 *
 * A refatoração pôs o ícone como elemento principal da interface, então ele
 * também precisa de escala — um ícone de 24pt ao lado de um de 26pt na mesma
 * lista lê-se como desalinhamento, não como variedade.
 *
 * ⚠️ `destaque` (32) É O ÍCONE DO `MenuCard`, e é ele que carrega o
 * reconhecimento da linha: num cartão de menu o usuário encontra a opção pelo
 * desenho antes de ler o rótulo. Encolhê-lo para 24 devolve o cartão à condição
 * de item de lista com uma decoração ao lado.
 */
export const ICONE = {
  /** 16 — dentro de texto corrido, ao lado de uma legenda. */
  mini: 16,
  /** 20 — dentro de um botão. */
  pequeno: 20,
  /** 24 — barra de topo, ação de cabeçalho. */
  medio: 24,
  /** 32 — o ícone que identifica um cartão de menu. */
  destaque: 32,
  /** 40 — avatar de perfil, estado vazio. */
  grande: 40,
} as const;

/**
 * 🔵 RAIOS QUE NÃO DEPENDEM DA PLATAFORMA.
 *
 * ⚠️ CARTÃO, BOTÃO E CAMPO NÃO ESTÃO AQUI — eles vivem em `PLATFORM` (ver
 * `Colors.ts`), porque o iOS e o Material genuinamente discordam sobre quanto
 * arredondar um contêiner. O que está aqui são as formas que NÃO discordam:
 * um círculo é um círculo nos dois sistemas.
 */
export const RAIO = {
  /** Selo, etiqueta, contador. */
  selo: 6,
  /** Pílula: metade da altura, para o raio acompanhar qualquer altura. */
  pilula: 999,
  /** Circular — avatar, ponto de estado, botão de ícone. */
  circulo: 999,
} as const;

/**
 * ⏱️ DURAÇÕES DE ANIMAÇÃO, em milissegundos.
 *
 * ⚠️ NADA PASSA DE 320ms, E ISSO É REGRA, não preferência. Acima de ~300ms o
 * usuário deixa de perceber a animação como resposta ao seu toque e passa a
 * percebê-la como espera — o app fica "bonito e lento", que é pior do que
 * instantâneo e seco. As transições do próprio iOS ficam entre 200 e 350ms, e a
 * do Material entre 150 e 300ms.
 *
 * `tema` é a exceção alta (320ms) porque interpolação de COR é a única coisa
 * aqui que não move nada na tela: sem deslocamento não há sensação de espera, e
 * uma troca de paleta rápida demais parece um piscar defeituoso.
 */
export const DURACAO = {
  /** Retorno de toque, mudança de estado num controle. */
  instantanea: 120,
  /** Entrada de elemento, aparecimento de mensagem. */
  rapida: 180,
  /** Transição entre conteúdos. */
  media: 240,
  /** Interpolação do tema white-label. */
  tema: 320,
} as const;

/**
 * 🎞️ ATRASO ENTRE ITENS DE UMA ENTRADA ESCALONADA.
 *
 * ⚠️ MULTIPLIQUE COM PARCIMÔNIA. Com 50ms por item, uma lista de dez cartões
 * demora meio segundo até o último aparecer — e o décimo item de uma lista não
 * é dez vezes menos importante que o primeiro, ele só está mais abaixo. Por
 * isso as telas desta refatoração escalonam no máximo os seis primeiros e
 * entregam o resto junto.
 */
export const ESCALONAMENTO = 50;
