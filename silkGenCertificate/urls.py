from django.urls import path
from . import views

urlpatterns = [
    path('api/certificate/CiscoCyberSec/', views.ciscoCyberSec, name='cisco_cyber_security'),
    path('certificate/', views.certificate, name='certificate'),
]