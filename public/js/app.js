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
// SPLASH SCREEN TRANSITION
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash-screen');
  const mainContent = document.getElementById('main-content');
  
  // Keep splash active for 4 seconds
  setTimeout(() => {
    splash.style.opacity = '0';
    
    // Reveal form
    setTimeout(() => {
      splash.style.display = 'none';
      cancelAnimationFrame(animationFrameId); // Stop canvas calculation loops
      mainContent.classList.add('visible');
    }, 800); // Wait for opacity transition to finish
  }, 4000);
});

// -------------------------------------------------------------
// FORM CAPTURE & REDIRECT LOGIC
// -------------------------------------------------------------
const form = document.getElementById('lead-form');
const btnSubmit = document.getElementById('btn-submit');
const successOverlay = document.getElementById('success-modal-overlay');
const generatedUrmText = document.getElementById('generated-urm');

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
        email: emailInput.value.trim()
      })
    });

    const data = await response.json();

    if (data.success) {
      // Show Success Modal
      generatedUrmText.innerText = data.lead_id;
      successOverlay.classList.add('active');

      // 3 second countdown before redirecting to active bank portal
      setTimeout(() => {
        window.location.href = data.redirect_url;
      }, 3000);

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
