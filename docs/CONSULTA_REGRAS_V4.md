# Consulta de regras — integração V4

Esta branch adiciona exclusivamente interface de consulta:
- Menu **Mais** → **Regras**.
- Botão circular **!** na aba **Jogar**.
- Janela modal com 3 cartões navegáveis e livro de regras.
- Sem mudanças em gameplay, Supabase ou motor.

## Conteúdo homologado a publicar

Copiar os documentos finais aprovados para estes nomes/caminhos no site:

- `sites/regras/guia-rapido-1.webp`
- `sites/regras/guia-rapido-2.webp`
- `sites/regras/guia-rapido-3.webp`
- `sites/regras/livro-de-regras.pdf`

Fontes documentais de referência:
- `DORATH_3_Cartas_Consulta_P1_v1.1.pdf` (extrair as 3 páginas como imagens sem alterar arte ou texto).
- `DORATH_Livro_de_Regras_P1_v3.2_2026-10-25.pdf` (versão de 25/10/2026).

**IMPORTANTE:** os PDFs/imagens ainda não foram incorporados nesta branch. O leitor mostra aviso de arquivo indisponível enquanto eles não estiverem presentes. **Não fazer merge/produção antes de incorporar e validar os quatro recursos.** A branch foi mantida isolada para evitar publicação parcial.

## Verificação antes do merge
1. Abrir Mais e confirmar Regras junto aos extras, sem aparecer entre os oito botões principais no estado normal.
2. Abrir Jogar e confirmar o botão ! e seu fechamento.
3. Percorrer as 3 cartas, ampliar/rolar e consultar o PDF.
4. Trocar abas e repetir; nenhum estado do jogo ou Supabase deve mudar.
5. Verificar celular e desktop, console sem erros e retorno à partida.

## Preparação dos arquivos em 25/10/2026

Arquivo entregue: `DORATH_Regras_V4_Arquivos_2026-10-25.zip`, com as três cartas oficiais v1.1 separadas em WebP e o PDF integral do Livro de Regras v3.2. O pacote já está organizado em `sites/regras/`. Os arquivos binários precisam ser adicionados à branch antes do merge; esta etapa ainda não está feita no GitHub. Não confundir preparação do ZIP com deploy ou homologação.
