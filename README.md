# Dorath · Período 1 — playtest v0.7.1

Aplicativo estático para celulares com autenticação e partidas no Supabase. Este repositório reúne o site, o motor da partida, a migração do banco, o conjunto de 54 QR e os testes. É uma versão de **playtest**; consulte `LEIA-ME.md` para as regras implementadas e limites conhecidos.

## Estrutura

| Caminho | Uso |
| --- | --- |
| `site/` | Arquivos publicados pelo Cloudflare Pages; `index.html` abre o aplicativo. |
| `supabase/functions/dorath-p1/` | Edge Function que autentica e processa as jogadas. |
| `supabase/migrations/` | Estrutura do banco e permissões. |
| `tests/` | Verificações locais do motor. |
| `LEIA-ME.md` | Detalhes técnicos e limites desta versão. |
| `DORATH_Livro_de_Regras_...docx` | Manual de referência do playtest. |

## Subir para um novo repositório GitHub

Crie um repositório chamado `dorath` e envie **o conteúdo desta pasta**, preservando `site/` e `supabase/` na raiz. O GitHub não descompacta um ZIP enviado como arquivo. Com Git ou GitHub Desktop, extraia o pacote, abra esta pasta como repositório, faça o primeiro commit e publique para `main`.

Pelo terminal, dentro desta pasta, em um repositório vazio:

```bash
git init
git add .
git commit -m "Playtest Dorath P1 v0.7.1"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/dorath.git
git push -u origin main
```

Se o repositório foi criado com README ou outro commit inicial, clone-o primeiro e copie este conteúdo para dentro do clone antes de fazer commit e push; assim você não precisa sobrescrever o histórico remoto.

## Cloudflare Pages

Em **Workers & Pages → Create application → Pages → Import an existing Git repository**, autorize o GitHub e selecione `dorath`:

| Campo | Valor |
| --- | --- |
| Branch de produção | `main` |
| Framework preset | None |
| Root directory | deixe no padrão (raiz do repositório) |
| Build command | deixe vazio |
| Build output directory | `site` |

O Cloudflare publica `site/index.html` na URL principal e publica novamente a cada push em `main`. Arquivos fora de `site/` permanecem no repositório, mas não fazem parte do site servido pelo Pages.

Depois da primeira publicação, configure no Supabase **Authentication → URL Configuration** a URL pública `https://SEU-PROJETO.pages.dev` como Site URL e inclua `https://SEU-PROJETO.pages.dev/multiplayer.html` nas Redirect URLs. Se usar domínio próprio ou URL de preview para confirmar e-mail, inclua também as respectivas URLs de redirecionamento. Em **Authentication → Providers → Email**, confira se o cadastro por e-mail está habilitado e se a confirmação de e-mail está conforme seu teste.

## Supabase

Esta versão aponta para `iounzzyaoxxjlnixudnn`. Conforme o histórico do pacote, a migração e a função `dorath-p1` já foram aplicadas nesse projeto em 28/09/2026. A integração com GitHub/Cloudflare **não publica alterações em `supabase/`** por si só. Quando o motor ou o banco mudarem, publique essas alterações no Supabase antes de testar a nova versão do site.

`site/supabase-config.js` contém a URL e uma **chave pública publishable** para o navegador. Não coloque chaves secretas, `service_role`, senhas nem tokens no GitHub ou em `site/`. A Edge Function valida o usuário antes de acessar os dados da partida.

Opcionalmente, depois de conhecer o domínio definitivo, defina o segredo `DORATH_ALLOWED_ORIGIN` na Edge Function com a origem exata, sem barra final, e republique a função. O padrão atual permite `*` para os testes de implantação.

## Verificação local

Com Node.js instalado, execute `npm test` na raiz. Para abrir o site localmente, sirva `site/` por um servidor HTTP; a câmera QR requer HTTPS em celulares. O teste completo de login, confirmação de e-mail e partida entre celulares deve ocorrer na URL publicada.

## Artes pendentes

O pacote de origem continha `13_MATUSALEM.webp` e `17_CA.webp` com **zero byte**. Foram retirados deste repositório para não publicar arquivos inválidos. O motor ainda referencia esses nomes para Matusalém e Cam, mas a interface de playtest atual não exibe os retratos dos personagens. Adicione as artes homologadas posteriormente nesses caminhos, preservando os nomes indicados em `supabase/functions/dorath-p1/characters-data.js`.
