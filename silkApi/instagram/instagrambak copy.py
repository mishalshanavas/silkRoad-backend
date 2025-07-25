import os
import sys
import django
import requests
import base64
from instagrapi import Client
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse
from dotenv import load_dotenv
from silkApi.models import Student

load_dotenv()

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
        username = os.environ.get('INSTAGRAM_USERNAME')
        password = os.environ.get('INSTAGRAM_PASSWORD')

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
    user_info = cl.user_info(pk)
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
    try:
        setup_instagram_client()
        user_info = cl.user_info(pk)
        original_url = str(user_info.profile_pic_url)
        response = requests.get(original_url, stream=True, timeout=10)
        
        if response.status_code == 200:
            # Encode image as base64 and return as JSON
            encoded_string = base64.b64encode(response.content).decode('utf-8')
            data_url = f"data:{response.headers.get('content-type', 'image/jpeg')};base64,{encoded_string}"
            return JsonResponse({'profile_pic_data': data_url})
        else:
            return JsonResponse({'error': 'Image not found'}, status=404)
            
    except Exception as e:
        return JsonResponse({'error': f"Error fetching image: {str(e)}"}, status=500)