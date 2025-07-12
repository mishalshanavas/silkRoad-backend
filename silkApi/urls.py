from django.urls import path
from .views import *
from .instagram.instagram import fetch_instagram_info

urlpatterns = [ 
    path('autocomplete/', auto_complete, name='auto-complete'),
    path('student/<str:sr_no>/', students_by_sr, name='student-detail'),
    
    path('upcoming-birthday/', upcoming_birthday, name='upcoming-birthday'),
    
    path('contribute/instagram/<int:sr_no>/', contribute_instagram_id, name='contribute_instagram'),
    path('toggle-opt-out/<str:sr_no>/', toggle_opt_out, name='toggle-opt-out'),
    path('instagram/', fetch_instagram_info, name='instagram_info'),
    #path('instagram/profile-pic/<str:pk>/', proxy_profile_pic, name='proxy_profile_pic'),
    path('allstudents/', get_all_autocomplete, name='get_all_autocomplete'),
]