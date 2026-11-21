# Calendário Mensal — Acesso Administrativo

Sistema web profissional de calendário mensal editável com **acesso exclusivo do Administrador**, política de **senha forte**, proteção contra força bruta e **miniaturas temáticas** ao lado dos eventos e feriados.

## Segurança implementada

- **Acesso exclusivo do Administrador**: sem contas públicas ou senhas padrão expostas.
- **Primeiro acesso seguro**: ao abrir pela primeira vez, o administrador cria seu login e uma **senha forte obrigatória** (mínimo 8 caracteres, letra maiúscula, minúscula, número e caractere especial), com medidor de força em tempo real.
- **Criptografia forte**: senhas armazenadas com `scrypt` (`N=16384`, salt aleatório de 32 bytes) e comparação em tempo constante (`timingSafeEqual`).
- **Proteção contra força bruta**: bloqueio automático de 15 minutos após 5 tentativas inválidas + atraso contra ataques automatizados.
- **Alteração segura de senha e revogação de sessões**: ao alterar a senha ou clicar em **Encerrar todas as sessões**, um novo `sessionNonce` é gerado e todas as sessões anteriores são invalidadas instantaneamente.
- **Cookies e cabeçalhos de segurança**: cookie `HttpOnly; SameSite=Strict` (+ `Secure` em HTTPS) e cabeçalhos `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` e `Permissions-Policy`.
- **Variáveis de ambiente opcionais na Vercel**: suporte a `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` e `TOKEN_SECRET` para fixar permanentemente as credenciais na nuvem.

## Execução local

```bash
npm start
```

Acesse: **http://127.0.0.1:3000**
