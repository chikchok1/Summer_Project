// 공통 유틸: 특정 요소가 존재할 때만 작동하도록 보호하는 함수
function safeGet(id) {
  return document.getElementById(id);
}

// ========== [ 로그인 페이지 전용 모달 기능 ] ==========
const loginForm = safeGet('loginForm');
const loginModal = safeGet('modal');
const loginModalMessage = safeGet('modal-message');
const closeLoginModal = safeGet('close-modal');

if (loginForm && loginModal && loginModalMessage && closeLoginModal) {
  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const username = safeGet('username').value;
    const password = safeGet('password').value;

    if (username === '1234' && password === '1234') {
      showLoginModal('로그인되었습니다!');
    } else {
      showLoginModal('아이디 또는 비밀번호가 잘못되었습니다.');
    }
  });

  closeLoginModal.addEventListener('click', function () {
    loginModal.style.display = 'none';
  });

  function showLoginModal(message) {
    loginModalMessage.textContent = message;
    loginModal.style.display = 'block';
  }
}

// ========== [ 프로필 페이지 전용 기능 ] ==========
const editBtn = safeGet("editProfileBtn");
const editModal = safeGet("editModal");
const saveBtn = safeGet("saveBtn");
const closeEditBtn = safeGet("closeEditModal");

if (editBtn && editModal && saveBtn && closeEditBtn) {
  editBtn.onclick = () => {
    safeGet("nameInput").value = safeGet("displayName").textContent;
    safeGet("bioInput").value = safeGet("bio").textContent;
    editModal.classList.add("show");
  };

  closeEditBtn.onclick = () => {
    editModal.classList.remove("show");
  };

  saveBtn.onclick = () => {
    safeGet("displayName").textContent = safeGet("nameInput").value;
    safeGet("bio").textContent = safeGet("bioInput").value;
    editModal.classList.remove("show");
  };
}

// 프로필 이미지 변경 기능
const imageInput = safeGet("imageInput");
const profileImage = safeGet("profileImage");

if (imageInput && profileImage) {
  imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        profileImage.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
}

// 썸네일 클릭 시 확대 모달
const galleryItems = document.querySelectorAll(".gallery-item");
const imageModal = safeGet("imageModal");
const modalImage = safeGet("modalImage");
const closeImageModal = safeGet("closeImageModal");

if (galleryItems.length && imageModal && modalImage && closeImageModal) {
  galleryItems.forEach(item => {
    item.addEventListener("click", () => {
      modalImage.src = item.src;
      imageModal.style.display = "flex";
    });
  });

  closeImageModal.onclick = () => {
    imageModal.style.display = "none";
  };
}