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
  Button,
  Slider,
} from '@mui/material';
import type { Tag } from './types/tag';
import type { Apartamento } from '@/crawlers/core/types';

export default function Home() {
  const [anuncios, setAnuncios] = useState<Apartamento[]>([]);
  const [filtros, setFiltros] = useState({
    bairro: '',
    tamanho: 70,
    quartos: '',
    banheiros: '',
    garagem: '',
  });

  const tagsDisponiveis = useMemo<Tag[]>(() => ['Não', 'Entrar em contato', 'Agendado', 'Visitado'], []);

  // Calcula opções únicas
  const opcoesQuartos = useMemo(() => [...new Set(anuncios.map(a => a.quartos).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0)), [anuncios]);
  const opcoesBanheiros = useMemo(() => [...new Set(anuncios.map(a => a.banheiros).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0)), [anuncios]);
  const opcoesGaragem = useMemo(() => [...new Set(anuncios.map(a => a.garagem).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0)), [anuncios]);
  const opcoesBairros = useMemo(
    () => [...new Set(anuncios.map(a => a.bairro).filter(b => b && b.trim() !== ''))].sort(),
    [anuncios]
  );
  const tamanhoMaximo = useMemo(() => Math.max(...anuncios.map(a => a.tamanho || 0)), [anuncios]);

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

  // Filtra os anúncios conforme os filtros
  const anunciosFiltrados = useMemo(() => {
    return anuncios.filter(anuncio => {
      const bairroMatch = filtros.bairro === '' || anuncio.bairro?.toLowerCase().includes(filtros.bairro.toLowerCase());
      const tamanhoMatch = (anuncio.tamanho || 0) >= filtros.tamanho;
      const quartosMatch = filtros.quartos === '' || anuncio.quartos === Number(filtros.quartos);
      const banheirosMatch = filtros.banheiros === '' || anuncio.banheiros === Number(filtros.banheiros);
      const garagemMatch = filtros.garagem === '' || anuncio.garagem === Number(filtros.garagem);
      return bairroMatch && tamanhoMatch && quartosMatch && banheirosMatch && garagemMatch;
    });
  }, [anuncios, filtros]);

  return (
    <main>
      <Typography variant='h4' component='h1' gutterBottom>
        Anúncios
      </Typography>
      <Button onClick={() => atualizarDados()}>Atualizar dados</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Valor Aluguel</TableCell>
              <TableCell>Valor Total</TableCell>
              <TableCell>
                Bairro
                <TextField
                  select
                  value={filtros.bairro}
                  onChange={e => setFiltros(f => ({ ...f, bairro: e.target.value }))}
                  size='small'
                  fullWidth
                >
                  <MenuItem value=''>Todos</MenuItem>
                  {opcoesBairros.map(bairro => (
                    <MenuItem key={bairro} value={bairro}>{bairro}</MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                Tamanho: {filtros.tamanho}m²
                <Slider
                  value={filtros.tamanho}
                  onChange={(_, value) => setFiltros(f => ({ ...f, tamanho: value as number }))}
                  min={70}
                  max={tamanhoMaximo}
                  step={5}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}m²`}
                />
              </TableCell>
              <TableCell>
                Quartos
                <TextField
                  select
                  value={filtros.quartos}
                  onChange={e => setFiltros(f => ({ ...f, quartos: e.target.value }))}
                  size='small'
                  fullWidth
                >
                  <MenuItem value=''>Todos</MenuItem>
                  {opcoesQuartos.map(q => (
                    <MenuItem key={q} value={q}>{q}</MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                Banheiros
                <TextField
                  select
                  value={filtros.banheiros}
                  onChange={e => setFiltros(f => ({ ...f, banheiros: e.target.value }))}
                  size='small'
                  fullWidth
                >
                  <MenuItem value=''>Todos</MenuItem>
                  {opcoesBanheiros.map(b => (
                    <MenuItem key={b} value={b}>{b}</MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                Garagem
                <TextField
                  select
                  value={filtros.garagem}
                  onChange={e => setFiltros(f => ({ ...f, garagem: e.target.value }))}
                  size='small'
                  fullWidth
                >
                  <MenuItem value=''>Todos</MenuItem>
                  {opcoesGaragem.map(g => (
                    <MenuItem key={g} value={g}>{g}</MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>Observação</TableCell>
              <TableCell>Tag</TableCell>
              <TableCell>Link</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {anunciosFiltrados.map((anuncio, index) => (
              <TableRow key={anuncio.id || index}>
                <TableCell>{anuncio.valor_aluguel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                <TableCell>{anuncio.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                <TableCell>{anuncio.bairro}</TableCell>
                <TableCell>{anuncio.tamanho}</TableCell>
                <TableCell>{anuncio.quartos}</TableCell>
                <TableCell>{anuncio.banheiros}</TableCell>
                <TableCell>{anuncio.garagem}</TableCell>
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
