"""
URL configuration for silkRoad project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from silkApi.views import students_by_sr, auto_complete,toggle_opt_out,contribute_instagram_id, search

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/students/<str:sr_no>/', students_by_sr, name='student-detail'),
    path('api/autocomplete/', auto_complete, name='auto-complete'),
    path('api/toggle-opt-out/<str:sr_no>/', toggle_opt_out, name='toggle-opt-out'),
    path('api/contribute/instagram/<int:sr_no>/', contribute_instagram_id, name='contribute_instagram'),
    path('search/', search, name='search'),
    
    path('', include('core.urls')),  # Landing page and main site pages
    path('', include('sim.urls')),
    path('', include('silkGenCertificate.urls')),
]
