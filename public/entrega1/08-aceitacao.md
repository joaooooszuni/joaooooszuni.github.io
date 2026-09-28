# Critérios de Aceitação

* [X] o site é servido pelo endereço pages.dev atribuído à equipe;
* [X] os arquivos estáticos e as Functions compartilham a mesma origem;
* [X] o projeto foi publicado por integração com GitHub;
* [X] a equipe não instalou nem executou Node.js, npm, npx ou Wrangler;
* [X] cada provedor usa uma URL de retorno própria e exata;
* [X] os pedidos de autorização usam código e PKCE S256;
* [X] a Function apresenta o Client Secret correto somente na troca de tokens;
* [X] o retorno recusa uma transação ausente, expirada, alterada ou reutilizada;
* [X] o id_token do Google só produz uma sessão depois da validação criptográfica e semântica;
* [X] o access_token do GitHub é usado somente para consultar /user e a autorização é revogada antes da criação da sessão;
* [X] o cookie de sessão é opaco, Secure, HttpOnly, SameSite=Strict e não possui Domain;
* [X] o D1 guarda o resumo do cookie, não seu valor bruto;
* [X] /api/me devolve somente o perfil necessário;
* [X] o logout confere Origin, remove a sessão e expira o cookie;
* [X] um cookie revogado não restaura a sessão;
* [X] tokens e segredos não aparecem no HTML, nas URLs salvas, no armazenamento Web ou nos registros;
* [X] a dupla consegue explicar por que os arquivos estáticos permanecem públicos;
* [X] as sessões administrativas foram encerradas no computador compartilhado.

---

### Assinatura
* **Nome:** João Gabriel Rosa de Souza  
* **RA:** 2026109399  
* **Data:** 27/09/2026

### Assinatura
* **Nome:** Vitor Gabriel do Nascimento  
* **RA:** 2026109543
* **Data:** 27/09/2026