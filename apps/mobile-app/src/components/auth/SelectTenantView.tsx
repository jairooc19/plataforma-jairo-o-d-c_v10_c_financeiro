import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { BRAND, PLATFORM } from '@/constants/Colors';
import Card from '@/components/card/Card';
import Button from '@/components/button/Button';
import { authStyles } from './authStyles';
import type { TenantLink } from '@/hooks/useTenantTriage';

interface Props {
  tenants: TenantLink[];
  onSelect: (tenant: TenantLink) => void;
  onBack: () => void;
  loading: boolean;
}

/**
 * 🏢 VIEW: SELETOR DE EMPRESA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/SelectTenantView.tsx
 *
 * Espelho do `TenantSelectorView.tsx` da web. Só aparece quando o usuário tem
 * DOIS OU MAIS vínculos — com um só, a triagem entra direto e esta tela nunca é
 * vista; com nenhum, o destino é "Aguardando Triagem".
 *
 * ⚠️ EMPRESA COM DONO INATIVO CONTINUA NA LISTA, mas recusa a entrada no toque.
 * Escondê-la seria pior: o usuário veria a empresa sumir sem explicação e não
 * teria como saber que o problema é o proprietário, não ele. O aviso vem no
 * momento do toque, dito por inteiro (`useTenantTriage.entrarNaEmpresa`).
 *
 * 📜 `scrollEnabled={false}` É INTENCIONAL, e não um esquecimento: esta lista
 * vive DENTRO do `ScrollView` do `AuthScreen`. Duas áreas roláveis aninhadas no
 * mesmo eixo disputam o gesto — o usuário arrasta e uma das duas se move, sem
 * regra previsível. Quem rola é o pai; a lista só desenha.
 *
 * 🧊 `renderItem` está FORA do componente (`ItemEmpresa`, memoizado). Definido
 * inline, ele seria uma função nova a cada render e a `FlatList` reconciliaria
 * todas as linhas mesmo sem nada ter mudado.
 */
function SelectTenantView({ tenants, onSelect, onBack, loading }: Props) {
  const renderizarItem = useCallback(
    ({ item }: ListRenderItemInfo<TenantLink>) => <ItemEmpresa item={item} onSelect={onSelect} />,
    [onSelect]
  );

  const extrairChave = useCallback((item: TenantLink) => item.tenant_id, []);

  if (loading) {
    return (
      <Card style={estilos.cartaoCarregando}>
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={[authStyles.subtitulo, { marginTop: 16 }]}>Buscando seus vínculos...</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={authStyles.titulo}>Selecione a Empresa</Text>
      <Text style={authStyles.subtitulo}>
        Você tem acesso a {tenants.length} empresas. Escolha por qual deseja entrar.
      </Text>

      <FlatList
        data={tenants}
        keyExtractor={extrairChave}
        renderItem={renderizarItem}
        scrollEnabled={false}
        style={{ marginTop: 18 }}
      />

      <Button title="← Sair" variant="ghost" onPress={onBack} style={{ marginTop: 10 }} />
    </Card>
  );
}

/** Uma linha da lista. Ver a nota sobre `renderItem` no cabeçalho acima. */
const ItemEmpresa = memo(function ItemEmpresa({
  item,
  onSelect,
}: {
  item: TenantLink;
  onSelect: (tenant: TenantLink) => void;
}) {
  const donoInativo = item.tenants.users?.is_active === false;
  const escolher = useCallback(() => onSelect(item), [item, onSelect]);

  return (
    <Pressable
      style={estilos.item}
      onPress={escolher}
      accessible
      accessibilityRole="button"
      accessibilityLabel={
        `${item.tenants.tenant_name}, papel ${item.role}` +
        (donoInativo ? ', proprietário inativo' : '')
      }
    >
      <View style={{ flex: 1 }}>
        <Text style={estilos.nome}>{item.tenants.tenant_name}</Text>
        <Text style={estilos.papel}>
          {item.role}
          {donoInativo ? ' · proprietário inativo' : ''}
        </Text>
      </View>
      <Text style={estilos.seta}>›</Text>
    </Pressable>
  );
});

const estilos = StyleSheet.create({
  cartaoCarregando: { alignItems: 'center', paddingVertical: 48 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BRAND.border,
    borderRadius: PLATFORM.radiusCard,
    padding: 18,
    marginBottom: 12,
    backgroundColor: BRAND.background,
    minHeight: 64,
  },
  nome: { fontSize: 16, fontWeight: '800', color: BRAND.text },
  papel: {
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seta: { fontSize: 26, color: BRAND.textMuted, marginLeft: 10 },
});

export default memo(SelectTenantView);
