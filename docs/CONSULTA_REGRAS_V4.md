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
- `DORATH_Livro_de_Regras_P1_v3.1.pdf` (versão de 17/10/2026).

**IMPORTANTE:** os PDFs/imagens ainda não foram incorporados nesta branch. O leitor mostra aviso de arquivo indisponível enquanto eles não estiverem presentes. **Não fazer merge/produção antes de incorporar e validar os quatro recursos.** A branch foi mantida isolada para evitar publicação parcial.

## Verificação antes do merge
1. Abrir Mais e confirmar Regras junto aos extras, sem aparecer entre os oito botões principais no estado normal.
2. Abrir Jogar e confirmar o botão ! e seu fechamento.
3. Percorrer as 3 cartas, ampliar/rolar e consultar o PDF.
4. Trocar abas e repetir; nenhum estado do jogo ou Supabase deve mudar.
5. Verificar celular e desktop, console sem erros e retorno à partida.
