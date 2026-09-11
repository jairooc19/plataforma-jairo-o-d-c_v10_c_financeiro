"use client";

import { useState, useEffect, useRef } from "react";

/**
 * COMPONENTE: SEARCHABLE SELECT - PLATAFORMA JAIRO O D C v4
 * Finalidade: Input de seleção com busca interna e padronização para UPPERCASE.
 */

interface Option {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (name: string, value: string) => void;
  placeholder: string;
  disabled?: boolean;
  name: string;
  /** Vincula um <label htmlFor> externo ao input de busca. */
  id?: string;
}

const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  disabled, 
  name,
  id 
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  /**
   * O que o usuário DIGITOU. `null` significa "não digitou nada desde a última
   * seleção" — e então o campo mostra o rótulo do valor escolhido.
   *
   * ⚠️ ISTO SUBSTITUI UM `searchTerm` ESPELHADO POR EFEITO, e a troca conserta
   * um bug latente além de calar o ESLint. O efeito antigo tinha `options` na
   * lista de dependências e chamava `setSearchTerm` no corpo: bastava o pai
   * entregar um array novo a cada render — que é o caso das cidades do IBGE,
   * remontadas a cada resposta — para o efeito disparar no meio da digitação e
   * apagar o que estava sendo escrito. Texto exibido agora é DERIVADO, não
   * copiado, e não existe instante em que as duas versões discordem.
   */
  const [rascunho, setRascunho] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const rotuloSelecionado = options.find((opt) => opt.value === value)?.label ?? '';
  const searchTerm = rascunho ?? rotuloSelecionado;

  // Fecha o dropdown ao clicar fora e devolve o campo ao rótulo selecionado
  // (ou a vazio, se nada estiver escolhido — mesmo desfecho de antes).
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setRascunho(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Lista exibida no dropdown.
   *
   * 🐛 Correção: quando há valor selecionado, `searchTerm` guarda o rótulo inteiro
   * (ex: "🇧🇷 BRASIL"). Filtrar por ele deixava o dropdown com uma única opção — a
   * que já estava escolhida — e o campo parecia "sem opções". Enquanto o termo for
   * exatamente o rótulo do selecionado, mostramos a lista completa; a filtragem só
   * entra quando o usuário realmente digita algo diferente.
   */
  const usuarioDigitou = searchTerm !== rotuloSelecionado;

  const filteredOptions = usuarioDigitou
    ? options.filter((opt) => opt.label.toUpperCase().includes(searchTerm.toUpperCase()))
    : options;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => {
          setRascunho(e.target.value.toUpperCase());
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold uppercase"
      />
      
      {/* Ícone Indicador */}
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        ▼
      </span>

      {/* Lista de Opções */}
      {isOpen && !disabled && (
        <ul className="absolute top-[110%] left-0 right-0 bg-white border border-slate-200 rounded-2xl max-h-60 overflow-y-auto z-[100] shadow-xl py-2 animate-fade-in">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => (
              <li
                key={index}
                onClick={() => {
                  onChange(name, opt.value);
                  // Volta a exibir o rótulo do que acabou de ser escolhido.
                  setRascunho(null);
                  setIsOpen(false);
                }}
                className={`p-4 cursor-pointer text-sm font-bold transition-colors ${
                  value === opt.value 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li className="p-4 text-sm text-slate-400 text-center">
              Nenhuma opção encontrada
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;