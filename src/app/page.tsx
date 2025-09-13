'use client';

import { useEffect, useState } from 'react';
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
  Button,
} from '@mui/material';

interface Anuncio {
  valor_aluguel: string;
  valor_condominio: string;
  url_apartamento: string;
  valor_total: number;
  observacao: string;
  tag: string;
}

export default function Home() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);

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
      <Button onClick={() => atualizarDados()}>Atualizar dados</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Valor Aluguel</TableCell>
              <TableCell>Valor Condomínio</TableCell>
              <TableCell>Valor Total</TableCell>
              <TableCell>Observação</TableCell>
              <TableCell>Tag</TableCell>
              <TableCell>Link</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {anuncios.map((anuncio, index) => (
              <TableRow key={index}>
                <TableCell>{anuncio.valor_aluguel}</TableCell>
                <TableCell>{anuncio.valor_condominio}</TableCell>
                <TableCell>{anuncio.valor_total}</TableCell>
                <TableCell>{anuncio.observacao}</TableCell>
                <TableCell>{anuncio.tag}</TableCell>
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
