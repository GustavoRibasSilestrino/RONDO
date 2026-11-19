/* O suporte, no fim da página (pedido do dono em 2026-11-19): um cartão por assunto, cada um abre o e-mail da equipe já
   com o assunto e um modelo do que contar. Nada de formulário próprio: o contato é o e-mail de sempre (Legal.tsx, CONTATO). */
import { CONTATO } from "./Legal";
import { APP_ENTRAR } from "../lib/rotas";
import { Reveal } from "./ui";

/* o e-mail já com assunto e um começo de mensagem (o que ajuda a resolver mais rápido) */
const email = (assunto: string, corpo: string) =>
  `mailto:${CONTATO}?subject=${encodeURIComponent(`Suporte RONDO: ${assunto}`)}&body=${encodeURIComponent(corpo)}`;

type Assunto = { titulo: string; texto: string; icone: string; acoes: { rotulo: string; href: string }[] };

const ASSUNTOS: Assunto[] = [
  {
    titulo: "Algo não funciona",
    texto: "Um botão que não responde, uma tela que não abre, um erro. Conte o que aconteceu e, se der, mande um print.",
    icone: '<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17h.01"/>',
    acoes: [{ rotulo: "Contar o problema", href: email("algo não funciona", "O que aconteceu:\n\nOnde (app, site ou loja):\n\nCelular ou computador, e o navegador:\n") }],
  },
  {
    titulo: "Conta e acesso",
    texto: "Esqueceu a senha, não consegue entrar ou quer trocar o e-mail da conta.",
    icone: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    acoes: [
      { rotulo: "Esqueci a senha", href: APP_ENTRAR },
      { rotulo: "Escrever", href: email("conta e acesso", "O e-mail da conta:\n\nO que está acontecendo:\n") },
    ],
  },
  {
    titulo: "Loja de pacotinhos",
    texto: "Dúvidas sobre os pacotinhos, os browniezinhos da sua coleção ou a abertura da loja.",
    icone: '<path d="M4 9h16l-1 11H5z"/><path d="M8 9a4 4 0 0 1 8 0"/>',
    acoes: [{ rotulo: "Falar da loja", href: email("loja de pacotinhos", "A sua conta (@ ou e-mail):\n\nA dúvida:\n") }],
  },
  {
    titulo: "Seus dados",
    texto: "Ver o que guardamos, corrigir ou apagar a conta com tudo. Pelo app, em Configurações, ou por aqui.",
    icone: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/>',
    acoes: [
      { rotulo: "Excluir a conta", href: "/excluir-conta" },
      { rotulo: "Privacidade", href: "/privacidade" },
    ],
  },
  {
    titulo: "Denunciar",
    texto: "Viu algo que não devia no app? Toque nos três pontinhos do post, do comentário ou do perfil e em Denunciar. Fora do app, escreva para nós.",
    icone: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>',
    acoes: [{ rotulo: "Denunciar por e-mail", href: email("denúncia", "O que você quer denunciar (link, @ ou print):\n\nO motivo:\n") }],
  },
];

export function Suporte() {
  return (
    <section className="section suporte" id="suporte" aria-labelledby="suporte-titulo">
      <div className="wrap">
        <Reveal className="section-head suporte-cabeca">
          <h2 id="suporte-titulo" className="display">Precisa de ajuda?</h2>
          <p className="lead">Escolha o assunto: o e-mail já abre com o que precisamos saber para resolver. Se preferir, escreva direto para <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.</p>
        </Reveal>
        <ul className="suporte-grade">
          {ASSUNTOS.map((a) => (
            <Reveal as="li" key={a.titulo} className="suporte-cartao">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: a.icone }} />
              <h3>{a.titulo}</h3>
              <p>{a.texto}</p>
              <div className="suporte-acoes">
                {a.acoes.map((x) => <a key={x.rotulo} href={x.href}>{x.rotulo} <span aria-hidden="true">→</span></a>)}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
