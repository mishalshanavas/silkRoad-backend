from django.shortcuts import render
from django.http import HttpResponse, FileResponse
from fpdf import FPDF
from pypdf import PdfReader, PdfWriter
import os
from django.conf import settings
from io import BytesIO

# Create your views here.
def ciscoCyberSec(request, name, date_str):
    template_path = os.path.join(os.path.dirname(__file__), 'CertificateTemplate', 'cisco_cyber_security.pdf')
    font_path = os.path.join(os.path.dirname(__file__), 'CertificateFonts', 'ArialBold.TTF')
    
    reader = PdfReader(template_path)
    writer = PdfWriter()
    page = reader.pages[0]
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    pdf = FPDF(unit="pt", format=(w, h))
    pdf.add_page()
    
    # Name
    pdf.add_font("AR", "", font_path)
    pdf.set_font("AR", size=36)
    pdf.set_text_color(0, 81, 175)
    x = (w - pdf.get_string_width(name)) / 2
    pdf.set_xy(x+16, 184)
    pdf.cell(0, 10, name)

    # Whanna Date?
    pdf.set_font("AR", size=16)
    pdf.set_text_color(51, 51, 51)
    pdf.set_xy(765, 550)
    pdf.cell(0, 10, date_str)

    overlay_buffer = BytesIO()
    pdf.output(overlay_buffer)
    overlay_buffer.seek(0)
    overlay = PdfReader(overlay_buffer)
    page.merge_page(overlay.pages[0])
    writer.add_page(page)
    buffer = BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=True, filename=f"{name}_cyber_certificate.pdf")