# Calendário Mensal Editável (Sistema Web)

Sistema web completo inspirado na tabela mensal litúrgica, com **cores fortes e coloridas**, cálculo automático de datas/meses/anos atuais e controle de acesso por **usuário e senha**.

## Como executar

No terminal, dentro desta pasta:

```bash
npm start
```

Depois acesse no navegador: **http://127.0.0.1:3000**

## Usuários iniciais

| Perfil | Usuário | Senha | Permissões |
|---|---|---|---|
| **Administrador** | `admin` | `admin123` | Visualiza, edita todos os quadrados/versículos, gerencia usuários e faz backup/restauração |
| **Editor** | `editor` | `editor123` | Visualiza, edita quadrados/versículos e exporta backup |
| **Visualizador** | `visitante` | `visitante123` | Somente leitura |

> Você pode alterar as senhas e criar novos usuários diretamente pelo botão **👤 Conta** no topo do sistema.

## Funcionalidades

- **Datas, meses e anos reais**: abre automaticamente no mês/ano atual, com destaque no dia de **HOJE** e cálculo automático de todos os dias (incluindo anos bissextos e feriados nacionais brasileiros).
- **Fidelidade à tabela original**: cabeçalho triplo (`MÊS | Versículo/Lema do Mês | ANO`), 7 colunas (`DOMINGO` a `SÁBADO`), numeração `1.`, `2.`, `3.`, cores litúrgicas no canto superior direito e quadrados extras (antes do dia 1 e após o último dia) editáveis para citações/reflexões.
- **Cores fortes e vibrantes**: cada dia da semana com cor marcante no cabeçalho, cores litúrgicas vivas (`Branco`, `Verde`, `Vermelho`, `Roxo`, `Rosa`, `Dourado`, `Preto`) e 9 temas de cores fortes selecionáveis por quadrado.
- **Persistência em arquivo local**: dados salvos em `data/db.json` com senhas protegidas por hash `scrypt`.
- **Impressão colorida**: botão **Imprimir** formatado em folha paisagem (A4 landscape) mantendo todas as cores.
