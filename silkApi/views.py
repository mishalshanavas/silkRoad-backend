from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import render
from django.http import JsonResponse, HttpResponseNotFound, HttpResponseForbidden, HttpResponse
import json
from .models import Student

def authorized_user(request, sr_no):
    if request.session.get('user_data', {}).get('email', '').__contains__(sr_no):
        return True
    return False

@csrf_exempt
def contribute_instagram_id(request, sr_no):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    if not authorized_user(request, sr_no):
        return HttpResponseForbidden("You are not authorized to perform this action.")

    try:
        # Parse the JSON body
        data = json.loads(request.body)
        instagram_id = data.get('instagram_id')
    
        if not instagram_id or not isinstance(instagram_id, str):
            return JsonResponse({'error': 'Invalid Instagram ID'}, status=400)
    
        instagram_id = instagram_id.strip().lstrip('@')
    
        student = Student.objects.get(sr_no=sr_no)
        student.contributed_ig = instagram_id
        if student.Instagram_id is None:
            student.Instagram_id = instagram_id + ' (Not verified)'

        student.contributor = request.session.get('user_data', {}).get('email', '')
        student.save()
        
        return JsonResponse({
            'success': True,
            'Instagram_id': student.contributed_ig
        })

    except Student.DoesNotExist:
        return HttpResponseNotFound("Student not found")
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@csrf_exempt
@require_http_methods(["POST"])
def toggle_opt_out(request, sr_no):
    if not authorized_user(request, sr_no):
        return HttpResponse("You are not allowed to perform this action.", status=403)

    try:
        student = Student.objects.get(sr_no=sr_no)
        student.opt_out = not student.opt_out
        student.save()
        return JsonResponse({'opt_out': student.opt_out}, status=200)
    except Student.DoesNotExist:
        return HttpResponseNotFound("student not found")

def students_by_sr(request,sr_no):
    try:
        student = Student.objects.values('name',
                                         'sr_no',
                                         'department',
                                         'date_of_birth',
                                         'Instagram_id',
                                         'father_mobile',
                                         'opt_out',
                                         'street',
                                         'street2',
                                         'district'
                                         ).get(sr_no=sr_no)
        return JsonResponse(student)
    except Student.DoesNotExist:
        return HttpResponseNotFound("student not found")


def auto_complete(request):
    query = request.GET.get('q', '')
    if not query:
        return JsonResponse([], safe=False)

    students = Student.objects.filter(
        name__icontains=query  #ILIKE
    ).order_by('name')[:8]  # 8 results only

    results = [
        {
            'id': student.sr_no,
            'name': student.name,
            'department': student.department,
            'opt_out': student.opt_out
        }
        for student in students
    ]
    return JsonResponse(results, safe=False)

def confidential(request, sr_no=None):
   if authorized_user(request, sr_no):
       return HttpResponse("confidential data",)
   else:
       return HttpResponse("You are not allowed to perform this action.", status=403)
   
def search(request):
    return render(request, 'search.html')
