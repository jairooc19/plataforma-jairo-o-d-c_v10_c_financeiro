import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { competenciaDe, competenciaAtual, rotuloDoMes } from '@jairo/core';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';
import Button from '@/components/button/Button';
import Input from '@/components/input/Input';
import SearchableSelect from '@/components/SearchableSelect';

import { useContextoFin } from './useContextoFin';
import { useLancarNoOrcamento } from './useLancarNoOrcamento';
import BarraDeConsumo from './BarraDeConsumo';
import CampoDinheiro from './CampoDinheiro';
import IconeFin from './IconeFin';
import { estilosFin as e } from './estilos';

/**
 * ✍️ TELA: LANÇAR A PARTIR DO DINHEIRO DO PERÍODO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/LancarScreen.tsx
 *
 * Aberta ao tocar numa conta do DINHEIRO DO PERÍODO. Espelho da tela
 * `dinheiro-do-periodo/lancar` do site, com as mesmas reduções — o porquê de cada
 * uma está em `useLancarNoOrcamento.ts`, que é onde as decisões moram.
 *
 * ⚠️ A BARRA DAQUELA CONTA FICA NO TOPO, E SE ATUALIZA A CADA GRAVAÇÃO. É o que
 * responde à pergunta que fez a pessoa tocar ali: "quanto ainda cabe?". Sem ela,
 * lançar seria às cegas e exigiria voltar à tela anterior a cada valor.
 *
 * ⚠️ NO MODO "SÓ %" A BARRA CONTINUA SEM VALORES, como na tela de origem — ela
 * recebe o mesmo `modo`. Mas note: **o campo de valor continua funcionando**, e
 * tem de continuar. Não ver o orçado não impede ninguém de registrar uma despesa
 * que ele próprio acabou de pagar.
 */
export default function LancarScreen() {
  const ctx = useContextoFin();
  const router = useRouter();
  const parametros = useLocalSearchParams<{ conta?: string; competencia?: string }>();

  const contaId = parametros.conta ?? '';
  const competencia =
    parametros.competencia && /^\d{4}-\d{2}-\d{2}$/.test(parametros.competencia)
      ? competenciaDe(parametros.competencia)
      : competenciaAtual();

  const f = useLancarNoOrcamento(ctx.tenantId, contaId, competencia);

  /**
   * ⚠️ O MODO DE EXIBIÇÃO NÃO É RELIDO AQUI, e a barra do topo nasce em VALORES.
   * A preferência vive no cofre do aparelho e é lida pelo hook da tela de origem;
   * repetir aquela leitura aqui duplicaria a regra. Quem quiser esconder valores
   * faz isso lá, e esta tela é um passo de ida e volta.
   */
  const [confirmandoData, setConfirmandoData] = useState(false);

  /**
   * ⚠️ `Alert.alert` E NÃO `window.confirm`. No site a confirmação da data fora da
   * competência usa `window.confirm`, que não existe em React Native — e o
   * equivalente nativo é assíncrono por callback, não por retorno. Por isso a
   * gravação é chamada DE DENTRO do botão do alerta.
   */
  const gravarComAviso = useCallback(() => {
    if (!f.dataForaDaCompetencia) {
      f.gravar();
      return;
    }

    setConfirmandoData(true);
    Alert.alert(
      'DATA FORA DA COMPETÊNCIA',
      `A DATA ${f.data} ESTÁ FORA DE ${rotuloDoMes(competencia)}.\n\n` +
        'O LANÇAMENTO SERÁ GRAVADO, MAS NÃO VAI ENTRAR NESTA BARRA.',
      [
        { text: 'CANCELAR', style: 'cancel', onPress: () => setConfirmandoData(false) },
        {
          text: 'GRAVAR ASSIM MESMO',
          onPress: () => {
            setConfirmandoData(false);
            f.gravar();
          },
        },
      ],
    );
  }, [f, competencia]);

  if (ctx.carregando || f.carregando) return <Girando />;
  if (ctx.erro) return <Recado texto={ctx.erro} />;

  /**
   * ⚠️ A PERMISSÃO É CONFERIDA DE NOVO NO BANCO, dentro de `fin_gravar_lancamento`.
   * Esta checagem existe para a pessoa ler português em vez de um `42501`.
   */
  if (!ctx.pode('lc_criar')) {
    return (
      <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA CRIAR LANÇAMENTOS. FALE COM O PROPRIETÁRIO DA EMPRESA." />
    );
  }
  if (!contaId) {
    return <Recado texto="ESTA TELA É ABERTA A PARTIR DO DINHEIRO DO PERÍODO, TOCANDO NUMA CONTA." />;
  }

  const opcoesDeConta = f.contas.map((c) => ({ label: c.nome, value: c.id }));

  return (
    <SafeAreaView style={e.tela} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={e.conteudo}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={e.topo}>
          <IconeFin nome="novo" tamanho={ICONE.medio} />
          <Text style={e.titulo} numberOfLines={2}>
            LANÇAR EM {(f.categoria?.nome ?? '—').toUpperCase()}
          </Text>
        </View>

        <Text style={e.contexto}>
          {[rotuloDoMes(competencia), f.categoria?.tipo, f.gravados > 0 ? `${f.gravados} NESTA SESSÃO` : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {/* A barra da conta — a resposta a "quanto ainda cabe?". */}
        {f.linha && (
          <View style={e.bloco}>
            <BarraDeConsumo linha={f.linha} ritmo={0} modo="VALORES" />
          </View>
        )}

        <View style={e.bloco}>
          <Text style={e.rotuloCampo}>CONTA MOVIMENTO (DE ONDE SAI O DINHEIRO)</Text>
          <SearchableSelect
            options={opcoesDeConta}
            value={f.contaMovimentoId}
            onChange={f.setContaMovimentoId}
            placeholder="Escolha a conta..."
          />

          <View style={e.espacoCampo}>
            <Text style={e.rotuloCampo}>VALOR</Text>
            <CampoDinheiro valorCentavos={f.valor} onChange={f.setValor} desabilitado={f.gravando} />
          </View>

          <View style={e.espacoCampo}>
            <Input
              label="DATA (AAAA-MM-DD)"
              value={f.data}
              onChangeText={f.setData}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              ajuda={
                f.dataForaDaCompetencia
                  ? `FORA DE ${rotuloDoMes(competencia)} — NÃO ENTRA NESTA BARRA`
                  : undefined
              }
            />
          </View>

          {/*
            ⛔ O TIPO SÓ APARECE QUANDO É ESCOLHA DE VERDADE. Em receita e despesa
            ele é decidido pelo tipo da conta; desenhar um seletor travado seria
            oferecer uma pergunta cuja resposta já está dada.
          */}
          {!f.tipoTravado && (
            <View style={e.espacoCampo}>
              <Text style={e.rotuloCampo}>TIPO DO MOVIMENTO</Text>
              <View style={e.duasOpcoes}>
                <Opcao
                  texto="ENTRADA"
                  ativa={f.tipoMov === 'ENTRADA'}
                  aoTocar={() => f.setTipoMov('ENTRADA')}
                />
                <Opcao
                  texto="SAÍDA"
                  ativa={f.tipoMov === 'SAIDA'}
                  aoTocar={() => f.setTipoMov('SAIDA')}
                />
              </View>
            </View>
          )}

          <View style={e.espacoCampo}>
            <Text style={e.rotuloCampo}>PROPRIEDADE</Text>
            <View style={e.duasOpcoes}>
              <Opcao
                texto="PRÓPRIO"
                ativa={f.propriedade === 'PROPRIO'}
                aoTocar={() => f.setPropriedade('PROPRIO')}
              />
              <Opcao
                texto="TERCEIROS"
                ativa={f.propriedade === 'TERCEIROS'}
                aoTocar={() => f.setPropriedade('TERCEIROS')}
              />
            </View>
          </View>

          <View style={e.espacoCampo}>
            <Input
              label="HISTÓRICO (OPCIONAL)"
              value={f.historico}
              onChangeText={f.setHistorico}
              placeholder="O que foi este lançamento"
            />
          </View>
        </View>

        {!!f.erro && (
          <View style={e.aviso}>
            <IconeFin nome="atencao" tamanho={ICONE.pequeno} cor={BRAND.error} />
            <Text style={e.avisoTexto}>{f.erro}</Text>
          </View>
        )}

        {!!f.aviso && (
          <View style={e.aviso}>
            <IconeFin nome="recarregar" tamanho={ICONE.pequeno} cor={BRAND.success} />
            <Text style={e.avisoTexto}>{f.aviso}</Text>
          </View>
        )}

        <View style={e.espacoCampo}>
          <Button
            title="GRAVAR LANÇAMENTO"
            onPress={gravarComAviso}
            icon="Salvar"
            loading={f.gravando}
            disabled={!f.podeGravar || confirmandoData}
          />
        </View>

        <View style={e.espacoCampo}>
          <Button title="VOLTAR" onPress={() => router.back()} variant="ghost" icon="Voltar" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Uma das duas opções de um par (ENTRADA/SAÍDA, PRÓPRIO/TERCEIROS).
 *
 * ⚠️ DOIS BOTÕES, E NÃO UM SELETOR COM LISTA. São sempre duas respostas, e um
 * seletor exigiria dois toques (abrir, escolher) para o que aqui leva um.
 */
function Opcao({ texto, ativa, aoTocar }: { texto: string; ativa: boolean; aoTocar: () => void }) {
  return (
    <Pressable
      onPress={aoTocar}
      style={[e.opcao, ativa && e.opcaoAtiva]}
      accessibilityRole="radio"
      accessibilityState={{ selected: ativa }}
    >
      <Text style={[e.opcaoTexto, ativa && e.opcaoTextoAtiva]}>{texto}</Text>
    </Pressable>
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
