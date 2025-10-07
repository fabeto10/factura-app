import React from 'react';
import { Container, Typography, CssBaseline, Box } from '@mui/material';
import SubidorDeFacturas from './components/SubidorDeFacturas';
import ListaFacturas from './components/ListaFacturas';

function App() {
  return (
    <>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            📄 Procesador de Facturas
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom align="center" color="textSecondary">
            Convierte imágenes de facturas a Excel automáticamente
          </Typography>
          
          {/* Componente para subir facturas */}
          <SubidorDeFacturas />
          
          {/* Componente para listar facturas procesadas */}
          <ListaFacturas />
        </Box>
      </Container>
    </>
  );
}

export default App;