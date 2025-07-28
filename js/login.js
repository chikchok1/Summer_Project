// 필요한 DOM 요소 가져오기
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username"); // 이전에 userid였을 수 있으나, login.html form에 따라 변경
const passwordInput = document.getElementById("password");
const modal = document.getElementById("modal");
const modalMessage = document.getElementById("modal-message");
const closeModalButton = document.getElementById("close-modal");

// 모달 표시 함수
function showModal(message) {
  modalMessage.textContent = message;
  modal.style.display = "flex"; // flex로 설정하여 중앙 정렬
}

// 모달 숨기기 함수
function hideModal() {
  modal.style.display = "none";
}

// 모달 닫기 버튼 이벤트 리스너
closeModalButton.addEventListener("click", hideModal);

// 로그인 폼 제출 이벤트 리스너
loginForm.addEventListener("submit", (e) => {
  e.preventDefault(); // 폼 기본 제출 동작 방지

  const inputUserid = usernameInput.value.trim(); // login.html에서 아이디 입력 필드가 username id를 가짐
  const inputPassword = passwordInput.value.trim();

  // 로컬 스토리지에서 등록된 모든 사용자 데이터 가져오기
  const users = JSON.parse(localStorage.getItem("users")) || [];

  // 입력된 아이디와 비밀번호로 사용자 찾기
  const foundUser = users.find(
    (user) => user.userid === inputUserid && user.password === inputPassword
  );

  if (foundUser) {
    // 로그인 성공: 사용자 아이디를 loggedInUser로 localStorage에 저장
    localStorage.setItem("loggedInUser", foundUser.userid); // userid를 저장하여 고유하게 식별
    showModal("로그인 성공!");
    // 모달이 닫힌 후 메인 페이지(test.html)로 이동하도록 이벤트 리스너 추가
    closeModalButton.removeEventListener("click", hideModal); // 기존 리스너 제거
    closeModalButton.addEventListener("click", () => {
      hideModal();
      window.location.href = "/Summer_Project/html/test.html";
    });
  } else {
    // 로그인 실패: 모달로 메시지 표시
    showModal("아이디 또는 비밀번호가 올바르지 않습니다.");
  }
});
