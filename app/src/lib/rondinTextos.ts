/* Tudo o que o RONDIN diz e escreve, em português, inglês e espanhol. O roteiro (rondinRoteiro.ts) só guarda a ordem das
   perguntas e os ids das respostas (os mesmos nas três línguas); os textos vêm daqui, da língua que a pessoa escolheu na
   primeira pergunta. Os três blocos têm as mesmas chaves: `npm run textos` confere isso. {nome} entra o primeiro nome da pessoa.
   Dados puros, sem dependências: o app e o gerador de vozes leem este arquivo. */
import type { Idioma } from './rondinSotaques';

export type EstadoDoOrbe = 'quieto' | 'ouvindo' | 'pensando' | 'falando';

export type Textos = {
  amigo: string;                       // como ele chama quem ainda não disse o nome
  campeao: string;                     // e quem entra sem nome
  fala: Record<string, string>;        // a fala de cada pergunta
  campo: Record<string, string>;       // o rótulo de cada campo de texto
  sufixo: Record<string, string>;      // a unidade do campo (cm, kg)
  erro: Record<string, string>;        // o que ele diz quando a resposta não serve
  op: Record<string, string>;          // o rótulo de cada opção ("grupo.id")
  nota: Record<string, string>;        // a linha miúda de uma opção
  com: Record<string, string>;         // o comentário dele depois de uma opção
  barra: Record<string, string>;       // por que ele não deixa seguir
  falas: Record<string, string>;       // falas soltas (conta criada, nome em uso...)
  ui: {
    voltarInicio: string; voltarPergunta: string; criarConta: string; etapa: string;
    estado: Record<EstadoDoOrbe, string>;
    orbePular: string; orbeRepetir: string; pular: string; continuar: string;
    entrar: string; entrando: string; email: string; senha: string; verSenha: string; esconderSenha: string; esqueci: string; semConta: string;
    tentar: string; abreNoNavegador: string; termos: string; privacidade: string; dias: string;
  };
  rec: Record<string, string>;         // a tela "esqueci a senha"
  srv: Record<string, string>;         // o que o servidor responde, na língua da pessoa
};

const PT: Textos = {
  amigo: 'amigo', campeao: 'campeão',
  fala: {
    idioma: 'Antes de começar, escolha a sua língua.',
    apresentacao: 'Oi! Eu sou o RONDIN, o agente do RONDO. Vou te ajudar a criar a sua conta e montar o seu perfil de treino.',
    entrar: 'Oi! Eu sou o RONDIN, o agente do RONDO. Que ótimo ter você de volta! É só entrar com o seu e-mail e a sua senha.',
    nome: 'Como eu posso te chamar?',
    objetivo: 'Prazer, {nome}! Qual é o seu grande objetivo agora?',
    sexo: 'Para calcular as suas calorias direitinho, qual destas opções combina com você?',
    nascimento: 'Qual é a sua data de nascimento? Pode digitar só os números.',
    respNome: 'Como você tem menos de dezoito anos, preciso da autorização de um dos seus pais ou responsável. Qual é o nome dele?',
    respEmail: 'E o e-mail dele?',
    respAutoriza: 'O responsável autoriza a criação da sua conta e o uso dos seus dados, como descrito na Política de Privacidade?',
    altura: 'Agora o seu corpo. Quantos centímetros de altura você tem?',
    peso: 'E quanto você pesa hoje, em quilos?',
    experiencia: 'Agora o seu treino. Qual é a sua experiência com exercícios?',
    dias: 'Quantos dias por semana você consegue treinar?',
    local: 'Onde você vai treinar?',
    foco: 'O que você quer destacar no corpo? Pode escolher mais de uma.',
    lesoes: 'Tem alguma lesão ou limitação que eu deva saber? Eu cuido do resto.',
    dia: 'Fora do treino, como é o seu dia a dia?',
    email: 'Beleza, {nome}! Falta pouco. Agora a conta: qual é o seu e-mail?',
    senha: 'Escolha uma senha com pelo menos oito caracteres. Prometo que não conto pra ninguém.',
    termos: 'Última etapa. Preciso que você aceite os Termos de Uso e a Política de Privacidade, e autorize o uso dos seus dados de saúde, como peso e treinos, para o app funcionar. Você aceita?',
    criar: 'Perfeito, {nome}! Estou montando a sua conta e o seu perfil agora.',
  },
  campo: {
    nome: 'Seu nome', nascimento: 'Nascimento (DD/MM/AAAA)', respNome: 'Nome do responsável', respEmail: 'E-mail do responsável',
    altura: 'Altura', peso: 'Peso atual', email: 'E-mail', senha: 'Senha',
  },
  sufixo: { altura: 'cm', peso: 'kg' },
  erro: {
    nome: 'Digite o seu nome.', nascimento: 'Digite uma data que exista, no formato dia, mês e ano.', respNome: 'Digite o nome do responsável.',
    email: 'Digite um e-mail válido.', altura: 'Digite a altura em centímetros, entre 120 e 230.', peso: 'Digite o peso em quilos, entre 30 e 300.',
    senha: 'A senha precisa de pelo menos 8 caracteres.', senhaLogin: 'A senha tem pelo menos 6 caracteres.',
  },
  op: {
    'objetivo.gordura': 'Perder gordura', 'objetivo.massa': 'Ganhar massa muscular', 'objetivo.forma': 'Manter a forma',
    'objetivo.forca': 'Ficar mais forte', 'objetivo.saude': 'Ter mais saúde e disposição', 'objetivo.corrida': 'Correr mais e melhor',
    'sexo.m': 'Masculino', 'sexo.f': 'Feminino', 'sexo.nd': 'Prefiro não dizer',
    'respAutoriza.sim': 'Sim, autoriza', 'respAutoriza.nao': 'Ainda não',
    'experiencia.nunca': 'Nunca treinei', 'experiencia.iniciante': 'Iniciante', 'experiencia.intermediario': 'Intermediário', 'experiencia.avancado': 'Avançado',
    'local.academia': 'Na academia', 'local.casa': 'Em casa', 'local.rua': 'Ao ar livre', 'local.misto': 'Um pouco de tudo',
    'foco.peito_braco': 'Peito e braços', 'foco.costas': 'Costas', 'foco.pernas': 'Pernas e glúteos', 'foco.ombros': 'Ombros', 'foco.abdomen': 'Abdômen', 'foco.corpo': 'Corpo todo',
    'lesoes.nenhuma': 'Nenhuma', 'lesoes.joelho': 'Joelho', 'lesoes.ombro': 'Ombro', 'lesoes.coluna': 'Coluna', 'lesoes.punho': 'Punho ou cotovelo', 'lesoes.outra': 'Outra',
    'dia.sentado': 'Quase sempre sentado', 'dia.leve': 'Ando um pouco', 'dia.moderado': 'Em pé e me movimentando', 'dia.pesado': 'Trabalho pesado, muito ativo',
    'termos.aceito': 'Aceito', 'termos.ler': 'Quero ler antes',
  },
  nota: {
    'experiencia.iniciante': 'até 6 meses', 'experiencia.intermediario': '1 a 3 anos', 'experiencia.avancado': 'mais de 3 anos',
  },
  com: {
    'objetivo.gordura': 'Perder gordura é comigo. Treino e comida andam juntos.',
    'objetivo.massa': 'Hora de crescer! Vou pensar nisso no seu treino e na sua dieta.',
    'objetivo.forma': 'Manter também dá trabalho. Vamos fazer isso com constância.',
    'objetivo.forca': 'Força é o melhor investimento. Bora levantar peso.',
    'objetivo.saude': 'O melhor objetivo de todos. Seu eu do futuro agradece.',
    'objetivo.corrida': 'Pista livre! Vou te acompanhar a cada quilômetro.',
    'sexo.nd': 'Tudo bem. Vou usar uma média nas contas.',
    'experiencia.nunca': 'Todo mundo começa em algum lugar. Eu vou pegar leve no começo.',
    'experiencia.avancado': 'Veterano! Então vamos para o treino de verdade.',
  },
  barra: {
    respAutoriza: 'Sem a autorização do responsável eu não consigo criar a conta. Quando ele estiver com você, é só autorizar.',
    termos: 'Claro, leia com calma pelos links aqui embaixo. Quando terminar, é só tocar em aceito.',
  },
  falas: {
    deVolta: 'Bem-vindo de volta, {nome}! Que bom te ver.',
    contaCriada: 'Pronto, {nome}! Sua conta está criada e o seu perfil está salvo. Bem-vindo ao RONDO.',
    emailJaTem: 'Esse e-mail já tem uma conta. Use outro, ou volte e entre com ele.',
    nomeJaTem: 'Esse nome já é de outra conta. Escolha outro, por exemplo com o sobrenome.',
    falhaCriar: 'Não consegui criar a conta agora.',
  },
  ui: {
    voltarInicio: 'Voltar para o início', voltarPergunta: 'Voltar uma pergunta', criarConta: 'CRIAR CONTA', etapa: 'ETAPA',
    estado: { quieto: 'EM ESPERA', ouvindo: 'OUVINDO', pensando: 'PROCESSANDO', falando: 'FALANDO' },
    orbePular: 'RONDIN. Tocar para pular a fala', orbeRepetir: 'RONDIN. Tocar para ouvir a pergunta de novo', pular: 'Pular fala', continuar: 'Continuar',
    entrar: 'Entrar', entrando: 'Entrando…', email: 'E-mail', senha: 'Senha', verSenha: 'Mostrar senha', esconderSenha: 'Esconder senha',
    esqueci: 'Esqueci a minha senha', semConta: 'Ainda não tenho conta', tentar: 'Tentar de novo', abreNoNavegador: 'abre no navegador',
    termos: 'Termos de Uso', privacidade: 'Política de Privacidade', dias: '{n} dias',
  },
  rec: {
    titulo1: 'Esqueci a senha', texto1: 'Digite o e-mail da sua conta. Vamos mandar um código de 6 números para ele.', email: 'E-mail', enviarCodigo: 'Enviar código', enviando: 'Enviando…',
    titulo2: 'Veja o seu e-mail', texto2a: 'Se existe uma conta com ', texto2b: ', o código está a caminho. Ele vale por 15 minutos. Olhe também o spam.',
    codigo: 'Código de 6 números', senhaNova: 'Senha nova', trocar: 'Trocar a senha', trocando: 'Trocando…',
    espera: 'Não chegou? Você pode pedir outro em {n} s', reenviar: 'Não chegou? Enviar de novo',
    titulo3: 'Senha trocada', texto3: 'Pronto! Agora é só entrar com o seu e-mail e a senha nova.', voltar: 'Voltar',
    emailInvalido: 'Digite um e-mail válido.', codigoInvalido: 'O código tem 6 números.', senhaCurta: 'A senha nova precisa de pelo menos 8 caracteres.',
    falhaEnviar: 'Não foi possível enviar agora. Tente de novo.', falhaTrocar: 'Não foi possível trocar a senha agora. Tente de novo.',
  },
  srv: {},   // em português a mensagem do servidor já vem na língua certa
};

const EN: Textos = {
  amigo: 'friend', campeao: 'champ',
  fala: {
    idioma: 'Before we start, choose your language.',
    apresentacao: 'Hi! I am RONDIN, the RONDO agent. I will help you create your account and set up your training profile.',
    entrar: 'Hi! I am RONDIN, the RONDO agent. Great to have you back! Just sign in with your email and your password.',
    nome: 'What should I call you?',
    objetivo: 'Nice to meet you, {nome}! What is your main goal right now?',
    sexo: 'To work out your calories properly, which of these fits you?',
    nascimento: 'What is your date of birth? You can just type the numbers.',
    respNome: 'Since you are under eighteen, I need permission from a parent or guardian. What is their name?',
    respEmail: 'And their email?',
    respAutoriza: 'Does your guardian authorize the creation of your account and the use of your data, as described in the Privacy Policy?',
    altura: 'Now your body. How tall are you, in centimeters?',
    peso: 'And how much do you weigh today, in kilograms?',
    experiencia: 'Now your training. How much experience do you have with exercise?',
    dias: 'How many days a week can you train?',
    local: 'Where will you train?',
    foco: 'What do you want to bring out in your body? You can pick more than one.',
    lesoes: 'Do you have any injury or limitation I should know about? I will take care of the rest.',
    dia: 'Outside of training, what is your day like?',
    email: 'Great, {nome}! Almost there. Now the account: what is your email?',
    senha: 'Choose a password with at least eight characters. I promise I will not tell anyone.',
    termos: 'Last step. I need you to accept the Terms of Use and the Privacy Policy, and to allow the use of your health data, like weight and workouts, so the app can work. Do you accept?',
    criar: 'Perfect, {nome}! I am setting up your account and your profile now.',
  },
  campo: {
    nome: 'Your name', nascimento: 'Date of birth (DD/MM/YYYY)', respNome: "Guardian's name", respEmail: "Guardian's email",
    altura: 'Height', peso: 'Current weight', email: 'Email', senha: 'Password',
  },
  sufixo: { altura: 'cm', peso: 'kg' },
  erro: {
    nome: 'Type your name.', nascimento: 'Type a real date, in day, month and year order.', respNome: "Type the guardian's name.",
    email: 'Type a valid email.', altura: 'Type your height in centimeters, between 120 and 230.', peso: 'Type your weight in kilograms, between 30 and 300.',
    senha: 'The password needs at least 8 characters.', senhaLogin: 'The password has at least 6 characters.',
  },
  op: {
    'objetivo.gordura': 'Lose fat', 'objetivo.massa': 'Build muscle', 'objetivo.forma': 'Stay in shape',
    'objetivo.forca': 'Get stronger', 'objetivo.saude': 'Feel healthier and more energetic', 'objetivo.corrida': 'Run more and better',
    'sexo.m': 'Male', 'sexo.f': 'Female', 'sexo.nd': 'Prefer not to say',
    'respAutoriza.sim': 'Yes, they authorize', 'respAutoriza.nao': 'Not yet',
    'experiencia.nunca': "I've never trained", 'experiencia.iniciante': 'Beginner', 'experiencia.intermediario': 'Intermediate', 'experiencia.avancado': 'Advanced',
    'local.academia': 'At the gym', 'local.casa': 'At home', 'local.rua': 'Outdoors', 'local.misto': 'A bit of everything',
    'foco.peito_braco': 'Chest and arms', 'foco.costas': 'Back', 'foco.pernas': 'Legs and glutes', 'foco.ombros': 'Shoulders', 'foco.abdomen': 'Abs', 'foco.corpo': 'Whole body',
    'lesoes.nenhuma': 'None', 'lesoes.joelho': 'Knee', 'lesoes.ombro': 'Shoulder', 'lesoes.coluna': 'Spine', 'lesoes.punho': 'Wrist or elbow', 'lesoes.outra': 'Other',
    'dia.sentado': 'Mostly sitting', 'dia.leve': 'I walk a little', 'dia.moderado': 'On my feet and moving', 'dia.pesado': 'Physical work, very active',
    'termos.aceito': 'I accept', 'termos.ler': 'I want to read first',
  },
  nota: {
    'experiencia.iniciante': 'up to 6 months', 'experiencia.intermediario': '1 to 3 years', 'experiencia.avancado': 'over 3 years',
  },
  com: {
    'objetivo.gordura': 'Losing fat is my thing. Training and food go hand in hand.',
    'objetivo.massa': "Time to grow! I'll build that into your training and your diet.",
    'objetivo.forma': 'Staying in shape takes work too. We will do it with consistency.',
    'objetivo.forca': 'Strength is the best investment. Let us lift some weight.',
    'objetivo.saude': 'The best goal of all. Your future self says thanks.',
    'objetivo.corrida': 'Clear track! I will be with you every kilometer.',
    'sexo.nd': 'That is fine. I will use an average in the math.',
    'experiencia.nunca': 'Everyone starts somewhere. I will go easy at first.',
    'experiencia.avancado': 'A veteran! Then let us get to the real training.',
  },
  barra: {
    respAutoriza: "Without your guardian's authorization I can't create the account. When they are with you, just authorize.",
    termos: 'Of course, take your time with the links below. When you are done, just tap accept.',
  },
  falas: {
    deVolta: 'Welcome back, {nome}! Good to see you.',
    contaCriada: 'Done, {nome}! Your account is created and your profile is saved. Welcome to RONDO.',
    emailJaTem: 'That email already has an account. Use another one, or go back and sign in with it.',
    nomeJaTem: 'That name already belongs to another account. Pick another one, for example with your last name.',
    falhaCriar: "I couldn't create the account right now.",
  },
  ui: {
    voltarInicio: 'Back to the start', voltarPergunta: 'Back one question', criarConta: 'CREATE ACCOUNT', etapa: 'STEP',
    estado: { quieto: 'STANDBY', ouvindo: 'LISTENING', pensando: 'PROCESSING', falando: 'SPEAKING' },
    orbePular: 'RONDIN. Tap to skip', orbeRepetir: 'RONDIN. Tap to hear the question again', pular: 'Skip', continuar: 'Continue',
    entrar: 'Sign in', entrando: 'Signing in…', email: 'Email', senha: 'Password', verSenha: 'Show password', esconderSenha: 'Hide password',
    esqueci: 'I forgot my password', semConta: "I don't have an account yet", tentar: 'Try again', abreNoNavegador: 'opens in the browser',
    termos: 'Terms of Use', privacidade: 'Privacy Policy', dias: '{n} days',
  },
  rec: {
    titulo1: 'Forgot password', texto1: 'Type the email of your account. We will send a 6-digit code to it.', email: 'Email', enviarCodigo: 'Send code', enviando: 'Sending…',
    titulo2: 'Check your email', texto2a: 'If an account exists for ', texto2b: ', the code is on its way. It is valid for 15 minutes. Check your spam folder too.',
    codigo: '6-digit code', senhaNova: 'New password', trocar: 'Change password', trocando: 'Changing…',
    espera: "Didn't arrive? You can ask for another in {n} s", reenviar: "Didn't arrive? Send again",
    titulo3: 'Password changed', texto3: 'Done! Now just sign in with your email and your new password.', voltar: 'Back',
    emailInvalido: 'Type a valid email.', codigoInvalido: 'The code has 6 digits.', senhaCurta: 'The new password needs at least 8 characters.',
    falhaEnviar: 'Could not send right now. Try again.', falhaTrocar: 'Could not change the password right now. Try again.',
  },
  srv: {
    credenciais: 'Wrong email or password.', tentativas: 'Too many attempts. Wait 15 minutes or use "I forgot my password".',
    conexao: 'No connection. Try again in a moment.', servidor: 'The RONDO server is not set up on this device.',
    codigo: 'Invalid or expired code. Request a new one.', padrao: 'Something went wrong. Try again.',
  },
};

const ES: Textos = {
  amigo: 'amigo', campeao: 'campeón',
  fala: {
    idioma: 'Antes de empezar, elige tu idioma.',
    apresentacao: '¡Hola! Soy RONDIN, el agente de RONDO. Te voy a ayudar a crear tu cuenta y a armar tu perfil de entrenamiento.',
    entrar: '¡Hola! Soy RONDIN, el agente de RONDO. ¡Qué bueno tenerte de vuelta! Solo inicia sesión con tu correo y tu contraseña.',
    nome: '¿Cómo te llamo?',
    objetivo: '¡Mucho gusto, {nome}! ¿Cuál es tu gran objetivo ahora?',
    sexo: 'Para calcular bien tus calorías, ¿cuál de estas opciones va contigo?',
    nascimento: '¿Cuál es tu fecha de nacimiento? Puedes escribir solo los números.',
    respNome: 'Como eres menor de dieciocho años, necesito la autorización de uno de tus padres o de tu tutor. ¿Cómo se llama?',
    respEmail: '¿Y su correo electrónico?',
    respAutoriza: '¿El responsable autoriza la creación de tu cuenta y el uso de tus datos, como se describe en la Política de Privacidad?',
    altura: 'Ahora tu cuerpo. ¿Cuántos centímetros mides?',
    peso: '¿Y cuánto pesas hoy, en kilos?',
    experiencia: 'Ahora tu entrenamiento. ¿Qué experiencia tienes con el ejercicio?',
    dias: '¿Cuántos días a la semana puedes entrenar?',
    local: '¿Dónde vas a entrenar?',
    foco: '¿Qué quieres destacar en tu cuerpo? Puedes elegir más de una.',
    lesoes: '¿Tienes alguna lesión o limitación que deba saber? Yo me ocupo del resto.',
    dia: 'Fuera del entrenamiento, ¿cómo es tu día a día?',
    email: '¡Genial, {nome}! Ya casi. Ahora la cuenta: ¿cuál es tu correo electrónico?',
    senha: 'Elige una contraseña de al menos ocho caracteres. Prometo no contárselo a nadie.',
    termos: 'Último paso. Necesito que aceptes los Términos de Uso y la Política de Privacidad, y que autorices el uso de tus datos de salud, como el peso y los entrenamientos, para que la app funcione. ¿Aceptas?',
    criar: '¡Perfecto, {nome}! Estoy preparando tu cuenta y tu perfil ahora.',
  },
  campo: {
    nome: 'Tu nombre', nascimento: 'Nacimiento (DD/MM/AAAA)', respNome: 'Nombre del responsable', respEmail: 'Correo del responsable',
    altura: 'Altura', peso: 'Peso actual', email: 'Correo electrónico', senha: 'Contraseña',
  },
  sufixo: { altura: 'cm', peso: 'kg' },
  erro: {
    nome: 'Escribe tu nombre.', nascimento: 'Escribe una fecha que exista, en orden día, mes y año.', respNome: 'Escribe el nombre del responsable.',
    email: 'Escribe un correo válido.', altura: 'Escribe tu altura en centímetros, entre 120 y 230.', peso: 'Escribe tu peso en kilos, entre 30 y 300.',
    senha: 'La contraseña necesita al menos 8 caracteres.', senhaLogin: 'La contraseña tiene al menos 6 caracteres.',
  },
  op: {
    'objetivo.gordura': 'Perder grasa', 'objetivo.massa': 'Ganar masa muscular', 'objetivo.forma': 'Mantener la forma',
    'objetivo.forca': 'Ganar fuerza', 'objetivo.saude': 'Tener más salud y energía', 'objetivo.corrida': 'Correr más y mejor',
    'sexo.m': 'Masculino', 'sexo.f': 'Femenino', 'sexo.nd': 'Prefiero no decirlo',
    'respAutoriza.sim': 'Sí, autoriza', 'respAutoriza.nao': 'Todavía no',
    'experiencia.nunca': 'Nunca he entrenado', 'experiencia.iniciante': 'Principiante', 'experiencia.intermediario': 'Intermedio', 'experiencia.avancado': 'Avanzado',
    'local.academia': 'En el gimnasio', 'local.casa': 'En casa', 'local.rua': 'Al aire libre', 'local.misto': 'Un poco de todo',
    'foco.peito_braco': 'Pecho y brazos', 'foco.costas': 'Espalda', 'foco.pernas': 'Piernas y glúteos', 'foco.ombros': 'Hombros', 'foco.abdomen': 'Abdomen', 'foco.corpo': 'Cuerpo entero',
    'lesoes.nenhuma': 'Ninguna', 'lesoes.joelho': 'Rodilla', 'lesoes.ombro': 'Hombro', 'lesoes.coluna': 'Columna', 'lesoes.punho': 'Muñeca o codo', 'lesoes.outra': 'Otra',
    'dia.sentado': 'Casi siempre sentado', 'dia.leve': 'Camino un poco', 'dia.moderado': 'De pie y en movimiento', 'dia.pesado': 'Trabajo pesado, muy activo',
    'termos.aceito': 'Acepto', 'termos.ler': 'Quiero leerlo antes',
  },
  nota: {
    'experiencia.iniciante': 'hasta 6 meses', 'experiencia.intermediario': '1 a 3 años', 'experiencia.avancado': 'más de 3 años',
  },
  com: {
    'objetivo.gordura': 'Perder grasa es lo mío. Entrenamiento y comida van de la mano.',
    'objetivo.massa': '¡Hora de crecer! Lo tendré en cuenta en tu entrenamiento y en tu dieta.',
    'objetivo.forma': 'Mantenerse también cuesta. Lo haremos con constancia.',
    'objetivo.forca': 'La fuerza es la mejor inversión. A levantar peso.',
    'objetivo.saude': 'El mejor objetivo de todos. Tu yo del futuro te lo agradece.',
    'objetivo.corrida': '¡Pista libre! Te acompañaré en cada kilómetro.',
    'sexo.nd': 'Está bien. Usaré un promedio en las cuentas.',
    'experiencia.nunca': 'Todos empezamos por algún lado. Al principio iré con calma.',
    'experiencia.avancado': '¡Veterano! Entonces vamos al entrenamiento de verdad.',
  },
  barra: {
    respAutoriza: 'Sin la autorización del responsable no puedo crear la cuenta. Cuando esté contigo, solo tienes que autorizar.',
    termos: 'Claro, léelo con calma en los enlaces de abajo. Cuando termines, solo toca en acepto.',
  },
  falas: {
    deVolta: '¡Qué bueno verte de nuevo, {nome}!',
    contaCriada: '¡Listo, {nome}! Tu cuenta está creada y tu perfil guardado. Te damos la bienvenida a RONDO.',
    emailJaTem: 'Ese correo ya tiene una cuenta. Usa otro, o vuelve atrás e inicia sesión con él.',
    nomeJaTem: 'Ese nombre ya es de otra cuenta. Elige otro, por ejemplo con el apellido.',
    falhaCriar: 'No pude crear la cuenta ahora.',
  },
  ui: {
    voltarInicio: 'Volver al inicio', voltarPergunta: 'Volver una pregunta', criarConta: 'CREAR CUENTA', etapa: 'PASO',
    estado: { quieto: 'EN ESPERA', ouvindo: 'ESCUCHANDO', pensando: 'PROCESANDO', falando: 'HABLANDO' },
    orbePular: 'RONDIN. Toca para saltar', orbeRepetir: 'RONDIN. Toca para oír la pregunta otra vez', pular: 'Saltar', continuar: 'Continuar',
    entrar: 'Iniciar sesión', entrando: 'Entrando…', email: 'Correo electrónico', senha: 'Contraseña', verSenha: 'Mostrar contraseña', esconderSenha: 'Ocultar contraseña',
    esqueci: 'Olvidé mi contraseña', semConta: 'Todavía no tengo cuenta', tentar: 'Intentar de nuevo', abreNoNavegador: 'se abre en el navegador',
    termos: 'Términos de Uso', privacidade: 'Política de Privacidad', dias: '{n} días',
  },
  rec: {
    titulo1: 'Olvidé mi contraseña', texto1: 'Escribe el correo de tu cuenta. Le enviaremos un código de 6 números.', email: 'Correo electrónico', enviarCodigo: 'Enviar código', enviando: 'Enviando…',
    titulo2: 'Revisa tu correo', texto2a: 'Si existe una cuenta con ', texto2b: ', el código va en camino. Vale por 15 minutos. Revisa también el spam.',
    codigo: 'Código de 6 números', senhaNova: 'Contraseña nueva', trocar: 'Cambiar la contraseña', trocando: 'Cambiando…',
    espera: '¿No llegó? Puedes pedir otro en {n} s', reenviar: '¿No llegó? Enviar de nuevo',
    titulo3: 'Contraseña cambiada', texto3: '¡Listo! Ahora solo inicia sesión con tu correo y tu contraseña nueva.', voltar: 'Volver',
    emailInvalido: 'Escribe un correo válido.', codigoInvalido: 'El código tiene 6 números.', senhaCurta: 'La contraseña nueva necesita al menos 8 caracteres.',
    falhaEnviar: 'No se pudo enviar ahora. Inténtalo de nuevo.', falhaTrocar: 'No se pudo cambiar la contraseña ahora. Inténtalo de nuevo.',
  },
  srv: {
    credenciais: 'Correo o contraseña incorrectos.', tentativas: 'Demasiados intentos. Espera 15 minutos o usa "Olvidé mi contraseña".',
    conexao: 'Sin conexión. Inténtalo de nuevo en un momento.', servidor: 'El servidor de RONDO no está configurado en este dispositivo.',
    codigo: 'Código inválido o vencido. Pide uno nuevo.', padrao: 'Algo salió mal. Inténtalo de nuevo.',
  },
};

export const TEXTOS: Record<Idioma, Textos> = { pt: PT, en: EN, es: ES };

/* A mensagem que o servidor devolveu (sempre em português) na língua da pessoa. Em português passa direto. Em inglês e
   espanhol as conhecidas são traduzidas; qualquer outra vira um aviso curto, para a tela não misturar línguas. */
export function traduzirErro(msg: string, idioma: Idioma): string {
  if (idioma === 'pt') return msg;
  const s = TEXTOS[idioma].srv;
  if (/e-mail ou senha incorretos/i.test(msg)) return s.credenciais;
  if (/muitas tentativas/i.test(msg)) return s.tentativas;
  if (/sem conexão/i.test(msg)) return s.conexao;
  if (/não está configurado/i.test(msg)) return s.servidor;
  if (/código inválido ou vencido/i.test(msg)) return s.codigo;
  return s.padrao;
}
