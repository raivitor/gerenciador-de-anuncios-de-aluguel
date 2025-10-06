'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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
  Pagination,
  Box,
} from '@mui/material';
import type { Tag } from './types/tag';
import type { Apartamento } from '@/crawlers/core/types';

export default function Home() {
  const [anuncios, setAnuncios] = useState<Apartamento[]>([]);
  const [totalAnuncios, setTotalAnuncios] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filtros, setFiltros] = useState({
    bairro: '',
    tamanho: 70,
    quartos: '',
    banheiros: '',
    garagem: '',
    corretora: '',
    tag: '',
    nota: '',
  });

  const tagsDisponiveis = useMemo<Tag[]>(() => ['Não', 'Talvez', 'Agendar', 'Agendado', 'Visitado'], []);

  const [allAnuncios, setAllAnuncios] = useState<Apartamento[]>([]);

  useEffect(() => {
    fetch('/api/anuncios?all=true')
      .then(res => res.json())
      .then(data => setAllAnuncios(data.anuncios || data))
      .catch(err => console.error('Erro ao buscar dados para filtros', err));
  }, []);

  const opcoesQuartos = useMemo(() => [...new Set(allAnuncios.map(a => a.quartos).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0)), [allAnuncios]);
  const opcoesBanheiros = useMemo(() => [...new Set(allAnuncios.map(a => a.banheiros).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0)), [allAnuncios]);
  const opcoesGaragem = useMemo(() => [...new Set(allAnuncios.map(a => a.garagem).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0)), [allAnuncios]);
  const opcoesBairros = useMemo(
    () => [...new Set(allAnuncios.map(a => a.bairro).filter(b => b && b.trim() !== ''))].sort(),
    [allAnuncios]
  );
  const tamanhoMaximo = useMemo(() => Math.max(...allAnuncios.map(a => a.tamanho || 0)), [allAnuncios]);
  const opcoesCorretoras = useMemo(
    () => [...new Set(allAnuncios.map(a => a.corretora).filter(c => c && c.trim() !== ''))].sort(),
    [allAnuncios]
  );

  const handleObservacaoChange = useCallback((index: number, observacao: string) => {
    const anuncioAtual = anuncios[index];
    if (!anuncioAtual || anuncioAtual.observacao === observacao) return;

    fetch('/api/anuncios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({id: anuncioAtual.id, observacao}),
    }).catch(err => console.error('Erro ao salvar anotações', err));

    setAnuncios(prev => {
      const novosAnuncios = [...prev];
      novosAnuncios[index] = { ...novosAnuncios[index], observacao };
      return novosAnuncios;
    });
  }, [anuncios]);

  const handleTagChange = useCallback((index: number, tag: Tag) => {
    const anuncioAtual = anuncios[index];
    if (!anuncioAtual || anuncioAtual.tag === tag) return; // Evita atualizações desnecessárias

    setAnuncios(prev => {
      const novosAnuncios = [...prev];
      novosAnuncios[index] = { ...novosAnuncios[index], tag };
      return novosAnuncios;
    });

    fetch('/api/anuncios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({id: anuncioAtual.id, tag}),
    }).catch(err => console.error('Erro ao salvar anotações', err));
  }, [anuncios]);

  const atualizarDados = useCallback(async () => {
    try {
      const response = await fetch('/api/anuncios/fetch', {
        method: 'POST',
      });
      const result = await response.json();
      if (response.ok && (result.ok === undefined || result.ok === true)) {
        setCurrentPage(1);
      } else {
        console.error('Erro ao atualizar dados:', result.error ?? result);
      }
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtros]);

  useEffect(() => {
    const url = new URL('/api/anuncios', window.location.origin);
    url.searchParams.set('page', currentPage.toString());
    url.searchParams.set('limit', itemsPerPage.toString());

  if (filtros.bairro) url.searchParams.set('bairro', filtros.bairro);
  if (filtros.quartos) url.searchParams.set('quartos', filtros.quartos);
  if (filtros.banheiros) url.searchParams.set('banheiros', filtros.banheiros);
  if (filtros.garagem) url.searchParams.set('garagem', filtros.garagem);
  if (filtros.corretora) url.searchParams.set('corretora', filtros.corretora);
  if (filtros.tamanho > 70) url.searchParams.set('tamanho', filtros.tamanho.toString());
  if (filtros.tag) url.searchParams.set('tag', filtros.tag);
  if (filtros.nota) url.searchParams.set('nota', filtros.nota);

    fetch(url.toString())
      .then(res => res.json())
      .then(data => {
        setAnuncios(data.anuncios);
        setTotalAnuncios(data.total);
      })
      .catch(err => console.error('Erro ao buscar anúncios', err));
  }, [currentPage, filtros]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  // ...
  // Adiciona handleNotaChange antes do return
  const handleNotaChange = useCallback((index: number, nota: string) => {
    const anuncioAtual = anuncios[index];
    if (!anuncioAtual || anuncioAtual.nota === Number(nota)) return;
    setAnuncios(prev => {
      const novosAnuncios = [...prev];
      const novo = { ...novosAnuncios[index] };
      if (nota === '') {
        delete novo.nota;
      } else {
        novo.nota = Number(nota);
      }
      novosAnuncios[index] = novo;
      return novosAnuncios;
    });
    fetch('/api/anuncios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nota === '' ? { id: anuncioAtual.id, nota: null } : { id: anuncioAtual.id, nota: Number(nota) }),
    }).catch(err => console.error('Erro ao salvar nota', err));
  }, [anuncios]);

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
              <TableCell>
                Corretora
                <TextField
                  select
                  value={filtros.corretora}
                  onChange={e => setFiltros(f => ({ ...f, corretora: e.target.value }))}
                  size='small'
                  fullWidth
                >
                  <MenuItem value=''>Todas</MenuItem>
                  {opcoesCorretoras.map(corretora => (
                    <MenuItem key={corretora} value={corretora}>{corretora}</MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>Nota
                <TextField
                  select
                  value={filtros.nota}
                  onChange={e => setFiltros(f => ({ ...f, nota: e.target.value }))}
                  size='small'
                  fullWidth
                >
                  <MenuItem value=''>Todas</MenuItem>
                  {[1,2,3,4,5].map(nota => (
                    <MenuItem key={nota} value={nota}>{nota}</MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>Observação</TableCell>
              <TableCell>Tag
                <TextField
                  select
                  value={filtros.tag}
                  onChange={e => setFiltros(f => ({ ...f, tag: e.target.value }))}
                  size='small'
                  fullWidth
                >
                  <MenuItem value=''>Todas</MenuItem>
                  {tagsDisponiveis.map(tag => (
                    <MenuItem key={tag} value={tag}>{tag}</MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>Link</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {anuncios.map((anuncio, index) => (
              <TableRow key={anuncio.id || index}>
                <TableCell>{anuncio.valor_aluguel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                <TableCell>{anuncio.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                <TableCell>{anuncio.bairro}</TableCell>
                <TableCell>{anuncio.tamanho}</TableCell>
                <TableCell>{anuncio.quartos}</TableCell>
                <TableCell>{anuncio.banheiros}</TableCell>
                <TableCell>{anuncio.garagem}</TableCell>
                <TableCell>{anuncio.corretora}</TableCell>
                <TableCell>
                  <TextField
                    select
                    value={anuncio.nota ?? ''}
                    onChange={event => handleNotaChange(index, event.target.value)}
                    fullWidth
                    size='small'
                  >
                    <MenuItem value=''>Selecione…</MenuItem>
                    {[1,2,3,4,5].map(nota => (
                      <MenuItem key={nota} value={nota}>{nota}</MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField
                    value={anuncio.observacao || ''}
                    onChange={event => handleObservacaoChange(index, event.target.value)}
                    fullWidth
                    size='small'
                    placeholder='Adicionar observação'
                    multiline
                    minRows={2}
                    maxRows={8}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    value={anuncio.tag || ''}
                    fullWidth
                    size='small'
                    onChange={event => handleTagChange(index, event.target.value as Tag)}
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
      <Box display="flex" justifyContent="center" mt={2}>
        <Pagination
          count={Math.ceil(totalAnuncios / itemsPerPage)}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Box>
    </main>
  );
}
