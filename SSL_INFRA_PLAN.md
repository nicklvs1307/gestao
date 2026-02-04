# Relatório de Diagnóstico e Plano de Infraestrutura SSL

## 1. Situação Atual (Diagnóstico)
Atualmente, o sistema utiliza o **Traefik v3** como Proxy Reverso e o **Let's Encrypt** com o desafio `HTTP-01` (`httpchallenge`) para emissão de certificados SSL.

### O Problema
*   **Subdomínios Dinâmicos:** O frontend do cliente atende múltiplos subdomínios (ex: `roma.kicardapio.towersfy.com`, `loja2.kicardapio.towersfy.com`).
*   **Limitação do Desafio HTTP:** O Let's Encrypt, através do desafio HTTP, exige que o servidor prove a propriedade de *cada subdomínio individualmente*. Isso gera:
    1.  **Atrasos:** O primeiro acesso a um novo subdomínio fica sem SSL por alguns segundos/minutos.
    2.  **Falhas de Validação:** Regras de Regex no Traefik muitas vezes impedem o Let's Encrypt de validar o caminho `.well-known/acme-challenge`.
    3.  **Certificado Default:** Quando a validação falha, o Traefik serve o `TRAEFIK DEFAULT CERT` (autoassinado), resultando no "Cadeado Riscado" ou "Conexão Não Segura".
    4.  **Rate Limits:** O Let's Encrypt limita a quantidade de certificados individuais por domínio por semana.

---

## 2. Solução Profissional Recomendada: DNS-01 Challenge (Wildcard)
A forma correta para sistemas SaaS com múltiplos subdomínios é utilizar um **Certificado Wildcard (`*.kicardapio.towersfy.com`)**. Este certificado único cobre todos os subdomínios atuais e futuros.

### Requisito: Migração para Cloudflare
Para emitir certificados Wildcard automaticamente, o Traefik precisa do desafio `DNS-01`. Ele não funciona com o Hostgator atual pois o Hostgator não possui uma API de DNS compatível com o Traefik.

**Passos para a Mudança:**

1.  **Gestão de DNS:** Mover a zona de DNS do domínio `towersfy.com` para a **Cloudflare** (Plano Gratuito é suficiente).
    *   *Nota:* O site e o servidor continuam onde estão, apenas o "apontamento" passa pela Cloudflare.
2.  **API Token:** Gerar um Token de API na Cloudflare com permissão de editar zonas DNS.
3.  **Configuração no Traefik:**
    *   Substituir o `httpchallenge` pelo `dnschallenge` no `traefik.yaml`.
    *   Adicionar as credenciais da Cloudflare como variáveis de ambiente ou segredos no Docker Swarm.

---

## 3. Plano de Ação (Resumo Técnico)

### Parte A: DNS
*   [ ] Criar conta na Cloudflare.
*   [ ] Adicionar o domínio `towersfy.com`.
*   [ ] Replicar todos os registros DNS atuais (A, CNAME, MX).
*   [ ] Alterar os NameServers no painel do Hostgator para os fornecidos pela Cloudflare.

### Parte B: Configuração Traefik
Alterar o `traefik.yaml` para:
```yaml
certificatesresolvers:
  letsencryptresolver:
    acme:
      dnschallenge:
        provider: cloudflare
        # A porta 80 não precisará mais estar aberta para validação
      email: lucas.niquele.ln@gmail.com
      storage: /etc/traefik/letsencrypt/acme.json
```

### Parte C: Docker Stack
Adicionar o token da Cloudflare ao serviço do Traefik:
```yaml
environment:
  - CF_API_EMAIL=lucas.niquele.ln@gmail.com
  - CF_DNS_API_TOKEN=SEU_TOKEN_AQUI
```

---

## 4. Benefícios Finais
*   **SSL Instantâneo:** Qualquer novo cliente terá SSL no primeiro segundo de acesso.
*   **Segurança:** Fim do aviso "Não Seguro".
*   **Performance:** Menos processamento do Traefik tentando validar domínios a cada requisição.
*   **Escalabilidade:** Sem limites de emissão para novos clientes.

---
**Elaborado por:** Gemini CLI Agent
**Data:** 04/02/2026
