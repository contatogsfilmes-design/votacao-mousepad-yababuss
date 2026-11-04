# Votação do mousepad YabaBuss

Página de votação para celular, com os 5 modelos. O site é estático, no GitHub Pages, e os votos ficam no Firestore.

- Link: https://contatogsfilmes-design.github.io/votacao-mousepad-yababuss/
- A votação fica fechada enquanto `firebase-config.js` tiver `null`.
- Regras de segurança do banco: `firestore.rules`.
- Quem votou em quê: console do Firebase, Firestore, coleção `nomes`. Os nomes não aparecem na página, que mostra só os totais.
- Cada aparelho vota uma vez. Quem limpar o navegador ou trocar de aparelho consegue votar de novo, então confira nomes repetidos na coleção `nomes` antes de fechar o resultado.
