import React from 'react';
import { View, Text } from 'react-native';
import type { EmpresaParaSincronizar } from '@jairo/core';

import Button from '@/components/button/Button';
import { estilos } from './TenantManagerModal.styles';

interface TenantListsProps {
  ativas: EmpresaParaSincronizar[];
  inativas: EmpresaParaSincronizar[];
  onRemover: (indice: number) => void;
  onReabilitar: (indice: number) => void;
}

/**
 * 🏢 AS DUAS LISTAS DE EMPRESAS: habilitadas e histórico (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/TenantLists.tsx
 *
 * Saiu do `TenantManagerModal` porque aquele arquivo passava de 250 linhas
 * fazendo três coisas: a moldura modal, o campo de nova empresa e estas listas.
 *
 * 📜 O HISTÓRICO SÓ APARECE QUANDO HÁ HISTÓRICO. Um título "Histórico de
 * empresas" seguido de nada faz o operador procurar o que não veio.
 *
 * 💬 "DADOS PRESERVADOS" É A FRASE QUE FAZ O BOTÃO REABILITAR TER SENTIDO. Sem
 * ela, uma empresa listada como inativa lê-se como registro morto. Remover aqui
 * é desativar (`is_active = false`), nunca apagar.
 *
 * 🔑 A CHAVE DA LISTA INCLUI O ÍNDICE de propósito. Empresa recém-criada ainda
 * não tem `tenant_id`, e duas novas na mesma sessão colidiriam numa chave
 * baseada só nele — o React reaproveitaria a linha errada ao remover uma delas.
 */
export default function TenantLists({
  ativas,
  inativas,
  onRemover,
  onReabilitar,
}: TenantListsProps) {
  return (
    <>
      <Text style={estilos.tituloSecao}>Empresas habilitadas</Text>

      {ativas.length === 0 ? (
        <View style={estilos.vazio}>
          <Text style={estilos.vazioTexto}>Nenhuma empresa ativa no momento.</Text>
        </View>
      ) : (
        ativas.map((empresa, indice) => (
          <View key={`ativa-${empresa.tenant_id ?? 'nova'}-${indice}`} style={estilos.item}>
            <Text style={estilos.itemNome} numberOfLines={2}>
              {empresa.name}
            </Text>
            <Button
              title="Remover"
              variant="ghost"
              size="small"
              onPress={() => onRemover(indice)}
              testID={`btn-remover-${indice}`}
            />
          </View>
        ))
      )}

      {inativas.length > 0 && (
        <>
          <Text style={[estilos.tituloSecao, estilos.espacado]}>Histórico de empresas</Text>

          {inativas.map((empresa, indice) => (
            <View key={`inativa-${empresa.tenant_id ?? indice}`} style={estilos.itemInativo}>
              <View style={estilos.itemTextos}>
                <Text style={estilos.itemNomeInativo} numberOfLines={2}>
                  {empresa.name}
                </Text>
                <Text style={estilos.itemNota}>Dados preservados</Text>
              </View>
              <Button
                title="Reabilitar"
                variant="outline"
                size="small"
                onPress={() => onReabilitar(indice)}
                testID={`btn-reabilitar-${indice}`}
              />
            </View>
          ))}
        </>
      )}
    </>
  );
}
