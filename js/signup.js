// ===== DOM =====
const signupForm = document.getElementById("signup-form");
const usernameInput = document.getElementById("username"); // 화면상의 '이름' 입력칸
const useridInput = document.getElementById("userid"); // 화면상의 '아이디' 입력칸
const phoneInput = document.getElementById("phone");
const passwordInput = document.getElementById("password");
const modal = document.getElementById("modal");
const modalMessage = document.getElementById("modal-message");
const closeModalButton = document.getElementById("close-modal");

// ===== 설정 =====
const API_BASE = "http://localhost:8080";
const SIGNUP_PATH = "/join"; // 백엔드 회원가입 엔드포인트

// ===== 모달 유틸 =====
function showModal(message) {
  modalMessage.textContent = message;
  modal.style.display = "flex";
}
function hideModal() {
  modal.style.display = "none";
}
closeModalButton.addEventListener("click", hideModal);

// ===== 쿠키/CSRF 유틸 =====
function getCookie(name) {
  const m = document.cookie.match(
    new RegExp(
      "(^|; )" + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"
    )
  );
  return m ? decodeURIComponent(m[2]) : null;
}

// 서버 메시지 파싱
async function extractServerMessage(resp) {
  const ct = resp.headers.get("Content-Type") || "";
  try {
    if (ct.includes("application/json")) {
      const j = await resp.json();
      if (j && typeof j.message === "string" && j.message.trim())
        return j.message.trim();
      return JSON.stringify(j);
    } else {
      const t = await resp.text();
      if (t && t.trim()) return t.trim();
    }
  } catch (_) {}
  return "";
}

// ===== 회원가입 제출 =====
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // 화면 필드 → 서버 필드 매핑
  const name = usernameInput.value.trim();
  const username = useridInput.value.trim();
  const phone = phoneInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username) return showModal("아이디를 입력해 주세요.");
  if (!password) return showModal("비밀번호를 입력해 주세요.");

  // form-data 전송
  const fd = new FormData();
  fd.append("username", username);
  fd.append("password", password);
  fd.append("name", name);
  fd.append("phone", phone);

  // 중복 제출 방지
  const submitBtn = signupForm.querySelector('button[type="submit"]');
  const prevText = submitBtn ? submitBtn.textContent : null;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "처리 중…";
  }

  try {
    // 🔐 CSRF 토큰을 쿠키에서 읽어 헤더로 전달
    const xsrf = getCookie("XSRF-TOKEN"); // 보통 Spring CookieCsrfTokenRepository 기본 쿠키명
    const headers = {};
    if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;

    const resp = await fetch(`${API_BASE}${SIGNUP_PATH}`, {
      method: "POST",
      body: fd, // 브라우저가 multipart/form-data + boundary 설정
      credentials: "include", // ← 중요한 포인트: 쿠키 포함
      headers, // ← CSRF 헤더 전달
    });

    // 409: 아이디 중복 (백엔드가 올바르게 내려줄 경우)
    if (resp.status === 409) {
      let msg = await extractServerMessage(resp);
      if (!msg || /Username already exists/i.test(msg)) {
        msg = "이미 사용 중인 아이디입니다. 다른 아이디를 사용해 주세요.";
      }
      showModal(msg);
      return;
    }

    // 그 외 에러 (400/401/403/500 등)
    if (!resp.ok) {
      let msg = await extractServerMessage(resp);

      // 서버 본문에 흔한 문구가 있으면 사용자 친화 메시지로 변환
      if (/Username already exists/i.test(msg) || /이미.*아이디/i.test(msg)) {
        showModal("이미 사용 중인 아이디입니다. 다른 아이디를 사용해 주세요.");
        return;
      }

      if (resp.status === 403 || resp.status === 401) {
        // CSRF/권한 문제일 가능성 큼
        showModal(
          "요청이 차단되었습니다. 새로고침 후 다시 시도하거나, 브라우저 쿠키를 확인해 주세요."
        );
        return;
      }
      if (resp.status === 400) {
        showModal(
          msg || "요청 형식이 올바르지 않습니다. 입력값을 확인해 주세요."
        );
        return;
      }
      if (resp.status === 500) {
        showModal(
          msg || "서버 오류가 발생했습니다. 잠시 뒤 다시 시도해 주세요."
        );
        return;
      }

      showModal(msg || `회원가입에 실패했습니다. (HTTP ${resp.status})`);
      return;
    }

    // 성공 처리
    showModal("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
    closeModalButton.removeEventListener("click", hideModal);
    closeModalButton.addEventListener("click", () => {
      hideModal();
      window.location.href = "/Summer_Project/html/login.html";
    });
  } catch (err) {
    console.error("회원가입 요청 실패:", err);
    showModal(
      "네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해 주세요."
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = prevText;
    }
  }
});
