/*
// =====================[ 설정 ]=====================
const API_BASE = "http://localhost:8080"; // ← 로컬 백엔드 주소
const TOKEN_KEY = "authToken"; // localStorage에 "Bearer XXX"로 저장됨
const LOGIN_URL = "/Summer_Project/html/login.html";

// =====================[ 공용 유틸 ]=====================
function show(el) {
  if (!el) return;
  el.classList.remove("hidden");
  el.style.display = "inline-block"; // inline 스타일도 제어 (inline style 우선순위 ↑)
}
function hide(el) {
  if (!el) return;
  el.classList.add("hidden");
  el.style.display = "none";
}

// =====================[ JWT 유틸 ]=====================
function getToken() {
  return localStorage.getItem(TOKEN_KEY); // "Bearer xxx"
}
function dropSessionAndGoLogin(msg) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("loggedInUser");
  if (msg) alert(msg);
  window.location.href = LOGIN_URL;
}
function parseJwtPayload() {
  const bearer = getToken();
  if (!bearer) return null;
  const raw = bearer.replace(/^Bearer\s+/i, "");
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
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function isTokenExpired(payload) {
  return payload?.exp ? payload.exp * 1000 < Date.now() : false;
}
async function authFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    dropSessionAndGoLogin();
    throw new Error("No token");
  }
  const headers = { ...(options.headers || {}), Authorization: token };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    dropSessionAndGoLogin(
      "인증이 만료되었거나 권한이 없습니다. 다시 로그인해주세요."
    );
    throw new Error(`HTTP ${res.status}`);
  }
  return res;
}

// =====================[ DOM ]=====================
const createPostButton = document.getElementById("createPostButton");
const postModal = document.getElementById("postModal");
const closePostModalButton = document.getElementById("closePostModalButton");
const registerPostButton = document.getElementById("registerPostButton");
const postImageInput = document.getElementById("postImageInput");
const postTextInput = document.getElementById("postTextInput");
const postTagsInput = document.getElementById("postTagsInput");
const feed = document.getElementById("feed");

const commentModal = document.getElementById("commentModal");
const closeCommentModalButton = document.getElementById(
  "closeCommentModalButton"
);
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

const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const logoutButton = document.getElementById("logoutButton");
const logoutAnchor = logoutButton ? logoutButton.querySelector("a") : null; // 실제 클릭 타깃

// 상태
let allPosts = [];
let currentPost = null; // 모달에서 보고 있는 게시글

// =====================[ 로그인 상태 UI ]=====================
function updateLoginButtons() {
  const payload = parseJwtPayload();
  const loggedIn = payload && !isTokenExpired(payload);

  if (loggedIn) {
    hide(loginButton);
    hide(signupButton);
    show(logoutButton);
  } else {
    show(loginButton);
    show(signupButton);
    hide(logoutButton);
  }
}

// a 태그 클릭 막고 로그아웃 처리
logoutAnchor?.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("loggedInUser");
  updateLoginButtons();
  window.location.href = LOGIN_URL;
});

// =====================[ 게시글 불러오기/렌더 ]=====================
async function loadPosts() {
  try {
    const res = await authFetch(`${API_BASE}/api/posts`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("응답이 배열이 아님");
    allPosts = data;
    renderAllPosts();
  } catch (e) {
    console.error("게시글 불러오기 실패:", e);
    alert("게시글을 불러오는 데 실패했습니다.");
  }
}

function mapPostToUI(post) {
  return {
    id: post.id,
    text: post.content ?? post.text ?? "",
    imageUrl: post.imageUrl ?? null,
    tags: post.tags ?? [],
    author: post.author?.username ?? post.authorName ?? post.username ?? "익명",
    time: post.createdAt ?? post.time ?? "",
    likeCount: post.likeCount ?? 0,
    likedByMe: post.likedByMe ?? false,
    commentsCount: post.commentsCount ?? 0,
  };
}

function renderAllPosts() {
  feed.innerHTML = "";
  allPosts.forEach((p) => {
    const ui = mapPostToUI(p);
    feed.prepend(createPostCardElement(ui));
  });
}

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
            `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">#${t}</span>`
        )
        .join("")}</div>`
    : "";

  card.innerHTML = `
    ${imageHtml}
    <div class="p-4">
      <p class="text-gray-800 leading-relaxed mb-2">${escapeHtml(
        uiPost.text
      )}</p>
      ${tagsHtml}
      <div class="flex items-center text-sm text-gray-500 mt-4">
        <span class="font-semibold text-gray-700 mr-2">${escapeHtml(
          uiPost.author
        )}</span>
        <span>• ${escapeHtml(String(uiPost.time))}</span>
      </div>
      <div class="flex items-center mt-4 space-x-4">
        <button class="flex items-center text-gray-600 hover:text-red-500 transition-colors duration-200 ${
          uiPost.likedByMe ? "liked text-red-500" : ""
        }" data-action="like">
          <span class="mr-1">${uiPost.likedByMe ? "💖" : "❤️"}</span>
          <span class="like-count">${uiPost.likeCount}</span> 좋아요
        </button>
        <button class="flex items-center text-gray-600 hover:text-blue-500 transition-colors duration-200" data-action="comments">
          <span class="mr-1">💬</span> 댓글
        </button>
      </div>
    </div>
  `;
  card
    .querySelector('[data-action="like"]')
    .addEventListener("click", () => toggleLike(uiPost.id, card));
  card
    .querySelector('[data-action="comments"]')
    .addEventListener("click", () => openComments(uiPost.id));
  return card;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// =====================[ 좋아요 ]=====================
async function toggleLike(postId, cardEl) {
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload)) return dropSessionAndGoLogin();

  const likeBtn = cardEl.querySelector('[data-action="like"]');
  const likedNow = likeBtn.classList.contains("liked");

  try {
    const method = likedNow ? "DELETE" : "POST";
    await authFetch(`${API_BASE}/api/posts/${postId}/like`, { method });
    await refreshSinglePost(postId, cardEl);
  } catch (e) {
    console.error("좋아요 실패:", e);
    alert("좋아요 처리 중 오류가 발생했습니다.");
  }
}

async function refreshSinglePost(postId, cardEl) {
  try {
    const res = await authFetch(`${API_BASE}/api/posts/${postId}`);
    const p = await res.json();
    const ui = mapPostToUI(p);

    const likeBtn = cardEl.querySelector('[data-action="like"]');
    likeBtn.classList.toggle("liked", ui.likedByMe);
    likeBtn.querySelector("span:first-child").textContent = ui.likedByMe
      ? "💖"
      : "❤️";
    likeBtn.querySelector(".like-count").textContent = ui.likeCount;
  } catch (e) {
    console.error("단건 게시글 갱신 실패:", e);
  }
}

// =====================[ 댓글 ]=====================
async function openComments(postId) {
  try {
    const postRes = await authFetch(`${API_BASE}/api/posts/${postId}`);
    const post = await postRes.json();
    currentPost = post;

    const cRes = await authFetch(`${API_BASE}/api/posts/${postId}/comments`);
    const comments = await cRes.json();

    const ui = mapPostToUI(post);
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
          `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">#${t}</span>`
      )
      .join("");
    modalPostAuthor.textContent = ui.author;
    modalPostTime.textContent = ui.time;

    renderComments(comments, modalCommentList);
    commentModal.classList.remove("hidden");
  } catch (e) {
    console.error("댓글 열기 실패:", e);
    alert("댓글을 불러오는 데 실패했습니다.");
  }
}

closeCommentModalButton?.addEventListener("click", () => {
  commentModal.classList.add("hidden");
  modalPostImage.classList.add("hidden");
  modalPostImage.src = "";
  modalPostText.textContent = "";
  modalPostTags.innerHTML = "";
  modalPostAuthor.textContent = "";
  modalPostTime.textContent = "";
  modalCommentList.innerHTML = "";
  currentPost = null;
});
commentModal?.addEventListener("click", (e) => {
  if (e.target === commentModal) closeCommentModalButton.click();
});

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
    alert("댓글 좋아요에 실패했습니다.");
  }
}

async function refreshCommentsOfCurrentPost() {
  if (!currentPost?.id) return;
  try {
    const res = await authFetch(
      `${API_BASE}/api/posts/${currentPost.id}/comments`
    );
    const comments = await res.json();
    renderComments(comments, modalCommentList);
  } catch (e) {
    console.error("댓글 재조회 실패:", e);
  }
}

modalCommentSubmitButton?.addEventListener("click", async () => {
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload)) return dropSessionAndGoLogin();

  const text = (modalCommentInput.value || "").trim();
  if (!text) return alert("댓글 내용을 입력해주세요.");
  if (!currentPost?.id) return;

  try {
    const res = await authFetch(
      `${API_BASE}/api/posts/${currentPost.id}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      }
    );
    if (!res.ok) throw new Error(`댓글 생성 실패(${res.status})`);
    modalCommentInput.value = "";
    await refreshCommentsOfCurrentPost();
    modalCommentList.scrollTop = modalCommentList.scrollHeight;
  } catch (e) {
    console.error(e);
    alert("댓글 생성에 실패했습니다.");
  }
});

// =====================[ 게시글 작성 ]=====================
createPostButton?.addEventListener("click", () => {
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload))
    return dropSessionAndGoLogin("로그인이 필요합니다.");
  postModal.classList.remove("hidden");
});
function resetPostModal() {
  postModal.classList.add("hidden");
  postImageInput.value = "";
  postTextInput.value = "";
  postTagsInput.value = "";
}
closePostModalButton?.addEventListener("click", resetPostModal);
postModal?.addEventListener("click", (e) => {
  if (e.target === postModal) resetPostModal();
});

registerPostButton?.addEventListener("click", async () => {
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload))
    return dropSessionAndGoLogin("로그인이 필요합니다.");

  const content = (postTextInput.value || "").trim();
  const tags = (postTagsInput.value || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!content) return alert("게시글 내용을 입력해주세요.");

  try {
    const res = await authFetch(`${API_BASE}/api/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, tags }),
    });
    if (!res.ok) throw new Error(`게시글 생성 실패(${res.status})`);
    await loadPosts();
    resetPostModal();
  } catch (e) {
    console.error(e);
    alert("게시글 생성에 실패했습니다.");
  }
});

// =====================[ 초기 구동 ]=====================
(function init() {
  updateLoginButtons(); // 버튼 토글
  loadPosts(); // 피드 로딩 (백엔드가 인증 필요하므로 미로그인일 경우 dropSessionAndGoLogin로 이동)
})();
*/

// =====================[ 설정 ]=====================
const API_BASE = "http://localhost:8080"; // ← 로컬 백엔드 주소
const TOKEN_KEY = "authToken"; // localStorage에 "Bearer XXX"로 저장됨
const LOGIN_URL = "/Summer_Project/html/login.html";

// =====================[ 공용 유틸 ]=====================
function show(el) {
  if (!el) return;
  el.classList.remove("hidden");
  el.style.display = "inline-block";
}
function hide(el) {
  if (!el) return;
  el.classList.add("hidden");
  el.style.display = "none";
}

// =====================[ JWT 유틸 ]=====================
function getToken() {
  return localStorage.getItem(TOKEN_KEY); // "Bearer xxx"
}
function dropSessionAndGoLogin(msg) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("loggedInUser");
  if (msg) alert(msg);
  window.location.href = LOGIN_URL;
}
function parseJwtPayload() {
  const bearer = getToken();
  if (!bearer) return null;
  const raw = bearer.replace(/^Bearer\s+/i, "");
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
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function isTokenExpired(payload) {
  return payload?.exp ? payload.exp * 1000 < Date.now() : false;
}
async function authFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    dropSessionAndGoLogin();
    throw new Error("No token");
  }
  const headers = { ...(options.headers || {}), Authorization: token };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    dropSessionAndGoLogin(
      "인증이 만료되었거나 권한이 없습니다. 다시 로그인해주세요."
    );
    throw new Error(`HTTP ${res.status}`);
  }
  return res;
}

// ✅ JSON 요청 헬퍼 (POST/PUT 등에 편리)
async function authJson(url, method, bodyObj) {
  return authFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
  });
}

// =====================[ DOM ]=====================
const createPostButton = document.getElementById("createPostButton");
const postModal = document.getElementById("postModal");
const closePostModalButton = document.getElementById("closePostModalButton");
const registerPostButton = document.getElementById("registerPostButton");
const postImageInput = document.getElementById("postImageInput");
const postTextInput = document.getElementById("postTextInput");
const postTagsInput = document.getElementById("postTagsInput");
const feed = document.getElementById("feed");

const commentModal = document.getElementById("commentModal");
const closeCommentModalButton = document.getElementById(
  "closeCommentModalButton"
);
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

const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const logoutButton = document.getElementById("logoutButton");
const logoutAnchor = logoutButton ? logoutButton.querySelector("a") : null;

// 상태
let allPosts = [];
let currentPost = null;

// =====================[ 로그인 상태 UI ]=====================
function updateLoginButtons() {
  const payload = parseJwtPayload();
  const loggedIn = payload && !isTokenExpired(payload);

  if (loggedIn) {
    hide(loginButton);
    hide(signupButton);
    show(logoutButton);
  } else {
    show(loginButton);
    show(signupButton);
    hide(logoutButton);
  }
}

// a 태그 클릭 막고 로그아웃 처리
logoutAnchor?.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("loggedInUser");
  updateLoginButtons();
  window.location.href = LOGIN_URL;
});

// =====================[ 게시글 불러오기/렌더 ]=====================
async function loadPosts() {
  try {
    const res = await authFetch(`${API_BASE}/api/posts`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("응답이 배열이 아님");
    allPosts = data;
    renderAllPosts();
  } catch (e) {
    console.error("게시글 불러오기 실패:", e);
    alert("게시글을 불러오는 데 실패했습니다.");
  }
}

function mapPostToUI(post) {
  const pick = (...vals) =>
    vals.find((v) => typeof v === "string" && v.trim().length > 0) ?? "익명";

  return {
    id: post.id,
    text: post.content ?? post.text ?? "",
    imageUrl: post.imageUrl ?? null,
    tags: post.tags ?? [],
    author: pick(
      post.authorName,
      post.author?.name,
      post.author?.username,
      post.authorId,
      post.username
    ),
    time: (post.createdAt ?? post.time ?? "").split("T")[0],
    likeCount: post.likeCount ?? 0,
    likedByMe: post.likedByMe ?? false,
    commentsCount: post.commentsCount ?? 0,
  };
}

function renderAllPosts() {
  feed.innerHTML = "";
  allPosts.forEach((p) => {
    const ui = mapPostToUI(p);
    feed.prepend(createPostCardElement(ui));
  });
}

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
            `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">#${t}</span>`
        )
        .join("")}</div>`
    : "";

  card.innerHTML = `
    ${imageHtml}
    <div class="p-4">
      <p class="text-gray-800 leading-relaxed mb-2">${escapeHtml(
        uiPost.text
      )}</p>
      ${tagsHtml}
      <div class="flex items-center text-sm text-gray-500 mt-4">
        <span class="font-semibold text-gray-700 mr-2">${escapeHtml(
          uiPost.author
        )}</span>
        <span>• ${escapeHtml(String(uiPost.time))}</span>
      </div>
      <div class="flex items-center mt-4 space-x-4">
        <button class="flex items-center text-gray-600 hover:text-red-500 transition-colors duration-200 ${
          uiPost.likedByMe ? "liked text-red-500" : ""
        }" data-action="like">
          <span class="mr-1">${uiPost.likedByMe ? "💖" : "❤️"}</span>
          <span class="like-count">${uiPost.likeCount}</span> 좋아요
        </button>
        <button class="flex items-center text-gray-600 hover:text-blue-500 transition-colors duration-200" data-action="comments">
          <span class="mr-1">💬</span> 댓글
        </button>
      </div>
    </div>
  `;
  card
    .querySelector('[data-action="like"]')
    .addEventListener("click", () => toggleLike(uiPost.id, card));
  card
    .querySelector('[data-action="comments"]')
    .addEventListener("click", () => openComments(uiPost.id));
  return card;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// =====================[ 좋아요 ]=====================
async function toggleLike(postId, cardEl) {
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload)) return dropSessionAndGoLogin();

  const likeBtn = cardEl.querySelector('[data-action="like"]');
  const likedNow = likeBtn.classList.contains("liked");

  try {
    const method = likedNow ? "DELETE" : "POST";
    await authFetch(`${API_BASE}/api/posts/${postId}/like`, { method });
    await refreshSinglePost(postId, cardEl);
  } catch (e) {
    console.error("좋아요 실패:", e);
    alert("좋아요 처리 중 오류가 발생했습니다.");
  }
}

async function refreshSinglePost(postId, cardEl) {
  try {
    const res = await authFetch(`${API_BASE}/api/posts/${postId}`);
    const p = await res.json();
    const ui = mapPostToUI(p);

    const likeBtn = cardEl.querySelector('[data-action="like"]');
    likeBtn.classList.toggle("liked", ui.likedByMe);
    likeBtn.querySelector("span:first-child").textContent = ui.likedByMe
      ? "💖"
      : "❤️";
    likeBtn.querySelector(".like-count").textContent = ui.likeCount;
  } catch (e) {
    console.error("단건 게시글 갱신 실패:", e);
  }
}

// =====================[ 댓글 ]=====================
async function openComments(postId) {
  try {
    const postRes = await authFetch(`${API_BASE}/api/posts/${postId}`);
    const post = await postRes.json();
    currentPost = post;

    const cRes = await authFetch(`${API_BASE}/api/posts/${postId}/comments`);
    const comments = await cRes.json();

    const ui = mapPostToUI(post);
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
          `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">#${t}</span>`
      )
      .join("");
    modalPostAuthor.textContent = ui.author;
    modalPostTime.textContent = ui.time;

    renderComments(comments, modalCommentList);
    commentModal.classList.remove("hidden");
  } catch (e) {
    console.error("댓글 열기 실패:", e);
    alert("댓글을 불러오는 데 실패했습니다.");
  }
}

closeCommentModalButton?.addEventListener("click", () => {
  commentModal.classList.add("hidden");
  modalPostImage.classList.add("hidden");
  modalPostImage.src = "";
  modalPostText.textContent = "";
  modalPostTags.innerHTML = "";
  modalPostAuthor.textContent = "";
  modalPostTime.textContent = "";
  modalCommentList.innerHTML = "";
  currentPost = null;
});
commentModal?.addEventListener("click", (e) => {
  if (e.target === commentModal) closeCommentModalButton.click();
});

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
    alert("댓글 좋아요에 실패했습니다.");
  }
}

async function refreshCommentsOfCurrentPost() {
  if (!currentPost?.id) return;
  try {
    const res = await authFetch(
      `${API_BASE}/api/posts/${currentPost.id}/comments`
    );
    const comments = await res.json();
    renderComments(comments, modalCommentList);
  } catch (e) {
    console.error("댓글 재조회 실패:", e);
  }
}

modalCommentSubmitButton?.addEventListener("click", async () => {
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload)) return dropSessionAndGoLogin();

  const text = (modalCommentInput.value || "").trim();
  if (!text) return alert("댓글 내용을 입력해주세요.");
  if (!currentPost?.id) return;

  try {
    const res = await authJson(
      `${API_BASE}/api/posts/${currentPost.id}/comments`,
      "POST",
      { content: text }
    ); // ✅
    if (!res.ok) throw new Error(`댓글 생성 실패(${res.status})`);
    modalCommentInput.value = "";
    await refreshCommentsOfCurrentPost();
    modalCommentList.scrollTop = modalCommentList.scrollHeight;
  } catch (e) {
    console.error(e);
    alert("댓글 생성에 실패했습니다.");
  }
});

// =====================[ 게시글 작성 ]=====================
createPostButton?.addEventListener("click", () => {
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload))
    return dropSessionAndGoLogin("로그인이 필요합니다.");
  postModal.classList.remove("hidden");
});
function resetPostModal() {
  postModal.classList.add("hidden");
  postImageInput.value = "";
  postTextInput.value = "";
  postTagsInput.value = "";
}
closePostModalButton?.addEventListener("click", resetPostModal);
postModal?.addEventListener("click", (e) => {
  if (e.target === postModal) resetPostModal();
});

registerPostButton?.addEventListener("click", async () => {
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload))
    return dropSessionAndGoLogin("로그인이 필요합니다.");

  const content = (postTextInput.value || "").trim();
  // const tags = ... // 현재 백엔드 DTO에는 없음. 필요해지면 API 바꾼 뒤 추가 사용.
  if (!content) return alert("게시글 내용을 입력해주세요.");

  try {
    const res = await authJson(`${API_BASE}/api/posts`, "POST", { content }); // ✅ DTO에 맞춰 content만
    if (!res.ok) throw new Error(`게시글 생성 실패(${res.status})`);
    await loadPosts();
    resetPostModal();
  } catch (e) {
    console.error(e);
    alert("게시글 생성에 실패했습니다.");
  }
});

// =====================[ 초기 구동 ]=====================
(function init() {
  // ✅ 토큰 없거나 만료면 즉시 로그인으로
  const payload = parseJwtPayload();
  if (!payload || isTokenExpired(payload)) {
    dropSessionAndGoLogin();
    return;
  }

  updateLoginButtons();
  loadPosts();
})();
