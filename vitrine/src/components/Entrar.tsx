/* A tela do RONDIN para entrar ou criar conta pelo site (/entrar), pedido do dono em 2026-11-18: quem quer comprar um
   pacotinho sem estar na conta entra aqui e volta para a loja, sem ir para o app.
   O caminho segue o que os sites profissionais fazem (Baymard, NN/g, web.dev):
   - a conta só é pedida na hora da compra, e depois de entrar a pessoa volta exatamente para onde estava (`?volta=loja`),
     com o pacote escolhido aberto de novo na loja;
   - "Continuar com o Google" em cima, e-mail e senha embaixo; entrar e criar conta na mesma tela, em duas abas;
   - formulários de verdade, com `autocomplete` certo para o gerenciador de senhas, botões com a ação e erros junto do campo;
   - o cadastro do site é curto (nome, e-mail, senha, nascimento e o aceite): as perguntas do RONDIN ficam para o app.
   A sessão é a mesma do app (lib/conta.ts): entrou aqui, está entrado no app também. Esta tela não fica no histórico depois
   do login (lib/navegar.ts, sairDaTela). */
import { useCallback, useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { ErroApi, cadastrarPeloSite, concluirCadastroGoogle, entrarComGoogle, entrarComSenha, type ContaLogada, type DadosDoCadastro } from "../lib/api";
import { guardarSessao, rotuloDa, sair, useConta } from "../lib/conta";
import { desenharBotaoGoogle } from "../lib/google";
import { sairDaTela } from "../lib/navegar";
import { APP_ENTRAR } from "../lib/rotas";
import { vars } from "../lib/util";
import vozInicio from "../assets/rondin/fala-entrar-inicio.mp3";
import vozLoja from "../assets/rondin/fala-entrar-loja.mp3";
import { FALAS_ENTRAR } from "../data/falaEntrar";
import { FotoDaConta } from "./Conta";
import { RondinVideo } from "./RondinVideo";
import { Btn, Nome } from "./ui";

/* para onde voltar depois de entrar (só destinos do próprio site: nada de mandar para fora) e o que o RONDIN diz em cada
   caso: a saudação e, logo embaixo, a legenda do motivo, com a voz dele gravada (scripts/gerar-voz-entrar.mjs; o texto vem
   de data/falaEntrar.ts, gerado junto com o áudio). Vindo da loja, ele fala em adotar o mascote (pedido do dono). */
type Fala = { ola: string; legenda: string; inicios: readonly number[] };
const VOLTAS: Record<string, { caminho: string; rotulo: string; indo: string; fala: Fala; voz: string }> = {
  loja: { caminho: "/loja", rotulo: "Voltar à loja", indo: "Voltando para a loja", fala: FALAS_ENTRAR.loja, voz: vozLoja },
  inicio: { caminho: "/", rotulo: "Voltar ao site", indo: "Voltando para o site", fala: FALAS_ENTRAR.inicio, voz: vozInicio },
};

/* ---------- a voz do RONDIN ----------
   Toca a fala ao abrir a tela. A legenda espera a voz começar e cada palavra aparece no momento em que ele a diz (o tempo
   de cada uma veio da gravação). Sem botão de som na tela (pedido do dono em 2026-11-18).
   Os navegadores não deixam uma página tocar som antes de a pessoa interagir com ela. Vindo da loja (um clique antes), a voz
   toca na hora; abrindo o link direto, o navegador pode bloquear: aí a legenda aparece sozinha e o RONDIN começa a falar,
   do começo e com a legenda junto, no primeiro clique, toque ou tecla em qualquer lugar da tela (como no app).
   "Voz desligada" no app (yy.rondin.mudo, app/src/lib/rondinVoz.ts) vale aqui também: aí ele não fala. */
type FaseDaFala = "esperando" | "voz" | "texto";
const lerMudo = () => { try { return localStorage.getItem("yy.rondin.mudo") === "1"; } catch { return false; } };

function useVoz(src: string, ativa: boolean) {
  const [fase, setFase] = useState<FaseDaFala>(ativa && !lerMudo() ? "esperando" : "texto");
  const [vez, setVez] = useState(0);   // cada vez que a fala recomeça do início (a legenda recomeça junto)
  const [bloqueada, setBloqueada] = useState(false);   // o navegador pediu um toque antes do som
  const audio = useRef<HTMLAudioElement | null>(null);
  const limite = useRef(0);

  /* fala do começo: a legenda se esconde e espera a voz. O play() é chamado direto (também dentro do clique, o que o
     Safari do iPhone exige) */
  const tocar = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    clearTimeout(limite.current);
    setFase("esperando");
    setVez((v) => v + 1);
    a.currentTime = 0;
    /* rede lenta: a legenda não fica esperando a voz */
    limite.current = window.setTimeout(() => { a.pause(); setFase((f) => (f === "esperando" ? "texto" : f)); }, 1800);
    a.play().catch((e: unknown) => {
      clearTimeout(limite.current);
      setFase("texto");
      if ((e as { name?: string } | null)?.name === "NotAllowedError") setBloqueada(true);
    });
  }, []);

  useEffect(() => {
    if (!ativa || lerMudo()) { setFase("texto"); return; }
    const a = new Audio(src);
    a.preload = "auto";
    audio.current = a;
    const tocou = () => { clearTimeout(limite.current); setBloqueada(false); setFase("voz"); };
    a.addEventListener("playing", tocou);
    tocar();
    return () => { clearTimeout(limite.current); a.removeEventListener("playing", tocou); a.pause(); audio.current = null; };
  }, [src, ativa, tocar]);

  /* bloqueada: ele fala no primeiro clique, toque ou tecla, em qualquer lugar da tela */
  useEffect(() => {
    if (!bloqueada || !ativa) return;
    const ouvir = () => tocar();
    document.addEventListener("click", ouvir, true);
    document.addEventListener("keydown", ouvir, true);
    return () => { document.removeEventListener("click", ouvir, true); document.removeEventListener("keydown", ouvir, true); };
  }, [bloqueada, ativa, tocar]);

  return { fase, vez };
}

/* a fala surge palavra por palavra, como a legenda do RONDIN no app: no tempo da voz, ou num ritmo fixo sem ela.
   `de` é a posição da primeira palavra na fala inteira (a legenda continua de onde a saudação parou) */
function Palavras({ texto, de = 0, fala, fase }: { texto: string; de?: number; fala: Fala; fase: FaseDaFala }) {
  return (
    <>
      {texto.split(" ").map((p, i) => {
        const n = de + i;
        const atraso = fase === "voz" ? fala.inicios[n] ?? n * 0.3 : 0.25 + n * 0.09;
        return <span key={i} style={vars({ "--d": `${atraso.toFixed(3)}s` })}>{p} </span>;
      })}
    </>
  );
}


type Modo = "entrar" | "criar";
type Erros = Record<string, string>;

/* ---------- campos ---------- */
type CampoProps = { id: string; rotulo: string; erro?: string; dica?: string } & InputHTMLAttributes<HTMLInputElement>;
function Campo({ id, rotulo, erro, dica, ...input }: CampoProps) {
  const desc = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className="entrar-campo">
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} aria-invalid={erro ? true : undefined} aria-describedby={desc} {...input} />
      {erro ? <p className="entrar-campo-erro" id={`${id}-erro`}>{erro}</p> : dica ? <p className="entrar-campo-dica" id={`${id}-dica`}>{dica}</p> : null}
    </div>
  );
}

const OLHO = "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z";
const OLHO_FECHADO = "M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.9 0 3.5-.6 4.9-1.4M9.9 9.9a3.2 3.2 0 0 0 4.2 4.2";

function CampoSenha({ id, rotulo, erro, dica, nova, ...input }: CampoProps & { nova?: boolean }) {
  const [ver, setVer] = useState(false);
  const desc = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className="entrar-campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="entrar-senha">
        <input
          id={id} type={ver ? "text" : "password"} autoComplete={nova ? "new-password" : "current-password"} minLength={nova ? 8 : undefined}
          aria-invalid={erro ? true : undefined} aria-describedby={desc} {...input}
        />
        <button type="button" onClick={() => setVer((v) => !v)} aria-pressed={ver} aria-label={ver ? "Esconder a senha" : "Mostrar a senha"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ver ? OLHO_FECHADO : OLHO} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      {erro ? <p className="entrar-campo-erro" id={`${id}-erro`}>{erro}</p> : dica ? <p className="entrar-campo-dica" id={`${id}-dica`}>{dica}</p> : null}
    </div>
  );
}

/* ---------- o resto do cadastro: nascimento, responsável (menores de 18) e o aceite ---------- */
type Extras = { nascimento: string; respNome: string; respEmail: string; respAutoriza: boolean; aceite: boolean; marketing: boolean };
const EXTRAS: Extras = { nascimento: "", respNome: "", respEmail: "", respAutoriza: false, aceite: false, marketing: false };

const hoje = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`; };
function idade(nascimento: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nascimento);
  if (!m) return null;
  const h = new Date(), a = +m[1], mes = +m[2], dia = +m[3];
  return h.getFullYear() - a - (h.getMonth() + 1 < mes || (h.getMonth() + 1 === mes && h.getDate() < dia) ? 1 : 0);
}

function conferirExtras(v: Extras, emailDaPessoa: string): Erros {
  const e: Erros = {};
  const anos = idade(v.nascimento);
  if (anos === null || v.nascimento > hoje() || anos > 120) e.nascimento = "Informe a sua data de nascimento.";
  else if (anos < 18) {
    if (v.respNome.trim().length < 2) e.respNome = "Informe o nome do responsável.";
    if (!/^\S+@\S+\.\S+$/.test(v.respEmail.trim())) e.respEmail = "Informe o e-mail do responsável.";
    else if (v.respEmail.trim().toLowerCase() === emailDaPessoa.trim().toLowerCase()) e.respEmail = "Use um e-mail diferente do seu.";
    if (!v.respAutoriza) e.respAutoriza = "O responsável precisa autorizar.";
  }
  if (!v.aceite) e.aceite = "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.";
  return e;
}

const dadosDe = (v: Extras): DadosDoCadastro => ({
  nascimento: v.nascimento, aceita_termos: v.aceite, aceita_privacidade: v.aceite, marketing: v.marketing,
  responsavel: (idade(v.nascimento) ?? 18) < 18 ? { nome: v.respNome.trim(), email: v.respEmail.trim(), autoriza: v.respAutoriza } : null,
});

function CamposDoCadastro({ prefixo, v, mudar, erros }: { prefixo: string; v: Extras; mudar: (p: Partial<Extras>) => void; erros: Erros }) {
  const menor = (idade(v.nascimento) ?? 18) < 18 && v.nascimento <= hoje();
  return (
    <>
      <Campo
        id={`${prefixo}-nascimento`} rotulo="Data de nascimento" type="date" name="bday" autoComplete="bday" required max={hoje()} min="1900-01-01"
        value={v.nascimento} onChange={(e) => mudar({ nascimento: e.target.value })} erro={erros.nascimento}
        dica="Só para saber se você é menor de idade."
      />
      {menor ? (
        <fieldset className="entrar-responsavel">
          <legend>Menores de 18 anos precisam da autorização de um responsável</legend>
          <Campo id={`${prefixo}-resp-nome`} rotulo="Nome do responsável" autoComplete="off" value={v.respNome} onChange={(e) => mudar({ respNome: e.target.value })} erro={erros.respNome} />
          <Campo id={`${prefixo}-resp-email`} rotulo="E-mail do responsável" type="email" autoComplete="off" inputMode="email" value={v.respEmail} onChange={(e) => mudar({ respEmail: e.target.value })} erro={erros.respEmail} />
          <label className="entrar-check">
            <input type="checkbox" checked={v.respAutoriza} onChange={(e) => mudar({ respAutoriza: e.target.checked })} aria-invalid={erros.respAutoriza ? true : undefined} />
            <span>Sou o responsável e autorizo a criação da conta.</span>
          </label>
          {erros.respAutoriza ? <p className="entrar-campo-erro">{erros.respAutoriza}</p> : null}
        </fieldset>
      ) : null}
      <label className="entrar-check">
        <input type="checkbox" checked={v.aceite} onChange={(e) => mudar({ aceite: e.target.checked })} aria-invalid={erros.aceite ? true : undefined} aria-describedby={erros.aceite ? `${prefixo}-aceite-erro` : undefined} />
        <span>Li e aceito os <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.</span>
      </label>
      {erros.aceite ? <p className="entrar-campo-erro" id={`${prefixo}-aceite-erro`}>{erros.aceite}</p> : null}
      <label className="entrar-check">
        <input type="checkbox" checked={v.marketing} onChange={(e) => mudar({ marketing: e.target.checked })} />
        <span>Quero receber novidades do RONDO por e-mail (opcional).</span>
      </label>
    </>
  );
}

/* leva o foco para o primeiro campo com erro (quem usa teclado ou leitor de tela vai direto ao que falta) */
function focarErro(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"], .entrar-alerta')?.focus());
}

/* ---------- a tela ---------- */
export default function Entrar() {
  const params = new URLSearchParams(location.search);
  const volta = VOLTAS[params.get("volta") ?? ""] ?? VOLTAS.inicio;
  const [modo, setModo] = useState<Modo>(params.get("modo") === "criar" ? "criar" : "entrar");
  const { conta } = useConta();
  const [feito, setFeito] = useState<ContaLogada | null>(null);
  /* o RONDIN fala só para quem ainda vai entrar: entrou (ou já estava entrado), ele para */
  const voz = useVoz(volta.voz, !conta && !feito);
  const [indo, setIndo] = useState(false);
  const [alerta, setAlerta] = useState<{ texto: string; paraEntrar?: boolean } | null>(null);
  const [erros, setErros] = useState<Erros>({});
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  /* verificação em duas etapas: com a senha certa, o servidor pede o código do aplicativo autenticador */
  const [pedeCodigo, setPedeCodigo] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [extras, setExtras] = useState<Extras>(EXTRAS);
  const [google, setGoogle] = useState<{ token: string; nome: string; email: string } | null>(null);   // primeira vez com o Google
  const form = useRef<HTMLFormElement>(null);
  const caixaGoogle = useRef<HTMLDivElement>(null);
  const [googleFalhou, setGoogleFalhou] = useState(false);

  useEffect(() => { document.title = `${google || modo === "criar" ? "Criar conta" : "Entrar"} · RONDO`; }, [modo, google]);

  const trocar = (m: Modo) => { setModo(m); setAlerta(null); setErros({}); };
  /* o erro de um campo some assim que a pessoa mexe nele */
  const limparErro = (...campos: string[]) => setErros((e) => {
    if (!campos.some((c) => e[c])) return e;
    const n = { ...e };
    campos.forEach((c) => delete n[c]);
    return n;
  });
  const mudarExtras = (p: Partial<Extras>) => { setExtras((v) => ({ ...v, ...p })); limparErro(...Object.keys(p)); };
  const digitar = (setter: (v: string) => void, campo: string) => (e: { target: { value: string } }) => { setter(e.target.value); limparErro(campo); };

  /* deu certo: guarda a sessão (a mesma do app), mostra a confirmação e volta para onde a pessoa estava */
  const concluir = (l: ContaLogada) => {
    guardarSessao(l);
    setFeito(l);
    window.setTimeout(() => sairDaTela(volta.caminho), 1200);
  };

  const falhou = (e: unknown, extra?: (err: ErroApi) => boolean) => {
    const err = e instanceof ErroApi ? e : new ErroApi("Não deu agora. Tente de novo em instantes.");
    if (extra?.(err)) return;
    setAlerta({ texto: err.message });
    focarErro(form.current);
  };

  /* "Continuar com o Google": quem já tem conta entra direto; na primeira vez, completa o cadastro aqui mesmo */
  useEffect(() => {
    const el = caixaGoogle.current;
    if (!el || feito || google || conta) return;
    let vivo = true;
    const desenhar = () => desenharBotaoGoogle(el, Math.min(400, Math.max(220, el.clientWidth)), async (idToken) => {
      setAlerta(null); setIndo(true);
      try {
        const r = await entrarComGoogle(idToken);
        if (r.login) concluir(r.login);
        else if (r.precisa_cadastro && r.token_social) {
          setGoogle({ token: r.token_social, nome: r.nome ?? "", email: r.email ?? "" });
          setNome(r.nome ?? "");
          setErros({});
        }
      } catch (e) { falhou(e); } finally { setIndo(false); }
    }).catch(() => { if (vivo) setGoogleFalhou(true); });
    void desenhar();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feito, google, conta]);

  const enviarEntrar = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Erros = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Informe o seu e-mail.";
    if (!senha) e.senha = "Informe a sua senha.";
    if (pedeCodigo && codigo.replace(/[\s-]/g, "").length < 6) e.codigo = "Digite o código de 6 números do aplicativo (ou um código de reserva).";
    setErros(e); setAlerta(null);
    if (Object.keys(e).length) { focarErro(form.current); return; }
    setIndo(true);
    try {
      concluir(await entrarComSenha(email.trim(), senha, pedeCodigo ? codigo.trim() : undefined));
    } catch (err) {
      falhou(err, (x) => {
        if (!x.doisFatores) return false;
        /* a primeira vez só abre o campo do código; depois disso, o código estava errado */
        if (pedeCodigo) setErros({ codigo: x.message });
        setPedeCodigo(true); setCodigo("");
        window.setTimeout(() => document.getElementById("entrar-codigo")?.focus(), 30);
        return true;
      });
    } finally { setIndo(false); }
  };

  const enviarCriar = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Erros = { ...conferirExtras(extras, email) };
    if (nome.trim().length < 2) e.nome = "Informe o seu nome.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Informe um e-mail válido.";
    if (senha.length < 8) e.senha = "Use pelo menos 8 caracteres.";
    setErros(e); setAlerta(null);
    if (Object.keys(e).length) { focarErro(form.current); return; }
    setIndo(true);
    try {
      concluir(await cadastrarPeloSite({ nome: nome.trim(), email: email.trim(), senha, ...dadosDe(extras) }));
    } catch (err) {
      falhou(err, (x) => {
        if (x.status !== 409) return false;
        if (/e-mail/i.test(x.message)) { setAlerta({ texto: "Este e-mail já tem conta no RONDO.", paraEntrar: true }); focarErro(form.current); return true; }
        setErros({ nome: x.message }); focarErro(form.current); return true;
      });
    } finally { setIndo(false); }
  };

  const enviarGoogle = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!google) return;
    const e: Erros = { ...conferirExtras(extras, google.email) };
    if (nome.trim().length < 2) e.nome = "Informe o seu nome.";
    setErros(e); setAlerta(null);
    if (Object.keys(e).length) { focarErro(form.current); return; }
    setIndo(true);
    try {
      concluir(await concluirCadastroGoogle({ token_social: google.token, nome: nome.trim(), ...dadosDe(extras) }));
    } catch (err) {
      falhou(err, (x) => {
        if (x.status === 401) { setGoogle(null); setAlerta({ texto: x.message }); return true; }
        if (x.status === 409 && !/e-mail/i.test(x.message)) { setErros({ nome: x.message }); focarErro(form.current); return true; }
        return false;
      });
    } finally { setIndo(false); }
  };

  const alertaEl = alerta ? (
    <div className="entrar-alerta" role="alert" tabIndex={-1}>
      <p>{alerta.texto}</p>
      {alerta.paraEntrar ? <button type="button" onClick={() => trocar("entrar")}>Entrar com este e-mail</button> : null}
    </div>
  ) : null;

  let cartao;
  if (feito) {
    /* a confirmação: o formulário sai da página (o gerenciador de senhas entende que deu certo) */
    const c = { nome: feito.nome, arroba: feito.arroba, foto: feito.foto };
    cartao = (
      <div className="entrar-feito" role="status">
        <FotoDaConta conta={c} className="entrar-feito-foto" />
        <p className="entrar-feito-titulo">Pronto, {c.nome.trim().split(/\s+/)[0]}!</p>
        <p>Você está na conta <b>{rotuloDa(c)}</b>. {volta.indo}...</p>
      </div>
    );
  } else if (conta) {
    cartao = (
      <div className="entrar-feito">
        <FotoDaConta conta={conta} className="entrar-feito-foto" />
        <p className="entrar-feito-titulo">Você já está na sua conta</p>
        <p>Entrou como <b>{rotuloDa(conta)}</b>.</p>
        <div className="entrar-feito-acoes">
          <button type="button" className="btn btn-primary entrar-enviar" onClick={() => sairDaTela(volta.caminho)}>Continuar</button>
          <button type="button" className="entrar-link" onClick={() => sair()}>Entrar com outra conta</button>
        </div>
      </div>
    );
  } else if (google) {
    cartao = (
      <form ref={form} className="entrar-form" onSubmit={enviarGoogle} noValidate aria-labelledby="entrar-google-titulo">
        <h2 id="entrar-google-titulo" className="entrar-form-titulo">Falta pouco</h2>
        <p className="entrar-form-sub">Você está entrando com o Google como <b>{google.email}</b>. Complete o cadastro para criar a sua conta do RONDO.</p>
        {alertaEl}
        <Campo id="google-nome" rotulo="Nome" autoComplete="name" required maxLength={120} value={nome} onChange={digitar(setNome, "nome")} erro={erros.nome} dica="É o nome que aparece no RONDO." />
        <CamposDoCadastro prefixo="google" v={extras} mudar={mudarExtras} erros={erros} />
        <Btn type="submit" className="entrar-enviar" disabled={indo}>{indo ? "Criando a conta..." : "Criar conta"}</Btn>
        <button type="button" className="entrar-link" onClick={() => { setGoogle(null); setErros({}); setAlerta(null); }}>Usar outro jeito de entrar</button>
      </form>
    );
  } else {
    cartao = (
      <>
        <div className="entrar-abas" role="tablist" aria-label="Entrar ou criar conta">
          <button type="button" role="tab" id="aba-entrar" aria-selected={modo === "entrar"} aria-controls="painel-conta" onClick={() => trocar("entrar")}>Entrar</button>
          <button type="button" role="tab" id="aba-criar" aria-selected={modo === "criar"} aria-controls="painel-conta" onClick={() => trocar("criar")}>Criar conta</button>
        </div>
        <div className="entrar-google" ref={caixaGoogle} aria-busy={indo || undefined} />
        {googleFalhou ? null : <p className="entrar-ou"><span>ou com e-mail</span></p>}
        <div id="painel-conta" role="tabpanel" aria-labelledby={modo === "entrar" ? "aba-entrar" : "aba-criar"}>
          {modo === "entrar" ? (
            <form ref={form} className="entrar-form" onSubmit={enviarEntrar} noValidate key="entrar">
              {alertaEl}
              <Campo id="entrar-email" name="email" rotulo="E-mail" type="email" inputMode="email" autoComplete="username" required value={email} onChange={(e) => { setEmail(e.target.value); limparErro("email"); setPedeCodigo(false); }} erro={erros.email} />
              <CampoSenha id="entrar-senha" name="senha" rotulo="Senha" required value={senha} onChange={digitar(setSenha, "senha")} erro={erros.senha} />
              {pedeCodigo ? (
                <Campo
                  id="entrar-codigo" name="codigo" rotulo="Código de verificação" inputMode="text" autoComplete="one-time-code" required maxLength={12}
                  value={codigo} onChange={digitar(setCodigo, "codigo")} erro={erros.codigo}
                  dica="Sua conta tem verificação em duas etapas. Digite o código de 6 números do aplicativo autenticador ou um código de reserva."
                />
              ) : null}
              <a className="entrar-esqueci" href={APP_ENTRAR}>Esqueci a senha</a>
              <Btn type="submit" className="entrar-enviar" disabled={indo}>{indo ? "Entrando..." : "Entrar"}</Btn>
              <p className="entrar-troca">Ainda não tem conta? <button type="button" onClick={() => trocar("criar")}>Criar conta</button></p>
            </form>
          ) : (
            <form ref={form} className="entrar-form" onSubmit={enviarCriar} noValidate key="criar">
              {alertaEl}
              <Campo id="criar-nome" name="nome" rotulo="Nome" autoComplete="name" required maxLength={120} value={nome} onChange={digitar(setNome, "nome")} erro={erros.nome} dica="É o nome que aparece no RONDO." />
              <Campo id="criar-email" name="novo-email" rotulo="E-mail" type="email" inputMode="email" autoComplete="email" required value={email} onChange={digitar(setEmail, "email")} erro={erros.email} />
              <CampoSenha id="criar-senha" name="nova-senha" rotulo="Senha" nova required value={senha} onChange={digitar(setSenha, "senha")} erro={erros.senha} dica="Pelo menos 8 caracteres." />
              <CamposDoCadastro prefixo="criar" v={extras} mudar={mudarExtras} erros={erros} />
              <Btn type="submit" className="entrar-enviar" disabled={indo}>{indo ? "Criando a conta..." : "Criar conta"}</Btn>
              <p className="entrar-troca">Já tem conta? <button type="button" onClick={() => trocar("entrar")}>Entrar</button></p>
            </form>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="entrar">
      <header className="entrar-topo">
        <a className="entrar-voltar" href={volta.caminho}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {volta.rotulo}
        </a>
        <a className="entrar-marca" href="/" aria-label="RONDO, página inicial"><Nome /></a>
      </header>
      <main id="conteudo" className="entrar-palco">
        <div className="entrar-rondin" aria-hidden="true"><RondinVideo tamanho={128} /></div>
        {/* a fala inteira (saudação e legenda) muda de chave a cada vez que recomeça, para a legenda acompanhar a voz de novo */}
        <h1 className="entrar-fala" data-fala={voz.fase} key={`ola-${voz.vez}-${voz.fase === "esperando" ? "e" : "s"}`}><Palavras texto={volta.fala.ola} fala={volta.fala} fase={voz.fase} /></h1>
        {!feito && !conta ? (
          <p className="entrar-legenda" data-fala={voz.fase} key={`legenda-${voz.vez}-${voz.fase === "esperando" ? "e" : "s"}`}>
            <Palavras texto={volta.fala.legenda} de={volta.fala.ola.split(" ").length} fala={volta.fala} fase={voz.fase} />
          </p>
        ) : null}
        <section className="entrar-cartao" aria-label="Sua conta do RONDO">{cartao}</section>
        <p className="entrar-nota">A conta é a mesma do app do RONDO: entrou aqui, já está entrado lá.</p>
      </main>
    </div>
  );
}
