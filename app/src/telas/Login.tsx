/* Entrar ou criar conta, antes de usar o app, é só pelo RONDIN: a tela inicial (telas/Inicio.tsx) tem as duas opções e
   cada uma abre a conversa (telas/Rondin.tsx). Não há mais formulário comum de entrar nem de cadastrar. */
import React, { useState } from 'react';
import type { Estado, Usuario } from '../tipos';
import type { ResultadoSocial } from '../api/loginSocial';
import { CadastroSocial } from './CadastroSocial';
import { Inicio } from './Inicio';
import { Rondin } from './Rondin';

export const SITE = 'https://userondo.vercel.app';

type TelaLogin = 'inicio' | 'cadastro' | 'entrar';

export function Login({ aoEntrar }: { aoEntrar: (usuario: Usuario, extra?: Partial<Estado>) => void }) {
  const [tela, setTela] = useState<TelaLogin>('inicio');
  /* entrou com Google ou Apple pela primeira vez: falta a data de nascimento e o aceite dos documentos */
  const [pendente, setPendente] = useState<Extract<ResultadoSocial, { precisaCadastro: true }> | null>(null);
  const aoSocial = (r: ResultadoSocial) => { if (r.precisaCadastro) setPendente(r); else aoEntrar(r.usuario); };
  if (pendente) return <CadastroSocial tokenSocial={pendente.tokenSocial} nome={pendente.nome} email={pendente.email} aoVoltar={() => setPendente(null)} aoConcluir={aoEntrar} />;
  if (tela === 'inicio') return <Inicio aoCriar={() => setTela('cadastro')} aoEntrar={() => setTela('entrar')} aoSocial={aoSocial} />;
  /* a seta de voltar do RONDIN leva de volta ao menu com as duas opções */
  return <Rondin key={tela} modo={tela} aoEntrar={aoEntrar} aoVoltar={() => setTela('inicio')} />;
}
