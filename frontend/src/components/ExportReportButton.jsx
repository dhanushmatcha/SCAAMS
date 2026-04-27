import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ExportReportButton = ({ title = 'Report', filename = 'report', columns = [], data = [], className = '' }) => {
    
    const generatePDF = () => {
        const doc = new jsPDF();
        
        // Document Title
        doc.setFontSize(22);
        doc.setTextColor(30, 58, 138); // Indigo 900
        doc.text(`SCAAMS Data Export: ${title}`, 14, 22);
        
        // Metadata
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        
        if (data.length === 0) {
            doc.text('No data available to export.', 14, 45);
            doc.save(`${filename}.pdf`);
            return;
        }

        // Generate Table
        doc.autoTable({
            startY: 35,
            head: [columns],
            body: data,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 11, fontStyle: 'bold' },
            bodyStyles: { fontSize: 10, textColor: 50 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { top: 35 }
        });

        doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <button 
            onClick={generatePDF}
            className={`flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl font-bold transition shadow-sm border border-indigo-200 hover:border-transparent ${className}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to PDF
        </button>
    );
};

export default ExportReportButton;
