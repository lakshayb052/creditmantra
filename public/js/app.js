// -------------------------------------------------------------
// UTM CAMPAIGN PARAMETERS PARSING
// -------------------------------------------------------------
const urlParams = new URLSearchParams(window.location.search);
const utmSource = urlParams.get('utm_source') || '';
const utmInfo = urlParams.get('utm_info') || '';

// -------------------------------------------------------------
// FALLING MONEY PARTICLE SYSTEM (Canvas)
// -------------------------------------------------------------
const canvas = document.getElementById('money-canvas');
const ctx = canvas.getContext('2d');

let animationFrameId;
let particles = [];
const maxParticles = 65;

// Resize canvas to fill window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Currency note class
class MoneyNote {
  constructor(isInitial = false) {
    this.reset(isInitial);
  }

  reset(isInitial = false) {
    this.width = Math.random() * 12 + 18;  // Width 18 to 30
    this.height = this.width * 1.8;       // Aspect ratio of currency bills
    this.x = Math.random() * canvas.width;
    this.y = isInitial ? Math.random() * canvas.height - this.height : -this.height - 20;
    this.speedY = Math.random() * 1.5 + 1.5; // Descent speed
    this.angle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.03;
    this.sway = Math.random() * 1.5 + 0.5; // Side-to-side sway amount
    this.swaySpeed = Math.random() * 0.02 + 0.01;
    this.swayTime = Math.random() * 100;
    
    // Curated money green/gold tones
    const greenTones = ['#a7f3d0', '#86efac', '#4ade80', '#34d399', '#fef08a'];
    this.color = greenTones[Math.floor(Math.random() * greenTones.length)];
    this.border = Math.random() > 0.5 ? '#059669' : '#047857';
    this.symbol = Math.random() > 0.4 ? '₹' : '$';
  }

  update() {
    this.y += this.speedY;
    this.angle += this.rotationSpeed;
    this.swayTime += this.swaySpeed;
    this.x += Math.sin(this.swayTime) * this.sway;

    // Reset if it goes off screen bottom or sides
    if (this.y > canvas.height + this.height || this.x < -this.width || this.x > canvas.width + this.width) {
      this.reset(false);
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Draw bill body
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.border;
    ctx.lineWidth = 1.5;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Draw inner design lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.strokeRect(-this.width / 4, -this.height / 4, this.width / 2, this.height / 2);

    // Draw currency symbol in the center
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.font = `bold ${this.width * 0.45}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.symbol, 0, 0);

    ctx.restore();
  }
}

// Populate initial notes
for (let i = 0; i < maxParticles; i++) {
  particles.push(new MoneyNote(true));
}

// Loop animation
function animateMoney() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  animationFrameId = requestAnimationFrame(animateMoney);
}

// Start simulation
animateMoney();

// -------------------------------------------------------------
// SPLASH SCREEN TRANSITION & RESUME APPLICATION CHECK
// -------------------------------------------------------------
const splash = document.getElementById('splash-screen');
const mainContent = document.getElementById('main-content');
const successOverlay = document.getElementById('success-modal-overlay');
const generatedUrmText = document.getElementById('generated-urm');
const redirectLoadingContainer = document.getElementById('redirect-loading-container');
const resumeActionsContainer = document.getElementById('resume-actions-container');
const btnResumeRedirect = document.getElementById('btn-resume-redirect');
const btnStartNew = document.getElementById('btn-start-new');

window.addEventListener('DOMContentLoaded', () => {
  // Check if client has a pending submission in sessionStorage
  const lastLeadId = sessionStorage.getItem('last_lead_id');
  const lastRedirectUrl = sessionStorage.getItem('last_redirect_url');

  if (lastLeadId && lastRedirectUrl) {
    // Client has returned (e.g., hit "Back" button) - skip splash screen
    splash.style.display = 'none';
    cancelAnimationFrame(animationFrameId); // Stop canvas loops
    
    // Reveal form layout and open success modal immediately
    mainContent.classList.add('visible');
    successOverlay.classList.add('active');
    
    // Customize modal text
    document.getElementById('success-modal-title').innerText = 'Application Pending';
    document.getElementById('success-modal-desc').innerText = 'It looks like you have an ongoing application. You can resume it below.';
    generatedUrmText.innerText = lastLeadId;

    // Show Resume action buttons instead of the countdown spinner
    redirectLoadingContainer.style.display = 'none';
    resumeActionsContainer.style.display = 'block';
    btnResumeRedirect.href = lastRedirectUrl;
  } else {
    // Standard visitor flow - Keep splash active for 0.7 seconds (700ms)
    setTimeout(() => {
      splash.style.opacity = '0';
      
      // Reveal form
      setTimeout(() => {
        splash.style.display = 'none';
        cancelAnimationFrame(animationFrameId); // Stop canvas loops
        mainContent.classList.add('visible');
      }, 800); // Wait for opacity transition to finish
    }, 700);
  }
});

// "Start New Application" click handler
btnStartNew.addEventListener('click', (e) => {
  e.preventDefault();
  
  // Clear stored session state
  sessionStorage.removeItem('last_lead_id');
  sessionStorage.removeItem('last_redirect_url');
  
  // Hide success overlay modal and reset form fields
  successOverlay.classList.remove('active');
  document.getElementById('lead-form').reset();
  
  // Restore default success modal states
  document.getElementById('success-modal-title').innerText = 'Application Submitted!';
  document.getElementById('success-modal-desc').innerText = 'Thank you for applying. We have successfully registered your interest.';
  redirectLoadingContainer.style.display = 'flex';
  resumeActionsContainer.style.display = 'none';
});

// -------------------------------------------------------------
// FORM CAPTURE & REDIRECT LOGIC
// -------------------------------------------------------------
const form = document.getElementById('lead-form');
const btnSubmit = document.getElementById('btn-submit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nameInput = document.getElementById('client-name');
  const phoneInput = document.getElementById('client-phone');
  const emailInput = document.getElementById('client-email');

  // Basic Validation Check
  let isValid = true;

  // Validate Name
  if (nameInput.value.trim().length < 2) {
    nameInput.setCustomValidity('Please enter your full name.');
    nameInput.reportValidity();
    isValid = false;
    return;
  } else {
    nameInput.setCustomValidity('');
  }

  // Validate Phone (Exactly 10 digits)
  const phonePattern = /^[0-9]{10}$/;
  if (!phonePattern.test(phoneInput.value.trim())) {
    phoneInput.setCustomValidity('Please enter a valid 10-digit mobile number.');
    phoneInput.reportValidity();
    isValid = false;
    return;
  } else {
    phoneInput.setCustomValidity('');
  }

  // Validate Email
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(emailInput.value.trim())) {
    emailInput.setCustomValidity('Please enter a valid email address.');
    emailInput.reportValidity();
    isValid = false;
    return;
  } else {
    emailInput.setCustomValidity('');
  }

  if (!isValid) return;

  // Disable button & change text to show feedback
  btnSubmit.disabled = true;
  const originalBtnText = btnSubmit.querySelector('span').innerText;
  btnSubmit.querySelector('span').innerText = 'Generating Lead URM...';

  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        utm_source: utmSource,
        utm_info: utmInfo
      })
    });

    const data = await response.json();

    if (data.success) {
      // Store generated lead and redirect info in sessionStorage for back-button fallback
      sessionStorage.setItem('last_lead_id', data.lead_id);
      sessionStorage.setItem('last_redirect_url', data.redirect_url);

      // Render URM ID in modal (just in case they see it briefly or return)
      generatedUrmText.innerText = data.lead_id;
      successOverlay.classList.add('active');

      // Redirect immediately (no countdown)
      window.location.href = data.redirect_url;
    } else {
      alert('Error: ' + (data.message || 'Something went wrong. Please try again.'));
      btnSubmit.disabled = false;
      btnSubmit.querySelector('span').innerText = originalBtnText;
    }
  } catch (err) {
    console.error('Submission error:', err);
    alert('Server communication failed. Please check your network connection.');
    btnSubmit.disabled = false;
    btnSubmit.querySelector('span').innerText = originalBtnText;
  }
});
