/* Configurações > RONDIN pela voz: liga e desliga a escuta de "Olá Rondin" (lib/escuta.ts). Desligada por padrão: o microfone só
   é pedido quando a pessoa liga aqui (ou aceita o convite do RONDIN na chegada). Só funciona no navegador. */
import React from 'react';
import { Platform, View } from 'react-native';
import { useAviso } from '../../componentes/Estrutura';
import { Botao, Cartao, Chip, T } from '../../componentes/Ui';
import { desligarEscuta, escutaDisponivel, ligarEscuta, useEscutaLigada } from '../../lib/escuta';
import { cores } from '../../tema';

const PONTOS = [
  'Funciona com o RONDO aberto no navegador. No aplicativo do celular ainda não está disponível.',
  'O microfone só escuta com o app aberto e à vista, e para sozinho quando o RONDIN fala ou quando você grava um recado.',
  'Quem entende a fala é o próprio navegador. No Chrome, o áudio é enviado ao serviço de voz do Google para virar texto. O RONDO não grava nem guarda nada disso: o texto só serve para achar o nome “Rondin” e para o RONDIN reagir às suas respostas do recado.',
  'Você desliga quando quiser, aqui, e o navegador mostra quando o microfone está em uso.',
];

export function VozDoRondin() {
  const ligada = useEscutaLigada();
  const avisar = useAviso();
  const disponivel = Platform.OS === 'web' && escutaDisponivel();

  const alternar = async () => {
    if (ligada) { desligarEscuta(); avisar('A escuta foi desligada.'); return; }
    const r = await ligarEscuta();
    if (r === 'negado') avisar('Sem permissão para usar o microfone. Libere nas configurações do navegador.');
    else if (r === 'ok') avisar('Pronto. Diga “Olá Rondin” quando quiser.');
  };

  return (
    <View style={{ gap: 14 }}>
      <T tam={14} style={{ lineHeight: 21 }}>
        Com a escuta ligada, é só dizer “Olá Rondin” (em português, inglês ou espanhol, e em outras línguas quando o navegador entender o nome) e o RONDIN aparece na tela.
      </T>
      <Cartao>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <T tam={15.5} peso="500">Chamar o RONDIN pela voz</T>
          <Chip texto={ligada && disponivel ? 'ligada' : 'desligada'} tom={ligada && disponivel ? 'bom' : 'neutro'} />
        </View>
        {disponivel ? (
          <Botao
            tipo={ligada ? 'fantasma' : 'primario'} icone="recado" titulo={ligada ? 'Desligar a escuta' : 'Ligar a escuta'}
            aoPressionar={() => void alternar()} style={{ marginTop: 14 }}
          />
        ) : (
          <T tam={13} cor={cores.texto2} style={{ marginTop: 10, lineHeight: 19 }}>
            {Platform.OS === 'web' ? 'Este navegador não tem reconhecimento de fala. Experimente no Chrome ou no Edge.' : 'Disponível no RONDO aberto no navegador (userondo.vercel.app/app).'}
          </T>
        )}
      </Cartao>
      <View style={{ gap: 8 }}>
        {PONTOS.map((p) => <T key={p} tam={12.5} cor={cores.texto3} style={{ lineHeight: 18 }}>• {p}</T>)}
      </View>
    </View>
  );
}
