from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse, HttpResponseNotFound, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import render
from rest_framework import status
from .models import Student
from .serializers import ContributeInstagramIDSerializer

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

@ensure_csrf_cookie
def test(request):
    return render(request, 'test.html')

def search(request):
    return render(request, 'search.html')
