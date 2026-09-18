#!/usr/bin/env node
/**
 * 🎭 O ENSAIO GERAL — todas as provas do projeto, num comando só
 * Local: scripts/ensaio-geral.mjs   ·   Rode com: `npm run ensaio`
 *
 * ===========================================================================
 * POR QUE ELE EXISTE (18/09/2026)
 * ===========================================================================
 * Antes dele, entregar uma rodada exigia SEIS comandos rodados à mão, sempre na
 * mesma ordem, e um deles (o banco descartável) tinha nove passos próprios
 * escritos numa folha de instruções. Era o que mais tomava tempo em todas as
 * rodadas — e, por ser manual, era também o mais fácil de pular na pressa.
 *
 * ⚠️ E ELE FAZ UMA COISA QUE NENHUM DOS SEIS FAZIA SOZINHO: **o ensaio de
 * UPGRADE**. Instalar num banco vazio não prova nada sobre um banco que já
 * existe — e é exatamente aí que mora a armadilha mais cara deste projeto:
 * `CREATE OR REPLACE FUNCTION` com lista de parâmetros diferente NÃO substitui,
 * cria uma SOBRECARGA, e a versão velha continua viva com o GRANT que o arquivo
 * lhe deu. Já aconteceu três vezes. Aqui o passo 6 monta o banco com o schema
 * do ÚLTIMO COMMIT e aplica o de agora por cima, que é o que o dono do projeto
 * faz no Supabase dele.
 *
 * ===========================================================================
 * ⚠️ ELE NÃO CITA O NOME DE MÓDULO NENHUM, E ISSO É REGRA
 * ===========================================================================
 * Este arquivo é da PLATAFORMA (`scripts/` não tem nome de módulo), e o
 * `npm run modulos:verificar` varre `.mjs`. Ele DESCOBRE os módulos instalados
 * varrendo as pastas `supabase/criar-bd-<nome>`, nunca escrevendo um nome.
 * Plugue um segundo módulo amanhã e ele entra no ensaio sozinho.
 *
 * ⚠️ CURINGA DE CAMINHO NÃO ENTRA EM COMENTÁRIO DE BLOCO. A primeira versão do
 * parágrafo acima escrevia a pasta com asterisco e barra no fim — e esse par de
 * caracteres FECHA o comentário. O arquivo inteiro virou erro de sintaxe, e o
 * Node apontou a linha 50, a trinta linhas de distância da causa.
 *
 * O que ele NÃO prova: GoTrue (login, OAuth), PostgREST e as configurações de
 * painel do Supabase. Isso continua sendo o teste do sistema publicado.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PORTA = '55432';
const etapas = [];

const so = (txt) => txt.replace(/\s+/g, ' ').trim();

function registrar(nome, ok, detalhe) {
  etapas.push({ nome, ok, detalhe: so(detalhe ?? '') });
  const marca = ok === true ? '✅' : ok === null ? '⏭️ ' : '❌';
  console.log(`${marca} ${nome}${detalhe ? ` — ${so(detalhe)}` : ''}`);
}

/**
 * ⚠️ O `shell` SÓ ENTRA PARA COMANDO DE NOME CURTO (`npm`, `git`), porque no
 * Windows o `npm` é um `.cmd` e sem shell não é encontrado.
 *
 * ⚠️ E ELE TEM DE FICAR **FORA** DOS CAMINHOS ABSOLUTOS, que é onde mora o
 * PostgreSQL: "C:Program FilesPostgreSQL8ininitdb" tem UM ESPAÇO no
 * meio, e com `shell: true` o Windows quebra a linha nesse espaço e tenta rodar
 * "C:Program". O sintoma é mudo: `initdb falhou`, sem dizer por quê — medido em
 * 18/09/2026, na primeira execução deste arquivo.
 */
function rodar(cmd, args, opcoes = {}) {
  return spawnSync(cmd, args, {
    cwd: RAIZ,
    encoding: 'utf8',
    shell: process.platform === 'win32' && !path.isAbsolute(cmd),
    ...opcoes,
  });
}

// ---------------------------------------------------------------------------
// 1 a 4 — as provas de código
// ---------------------------------------------------------------------------
function provasDeCodigo() {
  const passos = [
    ['TESTES DO CORE (npm test)', ['run', 'test'], (r) => {
      const m = r.stdout.match(/# pass (\d+)[\s\S]*?# fail (\d+)/)
             ?? r.stdout.match(/pass (\d+)[\s\S]*?fail (\d+)/);
      return m ? `${m[1]} passaram, ${m[2]} falharam` : '';
    }],
    ['VERIFICADOR DE LEGO', ['run', 'modulos:verificar'], (r) =>
      (r.stdout.match(/Nenhuma violação[^\n]*/) ?? [''])[0]],
    ['LINT DO ADMIN-WEB', ['run', 'lint:web'], () => ''],
    ['BUILD DO ADMIN-WEB', ['run', 'build:web'], (r) => {
      const rotas = (r.stdout.match(/^[├└┌]\s+[ƒ○●]\s+\//gm) ?? []).length;
      return rotas ? `${rotas} rota(s)` : '';
    }],
  ];

  for (const [nome, args, resumo] of passos) {
    const r = rodar('npm', args);
    registrar(nome, r.status === 0, r.status === 0 ? resumo(r) : `saiu com código ${r.status}`);
  }
}

// ---------------------------------------------------------------------------
// 5 e 6 — o banco descartável
// ---------------------------------------------------------------------------
function acharPostgres() {
  if (process.env.PGBIN && fs.existsSync(process.env.PGBIN)) return process.env.PGBIN;
  const candidatos = [];
  for (const base of ['C:/Program Files/PostgreSQL', '/usr/lib/postgresql']) {
    if (!fs.existsSync(base)) continue;
    for (const v of fs.readdirSync(base)) {
      const bin = path.join(base, v, 'bin');
      if (fs.existsSync(bin)) candidatos.push(bin);
    }
  }
  // a versão mais alta primeiro
  return candidatos.sort().pop() ?? null;
}

/** Os módulos plugados, descobertos pela pasta — nunca pelo nome. */
function modulosInstalados() {
  const base = path.join(RAIZ, 'supabase');
  return fs.readdirSync(base)
    .filter((d) => d.startsWith('criar-bd-') && fs.statSync(path.join(base, d)).isDirectory())
    .map((d) => ({ pasta: `supabase/${d}`, nome: d.replace('criar-bd-', '') }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

/** Os arquivos de schema e seed, na ordem de aplicação: plataforma e depois os módulos. */
function arquivosDeInstalacao() {
  const lista = [
    'supabase/criar-bd/plataforma_01_schema.sql',
    'supabase/criar-bd/plataforma_02_seed.sql',
  ];
  for (const m of modulosInstalados()) {
    for (const sufixo of ['_01_schema.sql', '_02_seed.sql']) {
      const rel = `${m.pasta}/${m.nome}${sufixo}`;
      if (fs.existsSync(path.join(RAIZ, rel))) lista.push(rel);
    }
  }
  return lista;
}

function psql(bin, banco, args) {
  return rodar(path.join(bin, 'psql'), ['-h', 'localhost', '-p', PORTA, '-U', 'postgres', '-d', banco, ...args]);
}

function aplicar(bin, banco, arquivos, prefixo = RAIZ) {
  for (const rel of arquivos) {
    const cheio = path.isAbsolute(rel) ? rel : path.join(prefixo, rel);
    const r = psql(bin, banco, ['-q', '-v', 'ON_ERROR_STOP=1', '-f', cheio]);
    if (r.status !== 0) return { ok: false, onde: rel, erro: (r.stderr || '').slice(-400) };
  }
  return { ok: true };
}

/** Roda um arquivo de provas e conta os vereditos que ele imprime. */
function contarVereditos(bin, banco, rel) {
  const r = psql(bin, banco, ['-f', path.join(RAIZ, rel)]);
  const saida = `${r.stdout}\n${r.stderr}`;
  const conta = (p) => (saida.match(p) ?? []).length;
  /**
   * ⚠️ O VEREDITO DO INVENTÁRIO É A ÚLTIMA COLUNA DA TABELA, e por isso a linha
   * termina em "| OK" — sem barra depois. A primeira versão deste arquivo
   * procurava "| OK |" e achava ZERO em toda linha: o ensaio acusava os dois
   * inventários como se tivessem estourado, quando os dois estavam perfeitos.
   *
   * ⚠️ E É POR ISSO QUE CONTAGEM ZERO É TRATADA COMO FALHA, nunca como sucesso:
   * um arquivo de prova que não imprime veredito nenhum ou estourou antes do
   * SELECT final, ou está sendo lido errado. Nos dois casos, a resposta honesta
   * é vermelho — "não sei" não é "passou".
   */
  const bons = conta(/\bPASSOU\b/g) + conta(/\|\s*OK\s*$/gm);
  const maus = conta(/\bFALHOU\b/g) + conta(/\|\s*DIVERGE\s*$/gm);
  return { bons, maus, vazio: bons + maus === 0 };
}

function provasDeBanco() {
  const bin = acharPostgres();
  if (!bin) {
    registrar('BANCO DESCARTÁVEL', null, 'PostgreSQL não encontrado — passos 5 e 6 pulados (defina PGBIN)');
    return;
  }

  const dados = path.join(os.tmpdir(), 'pjodc-ensaio-pg');
  fs.rmSync(dados, { recursive: true, force: true });

  const ini = rodar(path.join(bin, 'initdb'), ['-D', dados, '-U', 'postgres', '--auth=trust', '-E', 'UTF8']);
  if (ini.status !== 0) { registrar('BANCO DESCARTÁVEL', false, 'initdb falhou'); return; }

  /**
   * ⚠️ O `stdio: 'ignore'` AQUI É O QUE FAZ ESTA LINHA VOLTAR. Medido em
   * 18/09/2026: com a saída capturada em `pipe` (o padrão do `spawnSync`), o
   * SERVIDOR que o `pg_ctl` deixa de pé HERDA esse pipe — e o `spawnSync` só
   * retorna quando o pipe fecha, ou seja, quando o servidor MORRE. O `pg_ctl`
   * já tinha terminado; o script ficou parado quinze minutos com o banco no ar
   * e zero por cento de CPU, sem mensagem de erro nenhuma.
   *
   * Sem pipe não há o que esperar. A saída do servidor já vai para o `-l`
   * (o `log.txt` dentro da pasta de dados), que é onde ela serve para alguma
   * coisa.
   */
  const sobe = rodar(path.join(bin, 'pg_ctl'),
    ['-D', dados, '-o', `-p ${PORTA}`, '-l', path.join(dados, 'log.txt'), '-w', 'start'],
    { stdio: 'ignore' });
  if (sobe.status !== 0) { registrar('BANCO DESCARTÁVEL', false, 'pg_ctl start falhou'); return; }

  try {
    const falso = 'supabase/testes/ambiente-local/00_supabase_falso.sql';

    // ---- 5. INSTALAÇÃO LIMPA + as provas ----
    psql(bin, 'postgres', ['-q', '-c', 'DROP DATABASE IF EXISTS pjodc_ensaio;', '-c', 'CREATE DATABASE pjodc_ensaio;']);
    const limpa = aplicar(bin, 'pjodc_ensaio', [falso, ...arquivosDeInstalacao()]);
    registrar('INSTALAÇÃO LIMPA DO SQL', limpa.ok,
      limpa.ok ? `${arquivosDeInstalacao().length} arquivo(s) aplicados` : `parou em ${limpa.onde}: ${limpa.erro}`);

    if (limpa.ok) {
      const provas = fs.readdirSync(path.join(RAIZ, 'supabase/testes'))
        .filter((f) => f.endsWith('.sql') && (f.startsWith('teste_') || f.startsWith('inventario')))
        .sort();
      for (const f of provas) {
        const { bons, maus, vazio } = contarVereditos(bin, 'pjodc_ensaio', `supabase/testes/${f}`);
        registrar(`PROVA ${f}`, !vazio && maus === 0,
          vazio ? 'não imprimiu veredito nenhum (o arquivo estourou antes do SELECT final?)'
                : `${bons} ok, ${maus} com problema`);
      }
    }

    // ---- 6. ENSAIO DE UPGRADE: o schema do último commit, e o de agora por cima ----
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pjodc-head-'));
    const antigos = [];
    let faltou = false;
    for (const rel of [falso, ...arquivosDeInstalacao()]) {
      const g = rodar('git', ['show', `HEAD:${rel}`], { maxBuffer: 64 * 1024 * 1024 });
      if (g.status !== 0) { faltou = true; continue; }   // arquivo novo neste commit
      const destino = path.join(temp, rel.replace(/[/\\]/g, '__'));
      fs.writeFileSync(destino, g.stdout);
      antigos.push(destino);
    }

    psql(bin, 'postgres', ['-q', '-c', 'DROP DATABASE IF EXISTS pjodc_upgrade;', '-c', 'CREATE DATABASE pjodc_upgrade;']);
    const velho = aplicar(bin, 'pjodc_upgrade', antigos, temp);
    if (!velho.ok) {
      registrar('ENSAIO DE UPGRADE', false, `o schema do último commit não aplicou: ${velho.erro}`);
    } else {
      const novo = aplicar(bin, 'pjodc_upgrade', [falso, ...arquivosDeInstalacao()]);
      if (!novo.ok) {
        registrar('ENSAIO DE UPGRADE', false, `aplicar o schema de agora por cima falhou em ${novo.onde}: ${novo.erro}`);
      } else {
        // ⚠️ O INVENTÁRIO É QUEM PEGA A SOBRECARGA. Ele conta as funções e
        // compara a lista de ASSINATURAS — contar sozinho não pega a função que
        // mudou de FORMA sem mudar o total.
        let bons = 0, maus = 0;
        for (const f of fs.readdirSync(path.join(RAIZ, 'supabase/testes')).filter((f) => f.startsWith('inventario'))) {
          const r = contarVereditos(bin, 'pjodc_upgrade', `supabase/testes/${f}`);
          bons += r.bons; maus += r.maus;
        }
        registrar('ENSAIO DE UPGRADE (schema do commit anterior + o de agora)', maus === 0,
          `${bons} ok, ${maus} divergindo${faltou ? ' · algum arquivo é novo neste commit e não existia no HEAD' : ''}`);
      }
    }
    fs.rmSync(temp, { recursive: true, force: true });
  } finally {
    rodar(path.join(bin, 'pg_ctl'), ['-D', dados, '-m', 'fast', '-w', 'stop'], { stdio: 'ignore' });
    fs.rmSync(dados, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
console.log('\n🎭 ENSAIO GERAL — Plataforma Jairo O D C');
console.log('─'.repeat(70));
console.log(`Módulos encontrados: ${modulosInstalados().map((m) => m.nome).join(', ') || '(nenhum)'}\n`);

provasDeCodigo();
provasDeBanco();

const falhas = etapas.filter((e) => e.ok === false);
const pulados = etapas.filter((e) => e.ok === null);
console.log('─'.repeat(70));
if (falhas.length === 0) {
  console.log(`✅ ENSAIO GERAL COMPLETO: ${etapas.length - pulados.length} prova(s) passaram${
    pulados.length ? `, ${pulados.length} pulada(s)` : ''}.`);
  process.exit(0);
}
console.log(`❌ ${falhas.length} PROVA(S) FALHARAM:`);
for (const f of falhas) console.log(`   · ${f.nome} — ${f.detalhe}`);
process.exit(1);
