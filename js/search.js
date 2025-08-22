// =====================[ 검색 페이지 전용 유틸 (profile.js 의존성 제거) ]=====================

// 상수
const API_BASE = window.API_BASE || "http://localhost:8080";
const TOKEN_KEY = window.TOKEN_KEY || "authToken"; // "Bearer xxx"
const LOGIN_URL = window.LOGIN_URL || "/Summer_Project/html/login.html";

// --------------------- 공용 유틸 ---------------------
function getToken() {
  return localStorage.getItem(TOKEN_KEY); // "Bearer xxx"
}
function dropToLogin(msg) {
  try {
    if (msg) alert(msg);
  } catch {}
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("loggedInUser");
  window.location.href = LOGIN_URL;
}
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function dateOnly(v) {
  if (!v) return "";
  const s = String(v);
  if (s.includes("T")) return s.split("T")[0];
  if (s.includes(" ")) return s.split(" ")[0];
  return s;
}
function showCustomAlert(message) {
  alert(message);
}
function showCustomConfirm(message) {
  return Promise.resolve(confirm(message));
}

// JWT payload 파서(내 아이디 확인용)
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
  try {
    const text = new TextDecoder("utf-8").decode(
      Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    );
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function getCurrentUsername() {
  const p = parseJwtPayload();
  if (!p) return null;
  return p.username || p.user_name || p.preferred_username || p.sub || null;
}

// 인증 fetch
async function authFetch(url, options = {}) {
  const token = getToken(); // 토큰 없어도 시도(공개 엔드포인트 대비)
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = token;

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    throw new Error(`네트워크 오류: ${e?.message || e}`);
  }

  if (res.status === 401) {
    dropToLogin("세션이 만료되었습니다. 다시 로그인하세요.");
    throw new Error("HTTP 401 (Unauthorized)");
  }
  return res;
}
async function authJson(url, method, bodyObj) {
  return authFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
  });
}

// 서버 → UI 포맷 매핑
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

// =====================[ DOM 요소 ]=====================
const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("searchResults");

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

// =====================[ 전역 상태 ]=====================
let searchResults = []; // 검색 결과 목록(UI용)
let currentViewingPost = null; // 모달에서 보고 있는 게시글(UI용)

// =====================[ 서버 통신 ]=====================
async function fetchAllPosts() {
  let res;
  try {
    res = await authFetch(`${API_BASE}/api/posts`);
  } catch (e) {
    throw new Error(`POSTS 조회 실패: ${e.message || e}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POSTS 조회 실패(${res.status}) ${text}`);
  }
  const raw = await res.json();
  if (!Array.isArray(raw))
    throw new Error(`POSTS 응답이 배열이 아님: ${typeof raw}`);
  return raw.map(mapPostToUI);
}

// 단건 게시글 재조회 후 카드/상태 반영
async function refreshSinglePost(postId, cardEl) {
  try {
    const res = await authFetch(`${API_BASE}/api/posts/${postId}`);
    if (!res.ok) throw new Error(`단건 조회 실패(${res.status})`);
    const p = await res.json();
    const ui = mapPostToUI(p);

    const likeBtn = cardEl.querySelector('[data-action="like"]');
    likeBtn.classList.toggle("liked", ui.likedByMe);
    likeBtn.querySelector("span:first-child").textContent = ui.likedByMe
      ? "💖"
      : "❤️";
    likeBtn.querySelector(".like-count").textContent = ui.likeCount;

    const idx = searchResults.findIndex((x) => String(x.id) === String(postId));
    if (idx >= 0) searchResults[idx] = ui;
  } catch (e) {
    console.error("단건 게시글 갱신 실패:", e);
  }
}

// =====================[ 카드 UI ]=====================
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
      <div class="flex items-start">
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
      </div>

      <div class="post-actions flex items-center mt-4 gap-4">
        <button class="like-btn inline-flex items-center gap-1 whitespace-nowrap text-gray-600 hover:text-red-500 transition-colors duration-200 ${
          uiPost.likedByMe ? "liked text-red-500" : ""
        }" data-action="like">
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

  // 카드 클릭 → 댓글 모달 (버튼 제외)
  card.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    openComments(uiPost.id);
  });

  // 좋아요
  const likeBtn = card.querySelector('[data-action="like"]');
  likeBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const likedNow = likeBtn.classList.contains("liked");
    try {
      const method = likedNow ? "DELETE" : "POST";
      await authFetch(`${API_BASE}/api/posts/${uiPost.id}/like`, { method });
      await refreshSinglePost(uiPost.id, card);
    } catch (err) {
      console.error("좋아요 실패:", err);
      showCustomAlert("좋아요 처리 중 오류가 발생했습니다.");
    }
  });

  // 댓글 버튼
  const cmtBtn = card.querySelector('[data-action="comments"]');
  cmtBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openComments(uiPost.id);
  });

  return card;
}

// =====================[ 검색 ]=====================
function norm(s) {
  return String(s || "")
    .normalize("NFC")
    .toLowerCase()
    .trim();
}

async function searchPosts() {
  const raw = (searchInput.value || "").trim();
  resultsContainer.innerHTML = "";

  if (!raw) {
    resultsContainer.innerHTML = `<p class="col-span-full text-center text-gray-500">검색할 사용자 이름을 입력해주세요.</p>`;
    return;
  }

  const keywords = raw.split(/\s+/).map(norm).filter(Boolean);

  try {
    const all = await fetchAllPosts();
    // 이름/표시명/아이디 부분일치 (키워드 AND)
    searchResults = all.filter((p) => {
      const cands = [p.authorLabel, p.authorName, p.authorUsername]
        .filter(Boolean)
        .map(norm);
      return keywords.every((kw) => cands.some((n) => n.includes(kw)));
    });

    renderSearchResults();
  } catch (e) {
    console.error("검색 실패:", e);
    const msg = e?.message ? e.message : "알 수 없는 오류";
    resultsContainer.innerHTML = `<p class="col-span-full text-center text-red-500">검색 중 오류가 발생했습니다: ${escapeHtml(
      msg
    )}</p>`;
    showCustomAlert(`검색 실패: ${msg}`);
  }
}

function renderSearchResults() {
  resultsContainer.innerHTML = "";
  if (!searchResults.length) {
    resultsContainer.innerHTML = `<p class="col-span-full text-center text-gray-500">해당 사용자의 게시글이 없습니다.</p>`;
    return;
  }
  searchResults.forEach((p) => {
    const card = createPostCardElement(p);
    resultsContainer.prepend(card);
  });
}

// =====================[ 댓글 모달 (메인페이지 동일 스타일/기능) ]=====================
async function openComments(postId) {
  try {
    const postRes = await authFetch(`${API_BASE}/api/posts/${postId}`);
    if (!postRes.ok) throw new Error(`게시글 조회 실패(${postRes.status})`);
    const post = await postRes.json();
    currentViewingPost = mapPostToUI(post);

    const cRes = await authFetch(`${API_BASE}/api/posts/${postId}/comments`);
    if (!cRes.ok) throw new Error(`댓글 조회 실패(${cRes.status})`);
    const comments = await cRes.json();

    const ui = currentViewingPost;

    if (modalPostTitle)
      modalPostTitle.textContent = (ui.text || "").split("\n")[0] || "게시글";
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

    // 중복 밑줄 방지: 혹시 Tailwind divide 클래스가 있다면 제거
    if (modalCommentList) {
      modalCommentList.classList.add("comment-list");
      modalCommentList.classList.remove("divide-y", "divide-gray-200");
    }

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
    container.innerHTML = `<p class="text-gray-500 text-center py-6">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>`;
    return;
  }

  const pick = (...vals) =>
    vals.find((v) => typeof v === "string" && v.trim().length > 0) ?? "익명";
  const me = (getCurrentUsername() || "").toString().toLowerCase();

  comments.forEach((c) => {
    const row = document.createElement("div");
    row.className = "py-4"; // 메인페이지처럼 라인형
    row.dataset.id = c.id;

    const authorName = pick(
      c.authorName,
      c.author?.name,
      c.author?.username,
      c.username
    );
    const commentAuthorId = pick(c.authorId, c.author?.username, c.username);
    const isMine =
      me && commentAuthorId && me === commentAuthorId.toString().toLowerCase();

    const rawTime = String(c.createdAt ?? c.time ?? "");
    const displayDate =
      c.createdOn ||
      (rawTime.includes("T")
        ? rawTime.split("T")[0]
        : rawTime.substring(0, 10));

    const likeCount =
      c.likeCount ?? (Array.isArray(c.likedBy) ? c.likedBy.length : 0);
    const likedByMe = c.likedByMe ?? false;

    row.innerHTML = `
      <div class="flex flex-col gap-1">
        <div class="text-sm font-semibold text-gray-800">${escapeHtml(
          authorName
        )}
          <span class="ml-2 font-normal text-gray-800">${escapeHtml(
            c.content ?? c.text ?? ""
          )}</span>
        </div>
        <div class="text-xs text-gray-400 flex items-center gap-3">
          <span>${escapeHtml(displayDate)}</span>
          ${
            isMine
              ? `<button class="comment-delete hover:text-red-500" data-action="comment-delete">삭제</button>`
              : ""
          }
        </div>
        <div class="text-xs text-gray-400 flex items-center gap-2">
          <button class="comment-like inline-flex items-center ${
            likedByMe ? "text-red-500" : "text-gray-400"
          } hover:text-red-500" data-action="comment-like">
            <span class="comment-like-count mr-1">${likeCount}개</span> 좋아요
          </button>
        </div>
      </div>
    `;

    row
      .querySelector('[data-action="comment-like"]')
      .addEventListener("click", () => toggleCommentLike(c.id, row));

    const delBtn = row.querySelector('[data-action="comment-delete"]');
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (!confirm("이 댓글을 삭제하시겠어요?")) return;
        await deleteComment(c.id);
        await refreshCommentsOfCurrentPost();
      });
    }

    container.appendChild(row);
  });
}

async function deleteComment(commentId) {
  try {
    const res = await authFetch(`${API_BASE}/api/comments/${commentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      if (res.status === 403)
        showCustomAlert("본인 댓글만 삭제할 수 있습니다.");
      else throw new Error(`삭제 실패(${res.status})`);
    }
  } catch (e) {
    console.error("댓글 삭제 실패:", e);
    showCustomAlert("댓글 삭제 중 오류가 발생했습니다.");
  }
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
    if (!res.ok) throw new Error(`댓글 재조회 실패(${res.status})`);
    const comments = await res.json();
    renderComments(comments, modalCommentList);
  } catch (e) {
    console.error("댓글 재조회 실패:", e);
  }
}

// =====================[ 툴바: 로그인/회원가입 노출만 ]=====================
function updateToolbarUI() {
  const toolbarRight = document.getElementById("toolbarRight");
  if (!toolbarRight) return;

  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser) {
    toolbarRight.innerHTML = ""; // 로그인 상태면 비워둠
  } else {
    toolbarRight.innerHTML = `
      <ul class="memberInfo">
        <li id="loginButton">
          <a href="/Summer_Project/html/login.html">
            <img src="https://img.cgv.co.kr/R2014/images/common/ico/loginPassword.png" alt="로그인"
                 onerror="this.src='https://placehold.co/36x36/ccc/000?text=로그인';"/>
            <span>로그인</span>
          </a>
        </li>
        <li id="signupButton">
          <a href="/Summer_Project/html/signup.html">
            <img src="https://img.cgv.co.kr/R2014/images/common/ico/loginJoin.png" alt="회원가입"
                 onerror="this.src='https://placehold.co/36x36/ccc/000?text=회원가입';"/>
            <span>회원가입</span>
          </a>
        </li>
      </ul>
    `;
  }
}

// =====================[ 초기화 ]=====================
document.addEventListener("DOMContentLoaded", () => {
  updateToolbarUI();

  // Enter 입력 시 검색
  searchInput?.addEventListener("keyup", (event) => {
    if (event.key === "Enter") searchPosts();
  });

  // 모달 닫기
  closeCommentModalButton?.addEventListener("click", () => {
    commentModal.style.display = "none";
    currentViewingPost = null;
  });

  // ✅ 엔터로 댓글 등록 (Shift+Enter는 줄바꿈)
  modalCommentInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      modalCommentSubmitButton?.click();
    }
  });

  // 댓글 작성
  modalCommentSubmitButton?.addEventListener("click", async () => {
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
});
