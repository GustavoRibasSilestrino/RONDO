/* A primeira tela aparece antes de o site inteiro carregar.
   O site é montado por JavaScript; até ele chegar e rodar, a página ficava preta. Este arquivo, pequeno e carregado antes do
   resto, põe a seção do topo (só o fundo, com a foto) no lugar assim que a página abre: o estilo já basta para desenhá-la.
   Quando o site monta, o React troca esta casca pela tela de verdade, igual, e o título entra por cima.
   Só na página principal: a loja, a tela de entrar e as páginas legais têm outro começo.
   É um arquivo à parte (e não um script dentro do index.html) porque a política de conteúdo do site só aceita scripts do
   próprio endereço. O nome tem número porque /assets fica um ano no cache: mudou o arquivo, mude o número aqui e no index.html. */
(function () {
  var raiz = document.getElementById("root");
  if (!raiz || raiz.firstChild) return;
  if (location.pathname.replace(/\/+$/, "") !== "") return;
  raiz.innerHTML = '<section class="hero" aria-hidden="true"></section>';
})();
