import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  competenciaDe,
  competenciaAtual,
  rotuloDoMes,
  formatarBRL,
  formatarDataBR,
  type LancamentoNaLista,
} from '@jairo/core';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';
import Button from '@/components/button/Button';

import { useContextoFin } from './useContextoFin';
import { useMeusLancamentos } from './useMeusLancamentos';
import IconeFin from './IconeFin';
import { estilosFin as e } from './estilos';

/**
 * 📋 TELA: MEUS LANÇAMENTOS — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/MeusLancamentosScreen.tsx
 *
 * O que ESTA pessoa lançou no período que ela está vendo no DINHEIRO DO PERÍODO.
 * Toca-se numa linha e abre a ficha, com EDITAR e EXCLUIR.
 *
 * ===========================================================================
 * ⚠️ TRÊS PERMISSÕES DIFERENTES GOVERNAM ESTA TELA, E ELAS NÃO SÃO A MESMA
 * ===========================================================================
 *   `dp_meus_lancamentos` → abrir a tela           (criada em 19/09/2026)
 *   `lc_editar_proprios`  → o botão EDITAR         (já existia)
 *   `lc_excluir_proprios` → o botão EXCLUIR        (já existia)
 *
 * As duas últimas foram **reusadas de propósito**, decisão do dono do projeto em
 * 19/09/2026: criar `dp_editar` e `dp_excluir` daria dois interruptores para o
 * mesmo poder, e um dia eles discordariam. É o mesmo raciocínio que manteve o
 * `lc_criar` quando esta parte do módulo ganhou o botão de lançar.
 *
 * ⚠️ E ESCONDER BOTÃO NÃO É CONTROLE DE ACESSO. Quem recusa é o banco, dentro de
 * `fin_gravar_lancamento` e `fin_excluir_lancamento`, que chamam `fin_pode` antes
 * de agir. A tela só evita oferecer o que vai ser negado.
 */
export default function MeusLancamentosScreen() {
  const ctx = useContextoFin();
  const router = useRouter();
  const parametros = useLocalSearchParams<{ competencia?: string }>();

  const competencia =
    parametros.competencia && /^\d{4}-\d{2}-\d{2}$/.test(parametros.competencia)
      ? competenciaDe(parametros.competencia)
      : competenciaAtual();

  const m = useMeusLancamentos(ctx.tenantId, ctx.userId, competencia);

  /** A ficha aberta. `null` = nenhuma. */
  const [aberto, setAberto] = useState<LancamentoNaLista | null>(null);
  const [apagando, setApagando] = useState(false);

  const editar = useCallback(
    (l: LancamentoNaLista) => {
      setAberto(null);
      router.push({
        pathname: '/financeiro/lancar',
        params: { conta: l.conta_identificadora_id, competencia, lancamento: l.id },
      } as never);
    },
    [router, competencia],
  );

  /**
   * ⚠️ A CONFIRMAÇÃO DIZ O QUE VAI ACONTECER, E NUMA TRANSFERÊNCIA SÃO **DUAS**
   * LINHAS. As pernas são amarradas (RN-23): o banco apaga as duas na mesma
   * transação. Quem não for avisado volta ao extrato e encontra um lançamento a
   * menos do que esperava — e passa a desconfiar do sistema, não do próprio clique.
   */
  const confirmarExclusao = useCallback(
    (l: LancamentoNaLista) => {
      const ehTransferencia = l.transferencia_id !== null;
      Alert.alert(
        'EXCLUIR O LANÇAMENTO?',
        [
          `${formatarDataBR(l.data_movimento)} · ${formatarBRL(l.valor_centavos)}`,
          l.conta_identificadora?.nome ?? '',
          ehTransferencia
            ? '\n⚠️ ESTE LANÇAMENTO É UMA PERNA DE TRANSFERÊNCIA. AS DUAS PERNAS SERÃO APAGADAS JUNTAS.'
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
        [
          { text: 'CANCELAR', style: 'cancel' },
          {
            text: 'EXCLUIR',
            style: 'destructive',
            onPress: async () => {
              setApagando(true);
              try {
                const r = await m.excluir(l.id);
                setAberto(null);
                if (r) {
                  Alert.alert(
                    'EXCLUÍDO',
                    r.eraTransferencia
                      ? `${r.apagados} LANÇAMENTOS APAGADOS (AS DUAS PERNAS DA TRANSFERÊNCIA).`
                      : `${r.apagados} LANÇAMENTO APAGADO.`,
                  );
                }
              } catch (erro) {
                Alert.alert(
                  'NÃO FOI POSSÍVEL EXCLUIR',
                  erro instanceof Error ? erro.message : 'FALHA AO EXCLUIR.',
                );
              } finally {
                setApagando(false);
              }
            },
          },
        ],
      );
    },
    [m],
  );

  if (ctx.carregando) return <Girando />;
  if (ctx.erro) return <Recado texto={ctx.erro} />;

  if (!ctx.pode('dp_meus_lancamentos')) {
    return (
      <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA VER OS PRÓPRIOS LANÇAMENTOS. FALE COM O PROPRIETÁRIO DA EMPRESA." />
    );
  }

  return (
    <SafeAreaView style={e.tela} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={e.conteudo}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={m.recarregando}
            onRefresh={m.recarregar}
            colors={[BRAND.primary]}
            tintColor={BRAND.primary}
          />
        }
      >
        <Text style={e.contexto} numberOfLines={2}>
          {[ctx.nomeEmpresa, rotuloDoMes(competencia)].filter(Boolean).join(' · ')}
        </Text>

        {!!m.erro && (
          <View style={e.aviso}>
            <IconeFin nome="atencao" tamanho={ICONE.pequeno} cor={BRAND.error} />
            <View style={{ flexShrink: 1 }}>
              <Text style={e.avisoTexto}>{m.erro}</Text>
              <Button
                title="TENTAR DE NOVO"
                onPress={m.recarregar}
                variant="secondary"
                size="small"
                icon="Recarregar"
                fullWidth={false}
              />
            </View>
          </View>
        )}

        {/*
          ⚠️ A LISTA AVISA QUANDO FOI CORTADA. Sem isto, quem vê 200 registros acha
          que viu o mês inteiro — e conclui que um lançamento sumiu.
        */}
        {m.cortada && (
          <View style={e.aviso}>
            <IconeFin nome="atencao" tamanho={ICONE.pequeno} cor={BRAND.warning} />
            <Text style={e.avisoTexto}>
              A LISTA FOI CORTADA NOS PRIMEIROS {m.teto} LANÇAMENTOS. USE A PESQUISA DO
              PAINEL WEB PARA VER O PERÍODO INTEIRO.
            </Text>
          </View>
        )}

        {m.carregando ? (
          <Girando />
        ) : m.lista.length === 0 ? (
          <View style={e.bloco}>
            <View style={{ alignItems: 'center' }}>
              <IconeFin nome="dinheiro" tamanho={ICONE.grande} cor={BRAND.textFaint} traco={1.6} />
              <Text style={e.vazioTitulo}>NENHUM LANÇAMENTO SEU EM {rotuloDoMes(competencia)}</Text>
              <Text style={e.vazioTexto}>
                ESTA LISTA MOSTRA SOMENTE O QUE VOCÊ REGISTROU. LANÇAMENTOS DE OUTRAS
                PESSOAS DA EMPRESA NÃO APARECEM AQUI.
              </Text>
            </View>
          </View>
        ) : (
          <View style={e.bloco}>
            <Text style={e.blocoTitulo}>
              {m.lista.length === 1 ? '1 LANÇAMENTO' : `${m.lista.length} LANÇAMENTOS`} ·{' '}
              {formatarBRL(m.totalCentavos)}
            </Text>

            {/*
              ⚠️ O TOTAL É "ENTRADAS MENOS SAÍDAS" DESTA PESSOA — e a frase diz isso.
              Um número sem rótulo ao lado de uma lista de dinheiro é lido como "o
              total da empresa", que ele não é.
            */}
            <Text style={e.blocoNota}>ENTRADAS MENOS SAÍDAS QUE VOCÊ REGISTROU NESTE MÊS.</Text>

            <View style={e.listaLancamentos}>
              {m.lista.map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => setAberto(l)}
                  style={e.itemLancamento}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatarDataBR(l.data_movimento)}, ${l.conta_identificadora?.nome ?? ''}, ${formatarBRL(l.valor_centavos)}`}
                  android_ripple={{ color: BRAND.primarySoft }}
                >
                  <View style={{ flexShrink: 1 }}>
                    <Text style={e.itemTitulo} numberOfLines={2}>
                      {l.conta_identificadora?.nome ?? '—'}
                    </Text>
                    <Text style={e.itemDetalhe} numberOfLines={1}>
                      {formatarDataBR(l.data_movimento)} · {l.conta_movimento?.nome ?? '—'}
                      {l.transferencia_id ? ' · TRANSFERÊNCIA' : ''}
                    </Text>
                  </View>

                  <Text
                    style={[
                      e.itemValor,
                      { color: l.tipo_movimento === 'ENTRADA' ? BRAND.success : BRAND.error },
                    ]}
                  >
                    {l.tipo_movimento === 'ENTRADA' ? '+' : '−'} {formatarBRL(l.valor_centavos)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <FichaDoLancamento
        lancamento={aberto}
        apagando={apagando}
        podeEditar={ctx.pode('lc_editar_proprios')}
        podeExcluir={ctx.pode('lc_excluir_proprios')}
        aoFechar={() => setAberto(null)}
        aoEditar={editar}
        aoExcluir={confirmarExclusao}
      />
    </SafeAreaView>
  );
}

/**
 * A ficha do lançamento, com os dados e as duas ações.
 *
 * ⚠️ "EDITAR" NÃO É OFERECIDO NUMA PERNA DE TRANSFERÊNCIA, e isso é proibição
 * explícita do `CLAUDE.md`: as duas pernas são amarradas (RN-23), e alterar uma
 * deixaria o saldo da outra conta errado **para sempre**. O caminho é excluir (o
 * banco apaga as duas) e lançar de novo — e a ficha escreve isso, em vez de
 * apenas esconder o botão e deixar a pessoa procurando.
 */
function FichaDoLancamento({
  lancamento,
  apagando,
  podeEditar,
  podeExcluir,
  aoFechar,
  aoEditar,
  aoExcluir,
}: {
  lancamento: LancamentoNaLista | null;
  apagando: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
  aoFechar: () => void;
  aoEditar: (l: LancamentoNaLista) => void;
  aoExcluir: (l: LancamentoNaLista) => void;
}) {
  if (!lancamento) return null;
  const l = lancamento;
  const ehTransferencia = l.transferencia_id !== null;

  return (
    <Modal visible animationType="slide" onRequestClose={aoFechar} transparent>
      <View style={e.fichaFundo}>
        <View style={e.ficha}>
          <ScrollView>
            <Text style={e.fichaTitulo} numberOfLines={2}>
              {l.conta_identificadora?.nome ?? '—'}
            </Text>

            <Linha rotulo="VALOR" valor={formatarBRL(l.valor_centavos)} />
            <Linha rotulo="DATA" valor={formatarDataBR(l.data_movimento)} />
            <Linha rotulo="TIPO" valor={l.tipo_movimento === 'ENTRADA' ? 'ENTRADA' : 'SAÍDA'} />
            <Linha rotulo="CONTA MOVIMENTO" valor={l.conta_movimento?.nome ?? '—'} />
            <Linha rotulo="PROPRIEDADE" valor={l.propriedade} />
            <Linha rotulo="REGIME" valor={l.regime} />
            <Linha rotulo="ORDEM NO EXTRATO" valor={String(l.ordem_extrato ?? '—')} />
            <Linha rotulo="CONFERIDO" valor={l.conferido ? 'SIM' : 'NÃO'} />
            <Linha rotulo="HISTÓRICO" valor={l.historico || '—'} />
            {ehTransferencia && <Linha rotulo="TRANSFERÊNCIA" valor="SIM — DUAS PERNAS" />}

            {ehTransferencia && (
              <View style={e.aviso}>
                <IconeFin nome="atencao" tamanho={ICONE.pequeno} cor={BRAND.warning} />
                <Text style={e.avisoTexto}>
                  ESTE LANÇAMENTO É UMA PERNA DE TRANSFERÊNCIA E NÃO PODE SER EDITADO:
                  ALTERAR UMA PERNA DEIXARIA O SALDO DA OUTRA CONTA ERRADO. PARA
                  CORRIGIR, EXCLUA (AS DUAS SAEM JUNTAS) E REGISTRE DE NOVO.
                </Text>
              </View>
            )}

            {podeEditar && !ehTransferencia && (
              <View style={e.espacoCampo}>
                <Button title="EDITAR" onPress={() => aoEditar(l)} icon="Editar" />
              </View>
            )}

            {podeExcluir && (
              <View style={e.espacoCampo}>
                <Button
                  title="EXCLUIR"
                  onPress={() => aoExcluir(l)}
                  variant="danger"
                  icon="Apagar"
                  loading={apagando}
                />
              </View>
            )}

            {/*
              ⚠️ SEM PERMISSÃO, A FICHA DIZ O QUE FALTA. Um cartão só de leitura, sem
              explicação, faz a pessoa concluir que o aplicativo está incompleto.
            */}
            {!podeEditar && !podeExcluir && (
              <Text style={e.notaDoFormulario}>
                VOCÊ PODE VER OS PRÓPRIOS LANÇAMENTOS, MAS NÃO EDITAR NEM EXCLUIR. QUEM
                LIBERA ISSO É O PROPRIETÁRIO DA EMPRESA, NAS CONFIGURAÇÕES DO MÓDULO.
              </Text>
            )}

            <View style={e.espacoCampo}>
              <Button title="FECHAR" onPress={aoFechar} variant="ghost" />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={e.fichaLinha}>
      <Text style={e.fichaRotulo}>{rotulo}</Text>
      <Text style={e.fichaValor} numberOfLines={3}>
        {valor}
      </Text>
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
