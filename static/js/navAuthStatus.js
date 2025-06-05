document.addEventListener('DOMContentLoaded', checkAuthStatus);

// Define DOM elements
const elements = {
    loginBtn: document.getElementById('loginBtn'),
    userProfilePic: document.getElementById('userProfilePic')
};

async function checkAuthStatus() {
    try {
        const response = await fetch('/auth-status');
        if (response.ok) {
            const userData = await response.json();
            currentUser = userData.isAuthenticated ? {
                name: userData.name,
                profile_pic: userData.picture,
                email: userData.email
            } : null;
        } else {
            console.error('Error fetching auth status:', response.status);
            currentUser = null;
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        currentUser = null;
    }
    updateAuthUI(currentUser);
}

function updateAuthUI(user) {
    if (user) {
        elements.loginBtn.textContent = user.name || 'Profile';
        elements.loginBtn.href = '/sign-out';
        if (user.profile_pic) {
            elements.userProfilePic.src = user.profile_pic;
            elements.userProfilePic.style.display = 'inline-block';
        }
    } else {
        elements.loginBtn.textContent = 'Login with Google';
        elements.loginBtn.href = `/sign_in?next=${window.location.pathname}`;
        elements.userProfilePic.style.display = 'none';
    }
}
