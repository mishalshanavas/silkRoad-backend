from django.views.decorators.http import require_POST
from django.shortcuts import render
from django.http import JsonResponse, HttpResponseNotFound, HttpResponse
from .models import Student

def authorized_user(request, sr_no):
    if request.session.get('user_data', {}).get('email', '').__contains__(sr_no):
        return True
    return False

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
                                         ).get(sr_no=sr_no)
        return JsonResponse(student)
    except Student.DoesNotExist:
        return HttpResponseNotFound("student not found")

@require_POST
def auto_complete(request):
    query = request.POST.get('q', '')
    if not query:
        return JsonResponse([], safe=False)

    students = Student.objects.filter(
        name__icontains=query  #ILIKE
    ).order_by('name')[:8]  # 8 results only

    results = [
        {
            'id': student.id,
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