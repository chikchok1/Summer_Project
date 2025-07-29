// 게시글 작성 모달 관련 DOM 요소
const createPostButton = document.getElementById("createPostButton");
const postModal = document.getElementById("postModal");
const closePostModalButton = document.getElementById("closePostModalButton");
const registerPostButton = document.getElementById("registerPostButton");
const postImageInput = document.getElementById("postImageInput");
const postTextInput = document.getElementById("postTextInput");
const postTagsInput = document.getElementById("postTagsInput");
const feed = document.getElementById("feed");

// 댓글 모달 관련 DOM 요소
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

// 로그인/로그아웃 관련 DOM 요소
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const signupButton = document.getElementById("signupButton");

// 모든 게시글 데이터를 저장할 배열 (로컬 스토리지와 동기화)
let allPosts = [];
let currentViewingPostCard = null; // 현재 댓글 모달에서 보고 있는 게시글

/**
 * 로컬 스토리지에서 게시글 데이터를 로드합니다.
 */
function loadPosts() {
  const storedPosts = localStorage.getItem("snsPosts");
  if (storedPosts) {
    allPosts = JSON.parse(storedPosts);
    renderAllPosts(); // 저장된 게시글을 화면에 렌더링
  }
}

/**
 * 모든 게시글을 화면에 렌더링하는 함수 (초기 로드 및 데이터 변경 시 호출)
 */
function renderAllPosts() {
  feed.innerHTML = ""; // 기존 피드 내용을 비웁니다.
  allPosts.forEach((post) => {
    const newPostCard = createPostCardElement(post);
    feed.prepend(newPostCard); // 최신 게시글이 위에 오도록 prepend 사용
  });
}

/**
 * 게시글 데이터 객체를 받아서 DOM 요소를 생성하고 반환합니다.
 * @param {Object} postData 게시글 데이터 객체
 * @returns {HTMLElement} 생성된 게시글 DOM 요소
 */
function createPostCardElement(postData) {
  const loggedInUser = localStorage.getItem("loggedInUser");
  // 현재 로그인한 사용자가 이 게시글을 좋아요 했는지 확인
  const hasUserLiked =
    postData.likedBy && loggedInUser && postData.likedBy.includes(loggedInUser);

  const newPostCard = document.createElement("div");
  newPostCard.classList.add("post-card");
  newPostCard.dataset.postId = postData.id; // 게시글 ID를 data 속성에 저장

  let imageHtml = "";
  if (postData.imageUrl) {
    imageHtml = `<img src="${postData.imageUrl}" alt="게시글 이미지" class="post-image">`;
  }

  let tagsHtml = "";
  if (postData.tags && postData.tags.length > 0) {
    tagsHtml = `<div class="mt-2 flex flex-wrap gap-2">${postData.tags
      .map(
        (tag) =>
          `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">#${tag}</span>`
      )
      .join("")}</div>`;
  }

  newPostCard.innerHTML = `
        ${imageHtml}
        <div class="p-4">
            <p class="text-gray-800 leading-relaxed mb-2">${postData.text}</p>
            ${tagsHtml}
            <div class="flex items-center text-sm text-gray-500 mt-4">
                <span class="font-semibold text-gray-700 mr-2">${
                  postData.author
                }</span>
                <span>• ${postData.time}</span>
            </div>
            <div class="flex items-center mt-4 space-x-4">
                <button class="flex items-center text-gray-600 hover:text-red-500 transition-colors duration-200 ${
                  hasUserLiked ? "liked text-red-500" : ""
                }" onclick="toggleLike(this)">
                    <span class="mr-1">${hasUserLiked ? "💖" : "❤️"}</span
                    > <span class="like-count">${
                      postData.likedBy ? postData.likedBy.length : 0
                    }</span> 좋아요
                </button>
                <button class="flex items-center text-gray-600 hover:text-blue-500 transition-colors duration-200" onclick="toggleComments(this)">
                    <span class="mr-1">💬</span> 댓글
                </button>
            </div>
        </div>
    `;
  return newPostCard;
}

/**
 * 로컬 스토리지에 게시글 데이터를 저장합니다.
 */
function savePosts() {
  localStorage.setItem("snsPosts", JSON.stringify(allPosts));
}

/**
 * 로그인 상태에 따라 버튼 가시성을 업데이트하는 함수
 */
function updateLoginButtons() {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser) {
    loginButton.style.display = "none";
    signupButton.style.display = "none";
    logoutButton.style.display = "inline-block"; // 'inline-block'으로 설정
  } else {
    loginButton.style.display = "inline-block"; // 'inline-block'으로 설정
    signupButton.style.display = "inline-block"; // 'inline-block'으로 설정
    logoutButton.style.display = "none";
  }
}

// 페이지 로드 시 로그인 버튼 상태 초기화 및 게시글 로드
updateLoginButtons();
loadPosts();

// 로그아웃 버튼 클릭 이벤트: 로컬 스토리지에서 사용자 정보를 지우고 페이지 이동
logoutButton.addEventListener("click", (e) => {
  localStorage.removeItem("loggedInUser"); // 로컬 스토리지에서 사용자 정보 삭제
  // Optional: Redirect to login page or refresh to update UI
  window.location.href = "/Summer_Project/html/index.html"; // 로그아웃 후 홈으로 리디렉션
});

// '게시글 작성' 버튼 클릭 이벤트: 게시글 작성 모달을 표시합니다.
createPostButton.addEventListener("click", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) {
    alert("로그인해야 게시글을 작성할 수 있습니다.");
    return; // 로그인하지 않았으면 함수 실행 중단
  }
  postModal.classList.remove("hidden");
});

// 게시글 작성 모달 닫기 버튼 클릭 이벤트: 모달을 숨기고 입력 필드를 초기화합니다.
closePostModalButton.addEventListener("click", () => {
  postModal.classList.add("hidden");
  postImageInput.value = "";
  postTextInput.value = "";
  postTagsInput.value = "";
});

// 게시글 작성 모달 외부 클릭 시 닫기
postModal.addEventListener("click", (event) => {
  if (event.target === postModal) {
    postModal.classList.add("hidden");
    postImageInput.value = "";
    postTextInput.value = "";
    postTagsInput.value = "";
  }
});

// 댓글 모달 닫기 버튼 클릭 이벤트: 댓글 모달을 숨기고 데이터 초기화
closeCommentModalButton.addEventListener("click", () => {
  commentModal.classList.add("hidden");
  modalPostImage.classList.add("hidden");
  modalPostImage.src = "";
  modalPostText.textContent = "";
  modalPostTags.innerHTML = "";
  modalPostAuthor.textContent = "";
  modalPostTime.textContent = "";
  modalCommentList.innerHTML = ""; // 댓글 목록 비우기
  modalCommentInput.value = ""; // 댓글 입력창 비우기
  currentViewingPostCard = null; // 현재 보고 있는 게시글 초기화
});

// 댓글 모달 외부 클릭 시 닫기
commentModal.addEventListener("click", (event) => {
  if (event.target === commentModal) {
    closeCommentModalButton.click(); // 닫기 버튼 클릭 이벤트와 동일하게 처리
  }
});

// 좋아요 토글 기능 (전역 함수로 정의하여 onclick에서 호출 가능하도록)
window.toggleLike = function (button) {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) {
    alert("로그인해야 좋아요를 누를 수 있습니다.");
    return;
  }

  const postCard = button.closest(".post-card");
  const postId = postCard.dataset.postId;
  const postObj = allPosts.find((post) => post.id === postId);

  if (postObj) {
    // likedBy 배열이 없으면 초기화
    if (!postObj.likedBy) {
      postObj.likedBy = [];
    }

    const likeIndex = postObj.likedBy.indexOf(loggedInUser);

    if (likeIndex > -1) {
      // 사용자가 이미 좋아요를 눌렀으면 취소
      postObj.likedBy.splice(likeIndex, 1);
      button.classList.remove("liked", "text-red-500");
      button.classList.add("text-gray-600");
      button.querySelector("span:first-child").textContent = "❤️"; // 빈 하트
    } else {
      // 사용자가 좋아요를 누르지 않았으면 추가
      postObj.likedBy.push(loggedInUser);
      button.classList.add("liked", "text-red-500");
      button.classList.remove("text-gray-600");
      button.querySelector("span:first-child").textContent = "💖"; // 채워진 하트
    }
    button.querySelector(
      ".like-count"
    ).textContent = `${postObj.likedBy.length}`;
    savePosts(); // 좋아요 변경 후 로컬 스토리지에 저장
  }
};

// 댓글 섹션 토글 기능 (이제 댓글 모달을 띄웁니다)
window.toggleComments = function (button) {
  const postCard = button.closest(".post-card");
  const postId = postCard.dataset.postId;
  const postData = allPosts.find((post) => post.id === postId);

  if (!postData) return; // 게시글 데이터를 찾을 수 없으면 중단

  currentViewingPostCard = postData; // 현재 보고 있는 게시글 데이터 객체 저장

  // 게시글 내용 모달에 채우기
  if (postData.imageUrl) {
    modalPostImage.src = postData.imageUrl;
    modalPostImage.classList.remove("hidden");
  } else {
    modalPostImage.classList.add("hidden");
    modalPostImage.src = ""; // src 초기화
  }

  modalPostText.textContent = postData.text;
  modalPostTags.innerHTML = postData.tags
    .map(
      (tag) =>
        `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">#${tag}</span>`
    )
    .join("");
  modalPostAuthor.textContent = postData.author;
  modalPostTime.textContent = postData.time;

  // 댓글 목록 채우기 (renderComments 함수 사용)
  window.renderComments(postData.comments, modalCommentList);

  commentModal.classList.remove("hidden"); // 댓글 모달을 표시
};

/**
 * 댓글 및 답글을 재귀적으로 렌더링하는 함수
 * @param {Array} comments 댓글/답글 데이터 배열
 * @param {HTMLElement} container 댓글/답글이 추가될 DOM 요소
 * @param {boolean} isReply 현재 렌더링 중인 아이템이 답글인지 여부 (들여쓰기 및 버튼 표시 제어)
 */
window.renderComments = function (comments, container, isReply = false) {
  container.innerHTML = ""; // 기존 댓글 목록 초기화
  const loggedInUser = localStorage.getItem("loggedInUser");

  if (comments.length === 0) {
    const noCommentMessage = document.createElement("p");
    noCommentMessage.classList.add("text-gray-500", "text-center", "py-4");
    noCommentMessage.textContent = isReply
      ? "아직 답글이 없습니다."
      : "아직 댓글이 없습니다. 첫 댓글을 남겨보세요!";
    container.appendChild(noCommentMessage);
    return;
  }

  comments.forEach((comment) => {
    // 현재 사용자가 이 댓글/답글을 좋아요 했는지 확인
    const hasUserLikedComment =
      comment.likedBy && loggedInUser && comment.likedBy.includes(loggedInUser);

    const commentItem = document.createElement("div");
    commentItem.dataset.id = comment.id; // 댓글/답글 ID 저장
    commentItem.classList.add(isReply ? "reply-item" : "comment-item"); // CSS 클래스 추가

    // 댓글 본문과 액션 버튼을 포함하는 새로운 구조
    commentItem.innerHTML = `
            <div class="comment-content-wrapper">
                <div class="comment-text-line">
                    <span class="comment-username">${comment.username}</span>
                    <span class="comment-body">${comment.text}</span>
                </div>
                <div class="comment-time">${comment.time}</div>
            </div>
            <div class="comment-actions">
                <button class="like-button ${
                  hasUserLikedComment ? "text-red-500" : "text-gray-500"
                } hover:text-red-500 transition-colors duration-200" onclick="window.toggleCommentLike(this)">
                    <span class="comment-like-count">${
                      comment.likedBy ? comment.likedBy.length : 0
                    }개</span> 좋아요
                </button>
                ${
                  !isReply
                    ? `<button class="text-gray-500 hover:text-blue-500 transition-colors duration-200" onclick="window.toggleReplyInput(this)">
                        답글 달기
                    </button>`
                    : ""
                }
            </div>
            <div class="reply-input-area hidden mt-3">
                <input type="text" placeholder="답글을 작성하세요..." class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <button class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm" onclick="window.submitReply(this)">등록</button>
            </div>
            ${
              !isReply && comment.replies && comment.replies.length > 0
                ? `
                <button class="view-replies-toggle" onclick="window.toggleViewReplies(this)">
                    — 답글 보기 (${comment.replies.length}개)
                </button>
            `
                : ""
            }
            <div class="replies-list mt-3 space-y-2 hidden">
                </div>
        `;
    container.appendChild(commentItem);

    // 중첩 답글 렌더링 (초기에는 숨겨진 상태)
    if (comment.replies && comment.replies.length > 0) {
      const repliesListContainer = commentItem.querySelector(".replies-list");
      // renderComments 호출 시 hidden 클래스 제어를 위해 `isReply`를 true로 전달
      window.renderComments(comment.replies, repliesListContainer, true);
    }
  });
};

/**
 * 특정 댓글/답글에 대한 좋아요 토글 기능
 * @param {HTMLElement} button 클릭된 좋아요 버튼 요소
 */
window.toggleCommentLike = function (button) {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) {
    alert("로그인해야 좋아요를 누를 수 있습니다.");
    return;
  }

  const commentItem = button.closest(".comment-item, .reply-item");
  const commentId = commentItem.dataset.id;

  // 현재 보고 있는 게시글의 comments 배열에서 해당 댓글/답글 객체 찾기
  const findCommentOrReply = (commentsArray, id) => {
    for (const item of commentsArray) {
      if (item.id === id) return item;
      if (item.replies) {
        const foundInReplies = findCommentOrReply(item.replies, id);
        if (foundInReplies) return foundInReplies;
      }
    }
    return null;
  };

  const commentObj = findCommentOrReply(
    currentViewingPostCard.comments, // allPosts의 현재 게시글 데이터를 사용
    commentId
  );

  if (commentObj) {
    // likedBy 배열이 없으면 초기화
    if (!commentObj.likedBy) {
      commentObj.likedBy = [];
    }

    const likeIndex = commentObj.likedBy.indexOf(loggedInUser);

    if (likeIndex > -1) {
      // 사용자가 이미 좋아요를 눌렀으면 취소
      commentObj.likedBy.splice(likeIndex, 1);
      button.classList.remove("liked", "text-red-500");
      button.classList.add("text-gray-600"); // 좋아요 취소 시 회색으로
    } else {
      // 사용자가 좋아요를 누르지 않았으면 추가
      commentObj.likedBy.push(loggedInUser);
      button.classList.add("liked", "text-red-500");
      button.classList.remove("text-gray-600"); // 좋아요 시 빨간색으로
    }
    button.querySelector(
      ".comment-like-count"
    ).textContent = `${commentObj.likedBy.length}개`;
    savePosts(); // 댓글 좋아요 변경 후 로컬 스토리지에 저장
  }
};

/**
 * 특정 댓글에 대한 답글 입력 필드 토글
 * @param {HTMLElement} button 클릭된 답글 버튼 요소
 */
window.toggleReplyInput = function (button) {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) {
    alert("로그인해야 답글을 작성할 수 있습니다.");
    return;
  }
  const commentItem = button.closest(".comment-item, .reply-item"); // 댓글/답글 모두 가능
  const replyInputArea = commentItem.querySelector(".reply-input-area");
  replyInputArea.classList.toggle("hidden");
  if (!replyInputArea.classList.contains("hidden")) {
    replyInputArea.querySelector("input").focus(); // 입력 필드에 포커스
  }
};

/**
 * 답글 등록 기능
 * @param {HTMLElement} button 클릭된 답글 등록 버튼 요소
 */
window.submitReply = function (button) {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) {
    alert("로그인해야 답글을 작성할 수 있습니다.");
    return;
  }

  const replyInputArea = button.closest(".reply-input-area");
  const replyInput = replyInputArea.querySelector("input");
  const replyText = replyInput.value.trim();

  if (!replyText) {
    alert("답글 내용을 입력해주세요.");
    return;
  }

  const parentCommentItem = replyInputArea.closest(
    ".comment-item, .reply-item"
  ); // 부모 댓글 DOM 요소
  const parentCommentId = parentCommentItem.dataset.id;

  const findCommentOrReply = (commentsArray, id) => {
    for (const item of commentsArray) {
      if (item.id === id) return item;
      if (item.replies) {
        const foundInReplies = findCommentOrReply(item.replies, id);
        if (foundInReplies) return foundInReplies;
      }
    }
    return null;
  };

  const parentCommentObj = findCommentOrReply(
    currentViewingPostCard.comments, // allPosts의 현재 게시글 데이터를 사용
    parentCommentId
  );

  if (parentCommentObj) {
    const now = new Date();
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    const currentTimeFormatted = now.toLocaleString("ko-KR", options);

    const newReply = {
      id: "reply-" + Date.now(), // 고유 ID 생성
      username: loggedInUser || "익명 사용자", // 로그인한 사용자 이름 사용
      text: replyText,
      time: currentTimeFormatted,
      likedBy: [], // 새 답글의 likedBy 배열 초기화
    };

    if (!parentCommentObj.replies) {
      parentCommentObj.replies = [];
    }
    parentCommentObj.replies.push(newReply);

    // 부모 댓글의 답글 목록 컨테이너를 가져와 가시성 처리
    const repliesListContainer =
      parentCommentItem.querySelector(".replies-list");
    if (repliesListContainer) {
      repliesListContainer.classList.remove("hidden"); // 답글 등록 시 목록이 보이도록
    }

    // 부모 댓글의 답글 목록만 다시 렌더링하여 효율성 높임
    window.renderComments(parentCommentObj.replies, repliesListContainer, true); // 답글임을 명시

    replyInput.value = ""; // 답글 입력 필드 초기화
    savePosts(); // 답글 추가 후 로컬 스토리지에 저장

    // 답글 보기 토글 버튼의 텍스트 업데이트 (답글 개수)
    let viewRepliesToggleBtn = parentCommentItem.querySelector(
      ".view-replies-toggle"
    );
    if (!viewRepliesToggleBtn) {
      viewRepliesToggleBtn = document.createElement("button");
      viewRepliesToggleBtn.classList.add("view-replies-toggle");
      viewRepliesToggleBtn.onclick = function () {
        window.toggleViewReplies(this);
      };
      const commentActionsDiv =
        parentCommentItem.querySelector(".comment-actions");
      if (commentActionsDiv) {
        commentActionsDiv.after(viewRepliesToggleBtn);
      } else {
        parentCommentItem.appendChild(viewRepliesToggleBtn);
      }
    }
    viewRepliesToggleBtn.textContent = `— 답글 숨기기 (${parentCommentObj.replies.length}개)`;
    viewRepliesToggleBtn.classList.remove("hidden"); // 답글이 새로 생겼으면 버튼 보이게

    if (repliesListContainer) {
      repliesListContainer.scrollTop = repliesListContainer.scrollHeight; // 스크롤을 맨 아래로
    }
  }
};

/**
 * 답글 목록 보기/숨기기 토글 기능
 * @param {HTMLElement} button 클릭된 '답글 보기' 버튼 요소
 */
window.toggleViewReplies = function (button) {
  const commentItem = button.closest(".comment-item");
  const repliesList = commentItem.querySelector(".replies-list");
  const replyInputArea = commentItem.querySelector(".reply-input-area"); // 답글 입력 영역

  const isHidden = repliesList.classList.contains("hidden");

  repliesList.classList.toggle("hidden");
  // 답글 목록이 보일 때만 답글 입력 영역도 보이도록
  replyInputArea.classList.toggle("hidden", !isHidden);

  if (isHidden) {
    button.textContent = `— 답글 숨기기 (${repliesList.children.length}개)`;
    if (!repliesList.classList.contains("hidden")) {
      repliesList.scrollTop = repliesList.scrollHeight;
    }
  } else {
    button.textContent = `— 답글 보기 (${repliesList.children.length}개)`;
  }
};

/**
 * 게시글 생성 및 저장 로직을 위한 헬퍼 함수.
 * FileReader의 비동기 작업 때문에 분리되었습니다.
 * @param {string} postText 게시글 내용
 * @param {string} imageUrl Base64 인코딩된 이미지 URL
 * @param {string} postTags 태그 문자열
 */
function createAndSavePost(postText, imageUrl, postTags) {
  const now = new Date();
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };
  const currentTime = now.toLocaleString("ko-KR", options);

  const newPostData = {
    id: "post-" + Date.now(), // 고유 ID 생성
    text: postText,
    imageUrl: imageUrl, // 이제 Base64 문자열
    tags: postTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== ""),
    author: localStorage.getItem("loggedInUser") || "익명 사용자",
    time: currentTime,
    likedBy: [], // 새 게시글에 좋아요 누른 사용자 목록 배열 초기화
    comments: [], // 새로운 게시글에는 빈 댓글 배열 초기화
  };

  allPosts.unshift(newPostData); // 새 게시글을 배열 맨 앞에 추가
  savePosts(); // 로컬 스토리지에 저장

  const newPostCardElement = createPostCardElement(newPostData);
  feed.prepend(newPostCardElement);

  postModal.classList.add("hidden");
  postImageInput.value = "";
  postTextInput.value = "";
  postTagsInput.value = "";
}

// '등록' 버튼 클릭 이벤트: 새 게시글을 생성하여 피드에 추가합니다.
registerPostButton.addEventListener("click", () => {
  const postText = postTextInput.value.trim();
  const postTags = postTagsInput.value.trim();
  const postImageFile = postImageInput.files[0];

  if (!postText && !postTags && !postImageFile) {
    alert("게시글 내용, 태그 또는 사진을 입력해주세요.");
    return;
  }

  if (postImageFile) {
    const reader = new FileReader();
    reader.onloadend = function () {
      // 파일을 Base64 문자열로 읽고 createAndSavePost 호출
      createAndSavePost(postText, reader.result, postTags);
    };
    reader.readAsDataURL(postImageFile); // 파일 읽기 시작
  } else {
    // 이미지가 없으면 빈 문자열로 createAndSavePost 호출
    createAndSavePost(postText, "", postTags);
  }
});

// 댓글 등록 버튼 클릭 이벤트: 댓글 모달 내에서 댓글을 등록합니다.
modalCommentSubmitButton.addEventListener("click", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) {
    alert("로그인해야 댓글을 작성할 수 있습니다.");
    return;
  }

  const commentText = modalCommentInput.value.trim();

  if (commentText && currentViewingPostCard) {
    const now = new Date();
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    const currentTimeFormatted = now.toLocaleString("ko-KR", options);

    const newComment = {
      id: "comment-" + Date.now(), // 고유 ID 생성
      username: loggedInUser || "익명 사용자", // 로그인한 사용자 이름 사용
      text: commentText,
      time: currentTimeFormatted,
      likedBy: [], // 새 댓글의 likedBy 배열 초기화
      replies: [], // 답글 배열 초기화
    };

    // '아직 댓글이 없습니다' 메시지가 있다면 제거
    const noCommentMessage = modalCommentList.querySelector("p.text-gray-500");
    if (
      noCommentMessage &&
      noCommentMessage.textContent ===
        "아직 댓글이 없습니다. 첫 댓글을 남겨보세요!"
    ) {
      modalCommentList.removeChild(noCommentMessage);
    }

    // 현재 게시글 데이터 객체에 댓글 추가
    currentViewingPostCard.comments.push(newComment);
    savePosts(); // 댓글 추가 후 로컬 스토리지에 저장

    // 댓글 목록에 새 댓글 추가 (렌더링 함수 사용)
    window.renderComments(currentViewingPostCard.comments, modalCommentList);

    modalCommentInput.value = ""; // 입력 필드 초기화
    modalCommentList.scrollTop = modalCommentList.scrollHeight; // 스크롤을 맨 아래로
  }
});
