function typewriterEffect(element, texts, typeSpeed = 100, deleteSpeed = 50, pauseTime = 2000) {
  let textIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  cursor.textContent = '|';
  element.appendChild(cursor);

  function type() {
    const currentText = texts[textIndex];
    if (isDeleting) {
      element.textContent = currentText.substring(0, charIndex - 1);
      element.appendChild(cursor)
      charIndex--;
      if (charIndex < 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        setTimeout(type, 500); // Pause before typing next
        return;
      }
    } else {
      element.textContent = currentText.substring(0, charIndex + 1);
      element.appendChild(cursor)
      charIndex++;
      if (charIndex === currentText.length) {
        isDeleting = true;
        setTimeout(type, pauseTime); // Pause before deleting
        return;
      }
    }
    element.appendChild(cursor);
    const speed = isDeleting ? deleteSpeed : typeSpeed;
    setTimeout(type, speed);
  }
  type();
}

// Blinking cursor
setInterval(() => {
  const cursor = document.querySelector('.cursor');
  if (cursor) {
    cursor.style.visibility = cursor.style.visibility === 'hidden' ? 'visible' : 'hidden';
  }
}, 500);

// Usage
document.addEventListener('DOMContentLoaded', function() {
  const greeting = document.getElementById('greeting');
  if (greeting) {
    const texts = [
      'Hello, I am Lucia',
      'Data Engineer based in SWFL',
      'Passionate about data',
      'Building ML systems and tools'
    ];
    typewriterEffect(greeting, texts);
  }
});