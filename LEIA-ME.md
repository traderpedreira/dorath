# Dorath · Período 1 · Supabase v0.7.1 (Auth)

Pacote de integração do playtest com o **JSON Master P1 v1.2**, **Livro de Regras v2.0 (27/09/2026)**, 54 QR oficiais e cinco artes aprovadas de Consequências. A interface e o motor foram atualizados a partir da v0.5.1. A v0.6.0 anterior deve ser substituída por este pacote; partidas antigas não são migradas.

## Conteúdo

- `site/`: site estático para celulares. `index.html` abre o playtest, `multiplayer.js` contém a interface, `data/periodo-1-54-casas-P1-MASTER-v1.2.json` e `data/manifest.json` são as referências operacionais; `qr/` traz os 54 PNG do conjunto oficial.
- `supabase/migrations/`: tabelas Postgres, RLS e gravação atômica por revisão.
- `supabase/functions/dorath-p1/`: função de partida e motor de regras. A chave secreta fica somente na função.
- `tests/`: testes locais do motor (`npm test`).
- `DORATH_Livro_de_Regras_Periodo_1_v2.0_Consolidado_2026-09-27.docx`: manual de referência.

## Instalação

1. A migração e a Edge Function `dorath-p1` já foram aplicadas no projeto `iounzzyaoxxjlnixudnn` em 28/09/2026. Para recriar em outro projeto, ajuste a URL e a chave pública em `site/supabase-config.js`, aplique `supabase/migrations/20260928000000_dorath_p1.sql` e publique a função.
2. O site usa Supabase Auth por e-mail e senha. O formulário oferece criação de conta e entrada; confirme o e-mail caso o projeto exija. Depois de publicar **somente `site/`** em HTTPS, configure no Dashboard Supabase **Authentication → URL Configuration** a URL pública do site e a URL de redirecionamento exata de `multiplayer.html` para a confirmação por e-mail.
3. O HTML estático pode ser baixado por qualquer pessoa, mas a tela da partida só abre com login. A função verifica o JWT pelo Supabase Auth a cada chamada, vincula o token aleatório da partida ao usuário e recusa tokens de outra conta. `verify_jwt = false` no gateway é intencional: a função faz a validação com `auth.getUser` antes de acessar a partida. Nunca coloque a chave secreta no site.
4. Se o site já tiver URL definitiva, configure `DORATH_ALLOWED_ORIGIN` na função com essa origem exata (sem barra final) e faça novo deploy. Para testar com múltiplas origens, o padrão é `*`.
5. Crie uma **nova** Partida-Mãe. Tokens e estados da v0.5.1/v0.6.0 não são convertidos.

## O que esta build registra

- D6 físico para movimento desde o início, barreiras de Ruptura, Marcos por alcance/travessia, D4 individual ao parar e correção excepcional por código QR P1.
- 20 Missões comuns do Master com alvo D6 e recompensa D4; 16 Missões Secretas privadas com histórico de sorteio no aparelho e bônus final; conversões, negociações e doações.
- Cinco Consequências com D4 e duração, instrução de devolver a carta física ao fundo; Nefilins coletivos, primeira entrada em P1-380, chance de Escalada nas casas elegíveis e sequência D8→Decisor→D4→opção do Dominador.
- Entrada na Arca ao parar em P1-480 ou no fechamento de P1-500; D6 secreto de Preservação; sequência coletiva sem D6 até P1-540 e ranking apenas dos Preservados.
- Estado individual e coletivo salvo a cada ação confirmada, com revisão atômica para impedir que dois celulares sobrescrevam a mesma jogada. Atualização dos outros aparelhos a cada dois segundos.

## Limites de playtest

- As ocorrências numéricas de algumas **casas dinâmicas** ainda não estão especificadas pelo Master. O app mostra a família e o texto homologado da casa, oferece Missões elegíveis e executa seus gatilhos fixos; não inventa uma recompensa ou punição para uma casa cuja tabela ainda não foi definida.
- Na última preparação antes das Rupturas, Missão, conversão e passe estão operacionais. Propostas de negociação continuam disponíveis, mas a contagem estrita de uma única ação quando há aceite pendente exige validação em mesa.
- Custos, requisitos compostos e recompensas particulares das 20 Missões comuns são parametrizações de teste. Os testes D6 e a tabela D4 por dificuldade estão ativos, mas o balanceamento e algumas interações narrativas específicas exigem homologação em mesa.
- A Última Oportunidade P1-490 usa provisoriamente D6 ≥ 5 para conceder 1 Provisão, identificado como parâmetro de playtest na tela. O Master exige recuperação sem garantia, mas não fixa o alvo nem o ganho.
- A verificação de Missões Secretas usa contadores do app. Condições que dependem de uma interpretação de ajuda direta podem precisar de conferência manual na mesa. O histórico de sorteio local se perde se o navegador for apagado ou o aparelho trocado sem migração.
- A câmera QR usa `BarcodeDetector` quando o navegador suporta essa API; digitar o código lido pela câmera nativa é a alternativa. O QR não substitui o D6.
- A migração e a função foram publicadas e uma chamada anônima retornou HTTP 401. Ainda faltam publicação HTTPS do site, configuração do redirecionamento de e-mail, teste completo com contas reais e quatro celulares físicos, limite de uso para criação de partidas e política de limpeza de partidas antigas.
- As cinco artes de Consequências foram substituídas pelas aprovadas; as demais imagens herdadas da v0.5.1 precisam de conferência visual contra as últimas homologações físicas antes de impressão ou edição final.

O pacote inclui o código e os arquivos necessários para publicar, mas **não é uma versão final de produção**. Antes de uma sessão oficial, compare as artes físicas em uso com o manual v2.0, especialmente cartas antigas que ainda contenham “Legado”.
