import { CadastroProfissional } from "./Cadastro";
import { abrirPreferenciasCookies } from "../lib/consentimento";
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
    <Section id="clube" tone="tint-2">
      <div className="wrap">
        <Reveal className="section-head">
          <Title parts="Constância vira conquista." />
          <p className="lead">Cada treino registrado soma pontos de constância. O ranking mede constância, nunca peso perdido ou aparência. Hoje o app mostra a sua pontuação; o ranking entre assinantes e os prêmios do mês chegam em breve.</p>
        </Reveal>
        <div className="rank-grid">
          <Reveal className="panel">
            <Spot />
            <h3>Ranking da semana</h3>
            <span className="s-sub">Em breve · exemplo ilustrativo, com nomes e pontos fictícios</span>
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
            <span className="s-sub">Metas coletivas · exemplo ilustrativo, com números fictícios</span>
            <div style={{ marginTop: "1.6rem", display: "grid", gap: "1.4rem" }}>
              <Progress nome="Hipertrofia iniciantes" chip="370 / 500" w={74} tone="e" />
              <Progress nome="Corrida de rua" chip="1.280 km" w={52} />
              <Progress nome="Academia do bairro" chip="318 membros" w={31} tone="g" />
            </div>
            <div className="rule"><b>Regras previstas para o ranking com prêmio:</b> limite de pontos por dia, duração mínima de treino, foto para pontuar e denúncia pela comunidade. Ainda não há prêmios nem marcas parceiras.</div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

/* ---------- profissionais ---------- */
const PROS = [
  { ini: "N", bg: "var(--violet-d)", titulo: "Nutricionistas", selo: "Com registro no CRN", itens: ["Vão montar cardápio e metas", "Vão ver quem está sem registrar", "Ajustes sempre aprovados por eles"], sim: "dieta", nao: "treino" },
  { ini: "E", bg: "var(--violet)", titulo: "Educadores físicos", selo: "Com registro no CREF", itens: ["Vão montar o treino do aluno", "Vão ver recordes e estagnação", "Conversa direta com quem acompanham"], sim: "treino", nao: "dieta" },
];
const STEPS = [
  ["Cadastro", "Nome, e-mail, número do CRN ou CREF e UF. Nada além disso."],
  ["Conferência", "Nossa equipe confere o número na consulta pública do conselho."],
  ["Selo", "\"Registro conferido\" e entrada na busca do app (em breve)."],
  ["Painel", "Alunos, planos e alertas em um só lugar (em breve)."],
];

export function Profissionais() {
  return (
    <Section id="profissionais">
      <div className="wrap">
        <Reveal className="section-head">
          <Title parts="Quem vai acompanhar você terá registro conferido." />
          <p className="lead">O cadastro de nutricionistas e profissionais de Educação Física está aberto. Cada registro é conferido à mão na consulta pública do conselho antes de aparecer no app; sem a conferência, ninguém aparece na busca. O acompanhamento pelo app chega em breve.</p>
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
  { nome: "PRO", preco: "R$ 14,90", per: " /mês", itens: ["Recados para o futuro sem limite", "Estatísticas completas", "Clubes VIP", "Ranking com prêmios (quando o ranking abrir)"], cta: "Criar conta grátis", kind: "primary" as const, hot: true, breve: true },
  { nome: "Profissional", preco: "R$ 59", per: " /mês", itens: ["Perfil conferido na busca", "Até 25 alunos", "Planos, painel e conversa", "Profissional+ (R$ 99 /mês): alunos ilimitados"], cta: "Cadastrar perfil", kind: "ghost" as const, href: "#cadastro-profissional", breve: true },
];

export function Planos() {
  return (
    <Section id="planos" tone="tint">
      <div className="wrap">
        <Reveal className="section-head"><Title parts="Grátis para começar. PRO para ir além." /></Reveal>
        <div className="plans">
          {PLANS.map((p) => (
            <Reveal as="article" className={`plan${p.hot ? " hot" : ""}`} key={p.nome}>
              <Spot />
              <h3>{p.nome}{"breve" in p && p.breve ? <span className="chip" style={{ marginLeft: ".6rem", verticalAlign: "middle" }}>em breve</span> : null}</h3>
              <div className="price">{p.preco}{p.per && <small>{p.per}</small>}</div>
              <ul>{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>
              <Btn href={p.href ?? "#cadastro"} kind={p.kind}>{p.cta}</Btn>
            </Reveal>
          ))}
        </div>
        <p className="fine">
          Os planos pagos ainda não estão à venda: nada é cobrado hoje. Quando abrirem, o preço mostrado será o preço final, sem taxas extras.
          A assinatura será mensal, com renovação automática avisada por e-mail antes de cada cobrança. Você poderá cancelar a qualquer
          momento pelo próprio app e pedir o dinheiro de volta em até 7 dias da contratação. Detalhes em{" "}
          <a href="/reembolso">Cancelamento e reembolso</a>.
        </p>
      </div>
    </Section>
  );
}

/* ---------- perguntas ---------- */
const FAQ = [
  ["O RONDO substitui treinador ou nutricionista?", "Não. O app organiza o plano, facilita os registros e mantém a evolução visível. A avaliação individual continua sendo do profissional."],
  ["Meus dados de saúde ficam públicos?", "Não. Peso, medidas e treinos são privados. Só aparece para os outros o que você publica no feed ou nos stories. Quando o acompanhamento por profissionais abrir, eles só verão os dados de quem aceitar."],
  ["Quem escuta os meus recados de voz?", "Só você. Os áudios ficam só no seu aparelho e não vão para o nosso servidor. Você pode apagar tudo a qualquer momento. O recado é um diário, não um serviço de terapia."],
  ["Como vejo ou apago os meus dados?", "No app, em Configurações, você baixa uma cópia de tudo o que o servidor guarda sobre você e pode apagar a conta com todos os dados. Também dá para pedir pelo e-mail rondooficial.dev@gmail.com."],
  ["Vocês usam os meus dados para treinar inteligência artificial?", "Não. Os seus dados não são usados para treinar IA, nossa nem de terceiros. Hoje o RONDO não usa IA; quando usar, o que for gerado por IA vai aparecer identificado."],
  ["Menores de idade podem usar?", "Podem, com a autorização de um responsável. No cadastro, quem tem menos de 18 anos informa o nome e o e-mail do responsável e confirma que ele autoriza."],
  ["E se eu perder um dia de treino?", "O streak tem um dia de folga por semana. Uma falha não zera sua sequência."],
  ["O ranking premia quem emagrece mais?", "Nunca. O ranking mede constância: treino registrado, refeições, check-ins e meta de água."],
  ["Nutricionistas vão poder participar dos prêmios?", "Não. Seguindo as regras do conselho, nutricionistas não vão participar de sorteios nem dos prêmios do ranking."],
];

export function Faq() {
  return (
    <Section id="faq">
      <div className="wrap faq">
        <Reveal className="section-head"><Title parts="O que você precisa saber." /></Reveal>
        {FAQ.map(([q, a]) => <Reveal as="details" key={q}><summary>{q}</summary><p>{a}</p></Reveal>)}
      </div>
    </Section>
  );
}

/* ---------- chamada final: usar o app agora (o cadastro fica no botão "Criar conta" do topo) ---------- */
const APP_WEB = "/app";   // o app web mora no mesmo endereço do site
const PASSOS_APP = [
  ["1", "Abra no celular", "O app roda direto no navegador, sem instalar nada."],
  ["2", "Adicione à tela inicial", "No menu do navegador, toque em \"Adicionar à tela inicial\" e ele vira um ícone."],
  ["3", "Comece pelo treino de hoje", "Registre a primeira série e veja o seu ontem aparecer amanhã."],
];

export function Entrar() {
  return (
    <section className="wrap" id="entrar">
      <Reveal className="cta-final">
        <Title parts="Amanhã você vai querer ter começado hoje." />
        <p className="lead">Use o RONDO agora, no navegador do celular ou do computador. Android e iPhone chegam às lojas em breve.</p>
        <ol className="passos-app">
          {PASSOS_APP.map(([n, t, d]) => (
            <li key={n}><span className="passo-n" aria-hidden="true">{n}</span><b>{t}</b><span>{d}</span></li>
          ))}
        </ol>
        <div className="cta-acoes">
          <a className="btn btn-primary" href={APP_WEB}>Abrir o app <span className="arrow">→</span></a>
          <a className="btn btn-ghost" href={APP_WEB}>Já tenho conta: entrar</a>
        </div>
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
          <nav className="footer-links" aria-label="Legal">
            <a href="/termos">Termos de Uso</a><a href="/privacidade">Política de Privacidade</a><a href="/reembolso">Cancelamento e reembolso</a>
            <a href="/suboperadores">Suboperadores</a><a href="/licencas">Licenças e créditos</a><a href="/direitos-autorais">Direitos autorais</a>
            <button type="button" className="link-botao" onClick={() => abrirPreferenciasCookies()}>Preferências de cookies</button>
          </nav>
          <div className="footer-links">
            <b>Contato</b>
            <a href="mailto:rondooficial.dev@gmail.com">rondooficial.dev@gmail.com</a>
            <span>Responsável: Gustavo Ribas Silestrino</span>
          </div>
        </div>
        <p className="disclaimer">O RONDO organiza e acompanha, mas não substitui avaliação profissional. O recado de voz é um diário, não um serviço de terapia. Hoje o RONDO não usa inteligência artificial; quando usar, o conteúdo gerado por IA será identificado e será sempre sugestão, nunca prescrição. As telas mostradas nesta página são ilustrativas, com nomes e números fictícios.</p>
      </div>
    </footer>
  );
}
