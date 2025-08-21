// ====== DOM ======
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username"); // 로그인 아이디 입력칸
const passwordInput = document.getElementById("password");
const modal = document.getElementById("modal");
const modalMessage = document.getElementById("modal-message");
const closeModalButton = document.getElementById("close-modal");

// ====== 설정 ======
const API_LOGIN_URL = "http://localhost:8080/api/auth/login"; // 서버 로그인 엔드포인트
const REDIRECT_URL = "/Summer_Project/html/index.html"; // 로그인 후 이동할 페이지

// ====== 모달 유틸 ======
function showModal(message) {
  modalMessage.textContent = message;
  modal.style.display = "flex";
}
function hideModal() {
  modal.style.display = "none";
}
closeModalButton.addEventListener("click", hideModal);

// ====== JWT 유틸 ======
function usernameFromBearer(bearer) {
  if (!bearer || !bearer.startsWith("Bearer ")) return null;
  const raw = bearer.slice(7);
  const parts = raw.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1];
  try {
    const json = atob(
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(payload.length / 4) * 4, "=")
    );
    const obj = JSON.parse(json);
    return obj?.username || null;
  } catch {
    return null;
  }
}

// ====== 헬퍼: 토큰 저장 ======
function saveTokenAndUser(authorizationHeader, json, fallbackUsername) {
  // 1) Authorization 헤더 우선
  if (authorizationHeader && authorizationHeader.startsWith("Bearer ")) {
    localStorage.setItem("authToken", authorizationHeader); // 전체 "Bearer XXX" 저장
    const nameFromJwt = usernameFromBearer(authorizationHeader);
    const finalName = nameFromJwt || json?.username || fallbackUsername || "";
    localStorage.setItem("loggedInUser", finalName);
    return true;
  }

  // 2) JSON 바디 내 token 지원
  if (json?.token) {
    const bearer = json.token.startsWith("Bearer ")
      ? json.token
      : `Bearer ${json.token}`;
    localStorage.setItem("authToken", bearer);
    const nameFromJwt = usernameFromBearer(bearer);
    const finalName = nameFromJwt || json.username || fallbackUsername || "";
    localStorage.setItem("loggedInUser", finalName);
    return true;
  }

  return false;
}

// ====== 제출 핸들러 ======
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const inputUserid = usernameInput.value.trim();
  const inputPassword = passwordInput.value.trim();

  if (!inputUserid || !inputPassword) {
    showModal("아이디와 비밀번호를 입력해주세요.");
    return;
  }

  try {
    // 스프링 시큐리티 UsernamePasswordAuthenticationFilter 기본 규약:
    // "application/x-www-form-urlencoded" 로 username, password 전송
    const body = new URLSearchParams({
      username: inputUserid, // ⚠️ 서버 파라미터명은 username
      password: inputPassword,
    });

    const resp = await fetch(API_LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    // 401/403 등 실패 처리
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`로그인 실패 (${resp.status}) ${text}`);
    }

    // 헤더에서 토큰 시도
    const authHeader = resp.headers.get("Authorization");

    // 바디 파싱 (없을 수도 있으니 안전 처리)
    let data = null;
    try {
      // 서버가 바디를 안 내려줄 수도 있음 → try/catch
      data = await resp.json();
    } catch {
      // 빈 바디면 무시
    }

    // 토큰 저장 로직 (헤더 우선, 없으면 바디 token)
    const stored = saveTokenAndUser(authHeader, data, inputUserid);
    if (!stored) {
      throw new Error("서버 응답에 JWT 토큰이 없습니다.");
    }

    // 성공 UX
    showModal("로그인 성공!");

    // 1) 1.5초 후 자동 이동
    const timer = setTimeout(() => {
      window.location.href = REDIRECT_URL;
    }, 1500);

    // 2) 확인 버튼 누르면 즉시 이동
    closeModalButton.removeEventListener("click", hideModal);
    closeModalButton.addEventListener("click", () => {
      clearTimeout(timer);
      hideModal();
      window.location.href = REDIRECT_URL;
    });
  } catch (err) {
    console.error(err);
    showModal(
      "아이디 또는 비밀번호가 올바르지 않거나, 서버 오류가 발생했습니다."
    );
  }
});
