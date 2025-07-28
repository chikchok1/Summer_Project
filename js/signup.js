// 필요한 DOM 요소 가져오기
const signupForm = document.getElementById("signup-form");
const usernameInput = document.getElementById("username");
const useridInput = document.getElementById("userid");
const phoneInput = document.getElementById("phone");
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

// 회원가입 폼 제출 이벤트 리스너
signupForm.addEventListener("submit", function (e) {
  e.preventDefault(); // 폼 기본 제출 동작 방지

  const username = usernameInput.value.trim();
  const userid = useridInput.value.trim();
  const phone = phoneInput.value.trim();
  const password = passwordInput.value.trim();

  // 기존 사용자 데이터 가져오기 (없으면 빈 배열 초기화)
  const users = JSON.parse(localStorage.getItem("users")) || [];

  // 아이디 중복 확인
  const isDuplicate = users.some((user) => user.userid === userid);

  if (isDuplicate) {
    showModal("이미 존재하는 아이디입니다. 다른 아이디를 사용해주세요.");
    return;
  }

  // 새 사용자 데이터 추가
  const newUser = { username, userid, phone, password };
  users.push(newUser);

  // 업데이트된 사용자 데이터를 로컬 스토리지에 저장
  localStorage.setItem("users", JSON.stringify(users));

  showModal("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");

  // 모달이 닫힌 후 페이지 이동하도록 이벤트 리스너 추가
  closeModalButton.removeEventListener("click", hideModal); // 기존 리스너 제거
  closeModalButton.addEventListener("click", () => {
    hideModal();
    window.location.href = "/Summer_Project/html/login.html"; // 로그인 페이지로 이동
  });
});
