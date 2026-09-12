# `supabase/migrations/` — evolução do banco sem perder dados

Esta pasta está **vazia de propósito**, e este arquivo explica quando ela deixa
de estar.

---

## As duas formas de mexer no banco

| | `supabase/criar-bd/` (hoje) | `supabase/migrations/` (o futuro) |
|---|---|---|
| O que faz | Derruba tudo e recria do zero | Aplica só a mudança nova, por cima do que existe |
| Quando usar | Enquanto **não houver dado real** | A partir do primeiro cliente com dados |
| Custo de um erro | Zero: recria de novo | Alto: pode perder ou corromper dados |
| Como se roda | Colando os 3 arquivos no SQL Editor | Um arquivo por mudança, em ordem de data |

Hoje o projeto usa o primeiro caminho, por decisão registrada do dono do projeto
(2026-09-11): não existe banco com dados reais, e não vai existir durante o
desenvolvimento. Recriar é mais limpo do que remendar.

---

## Quando mudar para migrations

Vire a chave **antes** do primeiro dos três eventos abaixo:

1. Alguém que não é você passar a usar o sistema;
2. Existir qualquer lançamento financeiro que você não queira digitar de novo;
3. O sistema ser publicado para acesso externo.

A partir daí, `plataforma_00_reset.sql` deixa de ser uma ferramenta e passa a ser
um risco: ele apaga todos os usuários e todas as empresas.

---

## Como será

Cada mudança vira um arquivo com data e nome no começo, e o nome diz o que ela
faz. A ordem alfabética é a ordem de execução:

```
supabase/migrations/
├── 20261015090000_criar_tabelas_financeiro.sql
├── 20261016143000_adicionar_coluna_centro_de_custo.sql
└── 20261020101500_indice_lancamentos_por_vencimento.sql
```

Regras que evitam a maior parte dos acidentes:

- **Um arquivo, uma mudança.** Fica fácil identificar qual delas quebrou algo.
- **Nunca editar um arquivo já aplicado.** Se errou, crie outro que corrige.
- **Toda migration precisa de volta.** Escreva, no comentário do topo, o SQL que
  desfaz o que ela fez.
- **Migrations não apagam coluna na mesma semana em que param de usá-la.**
  Primeiro o código deixa de ler; depois de alguns dias, a coluna sai. Assim dá
  para voltar atrás sem perder o que já estava gravado.

O `supabase/criar-bd/` continua existindo mesmo depois disso: ele é a forma de
montar um ambiente novo de desenvolvimento do zero, e deve refletir o estado
final — o mesmo a que chegaria quem aplicasse todas as migrations em ordem.

---

## Referência

Documentação oficial do fluxo de migrations e de testes do Supabase:
<https://supabase.com/docs/guides/deployment/database-migrations> e
<https://supabase.com/docs/guides/local-development/testing/overview>.
