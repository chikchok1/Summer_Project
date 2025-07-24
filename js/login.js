document.querySelector("form").addEventListener("submit", function (e) {
  e.preventDefault();

  const inputId = document.querySelector("input[type='text']").value;
  const inputPw = document.querySelector("input[type='password']").value;

  const storedUser = JSON.parse(localStorage.getItem("user"));

  if (
    storedUser &&
    inputId === storedUser.userid &&
    inputPw === storedUser.password
  ) {
    // 세션 저장
    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("currentUser", storedUser.username);
    alert("로그인 성공! 메인 페이지로 이동합니다.");
    window.location.href = "index.html";
  } else {
    alert("아이디 또는 비밀번호가 틀렸습니다.");
  }
});
