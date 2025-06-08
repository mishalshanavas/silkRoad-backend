document.addEventListener('DOMContentLoaded', function() {
    // Function to animate counting up to a target number
    function animateCount(element, target) {
        let current = 0;
        const duration = 2000; // 2 seconds
        const steps = 50;
        const increment = target / steps;
        const interval = duration / steps;
        
        const counter = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(counter);
            } else {
                element.textContent = Math.round(current);
            }
        }, interval);
    }

    // Get counter elements
    const studentCounter = document.getElementById('studentCount');
    const departmentCounter = document.getElementById('departmentCount');

    // Get target numbers from the Django template
    const totalStudents = parseInt(studentCounter.dataset.count || '0');
    const totalDepartments = parseInt(departmentCounter.dataset.count || '0');

    // Create an observer for the hero stats section
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Start the animation when the section comes into view
                animateCount(studentCounter, totalStudents);
                animateCount(departmentCounter, totalDepartments);
                // Only run the animation once
                observer.disconnect();
            }
        });
    });

    // Observe the hero stats section
    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
        observer.observe(heroStats);
    }
});
