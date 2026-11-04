import { Link } from "react-router-dom";

const recursos = [
  { t: "Treino série a série", d: "Histórico de carga, força estimada, recordes e sugestão da próxima carga." },
  { t: "Dieta com comida brasileira", d: "Meta calórica, macros e base de alimentos da Tabela TACO." },
  { t: "Constância sem culpa", d: "Streak com um dia de folga por semana. Comemoramos o hábito, não o corpo." },
  { t: "Comunidade e clubes", d: "Feed, desafios coletivos e ranking semanal de constância." },
  { t: "Profissionais verificados", d: "Nutricionistas e educadores físicos com registro conferido no conselho." },
  { t: "Privado por padrão", d: "Peso, medidas e fotos só aparecem se você quiser. Controle total." },
];

export default function Inicio() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-in">
          <div>
            <span className="pill">Treino · Dieta · Comunidade</span>
            <h1>
              Compita com quem
              <br />
              você foi <em>ontem</em>.
            </h1>
            <p className="lead">
              O app de constância que responde uma pergunta todos os dias: estou melhor do que ontem?
            </p>
            <div className="cta">
              <Link to="/planos" className="btn">Ver planos</Link>
              <Link to="/profissionais/cadastro" className="btn ghost">Sou profissional</Link>
            </div>
          </div>

          <div className="vs-card" aria-hidden>
            <small>VOCÊ VS. ONTEM</small>
            <h2>
              +12% melhor que
              <br />
              semana passada
            </h2>
            <div className="vs-m">
              <div><b>4/3</b><span>Treinos</span></div>
              <div><b>+8%</b><span>Volume</span></div>
              <div><b>5/7</b><span>Dieta</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap sec">
        <h2 className="h2">Tudo para voltar todos os dias</h2>
        <div className="grid3">
          {recursos.map((r) => (
            <article className="card" key={r.t}>
              <h3>{r.t}</h3>
              <p>{r.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap sec">
        <div className="band">
          <h2>Você é nutricionista ou educador físico?</h2>
          <p>Divulgue seu trabalho, capte clientes e acompanhe alunos sem planilhas e PDFs.</p>
          <Link to="/profissionais/cadastro" className="btn light">Cadastrar meu perfil</Link>
        </div>
      </section>
    </>
  );
}
