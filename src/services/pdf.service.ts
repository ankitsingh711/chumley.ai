import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { pureAspectLogoBase64 } from '../assets/pureAspectLogoBase64';

export interface PurchaseDocumentData {
    id: string;
    date: string;
    type: 'Order' | 'Request';
    supplier: {
        name: string;
        address?: string; // e.g. "Symec, The Willows, 159 Flour Acres, Withywood, Bristol, BS13 8 RA"
    };
    delivery: {
        recipient: string;
        address: string;
        date: string;
    };
    items: {
        code: string;
        description: string;
        qty: number;
        net: number;
        vat: number;
        gross: number;
    }[];
    totals: {
        net: number;
        vat: number;
        gross: number;
    };
}

class PdfService {
    // ...existing exportToPDF formatting...
    exportToPDF(
        title: string,
        columns: string[],
        data: any[][],
        filename: string,
        orientation: 'p' | 'l' = 'p'
    ) {
        const doc = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        });

        const margin = 14;
        const blueColor = [26, 53, 99] as [number, number, number]; // #1A3563

        // --- Header ---
        doc.setFontSize(22);
        doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), margin, 25);

        // Add Aspect Logo
        if (pureAspectLogoBase64) {
            const logoX = orientation === 'l' ? 240 : 145;
            doc.addImage(pureAspectLogoBase64, 'PNG', logoX, 17, 45, 11);
        }

        // --- Date info ---
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("Generated:", margin, 38);
        doc.setFont("helvetica", "normal");
        const dateStr = format(new Date(), 'dd/MM/yyyy, HH:mm');
        doc.text(dateStr, margin + 24, 38);

        doc.setFont("helvetica", "bold");
        doc.text("Total Records:", margin, 43);
        doc.setFont("helvetica", "normal");
        doc.text(data.length.toString(), margin + 30, 43);

        // --- Table ---
        autoTable(doc, {
            head: [columns],
            body: data,
            startY: 50,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 9,
                cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
                textColor: [0, 0, 0],
                lineColor: [220, 220, 220],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: blueColor,
                textColor: 255,
                fontStyle: 'bold',
                lineColor: blueColor,
                lineWidth: 0.1,
            },
            bodyStyles: {
                fillColor: [255, 255, 255],
            },
            alternateRowStyles: {
                fillColor: [248, 249, 252],
            },
            margin: { left: margin, right: margin },
        });

        // Save
        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
        doc.save(`${filename}_${timestamp}.pdf`);
    }

    /**
     * Generates a styled PDF matching the specific Purchase Order / Request design.
     */
    exportPurchaseDocumentPDF(data: PurchaseDocumentData, filename: string) {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const margin = 14;
        const blueColor = [26, 53, 99] as [number, number, number]; // #1A3563 based on user request

        // --- Header Section ---
        doc.setFontSize(24);
        doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text(`PURCHASE ${data.type.toUpperCase()}`, margin, 25);

        // Add Aspect Logo (pure logo without 'powered by' text)
        if (pureAspectLogoBase64) {
            // Rough dimensions for pure logo to fit top right
            doc.addImage(pureAspectLogoBase64, 'PNG', 145, 17, 45, 11);
        }

        // --- Info Section ---
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(`Order No: `, margin, 40);
        doc.setFont("helvetica", "normal");
        doc.text(data.id, margin + 20, 40);

        doc.setFont("helvetica", "bold");
        doc.text(`Date: `, margin, 45);
        doc.setFont("helvetica", "normal");
        doc.text(data.date, margin + 20, 45);

        // --- Supplier Information Box ---
        let currentY = 55;
        doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.rect(margin, currentY, 182, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Supplier Information", margin + 2, currentY + 5);

        currentY += 7;
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, currentY, 182, 10, 'D'); // Border
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        const supplierText = data.supplier.address ? `${data.supplier.name}, ${data.supplier.address}` : data.supplier.name;
        doc.text(supplierText, margin + 2, currentY + 6);

        // --- Delivery Information Box ---
        currentY += 15;
        doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.rect(margin, currentY, 182, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Delivery Information", margin + 2, currentY + 5);

        currentY += 7;
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, currentY, 182, 25, 'D');
        doc.setTextColor(0, 0, 0);

        // Delivery left side
        doc.setFont("helvetica", "bold");
        doc.text("Ship To:", margin + 2, currentY + 6);
        doc.setFont("helvetica", "normal");

        const shipToLines = [data.delivery.recipient, ...data.delivery.address.split(',').map(l => l.trim())];
        let lineY = currentY + 6;
        doc.text(shipToLines[0], margin + 18, lineY);
        for (let i = 1; i < shipToLines.length; i++) {
            lineY += 5;
            doc.text(shipToLines[i], margin + 2, lineY);
        }

        // Delivery Right side
        // Vertical divider
        doc.line(105, currentY, 105, currentY + 25);
        doc.setFont("helvetica", "bold");
        doc.text("Delivery Date:", 107, currentY + 6);
        doc.setFont("helvetica", "normal");
        doc.text(data.delivery.date, 135, currentY + 6);

        currentY += 30;

        // --- Items Table ---
        const tableColumns = ["Line", "Item code", "Description", "Qty", "Net", "VAT", "Gross"];
        const tableData = data.items.map((item, index) => [
            (index + 1).toString(),
            item.code || '-',
            item.description,
            item.qty.toString(),
            `£${item.net.toFixed(2)}`,
            `£${item.vat.toFixed(2)}`,
            `£${item.gross.toFixed(2)}`
        ]);

        autoTable(doc, {
            head: [tableColumns],
            body: tableData,
            startY: currentY,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 9,
                cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
                textColor: [0, 0, 0],
                lineColor: [220, 220, 220],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: blueColor,
                textColor: 255,
                fontStyle: 'bold',
                lineColor: blueColor,
                lineWidth: 0.1,
            },
            bodyStyles: {
                fillColor: [255, 255, 255],
            },
            columnStyles: {
                0: { cellWidth: 16 },            // Line
                1: { cellWidth: 35 },            // Item code
                2: { cellWidth: 'auto' },        // Description
                3: { cellWidth: 15, halign: 'right' }, // Qty
                4: { cellWidth: 22, halign: 'right' }, // Net
                5: { cellWidth: 20, halign: 'right' }, // VAT
                6: { cellWidth: 25, halign: 'right' }, // Gross
            },
            margin: { left: margin, right: margin }
        });

        // --- Totals Section ---
        currentY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(12);
        const startXLeft = 125;
        const startXRight = 180;
        const rowHeight = 8;

        // Total Net
        doc.setFont("helvetica", "bold");
        doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.text("Total Net:", startXLeft, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(`£${data.totals.net.toFixed(2)}`, startXRight, currentY, { align: 'right' });

        currentY += rowHeight;
        // Total VAT
        doc.setFont("helvetica", "bold");
        doc.text("Total VAT:", startXLeft, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(`£${data.totals.vat.toFixed(2)}`, startXRight, currentY, { align: 'right' });

        currentY += 2;
        // Divider line
        doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.setLineWidth(0.3);
        doc.line(startXLeft + 25, currentY, startXRight, currentY);

        currentY += rowHeight - 2;
        // Total Gross
        doc.setFont("helvetica", "bold");
        doc.text("Total Gross:", startXLeft, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(`£${data.totals.gross.toFixed(2)}`, startXRight, currentY, { align: 'right' });

        // Divider line under total gross
        currentY += 2;
        doc.line(startXLeft + 22, currentY, startXRight, currentY);

        // Save
        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
        doc.save(`${filename}_${timestamp}.pdf`);
    }
}

export const pdfService = new PdfService();
