from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse, HttpResponseNotFound, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import render
from rest_framework import status
from .models import Student
import datetime
from .serializers import ContributeInstagramIDSerializer
from collections import defaultdict
from django.db import models
import pytz
from django.utils import timezone

def get_student_data(sr_no):
    """Helper function to get student data by sr_no"""
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
                                       'district',
                                       'contributor'
                                       ).get(sr_no=sr_no)
        return student, None
    except Student.DoesNotExist:
        return None, "Student not found"


#<---------------------------Search API----------------------------->
@api_view(['POST'])
@permission_classes([])  
def contribute_instagram_id(request, sr_no):
    if not request.session.get('user_data'):
        return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    serializer = ContributeInstagramIDSerializer(data=request.data)
    if serializer.is_valid():
        instagram_id = serializer.validated_data['instagram_id'].strip().lstrip('@')

        try:
            student = Student.objects.get(sr_no=sr_no)
        except Student.DoesNotExist:
            return Response({'detail': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        student.contributed_ig = instagram_id
        if student.Instagram_id is None or student.Instagram_id != instagram_id:
            student.Instagram_id = instagram_id + ' (Not verified)'

        student.contributor = request.session.get('user_data', {}).get('email', '')
        student.save()

        return Response({'success': True, 'Instagram_id': student.contributed_ig}, status=status.HTTP_200_OK)    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def authorized_user(request, sr_no):
    sr_no_str = str(sr_no)
    email = request.session.get('user_data', {}).get('email', '')
    if sr_no_str in email:
        return True
    return False

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
    student_data, error_message = get_student_data(sr_no)
    if error_message:
        return HttpResponseNotFound("student not found")
    return JsonResponse(student_data)

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

def get_all_autocomplete(request):
    students = list(Student.objects.values(
        'id', 'sr_no', 'name', 'department', 'opt_out'
    ).order_by('name'))
    return JsonResponse(students, safe=False)

def upcoming_birthday(request):
    ist = pytz.timezone('Asia/Kolkata')
    today = timezone.now().astimezone(ist).date()
    end_date = today + datetime.timedelta(days=14)
    if today.month == 12 and end_date.month == 1:
            students = Student.objects.filter(
            models.Q(
                date_of_birth__month__gte=today.month, date_of_birth__day__gte=today.day
            ) |
            models.Q(
                date_of_birth__month__lte=end_date.month, date_of_birth__day__lte=end_date.day
            ) |
            models.Q(
                date_of_birth__month__gt=today.month
            ) |
            models.Q(
                date_of_birth__month__lt=end_date.month
            )
        ).values('name', 'sr_no', 'department', 'date_of_birth')
    else:
        # Normal case: same year
        students = Student.objects.filter(
            models.Q(
                date_of_birth__month=today.month, date_of_birth__day__gte=today.day
            ) |
            models.Q(
                date_of_birth__month__gt=today.month, date_of_birth__month__lt=end_date.month
            ) |
            models.Q(
                date_of_birth__month=end_date.month,
                date_of_birth__day__lte=end_date.day
            )
        )
    upcoming_bdays = []
    for student in students:
        birth_date = student.date_of_birth if hasattr(student, 'date_of_birth') else student['date_of_birth']
        current_year_birthday = birth_date.replace(year=today.year)

        if current_year_birthday < today:
            current_year_birthday = birth_date.replace(year=today.year + 1)
        days_until = (current_year_birthday - today).days
        # Only include if within 15 days
        if days_until <= 14:
            age = current_year_birthday.year - birth_date.year

            student_data = {
                'name': student.name if hasattr(student, 'name') else student['name'],
                'sr_no': student.sr_no if hasattr(student, 'sr_no') else student['sr_no'],
                'department': student.department if hasattr(student, 'department') else student['department'],
                'date_of_birth': birth_date,
                'days_until': days_until,
                'turning_age': age,
                'birthday_date': f"{current_year_birthday.day}/{current_year_birthday.month}"
            }
            upcoming_bdays.append(student_data)
    
    upcoming_bdays.sort(key=lambda x: (x['days_until'], x['name']))  
    grouped = defaultdict(list)
    for bday in upcoming_bdays:
        grouped[bday['days_until']].append(bday)

    result = []
    count = 0
    for days_until in sorted(grouped.keys()):
        group = grouped[days_until]
        result.extend(group)
        count += len(group)
        if count >= 10:
            break
    return JsonResponse({"students": result})

def home(request):
    return render(request, 'landing.html')


def search(request):
    student_data = None
    error_message = None
    sr_no = request.GET.get('sr_no', '').strip()
    
    if sr_no:
        student_data, error_message = get_student_data(sr_no)

    return render(request, 'search.html', {'initial_student': student_data})

def test(request):
    return render(request, 'test.html')