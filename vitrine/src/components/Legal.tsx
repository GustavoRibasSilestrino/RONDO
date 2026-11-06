/* Páginas legais do site: privacidade, termos, cancelamento e reembolso, suboperadores, licenças e direitos autorais.
   Os textos descrevem o que o app e o servidor fazem HOJE. Mudou algo (um dado novo, um fornecedor novo, cobrança)?
   Atualize aqui, suba a versão em backend/app/legal.py e em lib/consentimento.ts, e peça revisão jurídica. */
import type { ComponentType, ReactNode } from "react";
import { abrirPreferenciasCookies } from "../lib/consentimento";
import { Mark } from "./ui";

export const CONTATO = "rondooficial.dev@gmail.com";
export const RESPONSAVEL = "Gustavo Ribas Silestrino";
const ATUALIZADO = "5 de novembro de 2026";

const Email = () => <a href={`mailto:${CONTATO}`}>{CONTATO}</a>;

function Pagina({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <>
      <header className="legal-topo">
        <div className="wrap legal-topo-in">
          <a href="/" className="logo logo-nome" aria-label="RONDO, voltar ao início"><Mark className="logo-mark" />RONDO</a>
          <a href="/" className="legal-voltar">Voltar ao site</a>
        </div>
      </header>
      <main id="conteudo" className="wrap legal">
        <h1>{titulo}</h1>
        <p className="legal-data">Última atualização: {ATUALIZADO}</p>
        {children}
      </main>
      <footer className="footer">
        <div className="wrap">
          <nav className="footer-links legal-links" aria-label="Documentos">
            <a href="/termos">Termos de Uso</a><a href="/privacidade">Política de Privacidade</a><a href="/reembolso">Cancelamento e reembolso</a>
            <a href="/suboperadores">Suboperadores</a><a href="/licencas">Licenças e créditos</a><a href="/direitos-autorais">Direitos autorais</a>
            <button type="button" className="link-botao" onClick={() => abrirPreferenciasCookies()}>Preferências de cookies</button>
          </nav>
          <p className="disclaimer">Responsável: {RESPONSAVEL} · Contato: <Email /></p>
        </div>
      </footer>
    </>
  );
}

/* ---------------------------------------------------------------- privacidade */
function Privacidade() {
  return (
    <Pagina titulo="Política de Privacidade">
      <p>
        Esta política explica quais dados o RONDO (site e app) trata, para quê, por quanto tempo e como você exerce os seus
        direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2>1. Quem é o responsável</h2>
      <p>
        O controlador dos dados é {RESPONSAVEL}, pessoa física, que também atua como encarregado (a pessoa de contato
        para assuntos de dados pessoais). Fale pelo e-mail <Email />.
      </p>

      <h2>2. Quais dados tratamos</h2>
      <h3>Ao criar a conta (site)</h3>
      <ul>
        <li>Nome, e-mail e senha. A senha é guardada só como hash (Argon2): nem nós conseguimos lê-la.</li>
        <li>Data de nascimento, só para saber se a pessoa é menor de idade.</li>
        <li>Se tiver menos de 18 anos: nome e e-mail do responsável que autorizou.</li>
        <li>O registro dos aceites: quais documentos, em qual versão, quando e por onde (site ou app). E a sua escolha sobre e-mails de novidades.</li>
      </ul>
      <h3>Ao usar o app</h3>
      <ul>
        <li>
          <b>Dados de saúde e de rotina</b>, que você mesmo registra: treinos, cargas, refeições, água, peso, check-ins,
          idade, sexo, altura, nível de atividade e objetivo. São dados sensíveis (LGPD, art. 11) e só são tratados com o seu
          consentimento, para as funções do app.
        </li>
        <li>Perfil público: nome, @, bio e o selo, se houver.</li>
        <li>O que você publica: posts, fotos, comentários, cheers, stories, clubes, quem você segue e quem segue você.</li>
        <li>Avisos do app (quem deu cheers, comentou ou começou a seguir você).</li>
      </ul>
      <h3>O que fica só no seu aparelho</h3>
      <ul>
        <li>Os áudios dos recados de voz. Eles não vão para o nosso servidor. O servidor guarda só a lista: a pergunta, a duração, as datas e o caminho do arquivo dentro do seu aparelho.</li>
        <li>Fotos que você escolheu mas não publicou.</li>
      </ul>
      <h3>Cadastro de profissional</h3>
      <p>Nome, e-mail, conselho (CRN ou CREF), número do registro e UF, para conferir o registro na consulta pública do conselho.</p>
      <h3>O que não coletamos</h3>
      <p>
        Não usamos ferramentas de análise, publicidade ou rastreamento, não pedimos localização, contatos, CPF nem dados de
        cartão. Os provedores de hospedagem guardam registros técnicos de acesso (como endereço IP e horário) por segurança.
      </p>

      <h2>3. Para que usamos e com qual base legal</h2>
      <ul>
        <li><b>Prestar o serviço</b> (conta, sincronização, parte social): execução de contrato (art. 7º, V).</li>
        <li><b>Dados de saúde</b>: consentimento específico e destacado, dado no cadastro (art. 11, I).</li>
        <li><b>Menores de idade</b>: consentimento de um dos pais ou responsável (art. 14).</li>
        <li><b>E-mails de novidades</b>: só com consentimento separado, que começa desligado. Você desliga quando quiser no app (Configurações) ou pelo e-mail.</li>
        <li><b>Guardar o registro dos aceites e a segurança</b>: cumprimento de obrigação legal e legítimo interesse (art. 7º, II e IX).</li>
      </ul>
      <p>
        <b>Inteligência artificial:</b> hoje o RONDO não usa IA. Os seus dados não são usados para treinar modelos de IA,
        nossos nem de terceiros. Se um dia houver conteúdo gerado por IA, ele será identificado como tal.
      </p>

      <h2>4. Quem vê os seus dados</h2>
      <ul>
        <li>Os seus registros de saúde e rotina são privados: só você vê.</li>
        <li>Posts, comentários, cheers, stories (por 24 horas, para quem segue você) e o perfil público aparecem para outras pessoas do app.</li>
        <li>
          As fotos publicadas ficam num armazenamento com endereço público: quem tiver o link da foto consegue abri-la,
          mesmo fora do app. Publique só o que você aceita que seja visto.
        </li>
        <li>Não vendemos nem alugamos dados. Os fornecedores que hospedam o serviço estão em <a href="/suboperadores">Suboperadores</a>.</li>
      </ul>

      <h2>5. Transferência internacional</h2>
      <p>
        O banco de dados, o armazenamento de fotos, o servidor e o site ficam em fornecedores nos Estados Unidos (veja
        <a href="/suboperadores"> Suboperadores</a>). Usamos fornecedores que oferecem acordos de tratamento de dados com
        garantias de proteção.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <table className="legal-tabela">
        <thead><tr><th scope="col">Dado</th><th scope="col">Prazo</th></tr></thead>
        <tbody>
          <tr><td>Conta, dados do app e publicações</td><td>Enquanto a conta existir. Ao apagar a conta, tudo sai do banco na hora.</td></tr>
          <tr><td>Stories</td><td>24 horas; depois são apagados do banco, com a foto.</td></tr>
          <tr><td>Avisos do app</td><td>180 dias.</td></tr>
          <tr><td>Registro dos aceites</td><td>Enquanto a conta existir.</td></tr>
          <tr><td>Cadastro de profissional</td><td>Até você pedir a exclusão.</td></tr>
          <tr><td>Recados de voz</td><td>Só no seu aparelho, até você apagar.</td></tr>
          <tr><td>Cópias de segurança do provedor do banco</td><td>Podem guardar dados apagados por um curto período, até serem substituídas.</td></tr>
        </tbody>
      </table>

      <h2>7. Os seus direitos</h2>
      <p>Você pode, a qualquer momento:</p>
      <ul>
        <li><b>Ver e baixar</b> uma cópia de tudo o que o servidor guarda sobre você: no app, em Configurações.</li>
        <li><b>Apagar a conta</b> e todos os dados dela: no app, em Configurações (pede a senha para confirmar).</li>
        <li><b>Corrigir</b> nome, @ e bio no próprio app.</li>
        <li><b>Revogar consentimentos</b>, como o de e-mails de novidades. Revogar o consentimento dos dados de saúde equivale a apagar a conta, porque o app não funciona sem eles.</li>
        <li>Pedir informações sobre o uso e o compartilhamento dos seus dados, e a portabilidade.</li>
      </ul>
      <p>
        Também dá para pedir tudo isso pelo e-mail <Email />. Respondemos em até 15 dias. Se não ficar satisfeito, você pode
        reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>8. Crianças e adolescentes</h2>
      <p>
        Qualquer idade pode usar o RONDO, mas quem tem menos de 18 anos só cria a conta com a autorização de um dos pais ou
        responsável, que informa o nome e o e-mail. O responsável pode pedir a qualquer momento a cópia ou a exclusão dos
        dados pelo e-mail <Email />. Tratamos esses dados no melhor interesse da criança ou do adolescente.
      </p>

      <h2 id="cookies">9. Cookies e armazenamento no navegador</h2>
      <p>
        O site usa só armazenamento essencial: guardar a sua escolha sobre cookies. As fontes do site são servidas pelo
        próprio site, sem chamar serviços de terceiros. Não usamos cookies de análise, de publicidade nem de rastreamento.
        Se um dia usarmos, eles só serão ligados depois do seu aceite, e esta política será atualizada antes. O app guarda
        os seus dados e a sua sessão no próprio aparelho para funcionar.
      </p>
      <p><button type="button" className="link-botao" onClick={() => abrirPreferenciasCookies()}>Mudar as preferências de cookies</button></p>

      <h2>10. Segurança</h2>
      <p>
        Conexões com HTTPS, senhas guardadas como hash Argon2, sessão com prazo de validade e acesso ao banco restrito.
        Nenhum sistema é 100% seguro: se houver um incidente que possa causar risco ou dano relevante, avisaremos você e a
        ANPD.
      </p>

      <h2>11. Mudanças nesta política</h2>
      <p>
        Avisaremos no app e no site antes de mudanças importantes. Cada versão aceita fica registrada com a data.
      </p>
    </Pagina>
  );
}

/* ---------------------------------------------------------------- termos */
function Termos() {
  return (
    <Pagina titulo="Termos de Uso">
      <p>
        Estes termos valem para o site e o app RONDO, oferecidos por {RESPONSAVEL}. Ao criar a conta, você confirma que leu
        e aceita estes termos e a <a href="/privacidade">Política de Privacidade</a>. O aceite fica registrado com a data e a versão.
      </p>

      <h2>1. O que o RONDO é</h2>
      <p>
        Um app para organizar e acompanhar treino, dieta, água, sono e constância, com uma parte social. Ele não substitui
        avaliação médica, nutricional ou de educação física. Cálculos como 1RM e meta calórica são estimativas, não
        prescrição. Procure um profissional antes de mudar a sua rotina de forma importante.
      </p>

      <h2>2. Quem pode usar</h2>
      <p>
        Qualquer idade. Quem tem menos de 18 anos precisa da autorização de um dos pais ou responsável, informada no
        cadastro. O responsável responde pelo uso do app pelo menor.
      </p>

      <h2>3. A sua conta</h2>
      <ul>
        <li>Use dados verdadeiros e mantenha a sua senha em segredo. A conta é pessoal.</li>
        <li>Você pode apagar a conta quando quiser, no app, em Configurações.</li>
        <li>Podemos suspender contas que violem estes termos, avisando o motivo quando possível.</li>
      </ul>

      <h2>4. O que não é permitido</h2>
      <ul>
        <li>Publicar conteúdo ilegal, ofensivo, discriminatório, de assédio, sexual envolvendo menores, ou que exponha dados de outras pessoas.</li>
        <li>Publicar fotos, textos ou músicas de outras pessoas sem permissão.</li>
        <li>Fingir ser outra pessoa ou profissional, ou trapacear no ranking.</li>
        <li>Tentar invadir, sobrecarregar ou copiar o serviço de forma automatizada.</li>
      </ul>

      <h2>5. O seu conteúdo</h2>
      <p>
        O que você publica continua sendo seu. Você nos dá apenas a permissão necessária para guardar e mostrar esse
        conteúdo no RONDO, para as pessoas que podem vê-lo. Essa permissão acaba quando você apaga o conteúdo ou a conta.
        Não usamos o seu conteúdo para treinar inteligência artificial.
      </p>

      <h2>6. Profissionais</h2>
      <p>
        O cadastro de nutricionistas e profissionais de Educação Física está aberto, e cada registro é conferido à mão na
        consulta pública do conselho. O acompanhamento de alunos pelo app ainda não existe; quando existir, cada profissional
        só poderá orientar no que a sua profissão permite e responderá pelas próprias orientações.
      </p>

      <h2>7. Planos pagos</h2>
      <p>
        Hoje o RONDO é gratuito: nenhum plano pago está à venda e nada é cobrado. Quando os planos abrirem, o preço, a
        renovação automática, o cancelamento e o reembolso seguirão a página <a href="/reembolso">Cancelamento e reembolso</a>,
        e estes termos serão atualizados antes, com aviso.
      </p>

      <h2>8. Disponibilidade</h2>
      <p>
        O RONDO é um projeto em desenvolvimento, oferecido no estado em que está. Fazemos o possível para mantê-lo no ar,
        mas não garantimos funcionamento contínuo: o servidor usa planos de hospedagem que podem ficar lentos, fora do ar ou
        passar por manutenção. Recursos marcados como "em breve" ainda não existem.
      </p>

      <h2>9. Responsabilidade</h2>
      <p>
        Respondemos pelos danos que causarmos, nos termos do Código de Defesa do Consumidor. Não respondemos por decisões de
        treino ou dieta tomadas sem orientação profissional, nem por conteúdo publicado por outras pessoas, que removemos
        quando avisados de violação.
      </p>

      <h2>10. Propriedade intelectual</h2>
      <p>
        A marca RONDO, o design e o código do serviço são protegidos. Partes de terceiros seguem as próprias licenças,
        listadas em <a href="/licencas">Licenças e créditos</a>. Avisos de violação de direitos autorais:
        veja <a href="/direitos-autorais">Direitos autorais</a>.
      </p>

      <h2>11. Mudanças e contato</h2>
      <p>
        Podemos atualizar estes termos; avisaremos antes no app e no site, e mudanças importantes pedirão um novo aceite.
        Dúvidas: <Email />. Estes termos seguem a lei brasileira, e o foro é o do domicílio do consumidor.
      </p>
    </Pagina>
  );
}

/* ---------------------------------------------------------------- cancelamento e reembolso */
function Reembolso() {
  return (
    <Pagina titulo="Cancelamento e reembolso">
      <p className="legal-destaque">
        Hoje nenhum plano pago está à venda e nada é cobrado. Estas são as regras que vão valer quando os planos PRO e
        Profissional abrirem.
      </p>
      <h2>Preço</h2>
      <p>O preço mostrado na contratação é o preço final, por mês, com impostos. Não há taxa de adesão, de cancelamento nem qualquer outra cobrança escondida.</p>
      <h2>Renovação automática</h2>
      <p>A assinatura se renova sozinha a cada mês, no mesmo dia da contratação. Antes de cada cobrança, você recebe um e-mail avisando a data e o valor.</p>
      <h2>Cancelamento</h2>
      <p>Você cancela quando quiser, no próprio app, em poucos toques, sem precisar falar com ninguém e sem multa. O plano continua ativo até o fim do mês já pago e não é renovado.</p>
      <h2>Reembolso</h2>
      <ul>
        <li><b>Arrependimento:</b> em até 7 dias da primeira contratação, você recebe o valor total de volta (Código de Defesa do Consumidor, art. 49).</li>
        <li><b>Cobrança indevida ou em dobro:</b> devolvemos o valor cobrado a mais.</li>
        <li>Pedidos de reembolso: pelo app ou pelo e-mail <Email />. O valor volta pelo mesmo meio de pagamento.</li>
      </ul>
      <h2>Mudança de preço</h2>
      <p>Avisaremos com pelo menos 30 dias de antecedência. Você pode cancelar antes de o novo preço valer.</p>
    </Pagina>
  );
}

/* ---------------------------------------------------------------- suboperadores */
const SUBOPERADORES = [
  { nome: "Supabase", faz: "Banco de dados (conta, dados do app, parte social) e armazenamento das fotos publicadas", onde: "Estados Unidos (Oregon)", dpa: "https://supabase.com/legal/dpa" },
  { nome: "Render", faz: "Servidor da API (processa as requisições do app e do site)", onde: "Estados Unidos (Oregon)", dpa: "https://render.com/dpa" },
  { nome: "Vercel", faz: "Hospedagem do site e da versão web do app", onde: "Estados Unidos e rede global de entrega", dpa: "https://vercel.com/legal/dpa" },
  { nome: "Google (Gmail)", faz: "Recebe os e-mails que você manda para o nosso contato", onde: "Estados Unidos e outros países", dpa: "https://policies.google.com/privacy" },
];

function Suboperadores() {
  return (
    <Pagina titulo="Suboperadores">
      <p>
        Estes são os fornecedores que tratam dados pessoais em nosso nome para o RONDO funcionar. Não usamos fornecedores
        de análise, publicidade ou rastreamento. Avisaremos aqui antes de incluir um fornecedor novo.
      </p>
      <table className="legal-tabela">
        <thead><tr><th scope="col">Fornecedor</th><th scope="col">O que faz</th><th scope="col">Onde</th><th scope="col">Proteção de dados</th></tr></thead>
        <tbody>
          {SUBOPERADORES.map((s) => (
            <tr key={s.nome}>
              <td>{s.nome}</td><td>{s.faz}</td><td>{s.onde}</td>
              <td><a href={s.dpa} target="_blank" rel="noopener noreferrer">Ver documento<span className="sr-only"> de {s.nome} (abre em nova aba)</span></a></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        O código do RONDO fica no GitHub e o app é construído com o Expo; esses serviços não recebem dados das pessoas que
        usam o app.
      </p>
    </Pagina>
  );
}

/* ---------------------------------------------------------------- licenças */
function Licencas() {
  return (
    <Pagina titulo="Licenças e créditos">
      <p>
        O RONDO usa software livre de terceiros. Agradecemos aos autores. Os avisos completos de cada licença acompanham os
        pacotes no código-fonte.
      </p>
      <h2>Fontes</h2>
      <ul>
        <li>Inter e Inter Tight, de Rasmus Andersson: SIL Open Font License 1.1.</li>
        <li>JetBrains Mono, da JetBrains: SIL Open Font License 1.1.</li>
        <li>Poppins, da Indian Type Foundry (no app): SIL Open Font License 1.1.</li>
      </ul>
      <h2>Bibliotecas do site e do app</h2>
      <ul>
        <li>React, React DOM, React Native, React Native Web, Expo e os módulos do Expo, Vite: licença MIT.</li>
        <li>react-native-svg e AsyncStorage: licença MIT.</li>
        <li>Fontsource (empacotamento das fontes): licença MIT; as fontes seguem a licença OFL acima.</li>
        <li>Ferramentas de compilação (lightningcss, sob MPL 2.0; dados do caniuse-lite, sob CC BY 4.0, de caniuse.com e Alexis Deveria) são usadas só na hora de gerar o site.</li>
      </ul>
      <h2>Bibliotecas do servidor</h2>
      <ul>
        <li>FastAPI, Pydantic, SQLAlchemy, Alembic, PyJWT e argon2-cffi: licença MIT.</li>
        <li>Uvicorn e HTTPX: licença BSD.</li>
        <li>psycopg (conexão com o Postgres): LGPL 3.0, usada sem modificação.</li>
      </ul>
      <h2>Código do RONDO</h2>
      <p>O código do repositório do RONDO é distribuído sob a licença MIT, de {RESPONSAVEL}.</p>
      <h2>Marcas de terceiros</h2>
      <p>O RONDO não exibe logotipos de clientes, parceiros ou outras empresas.</p>
    </Pagina>
  );
}

/* ---------------------------------------------------------------- direitos autorais */
function DireitosAutorais() {
  return (
    <Pagina titulo="Direitos autorais">
      <p>
        Respeitamos os direitos autorais (Lei 9.610/1998). Se você acredita que algum conteúdo publicado no RONDO viola um
        direito seu, mande um e-mail para <Email /> com:
      </p>
      <ul>
        <li>o seu nome e um contato;</li>
        <li>a obra protegida e por que você é o titular (ou representa o titular);</li>
        <li>o link ou a descrição exata do conteúdo no RONDO;</li>
        <li>uma declaração de que as informações são verdadeiras.</li>
      </ul>
      <p>
        Analisamos cada aviso, removemos o conteúdo quando a violação for clara e avisamos quem publicou, que pode responder.
        Ordens judiciais são cumpridas nos termos do Marco Civil da Internet (Lei 12.965/2014).
      </p>
      <p>
        O RONDO é um serviço brasileiro e não tem um agente registrado no Escritório de Direitos Autorais dos Estados Unidos
        (DMCA). Avisos de qualquer país podem ser enviados pelo mesmo e-mail.
      </p>
    </Pagina>
  );
}

export const PAGINAS_LEGAIS: Record<string, { titulo: string; Comp: ComponentType }> = {
  "/privacidade": { titulo: "Política de Privacidade", Comp: Privacidade },
  "/termos": { titulo: "Termos de Uso", Comp: Termos },
  "/reembolso": { titulo: "Cancelamento e reembolso", Comp: Reembolso },
  "/suboperadores": { titulo: "Suboperadores", Comp: Suboperadores },
  "/licencas": { titulo: "Licenças e créditos", Comp: Licencas },
  "/direitos-autorais": { titulo: "Direitos autorais", Comp: DireitosAutorais },
};
