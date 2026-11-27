/* "Não foi você? Proteger minha conta": a página que o botão dos avisos de segurança por e-mail abre (senha alterada,
   entrada nova, verificação em duas etapas ligada ou desligada). O token vem no fragmento (#t=...), que não vai para o
   servidor do site nem aparece em logs; a página tira ele do endereço assim que lê.

   Nada acontece só de abrir (programas de e-mail abrem links sozinhos para conferir): a pessoa lê e confirma no botão. */
import { useState } from "react";
import { ErroApi, protegerConta } from "../lib/api";
import { CONTATO, Pagina } from "./Legal";

function lerToken(): string {
  const t = new URLSearchParams(location.hash.slice(1)).get("t") ?? "";
  if (location.hash) history.replaceState(null, "", location.pathname);
  return t;
}

export function ProtegerConta() {
  const [token] = useState(lerToken);
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "erro">("");
  const [msg, setMsg] = useState("");

  async function proteger() {
    setEstado("enviando"); setMsg("");
    try {
      await protegerConta(token);
      setEstado("ok");
    } catch (err) {
      setEstado("erro");
      setMsg(err instanceof ErroApi ? err.message : "Não foi possível proteger agora. Tente de novo.");
    }
  }

  if (estado === "ok") {
    return (
      <Pagina titulo="Conta protegida" semData>
        <p className="legal-destaque" role="status">Pronto. Todos os aparelhos saíram da sua conta e a senha antiga não entra mais.</p>
        <h2>Para voltar a usar</h2>
        <ol>
          <li>Abra o app e toque em <b>Entrar</b>, depois em <b>Esqueci a senha</b>.</li>
          <li>Digite o e-mail da conta: chega um código de 6 números.</li>
          <li>Com o código, crie uma senha nova, que você não use em nenhum outro lugar.</li>
        </ol>
        <p>Se você entra com o Google, é só entrar com ele de novo.</p>
        <p>
          <a className="btn" href="/app">Abrir o RONDO</a>
        </p>
        <Dicas />
      </Pagina>
    );
  }

  return (
    <Pagina titulo="Proteger a sua conta" semData>
      {!token ? (
        <p className="legal-destaque" role="alert">
          Este link está incompleto. Abra de novo o botão <b>Proteger minha conta</b> do e-mail que recebemos, ou use{" "}
          <b>Esqueci a senha</b> no app para criar uma senha nova (isso também tira a conta dos outros aparelhos).
        </p>
      ) : (
        <>
          <p>Se alguém mexeu na sua conta sem você saber, proteja ela agora. Ao confirmar:</p>
          <ul>
            <li>todos os aparelhos saem da sua conta na hora, inclusive este, se estiver com ela aberta;</li>
            <li>a senha atual deixa de valer, para quem a tiver;</li>
            <li>para voltar, você cria uma senha nova em <b>Esqueci a senha</b> (o código vai para o seu e-mail) ou entra com o Google.</li>
          </ul>
          <p>Os seus dados (treinos, dieta, publicações, mascotes) continuam iguais.</p>
          <p>
            <button type="button" className="btn btn-perigo" onClick={proteger} disabled={estado === "enviando"}>
              {estado === "enviando" ? "Protegendo…" : "Proteger minha conta"}
            </button>
          </p>
          <p className={`cadastro-aviso ${estado === "erro" ? "is-erro" : ""}`} role="status">{estado === "erro" ? msg : ""}</p>
          <Dicas />
        </>
      )}
    </Pagina>
  );
}

function Dicas() {
  return (
    <>
      <h2>Se a pessoa também entrou no seu e-mail</h2>
      <p>
        Troque primeiro a senha do seu e-mail: quem tem o e-mail consegue pedir o código de "Esqueci a senha". Depois ligue a{" "}
        <b>verificação em duas etapas</b> no app, em Configurações, Conta e segurança: com ela, só a senha não basta para entrar.
      </p>
      <p>Precisa de ajuda? Escreva para <a href={`mailto:${CONTATO}?subject=Minha%20conta%20foi%20invadida`}>{CONTATO}</a> do e-mail da conta.</p>
    </>
  );
}
