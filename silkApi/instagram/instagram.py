import os
import sys
import django
import json
from instagrapi import Client
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

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

def get_instagram_pk(sr_no):
    student = Student.objects.get(sr_no=sr_no)
    username = student.Instagram_id.strip().lstrip('@')
    user_info = cl.user_info_by_username(username)
    return str(user_info.pk)

@csrf_exempt
def fetch_instagram_info(request):
    sr_no = request.GET.get('sr_no')
    setup_instagram_client()
    pk = get_instagram_pk(sr_no)
    user_info = cl.user_info(pk)
    
    return JsonResponse({
        'pk': user_info.pk,
        'username': user_info.username,
        'full_name': user_info.full_name,
        'profile_pic_url': str(user_info.profile_pic_url),
        'is_private': user_info.is_private,
        'follower_count': user_info.follower_count,
        'media_count': user_info.media_count,
    })