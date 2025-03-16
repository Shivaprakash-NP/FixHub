document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault(); 

    const email = e.target.elements.email.value;
    const password = e.target.elements.password.value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            // Login successful; redirect to index.html
            window.location.href = '/index.html';
        } else {
            // Login failed; alert the error message
            alert(data.error);
        }
    } catch (err) {
        console.error('Login request failed:', err);
        alert('Login failed. Please try again.');
    }
});


