from django.urls import path
from . import views

urlpatterns = [
    path('api/certificate/CiscoCyberSec/<str:name>/<str:date_str>/', views.ciscoCyberSec, name='cisco_cyber_security'),
]