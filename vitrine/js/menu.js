/* Menu com painéis: monta o conteúdo de cada item. A abertura ao passar o mouse é só CSS (css/menu.css).
   Itens com `moment` levam direto ao momento do dia correspondente (linha do tempo de #recursos). */
(() => {
  const nav = document.getElementById("nav");

  /* conteúdo dos painéis, na mesma ordem das seções da página */
  const MENU = {
    recursos: {
      label: "Recursos",
      cols: [
        { t: "Rotina", d: "Treino, dieta e hábitos no mesmo app.", items: [
          { t: "Treino inteligente", d: "Última carga, séries e próxima carga sugerida.", href: "#recursos", moment: "treino" },
          { t: "Dieta e macros", d: "Meta calórica, Tabela TACO e lista de compras.", href: "#recursos", moment: "dieta" },
          { t: "Hidratação e sono", d: "Copos de água e horas dormidas na semana.", href: "#recursos", moment: "agua" },
        ] },
        { t: "Constância", d: "Hábito e comunidade para voltar todo dia.", items: [
          { t: "Streak com folga", d: "Um dia de folga por semana não zera a sequência.", href: "#recursos", moment: "streak" },
          { t: "Comunidade", d: "Feed, clubes e desafios coletivos.", href: "#recursos", moment: "social" },
          { t: "Corrida e caminhada", d: "Ritmo e distância registrados.", href: "#recursos", moment: "corrida" },
        ] },
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
    },
  };

  const momentAttr = (i) => (i.moment ? ` data-moment="${i.moment}"` : "");
  const renderMega = (m) => {
    const cols = m.cols.map((c) => `
      <div class="mega-col"><h5>${c.t}</h5><p>${c.d}</p>
        ${c.items.map((i) => `<a class="mi" href="${i.href}"${momentAttr(i)}><b>${i.t}</b><span>${i.d}</span></a>`).join("")}
      </div>`).join("");
    return `<div class="mega" role="region" aria-label="${m.label}"><div class="mega-card">${cols}</div></div>`;
  };

  document.querySelectorAll(".nav-item").forEach((item) => {
    const m = MENU[item.dataset.menu];
    if (m) item.insertAdjacentHTML("beforeend", renderMega(m));
  });

  /* o painel começa na borda esquerda do item; se não couber à direita, é empurrado para dentro da tela */
  const posicionar = (item) => {
    const mega = item.querySelector(".mega");
    if (!mega) return;
    const largura = Math.min(700, innerWidth - 32);
    const esquerda = item.getBoundingClientRect().left;
    const ajustada = Math.max(16, Math.min(esquerda, innerWidth - largura - 16));
    mega.style.setProperty("--mx", `${(ajustada - esquerda).toFixed(1)}px`);
  };
  document.querySelectorAll(".nav-item").forEach((item) => {
    ["pointerenter", "focusin"].forEach((ev) => item.addEventListener(ev, () => posicionar(item)));
  });

  /* clique em um link: vai ao momento certo, fecha o painel */
  const closeMega = () => {
    nav.classList.add("closing");
    setTimeout(() => nav.classList.remove("closing"), 700);
  };
  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#']");
    if (!a) return;
    if (a.dataset.moment && typeof window.goMoment === "function") {
      e.preventDefault();
      window.goMoment(a.dataset.moment);
    }
    if (a.closest(".mega")) closeMega();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeMega();
    document.activeElement?.blur?.();
  });
})();
