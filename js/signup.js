document.getElementById("signup-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const userid = document.getElementById("userid").value;
  const phone = document.getElementById("phone").value;
  const password = document.getElementById("password").value;

  // 로컬스토리지에 유저 저장
  const userData = { username, userid, phone, password };
  localStorage.setItem("user", JSON.stringify(userData));
  alert("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
  window.location.href = "login.html";
});
