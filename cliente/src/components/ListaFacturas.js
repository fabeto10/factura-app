import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Alert,
  Button,
} from "@mui/material";
import { Download } from "@mui/icons-material";
import axios from "axios";
import ExcelJS from "exceljs"; // ✅ Agregar esta importación

const ListaFacturas = () => {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const obtenerFacturas = async () => {
    try {
      const respuesta = await axios.get("http://localhost:3001/api/facturas");
      if (respuesta.data.exito) {
        setFacturas(respuesta.data.datos);
      }
    } catch (err) {
      setError("Error al cargar la lista de facturas");
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerFacturas();
  }, []);

  const descargarExcel = async (factura) => {
    // ✅ Cambiar 'datos' por 'factura' que es el parámetro recibido
    if (!factura) return;

    // Crear nuevo workbook
    const workbook = new ExcelJS.Workbook();

    // Agregar propiedades del documento
    workbook.creator = "Sistema de Facturas";
    workbook.lastModifiedBy = "Sistema de Facturas";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Crear hoja de trabajo
    const worksheet = workbook.addWorksheet("FACTURA", {
      pageSetup: {
        paperSize: 9, // A4
        orientation: "portrait",
        margins: {
          left: 0.7,
          right: 0.7,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    // ===== DEFINIR ESTILOS =====
    const headerStyle = {
      font: { bold: true, size: 14, color: { argb: "FFFFFF" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "2F75B5" } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    const titleStyle = {
      font: { bold: true, size: 16, color: { argb: "2F75B5" } },
      alignment: { horizontal: "center", vertical: "middle" },
    };

    const labelStyle = {
      font: { bold: true, size: 11, color: { argb: "2F75B5" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "DDEBF7" } },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    const valueStyle = {
      font: { size: 11 },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    const totalStyle = {
      font: { bold: true, size: 12, color: { argb: "FF0000" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FCE4D6" } },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    // ===== CONSTRUIR LA ESTRUCTURA =====

    // Título principal
    worksheet.mergeCells("A1:D1");
    const titleRow = worksheet.getCell("A1");
    titleRow.value = "FACTURA COMERCIAL";
    titleRow.style = titleStyle;

    // Información del emisor
    worksheet.mergeCells("A3:D3");
    worksheet.getCell("A3").value = "DATOS DEL EMISOR";
    worksheet.getCell("A3").style = headerStyle;

    const emisorData = [
      ["Razón Social:", factura.emisor || "No especificado"],
      ["Número de Factura:", factura.numeroFactura || "No especificado"],
      ["Fecha de Emisión:", factura.fechaEmision || "No especificado"],
      ["Moneda:", factura.moneda || "No especificado"],
    ];

    emisorData.forEach((row, index) => {
      const rowNum = 4 + index;

      worksheet.getCell(`A${rowNum}`).value = row[0];
      worksheet.getCell(`A${rowNum}`).style = labelStyle;

      worksheet.mergeCells(`B${rowNum}:D${rowNum}`);
      worksheet.getCell(`B${rowNum}`).value = row[1];
      worksheet.getCell(`B${rowNum}`).style = valueStyle;
    });

    // Concepto/Descripción
    const conceptoRow = 8;
    worksheet.mergeCells(`A${conceptoRow}:D${conceptoRow}`);
    worksheet.getCell(`A${conceptoRow}`).value = "CONCEPTO / DESCRIPCIÓN";
    worksheet.getCell(`A${conceptoRow}`).style = headerStyle;

    const conceptoDescRow = 9;
    worksheet.mergeCells(`A${conceptoDescRow}:D${conceptoDescRow + 2}`);
    worksheet.getCell(`A${conceptoDescRow}`).value =
      factura.concepto || "Descripción no disponible";
    worksheet.getCell(`A${conceptoDescRow}`).style = {
      ...valueStyle,
      alignment: { wrapText: true, vertical: "top" },
    };

    // Resumen financiero
    const resumenRow = conceptoDescRow + 4;
    worksheet.mergeCells(`A${resumenRow}:D${resumenRow}`);
    worksheet.getCell(`A${resumenRow}`).value = "RESUMEN FINANCIERO";
    worksheet.getCell(`A${resumenRow}`).style = headerStyle;

    const financialData = [
      [
        "Subtotal:",
        factura.subtotal ? `$${parseFloat(factura.subtotal).toFixed(2)}` : "N/A",
      ],
      [
        "IVA (16%):",
        factura.iva ? `$${parseFloat(factura.iva).toFixed(2)}` : "N/A",
      ],
      [
        "TOTAL:",
        factura.total ? `$${parseFloat(factura.total).toFixed(2)}` : "N/A",
      ],
    ];

    financialData.forEach((row, index) => {
      const rowNum = resumenRow + 1 + index;

      worksheet.mergeCells(`A${rowNum}:C${rowNum}`);
      worksheet.getCell(`A${rowNum}`).value = row[0];
      worksheet.getCell(`A${rowNum}`).style =
        index === 2 ? totalStyle : labelStyle;

      worksheet.getCell(`D${rowNum}`).value = row[1];
      worksheet.getCell(`D${rowNum}`).style =
        index === 2 ? totalStyle : valueStyle;
    });

    // Información adicional
    const infoRow = resumenRow + financialData.length + 2;
    worksheet.mergeCells(`A${infoRow}:D${infoRow}`);
    worksheet.getCell(`A${infoRow}`).value = "INFORMACIÓN ADICIONAL";
    worksheet.getCell(`A${infoRow}`).style = headerStyle;

    const adicionalRow = infoRow + 1;
    worksheet.mergeCells(`A${adicionalRow}:D${adicionalRow}`);
    worksheet.getCell(
      `A${adicionalRow}`
    ).value = `Factura procesada automáticamente el ${new Date().toLocaleDateString()}`;
    worksheet.getCell(`A${adicionalRow}`).style = {
      font: { italic: true, size: 10, color: { argb: "666666" } },
      alignment: { horizontal: "center" },
    };

    // Ajustar anchos de columnas
    worksheet.columns = [
      { width: 20 }, // Columna A
      { width: 15 }, // Columna B
      { width: 15 }, // Columna C
      { width: 15 }, // Columna D
    ];

    // Ajustar alturas de filas
    [1, 3, conceptoRow, resumenRow, infoRow].forEach((rowNum) => {
      worksheet.getRow(rowNum).height = 25;
    });

    // Generar y descargar el archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factura_${
      factura.numeroFactura || factura.fechaEmision || "sin_numero"
    }.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (cargando) {
    return (
      <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <TableContainer component={Paper} elevation={3} sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
        Historial de Facturas
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <strong>ID</strong>
            </TableCell>
            <TableCell>
              <strong>Archivo</strong>
            </TableCell>
            <TableCell>
              <strong>Emisor</strong>
            </TableCell>
            <TableCell>
              <strong>Total</strong>
            </TableCell>
            <TableCell>
              <strong>Fecha</strong>
            </TableCell>
            <TableCell>
              <strong>Acciones</strong>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {facturas.map((factura) => (
            <TableRow key={factura.id}>
              <TableCell>{factura.id}</TableCell>
              <TableCell>{factura.nombreArchivo}</TableCell>
              <TableCell>{factura.emisor || "N/A"}</TableCell>
              <TableCell>{factura.total || "N/A"}</TableCell>
              <TableCell>
                {new Date(factura.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Download />}
                  onClick={() => descargarExcel(factura)}
                >
                  Excel
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ListaFacturas;