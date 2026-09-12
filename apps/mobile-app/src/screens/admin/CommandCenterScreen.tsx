import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import type { UsuarioAdmin } from '@jairo/core';

import UserListItem from './UserListItem';
import TenantManagerModal from './TenantManagerModal';
import { useCommandCenter } from './useCommandCenter';
import { estilos } from './CommandCenterScreen.styles';
import { BRAND } from '@/constants/Colors';

/**
 * 🛰️ TELA: CENTRAL DE COMANDOS — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/CommandCenterScreen.tsx
 *
 * Paridade com a Central de Comandos da web: triagem de usuários pendentes,
 * lista de clientes operacionais e o gerenciador de empresas de cada um.
 *
 * ⚠️ v10 — OS DADOS NÃO VÊM MAIS POR HTTP. Até a v9 esta era a única tela do
 * aplicativo que falava com o site em vez de falar com o banco, porque as
 * operações exigiam a chave mestra e o Desenvolvedor não tinha sessão. Hoje ele
 * tem sessão de verdade, e as funções `admin_*` do banco conferem
 * `is_superuser()` — a mesma chamada serve aos dois ambientes.
 *
 * 🔄 PUXAR PARA ATUALIZAR EXISTE PORQUE A LISTA ENVELHECE SOZINHA. Um cadastro
 * novo entra em `public.users` sem avisar o app, e a web resolve isso
 * recarregando a página — gesto que não existe aqui.
 *
 * ✅ GRAVAR RECARREGA A LISTA: sincronizar empresas também muda o PAPEL do
 * usuário (`active` quando sobra empresa ativa, `pending` quando não sobra).
 */
export default function CommandCenterScreen() {
  const { pendentes, operacionais, carregando, erro, recarregar } = useCommandCenter();
  const [selecionado, setSelecionado] = useState<UsuarioAdmin | null>(null);

  const aoSalvar = useCallback(() => {
    setSelecionado(null);
    recarregar();
  }, [recarregar]);

  if (carregando && pendentes.length === 0 && operacionais.length === 0) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={estilos.raiz}
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={recarregar} tintColor={BRAND.primary} />
        }
      >
        {!!erro && (
          <View style={estilos.mensagemErro}>
            <Text style={estilos.textoErro}>{erro}</Text>
          </View>
        )}

        {/* ─── Triagem ────────────────────────────────────────────────── */}
        <View style={estilos.tituloLinha}>
          <Text style={estilos.tituloSecao}>Triagem de usuários</Text>
          <View style={[estilos.selo, estilos.seloPendente]}>
            <Text style={[estilos.seloTexto, estilos.seloTextoPendente]}>
              {pendentes.length} pendente{pendentes.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        {pendentes.length === 0 ? (
          <View style={estilos.vazio}>
            <Text style={estilos.vazioTexto}>Nenhum usuário aguardando triagem.</Text>
          </View>
        ) : (
          <View style={estilos.lista}>
            {pendentes.map((usuario) => (
              <UserListItem
                key={usuario.id}
                usuario={usuario}
                pendente
                onPress={() => setSelecionado(usuario)}
              />
            ))}
          </View>
        )}

        {/* ─── Operacionais ───────────────────────────────────────────── */}
        <View style={[estilos.tituloLinha, estilos.espacado]}>
          <Text style={estilos.tituloSecao}>Clientes operacionais</Text>
          <View style={[estilos.selo, estilos.seloAtivo]}>
            <Text style={[estilos.seloTexto, estilos.seloTextoAtivo]}>
              {operacionais.length} ativo{operacionais.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        {operacionais.length === 0 ? (
          <View style={estilos.vazio}>
            <Text style={estilos.vazioTexto}>Nenhum cliente operacional.</Text>
          </View>
        ) : (
          <View style={estilos.lista}>
            {operacionais.map((usuario) => (
              <UserListItem
                key={usuario.id}
                usuario={usuario}
                pendente={false}
                onPress={() => setSelecionado(usuario)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/*
        Montado só enquanto há usuário escolhido: cada abertura nasce limpa e
        relê os vínculos. Ver o cabeçalho do próprio modal.
      */}
      {selecionado && (
        <TenantManagerModal
          usuario={selecionado}
          onFechar={() => setSelecionado(null)}
          onSalvo={aoSalvar}
        />
      )}
    </>
  );
}
