import os
import sys
import django
import requests
import base64
from instagrapi import Client
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
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
    """Setup Instagram client with session management"""
    if os.path.exists(SESSION_FILE):
        cl.load_settings(SESSION_FILE)
    else:
        username = os.environ.get('INSTAGRAM_USERNAME')
        password = os.environ.get('INSTAGRAM_PASSWORD')
        if not username or not password:
            raise ValueError("Instagram credentials not found in environment")
        cl.login(username, password)
        cl.dump_settings(SESSION_FILE)
    return True

def get_instagram_pk_from_db(sr_no):
    """Get Instagram PK from database for given student"""
    try:
        student = Student.objects.get(sr_no=sr_no)
        return student.instagram_pk
    except Student.DoesNotExist:
        return None

def update_student_info(student, user_info, source="AUTOFETCHED FROM INSTAGRAM"):
    """Update student Instagram information"""
    updated = False
    
    # Update Instagram username if different
    if student.Instagram_id != user_info['username']:
        student.contributed_ig = f"old Id >> {student.Instagram_id or ''}"
        student.Instagram_id = user_info['username']
        student.contributor = source
        updated = True
    
    # Update instagram_pk if not set or different
    if not student.instagram_pk or str(student.instagram_pk) != str(user_info['pk']):
        student.instagram_pk = user_info['pk']
        if not student.contributor:
            student.contributor = source
        updated = True
    
    if updated:
        student.save()

def fetch_profile_picture(url):
    """Fetch and encode profile picture as base64"""
    try:
        response = requests.get(url, stream=True, timeout=10)
        if response.status_code == 200:
            encoded_string = base64.b64encode(response.content).decode('utf-8')
            content_type = response.headers.get('content-type', 'image/jpeg')
            return f"data:{content_type};base64,{encoded_string}"
    except Exception:
        pass
    return None

def format_user_data(user_info, profile_pic_data=None):
    """Format user data for response"""
    return {
        'pk': user_info.get('pk'),
        'username': user_info.get('username', ''),
        'full_name': user_info.get('full_name', ''),
        'profile_pic_data': profile_pic_data,
        'is_private': user_info.get('is_private', False),
        'follower_count': user_info.get('follower_count', 0),
        'media_count': user_info.get('media_count', 0),
    }

def fetch_with_fallback(pk, sr_no):
    """Fetch using instagrapi as fallback when illegaltunnel fails"""
    setup_instagram_client()
    user_info = cl.user_info(pk)
    
    # Fetch profile picture
    profile_pic_data = fetch_profile_picture(str(user_info.profile_pic_url))
    
    # Update student information
    student = Student.objects.get(sr_no=sr_no)
    user_data = {
        'pk': user_info.pk,
        'username': user_info.username,
        'full_name': user_info.full_name
    }
    update_student_info(student, user_data)
    
    return format_user_data({
        'pk': user_info.pk,
        'username': user_info.username,
        'full_name': user_info.full_name,
        'is_private': user_info.is_private,
        'follower_count': user_info.follower_count,
        'media_count': user_info.media_count,
    }, profile_pic_data)

@csrf_exempt
def fetch_instagram_info(request):
    """Main endpoint to fetch Instagram information"""
    sr_no = request.GET.get('sr_no')
    if not sr_no:
        return JsonResponse({'error': 'sr_no parameter is required'}, status=400)
    
    pk = get_instagram_pk_from_db(sr_no)
    if not pk:
        return JsonResponse({'error': 'Instagram PK not found'}, status=404)
    
    # Try illegaltunnel.icu first
    try:
        response = requests.get(f"https://ig.illegaltunnel.icu/api/fetch?pk={pk}", timeout=15)
        if response.status_code == 200:
            user_info = response.json()
            profile_pic_data = user_info.get('profile_pic', {}).get('data')
            
            # Update student information
            student = Student.objects.get(sr_no=sr_no)
            update_student_info(student, user_info)
            
            return JsonResponse(format_user_data(user_info, profile_pic_data))
    except Exception:
        pass
    
    # Use fallback method
    try:
        fallback_data = fetch_with_fallback(pk, sr_no)
        return JsonResponse(fallback_data)
    except Exception as e:
        return JsonResponse({'error': f'Failed to fetch Instagram data: {str(e)}'}, status=500)