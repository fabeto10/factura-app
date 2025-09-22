const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const cors = require('cors');

require('dotenv').config();

const prisma = new PrismaClient();
const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // Permite requests desde tu frontend React
  credentials: true
}));

app.use(express.json());

// Configuración de Multer para almacenar imágenes temporalmente :cite[5]:cite[8]
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos JPEG, PNG y JPG'));
    }
  }
});

// Configuración de la API Key de OpenAI :cite[1]:cite[10]
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('ERROR: OPENAI_API_KEY no está configurada en el archivo .env');
  process.exit(1);
}

// Endpoint para procesar facturas :cite[1]:cite[7]
app.post('/api/procesar-factura', upload.single('imagen'), async (req, res) => {
  try {
    // Validar que se subió un archivo :cite[2]
    if (!req.file) {
      return res.status(400).json({ 
        exito: false, 
        error: 'No se subió ninguna imagen' 
      });
    }

    // Leer y codificar la imagen en Base64 :cite[6]
    const imageBuffer = await fs.readFile(req.file.path);
    const imagenCodificadaEnBase64 = imageBuffer.toString('base64');

    // Preparar el prompt para OpenAI :cite[7]:cite[10]
    const promptTexto = `Extrae toda la información de esta factura y devuélvela como un objeto JSON válido con los siguientes campos: 
    - emisor (string)
    - fechaEmision (string en formato YYYY-MM-DD)
    - numeroFactura (string)
    - concepto (string)
    - subtotal (number)
    - iva (number)
    - total (number)
    - moneda (string)
    
    Si algún campo no está presente en la factura, devuélvelo como null. 
    Devuelve ÚNICAMENTE el JSON sin texto adicional.`;

    // Enviar la imagen a la API de OpenAI :cite[1]:cite[10]
    const respuestaOpenAI = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: promptTexto 
              },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:${req.file.mimetype};base64,${imagenCodificadaEnBase64}` 
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1 // Para respuestas más consistentes
      },
      { 
        headers: { 
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    // Procesar la respuesta de OpenAI :cite[7]
    const contenidoExtraido = respuestaOpenAI.data.choices[0].message.content;
    
    // Limpiar el contenido (remover markdown code blocks si existen)
    const jsonLimpio = contenidoExtraido.replace(/```json\n?|\n?```/g, '').trim();
    
    let datosFactura;
    try {
      datosFactura = JSON.parse(jsonLimpio);
    } catch (parseError) {
      console.error('Error parseando JSON de OpenAI:', parseError);
      return res.status(422).json({ 
        exito: false, 
        error: 'Formato de respuesta inválido de OpenAI' 
      });
    }

    // Guardar los datos en la base de datos :cite[1]
    const facturaGuardada = await prisma.factura.create({
      data: {
        nombreArchivo: req.file.originalname,
        fechaEmision: datosFactura.fechaEmision,
        emisor: datosFactura.emisor,
        numeroFactura: datosFactura.numeroFactura,
        concepto: datosFactura.concepto,
        subtotal: datosFactura.subtotal ? parseFloat(datosFactura.subtotal) : null,
        iva: datosFactura.iva ? parseFloat(datosFactura.iva) : null,
        total: datosFactura.total ? parseFloat(datosFactura.total) : null,
        moneda: datosFactura.moneda
      }
    });

    // Limpiar archivo temporal
    await fs.unlink(req.file.path).catch(err => 
      console.warn('No se pudo eliminar archivo temporal:', err)
    );

    // Responder al frontend
    res.json({ 
      exito: true, 
      datos: datosFactura, 
      id: facturaGuardada.id,
      mensaje: 'Factura procesada correctamente'
    });

  } catch (error) {
    console.error('Error detallado:', error);

    // Limpiar archivo temporal en caso de error
    if (req.file) {
      await fs.unlink(req.file.path).catch(err => 
        console.warn('Error limpiando archivo temporal:', err)
      );
    }

    // Manejo específico de errores :cite[1]
    if (error.response) {
      // Error de la API de OpenAI
      console.error('Error de OpenAI:', error.response.status, error.response.data);
      return res.status(502).json({ 
        exito: false, 
        error: `Error del servicio de análisis: ${error.response.data.error?.message || 'Error desconocido'}` 
      });
    } else if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        exito: false, 
        error: 'El archivo es demasiado grande (máximo 5MB)' 
      });
    }

    res.status(500).json({ 
      exito: false, 
      error: 'Error interno del servidor al procesar la factura' 
    });
  }
});

// Endpoint para obtener todas las facturas :cite[1]
app.get('/api/facturas', async (req, res) => {
  try {
    const facturas = await prisma.factura.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ exito: true, datos: facturas });
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ 
      exito: false, 
      error: 'Error al obtener las facturas' 
    });
  }
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    exito: true, 
    mensaje: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});