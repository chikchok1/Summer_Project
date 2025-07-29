// DOM 요소
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

// 전역 변수
let allPosts = [];
let currentViewingPost = null;

// 데이터 로드 및 정규화
function loadAllPosts() {
  const storedPosts = localStorage.getItem("snsPosts");
  let posts = storedPosts ? JSON.parse(storedPosts) : [];

  // 데이터 구조 정규화: 모든 댓글/답글에 likedBy 배열이 있도록 보장
  posts.forEach((post) => {
    if (post.comments) {
      post.comments.forEach((comment) => {
        if (!comment.likedBy) comment.likedBy = [];
        if (comment.replies) {
          comment.replies.forEach((reply) => {
            if (!reply.likedBy) reply.likedBy = [];
          });
        }
      });
    }
  });
  allPosts = posts;
}

// 게시글 카드 생성
function createPostCard(post) {
  const card = document.createElement("div");
  card.className = "post-card";
  card.addEventListener("click", () => openPostViewModal(post.id));

  const imageHtml = post.imageUrl
    ? `<img src="${post.imageUrl}" alt="게시글 이미지" class="post-card-image">`
    : `<div class="post-card-image" style="background-color: #eee;"></div>`;

  card.innerHTML = `
          ${imageHtml}
          <div class="post-card-content-wrapper">
            <div class="post-card-author">${post.author}</div>
            <p class="post-card-text">${post.text}</p>
            <div class="post-card-time">${post.time}</div>
          </div>
        `;
  return card;
}

// 게시글 검색
function searchPosts() {
  loadAllPosts(); // 검색 시 항상 최신 데이터 로드
  const keyword = searchInput.value.trim().toLowerCase();
  resultsContainer.innerHTML = "";

  if (!keyword) {
    resultsContainer.innerHTML = `<p class="col-span-full text-center text-gray-500">검색할 사용자 이름을 입력해주세요.</p>`;
    return;
  }

  const matchedPosts = allPosts.filter(
    (post) => post.author.toLowerCase() === keyword
  );

  if (matchedPosts.length === 0) {
    resultsContainer.innerHTML = `<p class="col-span-full text-center text-gray-500">'${keyword}' 사용자의 게시글이 없습니다.</p>`;
  } else {
    matchedPosts.forEach((post) => {
      const postCard = createPostCard(post);
      resultsContainer.appendChild(postCard);
    });
  }
}

// 모달 열기
function openPostViewModal(postId) {
  loadAllPosts(); // 모달 열 때도 최신 데이터 로드
  const post = allPosts.find((p) => p.id === postId);
  if (!post) return;
  currentViewingPost = post;

  modalPostTitle.textContent = post.text.split("\n")[0] || "게시글";
  modalPostAuthor.textContent = `작성자: ${post.author}`;
  modalPostTime.textContent = post.time;
  modalPostText.textContent = post.text;

  if (post.imageUrl) {
    modalPostImage.src = post.imageUrl;
    modalPostImage.classList.remove("hidden");
  } else {
    modalPostImage.classList.add("hidden");
  }

  modalPostTags.innerHTML = "";
  if (post.tags && post.tags.length > 0) {
    post.tags.forEach((tag) => {
      const tagSpan = document.createElement("span");
      tagSpan.className =
        "bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full";
      tagSpan.textContent = `#${tag}`;
      modalPostTags.appendChild(tagSpan);
    });
  }

  renderComments(post.comments || [], modalCommentList);
  commentModal.style.display = "flex";
}

// 댓글 렌더링
window.renderComments = function (comments, container, isReply = false) {
  const loggedInUser = localStorage.getItem("loggedInUser");
  container.innerHTML = "";
  if (!comments || comments.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-center py-4 text-sm">${
      isReply ? "답글이 없습니다." : "첫 댓글을 남겨보세요!"
    }</p>`;
    return;
  }
  comments.forEach((comment) => {
    const item = document.createElement("div");
    item.className = isReply ? "reply-item" : "comment-item";
    item.dataset.id = comment.id;

    const isLikedByCurrentUser =
      loggedInUser && comment.likedBy && comment.likedBy.includes(loggedInUser);
    const likeCount = comment.likedBy ? comment.likedBy.length : 0;

    item.innerHTML = `
                <div class="comment-content-wrapper">
                    <div class="comment-text-line"><span class="comment-username">${
                      comment.username
                    }</span><span class="comment-body">${
      comment.text
    }</span></div>
                    <div class="comment-time">${comment.time}</div>
                </div>
                <div class="comment-actions">
                    <button class="like-button ${
                      isLikedByCurrentUser ? "text-red-500" : ""
                    }" onclick="toggleCommentLike('${
      comment.id
    }')"><span class="comment-like-count">${likeCount}개</span> 좋아요</button>
                    ${
                      !isReply
                        ? `<button onclick="toggleReplyInput(this)">답글 달기</button>`
                        : ""
                    }
                </div>
                <div class="reply-input-area hidden"><input type="text" placeholder="답글 작성..."><button onclick="submitReply(this, '${
                  comment.id
                }')">등록</button></div>
                ${
                  !isReply && comment.replies?.length > 0
                    ? `<button class="view-replies-toggle" onclick="toggleViewReplies(this)">— 답글 보기 (${comment.replies.length}개)</button>`
                    : ""
                }
                <div class="replies-list hidden"></div>
            `;
    container.appendChild(item);
    if (comment.replies?.length > 0) {
      renderComments(
        comment.replies,
        item.querySelector(".replies-list"),
        true
      );
    }
  });
};

// 댓글/답글/좋아요를 위한 범용 상태 업데이트 함수
function updateSnsData(updateFunction) {
  loadAllPosts(); // 항상 최신 데이터로 시작
  updateFunction(allPosts); // 전달된 함수로 데이터 변경
  localStorage.setItem("snsPosts", JSON.stringify(allPosts)); // 변경된 데이터 저장
  // 현재 모달이 열려있으면, 댓글 목록을 다시 렌더링
  if (currentViewingPost) {
    const updatedPost = allPosts.find((p) => p.id === currentViewingPost.id);
    if (updatedPost) {
      currentViewingPost = updatedPost;
      renderComments(currentViewingPost.comments || [], modalCommentList);
    }
  }
}
function updateToolbarUI() {
  const toolbarRight = document.getElementById("toolbarRight");
  const loggedInUser = localStorage.getItem("loggedInUser");

  if (loggedInUser) {
    // 로그인 상태: 오른쪽 상단을 비움
    toolbarRight.innerHTML = "";
  } else {
    // 비로그인 상태: 로그인/회원가입 아이콘을 표시
    // ▼▼▼ 이 내용이 올바르게 채워져 있는지 확인하세요 ▼▼▼
    toolbarRight.innerHTML = `
      <ul class="memberInfo">
        <li id="loginButton">
          <a href="/Summer_Project/html/login.html">
            <img
              src="https://img.cgv.co.kr/R2014/images/common/ico/loginPassword.png"
              alt="로그인"
              onerror="this.src='https://placehold.co/36x36/ccc/000?text=로그인';"
            />
            <span>로그인</span>
          </a>
        </li>
        <li id="signupButton">
          <a href="/Summer_Project/html/signup.html">
            <img
              src="https://img.cgv.co.kr/R2014/images/common/ico/loginJoin.png"
              alt="회원가입"
              onerror="this.src='https://placehold.co/36x36/ccc/000?text=회원가입';"
            />
            <span>회원가입</span>
          </a>
        </li>
      </ul>
    `;
    // ▲▲▲ 여기까지 확인 ▲▲▲
  }
}

// 초기화 및 이벤트 리스너
document.addEventListener("DOMContentLoaded", () => {
  // ▼▼▼ [추가] 페이지 로드 시 툴바 UI 업데이트 함수 호출 ▼▼▼
  updateToolbarUI();

  // ... 나머지 기존 코드 ...
});

// 댓글 추가
function addComment() {
  const text = modalCommentInput.value.trim();
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!text) return;
  if (!loggedInUser) {
    alert("로그인이 필요합니다.");
    return;
  }

  updateSnsData((posts) => {
    const post = posts.find((p) => p.id === currentViewingPost.id);
    if (post) {
      const newComment = {
        id: "comment-" + Date.now(),
        username: loggedInUser,
        text,
        time: new Date().toLocaleString("ko-KR"),
        likedBy: [],
        replies: [],
      };
      if (!post.comments) post.comments = [];
      post.comments.push(newComment);
    }
  });
  modalCommentInput.value = "";
}

// 답글 제출
window.submitReply = function (button, parentId) {
  const area = button.closest(".reply-input-area");
  const input = area.querySelector("input");
  const text = input.value.trim();
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!text) return;
  if (!loggedInUser) {
    alert("로그인이 필요합니다.");
    return;
  }

  updateSnsData((posts) => {
    const post = posts.find((p) => p.id === currentViewingPost.id);
    if (post) {
      const findComment = (id, comments) => {
        for (const c of comments) {
          if (c.id === id) return c;
          if (c.replies) {
            const found = findComment(id, c.replies);
            if (found) return found;
          }
        }
        return null;
      };
      const parentComment = findComment(parentId, post.comments);
      if (parentComment) {
        const newReply = {
          id: "reply-" + Date.now(),
          username: loggedInUser,
          text,
          time: new Date().toLocaleString("ko-KR"),
          likedBy: [],
        };
        if (!parentComment.replies) parentComment.replies = [];
        parentComment.replies.push(newReply);
      }
    }
  });
  input.value = "";
};

// 좋아요 토글
window.toggleCommentLike = function (commentId) {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) {
    alert("좋아요를 누르려면 로그인이 필요합니다.");
    return;
  }

  updateSnsData((posts) => {
    const post = posts.find((p) => p.id === currentViewingPost.id);
    if (post) {
      const findComment = (id, comments) => {
        for (const c of comments) {
          if (c.id === id) return c;
          if (c.replies) {
            const found = findComment(id, c.replies);
            if (found) return found;
          }
        }
        return null;
      };
      const commentObj = findComment(commentId, post.comments);
      if (commentObj) {
        if (!commentObj.likedBy) commentObj.likedBy = [];
        const userIndex = commentObj.likedBy.indexOf(loggedInUser);
        if (userIndex > -1) {
          commentObj.likedBy.splice(userIndex, 1);
        } else {
          commentObj.likedBy.push(loggedInUser);
        }
      }
    }
  });
};

window.toggleReplyInput = (button) =>
  button
    .closest(".comment-item")
    .querySelector(".reply-input-area")
    .classList.toggle("hidden");
window.toggleViewReplies = (button) => {
  const repliesList = button
    .closest(".comment-item")
    .querySelector(".replies-list");
  const isHidden = repliesList.classList.contains("hidden");
  repliesList.classList.toggle("hidden");
  button.textContent = isHidden
    ? `— 답글 숨기기 (${repliesList.children.length}개)`
    : `— 답글 보기 (${repliesList.children.length}개)`;
};

// 초기화 및 이벤트 리스너
document.addEventListener("DOMContentLoaded", () => {
  loadAllPosts();
  searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") searchPosts();
  });
  closeCommentModalButton.addEventListener("click", () => {
    commentModal.style.display = "none";
    currentViewingPost = null;
  });
  modalCommentSubmitButton.addEventListener("click", addComment);
  modalCommentInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") addComment();
  });

  // 실시간 동기화를 위한 Storage Event Listener 추가
  window.addEventListener("storage", (event) => {
    if (event.key === "snsPosts") {
      console.log(
        "localStorage가 다른 탭에서 변경되어 데이터를 다시 로드합니다."
      );
      loadAllPosts();

      // 현재 검색 결과 업데이트
      if (document.getElementById("searchResults").innerHTML.trim() !== "") {
        searchPosts();
      }

      // 모달이 열려있다면 내용 업데이트
      if (commentModal.style.display === "flex" && currentViewingPost) {
        const updatedPost = allPosts.find(
          (p) => p.id === currentViewingPost.id
        );
        if (updatedPost) {
          currentViewingPost = updatedPost;
          renderComments(currentViewingPost.comments || [], modalCommentList);
        } else {
          commentModal.style.display = "none";
          currentViewingPost = null;
          alert("보고 있던 게시글이 삭제되었습니다.");
        }
      }
    }
  });
});
