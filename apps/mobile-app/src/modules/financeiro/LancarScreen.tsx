import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { competenciaDe, competenciaAtual, rotuloDoMes } from '@jairo/core';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';
import Button from '@/components/button/Button';
import Input from '@/components/input/Input';

import { useContextoFin } from './useContextoFin';
import { useLancarNoOrcamento } from './useLancarNoOrcamento';
import BarraDeConsumo from './BarraDeConsumo';
import CampoDinheiro from './CampoDinheiro';
import SelecaoComBusca from './SelecaoComBusca';
import SeletorDeData from './SeletorDeData';
import IconeFin from './IconeFin';
import { estilosFin as e } from './estilos';

/**
 * ✍️ TELA: LANÇAR A PARTIR DO DINHEIRO DO PERÍODO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/LancarScreen.tsx
 *
 * Aberta ao tocar numa conta do DINHEIRO DO PERÍODO. **Espelho fiel** da tela
 * `dinheiro-do-periodo/lancar` do site — os motivos das reduções (sem
 * transferência, sem ordem no extrato, regime fixo em CAIXA) estão em
 * `useLancarNoOrcamento.ts`, que é onde as decisões moram.
 *
 * ===========================================================================
 * ⚠️ A PRIMEIRA VERSÃO DESTA TELA NÃO ERA UM ESPELHO, E NOVE COISAS DIVERGIAM
 * ===========================================================================
 * Entregue em 19/09/2026 e corrigida no mesmo dia, a pedido do dono do projeto
 * ("deve funcionar igual ao admin-web"). As três divergências graves:
 *
 *   1. **A CONTA MOVIMENTO FILTRAVA SÓ A MEMÓRIA.** O site busca no BANCO
 *      (`fin_buscar_contas_movimento`, `%texto%`, 4 resultados); eu usava o
 *      `SearchableSelect` da plataforma, que filtra a lista já carregada. É
 *      proibição explícita do `CLAUDE.md` — a lista carregada é só a primeira
 *      página do cadastro, e o campo diria "nada encontrado" sobre algo que existe.
 *
 *   2. **A DATA ERA UM CAMPO DE TEXTO "AAAA-MM-DD".** No site é um seletor de
 *      calendário. Dez toques num teclado numérico, em formato invertido ao que o
 *      brasileiro escreve, e sem defesa contra "2026-13-45".
 *
 *   3. **CONTA SEM ORÇAMENTO NÃO DIZIA NADA.** O site avisa "ESTA CONTA NÃO ESTÁ
 *      NO ORÇAMENTO DE X. O LANÇAMENTO SERÁ GRAVADO NORMALMENTE"; eu simplesmente
 *      não desenhava a barra. É o caso NORMAL de quem chegou pelo bloco "GASTO FORA
 *      DO ORÇAMENTO" — e o silêncio se lia como tela quebrada.
 *
 * ⚠️ A BARRA DAQUELA CONTA FICA NO TOPO, E SE ATUALIZA A CADA GRAVAÇÃO. É o que
 * responde à pergunta que fez a pessoa tocar ali: "quanto ainda cabe?".
 *
 * ⚠️ A BARRA VEM SEMPRE EM `modo="VALORES"`, e isso é deliberado: quem abriu esta
 * tela está lançando dinheiro que ele próprio conhece. O modo "SÓ %" é uma escolha
 * de leitura da tela de origem, não um cofre — e o bloqueio do banco continua
 * valendo, porque lá os valores chegam nulos e a barra os mostra como `—`.
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

  const opcoesDeConta = f.contas.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }));

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
          {[
            rotuloDoMes(competencia),
            f.categoria?.tipo,
            f.gravados > 0 ? `${f.gravados} LANÇAMENTO(S) NESTA SESSÃO` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {/*
          ⚠️ ERRO E AVISO FICAM NO TOPO, como no site. Embaixo do formulário, a
          confirmação de "LANÇAMENTO REGISTRADO" nasceria fora da dobra num telemóvel
          — e quem grava e não vê resposta grava de novo.
        */}
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

        {/* ─── A BARRA, QUE SE ATUALIZA A CADA GRAVAÇÃO ─────────────────── */}
        <View style={e.bloco}>
          <Text style={e.blocoTitulo}>ORÇAMENTO × REALIZADO</Text>

          {f.linha ? (
            <View style={e.linhas}>
              <BarraDeConsumo linha={f.linha} ritmo={f.ritmo} modo="VALORES" />
            </View>
          ) : (
            /*
              ⚠️ A CONTA PODE NÃO ESTAR NO ORÇAMENTO — e é o caso NORMAL de quem
              chegou pelo bloco "GASTO FORA DO ORÇAMENTO". Sem esta frase a barra
              simplesmente não aparecia, e a pessoa concluía que a tela estava
              quebrada ou que o lançamento não seria aceito. Ele é aceito.
            */
            <View style={[e.semBarra, e.espacoCampo]}>
              <Text style={e.avisoTexto}>
                ESTA CONTA NÃO ESTÁ NO ORÇAMENTO DE {rotuloDoMes(competencia)}. O
                LANÇAMENTO SERÁ GRAVADO NORMALMENTE.
              </Text>
            </View>
          )}
        </View>

        {/* ─── O FORMULÁRIO ────────────────────────────────────────────── */}
        <View style={e.bloco}>
          <Text style={e.rotuloCampo}>CONTA MOVIMENTO</Text>
          <SelecaoComBusca
            valor={f.contaMovimentoId}
            opcoes={opcoesDeConta}
            aoEscolher={f.setContaMovimentoId}
            aoBuscar={f.buscarContas}
            placeholder="DIGITE PARA PROCURAR OU TOQUE PARA VER A LISTA"
            desabilitado={f.gravando}
          />

          <View style={e.espacoCampo}>
            <Text style={e.rotuloCampo}>DATA</Text>
            <SeletorDeData
              valor={f.data}
              aoEscolher={f.setData}
              competenciaSugerida={competencia}
              desabilitado={f.gravando}
            />
            {f.dataForaDaCompetencia && (
              <Text style={[e.notaDoFormulario, { color: BRAND.warning }]}>
                FORA DE {rotuloDoMes(competencia)} — NÃO ENTRA NESTA BARRA
              </Text>
            )}
          </View>

          <View style={e.espacoCampo}>
            <Text style={e.rotuloCampo}>VALOR</Text>
            <CampoDinheiro valorCentavos={f.valor} onChange={f.setValor} desabilitado={f.gravando} />
          </View>

          {/*
            ⛔ TRAVADO, O TIPO APARECE MOSTRANDO O PORQUÊ — como no site. Eu escondia
            o campo inteiro, e esconder é pior: quem conhece o formulário procura o
            tipo, não acha, e fica sem saber se vai gravar ENTRADA ou SAÍDA. A caixa
            cinza responde as duas coisas de uma vez.
          */}
          <View style={e.espacoCampo}>
            <Text style={e.rotuloCampo}>TIPO DO MOVIMENTO</Text>

            {f.tipoTravado ? (
              <View style={e.tipoTravado}>
                <Text style={e.tipoTravadoTexto}>
                  {f.tipoMov === 'ENTRADA' ? 'ENTRADA' : 'SAÍDA'}
                </Text>
                <Text style={e.tipoTravadoMotivo}>FIXO PELO TIPO {f.categoria?.tipo}</Text>
              </View>
            ) : (
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
            )}
          </View>

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
            {/* As MAIÚSCULAS e o teto de 200 são aplicados no hook, não aqui. */}
            <Input
              label="HISTÓRICO"
              value={f.historico}
              onChangeText={f.setHistorico}
              placeholder="O QUE FOI ESTE LANÇAMENTO"
              maxLength={200}
              autoCapitalize="characters"
            />
          </View>

          {/*
            O mesmo rodapé do site. Ele responde, antes que alguém pergunte, por que
            faltam três campos que existem no NOVO LANÇAMENTO completo.
          */}
          <Text style={e.notaDoFormulario}>
            REGIME FIXO EM CAIXA · A ORDEM NO EXTRATO É ESCOLHIDA PELO SISTEMA ·
            TRANSFERÊNCIA NÃO ENTRA NO ORÇAMENTO
          </Text>
        </View>

        <View style={e.espacoCampo}>
          <Button
            title={f.gravando ? 'GRAVANDO…' : 'GRAVAR'}
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
 * seletor exigiria dois toques (abrir, escolher) para o que aqui leva um. No site
 * são dois `<select>` porque lá o menu abre no lugar, sem custo.
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
