from django.http import FileResponse
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader, PdfWriter
import os
from io import BytesIO

def ciscoCyberSec(request, name, date_str):
    template_path = os.path.join(os.path.dirname(__file__), 'CertificateTemplate', 'cisco_cyber_security.pdf')
    font_path = os.path.join(os.path.dirname(__file__), 'CertificateFonts', 'ArialBold.TTF')
    
    pdfmetrics.registerFont(TTFont('ArialBold', font_path))
    
    reader = PdfReader(template_path)
    writer = PdfWriter()
    page = reader.pages[0]
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    
    # Create a new PDF overlay
    overlay_buffer = BytesIO()
    c = canvas.Canvas(overlay_buffer, pagesize=(w, h))
    
    # Add name
    c.setFont("ArialBold", 36)
    c.setFillColorRGB(0/255, 81/255, 175/255)  # Blue color
    name_width = c.stringWidth(name, "ArialBold", 36)
    x = (w - name_width) / 2
    c.drawString(x+16, h-184, name)  # ReportLab coordinates from bottom-left
    
    # Add date
    c.setFont("ArialBold", 16)
    c.setFillColorRGB(51/255, 51/255, 51/255)  # Gray color
    c.drawString(765, h-550, date_str)
    
    c.save()
    overlay_buffer.seek(0)
    
    # Merge the overlay with the template
    overlay = PdfReader(overlay_buffer)
    page.merge_page(overlay.pages[0])
    writer.add_page(page)
    
    # Write the output
    buffer = BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    
    return FileResponse(buffer, as_attachment=True, filename=f"{name}_cyber_certificate.pdf")