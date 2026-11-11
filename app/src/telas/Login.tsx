/* Entrar ou criar conta, antes de usar o app, é só pelo RONDIN: a tela inicial (telas/Inicio.tsx) tem as duas opções e
   cada uma abre a conversa (telas/Rondin.tsx). Não há mais formulário comum de entrar nem de cadastrar.
   Vindo do site, o botão "Criar conta" ou "Entrar" traz `?conta=criar` ou `?conta=entrar` no endereço: aí a conversa com o
   RONDIN abre direto, sem passar pela tela inicial. */
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Estado, Usuario } from '../tipos';
import type { ResultadoSocial } from '../api/loginSocial';
import { contaPedida } from '../lib/entrada';
import { CadastroSocial } from './CadastroSocial';
import { Inicio } from './Inicio';
import { Rondin } from './Rondin';

export const SITE = 'https://userondo.vercel.app';

type TelaLogin = 'inicio' | 'cadastro' | 'entrar';

/* o modo pedido pelo endereço (só no navegador; lido uma vez em lib/entrada.ts). Vale para a primeira vez que esta tela
   aparece: quem sair da conta depois, na mesma visita, volta para a tela inicial. */
let pedidoUsado = false;
const telaDoEndereco = (): TelaLogin => (pedidoUsado ? 'inicio' : contaPedida === 'criar' ? 'cadastro' : contaPedida === 'entrar' ? 'entrar' : 'inicio');

export function Login({ aoEntrar }: { aoEntrar: (usuario: Usuario, extra?: Partial<Estado>) => void }) {
  const [tela, setTela] = useState<TelaLogin>(telaDoEndereco);
  /* entrou com Google ou Apple pela primeira vez: falta a data de nascimento e o aceite dos documentos */
  const [pendente, setPendente] = useState<Extract<ResultadoSocial, { precisaCadastro: true }> | null>(null);
  const aoSocial = (r: ResultadoSocial) => { if (r.precisaCadastro) setPendente(r); else aoEntrar(r.usuario); };

  /* o pedido do endereço vale uma vez: tira o `?conta=` para que recarregar a página volte à tela inicial */
  useEffect(() => {
    pedidoUsado = true;
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('conta')) {
        url.searchParams.delete('conta');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
    } catch { /* sem history: segue com o endereço como está */ }
  }, []);

  if (pendente) return <CadastroSocial tokenSocial={pendente.tokenSocial} nome={pendente.nome} email={pendente.email} aoVoltar={() => setPendente(null)} aoConcluir={aoEntrar} />;
  if (tela === 'inicio') return <Inicio aoCriar={() => setTela('cadastro')} aoEntrar={() => setTela('entrar')} aoSocial={aoSocial} />;
  /* a seta de voltar do RONDIN leva de volta ao menu com as duas opções */
  return <Rondin key={tela} modo={tela} aoEntrar={aoEntrar} aoVoltar={() => setTela('inicio')} />;
}
