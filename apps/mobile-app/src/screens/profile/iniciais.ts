/**
 * 🔤 AS INICIAIS DO AVATAR (PJODC v10)
 * Local: apps/mobile-app/src/screens/profile/iniciais.ts
 *
 * Duas letras quando há nome e sobrenome, uma quando há só um nome, e a primeira
 * letra do e-mail quando não há nome nenhum.
 *
 * O caso do e-mail importa: quem entrou pelo Google e ainda não completou o
 * cadastro pode não ter `full_name`, e um avatar vazio no topo da tela lê-se
 * como erro de carregamento.
 */
export function extrairIniciais(nome?: string | null, email?: string | null): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);

  if (partes.length >= 2) {
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }
  return (email ?? '?').charAt(0).toUpperCase();
}
