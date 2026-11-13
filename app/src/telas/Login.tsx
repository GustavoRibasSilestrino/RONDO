/* Entrar ou criar conta, antes de usar o app, é só pelo RONDIN (telas/Rondin.tsx). Não há formulário comum.
   No app do celular, a tela inicial (telas/Inicio.tsx) tem as duas opções e cada uma abre a conversa.
   No navegador não existe tela inicial: a pessoa já escolheu no site. O botão "Criar conta" ou "Entrar" traz `?conta=criar`
   ou `?conta=entrar` no endereço e a conversa abre direto nesse modo (sem o pedido, abre em "entrar"). A seta da primeira
   pergunta volta para o site.
   Antes de tudo, o RONDIN se apresenta (telas/Apresentacao.tsx): no celular, logo depois da abertura; no navegador, logo
   que a pessoa chega do site. Uma vez por visita (quem sai da conta e volta não vê de novo). */
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Estado, Usuario } from '../tipos';
import type { ResultadoSocial } from '../api/loginSocial';
import { atrasoDaAbertura } from '../lib/abertura';
import { contaPedida } from '../lib/entrada';
import { CadastroSocial } from './CadastroSocial';
import { Apresentacao } from './Apresentacao';
import { Inicio } from './Inicio';
import { Rondin } from './Rondin';

export const SITE = 'https://userondo.vercel.app';

type TelaLogin = 'inicio' | 'cadastro' | 'entrar';

const NA_WEB = Platform.OS === 'web';
/* onde esta tela começa. No celular, na tela inicial. No navegador, direto na conversa: no modo pedido pelo endereço (lido uma
   vez em lib/entrada.ts) na primeira vez, e em "entrar" depois (ex.: quem saiu da conta na mesma visita). */
let pedidoUsado = false;
let apresentou = false;   // a apresentação do RONDIN já apareceu nesta visita
const telaDoEndereco = (): TelaLogin => (!NA_WEB ? 'inicio' : contaPedida === 'criar' && !pedidoUsado ? 'cadastro' : 'entrar');

export function Login({ aoEntrar }: { aoEntrar: (usuario: Usuario, extra?: Partial<Estado>) => void }) {
  const [tela, setTela] = useState<TelaLogin>(telaDoEndereco);
  const [apresentando, setApresentando] = useState(!apresentou);
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

  if (apresentando) {
    /* espera a abertura (a tela preta com o nome RONDO) sumir antes de a bolha nascer, no celular e no navegador */
    return <Apresentacao atraso={atrasoDaAbertura()} aoContinuar={() => { apresentou = true; setApresentando(false); }} />;
  }
  if (pendente) return <CadastroSocial tokenSocial={pendente.tokenSocial} nome={pendente.nome} email={pendente.email} aoVoltar={() => setPendente(null)} aoConcluir={aoEntrar} />;
  if (tela === 'inicio') return <Inicio aoCriar={() => setTela('cadastro')} aoEntrar={() => setTela('entrar')} aoSocial={aoSocial} />;
  /* a seta da primeira pergunta: no celular volta ao menu com as duas opções; no navegador, ao site */
  const aoVoltar = NA_WEB ? () => { window.location.assign(SITE); } : () => setTela('inicio');
  return (
    <Rondin
      key={tela} modo={tela} aoEntrar={aoEntrar} aoVoltar={aoVoltar}
      aoSocial={NA_WEB ? aoSocial : undefined}   /* no navegador os botões do Google e da Apple ficam junto dos campos de entrada */
      aoTrocarModo={NA_WEB && tela === 'entrar' ? () => setTela('cadastro') : undefined}
    />
  );
}
