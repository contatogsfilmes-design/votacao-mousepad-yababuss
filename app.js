(function () {
  "use strict";
  var MODELOS = [
    { id: "assinatura", nome: "Assinatura", txt: "Fundo chumbo, só com a logo no canto. O mais discreto." },
    { id: "simbolo-gigante", nome: "Símbolo gigante", txt: "Fundo claro com o símbolo grande e suave à direita." },
    { id: "padrao", nome: "Padrão", txt: "Fundo preto com o símbolo repetido em tom discreto." },
    { id: "organismo", nome: "Organismo", txt: "Uma rede de hexágonos cresce a partir de um núcleo claro." },
    { id: "colmeia", nome: "Colmeia", txt: "Hexágonos cobrem o mousepad inteiro, com cinco células claras." }
  ];
  var el = function (id) { return document.getElementById(id); };
  var nomeDe = function (id) { var m = MODELOS.filter(function (x) { return x.id === id; })[0]; return m ? m.nome : ""; };
  var escolhido = null, db = null, uid = null, pronto = false;

  function foto(src, alt, classe, largura, altura, rotulo) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "foto " + classe; b.setAttribute("aria-label", "Ampliar: " + alt);
    var i = document.createElement("img");
    i.src = src; i.alt = alt; i.width = largura; i.height = altura; i.loading = "lazy"; i.decoding = "async";
    var s = document.createElement("small"); s.textContent = rotulo;
    b.appendChild(i); b.appendChild(s);
    b.addEventListener("click", function () { el("zoom-img").src = src; el("zoom-img").alt = alt; el("zoom").showModal(); });
    return b;
  }

  MODELOS.forEach(function (m, n) {
    var a = document.createElement("article"); a.className = "modelo";
    var cab = document.createElement("div"); cab.className = "cab";
    var num = document.createElement("span"); num.textContent = "Modelo " + (n + 1);
    var h = document.createElement("h2"); h.textContent = m.nome;
    cab.appendChild(h); cab.appendChild(num);
    var p = document.createElement("p"); p.textContent = m.txt;
    a.appendChild(cab); a.appendChild(p);
    a.appendChild(foto("assets/" + m.id + "-mesa.jpg", "Mousepad " + m.nome + " sobre a mesa, com teclado e mouse", "", 1280, 720, "Ampliar"));
    var r = document.createElement("span"); r.className = "rot"; r.textContent = "Design que será impresso";
    a.appendChild(r);
    a.appendChild(foto("assets/" + m.id + "-arte.jpg", "Design do mousepad " + m.nome, "arte", 1600, 711, "Ampliar"));
    var l = document.createElement("label"); l.className = "escolher";
    var inp = document.createElement("input"); inp.type = "radio"; inp.name = "modelo"; inp.value = m.id;
    var t = document.createElement("span"); t.textContent = "Escolher " + m.nome;
    l.appendChild(inp); l.appendChild(t); a.appendChild(l);
    inp.addEventListener("change", function () { escolhido = m.id; atualizarBotao(); });
    el("modelos").appendChild(a);
  });

  function atualizarBotao() {
    var b = el("votar");
    if (!pronto) { b.disabled = true; b.textContent = escolhido ? "Votação ainda não abriu" : "Escolha um modelo"; return; }
    b.disabled = !escolhido;
    b.textContent = escolhido ? "Votar em " + nomeDe(escolhido) : "Escolha um modelo";
  }
  function aviso(txt) { var a = el("aviso"); a.textContent = txt; a.hidden = !txt; }
  function erro(txt) { var e = el("erro"); e.textContent = txt; e.hidden = !txt; }

  el("zoom-fechar").addEventListener("click", function () { el("zoom").close(); });
  el("cancelar").addEventListener("click", function () { el("folha").close(); });
  el("votar").addEventListener("click", function () {
    el("f-titulo").textContent = "Votar em " + nomeDe(escolhido);
    erro(""); el("folha").showModal(); el("nome").focus();
  });

  el("f-nome").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var nome = el("nome").value.trim().replace(/\s+/g, " ");
    if (nome.length < 2) { erro("Digite seu nome para confirmar o voto."); el("nome").focus(); return; }
    var b = el("confirmar"); b.disabled = true; b.textContent = "Enviando…"; erro("");
    var lote = db.batch();
    lote.set(db.collection("votos").doc(uid), { modelo: escolhido, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
    lote.set(db.collection("nomes").doc(uid), { nome: nome, modelo: escolhido });
    lote.commit().then(function () {
      el("folha").close(); mostrarResultado(escolhido, "Voto registrado");
    }).catch(function (e) {
      if (e && e.code === "permission-denied") {
        db.collection("votos").doc(uid).get().then(function (d) {
          if (d.exists) { el("folha").close(); mostrarResultado(d.data().modelo, "Você já votou"); }
          else { erro("Não foi possível registrar o voto. Confira o nome e tente de novo."); }
        }).catch(function () { erro("Não foi possível registrar o voto. Confira a internet e tente de novo."); });
      } else { erro("Não foi possível registrar o voto. Confira a internet e tente de novo."); }
    }).then(function () { b.disabled = false; b.textContent = "Confirmar voto"; });
  });

  var assinando = false;
  function mostrarResultado(meu, titulo) {
    el("votacao").hidden = true; el("topo").hidden = true; el("barra").hidden = true; el("resultado").hidden = false;
    document.body.style.paddingBottom = "32px";
    el("r-titulo").textContent = titulo;
    window.scrollTo(0, 0);
    if (assinando) return;
    assinando = true;
    db.collection("votos").onSnapshot(function (snap) {
      var c = {}; MODELOS.forEach(function (m) { c[m.id] = 0; });
      snap.forEach(function (d) { var k = d.data().modelo; if (k in c) c[k]++; });
      var total = snap.size;
      el("r-total").textContent = "Você escolheu " + nomeDe(meu) + ". " + total + (total === 1 ? " voto" : " votos") + " até agora.";
      var lista = el("lista"); lista.textContent = "";
      MODELOS.slice().sort(function (a, b) { return c[b.id] - c[a.id]; }).forEach(function (m) {
        var li = document.createElement("li"); li.className = "linha-r" + (m.id === meu ? " meu" : "");
        var t = document.createElement("div"); t.className = "t";
        var nb = document.createElement("b"); nb.textContent = m.nome;
        var pct = total ? Math.round(c[m.id] * 100 / total) : 0;
        var sp = document.createElement("span"); sp.textContent = pct + "% · " + c[m.id] + (c[m.id] === 1 ? " voto" : " votos");
        t.appendChild(nb); t.appendChild(sp);
        var tr = document.createElement("div"); tr.className = "trilho";
        var br = document.createElement("i"); br.style.width = pct + "%"; tr.appendChild(br);
        li.appendChild(t); li.appendChild(tr); lista.appendChild(li);
      });
    }, function () { el("r-total").textContent = "Seu voto foi registrado, mas o resultado não carregou. Abra o link de novo para ver."; });
  }

  function iniciar() {
    if (!window.FIREBASE_CONFIG) { aviso("A votação abre em breve. Você já pode ver os modelos."); atualizarBotao(); return; }
    if (!window.firebase) { aviso("A votação não carregou. Confira a internet e abra o link de novo."); return; }
    firebase.initializeApp(window.FIREBASE_CONFIG);
    db = firebase.firestore();
    firebase.auth().signInAnonymously().then(function (cred) {
      uid = cred.user.uid;
      return db.collection("votos").doc(uid).get();
    }).then(function (d) {
      if (d.exists) { mostrarResultado(d.data().modelo, "Você já votou"); return; }
      pronto = true; atualizarBotao();
    }).catch(function () {
      aviso("A votação não carregou. Abra o link no Chrome ou no Safari e tente de novo.");
    });
  }
  iniciar();
})();
