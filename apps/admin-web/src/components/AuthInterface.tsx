"use client";

import React from "react";
// 🧠 Hook de Inteligência (Fatiamento de Lógica)
import { useAuthLogic, ViewState } from "./auth/hooks/useAuthLogic";

// 🧩 SUB-VISTAS MODULARES (As peças do Lego)
import MainMenuView from "./auth/views/MainMenuView";
import AccessOptionsView from "./auth/views/AccessOptionsView";
import LoginFormsView from "./auth/views/LoginFormsView";
import LoginGoogleOwnerView from "./auth/views/LoginGoogleOwnerView";
import CompleteProfileView from "./auth/views/CompleteProfileView";
import SignUpView from "./auth/views/SignUpView";
import TenantSelectorView from "./auth/views/TenantSelectorView";
import MiscViews from "./auth/views/MiscViews";

/**
 * 🛰️ ORQUESTRADOR: AUTH INTERFACE (PJODC v4)
 * Responsabilidade: Renderização condicional baseada no estado do useAuthLogic.
 */
export default function AuthInterface({ initialView = 'menu' }: { initialView?: ViewState }) {
  
  // Consome toda a inteligência do Hook modularizado
  const {
    view, setView, loading, showPassword, setShowPassword, pegadinha,
    showHelpOptions, setShowHelpOptions, message,
    userTenants, formData, countriesOptions, statesOptions, citiesOptions,
    currentUser,
    handleInputChange, goHome, handleSignUp, handleSignIn, handleSelectTenant,
    handleGoogleSignIn, handleGoogleError, handleGoogleRedirect,
    handleCompleteProfile, handleLogout
  } = useAuthLogic(initialView);

  return (
    <div className="flex-1 flex flex-col items-center p-4 sm:p-8 font-sans relative overflow-x-hidden min-h-screen justify-center bg-transparent">
      
      {/* Botão Superior (Sobre) — escondido no cadastro pela metade: sair daquela
          tela por um atalho devolveria o usuário à guarita ainda autenticado, e o
          portão do dashboard o traria de volta. A única saída de lá é SAIR. */}
      <div className={`mb-8 relative z-10 w-full text-center animate-fade-in shrink-0 ${view === 'complete-profile' ? 'hidden' : ''}`}>
        <button 
          onClick={() => setView('about')} 
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-md border border-slate-200 text-sm font-bold text-indigo-600 hover:bg-white hover:shadow-lg transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Sobre a Plataforma
        </button>
      </div>

      <div className="w-full max-w-[440px] mx-auto flex flex-col relative z-10">
        
        {/* Mensagens de Feedback Centralizadas */}
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium border mb-6 w-full shadow-sm animate-fade-in ${
            message.type === "success" ? "bg-green-50 text-green-800 border-green-200" : 
            message.type === "error" ? "bg-red-50 text-red-800 border-red-200" : "bg-blue-50 text-blue-800 border-blue-200"
          }`}>
            {message.text}
          </div>
        )}

        {/* --- RENDERIZAÇÃO DAS VISTAS --- */}
        
        {view === 'menu' && (
          <MainMenuView 
            onSelectAccess={() => setView('access-options')} 
            onHelpToggle={() => setShowHelpOptions(!showHelpOptions)} 
            showHelpOptions={showHelpOptions}
            onNavigate={(v) => setView(v)}
          />
        )}

        {view === 'access-options' && (
          <AccessOptionsView 
            onSelectRole={(role) => {
              if (role === 'OWNER') setView('login-owner');
              else if (role === 'DEPENDENT') setView('login-dependent');
              else setView('viewer-only');
            }} 
            onBack={goHome} 
          />
        )}

        {/* 🔑 PROPRIETÁRIO: porta exclusiva do Google (v7). Sem e-mail nem senha. */}
        {view === 'login-owner' && (
          <LoginGoogleOwnerView
            loading={loading}
            onSubmit={handleGoogleSignIn}
            onGoogleError={handleGoogleError}
            onRedirectFallback={handleGoogleRedirect}
            onBack={goHome}
          />
        )}

        {/* 🔑 DEPENDENTE e DESENVOLVEDOR: seguem inalterados em e-mail + senha. */}
        {(view === 'login-dependent' || view === 'login-developer') && (
          <LoginFormsView 
            view={view} 
            formData={formData} 
            loading={loading} 
            showPassword={showPassword}
            onInputChange={handleInputChange} 
            onTogglePassword={() => setShowPassword(!showPassword)}
            onSubmit={handleSignIn} 
            onBack={goHome}
          />
        )}

        {/* 🏁 Cadastro pela metade (só acontece com quem entrou pelo Google) */}
        {view === 'complete-profile' && (
          <CompleteProfileView
            formData={formData}
            loading={loading}
            userEmail={currentUser?.email || ''}
            countriesOptions={countriesOptions}
            statesOptions={statesOptions}
            citiesOptions={citiesOptions}
            onInputChange={handleInputChange}
            onSubmit={handleCompleteProfile}
            onLogout={handleLogout}
          />
        )}

        {view === 'signup' && (
          <SignUpView 
            formData={formData} 
            loading={loading} 
            showPassword={showPassword}
            countriesOptions={countriesOptions} 
            statesOptions={statesOptions} 
            citiesOptions={citiesOptions}
            onInputChange={handleInputChange} 
            onTogglePassword={() => setShowPassword(!showPassword)}
            onSubmit={handleSignUp} 
            onBack={goHome}
          />
        )}

        {view === 'select-tenant' && (
          <TenantSelectorView 
            userTenants={userTenants} 
            onSelect={handleSelectTenant} 
            onBack={goHome} 
          />
        )}

        {(view === 'about' || view === 'contact' || view === 'viewer-only' || view === 'waiting-approval' || view === 'planet-blocked') && (
          <MiscViews 
            view={view} 
            pegadinha={pegadinha} 
            onBack={goHome}
            onAction={(action) => {
              if (action === 'fix-planet') {
                handleInputChange('planet', 'TERRA');
                setView('signup');
              } else {
                // Outras ações de MiscViews (como pegadinhas)
              }
            }}
          />
        )}
      </div>

      {/* Painel de Engenharia (Acesso Rápido para Admin) — mesma razão do botão
          "Sobre": não pode servir de fuga da tela de completar cadastro. */}
      <div className={`mt-10 mb-4 text-center relative z-10 w-full animate-fade-in flex flex-col items-center gap-4 ${view === 'complete-profile' ? 'hidden' : ''}`}>
        <button 
          onClick={() => setView('login-developer')} 
          className="text-[10px] font-bold text-slate-400 hover:text-slate-800 uppercase tracking-widest opacity-50 hover:opacity-100 transition-all"
        >
          Painel de Engenharia
        </button>
      </div>

    </div>
  );
}