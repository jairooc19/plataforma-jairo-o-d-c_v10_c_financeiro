import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { agruparEmBlocos, rotuloDoMes, type LinhaDoDinheiro } from '@jairo/core';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';
import Button from '@/components/button/Button';

import { useContextoFin } from './useContextoFin';
import { useDinheiroDoPeriodo } from './useDinheiroDoPeriodo';
import SeletorDeCompetencia from './SeletorDeCompetencia';
import SeletorDeExibicao from './SeletorDeExibicao';
import BarraDeConsumo from './BarraDeConsumo';
import IconeFin from './IconeFin';
import { estilosFin as e } from './estilos';

/**
 * 💵 TELA: DINHEIRO DO PERÍODO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/DinheiroDoPeriodoScreen.tsx
 *
 * A primeira tela de módulo do aplicativo (degrau 08, 19/09/2026). O orçado contra o
 * realizado da competência, em barras, na ordem RECEITAS → DESPESAS → RESULTADO →
 * OUTRAS, e no fim o bloco do gasto que ninguém planejou.
 *
 * ⚠️ NENHUM NÚMERO É CALCULADO AQUI. Tudo vem pronto de `fin_dinheiro_do_periodo`,
 * e o agrupamento em blocos é do `orcamentoRegras.ts`, no Core, com teste. É isso
 * que faz o telefone e o site mostrarem o MESMO número.
 *
 * ⚠️ A TELA NÃO ESCONDE VALOR DE NINGUÉM. No modo do banco ("só percentual" marcado
 * pelo Proprietário), os valores chegam NULOS — não há nada aqui filtrando. O botão
 * de alternância é outra coisa: é a pessoa escolhendo, para si, como quer ler o que
 * já é dela. Ver `BotaoModoExibicao.tsx`.
 *
 * ⚠️ NÃO HÁ BOTÃO DE IMPRIMIR, e a ausência é deliberada. No site ele abre uma guia e
 * monta um A4; no telefone isso não existe da mesma forma, e um botão que faz outra
 * coisa com o mesmo nome é pior do que botão nenhum.
 *
 * ✍️ TOCAR NUMA CONTA ABRE O LANÇAMENTO desde 19/09/2026 — este parágrafo dizia o
 * contrário ("fica para a parte 2") até o dono do projeto pedir a função no mesmo dia.
 * A tela é a `LancarScreen`, e o toque leva conta e competência por parâmetro.
 */
export default function DinheiroDoPeriodoScreen() {
  const ctx = useContextoFin();
  const d = useDinheiroDoPeriodo(ctx.tenantId);
  const router = useRouter();

  /**
   * ✍️ TOCAR NUMA CONTA ABRE O LANÇAMENTO (19/09/2026).
   *
   * ⚠️ O RESULTADO NÃO É TOCÁVEL, e não é esquecimento: aquele bloco é uma CONTA
   * calculada (receitas planejadas menos despesas planejadas), não uma conta
   * identificadora onde se possa lançar. Ele chega com `conta_id` nulo, e a guarda
   * abaixo cobre os dois casos de uma vez.
   *
   * ⚠️ O BLOCO "FORA" **É** TOCÁVEL, de propósito. São contas reais que tiveram
   * movimento sem orçamento — lançar nelas é legítimo, e muitas vezes é justamente
   * o que a pessoa quer fazer ao ver um gasto imprevisto.
   */
  const abrirLancamento = useCallback(
    (linha: LinhaDoDinheiro) => {
      if (!linha.conta_id || linha.bloco === 'RESULTADO') return;
      router.push({
        pathname: '/financeiro/lancar',
        params: { conta: linha.conta_id, competencia: d.competencia },
      } as never);
    },
    [router, d.competencia],
  );

  // ─── Estados que substituem a tela inteira ──────────────────────────────
  if (ctx.carregando) return <Girando />;
  if (ctx.erro) return <Recado texto={ctx.erro} />;

  /**
   * ⚠️ A PERMISSÃO É CONFERIDA DE NOVO NO BANCO, dentro de `fin_config_dinheiro`,
   * que estoura `42501`. Esta checagem aqui existe só para a pessoa ler uma frase em
   * português em vez de um código de erro — ela não é o que protege o dado.
   */
  if (!ctx.pode('dp_ver')) {
    return (
      <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA VER O DINHEIRO DO PERÍODO. FALE COM O PROPRIETÁRIO DA EMPRESA." />
    );
  }

  const blocos = agruparEmBlocos(d.linhas);

  return (
    <SafeAreaView style={e.tela} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={e.conteudo}
        showsVerticalScrollIndicator={false}
        /*
          🎁 ARRASTAR PARA RECARREGAR (bónus B5). No telefone este é O gesto de
          recarregar — quem usa telefone tenta antes de procurar botão.
        */
        refreshControl={
          <RefreshControl
            refreshing={d.recarregando}
            onRefresh={d.recarregar}
            colors={[BRAND.primary]}
            tintColor={BRAND.primary}
          />
        }
      >
        {/*
          ⚠️ O TÍTULO DA TELA SAIU DAQUI EM 19/09/2026. A moldura do módulo já
          desenha "DINHEIRO DO PERÍODO" no cabeçalho NATIVO, e repeti-lo no corpo
          gastava duas linhas dizendo duas vezes a mesma coisa — visível numa
          captura de tela do dono do projeto, com os dois títulos empilhados.

          🎁 A EMPRESA ATIVA FICA (bónus B6). No telemóvel ela SOBREVIVE a fechar o
          aplicativo — é fácil abrir amanhã achando que está na outra empresa.
        */}
        <Text style={e.contexto} numberOfLines={2}>
          {[ctx.nomeEmpresa, rotuloDoMes(d.competencia), `${d.ritmo}% DO MÊS DECORRIDO`]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        <SeletorDeCompetencia
          competencia={d.competencia}
          aoEscolher={d.setCompetencia}
          ocupado={d.carregando}
        />

        <View style={e.barraAcoes}>
          <SeletorDeExibicao exibicao={d.exibicao} aoEscolher={d.escolherModo} />

          {/*
            📋 "MEUS LANÇAMENTOS" (19/09/2026, pedido do dono do projeto).
            Leva a competência junto, para a lista abrir no MESMO mês que está à
            vista — abrir no mês corrente faria a pessoa achar que perdeu o que
            acabou de conferir.
          */}
          {ctx.pode('dp_meus_lancamentos') && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/financeiro/meus-lancamentos',
                  params: { competencia: d.competencia },
                } as never)
              }
              style={e.botaoSecundario}
              accessibilityRole="button"
              accessibilityLabel="Meus lançamentos deste período"
              android_ripple={{ color: BRAND.primarySoft }}
            >
              <IconeFin nome="lista" tamanho={ICONE.pequeno} cor={BRAND.primary} />
              <Text style={e.botaoSecundarioTexto}>MEUS LANÇAMENTOS</Text>
            </Pressable>
          )}
        </View>

        {/*
          ⚠️ O MOTIVO DO TRAVAMENTO É PARA A PESSOA, E NÃO PARA O SISTEMA. Sem ele,
          quem está no modo percentual conclui que o aplicativo está com defeito.
        */}
        {d.exibicao.motivo && (
          <View style={e.aviso}>
            <IconeFin nome="ver" tamanho={ICONE.pequeno} cor={BRAND.textMuted} />
            <Text style={e.avisoTexto}>{d.exibicao.motivo}</Text>
          </View>
        )}

        {/* 🎁 ERRO DE REDE COM SAÍDA (bónus B4) — nunca uma roda girando para sempre. */}
        {d.erro && (
          <View style={e.aviso}>
            <IconeFin nome="atencao" tamanho={ICONE.pequeno} cor={BRAND.error} />
            <View style={{ flexShrink: 1 }}>
              <Text style={e.avisoTexto}>{d.erro}</Text>
              <Button
                title="TENTAR DE NOVO"
                onPress={d.recarregar}
                variant="secondary"
                size="small"
                icon="Recarregar"
                fullWidth={false}
              />
            </View>
          </View>
        )}

        {d.carregando ? (
          <Girando />
        ) : d.semOrcamento && !d.erro ? (
          <SemOrcamento competencia={d.competencia} />
        ) : (
          blocos.map((bloco) => (
            <View
              key={bloco.chave}
              style={[e.bloco, bloco.chave === 'FORA' && e.blocoFora]}
            >
              <Text style={e.blocoTitulo}>{bloco.rotulo}</Text>

              {/*
                ⚠️ O BLOCO "FORA" PRECISA SE EXPLICAR: é o único que mostra contas que
                NÃO estão no orçamento. Sem a frase, a pessoa acharia que o orçamento
                dela cresceu sozinho.
              */}
              {bloco.chave === 'FORA' && (
                <Text style={e.blocoNota}>
                  ESTAS CONTAS TIVERAM MOVIMENTO NESTA COMPETÊNCIA E NÃO ESTAVAM NO
                  ORÇAMENTO. ELAS NÃO ENTRAM NOS TOTAIS ACIMA.
                </Text>
              )}

              {/*
                ⚠️ NO MODO "SÓ %" O BLOCO FORA NÃO TEM O QUE MOSTRAR, e por isso ele
                se resume (19/09/2026, visto numa captura do dono do projeto).

                Uma linha FORA não tem orçamento — é a definição dela. Sem orçamento
                não há percentual, então no modo "SÓ %" cada conta virava três linhas
                dizendo NADA: "SOMENTE O PERCENTUAL", uma barra vazia, um traço e
                "SEM ORÇAMENTO NESTA COMPETÊNCIA". Na captura eram oito contas assim,
                ocupando mais tela do que o orçamento inteiro.

                Resumir é mais honesto do que repetir o vazio: diz QUANTAS contas
                estão nessa situação e por que os números não aparecem.
              */}
              {bloco.chave === 'FORA' && d.exibicao.modo === 'PERCENTUAL' ? (
                <Text style={e.blocoNota}>
                  {bloco.linhas.length === 1
                    ? '1 CONTA TEVE MOVIMENTO SEM ORÇAMENTO NESTA COMPETÊNCIA.'
                    : `${bloco.linhas.length} CONTAS TIVERAM MOVIMENTO SEM ORÇAMENTO NESTA COMPETÊNCIA.`}
                  {' '}COMO NÃO HÁ ORÇAMENTO, NÃO HÁ PERCENTUAL A MOSTRAR — TROQUE PARA
                  &quot;VALORES + %&quot; PARA VER QUANTO FOI.
                </Text>
              ) : (
              <View style={e.linhas}>
                {bloco.linhas.map((l) => {
                  /**
                   * ⚠️ A TELA SÓ OFERECE O TOQUE A QUEM O BANCO VAI DEIXAR GRAVAR.
                   * Sem `lc_criar`, a linha fica inerte — e isso é conforto, não
                   * segurança: quem forçar a rota leva `42501` de
                   * `fin_gravar_lancamento`, que é quem de fato recusa.
                   */
                  const tocavel = ctx.pode('lc_criar') && !!l.conta_id;
                  if (!tocavel) {
                    return (
                      <BarraDeConsumo
                        key={l.conta_id}
                        linha={l}
                        ritmo={d.ritmo}
                        modo={d.exibicao.modo}
                      />
                    );
                  }
                  return (
                    <Pressable
                      key={l.conta_id}
                      onPress={() => abrirLancamento(l)}
                      style={e.linhaTocavel}
                      accessibilityRole="button"
                      accessibilityLabel={`Lançar em ${l.nome ?? 'conta'}`}
                      android_ripple={{ color: BRAND.primarySoft }}
                    >
                      <BarraDeConsumo linha={l} ritmo={d.ritmo} modo={d.exibicao.modo} />
                    </Pressable>
                  );
                })}
              </View>
              )}

              {bloco.total && (
                <View style={e.divisorTotal}>
                  <BarraDeConsumo
                    linha={bloco.total}
                    nome={`TOTAL ${bloco.rotulo}`}
                    ritmo={d.ritmo}
                    modo={d.exibicao.modo}
                  />
                </View>
              )}

              {/* O RESULTADO é uma linha só, sem contas — ele já vem como total. */}
              {bloco.chave === 'RESULTADO' && bloco.total && (
                <Text style={e.blocoNota}>
                  RECEITAS PLANEJADAS MENOS DESPESAS PLANEJADAS, CONTRA O QUE DE FATO
                  ACONTECEU. O BLOCO OUTRAS NÃO ENTRA: APORTE E TRANSFERÊNCIA NÃO SÃO
                  RESULTADO DO NEGÓCIO.
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * ⚠️ AVISAR **E** DIZER ONDE SE RESOLVE. Só avisar deixaria a pessoa procurando onde
 * se faz o orçamento — e, no telemóvel, ela não vai achar: a tela ORÇAMENTO só
 * existe no site nesta parte. Então o recado diz isso, em vez de oferecer um botão
 * que não leva a lugar nenhum.
 */
function SemOrcamento({ competencia }: { competencia: string }) {
  return (
    <View style={e.bloco}>
      <View style={{ alignItems: 'center' }}>
        <IconeFin nome="atencao" tamanho={ICONE.grande} cor={BRAND.warning} traco={1.6} />
        <Text style={e.vazioTitulo}>NÃO EXISTE ORÇAMENTO PARA {rotuloDoMes(competencia)}</Text>
        <Text style={e.vazioTexto}>
          O DINHEIRO DO PERÍODO COMPARA O QUE VOCÊ PLANEJOU COM O QUE ACONTECEU — E O
          PLANO AINDA NÃO FOI FEITO PARA ESTE MÊS. O ORÇAMENTO SE CRIA NO PAINEL WEB,
          EM CONTROLE FINANCEIRO · ORÇAMENTO.
        </Text>
      </View>
    </View>
  );
}

function Girando() {
  return (
    <View style={e.centro}>
      <ActivityIndicator size="large" color={BRAND.primary} />
    </View>
  );
}

function Recado({ texto }: { texto: string }) {
  return (
    <View style={e.centro}>
      <IconeFin nome="atencao" tamanho={ICONE.grande} cor={BRAND.warning} traco={1.6} />
      <Text style={e.vazioTexto}>{texto}</Text>
    </View>
  );
}
