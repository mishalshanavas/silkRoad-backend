document.addEventListener('DOMContentLoaded', checkAuthStatus);
const elements = {
    loginBtn: document.getElementById('loginBtn'),
    userProfilePic: document.getElementById('userProfilePic')
};

let navCurrentUser = null;
async function checkAuthStatus() {
    try {
        const response = await fetch('/auth-status');
        if (response.ok) {
            const userData = await response.json();
            navCurrentUser = userData.isAuthenticated ? {
                name: userData.name,
                profile_pic: userData.picture,
                email: userData.email
            } : null;
        } else {
            console.error('Error fetching auth status:', response.status);
            navCurrentUser = null;
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        navCurrentUser = null;
    }
    updateAuthUI(navCurrentUser);
}

function updateAuthUI(user) {
    elements.loginBtn.style.display = 'none';
    elements.userProfilePic.style.display = 'none';
    
    if (user) {
        if (user.profile_pic) {
            // Show profile picture as the button
            elements.userProfilePic.src = user.profile_pic;
            elements.userProfilePic.className = 'user-dp';
            elements.userProfilePic.style.display = 'inline-block';
            elements.userProfilePic.onclick = () => window.location.href = '/sign-out';
            elements.userProfilePic.title = 'Sign out'; // Add tooltip
        } else {
            // No profile pic, use text button
            elements.loginBtn.textContent = user.name || 'Profile';
            elements.loginBtn.href = '/sign-out';
            elements.loginBtn.className = 'login-btn';
            elements.loginBtn.style.display = 'inline-block';
        }
    } else {
        // User not logged in
        elements.loginBtn.textContent = 'Login with Google';
        elements.loginBtn.href = `/sign_in?next=${encodeURIComponent(window.location.pathname)}`;
        elements.loginBtn.className = 'login-btn';
        elements.loginBtn.style.display = 'inline-block';
    }
}