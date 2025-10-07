import React, { useState } from "react";
import {
  Button,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Typography,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
} from "@mui/material";
import { CloudUpload, Description, Collections, TableChart } from "@mui/icons-material";
import axios from "axios";
import ExcelJS from "exceljs";

const SubidorDeFacturas = () => {
  const [imagenes, setImagenes] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [datos, setDatos] = useState([]);
  const [error, setError] = useState("");
  const [modoMultiple, setModoMultiple] = useState(false);
  const [tabActual, setTabActual] = useState(0);

  const manejarSeleccionArchivo = (event) => {
    const archivos = Array.from(event.target.files);
    if (archivos.length > 0) {
      setImagenes(archivos);
      setError("");
      setDatos([]);
    }
  };

  const procesarFacturaIndividual = async (imagen) => {
    const formData = new FormData();
    formData.append("imagen", imagen);

    try {
      const respuesta = await axios.post(
        "http://localhost:3001/api/procesar-factura",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (respuesta.data.exito) {
        return { 
          ...respuesta.data.datos, 
          nombreArchivo: imagen.name,
          procesado: true,
          timestamp: new Date().toISOString()
        };
      } else {
        return { 
          error: respuesta.data.error,
          nombreArchivo: imagen.name,
          procesado: false 
        };
      }
    } catch (err) {
      return { 
        error: "Error de conexión con el servidor",
        nombreArchivo: imagen.name,
        procesado: false 
      };
    }
  };

  const manejarEnvio = async (event) => {
    event.preventDefault();
    if (imagenes.length === 0) {
      setError("Por favor, selecciona al menos una imagen de factura.");
      return;
    }

    setProcesando(true);
    setError("");
    setDatos([]);

    try {
      const resultados = [];

      for (let i = 0; i < imagenes.length; i++) {
        const imagen = imagenes[i];
        
        // Agregar estado de procesamiento
        setDatos(prev => [...prev, { 
          nombreArchivo: imagen.name, 
          estado: 'Procesando...',
          procesando: true 
        }]);

        const resultado = await procesarFacturaIndividual(imagen);
        resultados.push(resultado);
        
        // Actualizar estado con resultado real
        setDatos(prev => {
          const nuevosDatos = [...prev];
          nuevosDatos[i] = resultado;
          return nuevosDatos;
        });
      }

    } catch (err) {
      setError("Error general del sistema.");
      console.error(err);
    } finally {
      setProcesando(false);
    }
  };

  // ===== FUNCIONES MEJORADAS DE EXCEL =====

  const crearEstilosExcel = () => ({
    headerStyle: {
      font: { bold: true, size: 14, color: { argb: "FFFFFF" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "2F75B5" } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" }
      }
    },
    titleStyle: {
      font: { bold: true, size: 16, color: { argb: "2F75B5" } },
      alignment: { horizontal: "center", vertical: "middle" }
    },
    labelStyle: {
      font: { bold: true, size: 11, color: { argb: "2F75B5" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "DDEBF7" } },
      border: {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" }
      }
    },
    valueStyle: {
      font: { size: 11 },
      border: {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" }
      }
    },
    totalStyle: {
      font: { bold: true, size: 12, color: { argb: "FF0000" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FCE4D6" } },
      border: {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" }
      }
    },
    subtotalStyle: {
      font: { bold: true, size: 11, color: { argb: "2E7D32" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "C8E6C9" } },
      border: {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" }
      }
    }
  });

  const crearFacturaDetallada = (worksheet, factura, estilos) => {
    const { headerStyle, titleStyle, labelStyle, valueStyle, totalStyle, subtotalStyle } = estilos;

    // Título principal
    worksheet.mergeCells("A1:H1");
    worksheet.getCell("A1").value = "FACTURA COMERCIAL DETALLADA";
    worksheet.getCell("A1").style = titleStyle;

    // Información del emisor (expandida)
    worksheet.mergeCells("A3:H3");
    worksheet.getCell("A3").value = "INFORMACIÓN DEL EMISOR";
    worksheet.getCell("A3").style = headerStyle;

    const infoEmisor = [
      ["Razón Social:", factura.emisor || "No especificado", "", "N° Factura:", factura.numeroFactura || "No especificado"],
      ["RFC/CUIT:", factura.rfc || "No especificado", "", "Fecha Emisión:", factura.fechaEmision || "No especificado"],
      ["Dirección:", factura.direccion || "No especificado", "", "Moneda:", factura.moneda || "No especificado"],
      ["Teléfono:", factura.telefono || "No especificado", "", "Condición IVA:", factura.condicionIva || "Responsable Inscripto"]
    ];

    infoEmisor.forEach((fila, indexFila) => {
      const filaNum = 4 + indexFila;
      fila.forEach((valor, indexCol) => {
        const col = String.fromCharCode(65 + indexCol); // A, B, C, etc.
        const celda = worksheet.getCell(`${col}${filaNum}`);
        celda.value = valor;
        
        if (indexCol % 2 === 0) {
          celda.style = labelStyle;
        } else {
          celda.style = valueStyle;
          if (indexCol === 1 || indexCol === 4) {
            worksheet.mergeCells(`${col}${filaNum}:${String.fromCharCode(65 + indexCol + 1)}${filaNum}`);
          }
        }
      });
    });

    // Información del cliente
    const filaCliente = 8;
    worksheet.mergeCells(`A${filaCliente}:H${filaCliente}`);
    worksheet.getCell(`A${filaCliente}`).value = "INFORMACIÓN DEL CLIENTE";
    worksheet.getCell(`A${filaCliente}`).style = headerStyle;

    const infoCliente = [
      ["Cliente:", factura.cliente || factura.emisor || "No especificado"],
      ["RFC/CUIT Cliente:", factura.rfcCliente || "No especificado"],
      ["Dirección Cliente:", factura.direccionCliente || "No especificado"]
    ];

    infoCliente.forEach((fila, index) => {
      const filaNum = filaCliente + 1 + index;
      worksheet.mergeCells(`A${filaNum}:H${filaNum}`);
      const celda = worksheet.getCell(`A${filaNum}`);
      celda.value = fila[0] + " " + (fila[1] || "");
      celda.style = valueStyle;
    });

    // Detalles de productos/servicios
    const filaDetalles = filaCliente + infoCliente.length + 2;
    worksheet.mergeCells(`A${filaDetalles}:H${filaDetalles}`);
    worksheet.getCell(`A${filaDetalles}`).value = "DETALLE DE PRODUCTOS/SERVICIOS";
    worksheet.getCell(`A${filaDetalles}`).style = headerStyle;

    // Encabezados de la tabla de detalles
    const encabezadosDetalles = ["Código", "Descripción", "Cantidad", "Precio Unitario", "Descuento", "Subtotal"];
    const filaEncabezados = filaDetalles + 1;
    
    encabezadosDetalles.forEach((encabezado, index) => {
      const col = String.fromCharCode(65 + index);
      worksheet.getCell(`${col}${filaEncabezados}`).value = encabezado;
      worksheet.getCell(`${col}${filaEncabezados}`).style = labelStyle;
    });

    // Datos de ejemplo para productos (en una implementación real, esto vendría de la API)
    const productos = factura.productos || [
      { codigo: "001", descripcion: factura.concepto || "Producto/Servicio principal", cantidad: 1, precio: factura.subtotal || factura.total || 0, descuento: 0 }
    ];

    productos.forEach((producto, index) => {
      const filaNum = filaEncabezados + 1 + index;
      const subtotal = (producto.cantidad * producto.precio) - producto.descuento;
      
      const datosProducto = [
        producto.codigo,
        producto.descripcion,
        producto.cantidad,
        producto.precio ? `$${producto.precio.toFixed(2)}` : "$0.00",
        producto.descuento ? `$${producto.descuento.toFixed(2)}` : "$0.00",
        `$${subtotal.toFixed(2)}`
      ];

      datosProducto.forEach((dato, colIndex) => {
        const col = String.fromCharCode(65 + colIndex);
        worksheet.getCell(`${col}${filaNum}`).value = dato;
        worksheet.getCell(`${col}${filaNum}`).style = valueStyle;
      });
    });

    // Resumen financiero completo
    const filaResumen = filaEncabezados + productos.length + 2;
    worksheet.mergeCells(`A${filaResumen}:H${filaResumen}`);
    worksheet.getCell(`A${filaResumen}`).value = "RESUMEN FINANCIERO";
    worksheet.getCell(`A${filaResumen}`).style = headerStyle;

    const subtotalProductos = productos.reduce((sum, p) => sum + (p.cantidad * p.precio - p.descuento), 0);
    const ivaCalculado = factura.iva || (subtotalProductos * 0.21); // 21% por defecto
    const totalCalculado = subtotalProductos + ivaCalculado;

    const datosFinancieros = [
      ["Subtotal Productos:", `$${subtotalProductos.toFixed(2)}`, subtotalStyle],
      ["IVA (21%):", `$${ivaCalculado.toFixed(2)}`, labelStyle],
      ["Otros Impuestos:", factura.otrosImpuestos ? `$${parseFloat(factura.otrosImpuestos).toFixed(2)}` : "$0.00", labelStyle],
      ["TOTAL:", `$${totalCalculado.toFixed(2)}`, totalStyle]
    ];

    datosFinancieros.forEach((fila, index) => {
      const filaNum = filaResumen + 1 + index;
      worksheet.mergeCells(`A${filaNum}:G${filaNum}`);
      worksheet.getCell(`A${filaNum}`).value = fila[0];
      worksheet.getCell(`A${filaNum}`).style = fila[2];
      
      worksheet.getCell(`H${filaNum}`).value = fila[1];
      worksheet.getCell(`H${filaNum}`).style = fila[2];
    });

    // Información adicional
    const filaInfo = filaResumen + datosFinancieros.length + 2;
    worksheet.mergeCells(`A${filaInfo}:H${filaInfo}`);
    worksheet.getCell(`A${filaInfo}`).value = "INFORMACIÓN ADICIONAL";
    worksheet.getCell(`A${filaInfo}`).style = headerStyle;

    const infoAdicional = [
      `Factura procesada automáticamente el ${new Date(factura.timestamp || Date.now()).toLocaleDateString()}`,
      `Forma de pago: ${factura.formaPago || "No especificada"}`,
      `Vencimiento: ${factura.vencimiento || "No especificado"}`,
      `Observaciones: ${factura.observaciones || "Ninguna"}`
    ];

    infoAdicional.forEach((info, index) => {
      const filaNum = filaInfo + 1 + index;
      worksheet.mergeCells(`A${filaNum}:H${filaNum}`);
      worksheet.getCell(`A${filaNum}`).value = info;
      worksheet.getCell(`A${filaNum}`).style = {
        font: { italic: true, size: 10, color: { argb: "666666" } },
        alignment: { horizontal: "left" }
      };
    });

    // Ajustar anchos de columnas
    worksheet.columns = [
      { width: 12 }, { width: 25 }, { width: 10 }, 
      { width: 15 }, { width: 12 }, { width: 12 },
      { width: 15 }, { width: 15 }
    ];

    // Ajustar alturas de filas principales
    [1, 3, filaCliente, filaDetalles, filaResumen, filaInfo].forEach(filaNum => {
      worksheet.getRow(filaNum).height = 25;
    });
  };

  const descargarExcelIndividual = async (factura) => {
    if (!factura || !factura.procesado || factura.error) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Facturas";
    workbook.lastModifiedBy = "Sistema de Facturas";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet("FACTURA_DETALLADA", {
      pageSetup: {
        paperSize: 9, orientation: "portrait",
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }
      }
    });

    const estilos = crearEstilosExcel();
    crearFacturaDetallada(worksheet, factura, estilos);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factura_detallada_${factura.numeroFactura || factura.fechaEmision || Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const descargarExcelMultipleSeparado = async () => {
    const facturasValidas = datos.filter(f => f && f.procesado && !f.error);
    
    facturasValidas.forEach((factura, index) => {
      setTimeout(() => {
        descargarExcelIndividual(factura);
      }, index * 1000);
    });
  };

  const descargarExcelMultipleCombinado = async () => {
    const facturasValidas = datos.filter(f => f && f.procesado && !f.error);
    if (facturasValidas.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Facturas";
    workbook.lastModifiedBy = "Sistema de Facturas";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Hoja de resumen general
    const resumenSheet = workbook.addWorksheet("RESUMEN_GENERAL");
    
    // Encabezados del resumen mejorado
    resumenSheet.addRow(["RESUMEN GENERAL DE FACTURAS"]).eachCell(cell => {
      cell.style = { font: { bold: true, size: 16, color: { argb: "2F75B5" } }, alignment: { horizontal: "center" } };
    });
    resumenSheet.addRow([]);
    
    const encabezadosResumen = ["N°", "Archivo", "Emisor", "N° Factura", "Fecha", "Subtotal", "IVA", "Total", "Estado"];
    resumenSheet.addRow(encabezadosResumen).eachCell(cell => {
      cell.style = crearEstilosExcel().headerStyle;
    });

    // Datos del resumen
    facturasValidas.forEach((factura, index) => {
      const subtotal = factura.subtotal || 0;
      const iva = factura.iva || 0;
      const total = factura.total || subtotal + iva;
      
      resumenSheet.addRow([
        index + 1,
        factura.nombreArchivo,
        factura.emisor || "N/A",
        factura.numeroFactura || "N/A",
        factura.fechaEmision || "N/A",
        `$${parseFloat(subtotal).toFixed(2)}`,
        `$${parseFloat(iva).toFixed(2)}`,
        `$${parseFloat(total).toFixed(2)}`,
        "✅ PROCESADA"
      ]).eachCell(cell => {
        cell.style = crearEstilosExcel().valueStyle;
      });
    });

    // Totales generales
    const totalSubtotal = facturasValidas.reduce((sum, f) => sum + (parseFloat(f.subtotal) || 0), 0);
    const totalIva = facturasValidas.reduce((sum, f) => sum + (parseFloat(f.iva) || 0), 0);
    const totalGeneral = totalSubtotal + totalIva;

    resumenSheet.addRow([]);
    resumenSheet.addRow(["TOTALES GENERALES", "", "", "", "", 
      `$${totalSubtotal.toFixed(2)}`, 
      `$${totalIva.toFixed(2)}`, 
      `$${totalGeneral.toFixed(2)}`]
    ).eachCell((cell, colNumber) => {
      if (colNumber >= 6) {
        cell.style = crearEstilosExcel().totalStyle;
      }
    });

    // Crear hoja individual para cada factura
    facturasValidas.forEach((factura, index) => {
      const worksheet = workbook.addWorksheet(`FACTURA_${index + 1}`, {
        pageSetup: {
          paperSize: 9, orientation: "portrait",
          margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }
        }
      });

      const estilos = crearEstilosExcel();
      crearFacturaDetallada(worksheet, factura, estilos);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturas_completas_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Corregir el error del filtro
  const facturasProcesadasExitosamente = datos.filter(f => f && f.procesado && !f.error);
  const facturasConError = datos.filter(f => f && f.error);

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        📤 Procesador Avanzado de Facturas
      </Typography>

      <FormControlLabel
        control={<Switch checked={modoMultiple} onChange={(e) => setModoMultiple(e.target.checked)} />}
        label="Modo múltiple (varias facturas)"
      />

      <Box component="form" onSubmit={manejarEnvio} sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
        <Button variant="outlined" component="label" startIcon={<CloudUpload />} size="large">
          {modoMultiple ? "Seleccionar Múltiples Facturas" : "Seleccionar Factura"}
          <input type="file" accept="image/*" hidden multiple={modoMultiple} onChange={manejarSeleccionArchivo} />
        </Button>

        {imagenes.length > 0 && (
          <Typography variant="body2" color="textSecondary">
            {modoMultiple ? `${imagenes.length} archivo(s) seleccionado(s)` : `Archivo: ${imagenes[0].name}`}
          </Typography>
        )}

        <Button type="submit" variant="contained" disabled={procesando || imagenes.length === 0}
          startIcon={procesando ? <CircularProgress size={20} /> : <Description />} size="large">
          {procesando ? `Procesando... (${datos.filter(d => d.procesado).length}/${imagenes.length})` : 
           modoMultiple ? "Procesar Todas las Facturas" : "Procesar Factura"}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {datos.length > 0 && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>📊 Resultados del Procesamiento</Typography>
            
            <Box sx={{ mb: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2">
                ✅ Exitosas: {facturasProcesadasExitosamente.length} | 
                ❌ Errores: {facturasConError.length} |
                📁 Total: {datos.length}
              </Typography>
            </Box>

            <Tabs value={tabActual} onChange={(e, newValue) => setTabActual(newValue)}>
              <Tab icon={<Description />} label="Individual" />
              {modoMultiple && <Tab icon={<Collections />} label="Separadas" />}
              {modoMultiple && <Tab icon={<TableChart />} label="Combinadas" />}
            </Tabs>

            {/* Pestaña Individual */}
            {tabActual === 0 && (
              <Box sx={{ mt: 2 }}>
                {datos.map((factura, index) => (
                  <Box key={index} sx={{ mb: 2, p: 1, border: '1px solid', 
                    borderColor: factura.error ? 'error.main' : 'success.main', borderRadius: 1 }}>
                    <Typography variant="subtitle2">
                      {factura.nombreArchivo} - 
                      {factura.error ? ` ❌ ${factura.error}` : ' ✅ Lista'}
                    </Typography>
                    {!factura.error && factura.procesado && (
                      <Button size="small" startIcon={<Description />}
                        onClick={() => descargarExcelIndividual(factura)} sx={{ mt: 1 }}>
                        Descargar Factura Detallada
                      </Button>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {/* Pestaña Múltiples Separadas */}
            {tabActual === 1 && modoMultiple && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Descarga cada factura como archivo Excel separado
                </Typography>
                <Button variant="contained" startIcon={<Collections />}
                  onClick={descargarExcelMultipleSeparado}
                  disabled={facturasProcesadasExitosamente.length === 0}>
                  Descargar {facturasProcesadasExitosamente.length} Facturas Separadas
                </Button>
              </Box>
            )}

            {/* Pestaña Múltiples Combinadas */}
            {tabActual === 2 && modoMultiple && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Todas las facturas en un solo archivo Excel con resumen general
                </Typography>
                <Button variant="contained" color="secondary" startIcon={<TableChart />}
                  onClick={descargarExcelMultipleCombinado}
                  disabled={facturasProcesadasExitosamente.length === 0}>
                  Descargar Excel Combinado Completo
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Paper>
  );
};

export default SubidorDeFacturas;