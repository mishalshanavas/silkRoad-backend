document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('certificateForm');
    const previewName = document.getElementById('previewName');
    const previewDate = document.getElementById('previewDate');
    const previewType = document.getElementById('previewType');

    document.getElementById('fullName').addEventListener('input', (e) => {
        previewName.textContent = e.target.value || 'Your Name';
    });

    document.getElementById('completionDate').addEventListener('input', (e) => {
        const date = new Date(e.target.value);
        previewDate.textContent = date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    });

    document.getElementById('certificatefor').addEventListener('change', (e) => {
        previewType.textContent = e.target.options[e.target.selectedIndex].text;
    });

    const useDefaultDateCheckbox = document.getElementById('useDefaultDate');
    const completionDateInput = document.getElementById('completionDate');

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fullName = document.getElementById('fullName').value;
        const completionDate = document.getElementById('completionDate').value; 
        const certificateType = document.getElementById('certificatefor').value;   
        const url = `/api/certificate/${certificateType}/?name=${fullName}${useDefaultDateCheckbox.checked ? '' : '&date_str=' + completionDate}`;
        fetch(url)
            .then(response => {
                if (response.ok) {
                    return response.blob();
                } else {
                    throw new Error('Network response was not ok');
                }
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${fullName}_certificate.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    });
    
    useDefaultDateCheckbox.addEventListener('change', function() {
        if (this.checked) {
            
            completionDateInput.disabled = true;
            completionDateInput.required = false;
        } else {
            // Enable the input and clear the value
            completionDateInput.disabled = false;
            completionDateInput.required = true;
            completionDateInput.value = '';
        }
    });
});