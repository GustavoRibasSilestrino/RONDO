/* "Continuar com o Google" no site (tela do RONDIN, /entrar), com o botão oficial do Google Identity Services, igual ao do
   app (app/src/lib/loginSocial.ts). O ID do cliente é público (vai no código do site de qualquer jeito) e é o mesmo do app:
   o cliente OAuth "RONDO web" aceita a origem https://userondo.vercel.app, onde o site e o app moram. O servidor confere o
   id_token em /auth/google. A CSP do site (vercel.json) libera accounts.google.com só para isso. */
export const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "952490182729-ndtqloiak1u8mj6h21md1cqf5m0t0l0l.apps.googleusercontent.com";

type Gis = { accounts: { id: { initialize: (c: object) => void; renderButton: (el: HTMLElement, o: object) => void } } };

let script: Promise<void> | null = null;
function carregar(): Promise<void> {
  script ??= new Promise<void>((ok, falha) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => { script = null; falha(new Error("google")); };
    document.head.appendChild(s);
  });
  return script;
}

/* desenha o botão do Google dentro de `alvo`; quando a pessoa escolhe a conta, `aoToken` recebe o id_token */
export async function desenharBotaoGoogle(alvo: HTMLElement, largura: number, aoToken: (idToken: string) => void): Promise<void> {
  await carregar();
  const g = (window as unknown as { google?: Gis }).google;
  if (!g) throw new Error("google");
  g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r: { credential?: string }) => { if (r.credential) aoToken(r.credential); }, ux_mode: "popup" });
  alvo.replaceChildren();
  /* a página é escura e o quadro do Google é claro: dizer que a caixa é clara evita o retângulo branco em volta do botão */
  alvo.style.colorScheme = "light";
  g.accounts.id.renderButton(alvo, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular", logo_alignment: "left", width: Math.round(largura), locale: "pt-BR" });
}
