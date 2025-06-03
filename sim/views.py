import os
import json

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from google.oauth2 import id_token
from google.auth.transport import requests
from silkApi.models import Student

@csrf_exempt
def sign_in(request):
    next_url = request.GET.get('next', '/')
    return render(request, 'sign_in.html', {'next': next_url})

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
    Handles both POST form data (redirect mode) and JSON data (popup mode).
    """
    print('Inside')
    
    # Handle both popup mode (JSON) and redirect mode (form data)
    if request.content_type == 'application/json':
        # Popup mode - JSON data
        try:
            data = json.loads(request.body)
            token = data.get('credential')
            next_url = data.get('next', '/')
            print(f'Popup mode - next_url from JSON: {next_url}')
        except (json.JSONDecodeError, KeyError):
            return JsonResponse({'success': False, 'error': 'Invalid request data'}, status=400)
    else:
        # Redirect mode - form data
        token = request.POST.get('credential')
        next_url = request.GET.get('next', '/')
        print(f'Redirect mode - next_url from GET: {next_url}')
        
    if not token:
        error_response = 'Missing credential token'
        if request.content_type == 'application/json':
            return JsonResponse({'success': False, 'error': error_response}, status=400)
        return HttpResponse(error_response, status=400)
    
    try:
        user_data = id_token.verify_oauth2_token(
            token, requests.Request(), os.environ['GOOGLE_OAUTH_CLIENT_ID']
        )
        
        # Check if sahrdaya.ac.in mail
        email = user_data.get('email', '')
        if not email.endswith('@sahrdaya.ac.in'):
            error_message = 'Only sahrdaya.ac.in email addresses are allowed here 😿'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'error': error_message}, status=403)
            return HttpResponse(error_message, status=403)
            
    except ValueError:
        error_message = 'Invalid token'
        if request.content_type == 'application/json':
            return JsonResponse({'success': False, 'error': error_message}, status=403)
        return HttpResponse(status=403)

    request.session['user_data'] = user_data
    
    # Get sr-no from email and store the mail in db 
    sr_no = email.split('@')[0][-6:]
    try:
        student = Student.objects.get(sr_no=sr_no)
        if student.email != email or student.email is None:
            student.email = email
            student.save()
    except Student.DoesNotExist:
        error_message = f'Student with SR number {sr_no} not found'
        if request.content_type == 'application/json':
            return JsonResponse({'success': False, 'error': error_message}, status=404)
        return HttpResponse(error_message, status=404)
    
    # Return appropriate response based on request type
    if request.content_type == 'application/json':
        # Popup mode - return JSON response
        print(f'Returning JSON response with redirect_url: {next_url}')
        return JsonResponse({
            'success': True,
            'redirect_url': next_url,
            'user': {
                'email': user_data.get('email', ''),
                'name': user_data.get('name', ''),
                'picture': user_data.get('picture', '')
            }
        })
    else:
        # Redirect mode - redirect to next URL
        return redirect(next_url)

def sign_out(request):
    request.session.pop('user_data', None)
    return redirect(request.META.get('HTTP_REFERER', '/'))