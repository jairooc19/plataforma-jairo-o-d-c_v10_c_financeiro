import React, { useCallback } from 'react';
import { View, Text, Modal, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AdminUser } from '@jairo/core';

import Icon from '@/components/icon/Icon';
import Input from '@/components/input/Input';
import Button from '@/components/button/Button';
import TenantLists from './TenantLists';
import { useTenantManager } from './useTenantManager';
import { estilos } from './TenantManagerModal.styles';
import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';

interface TenantManagerModalProps {
  usuario: AdminUser;
  onFechar: () => void;
  /** Gravou: a Central recarrega a lista, porque o papel do usuário pode ter mudado. */
  onSalvo: () => void;
}

/**
 * 🏢 GERENCIADOR DE EMPRESAS DE UM USUÁRIO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/TenantManagerModal.tsx
 *
 * Paridade com o modal de `apps/admin-web/src/app/dashboard/tenants/page.tsx`:
 * criar empresa, remover, reabilitar do histórico e gravar tudo de uma vez.
 *
 * 🧠 A LÓGICA ESTÁ NO `useTenantManager`, AS LISTAS NO `TenantLists` E OS
 * ESTILOS NO `.styles.ts`. Aqui ficou a moldura: cabeçalho, campo de nova
 * empresa e rodapé de ação. É a mesma divisão de `Button`/`Input`/`MenuCard`.
 *
 * 🪟 É UM `Modal` DE TELA CHEIA, e não uma folha ancorada. A lista pode ter
 * várias empresas mais o histórico, com um campo de texto no topo: quando o
 * teclado sobe, uma folha de meia altura deixaria três linhas visíveis. Tela
 * cheia é o que o iOS chama de apresentação modal de página e o que o Android
 * faz com um diálogo de tela inteira.
 *
 * ⚠️ MONTADO SÓ ENQUANTO ABERTO — quem decide é a Central de Comandos, com
 * `{selecionado && <TenantManagerModal/>}`. É a mesma decisão que a web tomou
 * para o modal de perfil: cada abertura nasce limpa e relê os vínculos do banco,
 * sem um efeito de reinicialização que geraria renderização em cascata e
 * reabriria com dados velhos.
 *
 * ⌨️ O NOME VAI PARA MAIÚSCULAS ENQUANTO SE DIGITA, como na web. Não é estética:
 * é assim que os nomes de empresa já gravados estão no banco, e uma lista com
 * "ACME" ao lado de "Acme" parece dois registros diferentes.
 */
export default function TenantManagerModal({ usuario, onFechar, onSalvo }: TenantManagerModalProps) {
  const {
    ativas, inativas, nomeNovo, carregando, salvando, erro,
    setNomeNovo, adicionar, remover, reabilitar, salvar,
  } = useTenantManager(usuario.id, onSalvo);

  const mudarNome = useCallback((texto: string) => setNomeNovo(texto.toUpperCase()), [setNomeNovo]);

  const titulo =
    ativas.length > 0 || inativas.length > 0 ? 'Gerenciar infraestrutura' : 'Habilitar infraestrutura';

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onFechar}>
      <SafeAreaView style={estilos.raiz} edges={['top', 'bottom']}>
        <View style={estilos.cabecalho}>
          <View style={estilos.cabecalhoTextos}>
            <Text style={estilos.titulo}>{titulo}</Text>
            <Text style={estilos.subtitulo} numberOfLines={1}>
              {usuario.full_name?.trim() || usuario.email}
            </Text>
          </View>

          <Pressable
            onPress={onFechar}
            hitSlop={8}
            style={estilos.botaoFechar}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            testID="btn-fechar-empresas"
          >
            <Icon name="Voltar" size={ICONE.medio} color={BRAND.textMuted} strokeWidth={2} />
          </Pressable>
        </View>

        {carregando ? (
          <View style={estilos.centro}>
            <ActivityIndicator size="large" color={BRAND.primary} />
          </View>
        ) : (
          <>
            <ScrollView
              style={estilos.rolagem}
              contentContainerStyle={estilos.conteudo}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {!!erro && (
                <View style={estilos.mensagemErro}>
                  <Text style={estilos.textoErro}>{erro}</Text>
                </View>
              )}

              <View style={estilos.linhaNova}>
                <Input
                  value={nomeNovo}
                  onChangeText={mudarNome}
                  placeholder="NOME DA NOVA EMPRESA"
                  autoCapitalize="characters"
                  icon="Empresa"
                  containerStyle={estilos.campoNova}
                  onSubmitEditing={adicionar}
                  returnKeyType="done"
                  accessibilityLabel="Nome da nova empresa"
                  testID="campo-nova-empresa"
                />
                <Button
                  title="Incluir"
                  variant="secondary"
                  size="medium"
                  icon="Adicionar"
                  disabled={!nomeNovo.trim()}
                  onPress={adicionar}
                  testID="btn-incluir-empresa"
                />
              </View>

              <TenantLists
                ativas={ativas}
                inativas={inativas}
                onRemover={remover}
                onReabilitar={reabilitar}
              />
            </ScrollView>

            <View style={estilos.rodape}>
              <Button
                title="Salvar e concluir"
                variant="primary"
                size="large"
                icon="Salvar"
                loading={salvando}
                onPress={salvar}
                testID="btn-salvar-empresas"
              />
              <Button
                title="Cancelar"
                variant="ghost"
                size="medium"
                disabled={salvando}
                onPress={onFechar}
                style={estilos.espacadoCurto}
                testID="btn-cancelar-empresas"
              />
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}
