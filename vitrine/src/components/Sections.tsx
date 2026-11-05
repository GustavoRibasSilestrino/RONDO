import { CadastroProfissional, CriarConta } from "./Cadastro";
import { Btn, Mark, Reveal, Section, Spot, Title } from "./ui";

/* ---------- clube ---------- */
const POD = [
  { cls: "p2", ini: "TS", bg: "#4c1d95", nome: "Tiago", pts: 905, pos: 2 },
  { cls: "p1", ini: "BA", bg: "#7c3aed", nome: "Bia", pts: 940, pos: 1 },
  { cls: "p3", ini: "LP", bg: "#6d28d9", nome: "Lucas", pts: 870, pos: 3 },
];
const Progress = ({ nome, chip, w, tone }: { nome: string; chip: string; w: number; tone?: string }) => (
  <div>
    <div className="s-row"><b>{nome}</b><span className="chip">{chip}</span></div>
    <div className={`bar${tone ? ` ${tone}` : ""}`} style={{ height: 10 }}><i style={{ width: `${w}%` }} /></div>
  </div>
);

export function Clube() {
  return (
    <Section id="clube" tone="tint-2" ecg={4}>
      <div className="wrap">
        <Reveal className="section-head">
          <Title parts="Constância vira conquista." />
          <p className="lead">Cada treino registrado sobe o assinante no ranking semanal e dispara a disputa dos prêmios do mês. O ranking mede constância, nunca peso perdido ou aparência.</p>
        </Reveal>
        <div className="rank-grid">
          <Reveal className="panel">
            <Spot />
            <h3>Ranking da semana</h3>
            <span className="s-sub">Clube geral · assinantes PRO</span>
            <div className="podium">
              {POD.map((p) => (
                <div className={`pod ${p.cls}`} key={p.ini}>
                  <div><div className="avatar" style={{ background: p.bg }}>{p.ini}</div><b>{p.nome}</b></div>
                  <div><span>{p.pts}</span><div className="pos">{p.pos}</div></div>
                </div>
              ))}
            </div>
            <div className="rk"><span className="pos">4</span><span className="nm">Camila Duarte</span><span className="pt">842</span></div>
            <div className="rk"><span className="pos">5</span><span className="nm">Rafa Lima</span><span className="pt">801</span></div>
            <div className="rk me"><span className="pos">8</span><span className="nm"><b>Você</b></span><span className="pt">720</span></div>
          </Reveal>

          <Reveal className="panel">
            <Spot />
            <h3>Clubes e desafios</h3>
            <span className="s-sub">Metas coletivas com prêmios de marcas parceiras</span>
            <div style={{ marginTop: "1.6rem", display: "grid", gap: "1.4rem" }}>
              <Progress nome="Hipertrofia iniciantes" chip="370 / 500" w={74} tone="e" />
              <Progress nome="Corrida de rua" chip="1.280 km" w={52} />
              <Progress nome="Academia do bairro" chip="318 membros" w={31} tone="g" />
            </div>
            <div className="rule"><b>Antitrapaça:</b> limite de pontos por dia, duração mínima de treino, foto obrigatória para pontuar no ranking com prêmio e denúncia pela comunidade.</div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

/* ---------- profissionais ---------- */
const PROS = [
  { ini: "N", bg: "var(--violet-d)", titulo: "Nutricionistas", selo: "Registro CRN conferido", itens: ["Montam cardápio e metas", "Veem quem está sem registrar", "Rascunhos de ajuste, aprovados por eles"], sim: "dieta", nao: "treino" },
  { ini: "E", bg: "var(--violet)", titulo: "Educadores físicos", selo: "Registro CREF conferido", itens: ["Montam o treino do aluno", "Veem recordes e estagnação", "Chat direto com quem acompanham"], sim: "treino", nao: "dieta" },
];
const STEPS = [
  ["Cadastro", "Número do CRN ou CREF e foto da cédula."],
  ["Conferência", "Consulta pública do conselho. A foto é apagada depois."],
  ["Selo", "\"Registro conferido\" e entrada na aba Profissionais."],
  ["Painel", "Alunos, planos e alertas em um só lugar."],
];

export function Profissionais() {
  return (
    <Section id="profissionais" ecg={5}>
      <div className="wrap">
        <Reveal className="section-head">
          <Title parts="Quem acompanha você tem registro conferido." />
          <p className="lead">Nutricionistas e profissionais de Educação Física entram na mesma rede, com selo depois de conferido o registro no conselho. Sem selo, não aparecem na busca.</p>
        </Reveal>
        <div className="pro-grid">
          {PROS.map((p) => (
            <Reveal as="article" className="pro" key={p.ini}>
              <Spot />
              <header><div className="avatar" style={{ background: p.bg }}>{p.ini}</div><div><h3>{p.titulo}</h3><span className="seal">● {p.selo}</span></div></header>
              <ul>{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>
              <p className="can"><b>Prescreve:</b> {p.sim}. <b>Não prescreve:</b> {p.nao}.</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="steps">
          {STEPS.map(([t, d]) => <div className="step" key={t}><b>{t}</b><p>{d}</p></div>)}
        </Reveal>
        <Reveal><CadastroProfissional /></Reveal>
      </div>
    </Section>
  );
}

/* ---------- planos ---------- */
const PLANS = [
  { nome: "Grátis", preco: "R$ 0", per: "", itens: ["Treino, dieta e água", "Streak e check-ins", "Feed e clubes", "Um recado por dia e um para o futuro por vez"], cta: "Começar", kind: "ghost" as const },
  { nome: "PRO", preco: "R$ 14,90", per: " /mês", itens: ["Ranking com prêmios mensais", "Clubes VIP", "Estatísticas completas", "Recados para o futuro sem limite", "Seu ano em áudio completo"], cta: "Quero o PRO", kind: "primary" as const, hot: true },
  { nome: "Profissional", preco: "R$ 59", per: " /mês", itens: ["Perfil verificado na busca", "Até 25 alunos", "Planos, painel e chat", "Profissional+ (R$ 99): ilimitado"], cta: "Cadastrar perfil", kind: "ghost" as const, href: "#cadastro-profissional" },
];

export function Planos() {
  return (
    <Section id="planos" tone="tint" ecg={6}>
      <div className="wrap">
        <Reveal className="section-head"><Title parts="Grátis para começar. PRO para ir além." /></Reveal>
        <div className="plans">
          {PLANS.map((p) => (
            <Reveal as="article" className={`plan${p.hot ? " hot" : ""}`} key={p.nome}>
              <Spot />
              <h3>{p.nome}</h3>
              <div className="price">{p.preco}{p.per && <small>{p.per}</small>}</div>
              <ul>{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>
              <Btn href={p.href ?? "#entrar"} kind={p.kind}>{p.cta}</Btn>
            </Reveal>
          ))}
        </div>
        <p className="fine">Valores sugeridos, sujeitos a confirmação antes do lançamento.</p>
      </div>
    </Section>
  );
}

/* ---------- perguntas ---------- */
const FAQ = [
  ["O RONDO substitui treinador ou nutricionista?", "Não. O app organiza o plano, facilita os registros e mantém a evolução visível. A avaliação individual continua sendo do profissional."],
  ["Meus dados de saúde ficam públicos?", "Não. Peso, medidas e fotos corporais são privados por padrão. Você escolhe o que publicar, e o profissional só vê os dados de quem aceitou o acompanhamento."],
  ["Quem escuta os meus recados de voz?", "Só você. Os áudios ficam em armazenamento criptografado, nada é público por padrão e você pode apagar tudo a qualquer momento. O recado é um diário, não um serviço de terapia."],
  ["E se eu perder um dia de treino?", "O streak tem um dia de folga por semana. Uma falha não zera sua sequência."],
  ["O ranking premia quem emagrece mais?", "Nunca. O ranking mede constância: treino registrado, refeições, check-ins e meta de água."],
  ["Nutricionistas podem participar dos prêmios?", "Não. Seguindo as regras do conselho, nutricionistas não participam de sorteios nem dos prêmios do ranking."],
];

export function Faq() {
  return (
    <Section id="faq" ecg={7}>
      <div className="wrap faq">
        <Reveal className="section-head"><Title parts="O que você precisa saber." /></Reveal>
        {FAQ.map(([q, a]) => <Reveal as="details" key={q}><summary>{q}</summary><p>{a}</p></Reveal>)}
      </div>
    </Section>
  );
}

/* ---------- chamada final ---------- */
export function Entrar() {
  return (
    <section className="wrap" id="entrar">
      <Reveal className="cta-final">
        <Title parts="Amanhã você vai querer ter começado hoje." />
        <p className="lead">Crie a sua conta e entre no app com o mesmo e-mail.</p>
        <CriarConta />
      </Reveal>
    </section>
  );
}

/* ---------- rodapé ---------- */
export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <a href="#" className="logo" aria-label="RONDO"><Mark /></a>
            <p style={{ marginTop: ".7rem" }}>Compita com quem você foi ontem.</p>
          </div>
          <nav className="footer-links" aria-label="Rodapé"><a href="#recursos">Recursos</a><a href="#recado">Recado de voz</a><a href="#profissionais">Profissionais</a><a href="#planos">Planos</a></nav>
          <nav className="footer-links" aria-label="Legal"><a href="#faq">Perguntas</a><a href="#">Termos</a><a href="#">Privacidade</a></nav>
        </div>
        <p className="disclaimer">O RONDO organiza e acompanha, mas não substitui avaliação profissional. O recado de voz é um diário, não um serviço de terapia. Sugestões geradas por IA são sempre sugestões, nunca prescrição.</p>
      </div>
    </footer>
  );
}
