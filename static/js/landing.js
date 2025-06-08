document.addEventListener('DOMContentLoaded', function() {
    // Function to animate counting up to a target number
    function animateCount(element, target) {
        const duration = 2000; // 2 seconds
        const startTime = performance.now();
        const startValue = 0;
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(startValue + (target - startValue) * easeOutQuart);
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
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
