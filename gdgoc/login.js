// 로그인 모달 처리
const loginForm = document.getElementById('loginForm');
const loginModal = document.getElementById('modal');
const modalMessage = document.getElementById('modal-message');
const closeModal = document.getElementById('close-modal');

if (loginForm) {
  loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === '1234' && password === '1234') {
      showModal('로그인되었습니다!');
    } else {
      showModal('아이디 또는 비밀번호가 잘못되었습니다.');
    }
  });

  closeModal.addEventListener('click', function() {
    loginModal.classList.remove('show');
  });

  function showModal(message) {
    modalMessage.textContent = message;
    loginModal.classList.add('show');
  }
}
