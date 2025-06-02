import os

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from google.oauth2 import id_token
from google.auth.transport import requests
from silkApi.models import Student

@csrf_exempt
def sign_in(request):
    return render(request, 'sign_in.html')

def auth_status(request):
    """
    API endpoint to check authentication status and return user data
    Returns user's profile picture and email if logged in
    """
    if 'user_data' in request.session:
        user_data = request.session['user_data']
        return JsonResponse({
            'isAuthenticated': True,
            'picture': user_data.get('picture', ''),
            'email': user_data.get('email', ''),
            'name': user_data.get('name', '')
        })
    return JsonResponse({
        'isAuthenticated': False
    })

@csrf_exempt
def auth_receiver(request):
    """
    Google calls this URL after the user has signed in with their Google account.
    Only allows users with @sahrdaya.ac.in email addresses.
    """
    print('Inside')
    token = request.POST['credential']
    try:
        user_data = id_token.verify_oauth2_token(
            token, requests.Request(), os.environ['GOOGLE_OAUTH_CLIENT_ID']
        )
        
        # Check if sahrdaya.ac.in mail
        if not user_data.get('email', '').endswith('@sahrdaya.ac.in'):
            return HttpResponse('Only sahrdaya.ac.in email addresses are allowed here 😿', status=403)
            
    except ValueError:
        return HttpResponse(status=403)

    request.session['user_data'] = user_data
    #get sr-no from email and store the mail in db 
    email = user_data.get('email', '')
    sr_no = email.split('@')[0][-6:]
    student = Student.objects.get(sr_no=sr_no)
    if student.email != email or student.email is None:
        student.email = email
        student.save()
    return redirect('sign_in')

def sign_out(request):
    del request.session['user_data']
    return redirect('sign_in')