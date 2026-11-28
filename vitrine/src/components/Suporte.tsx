/* O suporte, no fim da página (pedido do dono em 2026-11-19): um cartão por assunto. Cada um abre uma janela para a pessoa
   escrever o que quer (um problema, uma reclamação, uma sugestão...), com o aviso de que a mensagem é encaminhada para a
   equipe RONDO. A mensagem vai para o servidor (backend/app/rotas/suporte.py), que guarda e manda por e-mail para a equipe.
   Quem está na conta (lib/conta.ts) não precisa digitar e-mail: a resposta vai para o e-mail da conta. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ErroApi, enviarSuporte, type AssuntoSuporte } from "../lib/api";
import { rotuloDa, useConta } from "../lib/conta";
import { APP_ENTRAR } from "../lib/rotas";
import { CONTATO } from "./Legal";
import { Btn, Reveal } from "./ui";

const ROTULOS: Record<AssuntoSuporte, string> = {
  problema: "Algo não funciona", conta: "Conta e acesso", loja: "Loja de browniezinhos", dados: "Seus dados",
  denuncia: "Denúncia", sugestao: "Sugestão", reclamacao: "Reclamação", outro: "Outro assunto",
};
/* o que ajuda a equipe a resolver mais rápido, em cada assunto */
const DICAS: Record<AssuntoSuporte, string> = {
  problema: "Conte o que aconteceu, onde (app, site ou loja) e em qual celular ou computador.",
  conta: "Conte o que está acontecendo com a sua conta (sem senha, nunca).",
  loja: "Conte a sua dúvida sobre a loja ou os browniezinhos.",
  dados: "Conte o que você quer saber, corrigir ou apagar dos seus dados.",
  denuncia: "Conte o que você quer denunciar: o @, o link ou o que aconteceu.",
  sugestao: "Conte a sua ideia: o que você gostaria de ver no RONDO?",
  reclamacao: "Conte o que não deu certo. Toda reclamação é lida.",
  outro: "Escreva o que você quiser.",
};

type Acao = { rotulo: string } & ({ assunto: AssuntoSuporte } | { href: string });
type Cartao = { titulo: string; texto: string; icone: string; acoes: Acao[] };

const CARTOES: Cartao[] = [
  {
    titulo: "Algo não funciona",
    texto: "Um botão que não responde, uma tela que não abre, um erro. Conte o que aconteceu.",
    icone: '<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17h.01"/>',
    acoes: [{ rotulo: "Contar o problema", assunto: "problema" }],
  },
  {
    titulo: "Conta e acesso",
    texto: "Esqueceu a senha, não consegue entrar ou quer trocar o e-mail da conta.",
    icone: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    acoes: [{ rotulo: "Esqueci a senha", href: APP_ENTRAR }, { rotulo: "Escrever", assunto: "conta" }],
  },
  {
    titulo: "Sugestões e reclamações",
    texto: "Uma ideia para o RONDO ou algo que não te agradou. A equipe lê todas.",
    icone: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    acoes: [{ rotulo: "Sugerir", assunto: "sugestao" }, { rotulo: "Reclamar", assunto: "reclamacao" }],
  },
  {
    titulo: "Loja de browniezinhos",
    texto: "Dúvidas sobre os browniezinhos à venda, os da sua coleção ou a abertura da loja.",
    icone: '<path d="M4 9h16l-1 11H5z"/><path d="M8 9a4 4 0 0 1 8 0"/>',
    acoes: [{ rotulo: "Falar da loja", assunto: "loja" }],
  },
  {
    titulo: "Seus dados",
    texto: "Ver o que guardamos, corrigir ou apagar a conta com tudo. Pelo app, em Configurações, ou por aqui.",
    icone: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/>',
    acoes: [{ rotulo: "Escrever", assunto: "dados" }, { rotulo: "Excluir a conta", href: "/excluir-conta" }, { rotulo: "Privacidade", href: "/privacidade" }],
  },
  {
    titulo: "Denunciar",
    texto: "No app, toque nos três pontinhos do post, do comentário ou do perfil e em Denunciar. Fora do app, conte para nós.",
    icone: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>',
    acoes: [{ rotulo: "Denunciar", assunto: "denuncia" }],
  },
];

/* ---------- a janela de escrever ---------- */
function Janela({ assunto, aoFechar }: { assunto: AssuntoSuporte | null; aoFechar: () => void }) {
  const { token, conta } = useConta();
  const dialogo = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const [tema, setTema] = useState<AssuntoSuporte>("outro");
  const [mensagem, setMensagem] = useState("");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState("");
  const [enviada, setEnviada] = useState(false);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (assunto) {
      setTema(assunto); setErro(""); setEnviada(false);
      if (!d.open) d.showModal();
      campo.current?.focus();   // o foco já no campo da mensagem (sem esperar o próximo quadro)
    } else if (d.open) d.close();
  }, [assunto]);

  const fechar = () => dialogo.current?.close();
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (indo) return;
    if (mensagem.trim().length < 10) { setErro("Escreva um pouco mais (pelo menos 10 letras)."); campo.current?.focus(); return; }
    if (!token && !/^\S+@\S+\.\S+$/.test(email.trim())) { setErro("Informe o seu e-mail para a gente responder."); return; }
    setIndo(true); setErro("");
    try {
      await enviarSuporte({ assunto: tema, mensagem: mensagem.trim(), ...(token ? {} : { email: email.trim(), nome: nome.trim() || undefined }) }, token);
      setEnviada(true); setMensagem("");
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : "Não deu para enviar agora. Tente de novo em instantes.");
    } finally {
      setIndo(false);
    }
  };

  return (
    <dialog ref={dialogo} className="suporte-janela" aria-labelledby="suporte-janela-titulo" onClose={aoFechar}
      onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <div className="suporte-janela-in">
        <button type="button" className="suporte-janela-fechar" aria-label="Fechar" onClick={fechar}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        {enviada ? (
          <div className="suporte-enviada" role="status">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <h2 id="suporte-janela-titulo">Mensagem enviada</h2>
            <p>Ela foi encaminhada para a equipe RONDO. A resposta chega no {token ? "e-mail da sua conta" : "e-mail que você informou"}.</p>
            <button type="button" className="btn btn-primary" onClick={fechar}>Fechar</button>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate>
            <h2 id="suporte-janela-titulo">Fale com a equipe RONDO</h2>
            <div className="suporte-campo">
              <label htmlFor="suporte-assunto">Assunto</label>
              <select id="suporte-assunto" value={tema} onChange={(e) => setTema(e.target.value as AssuntoSuporte)}>
                {(Object.keys(ROTULOS) as AssuntoSuporte[]).map((a) => <option key={a} value={a}>{ROTULOS[a]}</option>)}
              </select>
            </div>
            <div className="suporte-campo">
              <label htmlFor="suporte-mensagem">Mensagem</label>
              <textarea
                id="suporte-mensagem" ref={campo} rows={6} maxLength={2000} required value={mensagem}
                onChange={(e) => { setMensagem(e.target.value); if (erro) setErro(""); }} placeholder={DICAS[tema]}
                aria-describedby="suporte-contagem"
              />
              <p className="suporte-contagem" id="suporte-contagem">{mensagem.length} / 2000</p>
            </div>
            {token && conta ? (
              <p className="suporte-quem">Vamos responder no e-mail da sua conta, <b>{rotuloDa(conta)}</b>.</p>
            ) : (
              <div className="suporte-duplo">
                <div className="suporte-campo">
                  <label htmlFor="suporte-email">Seu e-mail (para a resposta)</label>
                  <input id="suporte-email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); if (erro) setErro(""); }} />
                </div>
                <div className="suporte-campo">
                  <label htmlFor="suporte-nome">Seu nome (opcional)</label>
                  <input id="suporte-nome" autoComplete="name" maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
              </div>
            )}
            {erro ? <p className="suporte-erro" role="alert">{erro}</p> : null}
            <p className="suporte-obs">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
              Sua mensagem será encaminhada para a equipe RONDO.
            </p>
            <div className="suporte-botoes">
              <Btn type="submit" disabled={indo}>{indo ? "Enviando..." : "Enviar mensagem"}</Btn>
              <button type="button" className="btn btn-ghost" onClick={fechar}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

export function Suporte() {
  const [assunto, setAssunto] = useState<AssuntoSuporte | null>(null);
  return (
    <section className="section suporte" id="suporte" aria-labelledby="suporte-titulo">
      <div className="wrap">
        <Reveal className="section-head suporte-cabeca">
          <h2 id="suporte-titulo" className="display">Precisa de ajuda?</h2>
          <p className="lead">Escolha o assunto e escreva para a gente: a mensagem vai direto para a equipe RONDO. Se preferir, o e-mail é <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.</p>
          <button type="button" className="btn btn-primary suporte-escrever" onClick={() => setAssunto("outro")}>Escrever para a equipe</button>
        </Reveal>
        <ul className="suporte-grade">
          {CARTOES.map((c) => (
            <Reveal as="li" key={c.titulo} className="suporte-cartao">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: c.icone }} />
              <h3>{c.titulo}</h3>
              <p>{c.texto}</p>
              <div className="suporte-acoes">
                {c.acoes.map((a) => "assunto" in a
                  ? <button key={a.rotulo} type="button" onClick={() => setAssunto(a.assunto)}>{a.rotulo} <span aria-hidden="true">→</span></button>
                  : <a key={a.rotulo} href={a.href}>{a.rotulo} <span aria-hidden="true">→</span></a>)}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
      <Janela assunto={assunto} aoFechar={() => setAssunto(null)} />
    </section>
  );
}
