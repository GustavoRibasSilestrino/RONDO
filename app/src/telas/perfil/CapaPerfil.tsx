/* A capa do perfil (desde 2026-11-26, pedido do dono): a imagem larga do alto do perfil, no layout de "página de jogo".
   Quem tem capa vê a imagem; quem não tem, um CINZA, e no próprio perfil um botão "Adicionar capa" no meio, para escolher uma
   (no perfil dos outros, só o cinza). Trocar ou tirar fica em Configurações > Editar perfil. A imagem sobe para a pasta da própria
   pessoa no Storage e o perfil guarda o endereço (PATCH /me/perfil, campo `capa`), como a foto de perfil. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { salvarPerfilNoServidor } from '../../api/sincronia';
import { useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { T } from '../../componentes/Ui';
import { Vidro } from '../../componentes/Vidro';
import { useLoja } from '../../estado/loja';
import { enviarMidia, escolherFoto, removerMidia } from '../../lib/midia';
import { cores, estilos } from '../../tema';

/* escolher, enviar e tirar a capa da conta: salva na hora (não espera o "Salvar" da edição do perfil) */
export function useCapaPerfil() {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const [enviando, setEnviando] = useState(false);
  const salvar = async (capa: string | null) => {
    await salvarPerfilNoServidor({ capa });
    commit((e) => { if (e.usuario) e.usuario.capa = capa ?? undefined; });
  };
  const escolher = async () => {
    if (enviando) return;
    let local: string | null = null;
    try {
      const m = await escolherFoto('galeria', [16, 9]);   // larga, como a capa; a foto sai comprimida (qualidade 0,7)
      if (!m) return;
      local = m.id;
      setEnviando(true);
      const url = (await enviarMidia(m)).url;
      if (!url) throw new Error('Não foi possível enviar a capa agora. Tente de novo.');
      await salvar(url);
      avisar('Capa atualizada.');
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível trocar a capa agora.');
    } finally {
      setEnviando(false);
      if (local) removerMidia([local]);   // depois de subir, o arquivo do aparelho não precisa ficar
    }
  };
  const remover = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      await salvar(null);
      avisar('Capa removida.');
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível tirar a capa agora.');
    } finally {
      setEnviando(false);
    }
  };
  return { capa: estado.usuario?.capa ?? null, enviando, escolher, remover };
}

type Props = {
  capa: string | null | undefined;
  altura: number;
  /* só no próprio perfil e sem capa: o botão "Adicionar capa" no meio do cinza */
  aoAdicionar?: () => void;
  enviando?: boolean;
  arredondada?: boolean;   // a prévia da edição, com os cantos arredondados
  fundo?: string;          // a cor em que a capa se desfaz embaixo (a do fundo de trás); padrão: cores.fundo
};

export function CapaPerfil({ capa, altura, aoAdicionar, enviando, arredondada, fundo }: Props) {
  return (
    <View style={[st.capa, { height: altura }, arredondada ? st.arredondada : Platform.OS === 'web' ? st.somePeloPe : null]}>
      {capa ? <Image source={{ uri: capa }} resizeMode="cover" accessibilityIgnoresInvertColors accessibilityLabel="Capa do perfil" style={StyleSheet.absoluteFill} /> : null}
      {!capa && aoAdicionar ? (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, st.centro]}>
          <Vidro interativo style={st.botao}>
            <Pressable
              accessibilityRole="button" accessibilityLabel="Adicionar uma capa ao perfil" accessibilityState={{ busy: !!enviando, disabled: !!enviando }}
              disabled={enviando} onPress={aoAdicionar} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.botaoToque, (pressed || hovered) && { opacity: 0.85 }]}
            >
              {enviando ? <ActivityIndicator size="small" color="#ffffff" /> : <Icone nome="imagem" tamanho={18} cor="#ffffff" />}
              <T tam={14} peso="500" cor="#ffffff">{enviando ? 'Enviando...' : 'Adicionar capa'}</T>
            </Pressable>
          </Vidro>
        </View>
      ) : null}
      {/* a capa se desfaz no fundo da tela, onde a foto encosta */}
      {arredondada || Platform.OS === 'web' ? null : <LinearGradient pointerEvents="none" colors={['transparent', fundo ?? cores.fundo]} style={st.sombra} />}
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  /* o cinza padrão: médio no escuro e claro no claro, os dois neutros */
  capa: { width: '100%', overflow: 'hidden', backgroundColor: cores.tinta === '255,255,255' ? '#2c2c2c' : '#d4d4d4' },
  arredondada: { borderRadius: 18 },
  /* no navegador a capa some aos poucos no pé (fica transparente), e o fundo de trás aparece sem emenda, com os brilhos dele;
     no celular, o degradê para a cor do fundo faz o mesmo papel */
  somePeloPe: { maskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)' } as object,
  centro: { alignItems: 'center', justifyContent: 'center', paddingTop: 40, paddingBottom: 50 },   // no meio, longe das ações de cima e da foto de baixo
  botao: { borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  botaoToque: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 18 },
  sombra: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },
}));
