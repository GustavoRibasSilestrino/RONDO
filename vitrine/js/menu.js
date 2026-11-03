/* Menu com painéis: monta o conteúdo de cada item e cuida do menu no celular.
   A abertura ao passar o mouse é feita só com CSS (css/menu.css). */
(() => {
  const nav = document.getElementById("nav");

  const wave = (n) =>
    Array.from({ length: n }, (_, i) => {
      const h = Math.min(18 + Math.abs(Math.sin(i * 1.7) * 52) + ((i * 37) % 22), 100);
      return `<i style="--h:${h}%"></i>`;
    }).join("");
  const dateIn = (days) => new Date(Date.now() + days * 864e5).toLocaleDateString("pt-BR");

  /* mini visuais usados nos cartões da direita de cada painel */
  const PV = {
    sets: () => `<div class="r"><span>80 kg × 8</span><u class="on"></u></div><div class="r"><span>82,5 kg × 8</span><u class="on"></u></div><div class="r"><span>82,5 kg × 8</span><u></u></div><span class="tip">PRÓXIMA CARGA: 85 KG</span>`,
    ring: () => `<div class="ring" style="--p:62"><b>930<small>kcal</small></b></div><div class="macs"><div class="bar"><i style="width:60%"></i></div><div class="bar e"><i style="width:55%"></i></div><div class="bar g"><i style="width:48%"></i></div></div>`,
    wave: () => `<div class="wave">${wave(30)}</div><span class="tip">0:42 · MÁX. 1:00</span>`,
    delivery: () => `<div class="big">90<small>dias</small></div><span class="tip">ENTREGA EM ${dateIn(90)}</span>`,
    rm: () => `<div class="big">101<small>kg · 1RM</small></div><span class="tip">80 KG × 8 REPETIÇÕES</span>`,
    kcal: () => `<div class="big">2.724<small>kcal por dia</small></div><span class="tip">MIFFLIN-ST JEOR</span>`,
    podium: () => `<i style="height:62%"></i><i style="height:92%"></i><i style="height:48%"></i>`,
    club: () => `<div class="row"><span>Hipertrofia iniciantes · 370/500</span><div class="bar e"><i style="width:74%"></i></div></div><div class="row"><span>Corrida de rua · 1.280 km</span><div class="bar"><i style="width:52%"></i></div></div>`,
    seal: () => `<span class="badge">● Registro conferido · CRN</span><div class="big" style="font-size:1.25rem">Dra. Ana Costa</div><span class="tip">NUTRIÇÃO ESPORTIVA · ONLINE</span>`,
    pro: () => `<div class="r"><span>Marina</span><em>novo recorde</em></div><div class="r"><span>Lucas</span><em>sem registro há 3 dias</em></div><div class="r"><span>Bia</span><em>estagnou</em></div>`,
    pricePro: () => `<div class="big">R$ 14,90<small>/mês</small></div><span class="tip">RANKING · CLUBES VIP · RECADOS</span>`,
    priceProf: () => `<div class="big">R$ 59<small>/mês</small></div><span class="tip">PERFIL VERIFICADO · 25 ALUNOS</span>`,
  };

  /* conteúdo dos painéis, na mesma ordem das seções da página */
  const MENU = {
    recursos: {
      label: "Recursos",
      cols: [
        { t: "Rotina", d: "Treino, dieta e hábitos no mesmo app.", items: [
          { t: "Treino inteligente", d: "Última carga, séries e próxima carga sugerida.", href: "#recursos", tab: "treino" },
          { t: "Dieta e macros", d: "Meta calórica, Tabela TACO e lista de compras.", href: "#recursos", tab: "dieta" },
          { t: "Hidratação e sono", d: "Copos de água e horas dormidas na semana.", href: "#recursos", tab: "agua" },
        ] },
        { t: "Constância", d: "Hábito e comunidade para voltar todo dia.", items: [
          { t: "Streak com folga", d: "Um dia de folga por semana não zera a sequência.", href: "#recursos", tab: "streak" },
          { t: "Comunidade", d: "Feed, clubes e desafios coletivos.", href: "#recursos", tab: "social" },
          { t: "Corrida e caminhada", d: "Ritmo e distância registrados.", href: "#recursos", tab: "corrida" },
        ] },
      ],
      previews: [
        { kind: "sets", t: "Treino inteligente", d: "Registre cada série e veja a próxima carga.", href: "#recursos", tab: "treino" },
        { kind: "ring", t: "Macros e dieta", d: "Meta e refeições no mesmo painel.", href: "#recursos", tab: "dieta" },
      ],
    },
    recado: {
      label: "Recado de voz",
      cols: [
        { t: "Voz", d: "Um diário falado, sem escrever nada.", items: [
          { t: "Pergunta do dia", d: "Uma pergunta simples, respondida em áudio.", href: "#recado" },
          { t: "Recado para o futuro", d: "Grave hoje e ouça daqui a 90 dias.", href: "#recado" },
        ] },
        { t: "Memória", d: "Sua evolução contada pela sua voz.", items: [
          { t: "Seu ano em áudio", d: "Retrospectiva para compartilhar nos stories.", href: "#recado" },
          { t: "Privacidade", d: "Criptografado e privado por padrão.", href: "#recado" },
        ] },
      ],
      previews: [
        { kind: "wave", t: "Pergunta do dia", d: "Responda falando, em até um minuto.", href: "#recado" },
        { kind: "delivery", t: "Recado para o futuro", d: "Seu eu do futuro vai te ouvir.", href: "#recado" },
      ],
    },
    ferramentas: {
      label: "Ferramentas",
      cols: [
        { t: "Cálculos", d: "A matemática do app, aberta para testar.", items: [
          { t: "Força estimada (1RM)", d: "Epley: carga × (1 + repetições ÷ 30).", href: "#ferramentas" },
          { t: "Meta calórica", d: "Mifflin-St Jeor com piso de segurança.", href: "#ferramentas" },
        ] },
        { t: "Constância", d: "Veja as regras funcionando.", items: [
          { t: "Streak interativo", d: "Clique nos dias e veja a sequência reagir.", href: "#constancia" },
          { t: "Pontos do ranking", d: "Treino, refeições, check-in e meta de água.", href: "#constancia" },
        ] },
      ],
      previews: [
        { kind: "rm", t: "Força estimada", d: "Compare cargas diferentes na mesma escala.", href: "#ferramentas" },
        { kind: "kcal", t: "Meta calórica", d: "Ajustada ao seu objetivo e rotina.", href: "#ferramentas" },
      ],
    },
    clube: {
      label: "Clube PRO",
      cols: [
        { t: "Competição", d: "Constância vira conquista.", items: [
          { t: "Ranking semanal", d: "Mede constância, nunca aparência.", href: "#clube" },
          { t: "Prêmios mensais", d: "Marcas parceiras para assinantes PRO.", href: "#clube" },
        ] },
        { t: "Juntos", d: "Metas coletivas e comunidade.", items: [
          { t: "Clubes e desafios", d: "O clube soma treinos rumo à meta do mês.", href: "#clube" },
          { t: "Antitrapaça", d: "Limites diários, foto obrigatória e denúncia.", href: "#clube" },
        ] },
      ],
      previews: [
        { kind: "podium", t: "Ranking da semana", d: "Quem foi mais constante.", href: "#clube" },
        { kind: "club", t: "Desafio do clube", d: "Metas coletivas com prêmios.", href: "#clube" },
      ],
    },
    profissionais: {
      label: "Profissionais",
      cols: [
        { t: "Quem acompanha", d: "Cada um prescreve só o que a profissão permite.", items: [
          { t: "Nutricionistas (CRN)", d: "Cardápio, metas e painel de alunos.", href: "#profissionais" },
          { t: "Educadores físicos (CREF)", d: "Treino, recordes e alertas de estagnação.", href: "#profissionais" },
        ] },
        { t: "Confiança", d: "Só aparece na busca quem foi conferido.", items: [
          { t: "Registro conferido", d: "Selo após consulta pública ao conselho.", href: "#profissionais" },
          { t: "Como funciona", d: "Cadastro, conferência, selo e painel.", href: "#profissionais" },
        ] },
      ],
      previews: [
        { kind: "seal", t: "Selo de verificação", d: "Registro conferido no conselho.", href: "#profissionais" },
        { kind: "pro", t: "Painel de alunos", d: "Quem está sem registrar e quem bateu recorde.", href: "#profissionais" },
      ],
    },
    planos: {
      label: "Planos",
      cols: [
        { t: "Para você", d: "Grátis para começar, PRO para ir além.", items: [
          { t: "Grátis", d: "Treino, dieta, água, streak e feed.", href: "#planos" },
          { t: "PRO · R$ 14,90", d: "Ranking com prêmios e recados ilimitados.", href: "#planos" },
        ] },
        { t: "Profissionais", d: "Para quem acompanha alunos pelo app.", items: [
          { t: "Profissional · R$ 59", d: "Perfil verificado, até 25 alunos e painel.", href: "#planos" },
          { t: "Profissional+ · R$ 99", d: "Alunos ilimitados e rascunhos por IA.", href: "#planos" },
        ] },
      ],
      previews: [
        { kind: "pricePro", t: "Yesteryou PRO", d: "Constância com prêmios.", href: "#planos" },
        { kind: "priceProf", t: "Plano Profissional", d: "Capte e acompanhe alunos.", href: "#planos" },
      ],
    },
  };

  const tabAttr = (o) => (o.tab ? ` data-tab-open="${o.tab}"` : "");
  const renderMega = (m) => {
    const cols = m.cols.map((c) => `
      <div class="mega-col"><h5>${c.t}</h5><p>${c.d}</p>
        ${c.items.map((i) => `<a class="mi" href="${i.href}"${tabAttr(i)}><b>${i.t}</b><span>${i.d}</span></a>`).join("")}
      </div>`).join("");
    const cards = m.previews.map((p) => `
      <a class="pv-card" href="${p.href}"${tabAttr(p)}>
        <div class="pv pv-${p.kind}">${PV[p.kind]()}</div><b>${p.t}</b><p>${p.d}</p>
      </a>`).join("");
    return `<div class="mega" role="region" aria-label="${m.label}"><div class="mega-card">${cols}<div class="mega-previews">${cards}</div></div></div>`;
  };

  document.querySelectorAll(".nav-item").forEach((item) => {
    const m = MENU[item.dataset.menu];
    if (m) item.insertAdjacentHTML("beforeend", renderMega(m));
  });

  /* clique em qualquer link: abre a aba certa, fecha o painel e o menu do celular */
  const closeMega = () => {
    nav.classList.add("closing");
    setTimeout(() => nav.classList.remove("closing"), 700);
  };
  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#']");
    if (!a) return;
    if (a.dataset.tabOpen && typeof window.openTab === "function") window.openTab(a.dataset.tabOpen);
    if (a.closest(".mega")) closeMega();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeMega();
    document.activeElement?.blur?.();
  });
})();
