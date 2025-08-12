// Image frame toggle functionality
document.addEventListener('DOMContentLoaded', function () {
  const clickableFrames = document.querySelectorAll('.image-frame.clickable');

  clickableFrames.forEach(function (frame) {
    const toggleImage = function () {
      frame.classList.toggle('show-alternate');
    };

    // Click handler
    frame.addEventListener('click', toggleImage);

    // Keyboard handler for accessibility
    frame.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleImage();
      }
    });
  });
});
