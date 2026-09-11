import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import AuthScreen from '@/components/auth/AuthScreen';
import MainMenuView from '@/components/auth/MainMenuView';
import AccessOptionsView from '@/components/auth/AccessOptionsView';

/**
 * 🏠 ROTA: GUARITA — MENU PRINCIPAL (PJODC v10)
 * Local: apps/mobile-app/app/(auth)/index.tsx
 *
 * Responde em `/` (o grupo `(auth)` não entra na URL). Substitui o antigo
 * `app/index.tsx`, que era um AuthGuard — essa responsabilidade subiu para o
 * `app/_layout.tsx`, que agora restaura a sessão antes de qualquer tela nascer.
 *
 * 🔀 DUAS VIEWS, UMA ROTA: menu e "selecione o acesso" são o mesmo passo mental
 * ("quero entrar" → "como?"), separados só por um toque. Dar uma rota a cada um
 * poria um item a mais na pilha de navegação, e o botão físico de voltar do
 * Android exigiria dois toques para sair de uma tela que o usuário vê como uma.
 *
 * ⚠️ CADA PAPEL VAI PARA UMA PORTA DIFERENTE. O Proprietário NUNCA cai no
 * formulário de senha — `?papel=OWNER` faz a tela de login renderizar o botão
 * do Google, e é o CLAUDE.md que proíbe o contrário.
 */
export default function GuaritaScreen() {
  const router = useRouter();
  const [mostrarAcessos, setMostrarAcessos] = useState(false);
  const [mostrarAjuda, setMostrarAjuda] = useState(false);

  const escolherPapel = (papel: 'OWNER' | 'DEPENDENT' | 'VIEWER') => {
    // "Apenas Veja" não é um login: não há credencial a pedir, só um aviso.
    if (papel === 'VIEWER') {
      router.push({ pathname: '/(auth)/about', params: { modo: 'viewer-only' } });
      return;
    }
    router.push({ pathname: '/(auth)/login', params: { papel } });
  };

  const navegar = (destino: 'contact' | 'about' | 'login-developer') => {
    setMostrarAjuda(false);
    if (destino === 'login-developer') {
      router.push({ pathname: '/(auth)/login', params: { papel: 'DEVELOPER' } });
      return;
    }
    router.push(`/(auth)/${destino}`);
  };

  return (
    <AuthScreen legenda="Ecossistema de gestão multi-empresa.">
      {mostrarAcessos ? (
        <AccessOptionsView onSelectRole={escolherPapel} onBack={() => setMostrarAcessos(false)} />
      ) : (
        <MainMenuView
          onSelectAccess={() => setMostrarAcessos(true)}
          onHelpToggle={() => setMostrarAjuda((v) => !v)}
          showHelpOptions={mostrarAjuda}
          onNavigate={navegar}
        />
      )}
    </AuthScreen>
  );
}
