import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

class PdfService {
    /**
     * Generates and saves a PDF file with a table
     * @param title Title of the PDF document
     * @param columns Array of column headers
     * @param data Array of arrays containing row data matching columns
     * @param filename Base filename (timestamp will be appended)
     * @param orientation 'portrait' or 'landscape'
     */
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

        // Add Title
        doc.setFontSize(18);
        doc.text(title, 14, 22);

        // Add Date
        doc.setFontSize(11);
        doc.setTextColor(100);
        const dateStr = format(new Date(), 'MMM dd, yyyy HH:mm');
        doc.text(`Generated on: ${dateStr}`, 14, 30);

        // Add Table
        autoTable(doc, {
            head: [columns],
            body: data,
            startY: 40,
            styles: {
                fontSize: 10,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [66, 139, 202], // Adjust color to match theme if needed
                textColor: 255,
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            margin: { top: 40 },
        });

        // Save
        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
        doc.save(`${filename}_${timestamp}.pdf`);
    }
}

export const pdfService = new PdfService();
