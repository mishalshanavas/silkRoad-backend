from django.shortcuts import render
from django.db.models import Count
from silkApi.models import Student

def landing_page(request):
    # Get total number of students excluding opt-outs
    total_students = Student.objects.filter(opt_out=False).count()
    
    # Get unique departments count
    total_departments = Student.objects.filter(opt_out=False).exclude(department='').values('department').distinct().count()
    
    context = {
        'total_students': total_students,
        'total_departments': total_departments,
    }
    return render(request, 'landing.html', context)
