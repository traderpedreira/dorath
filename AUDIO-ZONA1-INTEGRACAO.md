# Dorath — Integração sonora experimental Zona 1 (v2.0)

Esta branch acrescenta controles locais de áudio ao playtest existente, sem alterar a Edge Function, o Supabase, regras, movimento, atributos, missões, Marcos ou Rupturas.

## Assets obrigatórios ainda não publicados nesta branch

Copiar os arquivos de áudio do pacote **Dorath_Zona1_Biblioteca_v2_Gravacoes_Naturais.zip** para:

`sites/audio/period-01/zone-01/ambience/`
- eden_field_stream_crickets.ogg / .m4a
- eden_field_forest.ogg / .m4a
- eden_tension.ogg / .m4a
- eden_postfall.ogg / .m4a

`sites/audio/period-01/zone-01/stingers/`
- stinger_command.ogg / .m4a
- stinger_eve.ogg / .m4a
- stinger_fall.ogg / .m4a

Arquivos binários ainda não foram enviados pelo conector GitHub disponível. **A branch não está pronta para merge/publicação até os arquivos serem adicionados e testados**.

## Integração

- Cada jogador ativa o áudio por interação explícita no navegador.
- Volume, ambiente e efeitos possuem controles separados.
- A mixagem local acompanha a posição do próprio jogador.
- Marcos 6 e 10 acompanham o registro coletivo em `view.marcos`.
- A Ruptura da casa 12 acompanha `view.rupturesResolved.R12`, do Master v1.5, sem mexer na mecânica.
- Um evento já existente no primeiro snapshot não é reproduzido retroativamente.
- O efeito da Ruptura não se repete; após sua conclusão a paisagem anterior não retorna.
- Modo silencioso é fallback e o jogo continua normalmente.

## Pendências de validação

1. Upload dos binários licenciados, confirmar origens/licenças.
2. Testar reprodução Opus/AAC em iOS/Safari e Android/Chrome.
3. Verificar emendas dos loops e volume da mixagem com diferentes aparelhos.
4. Testar coletivo: 1º jogador ativa R12, demais jogadores, reconexão e sessão retomada.
5. Testar áudio suspenso no segundo plano.
6. Se os testes mostrarem atraso/sobreposição, ajustar os fades no controlador antes do merge.
7. Validar JavaScript no navegador e testes existentes do motor.

Esta branch é uma preparação técnica; não declarar áudio funcional ou homologado antes desses testes.
