import os
import sys
import django
import requests
from instagrapi import Client
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse

from silkApi.models import Student

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(project_root)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'silkRoad.settings')
django.setup()
SESSION_FILE = os.path.join(project_root, "session.json")
cl = Client()

def setup_instagram_client():
    if os.path.exists(SESSION_FILE):
        cl.load_settings(SESSION_FILE)
    else:
        username = "chatha_poocha_and_6389_others"
        password = "Mishal123.."
        cl.login(username, password)
        cl.dump_settings(SESSION_FILE)
    return True

def get_instagram_pk_from_Db(sr_no):
    student = Student.objects.get(sr_no=sr_no)
    return student.instagram_pk if student.instagram_pk else None

@csrf_exempt
def fetch_instagram_info(request):
    sr_no = request.GET.get('sr_no')
    setup_instagram_client()
    pk = get_instagram_pk_from_Db(sr_no)
    user_info = cl.user_info_v1(pk)
    profile_pic_proxy_url = f"/api/instagram/profile-pic/{user_info.pk}/"
    student = Student.objects.get(sr_no=sr_no)
    if student.Instagram_id != user_info.username:
        student.contributed_ig = 'old Id>>' + student.Instagram_id 
        student.Instagram_id = user_info.username
        student.contributor = "AUTOFETCHED FROM INSTAGRAM"
        student.save()

    return JsonResponse({
        'pk': user_info.pk,
        'username': user_info.username,
        'full_name': user_info.full_name,
        'profile_pic_url': profile_pic_proxy_url,
        'is_private': user_info.is_private,
        'follower_count': user_info.follower_count,
        'media_count': user_info.media_count,
    })

@csrf_exempt
def proxy_profile_pic(request, pk):
    """Proxy Instagram profile pictures through our domain"""
    try:
        setup_instagram_client()
        user_info = cl.user_info(pk)
        original_url = str(user_info.profile_pic_url)
        response = requests.get(original_url, stream=True, timeout=10)
        
        if response.status_code == 200:
            django_response = HttpResponse(
                response.content,
                content_type=response.headers.get('content-type', 'image/jpeg')
            )

            django_response['Cache-Control'] = 'public, max-age=3600'  # Cache for 1 hour
            django_response['Content-Length'] = len(response.content)
            
            return django_response
        else:
            return HttpResponse("Image not found", status=404)
            
    except Exception as e:
        return HttpResponse(f"Error fetching image: {str(e)}", status=500)