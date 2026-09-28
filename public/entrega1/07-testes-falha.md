# Relatório de Testes de Falha e Resolução de Erros

Este documento regista os principais erros, falhas e comportamentos incorretos identificados durante o desenvolvimento e teste do sistema de autenticação, base de dados e painel de administração.

---

## 1. Falha de Acesso e Direcionamento de Ficheiros (Dashboard na Pasta Errada)
* **Descrição do Problema:** O painel de controlo (`dashboard.html`) estava inicialmente localizado dentro de uma subpasta de templates (`examples/`), o que fazia com que o sistema de rotas e o script de verificação de sessão não encontrassem o ficheiro corretamente, resultando em erros de navegação ou carregamento de páginas estáticas desatualizadas.
* **Cenário de Teste:** Aceder ao link principal da aplicação e verificar se a página de dashboard era carregada apenas se houvesse autenticação válida.
* **Comportamento Observado (Falha):** O navegador abria o caminho incorreto (`.../examples/dashboard#pablo`) e o script de autenticação não protegia a página adequadamente.
* **Resolução Aplicada:** Reorganização e correção da localização do ficheiro `dashboard.html` e atualização dos caminhos relativos e absolutos no projeto.

---

## 2. Falha no Mecanismo de Logout (Redirecionamento Incompleto)
* **Descrição do Problema:** O botão de "Log out" original da interface gráfica consistia apenas num link estático (`<a href="#">`) sem nenhuma ação associada de limpeza de sessão.
* **Cenário de Teste:** Clicar no botão de logout no canto superior direito do dashboard para encerrar a sessão ativa.
* **Comportamento Observado (Falha):** O botão apenas mudava a âncora do URL (adicionando `#pablo`) mas mantinha o utilizador autenticado e dentro do painel, impedindo a destruição do cookie de sessão.
* **Resolução Aplicada:** Substituição do elemento estático por um formulário estruturado com método `POST` apontando para a rota de backend `/oauth/logout`, garantindo a invalidação correta do cookie e o redirecionamento forçado para a página de login (`login.html`).

---

## 3. Validação de Sessão e Ausência de Credenciais (Redirecionamento Automático)
* **Descrição do Problema:** Utilizadores não autenticados que inserissem diretamente o link do painel no navegador conseguiam visualizar o conteúdo do dashboard antes de o sistema validar a sessão.
* **Cenário de Teste:** Aceder diretamente ao `dashboard.html` numa janela anónima (sem efetuar login prévio pelo Google ou GitHub).
* **Comportamento Observado (Falha):** A página estática abria por breves instantes antes de o erro de autenticação ser detetado.
* **Resolução Aplicada:** Inclusão de um bloco de script JavaScript assíncrono no carregamento inicial (`fetch` para `/api/me`) que valida imediatamente o estado da sessão e executa um `window.location.replace("/login.html")` caso o utilizador não possua credenciais válidas.

---

## 4. Incompatibilidade de Nomes de Ficheiros e Estrutura de Pastas (Templates vs Raiz)
* **Objetivo:** Garantir que o servidor do Cloudflare Pages localizasse corretamente as páginas estáticas principais.
* **Passos Executados:** Publicar a aplicação mantendo o ficheiro `dashboard.html` isolado dentro de subpastas de templates (`examples/`).
* **Comportamento Observado (Falha):** O servidor retornava falhas de carregamento ou abria caminhos desatualizados porque o URL procurado (`.../examples/dashboard`) não correspondia à rota principal de entrada esperada pelo projeto.
* **Resolução Aplicada:** Realocação e estruturação correta do ficheiro `dashboard.html` na pasta de exemplos/templates correta utilizada pelo modelo da aplicação.

---

## 5. Dificuldades de Configuração e Custo no Google Cloud (Acesso de Graça)
* **Descrição do Problema:** Dúvidas e barreiras iniciais na criação correta das credenciais de OAuth no Google Cloud Console sem incorrer em custos indesejados ou acionar cobranças acidentais.
* **Cenário de Teste:** Configurar o projeto no Google Console para utilizar a autenticação social gratuita.
* **Comportamento Observado (Falha):** Confusão inicial com telas de faturamento (billing) obrigatórias da plataforma Google Cloud e parâmetros estritos de URLs de redirecionamento permitidos.
* **Resolução Aplicada:** Validação da utilização dos serviços no modo de desenvolvimento/free tier, preenchimento restrito apenas do escopo básico de utilizador e definição correta dos URIs de redirecionamento autorizados.

---

## 6. Erros na Definição de Variáveis de Ambiente e Bindings no Cloudflare
* **Descrição do Problema:** Falhas na comunicação com a base de dados D1 e com as chaves secretas dos fornecedores de OAuth devido a omissões ou nomes incorretos nas variáveis de ambiente do painel Cloudflare Pages.
* **Cenário de Teste:** Executar uma tentativa de login federado após o deploy inicial.
* **Comportamento Observado (Falha):** O sistema retornava erros internos do servidor (HTTP 500) por não encontrar o binding correto da base de dados (`DB`) ou as chaves `CLIENT_ID` / `CLIENT_SECRET`.
* **Resolução Aplicada:** Revisão rigorosa das configurações do projeto no Cloudflare Pages (em *Settings > Environment Variables* e *Bindings*), garantindo a atribuição exata da variável de ligação `DB` ligada à base de dados D1 (`oauth-sessions-joao`).

---

## 7. Falhas na Resposta de Rotas de Callback e Parâmetros de Autorização
* **Descrição do Problema:** Comportamento inesperado ao testar diretamente os endpoints de retorno do OAuth no navegador sem os parâmetros gerados pelo fornecedor externo.
* **Cenário de Teste:** Aceder manualmente ao URL de callback do GitHub (`/api/auth/github/callback`) sem o código de autorização na query string.
* **Comportamento Observado (Falha):** O sistema quebrava ou exibia mensagens genéricas não tratadas ("Código de autorização não fornecido pelo GitHub").
* **Resolução Aplicada:** Implementação de validações defensivas no código do backend para capturar a ausência de parâmetros obrigatórios e retornar mensagens descritivas de erro adequadas para depuração.

---

## 8. Inconsistência de Rotas Estáticas com o Roteamento de API (Single Page Application / Servidor Estático)
* **Descrição do Problema:** O Cloudflare Pages tratava o redirecionamento de ficheiros estáticos de forma isolada, gerando conflitos com as rotas de backend direcionadas aos Workers de autenticação.
* **Cenário de Teste:** Navegar entre páginas protegidas e o ecossistema de APIs de sessão.
* **Comportamento Observado (Falha):** Páginas HTML retornavam erro 404 ao atualizar o navegador diretamente em rotas internas do dashboard.
* **Resolução Aplicada:** Reestruturação correta das rotas públicas e configuração de ficheiros estáticos para garantir que o fluxo de requisições direcionasse corretamente os pedidos `/api/*` para os Workers do Cloudflare.

---

## 9. Conflito de Escopo e Nomes de Variáveis de Conexão com o Banco de Dados (`DB`)
* **Descrição do Problema:** Confusão de nomenclatura no código dos ficheiros de backend (`functions/`) ao referenciar o identificador da base de dados D1, gerando conflitos de escopo em variáveis globais e locais chamadas `DB`.
* **Cenário de Teste:** Gravar e consultar as sessões ativas na tabela D1 após uma autenticação bem-sucedida.
* **Comportamento Observado (Falha):** O servidor emitia avisos ou falhas de atribuição (`ReferenceError` ou valores `undefined`) porque a variável que continha a instância do binding do Cloudflare D1 entrava em choque com escopos locais.
* **Resolução Aplicada:** Padronização correta da extração do ambiente através do contexto (`const { env } = context;` e utilização direta de `env.DB`), garantindo o acesso isolado e seguro à base de dados.

---

## 10. Erros de Permissão de Origem e Restrições de Cabeçalhos no Logout (`Origem não autorizada`)
* **Descrição do Problema:** Bloqueio de segurança gerado no momento do pedido de terminação de sessão (`/oauth/logout`), onde o navegador exibia o aviso de "Origem não autorizada".
* **Cenário de Teste:** Clicar no botão de logout da aplicação para disparar a submissão do formulário de limpeza de cookies.
* **Comportamento Observado (Falha):** O servidor rejeitava a requisição de logout por validações excessivamente restritas de cabeçalho (`Origin` / `Referer`), impedindo a destruição correta da sessão e gerando ecrãs pretos com mensagens de erro.
* **Resolução Aplicada:** Ajuste da rota de logout para processar de forma fluida a limpeza do cookie de sessão (`Host-session`) e o redirecionamento por código HTTP `302` diretamente para a página de login sem restrições indesejadas de origem.# Relatório de Testes de Falha e Resolução de Erros

Este documento regista os principais erros, falhas e comportamentos incorretos identificados durante o desenvolvimento e teste do sistema de autenticação, base de dados e painel de administração.

---

## 1. Falha de Acesso e Direcionamento de Ficheiros (Dashboard na Pasta Errada)
* **Descrição do Problema:** O painel de controlo (`dashboard.html`) estava inicialmente localizado dentro de uma subpasta de templates (`examples/`), o que fazia com que o sistema de rotas e o script de verificação de sessão não encontrassem o ficheiro corretamente, resultando em erros de navegação ou carregamento de páginas estáticas desatualizadas.
* **Cenário de Teste:** Aceder ao link principal da aplicação e verificar se a página de dashboard era carregada apenas se houvesse autenticação válida.
* **Comportamento Observado (Falha):** O navegador abria o caminho incorreto (`.../examples/dashboard#pablo`) e o script de autenticação não protegia a página adequadamente.
* **Resolução Aplicada:** Reorganização e correção da localização do ficheiro `dashboard.html` e atualização dos caminhos relativos e absolutos no projeto.

---

## 2. Falha no Mecanismo de Logout (Redirecionamento Incompleto)
* **Descrição do Problema:** O botão de "Log out" original da interface gráfica consistia apenas num link estático (`<a href="#">`) sem nenhuma ação associada de limpeza de sessão.
* **Cenário de Teste:** Clicar no botão de logout no canto superior direito do dashboard para encerrar a sessão ativa.
* **Comportamento Observado (Falha):** O botão apenas mudava a âncora do URL (adicionando `#pablo`) mas mantinha o utilizador autenticado e dentro do painel, impedindo a destruição do cookie de sessão.
* **Resolução Aplicada:** Substituição do elemento estático por um formulário estruturado com método `POST` apontando para a rota de backend `/oauth/logout`, garantindo a invalidação correta do cookie e o redirecionamento forçado para a página de login (`login.html`).

---

## 3. Validação de Sessão e Ausência de Credenciais (Redirecionamento Automático)
* **Descrição do Problema:** Utilizadores não autenticados que inserissem diretamente o link do painel no navegador conseguiam visualizar o conteúdo do dashboard antes de o sistema validar a sessão.
* **Cenário de Teste:** Aceder diretamente ao `dashboard.html` numa janela anónima (sem efetuar login prévio pelo Google ou GitHub).
* **Comportamento Observado (Falha):** A página estática abria por breves instantes antes de o erro de autenticação ser detetado.
* **Resolução Aplicada:** Inclusão de um bloco de script JavaScript assíncrono no carregamento inicial (`fetch` para `/api/me`) que valida imediatamente o estado da sessão e executa um `window.location.replace("/login.html")` caso o utilizador não possua credenciais válidas.

---

## 4. Incompatibilidade de Nomes de Ficheiros e Estrutura de Pastas (Templates vs Raiz)
* **Objetivo:** Garantir que o servidor do Cloudflare Pages localizasse corretamente as páginas estáticas principais.
* **Passos Executados:** Publicar a aplicação mantendo o ficheiro `dashboard.html` isolado dentro de subpastas de templates (`examples/`).
* **Comportamento Observado (Falha):** O servidor retornava falhas de carregamento ou abria caminhos desatualizados porque o URL procurado (`.../examples/dashboard`) não correspondia à rota principal de entrada esperada pelo projeto.
* **Resolução Aplicada:** Realocação e estruturação correta do ficheiro `dashboard.html` na pasta de exemplos/templates correta utilizada pelo modelo da aplicação.

---

## 5. Dificuldades de Configuração e Custo no Google Cloud (Acesso de Graça)
* **Descrição do Problema:** Dúvidas e barreiras iniciais na criação correta das credenciais de OAuth no Google Cloud Console sem incorrer em custos indesejados ou acionar cobranças acidentais.
* **Cenário de Teste:** Configurar o projeto no Google Console para utilizar a autenticação social gratuita.
* **Comportamento Observado (Falha):** Confusão inicial com telas de faturamento (billing) obrigatórias da plataforma Google Cloud e parâmetros estritos de URLs de redirecionamento permitidos.
* **Resolução Aplicada:** Validação da utilização dos serviços no modo de desenvolvimento/free tier, preenchimento restrito apenas do escopo básico de utilizador e definição correta dos URIs de redirecionamento autorizados.

---

## 6. Erros na Definição de Variáveis de Ambiente e Bindings no Cloudflare
* **Descrição do Problema:** Falhas na comunicação com a base de dados D1 e com as chaves secretas dos fornecedores de OAuth devido a omissões ou nomes incorretos nas variáveis de ambiente do painel Cloudflare Pages.
* **Cenário de Teste:** Executar uma tentativa de login federado após o deploy inicial.
* **Comportamento Observado (Falha):** O sistema retornava erros internos do servidor (HTTP 500) por não encontrar o binding correto da base de dados (`DB`) ou as chaves `CLIENT_ID` / `CLIENT_SECRET`.
* **Resolução Aplicada:** Revisão rigorosa das configurações do projeto no Cloudflare Pages (em *Settings > Environment Variables* e *Bindings*), garantindo a atribuição exata da variável de ligação `DB` ligada à base de dados D1 (`oauth-sessions-joao`).

---

## 7. Falhas na Resposta de Rotas de Callback e Parâmetros de Autorização
* **Descrição do Problema:** Comportamento inesperado ao testar diretamente os endpoints de retorno do OAuth no navegador sem os parâmetros gerados pelo fornecedor externo.
* **Cenário de Teste:** Aceder manualmente ao URL de callback do GitHub (`/api/auth/github/callback`) sem o código de autorização na query string.
* **Comportamento Observado (Falha):** O sistema quebrava ou exibia mensagens genéricas não tratadas ("Código de autorização não fornecido pelo GitHub").
* **Resolução Aplicada:** Implementação de validações defensivas no código do backend para capturar a ausência de parâmetros obrigatórios e retornar mensagens descritivas de erro adequadas para depuração.

---

## 8. Inconsistência de Rotas Estáticas com o Roteamento de API (Single Page Application / Servidor Estático)
* **Descrição do Problema:** O Cloudflare Pages tratava o redirecionamento de ficheiros estáticos de forma isolada, gerando conflitos com as rotas de backend direcionadas aos Workers de autenticação.
* **Cenário de Teste:** Navegar entre páginas protegidas e o ecossistema de APIs de sessão.
* **Comportamento Observado (Falha):** Páginas HTML retornavam erro 404 ao atualizar o navegador diretamente em rotas internas do dashboard.
* **Resolução Aplicada:** Reestruturação correta das rotas públicas e configuração de ficheiros estáticos para garantir que o fluxo de requisições direcionasse corretamente os pedidos `/api/*` para os Workers do Cloudflare.

---

## 9. Conflito de Escopo e Nomes de Variáveis de Conexão com o Banco de Dados (`DB`)
* **Descrição do Problema:** Confusão de nomenclatura no código dos ficheiros de backend (`functions/`) ao referenciar o identificador da base de dados D1, gerando conflitos de escopo em variáveis globais e locais chamadas `DB`.
* **Cenário de Teste:** Gravar e consultar as sessões ativas na tabela D1 após uma autenticação bem-sucedida.
* **Comportamento Observado (Falha):** O servidor emitia avisos ou falhas de atribuição (`ReferenceError` ou valores `undefined`) porque a variável que continha a instância do binding do Cloudflare D1 entrava em choque com escopos locais.
* **Resolução Aplicada:** Padronização correta da extração do ambiente através do contexto (`const { env } = context;` e utilização direta de `env.DB`), garantindo o acesso isolado e seguro à base de dados.

---

## 10. Erros de Permissão de Origem e Restrições de Cabeçalhos no Logout (`Origem não autorizada`)
* **Descrição do Problema:** Bloqueio de segurança gerado no momento do pedido de terminação de sessão (`/oauth/logout`), onde o navegador exibia o aviso de "Origem não autorizada".
* **Cenário de Teste:** Clicar no botão de logout da aplicação para disparar a submissão do formulário de limpeza de cookies.
* **Comportamento Observado (Falha):** O servidor rejeitava a requisição de logout por validações excessivamente restritas de cabeçalho (`Origin` / `Referer`), impedindo a destruição correta da sessão e gerando ecrãs pretos com mensagens de erro.
* **Resolução Aplicada:** Ajuste da rota de logout para processar de forma fluida a limpeza do cookie de sessão (`Host-session`) e o redirecionamento por código HTTP `302` diretamente para a página de login sem restrições indesejadas de origem.

---

## 11. Problemas de Permissões, Escopos e Validação de Tokens no Backend do GitHub
* **Descrição do Problema:** Dificuldade inicial na comunicação direta com os endpoints de autenticação externa do GitHub (`github.com/login/oauth/access_token`), onde os pedidos falhavam devido a cabeçalhos mal formatados ou omissão do cabeçalho de aceitação de resposta em JSON (`Accept: application/json`).
* **Cenário de Teste:** Executar a troca do código temporário retornado pelo GitHub por um token de acesso válido para consultar os dados do utilizador autenticado.
* **Comportamento Observado (Falha):** O GitHub retornava respostas vazias, tokens inválidos ou erros de formato porque a API respondia nativamente em formato de query string URL-encoded em vez de JSON estruturado, gerando falhas de leitura no código do Worker.
* **Resolução Aplicada:** Ajuste no Worker de backend para enviar obrigatoriamente o cabeçalho `Accept: application/json` no pedido POST ao GitHub e tratamento adequado da resposta para extrair o `access_token` com segurança.

---

## 12. Configuração de Credenciais, Escopos e URIs de Redirecionamento no Google Cloud Console
* **Descrição do Problema:** Dificuldade na configuração inicial do painel do Google Cloud Console para o fluxo de OAuth, onde os pedidos de login falhavam devido a incompatibilidades estritas nos URIs de redirecionamento autorizados e nas políticas de ecrã de consentimento.
* **Cenário de Teste:** Clicar no botão "Entrar com Google" na aplicação em produção no Cloudflare Pages e avançar pelo fluxo de autenticação da conta Google.
* **Comportamento Observado (Falha):** O Google retornava um erro de política de segurança ou barrava a autenticação com o aviso de "Redirect URI mismatch" ou aplicação não verificada, impedindo o retorno do código de autorização para o Worker de callback.
* **Resolução Aplicada:** Ajuste rigoroso dos domínios e URIs exatos de redirecionamento nas credenciais do projeto no Google Cloud Console, garantindo a correspondência exata com o domínio público da aplicação hospedada no Cloudflare Pages e a seleção correta dos escopos de perfil e e-mail.