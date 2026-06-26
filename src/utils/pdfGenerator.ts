import jsPDF from 'jspdf';
import { Report } from '../types';

export const generateReportPDF = async (report: Report) => {
  const doc = new jsPDF('p', 'pt', 'a4');
  const margin = 40;
  let y = margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const addText = (text: string, fontSize: number, isBold: boolean = false, color: number[] = [0,0,0]) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    for (let line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += fontSize + 5;
    }
    y += 5;
  };

  // Header
  addText('CivicPulse Official Complaint Report', 24, true, [34, 211, 238]);
  y += 10;
  
  addText(`Report ID: ${report.displayId || report.id.substring(0, 8)}`, 12, true);
  addText(`Date: ${new Date(report.timestamp).toLocaleString()}`, 12);
  addText(`Citizen ID: ${report.reporterId || report.userId?.substring(0, 8) || 'Anonymous'}`, 12);
  addText(`Citizen Name: Anonymous`, 12); // We don't store real name for privacy by default
  addText(`Email: N/A`, 12);
  addText(`Phone Number: N/A`, 12);
  y += 10;

  // Issue Details
  addText('Issue Details', 16, true);
  addText(`Issue Type: ${report.analysis?.detection?.category || 'Unknown'}`, 12);
  addText(`Priority / Severity: ${report.analysis?.impactAssessment?.severityLevel || 'Low'}`, 12);
  addText(`Location: ${report.address || report.analysis?.locationIntelligence?.locationDescription || 'N/A'}`, 12);
  if (report.coordinates) {
    addText(`Coordinates: ${report.coordinates.lat.toFixed(6)}, ${report.coordinates.lng.toFixed(6)}`, 12);
  }
  addText(`Department Assignment: ${report.department || 'Unassigned'}`, 12);
  addText(`Status: ${report.status || 'Pending'}`, 12);
  y += 10;

  // Description & AI Analysis
  addText('Description & Drafted Complaint', 16, true);
  const description = report.analysis?.citizenAssistant?.complaintDraft || report.analysis?.citizenAssistant?.issueSummary || 'No description provided.';
  addText(description, 11);
  y += 10;

  addText('Risk Prediction & Recommended Actions', 16, true);
  addText(`Risk Escalation: ${report.analysis?.impactPrediction?.riskEscalation || 'None'}`, 11);
  if (report.analysis?.civicAction?.prioritizedNextActions?.length) {
    report.analysis.civicAction.prioritizedNextActions.forEach((action, idx) => {
      addText(`${idx + 1}. ${action}`, 11);
    });
  }
  y += 10;

  addText('Verification Metrics', 16, true);
  addText(`Trust Score: ${report.analysis?.civicShield?.authenticityScore || 0}%`, 12);
  addText(`Civic Impact Score: ${report.analysis?.impactAssessment?.civicImpactScore || 0}`, 12);
  y += 10;

  // Images
  const reportImages = report.images || (report as any).evidenceImages || (report as any).evidence || ((report as any).imageBase64 ? [(report as any).imageBase64] : []);
  if (reportImages.length > 0) {
    addText('Evidence Images', 16, true);
    for (let rawImg of reportImages.slice(0, 2)) {
      const imgData = rawImg.startsWith('data:') || rawImg.startsWith('http') ? rawImg : `data:image/jpeg;base64,${rawImg}`;
      if (y > doc.internal.pageSize.getHeight() - 250) {
        doc.addPage();
        y = margin;
      }
      try {
        doc.addImage(imgData, 'JPEG', margin, y, 200, 150);
        y += 160;
      } catch (e) {
        console.error("Could not add image to PDF", e);
      }
    }
  }

  doc.save(`Complaint_Report_${report.displayId || report.id.substring(0, 8)}.pdf`);
};
