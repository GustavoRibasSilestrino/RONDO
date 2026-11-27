/* Direitos sobre os dados (LGPD): baixar uma cópia, apagar a conta no servidor e escolher sobre e-mails de novidades. */
import { chamar } from './cliente';

export const exportarDados = () => chamar<Record<string, unknown>>('GET', '/me/exportar');
/* com a verificação em duas etapas ligada, o servidor pede também o código do aplicativo (ou um de reserva) */
export const apagarContaNoServidor = (senha: string, codigo?: string) => chamar<{ status: string }>('DELETE', '/me', { senha, ...(codigo ? { codigo } : {}) });
export const mudarMarketing = (marketing: boolean) => chamar<{ marketing: boolean }>('PATCH', '/me/marketing', { marketing });

/* os documentos legais ficam no site */
export const SITE_LEGAL = 'https://userondo.vercel.app';
export const DOCUMENTOS = [
  { titulo: 'Política de Privacidade', caminho: '/privacidade' },
  { titulo: 'Termos de Uso', caminho: '/termos' },
  { titulo: 'Cancelamento e reembolso', caminho: '/reembolso' },
  { titulo: 'Suboperadores', caminho: '/suboperadores' },
  { titulo: 'Licenças e créditos', caminho: '/licencas' },
] as const;
export const CONTATO_PRIVACIDADE = 'rondooficial.dev@gmail.com';
