'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Typography,
  TextField,
  MenuItem,
} from '@mui/material';
import type { Tag } from './types/tag';

interface Anuncio {
  id: number | string;
  valor_aluguel: number;
  valor_total: number;
  url_apartamento: string;
  observacao: string;
  tag: Tag | '';
}

export default function Home() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);

  const tagsDisponiveis = useMemo<Tag[]>(() => ['Não', 'Entrar em contato', 'Agendado', 'Visitado'], []);

  const handleObservacaoChange = (index: number, observacao: string) => {
    setAnuncios(prev =>
      prev.map((anuncio, idx) => (idx === index ? { ...anuncio, observacao } : anuncio))
    );
  };

  const handleTagChange = (index: number, tag: Tag | '') => {
    setAnuncios(prev => prev.map((anuncio, idx) => (idx === index ? { ...anuncio, tag } : anuncio)));
  };

  useEffect(() => {
    fetch('/api/anuncios')
      .then(res => res.json())
      .then(data => setAnuncios(data))
      .catch(err => console.error('Erro ao buscar anúncios', err));
  }, []);

  const atualizarDados = async () => {
    try {
      const response = await fetch('/api/anuncios/fetch', {
        method: 'POST',
      });
      const result = await response.json();
      if (result.ok) {
        // Recarrega os anúncios após a atualização
        const anunciosResponse = await fetch('/api/anuncios');
        const anunciosData = await anunciosResponse.json();
        setAnuncios(anunciosData);
      } else {
        console.error('Erro ao atualizar dados:', result.error);
      }
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
    }
  };

  return (
    <main>
      <Typography variant='h4' component='h1' gutterBottom>
        Anúncios
      </Typography>
      {/* <Button onClick={() => atualizarDados()}>Atualizar dados</Button> */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Valor Aluguel</TableCell>
              <TableCell>Valor Total</TableCell>
              <TableCell>Observação</TableCell>
              <TableCell>Tag</TableCell>
              <TableCell>Link</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {anuncios.map((anuncio, index) => (
              <TableRow key={anuncio.id || index}>
                <TableCell>{anuncio.valor_aluguel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                <TableCell>{anuncio.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                <TableCell>
                  <TextField
                    value={anuncio.observacao}
                    onChange={event => handleObservacaoChange(index, event.target.value)}
                    fullWidth
                    size='small'
                    placeholder='Adicionar observação'
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    value={anuncio.tag}
                    fullWidth
                    size='small'
                    onChange={event => handleTagChange(index, event.target.value as Tag | '')}
                  >
                    <MenuItem value=''>Selecione…</MenuItem>
                    {tagsDisponiveis.map(tag => (
                      <MenuItem key={tag} value={tag}>
                        {tag}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <Link href={anuncio.url_apartamento} target='_blank' rel='noopener noreferrer'>
                    Ver anúncio
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </main>
  );
}
