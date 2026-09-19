import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { agruparEmBlocos, rotuloDoMes } from '@jairo/core';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';
import Button from '@/components/button/Button';

import { useContextoFin } from './useContextoFin';
import { useDinheiroDoPeriodo } from './useDinheiroDoPeriodo';
import SeletorDeCompetencia from './SeletorDeCompetencia';
import BotaoModoExibicao from './BotaoModoExibicao';
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
 * ⚠️ NÃO HÁ "LANÇAR" nesta parte. No site, tocar numa conta abre o lançamento — que
 * exige teclado, campo de dinheiro, seleção de conta e o ritual da ordem no extrato.
 * É uma tela inteira, não um botão: fica para a parte 2.
 */
export default function DinheiroDoPeriodoScreen() {
  const ctx = useContextoFin();
  const d = useDinheiroDoPeriodo(ctx.tenantId);

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
        <View style={e.topo}>
          <IconeFin nome="dinheiro" tamanho={ICONE.medio} />
          <Text style={e.titulo}>DINHEIRO DO PERÍODO</Text>
        </View>

        {/*
          🎁 A EMPRESA ATIVA NO ALTO (bónus B6). No telemóvel ela SOBREVIVE a fechar
          o aplicativo — é fácil abrir amanhã achando que está na outra empresa.
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
          <BotaoModoExibicao exibicao={d.exibicao} aoAlternar={d.alternarModo} />
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

              <View style={e.linhas}>
                {bloco.linhas.map((l) => (
                  <BarraDeConsumo
                    key={l.conta_id}
                    linha={l}
                    ritmo={d.ritmo}
                    modo={d.exibicao.modo}
                  />
                ))}
              </View>

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
