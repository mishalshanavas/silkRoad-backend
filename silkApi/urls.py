from django.urls import path
from .views import *

urlpatterns = [ 
    path('autocomplete/', auto_complete, name='auto-complete'),
    path('students/<str:sr_no>/', students_by_sr, name='student-detail'),
    
    path('upcoming-birthday/', upcoming_birthday, name='upcoming-birthday'),
    
    
    path('contribute/instagram/<int:sr_no>/', contribute_instagram_id, name='contribute_instagram'),
    path('toggle-opt-out/<str:sr_no>/', toggle_opt_out, name='toggle-opt-out'),
]