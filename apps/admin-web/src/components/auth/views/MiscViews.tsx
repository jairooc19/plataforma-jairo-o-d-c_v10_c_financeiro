"use client";

import React from "react";

type MiscView = 'about' | 'contact' | 'viewer-only' | 'waiting-approval' | 'waiting-team' | 'planet-blocked';

interface MiscViewsProps {
  view: MiscView;
  pegadinha?: boolean;
  onAction?: (action: 'fix-planet' | 'show-joke') => void;
  onBack: () => void;
}

/**
 * ℹ️ VIEW: TELAS INFORMATIVAS E AUXILIARES
 * Responsabilidade: Exibir telas de "Sobre", "Contato", "Aguardando Aprovação" e restrições.
 * Integração: PJODC v4 - UX/UI de suporte e conformidade.
 */
export default function MiscViews({ view, pegadinha, onAction, onBack }: MiscViewsProps) {
  
  // Helper interno para manter a padronização do botão voltar nestas telas
  const renderBackButton = () => (
    <button 
      type="button" 
      onClick={onBack} 
      className="mt-6 w-auto mx-auto flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 py-3 px-10 rounded-lg border border-transparent hover:border-blue-100 transition-all"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      VOLTAR AO INÍCIO
    </button>
  );

  return (
    <div className="w-full">
      {/* 👽 Bloqueio Planetário (A Lógica de Restrição Geográfica) */}
      {view === 'planet-blocked' && (
        <div className="bg-white/95 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-amber-200 text-center animate-fade-in">
          {pegadinha ? (
            <div className="animate-bounce">
              <span className="text-6xl block mb-6">🤣</span>
              <h2 className="text-xl font-black text-blue-600 uppercase mb-4 leading-tight">
                Você caiu na pegadinha da<br/>PLATAFORMA JAIRO O D C
              </h2>
              <button 
                onClick={() => onAction?.('fix-planet')} 
                className="mt-6 w-auto mx-auto px-10 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors shadow-lg"
              >
                Ok, entendi!
              </button>
            </div>
          ) : (
            <>
              <div className="bg-amber-100 text-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold">!</div>
              <h2 className="text-xl font-black text-slate-800 uppercase mb-4">Acesso Restrito</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                No momento o sistema não atende a usuários de outros planetas. Envie uma solicitação para o desenvolvedor.
              </p>
              <button 
                onClick={() => onAction?.('show-joke')} 
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl mb-3 shadow-lg hover:bg-blue-700 transition-all"
              >
                ENVIAR SOLICITAÇÃO
              </button>
              <button 
                onClick={() => onAction?.('fix-planet')} 
                className="text-slate-400 font-bold text-xs uppercase hover:text-slate-600 transition-colors"
              >
                Voltar e Selecionar Terra
              </button>
            </>
          )}
        </div>
      )}

      {/* ⌛ Aguardando Aprovação (Triagem) */}
      {/* ⏳ DEPENDENTE SEM VÍNCULO — quem o autoriza é o dono da empresa.
          ⚠️ NÃO REAPROVEITE A TELA "AGUARDANDO TRIAGEM" AQUI. Ela diz que "o
          Desenvolvedor Master está analisando sua solicitação", o que é
          verdadeiro para o PROPRIETÁRIO (que espera ser promovido no Painel de
          Engenharia) e FALSO para o Dependente: o Desenvolvedor não vai fazer
          nada por ele. Quem precisa agir é o Proprietário da empresa, incluindo
          o e-mail dele na equipe. Uma pessoa esperando pelo interlocutor errado
          espera para sempre. */}
      {view === 'waiting-team' && (
        <div className="bg-white/95 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-amber-200 text-center animate-fade-in">
          <div className="bg-amber-100 text-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold">👥</div>
          <h2 className="text-xl font-black text-slate-800 uppercase mb-4">Conta criada. Falta o convite.</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-4">
            Seu acesso funcionou, mas você ainda não faz parte de nenhuma equipe.
          </p>
          <div className="text-left text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-2 leading-relaxed">
            <p className="font-bold text-slate-700 mb-2">O próximo passo é do Proprietário da empresa:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>ele abre o Painel e vai em <strong>Equipe</strong>;</li>
              <li>procura <strong>o mesmo e-mail que você acabou de usar aqui</strong>;</li>
              <li>marca quais módulos você pode abrir e salva.</li>
            </ol>
            <p className="mt-3">Depois disso, entre de novo por esta mesma porta.</p>
          </div>
          {renderBackButton()}
        </div>
      )}

      {view === 'waiting-approval' && (
        <div className="bg-white/95 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-blue-200 text-center animate-fade-in">
          <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold">⌛</div>
          <h2 className="text-xl font-black text-slate-800 uppercase mb-4">Aguardando Triagem</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Seu cadastro foi recebido com sucesso. O Desenvolvedor Master está analisando sua solicitação.
          </p>
          {renderBackButton()}
        </div>
      )}

      {/* 📄 Sobre / Contato / Aviso Viewer */}
      {(view === 'about' || view === 'contact' || view === 'viewer-only') && (
        <div className="w-full bg-white/95 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white animate-fade-in">
          <div className="text-center py-4 space-y-6 flex flex-col">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
              {view === 'about' ? 'Sobre' : view === 'contact' ? 'Contato' : 'Aviso'}
            </h2>
            <p className="text-slate-500 leading-relaxed">
              {view === 'about' 
                ? 'A Plataforma JAIRO O D C v4 é um ecossistema de alta performance.' 
                : view === 'contact' 
                ? 'Entre em contato com suporte@jairo.com.br' 
                : 'Aguardando liberação do Desenvolvedor Master.'}
            </p>
            {renderBackButton()}
          </div>
        </div>
      )}
    </div>
  );
}