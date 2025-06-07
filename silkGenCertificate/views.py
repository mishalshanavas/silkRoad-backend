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
    template_page = reader.pages[0]
    
    # template page(PyPDF2 uses mediabox)
    template_width = float(template_page.mediabox.width)
    template_height = float(template_page.mediabox.height)
    
    # Create overlay canvas with SAME dimensions as template
    overlay_buffer = BytesIO()
    overlay_canvas = canvas.Canvas(overlay_buffer, pagesize=(template_width, template_height))
    
    # Add name text
    overlay_canvas.setFont("ArialBold", 36)
    overlay_canvas.setFillColorRGB(0/255, 81/255, 175/255)  # Blue color
    name_text_width = overlay_canvas.stringWidth(name, "ArialBold", 36)
    
    overlay_canvas.saveState()
    overlay_canvas.translate(240, (template_height/2) + 18)
    overlay_canvas.rotate(90)
    overlay_canvas.drawString(-name_text_width/2, 0, name)
    overlay_canvas.restoreState()

    # Wanna Date?
    overlay_canvas.setFont("ArialBold", 16)
    overlay_canvas.setFillColorRGB(51/255, 51/255, 51/255)
    overlay_canvas.saveState()
    overlay_canvas.translate(599, 799)
    overlay_canvas.rotate(90)
    overlay_canvas.drawString(0, 0, date_str)
    overlay_canvas.restoreState()
    
    overlay_canvas.save()
    overlay_buffer.seek(0)
    
    # Merge template and overlay
    overlay_page = PdfReader(overlay_buffer)
    template_page.merge_page(overlay_page.pages[0])
    writer.add_page(template_page)

    # Write final PDF to buffer
    buffer = BytesIO()
    writer.write(buffer)
    buffer.seek(0)  

    return FileResponse(buffer, as_attachment=True, filename=f"{name}CyberCertificate.pdf")