(function () {
  "use strict";
  var MODELOS = [
    { id: "assinatura", nome: "Assinatura", txt: "Fundo chumbo, só com a logo no canto. O mais discreto." },
    { id: "simbolo-gigante", nome: "Símbolo gigante", txt: "Fundo claro com o símbolo grande e suave à direita." },
    { id: "padrao", nome: "Padrão", txt: "Fundo preto com o símbolo repetido em tom discreto." },
    { id: "organismo", nome: "Organismo", txt: "Uma rede de hexágonos cresce a partir de um núcleo claro." },
    { id: "colmeia", nome: "Colmeia", txt: "Hexágonos cobrem o mousepad inteiro, com cinco células claras." }
  ];
  var API = "https://textdb.dev/api/data/", GRUPOS = 16, GUARDADO = "voto-mousepad-yababuss";
  var el = function (id) { return document.getElementById(id); };
  var nomeDe = function (id) { var m = MODELOS.filter(function (x) { return x.id === id; })[0]; return m ? m.nome : ""; };
  var pessoa = "", escolhido = null;

  function chave(n) {
    return n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  function grupoDe(k) {
    var h = 0;
    for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
    return h % GRUPOS;
  }
  function url(g) { return API + window.VOTOS_BASE + "-" + g; }
  function ler(g) {
    return fetch(url(g), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("leitura");
      return r.text();
    }).then(function (t) { return t.trim() ? JSON.parse(t) : {}; });
  }
  function gravar(g, dados) {
    var corpo = JSON.stringify(dados).replace(/[\u0080-￿]/g, function (c) {
      return "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4);
    });
    return fetch(url(g), { method: "POST", headers: { "Content-Type": "text/plain" }, body: corpo }).then(function (r) {
      if (!r.ok) throw new Error("gravacao");
    });
  }
  function pausa(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function lembrar(v) { try { localStorage.setItem(GUARDADO, JSON.stringify(v)); } catch (e) {} }
  function lembrado() { try { return JSON.parse(localStorage.getItem(GUARDADO)); } catch (e) { return null; } }

  // Grava e confere. Se outra pessoa gravou no mesmo instante, tenta de novo.
  function registrar(nome, modelo) {
    var k = chave(nome), g = grupoDe(k);
    function tentar(n) {
      return ler(g).then(function (d) {
        if (d[k]) return { repetido: true, modelo: d[k].modelo };
        d[k] = { nome: nome, modelo: modelo, em: new Date().toISOString() };
        return gravar(g, d).then(function () { return pausa(500 + Math.random() * 500); }).then(function () { return ler(g); }).then(function (c) {
          if (c[k] && c[k].modelo === modelo) return { repetido: false, modelo: modelo };
          if (n <= 1) throw new Error("conflito");
          return pausa(300 + Math.random() * 1200).then(function () { return tentar(n - 1); });
        });
      });
    }
    return tentar(5);
  }

  function foto(src, alt, classe, largura, altura) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "foto " + classe; b.setAttribute("aria-label", "Ampliar: " + alt);
    var i = document.createElement("img");
    i.src = src; i.alt = alt; i.width = largura; i.height = altura; i.loading = "lazy"; i.decoding = "async";
    var s = document.createElement("small"); s.textContent = "Ampliar";
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
    a.appendChild(foto("assets/" + m.id + "-mesa.jpg", "Mousepad " + m.nome + " sobre a mesa, com teclado e mouse", "", 1280, 720));
    var r = document.createElement("span"); r.className = "rot"; r.textContent = "Design que será impresso";
    a.appendChild(r);
    a.appendChild(foto("assets/" + m.id + "-arte.jpg", "Design do mousepad " + m.nome, "arte", 1600, 711));
    var l = document.createElement("label"); l.className = "escolher";
    var inp = document.createElement("input"); inp.type = "radio"; inp.name = "modelo"; inp.value = m.id;
    var t = document.createElement("span"); t.textContent = "Escolher " + m.nome;
    l.appendChild(inp); l.appendChild(t); a.appendChild(l);
    inp.addEventListener("change", function () {
      escolhido = m.id; erroVoto("");
      el("votar").disabled = false; el("votar").textContent = "Votar em " + m.nome;
    });
    el("modelos").appendChild(a);
  });

  function erroEntrada(t) { el("erro-entrada").textContent = t; el("erro-entrada").hidden = !t; }
  function erroVoto(t) { el("erro-voto").textContent = t; el("erro-voto").hidden = !t; }

  el("zoom-fechar").addEventListener("click", function () { el("zoom").close(); });

  el("entrada").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var nome = el("nome").value.trim().replace(/\s+/g, " ");
    if (nome.length < 2) { erroEntrada("Digite seu nome para entrar."); el("nome").focus(); return; }
    var b = el("entrar"); b.disabled = true; b.textContent = "Entrando…"; erroEntrada("");
    var k = chave(nome);
    ler(grupoDe(k)).then(function (d) {
      if (d[k]) { lembrar({ nome: d[k].nome, modelo: d[k].modelo }); mostrarResultado(d[k].nome, d[k].modelo, "Esse nome já votou"); return; }
      pessoa = nome;
      el("capa").hidden = true; el("votacao").hidden = false; el("barra").hidden = false;
      el("ola").textContent = "Olá, " + nome + ". Escolha seu modelo.";
      window.scrollTo(0, 0);
    }).catch(function () {
      erroEntrada("Não foi possível entrar. Confira a internet e tente de novo.");
    }).then(function () { b.disabled = false; b.textContent = "Entrar"; });
  });

  el("votar").addEventListener("click", function () {
    var b = el("votar"), texto = b.textContent;
    b.disabled = true; b.textContent = "Enviando seu voto…"; erroVoto("");
    registrar(pessoa, escolhido).then(function (r) {
      lembrar({ nome: pessoa, modelo: r.modelo });
      mostrarResultado(pessoa, r.modelo, r.repetido ? "Esse nome já votou" : "Voto registrado");
    }).catch(function () {
      erroVoto("Seu voto não foi registrado. Confira a internet e tente de novo.");
      b.disabled = false; b.textContent = texto;
    });
  });

  var atual = null;
  function carregarPlacar() {
    var pedidos = [];
    for (var g = 0; g < GRUPOS; g++) pedidos.push(ler(g));
    el("atualizar").disabled = true;
    return Promise.all(pedidos).then(function (grupos) {
      var c = {}, total = 0;
      MODELOS.forEach(function (m) { c[m.id] = 0; });
      grupos.forEach(function (d) { Object.keys(d).forEach(function (k) { if (d[k] && d[k].modelo in c) { c[d[k].modelo]++; total++; } }); });
      el("r-total").textContent = atual.nome + ", seu voto é " + nomeDe(atual.modelo) + ". " + total + (total === 1 ? " voto" : " votos") + " até agora.";
      var lista = el("lista"); lista.textContent = "";
      MODELOS.slice().sort(function (a, b) { return c[b.id] - c[a.id]; }).forEach(function (m) {
        var li = document.createElement("li"); li.className = "linha-r" + (m.id === atual.modelo ? " meu" : "");
        var t = document.createElement("div"); t.className = "t";
        var nb = document.createElement("b"); nb.textContent = m.nome;
        var pct = total ? Math.round(c[m.id] * 100 / total) : 0;
        var sp = document.createElement("span"); sp.textContent = pct + "% · " + c[m.id] + (c[m.id] === 1 ? " voto" : " votos");
        t.appendChild(nb); t.appendChild(sp);
        var tr = document.createElement("div"); tr.className = "trilho";
        var br = document.createElement("i"); br.style.width = pct + "%"; tr.appendChild(br);
        li.appendChild(t); li.appendChild(tr); lista.appendChild(li);
      });
    }).catch(function () {
      el("r-total").textContent = atual.nome + ", seu voto é " + nomeDe(atual.modelo) + ". O placar não carregou. Toque em Atualizar para tentar de novo.";
    }).then(function () { el("atualizar").disabled = false; });
  }
  el("atualizar").addEventListener("click", carregarPlacar);

  function mostrarResultado(nome, modelo, titulo) {
    atual = { nome: nome, modelo: modelo };
    el("capa").hidden = true; el("votacao").hidden = true; el("barra").hidden = true; el("resultado").hidden = false;
    document.body.style.paddingBottom = "32px";
    el("r-titulo").textContent = titulo;
    window.scrollTo(0, 0);
    carregarPlacar();
  }

  var v = lembrado();
  if (v && v.nome && v.modelo) mostrarResultado(v.nome, v.modelo, "Você já votou");
})();
