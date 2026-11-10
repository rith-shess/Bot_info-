document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');
  const toggleBtn = document.getElementById('togglePasswordBtn');
  const passwordInput = document.getElementById('password');

  // Toggle password visibility
  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    toggleBtn.innerHTML = isPassword ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
  });

  function showAlert(msg, isError = true) {
    alertBox.textContent = msg;
    alertBox.className = `alert-box ${isError ? 'alert-error' : 'alert-success'}`;
    alertBox.style.display = 'block';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.style.display = 'none';

    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) {
      showAlert('Please enter both username and password.');
      return;
    }

    submitBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showAlert('Login successful! Redirecting...', false);
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else {
        showAlert(data.message || 'Invalid username or password.');
      }
    } catch (err) {
      showAlert('Network error or server unreachable. Please try again.');
    } finally {
      submitBtn.disabled = false;
      btnText.style.display = 'inline-block';
      spinner.style.display = 'none';
    }
  });
});
