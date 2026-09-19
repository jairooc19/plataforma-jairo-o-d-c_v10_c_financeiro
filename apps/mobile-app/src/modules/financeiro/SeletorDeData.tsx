import React, { memo, useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import {
  formatarDataBR,
  rotuloDoMes,
  deslocarCompetencia,
  competenciaDe,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
  deDataISO,
  dataLocalISO,
  hojeISO,
} from '@jairo/core';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';
import IconeFin from './IconeFin';
import { estilosFin as e } from './estilos';

export interface SeletorDeDataProps {
  /** A data em vigor, "AAAA-MM-DD". */
  valor: string;
  aoEscolher: (data: string) => void;
  /** O mês que o calendário abre mostrando. Padrão: o mês da própria data. */
  competenciaSugerida?: string;
  desabilitado?: boolean;
}

/**
 * 📅 SELETOR DE DATA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/SeletorDeData.tsx
 *
 * O equivalente do `<input type="date">` que a tela do site usa: toca-se no campo
 * e abre um calendário; escolhe-se o dia.
 *
 * ===========================================================================
 * ⚠️ POR QUE UM CALENDÁRIO ESCRITO AQUI, E NÃO UMA BIBLIOTECA
 * ===========================================================================
 * O caminho normal seria `@react-native-community/datetimepicker`, que abre o
 * seletor **nativo** do aparelho. Ele não está instalado, e instalá-lo traz um
 * MÓDULO NATIVO novo — o que significa que todo APK já construído deixa de servir
 * e cada pessoa com o aplicativo instalado precisa de um instalador novo.
 *
 * Todo o degrau 08 foi feito com **zero dependência nova**, de propósito: é o que
 * permite o código chegar ao aparelho sem obrigar a uma troca de aplicativo. Um
 * campo de data não vale quebrar isso.
 *
 * ⚠️ E O CAMPO DE TEXTO NÃO SERVIA. Antes disto a data era digitada como
 * "AAAA-MM-DD" — no telemóvel isso é dez toques num teclado numérico, com o
 * formato invertido em relação ao que o brasileiro escreve, e sem nenhuma defesa
 * contra "2026-13-45". O mostrador aqui exibe **DD/MM/AAAA**, que é como se lê no
 * Brasil, e a escolha é por toque: não há como produzir uma data inválida.
 *
 * ⚠️ NENHUMA CONTA DE DATA É FEITA NESTE ARQUIVO. Primeiro dia, último dia,
 * deslocamento de mês e formatação vêm todos do `lib/datas.ts` do Core, que tem
 * teste no `npm test`. A tentação de escrever `new Date(ano, mes, dia)` aqui é
 * exatamente onde nasce o defeito do "31 de março menos um mês dá 3 de março".
 */
function SeletorDeDataBase({
  valor,
  aoEscolher,
  competenciaSugerida,
  desabilitado,
}: SeletorDeDataProps) {
  const [aberto, setAberto] = useState(false);
  const [mesVisto, setMesVisto] = useState<string | null>(null);

  /**
   * ⚠️ O MÊS EM CARTAZ NASCE `null` E O VALOR EM USO É `mesVisto ?? derivado`.
   * Copiar o valor derivado para dentro do estado com um `useEffect` desfaria, na
   * renderização seguinte, a navegação que a pessoa acabou de fazer — é proibição
   * explícita do `CLAUDE.md`.
   */
  const mes = mesVisto ?? competenciaDe(valor || competenciaSugerida || hojeISO());

  /** Os dias do mês em cartaz, mais os vazios que alinham o dia 1 ao dia da semana. */
  const grade = useMemo(() => {
    const primeiro = primeiroDiaDoMes(mes);
    const ultimo = ultimoDiaDoMes(mes);
    const diaDaSemanaDoPrimeiro = deDataISO(primeiro).getDay(); // 0 = domingo
    const totalDeDias = deDataISO(ultimo).getDate();

    const celulas: Array<string | null> = [];
    for (let i = 0; i < diaDaSemanaDoPrimeiro; i += 1) celulas.push(null);

    const base = deDataISO(primeiro);
    for (let d = 1; d <= totalDeDias; d += 1) {
      celulas.push(dataLocalISO(new Date(base.getFullYear(), base.getMonth(), d)));
    }
    return celulas;
  }, [mes]);

  const hoje = hojeISO();

  return (
    <>
      <Pressable
        onPress={() => !desabilitado && setAberto(true)}
        style={[e.campoSelecao, desabilitado && e.campoSelecaoInerte]}
        accessibilityRole="button"
        accessibilityLabel={`Data: ${valor ? formatarDataBR(valor) : 'não escolhida'}`}
      >
        <Text style={e.campoSelecaoTexto}>{valor ? formatarDataBR(valor) : 'ESCOLHER A DATA'}</Text>
        <IconeFin nome="calendario" tamanho={ICONE.pequeno} cor={BRAND.textMuted} />
      </Pressable>

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <View style={e.folha}>
          <View style={e.calendarioTopo}>
            <Pressable
              onPress={() => setMesVisto(deslocarCompetencia(mes, -1))}
              style={e.seletorBotao}
              accessibilityLabel="Mês anterior"
              hitSlop={8}
            >
              <IconeFin nome="anterior" tamanho={ICONE.medio} cor={BRAND.primary} />
            </Pressable>

            <Text style={e.seletorMes}>{rotuloDoMes(mes)}</Text>

            <Pressable
              onPress={() => setMesVisto(deslocarCompetencia(mes, 1))}
              style={e.seletorBotao}
              accessibilityLabel="Mês seguinte"
              hitSlop={8}
            >
              <IconeFin nome="proximo" tamanho={ICONE.medio} cor={BRAND.primary} />
            </Pressable>
          </View>

          <View style={e.semana}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((letra, i) => (
              <Text key={`${letra}-${i}`} style={e.semanaLetra}>
                {letra}
              </Text>
            ))}
          </View>

          <ScrollView>
            <View style={e.grade}>
              {grade.map((dia, i) => {
                if (dia === null) return <View key={`vazio-${i}`} style={e.celula} />;

                const escolhido = dia === valor;
                const ehHoje = dia === hoje;

                return (
                  <Pressable
                    key={dia}
                    onPress={() => {
                      aoEscolher(dia);
                      setAberto(false);
                      setMesVisto(null);
                    }}
                    style={[e.celula, escolhido && e.celulaEscolhida]}
                    accessibilityRole="button"
                    accessibilityLabel={formatarDataBR(dia)}
                    accessibilityState={{ selected: escolhido }}
                  >
                    <Text
                      style={[
                        e.celulaTexto,
                        escolhido && e.celulaTextoEscolhido,
                        !escolhido && ehHoje && e.celulaTextoHoje,
                      ]}
                    >
                      {deDataISO(dia).getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Pressable onPress={() => setAberto(false)} style={e.folhaFechar} hitSlop={8}>
            <Text style={e.folhaFecharTexto}>FECHAR SEM ESCOLHER</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

export const SeletorDeData = memo(SeletorDeDataBase);
export default SeletorDeData;
