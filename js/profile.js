// =====================[ 설정 / 상수 ]=====================
const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "authToken"; // "Bearer xxx"
const LOGIN_URL = "/Summer_Project/html/login.html";

// =====================[ JWT/인증 유틸 ]=====================
function getToken() {
  return localStorage.getItem(TOKEN_KEY); // "Bearer xxx"
}
function parseJwtPayload() {
  const bearer = getToken();
  if (!bearer) return null;

  const raw = bearer.replace(/^Bearer\s+/i, "");
  const parts = raw.split(".");
  if (parts.length < 2) return null;

  const base64url = parts[1];
  const base64 = base64url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(base64url.length / 4) * 4, "=");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const text = new TextDecoder("utf-8").decode(bytes);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function isTokenExpired(payload) {
  return payload?.exp ? payload.exp * 1000 < Date.now() : false;
}
function dropToLogin(msg) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("loggedInUser");
  if (msg) alert(msg);
  window.location.href = LOGIN_URL;
}

// ✅ 공용 fetch
async function authFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    dropToLogin();
    throw new Error("No token");
  }
  const headers = { ...(options.headers || {}), Authorization: token };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    dropToLogin("세션이 만료되었습니다. 다시 로그인하세요.");
    throw new Error("HTTP 401");
  }
  return res;
}
// ✅ JSON 헬퍼
async function authJson(url, method, bodyObj) {
  return authFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
  });
}

// =====================[ DOM ]=====================
const profileImage = document.getElementById("profileImage");
const profileImageWrapper = document.querySelector(".profile-image-wrapper");
const imageInput = document.getElementById("imageInput");
const displayNameElement = document.getElementById("displayName");
const bioElement = document.getElementById("bio");
const phoneNumberElement = document.getElementById("phoneNumber");
const editProfileBtn = document.getElementById("editProfileBtn");
const userPostsGrid = document.getElementById("userPostsGrid");

// 모달
const editModal = document.getElementById("editModal");
const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
const bioInput = document.getElementById("bioInput");
const saveBtn = document.getElementById("saveBtn");
const closeEditModal = document.getElementById("closeEditModal");

const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const closeImageModal = document.getElementById("closeImageModal");

const commentModal = document.getElementById("commentModal");
const modalPostTitle = document.getElementById("modalPostTitle");
const modalPostImage = document.getElementById("modalPostImage");
const modalPostText = document.getElementById("modalPostText");
const modalPostTags = document.getElementById("modalPostTags");
const modalPostAuthor = document.getElementById("modalPostAuthor");
const modalPostTime = document.getElementById("modalPostTime");
const modalCommentList = document.getElementById("modalCommentList");
const modalCommentInput = document.getElementById("modalCommentInput");
const modalCommentSubmitButton = document.getElementById(
  "modalCommentSubmitButton"
);
const closeCommentModalButton = document.getElementById(
  "closeCommentModalButton"
);

// 확인/알림 모달
const confirmationModal = document.getElementById("confirmationModal");
const confirmationMessage = document.getElementById("confirmationMessage");
const confirmYesBtn = document.getElementById("confirmYesBtn");
const confirmNoBtn = document.getElementById("confirmNoBtn");

const alertDialog = document.getElementById("alertDialog");
const alertMessage = document.getElementById("alertMessage");
const closeAlertModal = document.getElementById("closeAlertModal");

// 툴바 버튼
const profileLoginButton = document.getElementById("profileLoginButton");
const profileSignupButton = document.getElementById("profileSignupButton");
const profileLogoutButton = document.getElementById("profileLogoutButton");

// =====================[ 상태 ]=====================
let myPosts = [];
let currentViewingPost = null; // 모달에서 보고 있는 게시글
const deletingIds = new Set(); // 중복 삭제 방지

// =====================[ 공용 UI 유틸 ]=====================
function showCustomAlert(message) {
  if (!alertDialog) return alert(message);
  alertMessage.textContent = message;
  alertDialog.style.display = "flex";
}
function showCustomConfirm(message) {
  return new Promise((resolve) => {
    if (!confirmationModal) {
      resolve(confirm(message));
      return;
    }
    confirmationMessage.textContent = message;
    confirmationModal.style.display = "flex";
    confirmYesBtn.onclick = () => {
      confirmationModal.style.display = "none";
      resolve(true);
    };
    confirmNoBtn.onclick = () => {
      confirmationModal.style.display = "none";
      resolve(false);
    };
  });
}
function getRandomProfileUrl() {
  return `https://source.unsplash.com/random/150x150?profile&sig=${Math.random()}`;
}
function dateOnly(v) {
  if (!v) return "";
  const s = String(v);
  if (s.includes("T")) return s.split("T")[0];
  if (s.includes(" ")) return s.split(" ")[0];
  return s;
}
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// =====================[ 프로필 API ]=====================
async function fetchMyProfile() {
  try {
    const res = await authFetch(`${API_BASE}/api/users/me`);
    if (!res.ok) throw new Error(`GET /api/users/me => ${res.status}`);
    return await res.json(); // { id, username, name, phone }
  } catch (e) {
    return null; // 서버에 엔드포인트 없을 수 있음
  }
}
async function updateMyProfile({ name, phone }) {
  const res = await authJson(`${API_BASE}/api/users/me`, "PUT", {
    name,
    phone,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`PUT /api/users/me => ${res.status} ${msg}`);
  }
  return res.json();
}

// =====================[ 로그인 사용자 식별 ]=====================
function usernameFromJwt(payload) {
  return (
    payload?.username || payload?.sub || payload?.user || payload?.uid || null
  );
}
function nameFromJwt(payload) {
  return payload?.name || payload?.nickname || payload?.display_name || null;
}

// =====================[ 게시글 매핑/조회 ]=====================
function mapPostToUI(post) {
  const authorUsername =
    post.author?.username ??
    post.authorUsername ??
    post.authorId ??
    post.username ??
    null;
  const authorName = post.author?.name ?? post.authorName ?? post.name ?? null;
  return {
    id: post.id,
    text: post.content ?? post.text ?? "",
    imageUrl: post.imageUrl ?? null,
    tags: post.tags ?? [],
    authorUsername,
    authorName,
    authorLabel: authorName || authorUsername || "익명",
    time: dateOnly(post.createdAt ?? post.createDate ?? post.time ?? ""),
    likeCount: post.likeCount ?? 0,
    likedByMe: post.likedByMe ?? false,
    commentsCount: post.commentsCount ?? 0,
  };
}
async function fetchAllPosts() {
  const res = await authFetch(`${API_BASE}/api/posts`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("게시글 응답이 배열이 아님");
  return data.map(mapPostToUI);
}
function filterMyPosts(all, meUsername, meDisplayName) {
  const myId = meUsername?.toLowerCase() || null;
  const myName = meDisplayName?.toLowerCase() || null;
  return all.filter((p) => {
    const au = p.authorUsername?.toLowerCase();
    const an = p.authorName?.toLowerCase();
    if (myId && au) return au === myId; // 1순위: 아이디 매칭
    if (myName) return an === myName; // 2순위: 이름 매칭
    return false;
  });
}

// =====================[ 프로필 헤더 ]=====================
function paintProfileHeader(displayName) {
  displayNameElement.textContent = displayName || "익명";
  bioElement.textContent = "인사말을 작성해주세요.";
  phoneNumberElement.textContent = "";
  if (profileImage) profileImage.src = getRandomProfileUrl();

  if (editProfileBtn) editProfileBtn.style.display = "block";
  if (profileLoginButton) profileLoginButton.style.display = "none";
  if (profileSignupButton) profileSignupButton.style.display = "none";
  if (profileLogoutButton) profileLogoutButton.style.display = "list-item";
}

// =====================[ 메인페이지와 동일한 카드 UI/기능 ]=====================
function createPostCardElement(uiPost) {
  const card = document.createElement("div");
  card.classList.add("post-card");
  card.dataset.postId = uiPost.id;

  const imageHtml = uiPost.imageUrl
    ? `<img src="${uiPost.imageUrl}" alt="게시글 이미지" class="post-image">`
    : "";
  const tagsHtml = uiPost.tags?.length
    ? `<div class="mt-2 flex flex-wrap gap-2">${uiPost.tags
        .map(
          (t) =>
            `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">#${escapeHtml(
              t
            )}</span>`
        )
        .join("")}</div>`
    : "";

  card.innerHTML = `
    ${imageHtml}
    <div class="p-4">
      <div class="flex items-start justify-between">
        <div class="flex-1 pr-4">
          <p class="text-gray-800 leading-relaxed mb-2">${escapeHtml(
            uiPost.text
          )}</p>
          ${tagsHtml}
          <div class="flex items-center text-sm text-gray-500 mt-4">
            <span class="font-semibold text-gray-700 mr-2">${escapeHtml(
              uiPost.authorLabel
            )}</span>
            <span>• ${escapeHtml(String(uiPost.time))}</span>
          </div>
        </div>
        <button class="post-card-delete-btn text-white bg-rose-400/90 hover:bg-rose-500 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                title="삭제" aria-label="삭제">×</button>
      </div>

      <!-- ✅ 버튼 영역: 줄바꿈 방지/가로 정렬 -->
      <div class="post-actions flex items-center mt-4 gap-4">
        <button class="like-btn inline-flex items-center gap-1 whitespace-nowrap text-gray-600 hover:text-red-500 transition-colors duration-200 ${
          uiPost.likedByMe ? "liked text-red-500" : ""
        }"
                data-action="like">
          <span>${uiPost.likedByMe ? "💖" : "❤️"}</span>
          <span class="like-count">${uiPost.likeCount}</span>
          <span>좋아요</span>
        </button>

        <button class="comment-btn inline-flex items-center gap-1 whitespace-nowrap text-gray-600 hover:text-blue-500 transition-colors duration-200"
                data-action="comments">
          <span>💬</span><span>댓글</span>
        </button>
      </div>
    </div>
  `;

  // ✅ 카드 어디를 눌러도 댓글 모달(단, 버튼 클릭은 제외)
  card.addEventListener("click", (e) => {
    // 버튼/아이콘 클릭이면 무시
    if (e.target.closest("button")) return;
    openComments(uiPost.id);
  });

  // ✅ 좋아요
  const likeBtn = card.querySelector('[data-action="like"]');
  likeBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // 카드 클릭 전파 차단
    toggleLike(uiPost.id, card);
  });

  // ✅ 댓글 버튼
  const cmtBtn = card.querySelector('[data-action="comments"]');
  cmtBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openComments(uiPost.id);
  });

  // ✅ 삭제 버튼
  const delBtn = card.querySelector(".post-card-delete-btn");
  delBtn.addEventListener("click", async (e) => {
    e.stopPropagation();

    if (deletingIds.has(uiPost.id)) return;
    const ok = await showCustomConfirm("이 게시글을 정말 삭제하시겠습니까?");
    if (!ok) return;

    try {
      deletingIds.add(uiPost.id);
      delBtn.disabled = true;

      const res = await authFetch(`${API_BASE}/api/posts/${uiPost.id}`, {
        method: "DELETE",
      });

      if (res.status === 204 || res.status === 200 || res.status === 404) {
        myPosts = myPosts.filter((x) => String(x.id) !== String(uiPost.id));
        renderMyPosts();
        if (res.status !== 404) showCustomAlert("게시글이 삭제되었습니다.");
        return;
      }

      if (res.status === 403) {
        let msg = "권한이 없습니다. 본인 게시글만 삭제할 수 있어요.";
        try {
          msg = (await res.text()) || msg;
        } catch {}
        showCustomAlert(msg);
        return;
      }

      let detail = "";
      try {
        detail = await res.text();
      } catch {}
      throw new Error(
        `DELETE /api/posts/${uiPost.id} -> ${res.status} ${detail}`
      );
    } catch (err) {
      console.error(err);
      showCustomAlert("삭제 중 오류가 발생했습니다.");
    } finally {
      deletingIds.delete(uiPost.id);
      delBtn.disabled = false;
    }
  });

  return card;
}

function renderMyPosts() {
  userPostsGrid.innerHTML = "";
  if (myPosts.length === 0) {
    userPostsGrid.innerHTML =
      '<p class="text-gray-500 text-center col-span-full">아직 작성한 게시글이 없습니다.</p>';
    return;
  }
  // 최신순 보이려면 prepend, 이미 myPosts가 최신순이 아니라면 정렬 추가 가능
  myPosts.forEach((p) => userPostsGrid.prepend(createPostCardElement(p)));
}

// =====================[ 좋아요 처리 (메인과 동일) ]=====================
async function toggleLike(postId, cardEl) {
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload)) return dropToLogin();

  const likeBtn = cardEl.querySelector('[data-action="like"]');
  const likedNow = likeBtn.classList.contains("liked");

  try {
    const method = likedNow ? "DELETE" : "POST";
    await authFetch(`${API_BASE}/api/posts/${postId}/like`, { method });
    await refreshSinglePost(postId, cardEl);
  } catch (e) {
    console.error("좋아요 실패:", e);
    showCustomAlert("좋아요 처리 중 오류가 발생했습니다.");
  }
}
async function refreshSinglePost(postId, cardEl) {
  try {
    const res = await authFetch(`${API_BASE}/api/posts/${postId}`);
    const p = await res.json();
    const ui = mapPostToUI(p);

    // 카드 내부 반영
    const likeBtn = cardEl.querySelector('[data-action="like"]');
    likeBtn.classList.toggle("liked", ui.likedByMe);
    likeBtn.querySelector("span:first-child").textContent = ui.likedByMe
      ? "💖"
      : "❤️";
    likeBtn.querySelector(".like-count").textContent = ui.likeCount;

    // 상태 목록에도 반영
    const idx = myPosts.findIndex((x) => String(x.id) === String(postId));
    if (idx >= 0) myPosts[idx] = ui;
  } catch (e) {
    console.error("단건 게시글 갱신 실패:", e);
  }
}

// =====================[ 댓글 모달 (메인과 동일) ]=====================
async function openComments(postId) {
  try {
    const postRes = await authFetch(`${API_BASE}/api/posts/${postId}`);
    const post = await postRes.json();
    currentViewingPost = mapPostToUI(post);

    const cRes = await authFetch(`${API_BASE}/api/posts/${postId}/comments`);
    const comments = await cRes.json();

    const ui = currentViewingPost;

    if (modalPostTitle)
      modalPostTitle.textContent = ui.text.split("\n")[0] || "제목 없음";
    if (ui.imageUrl) {
      modalPostImage.src = ui.imageUrl;
      modalPostImage.classList.remove("hidden");
    } else {
      modalPostImage.classList.add("hidden");
      modalPostImage.src = "";
    }
    modalPostText.textContent = ui.text;
    modalPostTags.innerHTML = (ui.tags || [])
      .map(
        (t) =>
          `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">#${escapeHtml(
            t
          )}</span>`
      )
      .join("");
    modalPostAuthor.textContent = ui.authorLabel;
    modalPostTime.textContent = ui.time;

    renderComments(comments, modalCommentList);
    if (commentModal) commentModal.style.display = "flex";
  } catch (e) {
    console.error("댓글 열기 실패:", e);
    showCustomAlert("댓글을 불러오는 데 실패했습니다.");
  }
}
function renderComments(comments, container) {
  container.innerHTML = "";
  if (!Array.isArray(comments) || comments.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-center py-4">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>`;
    return;
  }
  comments.forEach((c) => {
    const item = document.createElement("div");
    item.className = "comment-item";
    item.dataset.id = c.id;

    const likeCount =
      c.likeCount ?? (Array.isArray(c.likedBy) ? c.likedBy.length : 0);
    const likedByMe = c.likedByMe ?? false;

    item.innerHTML = `
      <div class="comment-content-wrapper">
        <div class="comment-text-line">
          <span class="comment-username">${escapeHtml(
            c.author?.username ?? c.username ?? "익명"
          )}</span>
          <span class="comment-body">${escapeHtml(
            c.content ?? c.text ?? ""
          )}</span>
        </div>
        <div class="comment-time">${escapeHtml(
          c.createdAt ?? c.time ?? ""
        )}</div>
      </div>
      <div class="comment-actions">
        <button class="like-button ${
          likedByMe ? "text-red-500" : "text-gray-500"
        } hover:text-red-500 transition-colors duration-200" data-action="comment-like">
          <span class="comment-like-count">${likeCount}개</span> 좋아요
        </button>
      </div>
    `;
    item
      .querySelector('[data-action="comment-like"]')
      .addEventListener("click", () => toggleCommentLike(c.id, item));
    container.appendChild(item);
  });
}
async function toggleCommentLike(commentId, itemEl) {
  try {
    const btn = itemEl.querySelector('[data-action="comment-like"]');
    const liked = btn.classList.contains("text-red-500");
    const method = liked ? "DELETE" : "POST";
    await authFetch(`${API_BASE}/api/comments/${commentId}/like`, { method });
    await refreshCommentsOfCurrentPost();
  } catch (e) {
    console.error("댓글 좋아요 실패:", e);
    showCustomAlert("댓글 좋아요에 실패했습니다.");
  }
}
async function refreshCommentsOfCurrentPost() {
  if (!currentViewingPost?.id) return;
  try {
    const res = await authFetch(
      `${API_BASE}/api/posts/${currentViewingPost.id}/comments`
    );
    const comments = await res.json();
    renderComments(comments, modalCommentList);
  } catch (e) {
    console.error("댓글 재조회 실패:", e);
  }
}
// 댓글 작성
modalCommentSubmitButton?.addEventListener("click", async () => {
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload)) return dropToLogin();

  const text = (modalCommentInput.value || "").trim();
  if (!text) return showCustomAlert("댓글 내용을 입력해주세요.");
  if (!currentViewingPost?.id) return;

  try {
    const res = await authJson(
      `${API_BASE}/api/posts/${currentViewingPost.id}/comments`,
      "POST",
      { content: text }
    );
    if (!res.ok) throw new Error(`댓글 생성 실패(${res.status})`);
    modalCommentInput.value = "";
    await refreshCommentsOfCurrentPost();
    modalCommentList.scrollTop = modalCommentList.scrollHeight;
  } catch (e) {
    console.error(e);
    showCustomAlert("댓글 생성에 실패했습니다.");
  }
});

// =====================[ 초기화 ]=====================
document.addEventListener("DOMContentLoaded", async () => {
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload)) {
    // 미로그인 상태
    displayNameElement.textContent = "로그인 필요";
    bioElement.textContent = "프로필을 보려면 로그인하세요.";
    if (profileImage) profileImage.src = getRandomProfileUrl();
    if (editProfileBtn) editProfileBtn.style.display = "none";
    if (profileLoginButton) profileLoginButton.style.display = "list-item";
    if (profileSignupButton) profileSignupButton.style.display = "list-item";
    if (profileLogoutButton) profileLogoutButton.style.display = "none";
    userPostsGrid.innerHTML =
      '<p class="text-gray-500 text-center col-span-full">게시글을 보려면 로그인해주세요.</p>';
    return;
  }

  try {
    // 1) JWT에서 내 식별값
    const meUsername =
      usernameFromJwt(payload) || localStorage.getItem("loggedInUser");
    const jwtName = nameFromJwt(payload);
    if (!meUsername) {
      dropToLogin();
      return;
    }

    // 2) 서버에서 내 프로필 로드(가능하면)
    const me = await fetchMyProfile();

    // 3) 전체 게시글 조회
    const all = await fetchAllPosts();

    // 4) 내 글 중 표시명 결정 (서버 이름 우선)
    const firstMine = all.find(
      (p) =>
        (p.authorUsername && p.authorUsername === meUsername) ||
        (p.authorName && p.authorName === (me?.name || jwtName))
    );
    const displayName =
      me?.name || firstMine?.authorName || jwtName || meUsername;
    const displayPhone = me?.phone || "";

    // 5) 헤더 반영
    displayNameElement.textContent = displayName || "익명";
    bioElement.textContent = "인사말을 작성해주세요.";
    phoneNumberElement.textContent = displayPhone;
    if (profileImage) profileImage.src = getRandomProfileUrl();
    if (editProfileBtn) editProfileBtn.style.display = "block";
    if (profileLoginButton) profileLoginButton.style.display = "none";
    if (profileSignupButton) profileSignupButton.style.display = "none";
    if (profileLogoutButton) profileLogoutButton.style.display = "list-item";

    // 6) 내 글만 필터 후 렌더 (메인 카드와 동일 UI)
    myPosts = filterMyPosts(all, meUsername, displayName);
    renderMyPosts();
  } catch (e) {
    console.error("프로필 초기화 실패:", e);
    userPostsGrid.innerHTML =
      '<p class="text-red-500 text-center col-span-full">게시글을 불러오지 못했습니다.</p>';
  }

  // 로그아웃
  profileLogoutButton?.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = LOGIN_URL;
  });

  // 모달 닫기
  closeEditModal?.addEventListener(
    "click",
    () => (editModal.style.display = "none")
  );
  closeCommentModalButton?.addEventListener(
    "click",
    () => (commentModal.style.display = "none")
  );
  closeImageModal?.addEventListener(
    "click",
    () => (imageModal.style.display = "none")
  );
  closeAlertModal?.addEventListener(
    "click",
    () => (alertDialog.style.display = "none")
  );

  // 엔터키로 확인/알림 모달 조작
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    if (confirmationModal?.style.display === "flex") confirmYesBtn?.click();
    if (alertDialog?.style.display === "flex") closeAlertModal?.click();
  });

  // 프로필 편집(표시용)
  editProfileBtn?.addEventListener("click", () => {
    if (!editModal) return;
    if (nameInput)
      nameInput.value = (displayNameElement.textContent || "").trim();
    if (phoneInput)
      phoneInput.value = (phoneNumberElement.textContent || "").trim();
    if (bioInput) bioInput.value = (bioElement.textContent || "").trim();
    editModal.style.display = "flex";
  });

  saveBtn?.addEventListener("click", async () => {
    const newName = (nameInput?.value || "").trim();
    const newPhone = (phoneInput?.value || "").trim();
    const newBio = (bioInput?.value || "").trim();

    if (!newName) {
      showCustomAlert("이름은 비워둘 수 없습니다.");
      return;
    }

    try {
      const updatedProfile = await updateMyProfile({
        name: newName,
        phone: newPhone,
      });

      // 헤더 UI 갱신
      displayNameElement.textContent = updatedProfile.name || newName;
      phoneNumberElement.textContent = updatedProfile.phone ?? newPhone;
      bioElement.textContent = newBio || "인사말을 작성해주세요."; // 비우면 기본 문구

      // 내 게시글 카드의 표시명도 동기화
      myPosts = myPosts.map((p) => ({
        ...p,
        authorName:
          p.authorName && p.authorLabel === p.authorName
            ? updatedProfile.name || newName
            : p.authorName,
        authorLabel:
          p.authorName && p.authorLabel === p.authorName
            ? updatedProfile.name || newName
            : p.authorLabel,
      }));
      renderMyPosts();

      editModal.style.display = "none";
      showCustomAlert("프로필이 저장되었습니다.");
    } catch (e) {
      console.error(e);
      showCustomAlert("프로필 저장에 실패했습니다. 서버 API를 확인해주세요.");
    }
  });
});
