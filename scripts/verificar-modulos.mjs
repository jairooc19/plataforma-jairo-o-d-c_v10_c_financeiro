#!/usr/bin/env node
/**
 * 🔍 VERIFICADOR DE LEGO — a prova de que módulo e plataforma continuam soltos.
 * Local: scripts/verificar-modulos.mjs
 * Uso:   npm run modulos:verificar
 *
 * ===========================================================================
 * POR QUE ESTE ARQUIVO EXISTE
 * ===========================================================================
 * As regras do `MODULOS.md` ("a plataforma nunca importa módulo", "um módulo
 * nunca importa outro", "módulo não altera tabela da plataforma") são fáceis de
 * escrever e fáceis de quebrar sem perceber. Uma regra que ninguém verifica é
 * uma promessa — e o dia em que a promessa cobra é o pior possível: o dia em
 * que se tenta DESPLUGAR um módulo e se descobre que trinta arquivos o citam.
 *
 * Este script responde a quatro perguntas em segundos:
 *   1. O nome de algum módulo aparece FORA das pastas dele e FORA dos pontos
 *      de solda declarados?                                        (regras R1/R8)
 *   2. Algum módulo importa outro módulo?                                (R3)
 *   3. Algum SQL de módulo mexe em tabela da plataforma?                 (R5)
 *   4. Existe pasta de módulo pela metade (código sem banco, ou vice-versa)?
 *
 * ⚠️ SEM NENHUM MÓDULO INSTALADO ELE PASSA TRIVIALMENTE, e isso é o esperado:
 * é o estado de referência da plataforma, o "Sol sem peças".
 *
 * Sem dependência externa — Node puro, como os testes de `packages/core`.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/* ---------------------------------------------------------------------------
 * CONFIGURAÇÃO — o que é plataforma, o que é solda
 * ------------------------------------------------------------------------- */

/** Pastas que nunca são varridas. */
const IGNORAR_PASTAS = new Set([
  'node_modules', '.git', '.next', '.expo', 'dist', 'build', 'android', 'ios',
  '.vercel', '.turbo', 'coverage',
]);

/**
 * Os PONTOS DE SOLDA: os únicos arquivos da plataforma onde o nome de um
 * módulo pode aparecer. Mantenha em sincronia com o `MODULOS.md`.
 */
const PONTOS_DE_SOLDA = [
  'packages/core/src/modules/registro.ts',
  'packages/core/src/index.ts',
];

/**
 * Documentação: o nome do módulo aparece aqui de propósito (é o mapa, o estudo,
 * o histórico). Não é código, não quebra nada ao desplugar.
 */
const EXTENSOES_DE_DOC = ['.md', '.html', '.txt'];
const PASTAS_DE_DOC = ['_estudos'];

/** Rotas de `app/dashboard/` que pertencem à plataforma, não a módulos. */
const ROTAS_DA_PLATAFORMA = new Set(['settings', 'tenants', 'modulos']);

/** Tabelas do CORE: um SQL de módulo não pode alterá-las (regra R5). */
const TABELAS_DA_PLATAFORMA = [
  'users', 'tenants', 'tenant_members', 'global_settings', 'audit_log',
  'platform_modules', 'tenant_modules',
];

/** Só estes arquivos são lidos na varredura de texto. */
const EXTENSOES_DE_CODIGO = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.sql', '.json'];

/* ---------------------------------------------------------------------------
 * UTILITÁRIOS
 * ------------------------------------------------------------------------- */

const paraPosix = (p) => p.split(sep).join('/');

function listarArquivos(dir, saida = []) {
  for (const nome of readdirSync(dir)) {
    if (IGNORAR_PASTAS.has(nome)) continue;
    const caminho = join(dir, nome);
    const info = statSync(caminho);
    if (info.isDirectory()) listarArquivos(caminho, saida);
    else saida.push(caminho);
  }
  return saida;
}

function listarPastas(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((nome) => {
    if (IGNORAR_PASTAS.has(nome)) return false;
    return statSync(join(dir, nome)).isDirectory();
  });
}

/**
 * O nome do módulo aparece nesta linha como CÓDIGO?
 *
 * ⚠️ NEM TODO CASAMENTO É UMA SOLDA. Um módulo chamado "exemplo" casaria dentro
 * de `voce@exemplo.com`, que é texto de placeholder e não tem relação nenhuma
 * com o módulo. Um verificador que grita nesses casos é desligado pela pessoa
 * na terceira vez — e um verificador desligado não protege nada. Por isso as
 * ocorrências dentro de e-mail e de domínio são descartadas.
 */
function citaModulo(linha, id) {
  const busca = new RegExp(`\\b${id}\\b`, 'gi');
  let achado;
  while ((achado = busca.exec(linha)) !== null) {
    const anterior = linha[achado.index - 1] ?? '';
    const seguinte = linha.slice(achado.index + id.length);
    if (anterior === '@') continue;                       // voce@exemplo.com
    if (seguinte.startsWith('@')) continue;               // financeiro@empresa.com
    if (/^\.(com|com\.br|br|org|net|io|dev)\b/i.test(seguinte)) continue;  // exemplo.com
    return true;
  }
  return false;
}

const PREFIXOS_DE_COMENTARIO = ['//', '*', '/*', '--', '#'];
const ehComentario = (linha) => {
  const limpa = linha.trim();
  return PREFIXOS_DE_COMENTARIO.some((pre) => limpa.startsWith(pre));
};

const ehDoc = (rel) =>
  EXTENSOES_DE_DOC.some((ext) => rel.endsWith(ext)) ||
  PASTAS_DE_DOC.some((pasta) => rel.startsWith(`${pasta}/`));

/* ---------------------------------------------------------------------------
 * 1. QUAIS MÓDULOS EXISTEM
 * ------------------------------------------------------------------------- */

function descobrirModulos() {
  const noCore = listarPastas(join(RAIZ, 'packages/core/src/modules'));
  const noBanco = listarPastas(join(RAIZ, 'supabase'))
    .filter((nome) => nome.startsWith('criar-bd-'))
    .map((nome) => nome.replace('criar-bd-', ''));

  return { noCore, noBanco, todos: [...new Set([...noCore, ...noBanco])].sort() };
}

/** As pastas e arquivos que pertencem legitimamente a um módulo. */
function territorioDoModulo(id) {
  return [
    `apps/admin-web/src/app/dashboard/${id}/`,
    `apps/admin-web/src/components/${id}/`,
    `apps/mobile-app/src/modules/${id}/`,
    // 19/09/2026 (degrau 08): AS ROTAS DO MÓDULO NO APLICATIVO.
    //
    // ⚠️ Ela é a irmã de `apps/admin-web/src/app/dashboard/${id}/`, lá em cima, e
    // existe pelo mesmo motivo: no Expo Router, como no App Router do Next, **rota
    // é arquivo** — o que não está em `app/` não existe para o roteador. Sem esta
    // linha, a porta do módulo no telefone seria acusada como violação R1/R8, e a
    // acusação estaria formalmente certa e praticamente errada.
    //
    // ⚠️ E A ALTERNATIVA ERA PIOR. Uma rota genérica da plataforma
    // (`app/modulo/[id].tsx`) precisaria IMPORTAR o código do módulo para desenhar
    // a tela — o que quebra a regra R1 de verdade, e volta a grudar as peças.
    //
    // ⚠️ NENHUM NOME DE MÓDULO É ESCRITO AQUI: o `${id}` chega por parâmetro, como
    // em todas as outras linhas desta lista.
    `apps/mobile-app/app/${id}/`,
    `packages/core/src/modules/${id}/`,
    `supabase/criar-bd-${id}/`,
    `supabase/testes/teste_${id}.sql`,
    // 16/09/2026: o inventário do módulo — irmão do `inventario.sql` da
    // plataforma. Ele CITA o id do módulo de propósito (a linha de
    // `platform_modules` é metade do que ele confere), então precisa estar no
    // território — como o `teste_${id}.sql` sempre esteve, e pelo mesmo motivo.
    `supabase/testes/inventario_${id}.sql`,
    `_estudos/${id}/`,
  ];
}

/* ---------------------------------------------------------------------------
 * VERIFICAÇÃO
 * ------------------------------------------------------------------------- */

const problemas = [];
const avisos = [];

const { noCore, noBanco, todos: modulos } = descobrirModulos();

// 4. Módulo pela metade
for (const id of modulos) {
  if (!noCore.includes(id)) {
    avisos.push(`Módulo "${id}" tem banco (supabase/criar-bd-${id}/) mas não tem código em packages/core/src/modules/${id}/.`);
  }
  if (!noBanco.includes(id)) {
    avisos.push(`Módulo "${id}" tem código mas não tem banco (falta supabase/criar-bd-${id}/).`);
  }
}

const arquivos = listarFontes();

function listarFontes() {
  const alvos = ['apps', 'packages', 'supabase', 'scripts'];
  const lista = [];
  for (const alvo of alvos) {
    const dir = join(RAIZ, alvo);
    if (existsSync(dir)) listarArquivos(dir, lista);
  }
  return lista
    .map((abs) => ({ abs, rel: paraPosix(relative(RAIZ, abs)) }))
    .filter(({ rel }) => EXTENSOES_DE_CODIGO.some((ext) => rel.endsWith(ext)));
}

// 1. Nome de módulo fora do território e fora das soldas
for (const id of modulos) {
  const territorio = territorioDoModulo(id);

  for (const { abs, rel } of arquivos) {
    if (ehDoc(rel)) continue;
    if (PONTOS_DE_SOLDA.includes(rel)) continue;
    if (territorio.some((t) => rel.startsWith(t) || rel === t)) continue;

    const linhas = readFileSync(abs, 'utf8').split('\n');
    linhas.forEach((linha, i) => {
      // ⚠️ COMENTÁRIO NÃO É SOLDA. Um TSDoc que menciona o módulo (como o
      // `lib/dinheiro.ts`, que diz ter sido escrito para o C FINANCEIRO) não
      // quebra nada quando o módulo sai. Reclamar dele treinaria a pessoa a
      // ignorar o verificador — e verificador ignorado é pior que nenhum.
      if (ehComentario(linha)) return;
      if (citaModulo(linha, id)) {
        problemas.push(`R1/R8 · ${rel}:${i + 1} cita o módulo "${id}" fora do território dele e fora dos pontos de solda.\n        ${linha.trim().slice(0, 120)}`);
      }
    });
  }
}

// 2. Módulo importando outro módulo
for (const id of modulos) {
  const outros = modulos.filter((m) => m !== id);
  if (outros.length === 0) continue;

  const doModulo = arquivos.filter(({ rel }) =>
    territorioDoModulo(id).some((t) => rel.startsWith(t) || rel === t)
  );

  for (const { abs, rel } of doModulo) {
    const texto = readFileSync(abs, 'utf8');
    for (const outro of outros) {
      const importa = new RegExp(`(import|require)[^\\n]*modules/${outro}\\b`);
      if (importa.test(texto)) {
        problemas.push(`R3 · ${rel} importa o módulo "${outro}". Módulo não conhece módulo — o que os dois precisam sobe para a plataforma.`);
      }
    }
  }
}

// 3. SQL de módulo mexendo em tabela da plataforma
for (const id of modulos) {
  const sqls = arquivos.filter(({ rel }) => rel.startsWith(`supabase/criar-bd-${id}/`) && rel.endsWith('.sql'));

  for (const { abs, rel } of sqls) {
    const linhas = readFileSync(abs, 'utf8').split('\n');
    linhas.forEach((linha, i) => {
      const limpa = linha.trim();
      if (limpa.startsWith('--')) return;
      for (const tabela of TABELAS_DA_PLATAFORMA) {
        const mexe = new RegExp(`(ALTER|DROP)\\s+TABLE\\s+(IF\\s+EXISTS\\s+)?(public\\.)?${tabela}\\b`, 'i');
        if (mexe.test(limpa)) {
          problemas.push(`R5 · ${rel}:${i + 1} altera a tabela da plataforma "${tabela}". Módulo cria as próprias tabelas e aponta para a plataforma por chave estrangeira.\n        ${limpa.slice(0, 120)}`);
        }
      }
    });
  }
}

// Extra: pasta de rota no dashboard que não é da plataforma nem de módulo conhecido
const rotas = listarPastas(join(RAIZ, 'apps/admin-web/src/app/dashboard'));
for (const rota of rotas) {
  if (ROTAS_DA_PLATAFORMA.has(rota)) continue;
  if (modulos.includes(rota)) continue;
  avisos.push(`A rota /dashboard/${rota} não é uma rota conhecida da plataforma nem um módulo instalado. Se for de módulo, crie packages/core/src/modules/${rota}/; se for da plataforma, declare-a em ROTAS_DA_PLATAFORMA neste script.`);
}

// Extra: os pontos de solda declarados existem?
for (const solda of PONTOS_DE_SOLDA) {
  if (!existsSync(join(RAIZ, solda))) {
    problemas.push(`R8 · o ponto de solda "${solda}" não existe. O MODULOS.md e este script estão desatualizados.`);
  }
}

/* ---------------------------------------------------------------------------
 * RELATÓRIO
 * ------------------------------------------------------------------------- */

console.log('');
console.log('🔍 VERIFICADOR DE LEGO — Plataforma Jairo O D C');
console.log('─'.repeat(70));
console.log(`Módulos instalados: ${modulos.length === 0 ? 'nenhum (o Sol sem peças — estado de referência)' : modulos.join(', ')}`);
console.log(`Arquivos de código varridos: ${arquivos.length}`);
console.log('');

if (avisos.length > 0) {
  console.log(`⚠️  ${avisos.length} aviso(s):`);
  avisos.forEach((a) => console.log(`   • ${a}`));
  console.log('');
}

if (problemas.length > 0) {
  console.log(`❌ ${problemas.length} violação(ões) das regras do MODULOS.md:`);
  problemas.forEach((p) => console.log(`   • ${p}`));
  console.log('');
  console.log('A plataforma e os módulos estão grudados. Corrija antes de seguir.');
  process.exit(1);
}

console.log('✅ Nenhuma violação. Plataforma e módulos continuam soltos.');
console.log('');
process.exit(0);
